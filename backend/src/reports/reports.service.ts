import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ReportReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    reporterId: number,
    dto: {
      reportedUserId?: number;
      reportedListingId?: number;
      conversationId?: number;
      reason: ReportReason;
      details?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: reporterId } });
    if (!user || user.accountStatus !== 'active') throw new ForbiddenException('Account is not active');
    if (!dto.reportedUserId && !dto.reportedListingId && !dto.conversationId) {
      throw new BadRequestException('A report target is required');
    }
    if (dto.reportedUserId !== undefined) {
      const reportedUser = await this.prisma.user.findUnique({
        where: { id: dto.reportedUserId },
        select: { id: true },
      });
      if (!reportedUser) throw new NotFoundException(`User ${dto.reportedUserId} not found`);
      if (dto.reportedUserId === reporterId) throw new BadRequestException('Cannot report yourself');
    }
    if (dto.reportedListingId !== undefined) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: dto.reportedListingId },
        select: { id: true },
      });
      if (!listing) throw new NotFoundException(`Listing ${dto.reportedListingId} not found`);
    }
    if (dto.conversationId !== undefined) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: dto.conversationId },
        select: { buyerId: true, sellerId: true },
      });
      if (!conversation) throw new NotFoundException(`Conversation ${dto.conversationId} not found`);
      if (conversation.buyerId !== reporterId && conversation.sellerId !== reporterId) {
        throw new ForbiddenException('Conversation does not belong to current user');
      }
    }
    return this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId: dto.reportedUserId,
        reportedListingId: dto.reportedListingId,
        conversationId: dto.conversationId,
        reason: dto.reason,
        details: dto.details,
      },
    });
  }
}
