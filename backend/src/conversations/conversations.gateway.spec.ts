import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { ConversationsGateway } from './conversations.gateway';

describe('ConversationsGateway security', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const prisma = {
    user: { findUnique: jest.fn() },
    conversation: { findUnique: jest.fn() },
  } as any;

  let gateway: ConversationsGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new ConversationsGateway(jwtService, prisma);
  });

  it('disconnects a socket without a valid token', async () => {
    const socket = {
      handshake: { auth: {}, headers: {} },
      data: {},
      disconnect: jest.fn(),
    } as any;

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('accepts an active user with a valid access token', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 7 });
    prisma.user.findUnique.mockResolvedValue({ id: 7, accountStatus: 'active' });
    const socket = {
      handshake: { auth: { token: 'valid-token' }, headers: {} },
      data: {},
      disconnect: jest.fn(),
    } as any;

    await gateway.handleConnection(socket);

    expect(socket.data.userId).toBe(7);
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('rejects a user who is not part of the conversation', async () => {
    prisma.conversation.findUnique.mockResolvedValue({ buyerId: 1, sellerId: 2 });
    const socket = { data: { userId: 99 }, join: jest.fn() } as any;

    await expect(gateway.join({ conversationId: 10 }, socket)).rejects.toBeInstanceOf(WsException);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('allows a conversation participant to join the room', async () => {
    prisma.conversation.findUnique.mockResolvedValue({ buyerId: 7, sellerId: 2 });
    const socket = { data: { userId: 7 }, join: jest.fn().mockResolvedValue(undefined) } as any;

    await expect(gateway.join({ conversationId: 10 }, socket)).resolves.toEqual({
      joined: true,
      conversationId: 10,
    });
    expect(socket.join).toHaveBeenCalledWith('conversation:10');
  });
});
