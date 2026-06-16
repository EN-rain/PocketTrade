import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../storage/cloudinary.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings.dto';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(
    sellerId: number,
    dto: CreateListingDto,
    fileBuffer: Buffer,
    originalName: string,
  ) {
    const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    let url: string;
    try {
      const result = await this.cloudinary.uploadImage(
        fileBuffer,
        safeName,
        'marketplace/listings',
      );
      url = result.url;
    } catch (err) {
      throw new InternalServerErrorException(
        `Image upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    return this.prisma.listing.create({
      data: {
        sellerId,
        brand: dto.brand,
        model: dto.model,
        price: dto.price,
        condition: dto.condition,
        storage: dto.storage,
        colour: dto.colour ?? null,
        description: dto.description,
        location: dto.location,
        status: 'pending',
        images: {
          create: [{ imageUrl: url, displayOrder: 0 }],
        },
      },
      include: { images: true },
    });
  }

  async getById(id: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        seller: { select: { id: true, displayName: true } },
      },
    });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  async search(query: ListListingsQueryDto) {
    const where: any = { status: 'active' };
    if (query.brand) where.brand = { equals: query.brand, mode: 'insensitive' };
    if (query.model) where.model = { contains: query.model, mode: 'insensitive' };
    if (query.condition) where.condition = query.condition;
    if (query.storage) where.storage = query.storage;
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }
    if (query.q) {
      where.OR = [
        { brand: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const orderBy =
      query.sort === 'oldest' ? { createdAt: 'asc' as const } :
      query.sort === 'price_asc' ? { price: 'asc' as const } :
      query.sort === 'price_desc' ? { price: 'desc' as const } :
      { createdAt: 'desc' as const };
    const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
    const take = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({ where, orderBy, skip, take, include: { images: { orderBy: { displayOrder: 'asc' } } } }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total, page: query.page ?? 1, limit: take, pages: Math.ceil(total / take) };
  }
}