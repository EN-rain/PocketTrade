import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { PushService } from './push.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('push-tokens')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  async register(
    @CurrentUser() user: { id: number },
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushService.register(user.id, dto);
  }
}
