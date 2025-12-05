import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateChallengeDto,
  ChallengeResponseDto,
  UserChallengeResponseDto,
  ChallengeType,
  ChallengeDuration,
  UserChallengeStatus,
} from './dto/challenge.dto';
import { AppLoggerService } from '../../../common/logger';
import { LevelsService } from '../levels/levels.service';
import { BadgesService } from '../badges/badges.service';

interface ChallengeCondition {
  type: string;
  value: number;
  category?: string;
}

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly levelsService: LevelsService,
    private readonly badgesService: BadgesService,
  ) {
    this.logger.setContext('ChallengesService');
  }

  async createChallenge(dto: CreateChallengeDto): Promise<ChallengeResponseDto> {
    const challenge = await this.prisma.challenge.create({
      data: {
        title: dto.title,
        description: dto.description,
        icon: dto.icon,
        type: dto.type,
        category: dto.category as Parameters<typeof this.prisma.challenge.create>[0]['data']['category'],
        conditions: dto.conditions,
        coinReward: dto.coinReward ?? 0,
        xpReward: dto.xpReward ?? 0,
        badgeId: dto.badgeId,
        duration: dto.duration,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        maxParticipants: dto.maxParticipants,
        isHidden: dto.isHidden ?? false,
      },
    });

    this.logger.log(`Challenge created: ${challenge.title} (${challenge.id})`);

    return this.mapChallengeToResponse(challenge, 0);
  }

  async getActiveChallenges(
    type?: ChallengeType,
  ): Promise<ChallengeResponseDto[]> {
    const now = new Date();

    const challenges = await this.prisma.challenge.findMany({
      where: {
        isActive: true,
        isHidden: false,
        ...(type && { type }),
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });

    // Get participant counts
    const challengeIds = challenges.map((c) => c.id);
    const participantCounts = await this.prisma.userChallenge.groupBy({
      by: ['challengeId'],
      where: { challengeId: { in: challengeIds } },
      _count: { id: true },
    });

    const countMap = new Map(
      participantCounts.map((p) => [p.challengeId, p._count.id]),
    );

    return challenges.map((challenge) =>
      this.mapChallengeToResponse(challenge, countMap.get(challenge.id) ?? 0),
    );
  }

  async joinChallenge(
    userId: string,
    challengeId: string,
  ): Promise<UserChallengeResponseDto> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || !challenge.isActive) {
      throw new NotFoundException('Challenge not found');
    }

    // Check if already joined
    const existing = await this.prisma.userChallenge.findUnique({
      where: {
        userId_challengeId: { userId, challengeId },
      },
    });

    if (existing) {
      throw new BadRequestException('Already joined this challenge');
    }

    // Check max participants
    if (challenge.maxParticipants) {
      const currentCount = await this.prisma.userChallenge.count({
        where: { challengeId },
      });

      if (currentCount >= challenge.maxParticipants) {
        throw new BadRequestException('Challenge is full');
      }
    }

    // Calculate expiry based on duration
    const expiresAt = this.calculateExpiryDate(challenge.duration, challenge.endsAt);
    const conditions = challenge.conditions as ChallengeCondition;

    const userChallenge = await this.prisma.userChallenge.create({
      data: {
        userId,
        challengeId,
        target: conditions.value,
        expiresAt,
      },
      include: { challenge: true },
    });

    this.logger.log(`User ${userId} joined challenge ${challengeId}`);

    const participantCount = await this.prisma.userChallenge.count({
      where: { challengeId },
    });

    return this.mapUserChallengeToResponse(userChallenge, participantCount);
  }

  async getUserChallenges(
    userId: string,
    status?: UserChallengeStatus,
  ): Promise<UserChallengeResponseDto[]> {
    const userChallenges = await this.prisma.userChallenge.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: { challenge: true },
      orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }],
    });

    // Get participant counts for all challenges
    const challengeIds = userChallenges.map((uc) => uc.challengeId);
    const participantCounts = await this.prisma.userChallenge.groupBy({
      by: ['challengeId'],
      where: { challengeId: { in: challengeIds } },
      _count: { id: true },
    });

    const countMap = new Map(
      participantCounts.map((p) => [p.challengeId, p._count.id]),
    );

    return userChallenges.map((uc) =>
      this.mapUserChallengeToResponse(uc, countMap.get(uc.challengeId) ?? 0),
    );
  }

  async updateChallengeProgress(
    userId: string,
    eventType: string,
    eventValue: number,
    eventCategory?: string,
  ): Promise<UserChallengeResponseDto[]> {
    // Get all active challenges for the user
    const activeChallenges = await this.prisma.userChallenge.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      include: { challenge: true },
    });

    const updatedChallenges: UserChallengeResponseDto[] = [];

    for (const uc of activeChallenges) {
      const conditions = uc.challenge.conditions as ChallengeCondition;

      // Check if this event matches the challenge condition
      if (conditions.type !== eventType) continue;
      if (conditions.category && conditions.category !== eventCategory) continue;

      // Update progress
      const newProgress = uc.progress + eventValue;
      const isCompleted = newProgress >= uc.target;

      await this.prisma.userChallenge.update({
        where: { id: uc.id },
        data: {
          progress: newProgress,
          ...(isCompleted && {
            status: 'COMPLETED',
            completedAt: new Date(),
          }),
        },
      });

      // Award rewards if completed
      if (isCompleted) {
        await this.awardChallengeRewards(userId, uc.challenge);
      }

      const participantCount = await this.prisma.userChallenge.count({
        where: { challengeId: uc.challengeId },
      });

      updatedChallenges.push(
        this.mapUserChallengeToResponse(
          { ...uc, progress: newProgress, status: isCompleted ? 'COMPLETED' : 'ACTIVE' },
          participantCount,
        ),
      );
    }

    return updatedChallenges;
  }

  async expireOldChallenges(): Promise<number> {
    const result = await this.prisma.userChallenge.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} challenges`);
    }

    return result.count;
  }

  async generateDailyChallenges(): Promise<ChallengeResponseDto[]> {
    // Check if daily challenges already exist for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingDaily = await this.prisma.challenge.findFirst({
      where: {
        type: 'DAILY',
        startsAt: { gte: today },
      },
    });

    if (existingDaily) {
      // Return existing daily challenges
      const dailyChallenges = await this.prisma.challenge.findMany({
        where: {
          type: 'DAILY',
          startsAt: { gte: today },
        },
      });

      return dailyChallenges.map((c) => this.mapChallengeToResponse(c, 0));
    }

    // Generate new daily challenges
    const dailyTemplates = [
      {
        title: 'Daily Listener',
        description: 'Listen to audio content for 30 minutes today',
        conditions: { type: 'listen_minutes', value: 30 },
        coinReward: 50,
        xpReward: 30,
      },
      {
        title: 'Episode Explorer',
        description: 'Complete 2 episodes today',
        conditions: { type: 'complete_episode', value: 2 },
        coinReward: 30,
        xpReward: 20,
      },
      {
        title: 'Discovery Day',
        description: 'Start listening to a new album',
        conditions: { type: 'start_album', value: 1 },
        coinReward: 20,
        xpReward: 15,
      },
    ];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const created: ChallengeResponseDto[] = [];

    for (const template of dailyTemplates) {
      const challenge = await this.prisma.challenge.create({
        data: {
          title: template.title,
          description: template.description,
          type: 'DAILY',
          conditions: template.conditions,
          coinReward: template.coinReward,
          xpReward: template.xpReward,
          duration: 'ONE_DAY',
          startsAt: today,
          endsAt: tomorrow,
        },
      });

      created.push(this.mapChallengeToResponse(challenge, 0));
    }

    this.logger.log(`Generated ${created.length} daily challenges`);

    return created;
  }

  private async awardChallengeRewards(
    userId: string,
    challenge: { coinReward: number; xpReward: number; badgeId: string | null },
  ): Promise<void> {
    // Award coins
    if (challenge.coinReward > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { coins: true },
      });

      const newBalance = (user?.coins ?? 0) + challenge.coinReward;

      await this.prisma.user.update({
        where: { id: userId },
        data: { coins: newBalance },
      });

      await this.prisma.coinTransaction.create({
        data: {
          userId,
          type: 'ACHIEVEMENT',
          amount: challenge.coinReward,
          balance: newBalance,
          referenceType: 'challenge',
          description: 'Challenge completed',
        },
      });
    }

    // Award XP
    if (challenge.xpReward > 0) {
      await this.levelsService.addXp(
        userId,
        challenge.xpReward,
        'challenge',
      );
    }

    // Award badge if specified
    if (challenge.badgeId) {
      await this.badgesService.awardBadge(userId, challenge.badgeId);
    }

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        title: 'Challenge Completed!',
        body: `You've completed a challenge and earned ${challenge.coinReward} coins and ${challenge.xpReward} XP!`,
        data: { coinReward: challenge.coinReward, xpReward: challenge.xpReward },
      },
    });
  }

  private calculateExpiryDate(
    duration: string,
    challengeEnd: Date | null,
  ): Date {
    const now = new Date();
    let expiry: Date;

    switch (duration) {
      case 'ONE_DAY':
        expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'THREE_DAYS':
        expiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case 'ONE_WEEK':
        expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'TWO_WEEKS':
        expiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        break;
      case 'ONE_MONTH':
        expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        expiry = challengeEnd ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Don't exceed challenge end date
    if (challengeEnd && expiry > challengeEnd) {
      return challengeEnd;
    }

    return expiry;
  }

  private mapChallengeToResponse(
    challenge: {
      id: string;
      title: string;
      description: string;
      icon: string | null;
      type: string;
      category: string | null;
      conditions: unknown;
      coinReward: number;
      xpReward: number;
      badgeId: string | null;
      duration: string;
      startsAt: Date | null;
      endsAt: Date | null;
      maxParticipants: number | null;
    },
    participantCount: number,
  ): ChallengeResponseDto {
    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      icon: challenge.icon ?? undefined,
      type: challenge.type as ChallengeType,
      category: challenge.category ?? undefined,
      conditions: challenge.conditions as Record<string, unknown>,
      coinReward: challenge.coinReward,
      xpReward: challenge.xpReward,
      badgeId: challenge.badgeId ?? undefined,
      duration: challenge.duration as ChallengeDuration,
      startsAt: challenge.startsAt ?? undefined,
      endsAt: challenge.endsAt ?? undefined,
      maxParticipants: challenge.maxParticipants ?? undefined,
      participantCount,
    };
  }

  private mapUserChallengeToResponse(
    uc: {
      id: string;
      status: string;
      progress: number;
      target: number;
      joinedAt: Date;
      completedAt: Date | null;
      expiresAt: Date;
      challenge: {
        id: string;
        title: string;
        description: string;
        icon: string | null;
        type: string;
        category: string | null;
        conditions: unknown;
        coinReward: number;
        xpReward: number;
        badgeId: string | null;
        duration: string;
        startsAt: Date | null;
        endsAt: Date | null;
        maxParticipants: number | null;
      };
    },
    participantCount: number,
  ): UserChallengeResponseDto {
    const now = new Date();
    const timeRemaining = Math.max(0, uc.expiresAt.getTime() - now.getTime());

    return {
      id: uc.id,
      challenge: this.mapChallengeToResponse(uc.challenge, participantCount),
      status: uc.status as UserChallengeStatus,
      progress: uc.progress,
      target: uc.target,
      progressPercent: Math.round((uc.progress / uc.target) * 100),
      joinedAt: uc.joinedAt,
      completedAt: uc.completedAt ?? undefined,
      expiresAt: uc.expiresAt,
      timeRemaining: Math.floor(timeRemaining / 1000),
    };
  }
}
