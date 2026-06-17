import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BlocksService } from '../blocks/blocks.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlocksService,
    private readonly push: PushService,
  ) {}

  async start(buyerId: number, listingId: number) {
    await this.assertActive(buyerId);
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);
    if (listing.sellerId === buyerId) throw new BadRequestException('Cannot message yourself');
    if (await this.blocks.isBlocked(buyerId, listing.sellerId)) throw new ForbiddenException('Messaging is blocked');
    return this.prisma.conversation.upsert({
      where: { listingId_buyerId_sellerId: { listingId, buyerId, sellerId: listing.sellerId } },
      update: {},
      create: { listingId, buyerId, sellerId: listing.sellerId },
      include: this.includeConversation(),
    });
  }

  async list(userId: number) {
    return this.prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: this.includeConversation(),
    });
  }

  async messages(userId: number, conversationId: number) {
    await this.assertParticipant(userId, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async send(userId: number, conversationId: number, content: string) {
    await this.assertActive(userId);
    const conversation = await this.assertParticipant(userId, conversationId);
    const otherUserId = conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
    if (await this.blocks.isBlocked(userId, otherUserId)) throw new ForbiddenException('Messaging is blocked');
    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, content },
      include: { sender: { select: { id: true, email: true, displayName: true } } },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    await this.push.notifyUser(otherUserId, 'New message', content.slice(0, 120));
    return message;
  }

  async markRead(userId: number, conversationId: number) {
    await this.assertParticipant(userId, conversationId);
    return this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
  }

  private async assertActive(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'active') throw new ForbiddenException('Account is not active');
  }

  private async assertParticipant(userId: number, conversationId: number) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException(`Conversation ${conversationId} not found`);
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new ForbiddenException('Conversation does not belong to current user');
    }
    return conversation;
  }

  private includeConversation() {
    return {
      listing: { include: { images: { orderBy: { displayOrder: 'asc' as const } } } },
      buyer: { select: { id: true, email: true, displayName: true } },
      seller: { select: { id: true, email: true, displayName: true } },
      messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
    };
  }
}
