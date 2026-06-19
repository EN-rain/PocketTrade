import { NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';

describe('ListingsService moderation flow', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    listing: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    searchLog: { create: jest.fn() },
  } as any;

  const cloudinary = {
    uploadImage: jest.fn(),
  } as any;

  let service: ListingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ListingsService(prisma, cloudinary);
    prisma.user.findUnique.mockResolvedValue({ id: 7, accountStatus: 'active' });
    cloudinary.uploadImage.mockResolvedValue({ url: 'https://cdn.example.test/phone.jpg' });
  });

  it('creates every seller submission as pending', async () => {
    prisma.listing.create.mockImplementation(async ({ data }: any) => ({ id: 20, ...data }));
    const file = {
      originalname: 'phone.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    } as Express.Multer.File;

    const result = await service.create(
      7,
      {
        brand: 'Apple',
        model: 'iPhone 13',
        price: 24000,
        condition: 'good',
        storage: '128GB',
        colour: 'Black',
        description: 'A valid used phone listing.',
        location: 'Cebu City',
      },
      [file],
    );

    expect(result.status).toBe('pending');
    expect(prisma.listing.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) }),
    );
  });

  it('does not expose a pending listing through the public detail endpoint', async () => {
    prisma.listing.findFirst.mockResolvedValue(null);

    await expect(service.getById(99)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99, status: { in: ['active', 'sold'] } },
      }),
    );
  });

  it('returns only active and sold listings in public search', async () => {
    prisma.listing.findMany.mockResolvedValue([]);
    prisma.listing.count.mockResolvedValue(0);

    await service.search({});

    expect(prisma.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['active', 'sold'] } },
      }),
    );
  });
});
