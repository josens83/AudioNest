import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateLeaderboardDto,
  LeaderboardResponseDto,
  LeaderboardWithEntriesDto,
  LeaderboardEntryDto,
  LeaderboardType,
  LeaderboardScope,
  LeaderboardPeriod,
} from './dto/leaderboard.dto';
import { AppLoggerService } from '../../../common/logger';

@Injectable()
export class LeaderboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('LeaderboardsService');
  }

  async createLeaderboard(dto: CreateLeaderboardDto): Promise<LeaderboardResponseDto> {
    const now = new Date();
    const nextResetAt = this.calculateNextReset(dto.resetPeriod, now);

    const leaderboard = await this.prisma.leaderboard.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        scope: dto.scope,
        category: dto.category as Parameters<typeof this.prisma.leaderboard.create>[0]['data']['category'],
        resetPeriod: dto.resetPeriod,
        lastResetAt: now,
        nextResetAt,
      },
    });

    this.logger.log(`Leaderboard created: ${leaderboard.name} (${leaderboard.id})`);

    return this.mapLeaderboardToResponse(leaderboard);
  }

  async getLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    scope: LeaderboardScope = LeaderboardScope.GLOBAL,
    category?: string,
    userId?: string,
    limit = 100,
  ): Promise<LeaderboardWithEntriesDto> {
    // Find or create the leaderboard
    let leaderboard = await this.prisma.leaderboard.findFirst({
      where: {
        type,
        scope,
        resetPeriod: period,
        ...(category && { category: category as Parameters<typeof this.prisma.leaderboard.findFirst>[0]['where']['category'] }),
        isActive: true,
      },
    });

    if (!leaderboard) {
      // Create leaderboard if it doesn't exist
      const now = new Date();
      const nextResetAt = this.calculateNextReset(period, now);

      leaderboard = await this.prisma.leaderboard.create({
        data: {
          name: `${type} ${period} Leaderboard`,
          type,
          scope,
          category: category as Parameters<typeof this.prisma.leaderboard.create>[0]['data']['category'],
          resetPeriod: period,
          lastResetAt: now,
          nextResetAt,
        },
      });
    }

    // Get period boundaries
    const { periodStart, periodEnd } = this.getPeriodBoundaries(period);

    // Get entries
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: {
        leaderboardId: leaderboard.id,
        periodStart,
        periodEnd,
      },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            userLevel: {
              select: { level: true, title: true },
            },
          },
        },
      },
    });

    const totalParticipants = await this.prisma.leaderboardEntry.count({
      where: {
        leaderboardId: leaderboard.id,
        periodStart,
        periodEnd,
      },
    });

    // Map entries with rank
    const mappedEntries: LeaderboardEntryDto[] = entries.map((entry, index) => ({
      rank: index + 1,
      previousRank: entry.previousRank,
      rankChange: entry.previousRank ? entry.previousRank - (index + 1) : null,
      userId: entry.userId,
      username: entry.user.username,
      avatarUrl: entry.user.avatarUrl ?? undefined,
      score: Number(entry.score),
      level: entry.user.userLevel?.level,
      title: entry.user.userLevel?.title ?? undefined,
    }));

    // Get current user's entry if userId provided
    let currentUserEntry: LeaderboardEntryDto | undefined;
    if (userId) {
      const userEntry = await this.prisma.leaderboardEntry.findUnique({
        where: {
          leaderboardId_userId_periodStart: {
            leaderboardId: leaderboard.id,
            userId,
            periodStart,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              userLevel: {
                select: { level: true, title: true },
              },
            },
          },
        },
      });

      if (userEntry) {
        // Calculate user's rank
        const userRank = await this.prisma.leaderboardEntry.count({
          where: {
            leaderboardId: leaderboard.id,
            periodStart,
            periodEnd,
            score: { gt: userEntry.score },
          },
        }) + 1;

        currentUserEntry = {
          rank: userRank,
          previousRank: userEntry.previousRank,
          rankChange: userEntry.previousRank ? userEntry.previousRank - userRank : null,
          userId: userEntry.userId,
          username: userEntry.user.username,
          avatarUrl: userEntry.user.avatarUrl ?? undefined,
          score: Number(userEntry.score),
          level: userEntry.user.userLevel?.level,
          title: userEntry.user.userLevel?.title ?? undefined,
        };
      }
    }

    return {
      ...this.mapLeaderboardToResponse(leaderboard),
      entries: mappedEntries,
      totalParticipants,
      currentUserEntry,
    };
  }

  async updateUserScore(
    userId: string,
    type: LeaderboardType,
    scoreChange: number,
    scope: LeaderboardScope = LeaderboardScope.GLOBAL,
    category?: string,
  ): Promise<void> {
    // Find all matching leaderboards
    const leaderboards = await this.prisma.leaderboard.findMany({
      where: {
        type,
        scope,
        isActive: true,
        ...(category && { category: category as Parameters<typeof this.prisma.leaderboard.findMany>[0]['where']['category'] }),
      },
    });

    for (const leaderboard of leaderboards) {
      const { periodStart, periodEnd } = this.getPeriodBoundaries(leaderboard.resetPeriod as LeaderboardPeriod);

      // Upsert the entry
      await this.prisma.leaderboardEntry.upsert({
        where: {
          leaderboardId_userId_periodStart: {
            leaderboardId: leaderboard.id,
            userId,
            periodStart,
          },
        },
        create: {
          leaderboardId: leaderboard.id,
          userId,
          score: BigInt(scoreChange),
          periodStart,
          periodEnd,
        },
        update: {
          score: { increment: BigInt(scoreChange) },
        },
      });
    }
  }

  async resetLeaderboards(): Promise<number> {
    const now = new Date();

    // Find leaderboards that need to be reset
    const leaderboardsToReset = await this.prisma.leaderboard.findMany({
      where: {
        isActive: true,
        nextResetAt: { lte: now },
      },
    });

    let resetCount = 0;

    for (const leaderboard of leaderboardsToReset) {
      const { periodStart } = this.getPeriodBoundaries(leaderboard.resetPeriod as LeaderboardPeriod);

      // Get current rankings for previous rank tracking
      const currentEntries = await this.prisma.leaderboardEntry.findMany({
        where: {
          leaderboardId: leaderboard.id,
          periodStart: leaderboard.lastResetAt,
        },
        orderBy: { score: 'desc' },
      });

      // Store previous ranks
      const previousRanks = new Map<string, number>();
      currentEntries.forEach((entry, index) => {
        previousRanks.set(entry.userId, index + 1);
      });

      // Update leaderboard reset time
      const nextResetAt = this.calculateNextReset(
        leaderboard.resetPeriod as LeaderboardPeriod,
        now,
      );

      await this.prisma.leaderboard.update({
        where: { id: leaderboard.id },
        data: {
          lastResetAt: now,
          nextResetAt,
        },
      });

      resetCount++;
    }

    if (resetCount > 0) {
      this.logger.log(`Reset ${resetCount} leaderboards`);
    }

    return resetCount;
  }

  async initializeDefaultLeaderboards(): Promise<void> {
    const defaults = [
      // Weekly leaderboards
      { name: 'Weekly Listening', type: 'LISTEN_TIME', period: 'WEEKLY' },
      { name: 'Weekly Episodes', type: 'EPISODES_COMPLETED', period: 'WEEKLY' },
      { name: 'Weekly XP', type: 'XP_EARNED', period: 'WEEKLY' },

      // Monthly leaderboards
      { name: 'Monthly Listening', type: 'LISTEN_TIME', period: 'MONTHLY' },
      { name: 'Monthly Episodes', type: 'EPISODES_COMPLETED', period: 'MONTHLY' },
      { name: 'Monthly XP', type: 'XP_EARNED', period: 'MONTHLY' },

      // All-time leaderboards
      { name: 'All-Time Listening', type: 'LISTEN_TIME', period: 'ALL_TIME' },
      { name: 'All-Time Episodes', type: 'EPISODES_COMPLETED', period: 'ALL_TIME' },
      { name: 'All-Time Streak', type: 'STREAK', period: 'ALL_TIME' },
    ];

    for (const lb of defaults) {
      const existing = await this.prisma.leaderboard.findFirst({
        where: {
          type: lb.type as LeaderboardType,
          scope: 'GLOBAL',
          resetPeriod: lb.period as LeaderboardPeriod,
        },
      });

      if (!existing) {
        await this.createLeaderboard({
          name: lb.name,
          type: lb.type as LeaderboardType,
          scope: LeaderboardScope.GLOBAL,
          resetPeriod: lb.period as LeaderboardPeriod,
        });
      }
    }

    this.logger.log('Default leaderboards initialized');
  }

  private calculateNextReset(period: LeaderboardPeriod, from: Date): Date {
    const next = new Date(from);

    switch (period) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + (7 - next.getDay()) + 1); // Next Monday
        next.setHours(0, 0, 0, 0);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        break;
      case 'ALL_TIME':
        // Set far in the future
        next.setFullYear(next.getFullYear() + 100);
        break;
    }

    return next;
  }

  private getPeriodBoundaries(period: LeaderboardPeriod): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case 'DAILY':
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 1);
        break;
      case 'WEEKLY':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - periodStart.getDay() + 1); // Monday
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        break;
      case 'MONTHLY':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'ALL_TIME':
      default:
        periodStart = new Date(0); // Unix epoch
        periodEnd = new Date(now.getFullYear() + 100, 0, 1); // Far future
        break;
    }

    return { periodStart, periodEnd };
  }

  private mapLeaderboardToResponse(leaderboard: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    scope: string;
    category: string | null;
    resetPeriod: string;
    lastResetAt: Date;
    nextResetAt: Date;
  }): LeaderboardResponseDto {
    return {
      id: leaderboard.id,
      name: leaderboard.name,
      description: leaderboard.description ?? undefined,
      type: leaderboard.type as LeaderboardType,
      scope: leaderboard.scope as LeaderboardScope,
      category: leaderboard.category ?? undefined,
      resetPeriod: leaderboard.resetPeriod as LeaderboardPeriod,
      lastResetAt: leaderboard.lastResetAt,
      nextResetAt: leaderboard.nextResetAt,
    };
  }
}
