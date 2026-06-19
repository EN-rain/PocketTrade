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
}

@WebSocketGateway({
  cors: {
    origin: process.env.ADMIN_ORIGIN ? [process.env.ADMIN_ORIGIN] : true,
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
        select: { id: true, accountStatus: true },
      });
      if (!user || user.accountStatus !== 'active') throw new Error('Inactive account');

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
