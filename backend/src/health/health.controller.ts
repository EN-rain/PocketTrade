import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/public.decorator';

interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'ok' | 'error';
  uptime: number;
  version: string;
  timestamp: string;
}

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health(): Promise<HealthResponse> {
    const response: HealthResponse = {
      status: 'ok',
      db: 'ok',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.0.1',
      timestamp: new Date().toISOString(),
    };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      response.status = 'degraded';
      response.db = 'error';
      throw new ServiceUnavailableException(response);
    }
    return response;
  }
}