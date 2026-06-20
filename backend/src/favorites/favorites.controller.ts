import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @CurrentUser() user: { id: number },
    @Body() dto: { listingId: number },
  ) {
    return this.favoritesService.add(user.id, dto.listingId);
  }

  @Delete(':listingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: { id: number },
    @Param('listingId', ParseIntPipe) listingId: number,
  ) {
    await this.favoritesService.remove(user.id, listingId);
  }

  @Get()
  async list(
    @CurrentUser() user: { id: number },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.favoritesService.list(user.id, Number(page) || 1, Number(limit) || 20);
  }
}
