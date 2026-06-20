import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Post()
  async start(@CurrentUser() user: { id: number }, @Body() dto: StartConversationDto) {
    return this.conversations.start(user.id, dto.listingId);
  }

  @Get()
  async list(
    @CurrentUser() user: { id: number },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversations.list(user.id, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id/messages')
  async messages(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversations.messages(user.id, id, cursor ? Number(cursor) : undefined, Number(limit) || 30);
  }

  @Post(':id/messages')
  async send(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversations.send(user.id, id, dto.content);
  }

  @Post(':id/read')
  async markRead(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.conversations.markRead(user.id, id);
  }
}
