import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5, name: 'default' }]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            requestOtp: jest
              .fn()
              .mockResolvedValue({ success: true, message: 'OTP sent', expiresAt: '2026-06-17T12:00:00.000Z', devCode: '123456' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('requestOtp returns success with dev code', async () => {
    const result = await controller.requestOtp({ mobileNumber: '+14155552671' });
    expect(result.success).toBe(true);
    expect(result.devCode).toBe('123456');
  });
});