import { Test, TestingModule } from '@nestjs/testing';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { CloudinaryService } from '../storage/cloudinary.service';
import { APP_GUARD } from '@nestjs/core';

describe('ListingsController', () => {
  let controller: ListingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingsController],
      providers: [
        { provide: APP_GUARD, useValue: { canActivate: () => true } },
        {
          provide: ListingsService,
          useValue: {
            search: jest.fn().mockResolvedValue({
              items: [{ id: 1, brand: 'Apple', model: 'iPhone 15', price: 999, status: 'active' }],
              total: 1,
              page: 1,
              limit: 20,
              pages: 1,
            }),
            getById: jest.fn().mockResolvedValue({
              id: 1,
              brand: 'Apple',
              model: 'iPhone 15',
              price: 999,
              status: 'active',
              images: [],
              seller: { id: 1, displayName: 'Test Seller' },
            }),
          },
        },
        { provide: CloudinaryService, useValue: { uploadImage: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ListingsController>(ListingsController);
  });

  it('list returns paginated listings', async () => {
    const result = await controller.list({});
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('getById returns a single listing', async () => {
    const result = await controller.getById(1);
    expect(result.id).toBe(1);
    expect(result.brand).toBe('Apple');
  });
});