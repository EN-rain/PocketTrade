import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly resend?: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async requestOtp(dto: RequestOtpDto): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
    devCode?: string;
  }> {
    const email = dto.email.trim().toLowerCase();
    const latest = await this.prisma.otpRequest.findFirst({
      where: { email, verified: false },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 60_000) {
      throw new BadRequestException('Please wait 60 seconds before requesting another code');
    }

    await this.prisma.otpRequest.updateMany({
      where: { email, verified: false },
      data: { verified: true },
    });

    const code = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    const hashedOtp = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60_000);

    await this.prisma.otpRequest.create({
      data: { email, hashedOtp, expiresAt, attempts: 0, verified: false },
    });

    await this.deliverOtp(email, code);

    const isDev = process.env.NODE_ENV !== 'production';
    return {
      success: true,
      message: 'OTP sent',
      expiresAt: expiresAt.toISOString(),
      ...(isDev ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: number; email: string; role: string; displayName: string | null };
    isNewUser: boolean;
  }> {
    const email = dto.email.trim().toLowerCase();
    const req = await this.prisma.otpRequest.findFirst({
      where: { email, verified: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!req) throw new UnauthorizedException('OTP expired or not found');
    if (req.attempts >= 5) throw new UnauthorizedException('Too many attempts');

    const ok = await bcrypt.compare(dto.code, req.hashedOtp);
    if (!ok) {
      await this.prisma.otpRequest.update({
        where: { id: req.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.otpRequest.update({
      where: { id: req.id },
      data: { verified: true },
    });

    let user = await this.prisma.user.findUnique({ where: { email } });
    let isNewUser = false;
    if (!user) {
      user = await this.prisma.user.create({
        data: { email, role: 'user', accountStatus: 'active', lastActiveAt: new Date() },
      });
      isNewUser = true;
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
      isNewUser,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.accountStatus !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.prisma.revokedRefreshToken.upsert({
      where: { tokenHash: this.hashToken(refreshToken) },
      update: {},
      create: {
        userId: payload.sub,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60_000),
      },
    });
  }

  private async verifyRefreshToken(refreshToken: string): Promise<{ sub: number; type: string; exp?: number }> {
    let payload: { sub: number; type: string; exp?: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token');
    const revoked = await this.prisma.revokedRefreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
    });
    if (revoked) throw new UnauthorizedException('Refresh token has been revoked');
    return payload;
  }

  private async issueTokens(
    userId: number,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as unknown as number,
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      { expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '30d') as unknown as number },
    );
    return { accessToken, refreshToken };
  }

  private async deliverOtp(email: string, code: string): Promise<void> {
    if (!this.resend || process.env.NODE_ENV !== 'production') {
      this.logger.log(`[OTP] email=${email} code=${code}`);
      return;
    }
    await this.resend.emails.send({
      from: this.config.get<string>('OTP_FROM_EMAIL', 'PocketTrade <otp@example.com>'),
      to: email,
      subject: 'Your PocketTrade login code',
      text: `Your PocketTrade login code is ${code}. It expires in 5 minutes.`,
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
