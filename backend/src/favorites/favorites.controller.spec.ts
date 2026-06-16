import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { APP_GUARD } from '@nestjs/core';

describe('FavoritesController', () => {
  let controller: FavoritesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [
        { provide: APP_GUARD, useValue: { canActivate: () => true } },
        {
          provide: FavoritesService,
          useValue: {
            list: jest.fn().mockResolvedValue([
              { id: 1, userId: 1, listingId: 5, listing: { id: 5, brand: 'Apple', model: 'iPhone 15' } },
            ]),
            add: jest.fn().mockResolvedValue({ id: 1, userId: 1, listingId: 5 }),
          },
        },
      ],
    }).compile();

    controller = module.get<FavoritesController>(FavoritesController);
  });

  it('list returns user favorites', async () => {
    const result = (await controller.list({ id: 1 })) ?? [];
    expect(result[0].listingId).toBe(5);
  });

  it('add adds a favorite', async () => {
    const result = (await controller.add({ id: 1 }, { listingId: 5 }))!;
    expect(result.listingId).toBe(5);
  });
});