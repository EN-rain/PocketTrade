import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';

describe('ListingsService moderation flow', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    listing: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    searchLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    $queryRaw: jest.fn(),
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
      size: 4,
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

  it('prevents a pending listing from bypassing moderation by marking it sold', async () => {
    prisma.listing.findUnique.mockResolvedValue({ id: 20, sellerId: 7, status: 'pending' });

    await expect(service.markSold(7, 20)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.listing.update).not.toHaveBeenCalled();
  });

  it('returns a sold listing to pending review when its content changes', async () => {
    prisma.listing.findUnique.mockResolvedValue({ id: 20, sellerId: 7, status: 'sold' });
    prisma.listing.update.mockResolvedValue({ id: 20, status: 'pending' });

    await service.updateOwn(7, 20, { description: 'A newly changed description.' });

    expect(prisma.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) }),
    );
  });

  it('allows only an approved active listing to be marked sold', async () => {
    prisma.listing.findUnique.mockResolvedValue({ id: 20, sellerId: 7, status: 'active' });
    prisma.listing.update.mockResolvedValue({ id: 20, status: 'sold' });

    await expect(service.markSold(7, 20)).resolves.toEqual({ id: 20, status: 'sold' });
  });

  it('paginates globally ranked relevance results in the database', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 8 }, { id: 3 }]);
    prisma.listing.count.mockResolvedValue(2);
    prisma.listing.findMany.mockResolvedValue([
      { id: 3, brand: 'Apple', model: 'iPhone' },
      { id: 8, brand: 'Apple', model: 'Apple' },
    ]);

    const result = await service.search({ q: 'Apple', sort: 'relevant', page: 1, limit: 20 });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result.items.map((item: any) => item.id)).toEqual([8, 3]);
    expect(result.total).toBe(2);
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
