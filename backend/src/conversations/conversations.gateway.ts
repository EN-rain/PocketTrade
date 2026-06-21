import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

interface SocketJwtPayload {
  sub: number;
  type?: string;
  ver?: number;
}

function validateSocketOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) {
  // Native mobile clients normally omit Origin; JWT authentication still applies.
  if (!origin) return callback(null, true);

  const configured = [
    ...(process.env.CORS_ORIGINS?.split(',') ?? []),
    process.env.ADMIN_ORIGIN ?? '',
  ].map((value) => value.trim()).filter(Boolean);
  const allow = configured.includes(origin) || (configured.length === 0 && process.env.NODE_ENV !== 'production');
  callback(allow ? null : new Error('WebSocket origin is not allowed'), allow);
}

@WebSocketGateway({
  cors: {
    origin: validateSocketOrigin,
    credentials: true,
  },
})
export class ConversationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = this.extractToken(socket);
      if (!token) throw new Error('Missing token');

      const payload = await this.jwtService.verifyAsync<SocketJwtPayload>(token);
      if (!payload.sub || payload.type === 'refresh') throw new Error('Invalid token type');

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, accountStatus: true, tokenVersion: true },
      });
      if (
        !user ||
        user.accountStatus !== 'active' ||
        !Number.isInteger(payload.ver) ||
        payload.ver !== user.tokenVersion
      ) {
        throw new Error('Inactive account or revoked session');
      }

      socket.data.userId = user.id;
    } catch {
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('joinConversation')
  async join(
    @MessageBody() body: { conversationId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = Number(socket.data.userId);
    const conversationId = Number(body?.conversationId);

    if (!Number.isInteger(userId) || !Number.isInteger(conversationId) || conversationId < 1) {
      throw new WsException('Unauthorized conversation access');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { buyerId: true, sellerId: true },
    });

    if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId)) {
      throw new WsException('Conversation does not belong to current user');
    }

    await socket.join(`conversation:${conversationId}`);
    return { joined: true, conversationId };
  }

  emitMessage(conversationId: number, message: unknown) {
    this.server.to(`conversation:${conversationId}`).emit('messageCreated', message);
  }

  private extractToken(socket: Socket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) return authToken;

    const authorization = socket.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice(7);
    }

    return null;
  }
}
