import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateReportDto,
  ) {
    return this.reports.create(user.id, dto);
  }
}
