import { Body, Controller, Post } from '@nestjs/common';
import { ReportReason } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: number },
    @Body() dto: {
      reportedUserId?: number;
      reportedListingId?: number;
      conversationId?: number;
      reason: ReportReason;
      details?: string;
    },
  ) {
    return this.reports.create(user.id, dto);
  }
}
