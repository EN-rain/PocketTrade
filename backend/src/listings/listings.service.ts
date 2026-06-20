import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
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
    for (const file of files) {
      this.assertValidImage(file);
    }
    const uploaded: { imageUrl: string; publicId: string; displayOrder: number }[] = [];
    try {
      await Promise.all(files.map(async (file, index) => {
        const safeName = `${Date.now()}-${index}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
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
    return this.prisma.listing.update({
      where: { id },
      data: { ...dto, status: listing.status === 'active' ? 'pending' : listing.status },
      include: this.includeListing().include,
    });
  }

  async setStatusOwn(sellerId: number, id: number, status: ListingStatus) {
    await this.assertActiveUser(sellerId);
    await this.assertOwnedListing(sellerId, id);
    return this.prisma.listing.update({
      where: { id },
      data: { status },
      include: this.includeListing().include,
    });
  }

  async removeOwn(sellerId: number, id: number) {
    await this.setStatusOwn(sellerId, id, 'removed');
  }

  async markSold(sellerId: number, id: number) {
    return this.setStatusOwn(sellerId, id, 'sold');
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
    const where: any = { status: { in: ['active', 'sold'] } };
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
    let [items, total] = await Promise.all([
      this.prisma.listing.findMany({ where, orderBy, skip, take, include: this.includeListingSummary().include }),
      this.prisma.listing.count({ where }),
    ]);
    if (query.sort === 'relevant' && query.q) {
      items = items.sort((a, b) => this.relevanceScore(b, query.q!) - this.relevanceScore(a, query.q!));
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

  private relevanceScore(listing: { brand: string; model: string; description: string }, term: string): number {
    const q = term.toLowerCase();
    let score = 0;
    if (listing.brand.toLowerCase() === q) score += 8;
    if (listing.model.toLowerCase() === q) score += 6;
    if (listing.brand.toLowerCase().includes(q)) score += 4;
    if (listing.model.toLowerCase().includes(q)) score += 3;
    if (listing.description.toLowerCase().includes(q)) score += 1;
    return score;
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

  private assertValidImage(file: Express.Multer.File) {
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    const bytes = file.buffer;
    const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const isWebp =
      bytes.length > 12 &&
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Uploaded file content is not a supported image');
    }
  }
}
