import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('returns ok when DB is reachable', async () => {
    const result = await controller.health();
    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
    expect(result.uptime).toBeGreaterThan(0);
    expect(result.version).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('returns degraded when DB query throws', async () => {
    jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('DB down'));
    await expect(controller.health()).rejects.toThrow();
  });
});