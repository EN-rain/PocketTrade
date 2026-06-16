import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { APP_GUARD } from '@nestjs/core';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: APP_GUARD, useValue: { canActivate: () => true } },
        {
          provide: UsersService,
          useValue: {
            getById: jest.fn().mockResolvedValue({
              id: 1,
              mobileNumber: '+14155552671',
              role: 'user',
              accountStatus: 'active',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('getMe returns current user without password', async () => {
    // Simulate @CurrentUser by calling directly with mocked user via service
    const result = (await controller.getMe({ id: 1 }))!;
    expect(result.id).toBe(1);
    expect(result).not.toHaveProperty('passwordHash');
  });
});