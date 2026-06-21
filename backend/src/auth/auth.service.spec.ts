import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService OTP verification', () => {
  const jwtService = {} as JwtService;
  const config = {} as ConfigService;

  it('commits a failed-attempt increment before returning an invalid-code error', async () => {
    const hashedOtp = await bcrypt.hash('123456', 4);
    let committedAttempts = 0;

    const prisma = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => {
        let pendingAttempts = 0;
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          otpRequest: {
            findFirst: jest.fn().mockResolvedValue({
              id: 7,
              hashedOtp,
              attempts: 0,
            }),
            update: jest.fn().mockImplementation(async ({ data }: any) => {
              if (data.attempts?.increment === 1) pendingAttempts += 1;
              return { id: 7 };
            }),
          },
        };

        try {
          const result = await callback(tx);
          committedAttempts += pendingAttempts;
          return result;
        } catch (error) {
          pendingAttempts = 0;
          throw error;
        }
      }),
    } as any;

    const service = new AuthService(prisma, jwtService, config);

    await expect(
      (service as any).verifyOtpCode('user@example.test', '654321'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(committedAttempts).toBe(1);
  });
});
