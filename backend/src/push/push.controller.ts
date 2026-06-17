import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { PushService } from './push.service';

@Controller('push-tokens')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  async register(
    @CurrentUser() user: { id: number },
    @Body() dto: { token: string; platform: string; deviceId?: string },
  ) {
    return this.pushService.register(user.id, dto);
  }
}
