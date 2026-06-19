import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy account security', () => {
  const config = {
    get: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;

  const prisma = {
    user: { findUnique: jest.fn() },
  } as any;

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(config, prisma);
  });

  it('uses the current database role instead of stale token claims', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
      email: 'admin@pockettrade.local',
      role: 'admin',
      accountStatus: 'active',
    });

    await expect(
      strategy.validate({ sub: 12, email: 'old@example.com', role: 'user' }),
    ).resolves.toEqual({
      id: 12,
      email: 'admin@pockettrade.local',
      role: 'admin',
    });
  });

  it('rejects suspended accounts even when their access token is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 13,
      email: 'suspended@pockettrade.local',
      role: 'user',
      accountStatus: 'suspended',
    });

    await expect(strategy.validate({ sub: 13 })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects refresh tokens used as access tokens', async () => {
    await expect(strategy.validate({ sub: 14, type: 'refresh' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
