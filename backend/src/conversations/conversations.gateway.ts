import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationsService } from './conversations.service';

@WebSocketGateway({ cors: true })
export class ConversationsGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly conversations: ConversationsService) {}

  @SubscribeMessage('joinConversation')
  async join(@MessageBody() body: { conversationId: number }, @ConnectedSocket() socket: Socket) {
    await socket.join(`conversation:${body.conversationId}`);
  }

  @SubscribeMessage('sendMessage')
  async send(
    @MessageBody() body: { userId: number; conversationId: number; content: string },
  ) {
    const message = await this.conversations.send(body.userId, body.conversationId, body.content);
    this.server.to(`conversation:${body.conversationId}`).emit('messageCreated', message);
    return message;
  }

  emitMessage(conversationId: number, message: unknown) {
    this.server.to(`conversation:${conversationId}`).emit('messageCreated', message);
  }
}
