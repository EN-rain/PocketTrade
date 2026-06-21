import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { CursorPaginationQueryDto, PaginationQueryDto } from '../common/dto/pagination-query.dto';
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
    @Query() query: PaginationQueryDto,
  ) {
    return this.conversations.list(user.id, query.page, query.limit);
  }

  @Get(':id/messages')
  async messages(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Query() query: CursorPaginationQueryDto,
  ) {
    return this.conversations.messages(user.id, id, query.cursor, query.limit);
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
