import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: number;
  email?: string;
  role?: string;
  type?: string;
  ver?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable must be set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('Refresh tokens cannot access API routes');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        tokenVersion: true,
      },
    });

    if (!user || user.accountStatus !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }
    if (!Number.isInteger(payload.ver) || payload.ver !== user.tokenVersion) {
      throw new UnauthorizedException('Session has been revoked');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
