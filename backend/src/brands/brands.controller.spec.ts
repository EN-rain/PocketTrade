import { Test, TestingModule } from '@nestjs/testing';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

describe('BrandsController', () => {
  let controller: BrandsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandsController],
      providers: [
        {
          provide: BrandsService,
          useValue: {
            list: jest.fn().mockResolvedValue([
              { id: 1, name: 'Apple', slug: 'apple' },
              { id: 2, name: 'Samsung', slug: 'samsung' },
            ]),
          },
        },
      ],
    }).compile();

    controller = module.get<BrandsController>(BrandsController);
  });

  it('returns list of brands', async () => {
    const result = await controller.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Apple');
  });
});