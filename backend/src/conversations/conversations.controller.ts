import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Post()
  async start(@CurrentUser() user: { id: number }, @Body() dto: { listingId: number }) {
    return this.conversations.start(user.id, dto.listingId);
  }

  @Get()
  async list(@CurrentUser() user: { id: number }) {
    return this.conversations.list(user.id);
  }

  @Get(':id/messages')
  async messages(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.conversations.messages(user.id, id);
  }

  @Post(':id/messages')
  async send(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { content: string },
  ) {
    return this.conversations.send(user.id, id, dto.content);
  }

  @Post(':id/read')
  async markRead(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.conversations.markRead(user.id, id);
  }
}
