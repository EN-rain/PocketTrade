import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { validateImageFile } from '../common/images/image-validation';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../storage/cloudinary.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(sellerId: number, dto: CreateListingDto, files: Express.Multer.File[]) {
    await this.assertActiveUser(sellerId);
    const extensions = files.map((file) => validateImageFile(file, 5 * 1024 * 1024));
    const uploaded: { imageUrl: string; publicId: string; displayOrder: number }[] = [];
    try {
      await Promise.all(files.map(async (file, index) => {
        const safeName = `${Date.now()}-${index}-${randomUUID()}${extensions[index]}`;
        const result = await this.cloudinary.uploadImage(file.buffer, safeName, 'PocketTrade/listings');
        uploaded[index] = { imageUrl: result.url, publicId: result.publicId, displayOrder: index };
      }));
    } catch (err) {
      await Promise.all(uploaded.map((image) => this.cloudinary.deleteImage(image.publicId).catch(() => undefined)));
      throw new InternalServerErrorException(
        'Image upload failed',
      );
    }

    try {
      return await this.prisma.listing.create({
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
          images: { create: uploaded.map(({ imageUrl, displayOrder }) => ({ imageUrl, displayOrder })) },
        },
        include: this.includeListing().include,
      });
    } catch (err) {
      await Promise.all(uploaded.map((image) => this.cloudinary.deleteImage(image.publicId).catch(() => undefined)));
      throw err;
    }
  }

  async mine(sellerId: number, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: this.includeListing().include,
      }),
      this.prisma.listing.count({ where: { sellerId } }),
    ]);
    return { items, total, page: currentPage, limit: take, pages: Math.ceil(total / take) };
  }

  async updateOwn(sellerId: number, id: number, dto: UpdateListingDto) {
    await this.assertActiveUser(sellerId);
    const listing = await this.assertOwnedListing(sellerId, id);
    if (listing.status === 'removed') throw new BadRequestException('Removed listings cannot be edited');
    const requiresReview = ['active', 'sold', 'rejected', 'expired'].includes(listing.status);
    return this.prisma.listing.update({
      where: { id },
      data: { ...dto, status: requiresReview ? 'pending' : listing.status },
      include: this.includeListing().include,
    });
  }

  async removeOwn(sellerId: number, id: number) {
    await this.assertActiveUser(sellerId);
    const listing = await this.assertOwnedListing(sellerId, id);
    if (listing.status === 'removed') return;
    await this.prisma.listing.update({ where: { id }, data: { status: 'removed' } });
  }

  async markSold(sellerId: number, id: number) {
    await this.assertActiveUser(sellerId);
    const listing = await this.assertOwnedListing(sellerId, id);
    if (listing.status !== 'active') {
      throw new BadRequestException('Only an approved active listing can be marked sold');
    }
    return this.prisma.listing.update({
      where: { id },
      data: { status: 'sold' },
      include: this.includeListing().include,
    });
  }

  async republish(sellerId: number, id: number) {
    await this.assertActiveUser(sellerId);
    const listing = await this.assertOwnedListing(sellerId, id);
    if (!['expired', 'rejected', 'removed'].includes(listing.status)) {
      throw new BadRequestException('Only expired, rejected, or removed listings can be republished');
    }
    return this.prisma.listing.update({
      where: { id },
      data: { status: 'pending' },
      include: this.includeListing().include,
    });
  }

  async getById(id: number) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, status: { in: ['active', 'sold'] } },
      include: this.includeListing().include,
    });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  async search(query: ListListingsQueryDto) {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }
    const where: any = { status: query.status ? query.status : { in: ['active', 'sold'] } };
    if (query.brand) where.brand = { equals: query.brand, mode: 'insensitive' };
    if (query.model) where.model = { contains: query.model, mode: 'insensitive' };
    if (query.condition) where.condition = query.condition;
    if (query.storage) where.storage = { contains: query.storage, mode: 'insensitive' };
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
    let items;
    let total: number;
    if (query.sort === 'relevant' && query.q) {
      const [rankedIds, matchingCount] = await Promise.all([
        this.relevantListingIds(query, skip, take),
        this.prisma.listing.count({ where }),
      ]);
      total = matchingCount;
      const pageIds = rankedIds.map((row) => row.id);
      const pageRows = pageIds.length === 0
        ? []
        : await this.prisma.listing.findMany({
            where: { id: { in: pageIds } },
            include: this.includeListingSummary().include,
          });
      const rowById = new Map(pageRows.map((row) => [row.id, row]));
      items = pageIds.map((id) => rowById.get(id)).filter((row) => row !== undefined);
    } else {
      [items, total] = await Promise.all([
        this.prisma.listing.findMany({ where, orderBy, skip, take, include: this.includeListingSummary().include }),
        this.prisma.listing.count({ where }),
      ]);
    }
    if (query.q) {
      void this.prisma.searchLog.create({
        data: { searchTerm: query.q, filters: query as object, resultCount: total },
      }).catch(() => undefined);
    }
    return { items, total, page: query.page ?? 1, limit: take, pages: Math.ceil(total / take) };
  }

  private includeListing() {
    return {
      include: {
        images: { orderBy: { displayOrder: 'asc' as const } },
        seller: { select: { id: true, displayName: true, profileImage: true, location: true } },
      },
    };
  }

  private includeListingSummary() {
    return {
      include: {
        images: { orderBy: { displayOrder: 'asc' as const }, take: 1 },
        seller: { select: { id: true, displayName: true, profileImage: true, location: true } },
      },
    };
  }

  private relevantListingIds(query: ListListingsQueryDto, skip: number, take: number) {
    const conditions: Prisma.Sql[] = [Prisma.sql`"status"::text IN ('active', 'sold')`];
    if (query.brand) conditions.push(Prisma.sql`LOWER("brand") = LOWER(${query.brand})`);
    if (query.model) conditions.push(Prisma.sql`"model" ILIKE ${`%${query.model}%`}`);
    if (query.condition) conditions.push(Prisma.sql`"condition"::text = ${query.condition}`);
    if (query.storage) conditions.push(Prisma.sql`"storage" ILIKE ${`%${query.storage}%`}`);
    if (query.location) conditions.push(Prisma.sql`"location" ILIKE ${`%${query.location}%`}`);
    if (query.minPrice !== undefined) conditions.push(Prisma.sql`"price" >= ${query.minPrice}`);
    if (query.maxPrice !== undefined) conditions.push(Prisma.sql`"price" <= ${query.maxPrice}`);

    const q = query.q!;
    const contains = `%${q}%`;
    conditions.push(Prisma.sql`(
      "brand" ILIKE ${contains}
      OR "model" ILIKE ${contains}
      OR "description" ILIKE ${contains}
    )`);

    return this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT "id"
      FROM "listings"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY (
        CASE WHEN LOWER("brand") = LOWER(${q}) THEN 8 ELSE 0 END
        + CASE WHEN LOWER("model") = LOWER(${q}) THEN 6 ELSE 0 END
        + CASE WHEN "brand" ILIKE ${contains} THEN 4 ELSE 0 END
        + CASE WHEN "model" ILIKE ${contains} THEN 3 ELSE 0 END
        + CASE WHEN "description" ILIKE ${contains} THEN 1 ELSE 0 END
      ) DESC, "created_at" DESC
      LIMIT ${take} OFFSET ${skip}
    `);
  }

  private async assertActiveUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }
  }

  private async assertOwnedListing(sellerId: number, id: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    if (listing.sellerId !== sellerId) throw new ForbiddenException('Listing belongs to another seller');
    return listing;
  }

}
