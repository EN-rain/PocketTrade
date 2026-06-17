import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, mobileNumber, ...rest } = user;
    return rest;
  }

  async updateMe(
    id: number,
    dto: { displayName?: string; location?: string; profileImage?: string; notificationPreferences?: unknown },
  ) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        location: dto.location,
        profileImage: dto.profileImage,
        notificationPreferences: dto.notificationPreferences === undefined ? undefined : dto.notificationPreferences as object,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, mobileNumber, ...rest } = user;
    return rest;
  }

  async requestDeletion(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { deletionRequestedAt: new Date() },
      select: { id: true, email: true, deletionRequestedAt: true },
    });
  }
}
