import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async add(userId: number, listingId: number) {
    // Verify listing exists
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: { in: ['active', 'sold'] } },
    });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);

    // Try to insert; if duplicate, return existing
    try {
      return await this.prisma.favorite.create({ data: { userId, listingId } });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Already favorited — idempotent return
        return this.prisma.favorite.findUnique({
          where: { userId_listingId: { userId, listingId } },
          include: { listing: { include: { images: { orderBy: { displayOrder: 'asc' } } } } },
        });
      }
      throw e;
    }
  }

  async remove(userId: number, listingId: number) {
    await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
  }

  async list(userId: number, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          listing: {
            include: {
              images: { orderBy: { displayOrder: 'asc' }, take: 1 },
              seller: { select: { id: true, displayName: true } },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);
    return { items, total, page: currentPage, limit: take, pages: Math.ceil(total / take) };
  }
}
