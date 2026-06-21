import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChangePasswordDto } from './dto/account-credentials.dto';
import { UpdateMeDto } from './dto/update-me.dto';

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
    @Body() dto: UpdateMeDto,
  ) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Post('me/profile-image')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 1 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only images allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadProfileImage(
    @CurrentUser() user: { id: number },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadProfileImage(user.id, file);
  }

  @Post('me/change-password')
  async changePassword(
    @CurrentUser() user: { id: number },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('me/delete-request')
  async requestDeletion(@CurrentUser() user: { id: number }) {
    return this.usersService.requestDeletion(user.id);
  }
}
