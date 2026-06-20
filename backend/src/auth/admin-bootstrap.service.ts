import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>('ADMIN_BOOTSTRAP_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_BOOTSTRAP_PASSWORD');
    const buyerEmail = this.config.get<string>('SEED_BUYER_EMAIL')?.trim().toLowerCase() || 'buyer@pockettrade.local';
    const buyerPassword = this.config.get<string>('SEED_BUYER_PASSWORD');

    if (!email || !password) {
      await this.bootstrapBuyer(buyerEmail, buyerPassword);
      return;
    }

    if (password.length < 12) {
      this.logger.warn('ADMIN_BOOTSTRAP_PASSWORD is set but shorter than 12 characters; admin bootstrap skipped');
      await this.bootstrapBuyer(buyerEmail, buyerPassword);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: 'admin',
        accountStatus: 'active',
        displayName: 'PocketTrade Admin',
        suspensionReason: null,
      },
      create: {
        email,
        passwordHash,
        role: 'admin',
        accountStatus: 'active',
        displayName: 'PocketTrade Admin',
      },
    });

    this.logger.log(`Admin bootstrap ready for ${email}`);
    await this.bootstrapBuyer(buyerEmail, buyerPassword);
  }

  private async bootstrapBuyer(email: string, password?: string) {
    if (!password) {
      return;
    }

    if (password.length < 8) {
      this.logger.warn('SEED_BUYER_PASSWORD is set but shorter than 8 characters; buyer bootstrap skipped');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: 'user',
        accountStatus: 'active',
        displayName: 'Life Lessheart',
        suspensionReason: null,
      },
      create: {
        email,
        passwordHash,
        role: 'user',
        accountStatus: 'active',
        displayName: 'Life Lessheart',
      },
    });

    this.logger.log(`Demo buyer bootstrap ready for ${email}`);
  }
}
