import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
    devCode?: string;
  }> {
    const { mobileNumber } = dto;

    // 1. Invalidate any prior unverified OTPs for this mobile
    await this.prisma.otpRequest.updateMany({
      where: { mobileNumber, verified: false },
      data: { verified: true },
    });

    // 2. Generate 6-digit code
    const code = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');

    // 3. Hash with bcrypt
    const hashedOtp = await bcrypt.hash(code, 10);

    // 4. Compute expiry (5 min from now)
    const expiresAt = new Date(Date.now() + 5 * 60_000);

    // 5. Persist
    await this.prisma.otpRequest.create({
      data: {
        mobileNumber,
        hashedOtp,
        expiresAt,
        attempts: 0,
        verified: false,
      },
    });

    // 6. Log to stdout (mock SMS provider)
    console.log(
      `[OTP] mobile=${mobileNumber} code=${code} expiresAt=${expiresAt.toISOString()}`,
    );

    // 7. Return dev response (only in non-production)
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
    user: { id: number; mobileNumber: string; role: string };
    isNewUser: boolean;
  }> {
    const { mobileNumber, code } = dto;

    // 1. Find latest unverified, unexpired OTP request for this mobile
    const req = await this.prisma.otpRequest.findFirst({
      where: {
        mobileNumber,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!req) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    // 2. Rate limit: max 5 attempts per request
    if (req.attempts >= 5) {
      throw new UnauthorizedException('Too many attempts');
    }

    // 3. Compare
    const ok = await bcrypt.compare(code, req.hashedOtp);
    if (!ok) {
      await this.prisma.otpRequest.update({
        where: { id: req.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // 4. Mark verified
    await this.prisma.otpRequest.update({
      where: { id: req.id },
      data: { verified: true },
    });

    // 5. Find or create user
    let user = await this.prisma.user.findUnique({ where: { mobileNumber } });
    let isNewUser = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          mobileNumber,
          role: 'user',
          accountStatus: 'active',
          lastActiveAt: new Date(),
        },
      });
      isNewUser = true;
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
    }

    // 6. Issue JWTs
    const tokens = await this.issueTokens(user.id, user.mobileNumber, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
      isNewUser,
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: number; type: string };

    try {
      payload = await this.jwtService.verifyAsync<{ sub: number; type: string }>(
        refreshToken,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokens(user.id, user.mobileNumber, user.role);
  }

  private async issueTokens(
    userId: number,
    mobileNumber: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, mobileNumber, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as unknown as number,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      {
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '30d') as unknown as number,
      },
    );

    return { accessToken, refreshToken };
  }
}