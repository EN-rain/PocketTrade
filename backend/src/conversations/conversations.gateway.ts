import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ConversationsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('joinConversation')
  async join(@MessageBody() body: { conversationId: number }, @ConnectedSocket() socket: Socket) {
    await socket.join(`conversation:${body.conversationId}`);
  }

  emitMessage(conversationId: number, message: unknown) {
    this.server.to(`conversation:${conversationId}`).emit('messageCreated', message);
  }
}
