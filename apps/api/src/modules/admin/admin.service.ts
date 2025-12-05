import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DashboardStatsDto,
  DashboardChartDataDto,
  AdminUserDto,
  GetUsersQueryDto,
  UpdateUserDto,
  BulkUserActionDto,
  UserStatus,
  AdminAlbumDto,
  GetAlbumsQueryDto,
  UpdateAlbumDto,
  AdminCreatorDto,
  GetCreatorsQueryDto,
  VerifyCreatorDto,
  UpdateCreatorRevenueShareDto,
  RevenueAnalyticsDto,
  GetAnalyticsQueryDto,
  SystemSettingsDto,
  UpdateSystemSettingsDto,
  AuditLogDto,
  GetAuditLogsQueryDto,
  PaginatedResponseDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  // In-memory system settings (would typically be in database or config service)
  private systemSettings: SystemSettingsDto = {
    maintenanceMode: false,
    signupEnabled: true,
    freeTrialDays: 7,
    maxDownloadsPerUser: 100,
    maxPlaylistsPerUser: 50,
    defaultCoinBonus: 100,
    subscriptionPrices: {
      VIP_MONTHLY: 9900,
      VIP_YEARLY: 89900,
      SVIP_MONTHLY: 19900,
      SVIP_YEARLY: 179900,
      FAMILY_MONTHLY: 14900,
      FAMILY_YEARLY: 149900,
    },
    creatorSettings: {
      minFollowersForMonetization: 1000,
      defaultRevenueShare: 50,
      minPayoutAmount: 10000,
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Dashboard ====================

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      vipSubscribers,
      svipSubscribers,
      totalCreators,
      verifiedCreators,
      totalAlbums,
      totalEpisodes,
      playStats,
      listenStats,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { lastActiveAt: { gte: weekStart } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: weekStart } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: monthStart } },
      }),
      this.prisma.user.count({
        where: { subscription: 'VIP' },
      }),
      this.prisma.user.count({
        where: { subscription: 'SVIP' },
      }),
      this.prisma.creator.count(),
      this.prisma.creator.count({
        where: { isVerified: true },
      }),
      this.prisma.album.count({
        where: { isPublished: true },
      }),
      this.prisma.episode.count(),
      this.prisma.album.aggregate({
        _sum: { playCount: true },
      }),
      this.prisma.user.aggregate({
        _sum: { totalListenTime: true },
      }),
    ]);

    // Calculate revenue (simplified - would typically come from payment records)
    const revenueData = await this.calculateRevenue(todayStart, weekStart, monthStart);

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalSubscribers: vipSubscribers + svipSubscribers,
      vipSubscribers,
      svipSubscribers,
      totalCreators,
      verifiedCreators,
      totalAlbums,
      totalEpisodes,
      totalPlayCount: Number(playStats._sum.playCount || 0),
      totalListenMinutes: listenStats._sum.totalListenTime || 0,
      revenue: revenueData,
    };
  }

  async getDashboardCharts(period: string = '30d'): Promise<DashboardChartDataDto> {
    const days = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [userGrowthRaw, subscriptionDist, categoryDist] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['subscription'],
        _count: { id: true },
      }),
      this.prisma.album.groupBy({
        by: ['category'],
        where: { isPublished: true },
        _count: { id: true },
      }),
    ]);

    // Aggregate user growth by date
    const userGrowthMap = new Map<string, number>();
    for (const entry of userGrowthRaw) {
      const dateStr = entry.createdAt.toISOString().split('T')[0];
      userGrowthMap.set(dateStr, (userGrowthMap.get(dateStr) || 0) + entry._count.id);
    }

    const userGrowth = Array.from(userGrowthMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate sample revenue chart data
    const revenueChart = this.generateSampleRevenueChart(days);
    const playCountChart = this.generateSamplePlayCountChart(days);

    return {
      period,
      userGrowth,
      revenueChart,
      playCountChart,
      subscriptionDistribution: subscriptionDist.map(s => ({
        tier: s.subscription,
        count: s._count.id,
      })),
      categoryDistribution: categoryDist.map(c => ({
        category: c.category,
        count: c._count.id,
      })),
    };
  }

  // ==================== User Management ====================

  async getUsers(query: GetUsersQueryDto): Promise<PaginatedResponseDto<AdminUserDto>> {
    const {
      page = 1,
      limit = 20,
      search,
      subscription,
      status,
      isCreator,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (subscription) {
      where.subscription = subscription;
    }

    if (isCreator !== undefined) {
      if (isCreator) {
        where.creator = { isNot: null };
      } else {
        where.creator = null;
      }
    }

    // Note: status would need to be added to User model
    // For now, we'll skip status filtering

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          creator: { select: { id: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(u => this.mapUserToAdminDto(u)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async getUser(userId: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { creator: { select: { id: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToAdminDto(user);
  }

  async updateUser(userId: string, dto: UpdateUserDto, adminId: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = {};
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.subscription !== undefined) data.subscription = dto.subscription;
    if (dto.subscriptionExpiresAt !== undefined) {
      data.subscriptionExpiresAt = new Date(dto.subscriptionExpiresAt);
    }
    if (dto.coins !== undefined) data.coins = dto.coins;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { creator: { select: { id: true } } },
    });

    await this.logAdminAction(adminId, 'UPDATE_USER', 'user', userId, dto);

    return this.mapUserToAdminDto(updated);
  }

  async bulkUserAction(dto: BulkUserActionDto, adminId: string): Promise<{ affected: number }> {
    let affected = 0;

    switch (dto.action) {
      case 'delete':
        const deleteResult = await this.prisma.user.deleteMany({
          where: { id: { in: dto.userIds } },
        });
        affected = deleteResult.count;
        break;

      case 'upgrade':
        const upgradeResult = await this.prisma.user.updateMany({
          where: { id: { in: dto.userIds } },
          data: { subscription: 'VIP' },
        });
        affected = upgradeResult.count;
        break;

      case 'downgrade':
        const downgradeResult = await this.prisma.user.updateMany({
          where: { id: { in: dto.userIds } },
          data: { subscription: 'FREE' },
        });
        affected = downgradeResult.count;
        break;

      default:
        throw new BadRequestException('Invalid action');
    }

    await this.logAdminAction(adminId, `BULK_${dto.action.toUpperCase()}`, 'user', dto.userIds.join(','), dto);

    return { affected };
  }

  // ==================== Content Management ====================

  async getAlbums(query: GetAlbumsQueryDto): Promise<PaginatedResponseDto<AdminAlbumDto>> {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      contentType,
      accessType,
      isPublished,
      isFeatured,
      creatorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = category;
    if (contentType) where.contentType = contentType;
    if (accessType) where.accessType = accessType;
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (creatorId) where.creatorId = creatorId;

    const [albums, total] = await Promise.all([
      this.prisma.album.findMany({
        where,
        include: {
          creator: { select: { name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.album.count({ where }),
    ]);

    return {
      items: albums.map(a => this.mapAlbumToAdminDto(a)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async updateAlbum(albumId: string, dto: UpdateAlbumDto, adminId: string): Promise<AdminAlbumDto> {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.accessType !== undefined) data.accessType = dto.accessType;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.isExclusive !== undefined) data.isExclusive = dto.isExclusive;

    const updated = await this.prisma.album.update({
      where: { id: albumId },
      data,
      include: { creator: { select: { name: true } } },
    });

    await this.logAdminAction(adminId, 'UPDATE_ALBUM', 'album', albumId, dto);

    return this.mapAlbumToAdminDto(updated);
  }

  async deleteAlbum(albumId: string, adminId: string): Promise<void> {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    await this.prisma.album.delete({
      where: { id: albumId },
    });

    await this.logAdminAction(adminId, 'DELETE_ALBUM', 'album', albumId, { title: album.title });
  }

  // ==================== Creator Management ====================

  async getCreators(query: GetCreatorsQueryDto): Promise<PaginatedResponseDto<AdminCreatorDto>> {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (isVerified !== undefined) where.isVerified = isVerified;

    const [creators, total] = await Promise.all([
      this.prisma.creator.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creator.count({ where }),
    ]);

    return {
      items: creators.map(c => this.mapCreatorToAdminDto(c)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async verifyCreator(creatorId: string, dto: VerifyCreatorDto, adminId: string): Promise<AdminCreatorDto> {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data: {
        isVerified: dto.isVerified,
        verifiedAt: dto.isVerified ? new Date() : null,
      },
    });

    await this.logAdminAction(adminId, dto.isVerified ? 'VERIFY_CREATOR' : 'UNVERIFY_CREATOR', 'creator', creatorId, dto);

    return this.mapCreatorToAdminDto(updated);
  }

  async updateCreatorRevenueShare(
    creatorId: string,
    dto: UpdateCreatorRevenueShareDto,
    adminId: string,
  ): Promise<AdminCreatorDto> {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data: {
        revenueShareRate: dto.revenueSharePercent / 100,
      },
    });

    await this.logAdminAction(adminId, 'UPDATE_REVENUE_SHARE', 'creator', creatorId, dto);

    return this.mapCreatorToAdminDto(updated);
  }

  // ==================== Revenue Analytics ====================

  async getRevenueAnalytics(query: GetAnalyticsQueryDto): Promise<RevenueAnalyticsDto> {
    const period = query.period || '30d';
    const days = parseInt(period) || 30;

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Get subscription data
    const [newSubs, renewedSubs, canceledSubs] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.subscription.count({
        where: {
          updatedAt: { gte: startDate, lte: endDate },
          status: 'ACTIVE',
          createdAt: { lt: startDate },
        },
      }),
      this.prisma.subscription.count({
        where: {
          canceledAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Calculate revenue (simplified)
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        currentPeriodStart: { gte: startDate, lte: endDate },
        status: 'ACTIVE',
      },
      select: { amount: true, tier: true, planType: true },
    });

    const subscriptionRevenue = subscriptions.reduce((sum, s) => sum + s.amount, 0);

    // Group by plan type
    const revenueByPlan = new Map<string, { amount: number; count: number }>();
    for (const sub of subscriptions) {
      const key = `${sub.tier}_${sub.planType}`;
      const current = revenueByPlan.get(key) || { amount: 0, count: 0 };
      current.amount += sub.amount;
      current.count += 1;
      revenueByPlan.set(key, current);
    }

    const totalUsers = await this.prisma.user.count();

    return {
      period,
      totalRevenue: subscriptionRevenue,
      subscriptionRevenue,
      coinPurchaseRevenue: 0, // Would calculate from purchase records
      contentPurchaseRevenue: 0,
      newSubscriptions: newSubs,
      renewedSubscriptions: renewedSubs,
      canceledSubscriptions: canceledSubs,
      churnRate: newSubs > 0 ? (canceledSubs / newSubs) * 100 : 0,
      averageRevenuePerUser: totalUsers > 0 ? subscriptionRevenue / totalUsers : 0,
      dailyRevenue: this.generateSampleRevenueChart(days).map(d => ({ ...d, type: 'subscription' })),
      revenueByPlan: Array.from(revenueByPlan.entries()).map(([plan, data]) => ({
        plan,
        amount: data.amount,
        count: data.count,
      })),
    };
  }

  // ==================== System Settings ====================

  async getSystemSettings(): Promise<SystemSettingsDto> {
    return this.systemSettings;
  }

  async updateSystemSettings(dto: UpdateSystemSettingsDto, adminId: string): Promise<SystemSettingsDto> {
    if (dto.maintenanceMode !== undefined) {
      this.systemSettings.maintenanceMode = dto.maintenanceMode;
    }
    if (dto.signupEnabled !== undefined) {
      this.systemSettings.signupEnabled = dto.signupEnabled;
    }
    if (dto.freeTrialDays !== undefined) {
      this.systemSettings.freeTrialDays = dto.freeTrialDays;
    }
    if (dto.maxDownloadsPerUser !== undefined) {
      this.systemSettings.maxDownloadsPerUser = dto.maxDownloadsPerUser;
    }
    if (dto.maxPlaylistsPerUser !== undefined) {
      this.systemSettings.maxPlaylistsPerUser = dto.maxPlaylistsPerUser;
    }
    if (dto.defaultCoinBonus !== undefined) {
      this.systemSettings.defaultCoinBonus = dto.defaultCoinBonus;
    }
    if (dto.subscriptionPrices) {
      this.systemSettings.subscriptionPrices = {
        ...this.systemSettings.subscriptionPrices,
        ...dto.subscriptionPrices,
      };
    }
    if (dto.creatorSettings) {
      this.systemSettings.creatorSettings = {
        ...this.systemSettings.creatorSettings,
        ...dto.creatorSettings,
      };
    }

    await this.logAdminAction(adminId, 'UPDATE_SYSTEM_SETTINGS', 'system', 'settings', dto);

    return this.systemSettings;
  }

  // ==================== Audit Logs ====================

  async getAuditLogs(query: GetAuditLogsQueryDto): Promise<PaginatedResponseDto<AuditLogDto>> {
    const {
      page = 1,
      limit = 50,
      adminId,
      action,
      targetType,
      startDate,
      endDate,
    } = query;

    const where: any = {};

    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          admin: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs.map(l => ({
        id: l.id,
        adminId: l.adminId,
        adminEmail: l.admin.email,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        details: l.details as Record<string, any>,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  // ==================== Helper Methods ====================

  private async calculateRevenue(todayStart: Date, weekStart: Date, monthStart: Date) {
    const [todayRevenue, weekRevenue, monthRevenue, totalRevenue] = await Promise.all([
      this.prisma.subscription.aggregate({
        where: { createdAt: { gte: todayStart }, status: 'ACTIVE' },
        _sum: { amount: true },
      }),
      this.prisma.subscription.aggregate({
        where: { createdAt: { gte: weekStart }, status: 'ACTIVE' },
        _sum: { amount: true },
      }),
      this.prisma.subscription.aggregate({
        where: { createdAt: { gte: monthStart }, status: 'ACTIVE' },
        _sum: { amount: true },
      }),
      this.prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true },
      }),
    ]);

    return {
      today: todayRevenue._sum.amount || 0,
      thisWeek: weekRevenue._sum.amount || 0,
      thisMonth: monthRevenue._sum.amount || 0,
      total: totalRevenue._sum.amount || 0,
    };
  }

  private generateSampleRevenueChart(days: number): Array<{ date: string; amount: number }> {
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      result.push({
        date: date.toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 1000000) + 500000,
      });
    }

    return result;
  }

  private generateSamplePlayCountChart(days: number): Array<{ date: string; count: number }> {
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      result.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10000) + 5000,
      });
    }

    return result;
  }

  private async logAdminAction(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId,
          action,
          targetType,
          targetId,
          details,
          ipAddress: '0.0.0.0', // Would get from request context
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log admin action: ${error.message}`);
    }
  }

  private mapUserToAdminDto(user: any): AdminUserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      subscription: user.subscription,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      coins: user.coins,
      totalListenTime: user.totalListenTime,
      isCreator: !!user.creator,
      status: UserStatus.ACTIVE, // Would need to add status field to User model
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
    };
  }

  private mapAlbumToAdminDto(album: any): AdminAlbumDto {
    return {
      id: album.id,
      title: album.title,
      coverUrl: album.coverUrl,
      category: album.category,
      contentType: album.contentType,
      accessType: album.accessType,
      creatorName: album.creator?.name || 'Unknown',
      totalEpisodes: album.totalEpisodes,
      playCount: Number(album.playCount),
      rating: album.rating,
      status: album.status,
      isPublished: album.isPublished,
      isFeatured: album.isFeatured,
      createdAt: album.createdAt,
    };
  }

  private mapCreatorToAdminDto(creator: any): AdminCreatorDto {
    return {
      id: creator.id,
      userId: creator.userId,
      name: creator.name,
      displayName: creator.displayName,
      avatarUrl: creator.avatarUrl,
      type: creator.type,
      isVerified: creator.isVerified,
      totalAlbums: creator.totalAlbums,
      totalEpisodes: creator.totalEpisodes,
      followerCount: creator.followerCount,
      totalPlayCount: Number(creator.totalPlayCount),
      totalRevenue: Number(creator.totalRevenue),
      pendingRevenue: Number(creator.pendingRevenue),
      createdAt: creator.createdAt,
    };
  }
}
