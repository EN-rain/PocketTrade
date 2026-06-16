import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: AdminLoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.role !== 'admin' || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, mobileNumber: user.mobileNumber, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as unknown as number,
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      { expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '30d') as unknown as number },
    );
    await this.prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, mobileNumber: user.mobileNumber, role: user.role },
    };
  }

  async listListings(query: AdminListingsQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.brand) where.brand = { equals: query.brand, mode: 'insensitive' };
    if (query.model) where.model = { contains: query.model, mode: 'insensitive' };

    const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
    const take = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { images: { orderBy: { displayOrder: 'asc' } } },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total, page: query.page ?? 1, limit: take, pages: Math.ceil(total / take) };
  }

  async approveListing(id: number, adminId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    if (listing.status !== 'pending') {
      throw new BadRequestException(`Listing is ${listing.status}, can only approve pending listings`);
    }
    const updated = await this.prisma.listing.update({
      where: { id },
      data: { status: 'active' },
    });
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: String(adminId),
        action: 'approve_listing',
        targetType: 'listing',
        targetId: String(id),
        previousValue: { status: listing.status },
        newValue: { status: updated.status },
      },
    });
    return updated;
  }

  async rejectListing(id: number, adminId: number, reason?: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    if (listing.status !== 'pending') {
      throw new BadRequestException(`Listing is ${listing.status}, can only reject pending listings`);
    }
    const updated = await this.prisma.listing.update({
      where: { id },
      data: { status: 'rejected' },
    });
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: String(adminId),
        action: 'reject_listing',
        targetType: 'listing',
        targetId: String(id),
        previousValue: { status: listing.status, reason: null },
        newValue: { status: updated.status, reason: reason ?? null },
      },
    });
    return updated;
  }

  async listUsers(query: AdminUsersQueryDto) {
    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.accountStatus) where.accountStatus = query.accountStatus;

    const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
    const take = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          mobileNumber: true,
          email: true,
          displayName: true,
          accountStatus: true,
          role: true,
          createdAt: true,
          lastActiveAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: query.page ?? 1, limit: take, pages: Math.ceil(total / take) };
  }

  async suspendUser(id: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.accountStatus === 'suspended') {
      throw new BadRequestException('User is already suspended');
    }
    if (user.role === 'admin') {
      throw new BadRequestException('Cannot suspend an admin');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { accountStatus: 'suspended' },
    });
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: String(adminId),
        action: 'suspend_user',
        targetType: 'user',
        targetId: String(id),
        previousValue: { accountStatus: user.accountStatus },
        newValue: { accountStatus: updated.accountStatus },
      },
    });
    return updated;
  }

  async restoreUser(id: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.accountStatus === 'active') {
      throw new BadRequestException('User is already active');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { accountStatus: 'active' },
    });
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: String(adminId),
        action: 'restore_user',
        targetType: 'user',
        targetId: String(id),
        previousValue: { accountStatus: user.accountStatus },
        newValue: { accountStatus: updated.accountStatus },
      },
    });
    return updated;
  }

  async dashboard() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalListings,
      pendingListings,
      activeListings,
      soldListings,
      rejectedListings,
      removedListings,
      expiredListings,
      recentReports,
      recentSearches,
      topSearchRaw,
      newListings7d,
      newUsers7d,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { accountStatus: 'active' } }),
      this.prisma.user.count({ where: { accountStatus: 'suspended' } }),
      this.prisma.listing.count(),
      this.prisma.listing.count({ where: { status: 'pending' } }),
      this.prisma.listing.count({ where: { status: 'active' } }),
      this.prisma.listing.count({ where: { status: 'sold' } }),
      this.prisma.listing.count({ where: { status: 'rejected' } }),
      this.prisma.listing.count({ where: { status: 'removed' } }),
      this.prisma.listing.count({ where: { status: 'expired' } }),
      this.prisma.report.count({ where: { createdAt: { gt: sevenDaysAgo } } }),
      this.prisma.searchLog.count({ where: { createdAt: { gt: sevenDaysAgo } } }),
      this.prisma.$queryRaw<{ search_term: string; count: bigint }[]>`
        SELECT search_term as "searchTerm", COUNT(*) as count
        FROM search_logs
        GROUP BY search_term
        ORDER BY count DESC
        LIMIT 10
      `,
      this.prisma.listing.count({ where: { createdAt: { gt: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gt: sevenDaysAgo } } }),
    ]);

    const topSearchTerms = topSearchRaw.map((r) => ({
      term: r.search_term,
      count: Number(r.count),
    }));

    return {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      listings: {
        total: totalListings,
        pending: pendingListings,
        active: activeListings,
        sold: soldListings,
        rejected: rejectedListings,
        removed: removedListings,
        expired: expiredListings,
      },
      recentReports,
      recentSearches,
      topSearchTerms,
      newListingsLast7Days: newListings7d,
      newUsersLast7Days: newUsers7d,
    };
  }
}