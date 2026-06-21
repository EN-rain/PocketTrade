import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { RejectListingDto } from './dto/reject-listing.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto';
import { UpdateListingDto } from '../listings/dto/update-listing.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  @Get('dashboard')
  async dashboard() {
    return this.adminService.dashboard();
  }

  @Get('listings')
  async listListings(@Query() query: AdminListingsQueryDto) {
    return this.adminService.listListings(query);
  }

  @Get('listings/:id')
  async getListing(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getListing(id);
  }

  @Patch('listings/:id')
  async updateListing(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateListingDto, @CurrentUser() user: { id: number }) {
    return this.adminService.updateListing(id, user.id, dto);
  }

  @Post('listings/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveListing(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.adminService.setListingStatus(id, user.id, 'active');
  }

  @Post('listings/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectListing(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: RejectListingDto,
  ) {
    return this.adminService.setListingStatus(id, user.id, 'rejected', dto.reason);
  }

  @Post('listings/:id/remove')
  @HttpCode(HttpStatus.OK)
  async removeListing(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.adminService.setListingStatus(id, user.id, 'removed');
  }

  @Post('listings/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreListing(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.adminService.setListingStatus(id, user.id, 'pending');
  }

  @Get('users')
  async listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  async getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUser(id);
  }

  @Get('users/:id/listings')
  async getUserListings(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.userListings(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(id, user.id, dto.reason);
  }

  @Post('users/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreUser(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.adminService.restoreUser(id, user.id);
  }

  @Get('analytics/search')
  async searchAnalytics() {
    return this.adminService.searchAnalytics();
  }

  @Get('reports')
  async listReports(@Query() query: AdminReportsQueryDto) {
    return this.adminService.listReports(query.status, query.page, query.limit);
  }

  @Post('reports/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveReport(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.adminService.setReportStatus(id, user.id, 'reviewed');
  }

  @Post('reports/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissReport(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    return this.adminService.setReportStatus(id, user.id, 'dismissed');
  }

  @Get('activity')
  async activity(@Query() query: PaginationQueryDto) {
    return this.adminService.activity(query.page, query.limit);
  }
}
