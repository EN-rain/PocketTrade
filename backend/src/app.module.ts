import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { BrandsModule } from './brands/brands.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { ListingsModule } from './listings/listings.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AdminModule } from './admin/admin.module';
import { BlocksModule } from './blocks/blocks.module';
import { ConversationsModule } from './conversations/conversations.module';
import { PushModule } from './push/push.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { validateEnvironment } from './config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 30,
      },
    ]),
    PrismaModule,
    HealthModule,
    BrandsModule,
    AuthModule,
    UsersModule,
    StorageModule,
    ListingsModule,
    FavoritesModule,
    BlocksModule,
    PushModule,
    ConversationsModule,
    ReportsModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
