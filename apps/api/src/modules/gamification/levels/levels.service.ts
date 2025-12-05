import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  UserLevelResponseDto,
  LevelTierResponseDto,
  XpGainResponseDto,
} from './dto/level.dto';
import { AppLoggerService } from '../../../common/logger';

@Injectable()
export class LevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('LevelsService');
  }

  async getUserLevel(userId: string): Promise<UserLevelResponseDto> {
    let userLevel = await this.prisma.userLevel.findUnique({
      where: { userId },
    });

    if (!userLevel) {
      // Initialize user level
      userLevel = await this.prisma.userLevel.create({
        data: {
          userId,
          level: 1,
          xp: 0,
          xpToNext: 100,
          totalXpEarned: 0,
          levelUps: 0,
        },
      });
    }

    return {
      level: userLevel.level,
      xp: userLevel.xp,
      xpToNext: userLevel.xpToNext,
      progress: Math.round((userLevel.xp / userLevel.xpToNext) * 100),
      title: userLevel.title ?? undefined,
      totalXpEarned: userLevel.totalXpEarned,
      levelUps: userLevel.levelUps,
    };
  }

  async addXp(
    userId: string,
    amount: number,
    source: string,
    referenceId?: string,
  ): Promise<XpGainResponseDto> {
    let userLevel = await this.prisma.userLevel.findUnique({
      where: { userId },
    });

    const previousLevel = userLevel?.level ?? 1;

    if (!userLevel) {
      userLevel = await this.prisma.userLevel.create({
        data: {
          userId,
          level: 1,
          xp: 0,
          xpToNext: 100,
          totalXpEarned: 0,
          levelUps: 0,
        },
      });
    }

    let newXp = userLevel.xp + amount;
    let newLevel = userLevel.level;
    let newXpToNext = userLevel.xpToNext;
    let levelUps = 0;

    // Check for level ups
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      levelUps++;
      // XP requirement increases by 50% each level
      newXpToNext = Math.floor(newXpToNext * 1.5);
    }

    // Get title for new level
    const levelTier = await this.prisma.levelTier.findUnique({
      where: { level: newLevel },
    });

    await this.prisma.userLevel.update({
      where: { userId },
      data: {
        level: newLevel,
        xp: newXp,
        xpToNext: newXpToNext,
        title: levelTier?.title ?? userLevel.title,
        totalXpEarned: { increment: amount },
        levelUps: { increment: levelUps },
      },
    });

    // Notify on level up
    if (levelUps > 0) {
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'ACHIEVEMENT_UNLOCKED',
          title: 'Level Up!',
          body: `Congratulations! You reached level ${newLevel}!`,
          data: { level: newLevel, title: levelTier?.title },
        },
      });

      this.logger.log(
        `User ${userId} leveled up from ${previousLevel} to ${newLevel}`,
      );
    }

    return {
      xpGained: amount,
      previousLevel,
      newLevel,
      leveledUp: levelUps > 0,
      currentXp: newXp,
      xpToNext: newXpToNext,
    };
  }

  async getLevelTiers(): Promise<LevelTierResponseDto[]> {
    const tiers = await this.prisma.levelTier.findMany({
      orderBy: { level: 'asc' },
    });

    return tiers.map((tier) => ({
      level: tier.level,
      xpRequired: tier.xpRequired,
      title: tier.title ?? undefined,
      icon: tier.icon ?? undefined,
      frameColor: tier.frameColor ?? undefined,
      benefits: tier.benefits as Record<string, unknown> | undefined,
    }));
  }

  async initializeLevelTiers(): Promise<void> {
    // Check if tiers already exist
    const count = await this.prisma.levelTier.count();
    if (count > 0) return;

    // Create default level tiers
    const tiers = [
      { level: 1, xpRequired: 0, title: 'Listener' },
      { level: 5, xpRequired: 620, title: 'Regular Listener' },
      { level: 10, xpRequired: 3803, title: 'Active Listener' },
      { level: 15, xpRequired: 14893, title: 'Avid Listener' },
      { level: 20, xpRequired: 48632, title: 'Dedicated Listener' },
      { level: 25, xpRequired: 142088, title: 'Passionate Listener' },
      { level: 30, xpRequired: 387420, title: 'Audio Enthusiast' },
      { level: 40, xpRequired: 2435900, title: 'Audio Expert' },
      { level: 50, xpRequired: 14074072, title: 'Audio Master' },
      { level: 75, xpRequired: 866127000, title: 'Audio Legend' },
      { level: 100, xpRequired: 5000000000, title: 'Audio God' },
    ];

    await this.prisma.levelTier.createMany({
      data: tiers,
    });

    this.logger.log('Level tiers initialized');
  }

  // XP rewards for different actions
  getXpReward(action: string): number {
    const rewards: Record<string, number> = {
      listen_minute: 1, // 1 XP per minute listened
      complete_episode: 25,
      complete_book: 100,
      daily_login: 10,
      streak_day: 5, // Per day of streak
      review_written: 20,
      first_follow: 15,
      share_content: 10,
      complete_challenge: 50,
    };

    return rewards[action] ?? 0;
  }
}
