import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: { id: number }) {
    return this.usersService.getById(user.id);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: { id: number },
    @Body() dto: { displayName?: string; location?: string; profileImage?: string; notificationPreferences?: unknown },
  ) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Post('me/delete-request')
  async requestDeletion(@CurrentUser() user: { id: number }) {
    return this.usersService.requestDeletion(user.id);
  }
}
