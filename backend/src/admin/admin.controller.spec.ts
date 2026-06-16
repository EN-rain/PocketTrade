import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30, name: 'default' }]),
      ],
      controllers: [AdminController],
      providers: [
        { provide: APP_GUARD, useValue: { canActivate: () => true } },
        {
          provide: AdminService,
          useValue: {
            login: jest.fn().mockResolvedValue({
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
              user: { id: 1, email: 'admin@test.com', role: 'admin' },
            }),
            dashboard: jest.fn().mockResolvedValue({
              users: { total: 10, active: 8, suspended: 2 },
              listings: { total: 50, pending: 5, active: 40 },
            }),
          },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('login returns tokens and user', async () => {
    const result = await controller.login({ email: 'admin@test.com', password: 'password123' });
    expect(result.accessToken).toBe('access-token');
    expect(result.user.role).toBe('admin');
  });

  it('dashboard returns stats', async () => {
    const result = await controller.dashboard();
    expect(result.users.total).toBe(10);
    expect(result.listings.active).toBe(40);
  });
});