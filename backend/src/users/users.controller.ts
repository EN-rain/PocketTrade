import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: { id: number }) {
    return this.usersService.getById(user.id);
  }
}