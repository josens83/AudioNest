import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AlbumsModule } from './modules/albums/albums.module';
import { EpisodesModule } from './modules/episodes/episodes.module';
import { PlaybackModule } from './modules/playback/playback.module';
import { LibraryModule } from './modules/library/library.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { LiveModule } from './modules/live/live.module';
import { SearchModule } from './modules/search/search.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { CreditsModule } from './modules/credits/credits.module';
import { AIModule } from './modules/ai/ai.module';
import { SocialModule } from './modules/social/social.module';
import { FamilyModule } from './modules/family/family.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './common/logger';
import { getEnvConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [getEnvConfig()],
    }),
    // Global rate limiting: 100 requests per minute by default
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    LoggerModule,
    AuthModule,
    UsersModule,
    AlbumsModule,
    EpisodesModule,
    PlaybackModule,
    LibraryModule,
    SubscriptionModule,
    CreatorsModule,
    LiveModule,
    SearchModule,
    GamificationModule,
    CreditsModule,
    AIModule,
    SocialModule,
    FamilyModule,
    NotificationModule,
    AdminModule,
  ],
  providers: [
    // Global throttler guard - applies rate limiting to all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
