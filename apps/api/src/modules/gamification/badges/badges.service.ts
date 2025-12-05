import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateBadgeDto,
  BadgeResponseDto,
  UserBadgeResponseDto,
  BadgeCategory,
} from './dto/badge.dto';
import { AppLoggerService } from '../../../common/logger';

interface BadgeCondition {
  type: string;
  value: number;
  category?: string;
}

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('BadgesService');
  }

  async createBadge(dto: CreateBadgeDto): Promise<BadgeResponseDto> {
    const badge = await this.prisma.badge.create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        category: dto.category,
        rarity: dto.rarity ?? 'COMMON',
        condition: dto.condition,
        coinReward: dto.coinReward ?? 0,
        xpReward: dto.xpReward ?? 0,
        isHidden: dto.isHidden ?? false,
      },
    });

    this.logger.log(`Badge created: ${badge.name} (${badge.id})`);

    return this.mapBadgeToResponse(badge);
  }

  async getAllBadges(
    userId?: string,
    category?: BadgeCategory,
  ): Promise<BadgeResponseDto[]> {
    const badges = await this.prisma.badge.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    // If user is provided, include their earned status
    if (userId) {
      const userBadges = await this.prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true, earnedAt: true },
      });

      const userBadgeMap = new Map(
        userBadges.map((ub) => [ub.badgeId, ub.earnedAt]),
      );

      return badges.map((badge) => ({
        ...this.mapBadgeToResponse(badge),
        earned: userBadgeMap.has(badge.id),
        earnedAt: userBadgeMap.get(badge.id) ?? undefined,
      }));
    }

    return badges.map((badge) => this.mapBadgeToResponse(badge));
  }

  async getUserBadges(userId: string): Promise<UserBadgeResponseDto[]> {
    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });

    return userBadges.map((ub) => ({
      id: ub.id,
      badge: this.mapBadgeToResponse(ub.badge),
      earnedAt: ub.earnedAt,
      metadata: ub.metadata as Record<string, unknown> | undefined,
    }));
  }

  async awardBadge(
    userId: string,
    badgeId: string,
    metadata?: Record<string, unknown>,
  ): Promise<UserBadgeResponseDto | null> {
    // Check if already earned
    const existing = await this.prisma.userBadge.findUnique({
      where: {
        userId_badgeId: { userId, badgeId },
      },
    });

    if (existing) {
      return null; // Already earned
    }

    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!badge || !badge.isActive) {
      return null;
    }

    // Award badge and rewards in a transaction
    const userBadge = await this.prisma.$transaction(async (tx) => {
      const newUserBadge = await tx.userBadge.create({
        data: {
          userId,
          badgeId,
          metadata: metadata ?? undefined,
        },
        include: { badge: true },
      });

      // Award coin reward
      if (badge.coinReward > 0) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { coins: true },
        });

        const newBalance = (user?.coins ?? 0) + badge.coinReward;

        await tx.user.update({
          where: { id: userId },
          data: { coins: newBalance },
        });

        await tx.coinTransaction.create({
          data: {
            userId,
            type: 'ACHIEVEMENT',
            amount: badge.coinReward,
            balance: newBalance,
            referenceType: 'badge',
            referenceId: badgeId,
            description: `Badge earned: ${badge.name}`,
          },
        });
      }

      // Award XP reward
      if (badge.xpReward > 0) {
        await this.addXp(tx, userId, badge.xpReward);
      }

      // Create notification
      await tx.notification.create({
        data: {
          userId,
          type: 'ACHIEVEMENT_UNLOCKED',
          title: 'New Badge Earned!',
          body: `You earned the "${badge.name}" badge!`,
          data: { badgeId, badgeName: badge.name, badgeIcon: badge.icon },
        },
      });

      return newUserBadge;
    });

    this.logger.log(`Badge awarded: ${badge.name} to user ${userId}`);

    return {
      id: userBadge.id,
      badge: this.mapBadgeToResponse(userBadge.badge),
      earnedAt: userBadge.earnedAt,
      metadata: userBadge.metadata as Record<string, unknown> | undefined,
    };
  }

  async checkAndAwardBadges(
    userId: string,
    eventType: string,
    eventValue: number,
    eventCategory?: string,
  ): Promise<UserBadgeResponseDto[]> {
    // Get all badges the user hasn't earned yet
    const unearnedBadges = await this.prisma.badge.findMany({
      where: {
        isActive: true,
        userBadges: {
          none: { userId },
        },
      },
    });

    const awardedBadges: UserBadgeResponseDto[] = [];

    for (const badge of unearnedBadges) {
      const condition = badge.condition as BadgeCondition;

      // Check if this badge matches the event
      if (condition.type === eventType) {
        // Check category if specified
        if (condition.category && condition.category !== eventCategory) {
          continue;
        }

        // Check value
        if (eventValue >= condition.value) {
          const awarded = await this.awardBadge(userId, badge.id, {
            triggeredBy: eventType,
            value: eventValue,
          });

          if (awarded) {
            awardedBadges.push(awarded);
          }
        }
      }
    }

    return awardedBadges;
  }

  private async addXp(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    userId: string,
    xpAmount: number,
  ): Promise<void> {
    let userLevel = await tx.userLevel.findUnique({
      where: { userId },
    });

    if (!userLevel) {
      userLevel = await tx.userLevel.create({
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

    let newXp = userLevel.xp + xpAmount;
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
    const levelTier = await tx.levelTier.findUnique({
      where: { level: newLevel },
    });

    await tx.userLevel.update({
      where: { userId },
      data: {
        level: newLevel,
        xp: newXp,
        xpToNext: newXpToNext,
        title: levelTier?.title ?? userLevel.title,
        totalXpEarned: { increment: xpAmount },
        levelUps: { increment: levelUps },
      },
    });

    // Notify on level up
    if (levelUps > 0) {
      await tx.notification.create({
        data: {
          userId,
          type: 'ACHIEVEMENT_UNLOCKED',
          title: 'Level Up!',
          body: `Congratulations! You reached level ${newLevel}!`,
          data: { level: newLevel, title: levelTier?.title },
        },
      });
    }
  }

  private mapBadgeToResponse(badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    coinReward: number;
    xpReward: number;
    isHidden: boolean;
  }): BadgeResponseDto {
    return {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category as BadgeCategory,
      rarity: badge.rarity as BadgeResponseDto['rarity'],
      coinReward: badge.coinReward,
      xpReward: badge.xpReward,
      isHidden: badge.isHidden,
    };
  }
}
