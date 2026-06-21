import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BlocksService } from '../blocks/blocks.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { ConversationsGateway } from './conversations.gateway';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlocksService,
    private readonly push: PushService,
    private readonly gateway: ConversationsGateway,
  ) {}

  async start(buyerId: number, listingId: number) {
    await this.assertActive(buyerId);
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);
    if (listing.status !== 'active') throw new BadRequestException('Only active listings can be messaged');
    if (listing.sellerId === buyerId) throw new BadRequestException('Cannot message yourself');
    if (await this.blocks.isBlocked(buyerId, listing.sellerId)) throw new ForbiddenException('Messaging is blocked');
    return this.prisma.conversation.upsert({
      where: { listingId_buyerId_sellerId: { listingId, buyerId, sellerId: listing.sellerId } },
      update: {},
      create: { listingId, buyerId, sellerId: listing.sellerId },
      include: this.includeConversation(),
    });
  }

  async list(userId: number, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;
    const where = { OR: [{ buyerId: userId }, { sellerId: userId }] };
    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: this.includeConversation(),
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return { items, total, page: currentPage, limit: take, pages: Math.ceil(total / take) };
  }

  async messages(userId: number, conversationId: number, cursor?: number, limit = 30) {
    await this.assertParticipant(userId, conversationId);
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > take;
    const items = rows.slice(0, take).reverse();
    return { items, nextCursor: hasMore ? rows[take - 1]?.id : null, limit: take };
  }

  async send(userId: number, conversationId: number, content: string) {
    await this.assertActive(userId);
    const trimmedContent = content.trim();
    if (!trimmedContent) throw new BadRequestException('Message content is required');
    const conversation = await this.assertParticipant(userId, conversationId);
    const otherUserId = conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
    if (await this.blocks.isBlocked(userId, otherUserId)) throw new ForbiddenException('Messaging is blocked');
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId: userId, content: trimmedContent },
        include: { sender: { select: { id: true, displayName: true } } },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
      return created;
    });
    this.gateway.emitMessage(conversationId, message);
    void this.push.notifyUser(otherUserId, 'New message', trimmedContent.slice(0, 120)).catch(() => undefined);
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
      listing: { include: { images: { orderBy: { displayOrder: 'asc' as const }, take: 1 } } },
      buyer: { select: { id: true, displayName: true, profileImage: true, location: true } },
      seller: { select: { id: true, displayName: true, profileImage: true, location: true } },
      messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
    };
  }
}
