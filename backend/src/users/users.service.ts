import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../storage/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async getById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
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
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async uploadProfileImage(id: number, file: Express.Multer.File) {
    this.assertValidImage(file);
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploaded = await this.cloudinary.uploadImage(file.buffer, safeName, 'PocketTrade/profiles');
    return this.updateMe(id, { profileImage: uploaded.url });
  }

  async changePassword(id: number, dto: { currentPassword?: string; newPassword?: string }) {
    const currentPassword = dto.currentPassword?.trim() ?? '';
    const newPassword = dto.newPassword ?? '';
    if (newPassword.length < 8 || newPassword.length > 128) {
      throw new BadRequestException('New password must be 8-128 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user?.passwordHash) throw new UnauthorizedException('Password cannot be changed for this account');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { success: true };
  }

  async requestDeletion(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { deletionRequestedAt: new Date() },
      select: { id: true, email: true, deletionRequestedAt: true },
    });
  }

  private assertValidImage(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Profile image is required');
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }
    if (file.size > 1 * 1024 * 1024) {
      throw new BadRequestException('Profile image must be 1 MB or smaller');
    }
  }
}
