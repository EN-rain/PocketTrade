import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: number, blockedId: number) {
    if (blockerId === blockedId) throw new BadRequestException('Cannot block yourself');
    return this.prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
  }

  async unblock(blockerId: number, blockedId: number) {
    await this.prisma.blockedUser.deleteMany({ where: { blockerId, blockedId } });
  }

  async isBlocked(a: number, b: number) {
    const row = await this.prisma.blockedUser.findFirst({
      where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    });
    return Boolean(row);
  }
}
