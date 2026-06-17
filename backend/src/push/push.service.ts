import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.enabled = this.initFirebase();
  }

  async register(userId: number, dto: { token: string; platform: string; deviceId?: string }) {
    return this.prisma.pushToken.upsert({
      where: { token: dto.token },
      update: { userId, platform: dto.platform, deviceId: dto.deviceId },
      create: { userId, token: dto.token, platform: dto.platform, deviceId: dto.deviceId },
    });
  }

  async notifyUser(userId: number, title: string, body: string) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;
    if (!this.enabled) {
      this.logger.log(`[FCM disabled] user=${userId} title=${title}`);
      return;
    }
    await getMessaging().sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: { title, body },
    });
  }

  private initFirebase() {
    if (getApps().length > 0) return true;
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return false;
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return true;
  }
}
