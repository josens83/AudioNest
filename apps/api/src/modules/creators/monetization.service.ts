import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatorTier,
  CreatorProgramInfoDto,
  CreatorDashboardDto,
  CreatorAnalyticsDto,
  PayoutResponseDto,
  PayoutStatus,
  TipResponseDto,
  RevenueReportDto,
} from './dto/monetization.dto';
import { AppLoggerService } from '../../common/logger';

interface TierConfig {
  revenueShare: number;
  minPayout: number;
  requirements: {
    minFollowers: number;
    minMonthlyListeners: number;
    minContent: number;
  };
  features: string[];
}

@Injectable()
export class MonetizationService {
  private readonly tierConfigs: Record<CreatorTier, TierConfig> = {
    [CreatorTier.STARTER]: {
      revenueShare: 0.5,
      minPayout: 50000,
      requirements: { minFollowers: 0, minMonthlyListeners: 0, minContent: 1 },
      features: ['Basic analytics', 'Monthly payouts'],
    },
    [CreatorTier.BRONZE]: {
      revenueShare: 0.55,
      minPayout: 30000,
      requirements: { minFollowers: 100, minMonthlyListeners: 500, minContent: 10 },
      features: ['Basic analytics', 'Bi-weekly payouts', 'Priority support'],
    },
    [CreatorTier.SILVER]: {
      revenueShare: 0.6,
      minPayout: 20000,
      requirements: { minFollowers: 500, minMonthlyListeners: 2500, minContent: 30 },
      features: ['Advanced analytics', 'Weekly payouts', 'Featured placement'],
    },
    [CreatorTier.GOLD]: {
      revenueShare: 0.65,
      minPayout: 10000,
      requirements: { minFollowers: 2000, minMonthlyListeners: 10000, minContent: 50 },
      features: ['Full analytics', 'Weekly payouts', 'Promotion tools', 'Exclusive events'],
    },
    [CreatorTier.PLATINUM]: {
      revenueShare: 0.7,
      minPayout: 10000,
      requirements: { minFollowers: 10000, minMonthlyListeners: 50000, minContent: 100 },
      features: ['Full analytics', 'On-demand payouts', 'Dedicated manager', 'Co-marketing'],
    },
    [CreatorTier.PARTNER]: {
      revenueShare: 0.75,
      minPayout: 0,
      requirements: { minFollowers: 50000, minMonthlyListeners: 200000, minContent: 200 },
      features: ['All features', 'Custom deals', 'Revenue guarantee', 'Exclusive partnership'],
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('MonetizationService');
  }

  getCreatorProgramInfo(tier: CreatorTier = CreatorTier.STARTER): CreatorProgramInfoDto {
    const config = this.tierConfigs[tier];
    return {
      tier,
      revenueSharePercent: config.revenueShare * 100,
      minimumPayoutAmount: config.minPayout,
      payoutCurrency: 'KRW',
      features: config.features,
      requirements: config.requirements,
    };
  }

  getAllTierInfo(): CreatorProgramInfoDto[] {
    return Object.keys(this.tierConfigs).map((tier) =>
      this.getCreatorProgramInfo(tier as CreatorTier),
    );
  }

  async getCreatorDashboard(userId: string): Promise<CreatorDashboardDto> {
    const creator = await this.prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    // Get current month revenue
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthRevenue = await this.prisma.creatorRevenue.findUnique({
      where: { creatorId_period: { creatorId: creator.id, period: periodKey } },
    });

    // Get lifetime payouts
    const lifetimePayouts = await this.prisma.creatorRevenue.aggregate({
      where: { creatorId: creator.id, status: 'PAID' },
      _sum: { netRevenue: true },
    });

    // Get monthly play count
    const monthlyPlayCount = await this.prisma.listeningHistory.count({
      where: {
        episode: { album: { creatorId: creator.id } },
        lastPlayedAt: { gte: monthStart },
      },
    });

    // Get top content
    const topContent = await this.prisma.album.findMany({
      where: { creatorId: creator.id },
      orderBy: { playCount: 'desc' },
      take: 5,
      select: { id: true, title: true, playCount: true },
    });

    // Calculate tier
    const tier = this.calculateCreatorTier(creator);
    const tierConfig = this.tierConfigs[tier];

    return {
      totalRevenue: Number(creator.totalRevenue),
      pendingRevenue: Number(creator.pendingRevenue),
      monthlyRevenue: currentMonthRevenue
        ? Number(currentMonthRevenue.netRevenue)
        : 0,
      lifetimePayouts: lifetimePayouts._sum.netRevenue
        ? Number(lifetimePayouts._sum.netRevenue)
        : 0,
      followerCount: creator.followerCount,
      totalPlayCount: Number(creator.totalPlayCount),
      monthlyPlayCount,
      totalAlbums: creator.totalAlbums,
      totalEpisodes: creator.totalEpisodes,
      currentTier: tier,
      revenueSharePercent: tierConfig.revenueShare * 100,
      revenueBreakdown: {
        subscriptionShare: currentMonthRevenue
          ? Number(currentMonthRevenue.subscriptionShare)
          : 0,
        directSales: currentMonthRevenue
          ? Number(currentMonthRevenue.directSales)
          : 0,
        tips: currentMonthRevenue
          ? Number(currentMonthRevenue.tipsReceived)
          : 0,
        adRevenue: currentMonthRevenue
          ? Number(currentMonthRevenue.adRevenue)
          : 0,
      },
      topContent: topContent.map((c) => ({
        id: c.id,
        title: c.title,
        playCount: Number(c.playCount),
        revenue: 0, // Would need per-content revenue tracking
      })),
    };
  }

  async getAnalytics(
    userId: string,
    period: string = '30d',
    startDate?: Date,
    endDate?: Date,
  ): Promise<CreatorAnalyticsDto> {
    const creator = await this.prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    // Calculate date range
    const end = endDate ?? new Date();
    let start = startDate;

    if (!start) {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Get listening history stats
    const listeningStats = await this.prisma.listeningHistory.groupBy({
      by: ['userId'],
      where: {
        episode: { album: { creatorId: creator.id } },
        lastPlayedAt: { gte: start, lte: end },
      },
      _count: { id: true },
      _sum: { totalListenTime: true },
    });

    const totalPlays = listeningStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const uniqueListeners = listeningStats.length;
    const totalListenTime = listeningStats.reduce(
      (sum, stat) => sum + (stat._sum.totalListenTime ?? 0),
      0,
    );

    // Get completed episodes for completion rate
    const completedCount = await this.prisma.listeningHistory.count({
      where: {
        episode: { album: { creatorId: creator.id } },
        lastPlayedAt: { gte: start, lte: end },
        completed: true,
      },
    });

    // Get new followers
    const newFollowers = await this.prisma.creatorFollow.count({
      where: {
        creatorId: creator.id,
        createdAt: { gte: start, lte: end },
      },
    });

    // Get revenue for period
    const revenueData = await this.prisma.creatorRevenue.findMany({
      where: {
        creatorId: creator.id,
        // This is simplified - would need to parse period strings
      },
    });

    const revenue = revenueData.reduce(
      (sum, r) => sum + Number(r.netRevenue),
      0,
    );
    const tips = revenueData.reduce(
      (sum, r) => sum + Number(r.tipsReceived),
      0,
    );

    // Get daily stats (simplified)
    const dailyStats: Array<{ date: string; plays: number; revenue: number }> = [];

    return {
      period,
      plays: totalPlays,
      uniqueListeners,
      completionRate: totalPlays > 0 ? (completedCount / totalPlays) * 100 : 0,
      averageListenTime: uniqueListeners > 0 ? totalListenTime / uniqueListeners : 0,
      newFollowers,
      revenue,
      tips,
      demographicData: {
        ageGroups: {}, // Would need user demographic data
        regions: {},
      },
      dailyStats,
    };
  }

  async sendTip(
    userId: string,
    creatorId: string,
    amount: number,
    message?: string,
    contentId?: string,
  ): Promise<TipResponseDto> {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (creator.userId === userId) {
      throw new BadRequestException('Cannot tip yourself');
    }

    // Check user has enough coins
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user || user.coins < amount) {
      throw new BadRequestException('Insufficient coins');
    }

    // Calculate creator's share (based on tier)
    const tier = this.calculateCreatorTier(creator);
    const tierConfig = this.tierConfigs[tier];
    const creatorReceived = Math.floor(amount * tierConfig.revenueShare);

    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct coins from user
      const newUserBalance = user.coins - amount;
      await tx.user.update({
        where: { id: userId },
        data: { coins: newUserBalance },
      });

      // Record coin transaction
      await tx.coinTransaction.create({
        data: {
          userId,
          type: 'GIFT_SENT',
          amount: -amount,
          balance: newUserBalance,
          referenceType: 'tip',
          referenceId: creatorId,
          description: `Tip to ${creator.name}`,
        },
      });

      // Add to creator's pending revenue
      await tx.creator.update({
        where: { id: creatorId },
        data: {
          pendingRevenue: { increment: creatorReceived },
          totalRevenue: { increment: creatorReceived },
        },
      });

      // Update monthly revenue
      const now = new Date();
      const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await tx.creatorRevenue.upsert({
        where: { creatorId_period: { creatorId, period: periodKey } },
        create: {
          creatorId,
          period: periodKey,
          tipsReceived: creatorReceived,
          totalGross: creatorReceived,
          platformFee: amount - creatorReceived,
          netRevenue: creatorReceived,
        },
        update: {
          tipsReceived: { increment: creatorReceived },
          totalGross: { increment: creatorReceived },
          platformFee: { increment: amount - creatorReceived },
          netRevenue: { increment: creatorReceived },
        },
      });

      // Notify creator
      await tx.notification.create({
        data: {
          userId: creator.userId,
          type: 'GIFT_RECEIVED',
          title: 'Tip Received!',
          body: `You received a tip of ${creatorReceived} coins!`,
          data: {
            tipAmount: amount,
            receivedAmount: creatorReceived,
            message,
            contentId,
          },
        },
      });

      return {
        id: `tip_${Date.now()}`,
        amount,
        creatorReceived,
        message,
        createdAt: new Date(),
      };
    });

    this.logger.log(
      `User ${userId} tipped ${amount} coins to creator ${creatorId}`,
    );

    return result;
  }

  async requestPayout(
    userId: string,
    amount: number,
    notes?: string,
  ): Promise<PayoutResponseDto> {
    const creator = await this.prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    // Check minimum payout
    const tier = this.calculateCreatorTier(creator);
    const tierConfig = this.tierConfigs[tier];

    if (amount < tierConfig.minPayout) {
      throw new BadRequestException(
        `Minimum payout amount is ${tierConfig.minPayout} KRW`,
      );
    }

    // Check available balance
    if (Number(creator.pendingRevenue) < amount) {
      throw new BadRequestException('Insufficient pending revenue');
    }

    // Check payment info
    if (!creator.paymentInfo) {
      throw new BadRequestException(
        'Please add payment information before requesting payout',
      );
    }

    // Create payout request (simplified - would need a separate payouts table)
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        pendingRevenue: { decrement: amount },
      },
    });

    this.logger.log(
      `Creator ${creator.id} requested payout of ${amount} KRW`,
    );

    return {
      id: `payout_${Date.now()}`,
      amount,
      currency: 'KRW',
      status: PayoutStatus.PENDING,
      requestedAt: new Date(),
      notes,
    };
  }

  async getRevenueReports(userId: string): Promise<RevenueReportDto[]> {
    const creator = await this.prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const revenues = await this.prisma.creatorRevenue.findMany({
      where: { creatorId: creator.id },
      orderBy: { period: 'desc' },
      take: 12, // Last 12 months
    });

    return revenues.map((r) => ({
      period: r.period,
      subscriptionShare: Number(r.subscriptionShare),
      directSales: Number(r.directSales),
      adRevenue: Number(r.adRevenue),
      tips: Number(r.tipsReceived),
      totalGross: Number(r.totalGross),
      platformFee: Number(r.platformFee),
      netRevenue: Number(r.netRevenue),
      status: r.status,
      paidAt: r.paidAt ?? undefined,
    }));
  }

  async updatePaymentInfo(
    userId: string,
    paymentInfo: {
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      taxId?: string;
    },
  ): Promise<{ success: boolean }> {
    const creator = await this.prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        paymentInfo: paymentInfo,
      },
    });

    this.logger.log(`Creator ${creator.id} updated payment info`);

    return { success: true };
  }

  async applyForCreatorProgram(
    userId: string,
    application: {
      name: string;
      displayName?: string;
      bio: string;
      type: string;
      portfolioUrl?: string;
      socialLinks?: string;
    },
  ): Promise<{ creatorId: string }> {
    // Check if already a creator
    const existing = await this.prisma.creator.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Already registered as a creator');
    }

    const creator = await this.prisma.creator.create({
      data: {
        userId,
        name: application.name,
        displayName: application.displayName,
        bio: application.bio,
        type: application.type as 'INDIVIDUAL' | 'STUDIO' | 'PUBLISHER' | 'BRAND',
        links: {
          portfolio: application.portfolioUrl,
          social: application.socialLinks,
        },
        revenueShareRate: 0.5, // Default starter rate
      },
    });

    this.logger.log(`User ${userId} applied for creator program`);

    return { creatorId: creator.id };
  }

  private calculateCreatorTier(creator: {
    followerCount: number;
    totalPlayCount: bigint;
    totalEpisodes: number;
  }): CreatorTier {
    // Simplified tier calculation based on metrics
    const followers = creator.followerCount;
    const monthlyListeners = Number(creator.totalPlayCount) / 12; // Rough estimate
    const content = creator.totalEpisodes;

    if (
      followers >= 50000 &&
      monthlyListeners >= 200000 &&
      content >= 200
    ) {
      return CreatorTier.PARTNER;
    }
    if (
      followers >= 10000 &&
      monthlyListeners >= 50000 &&
      content >= 100
    ) {
      return CreatorTier.PLATINUM;
    }
    if (
      followers >= 2000 &&
      monthlyListeners >= 10000 &&
      content >= 50
    ) {
      return CreatorTier.GOLD;
    }
    if (
      followers >= 500 &&
      monthlyListeners >= 2500 &&
      content >= 30
    ) {
      return CreatorTier.SILVER;
    }
    if (
      followers >= 100 &&
      monthlyListeners >= 500 &&
      content >= 10
    ) {
      return CreatorTier.BRONZE;
    }
    return CreatorTier.STARTER;
  }
}
