import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { PushModule } from '../push/push.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsGateway } from './conversations.gateway';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [BlocksModule, PushModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsGateway],
  exports: [ConversationsService],
})
export class ConversationsModule {}
