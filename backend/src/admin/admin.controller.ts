import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { RejectListingDto } from './dto/reject-listing.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

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

  @Get('listings')
  async listListings(@Query() query: AdminListingsQueryDto) {
    return this.adminService.listListings(query);
  }

  @Post('listings/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveListing(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.approveListing(id, user.id);
  }

  @Post('listings/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectListing(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: RejectListingDto,
  ) {
    return this.adminService.rejectListing(id, user.id, dto.reason);
  }

  @Get('users')
  async listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.suspendUser(id, user.id);
  }

  @Post('users/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.restoreUser(id, user.id);
  }

  @Get('dashboard')
  async dashboard() {
    return this.adminService.dashboard();
  }
}