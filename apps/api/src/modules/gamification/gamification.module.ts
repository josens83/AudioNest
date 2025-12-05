import { Module } from '@nestjs/common';
import { BadgesService } from './badges/badges.service';
import { BadgesController } from './badges/badges.controller';
import { LevelsService } from './levels/levels.service';
import { ChallengesService } from './challenges/challenges.service';
import { ChallengesController } from './challenges/challenges.controller';
import { LeaderboardsService } from './leaderboards/leaderboards.service';
import { LeaderboardsController } from './leaderboards/leaderboards.controller';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../../common/logger';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [
    GamificationController,
    BadgesController,
    ChallengesController,
    LeaderboardsController,
  ],
  providers: [
    GamificationService,
    BadgesService,
    LevelsService,
    ChallengesService,
    LeaderboardsService,
  ],
  exports: [
    GamificationService,
    BadgesService,
    LevelsService,
    ChallengesService,
    LeaderboardsService,
  ],
})
export class GamificationModule {}
