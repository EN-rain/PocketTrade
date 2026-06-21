import { FavoritesService } from './favorites.service';

describe('FavoritesService visibility', () => {
  it('lists only favorites whose listings remain public', async () => {
    const prisma = {
      favorite: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;
    const service = new FavoritesService(prisma);

    await service.list(7, 1, 20);

    const expectedWhere = {
      userId: 7,
      listing: { status: { in: ['active', 'sold'] } },
    };
    expect(prisma.favorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(prisma.favorite.count).toHaveBeenCalledWith({ where: expectedWhere });
  });
});
