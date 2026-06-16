import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }
}