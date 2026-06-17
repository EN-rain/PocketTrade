import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
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
