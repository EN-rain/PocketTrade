import { Controller, Delete, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { BlocksService } from './blocks.service';

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Post(':userId')
  async block(@CurrentUser() user: { id: number }, @Param('userId', ParseIntPipe) userId: number) {
    return this.blocks.block(user.id, userId);
  }

  @Delete(':userId')
  async unblock(@CurrentUser() user: { id: number }, @Param('userId', ParseIntPipe) userId: number) {
    return this.blocks.unblock(user.id, userId);
  }
}
