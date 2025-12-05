import { Injectable, OnModuleInit } from '@nestjs/common';
import { BadgesService } from './badges/badges.service';
import { LevelsService } from './levels/levels.service';
import { ChallengesService } from './challenges/challenges.service';
import { LeaderboardsService } from './leaderboards/leaderboards.service';
import { LeaderboardType, LeaderboardScope } from './leaderboards/dto/leaderboard.dto';
import { AppLoggerService } from '../../common/logger';
import { PrismaService } from '../../prisma/prisma.service';

export interface GamificationEvent {
  userId: string;
  type: string;
  value: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface UserGamificationStats {
  level: number;
  xp: number;
  xpToNext: number;
  progress: number;
  title?: string;
  totalBadges: number;
  recentBadges: Array<{
    id: string;
    name: string;
    icon: string;
    earnedAt: Date;
  }>;
  activeChallenges: number;
  completedChallenges: number;
  currentStreak: number;
  longestStreak: number;
}

@Injectable()
export class GamificationService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
    private readonly levelsService: LevelsService,
    private readonly challengesService: ChallengesService,
    private readonly leaderboardsService: LeaderboardsService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('GamificationService');
  }

  async onModuleInit(): Promise<void> {
    // Initialize level tiers and default leaderboards on startup
    await this.levelsService.initializeLevelTiers();
    await this.leaderboardsService.initializeDefaultLeaderboards();
    this.logger.log('Gamification system initialized');
  }

  /**
   * Process a gamification event - this is the main entry point
   * for tracking user actions and awarding rewards
   */
  async processEvent(event: GamificationEvent): Promise<void> {
    const { userId, type, value, category } = event;

    this.logger.debug(`Processing event: ${type} for user ${userId}`);

    // 1. Award XP based on event type
    const xpReward = this.levelsService.getXpReward(type);
    if (xpReward > 0) {
      const xpToAdd = xpReward * value;
      await this.levelsService.addXp(userId, xpToAdd, type);
    }

    // 2. Check and award badges
    await this.checkBadges(userId, type, value, category);

    // 3. Update challenge progress
    await this.challengesService.updateChallengeProgress(
      userId,
      type,
      value,
      category,
    );

    // 4. Update leaderboards
    await this.updateLeaderboards(userId, type, value, category);
  }

  /**
   * Handle listening progress event
   */
  async onListenProgress(
    userId: string,
    minutesListened: number,
    episodeCompleted: boolean,
    category?: string,
  ): Promise<void> {
    // Update user listening stats
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalListenTime: { increment: minutesListened },
        ...(episodeCompleted && { totalEpisodesCompleted: { increment: 1 } }),
        lastListenDate: new Date(),
      },
    });

    // Process listening time event
    await this.processEvent({
      userId,
      type: 'listen_minute',
      value: minutesListened,
      category,
    });

    // Process episode completion event
    if (episodeCompleted) {
      await this.processEvent({
        userId,
        type: 'complete_episode',
        value: 1,
        category,
      });
    }
  }

  /**
   * Handle daily login/streak
   */
  async onDailyLogin(userId: string): Promise<{ streakUpdated: boolean; currentStreak: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastListenDate: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    if (!user) {
      return { streakUpdated: false, currentStreak: 0 };
    }

    const now = new Date();
    const lastListen = user.lastListenDate;
    let newStreak = 1;
    let streakUpdated = false;

    if (lastListen) {
      const daysDiff = Math.floor(
        (now.getTime() - lastListen.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysDiff === 1) {
        // Consecutive day
        newStreak = user.currentStreak + 1;
        streakUpdated = true;
      } else if (daysDiff === 0) {
        // Same day
        newStreak = user.currentStreak;
      }
      // daysDiff > 1: streak broken, reset to 1
    }

    const newLongestStreak = Math.max(newStreak, user.longestStreak);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActiveAt: now,
      },
    });

    // Process streak events
    if (streakUpdated) {
      await this.processEvent({
        userId,
        type: 'streak_day',
        value: newStreak,
      });

      // Award daily login XP
      await this.processEvent({
        userId,
        type: 'daily_login',
        value: 1,
      });
    }

    return { streakUpdated, currentStreak: newStreak };
  }

  /**
   * Get user's gamification stats
   */
  async getUserStats(userId: string): Promise<UserGamificationStats> {
    const [userLevel, badges, challenges, user] = await Promise.all([
      this.levelsService.getUserLevel(userId),
      this.badgesService.getUserBadges(userId),
      this.challengesService.getUserChallenges(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, longestStreak: true },
      }),
    ]);

    const activeChallenges = challenges.filter((c) => c.status === 'ACTIVE');
    const completedChallenges = challenges.filter((c) => c.status === 'COMPLETED');

    return {
      level: userLevel.level,
      xp: userLevel.xp,
      xpToNext: userLevel.xpToNext,
      progress: userLevel.progress,
      title: userLevel.title,
      totalBadges: badges.length,
      recentBadges: badges.slice(0, 5).map((b) => ({
        id: b.badge.id,
        name: b.badge.name,
        icon: b.badge.icon,
        earnedAt: b.earnedAt,
      })),
      activeChallenges: activeChallenges.length,
      completedChallenges: completedChallenges.length,
      currentStreak: user?.currentStreak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
    };
  }

  /**
   * Initialize default badges
   */
  async initializeDefaultBadges(): Promise<void> {
    const defaultBadges = [
      // Listening badges
      {
        name: 'First Listen',
        description: 'Listen to your first episode',
        icon: 'badge-first-listen',
        category: 'LISTENING',
        rarity: 'COMMON',
        condition: { type: 'listen_minute', value: 1 },
        coinReward: 10,
        xpReward: 10,
      },
      {
        name: 'Hour Listener',
        description: 'Listen for 1 hour total',
        icon: 'badge-hour',
        category: 'LISTENING',
        rarity: 'COMMON',
        condition: { type: 'total_listen_minutes', value: 60 },
        coinReward: 50,
        xpReward: 25,
      },
      {
        name: 'Day Listener',
        description: 'Listen for 24 hours total',
        icon: 'badge-day',
        category: 'LISTENING',
        rarity: 'UNCOMMON',
        condition: { type: 'total_listen_minutes', value: 1440 },
        coinReward: 200,
        xpReward: 100,
      },
      {
        name: 'Week Listener',
        description: 'Listen for 168 hours total',
        icon: 'badge-week',
        category: 'LISTENING',
        rarity: 'RARE',
        condition: { type: 'total_listen_minutes', value: 10080 },
        coinReward: 500,
        xpReward: 250,
      },

      // Streak badges
      {
        name: 'Streak Starter',
        description: 'Maintain a 3-day streak',
        icon: 'badge-streak-3',
        category: 'ACHIEVEMENT',
        rarity: 'COMMON',
        condition: { type: 'streak_day', value: 3 },
        coinReward: 30,
        xpReward: 20,
      },
      {
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: 'badge-streak-7',
        category: 'ACHIEVEMENT',
        rarity: 'UNCOMMON',
        condition: { type: 'streak_day', value: 7 },
        coinReward: 100,
        xpReward: 50,
      },
      {
        name: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        icon: 'badge-streak-30',
        category: 'ACHIEVEMENT',
        rarity: 'RARE',
        condition: { type: 'streak_day', value: 30 },
        coinReward: 500,
        xpReward: 200,
      },
      {
        name: 'Century Streak',
        description: 'Maintain a 100-day streak',
        icon: 'badge-streak-100',
        category: 'ACHIEVEMENT',
        rarity: 'EPIC',
        condition: { type: 'streak_day', value: 100 },
        coinReward: 2000,
        xpReward: 1000,
      },

      // Episode completion badges
      {
        name: 'Episode Finisher',
        description: 'Complete 10 episodes',
        icon: 'badge-episodes-10',
        category: 'LISTENING',
        rarity: 'COMMON',
        condition: { type: 'total_episodes_completed', value: 10 },
        coinReward: 50,
        xpReward: 30,
      },
      {
        name: 'Episode Hunter',
        description: 'Complete 50 episodes',
        icon: 'badge-episodes-50',
        category: 'LISTENING',
        rarity: 'UNCOMMON',
        condition: { type: 'total_episodes_completed', value: 50 },
        coinReward: 200,
        xpReward: 100,
      },
      {
        name: 'Episode Master',
        description: 'Complete 200 episodes',
        icon: 'badge-episodes-200',
        category: 'LISTENING',
        rarity: 'RARE',
        condition: { type: 'total_episodes_completed', value: 200 },
        coinReward: 500,
        xpReward: 300,
      },

      // Social badges
      {
        name: 'Social Starter',
        description: 'Follow your first creator',
        icon: 'badge-follow-1',
        category: 'SOCIAL',
        rarity: 'COMMON',
        condition: { type: 'first_follow', value: 1 },
        coinReward: 20,
        xpReward: 15,
      },
      {
        name: 'Reviewer',
        description: 'Write your first review',
        icon: 'badge-review-1',
        category: 'SOCIAL',
        rarity: 'COMMON',
        condition: { type: 'review_written', value: 1 },
        coinReward: 30,
        xpReward: 20,
      },

      // Level badges
      {
        name: 'Level 10',
        description: 'Reach level 10',
        icon: 'badge-level-10',
        category: 'ACHIEVEMENT',
        rarity: 'UNCOMMON',
        condition: { type: 'level_reached', value: 10 },
        coinReward: 100,
        xpReward: 0, // No XP to avoid loops
      },
      {
        name: 'Level 25',
        description: 'Reach level 25',
        icon: 'badge-level-25',
        category: 'ACHIEVEMENT',
        rarity: 'RARE',
        condition: { type: 'level_reached', value: 25 },
        coinReward: 500,
        xpReward: 0,
      },
      {
        name: 'Level 50',
        description: 'Reach level 50',
        icon: 'badge-level-50',
        category: 'ACHIEVEMENT',
        rarity: 'EPIC',
        condition: { type: 'level_reached', value: 50 },
        coinReward: 2000,
        xpReward: 0,
      },
    ];

    for (const badge of defaultBadges) {
      // Check if badge already exists
      const existing = await this.prisma.badge.findFirst({
        where: { name: badge.name },
      });

      if (!existing) {
        await this.badgesService.createBadge({
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category as Parameters<typeof this.badgesService.createBadge>[0]['category'],
          rarity: badge.rarity as Parameters<typeof this.badgesService.createBadge>[0]['rarity'],
          condition: badge.condition,
          coinReward: badge.coinReward,
          xpReward: badge.xpReward,
        });
      }
    }

    this.logger.log('Default badges initialized');
  }

  private async checkBadges(
    userId: string,
    eventType: string,
    value: number,
    category?: string,
  ): Promise<void> {
    // Get user's cumulative stats for badge checking
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalListenTime: true,
        totalEpisodesCompleted: true,
        currentStreak: true,
        userLevel: { select: { level: true } },
      },
    });

    if (!user) return;

    // Map event types to cumulative values
    const checkTypes: Array<{ type: string; value: number }> = [];

    if (eventType === 'listen_minute') {
      checkTypes.push({ type: 'total_listen_minutes', value: user.totalListenTime });
    }
    if (eventType === 'complete_episode') {
      checkTypes.push({ type: 'total_episodes_completed', value: user.totalEpisodesCompleted });
    }
    if (eventType === 'streak_day') {
      checkTypes.push({ type: 'streak_day', value: user.currentStreak });
    }
    if (user.userLevel) {
      checkTypes.push({ type: 'level_reached', value: user.userLevel.level });
    }

    // Check badges for each cumulative type
    for (const check of checkTypes) {
      await this.badgesService.checkAndAwardBadges(
        userId,
        check.type,
        check.value,
        category,
      );
    }
  }

  private async updateLeaderboards(
    userId: string,
    eventType: string,
    value: number,
    category?: string,
  ): Promise<void> {
    // Map event types to leaderboard types
    const leaderboardUpdates: Array<{ type: LeaderboardType; score: number }> = [];

    switch (eventType) {
      case 'listen_minute':
        leaderboardUpdates.push({ type: LeaderboardType.LISTEN_TIME, score: value });
        break;
      case 'complete_episode':
        leaderboardUpdates.push({ type: LeaderboardType.EPISODES_COMPLETED, score: value });
        break;
      case 'streak_day':
        leaderboardUpdates.push({ type: LeaderboardType.STREAK, score: value });
        break;
      case 'review_written':
        leaderboardUpdates.push({ type: LeaderboardType.REVIEWS_WRITTEN, score: value });
        break;
    }

    // Also update XP leaderboard
    const xpReward = this.levelsService.getXpReward(eventType);
    if (xpReward > 0) {
      leaderboardUpdates.push({
        type: LeaderboardType.XP_EARNED,
        score: xpReward * value,
      });
    }

    // Update all relevant leaderboards
    for (const update of leaderboardUpdates) {
      await this.leaderboardsService.updateUserScore(
        userId,
        update.type,
        update.score,
        LeaderboardScope.GLOBAL,
        category,
      );
    }
  }
}
