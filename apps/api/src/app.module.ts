import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
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
  ],
})
export class AppModule {}
