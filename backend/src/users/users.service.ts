import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { validateImageFile } from '../common/images/image-validation';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../storage/cloudinary.service';
import { ChangePasswordDto } from './dto/account-credentials.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async getById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect(),
    });
  }

  async updateMe(id: number, dto: UpdateMeDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        location: dto.location,
        notificationPreferences:
          dto.notificationPreferences === undefined
            ? undefined
            : (dto.notificationPreferences as Prisma.InputJsonObject),
      },
      select: this.safeUserSelect(),
    });
  }

  async uploadProfileImage(id: number, file: Express.Multer.File | undefined) {
    const extension = validateImageFile(file, 1 * 1024 * 1024);
    const uploaded = await this.cloudinary.uploadImage(
      file!.buffer,
      `${Date.now()}-${randomUUID()}${extension}`,
      'PocketTrade/profiles',
    );
    return this.prisma.user.update({
      where: { id },
      data: { profileImage: uploaded.url },
      select: this.safeUserSelect(),
    });
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user?.passwordHash) throw new UnauthorizedException('Password cannot be changed for this account');

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });
    return { success: true, sessionsRevoked: true };
  }

  async requestDeletion(id: number) {
    const deletedAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new BadRequestException('Account not found');
      if (user.role === 'admin') throw new BadRequestException('Administrator accounts cannot be deleted here');

      await tx.listing.updateMany({ where: { sellerId: id }, data: { status: 'removed' } });
      await tx.favorite.deleteMany({ where: { userId: id } });
      await tx.pushToken.deleteMany({ where: { userId: id } });
      await tx.revokedRefreshToken.deleteMany({ where: { userId: id } });
      await tx.blockedUser.deleteMany({ where: { OR: [{ blockerId: id }, { blockedId: id }] } });

      return tx.user.update({
        where: { id },
        data: {
          email: `deleted-${id}-${randomUUID()}@deleted.pockettrade.local`,
          displayName: 'Deleted User',
          profileImage: null,
          location: null,
          notificationPreferences: Prisma.JsonNull,
          passwordHash: null,
          emailVerifiedAt: null,
          lastActiveAt: null,
          suspensionReason: null,
          deletionRequestedAt: deletedAt,
          accountStatus: 'deleted',
          tokenVersion: { increment: 1 },
        },
        select: {
          id: true,
          accountStatus: true,
          deletionRequestedAt: true,
        },
      });
    });
  }

  private safeUserSelect() {
    return {
      id: true,
      email: true,
      displayName: true,
      profileImage: true,
      location: true,
      notificationPreferences: true,
      deletionRequestedAt: true,
      accountStatus: true,
      emailVerifiedAt: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      lastActiveAt: true,
    } as const;
  }
}
