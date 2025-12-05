import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

// ==================== Dashboard Overview ====================

export class DashboardStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeUsers: number;

  @ApiProperty()
  newUsersToday: number;

  @ApiProperty()
  newUsersThisWeek: number;

  @ApiProperty()
  newUsersThisMonth: number;

  @ApiProperty()
  totalSubscribers: number;

  @ApiProperty()
  vipSubscribers: number;

  @ApiProperty()
  svipSubscribers: number;

  @ApiProperty()
  totalCreators: number;

  @ApiProperty()
  verifiedCreators: number;

  @ApiProperty()
  totalAlbums: number;

  @ApiProperty()
  totalEpisodes: number;

  @ApiProperty()
  totalPlayCount: number;

  @ApiProperty()
  totalListenMinutes: number;

  @ApiProperty()
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
}

export class DashboardChartDataDto {
  @ApiProperty()
  period: string;

  @ApiProperty({ type: [Object] })
  userGrowth: Array<{ date: string; count: number }>;

  @ApiProperty({ type: [Object] })
  revenueChart: Array<{ date: string; amount: number }>;

  @ApiProperty({ type: [Object] })
  playCountChart: Array<{ date: string; count: number }>;

  @ApiProperty({ type: [Object] })
  subscriptionDistribution: Array<{ tier: string; count: number }>;

  @ApiProperty({ type: [Object] })
  categoryDistribution: Array<{ category: string; count: number }>;
}

// ==================== User Management ====================

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export class AdminUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  subscription: string;

  @ApiPropertyOptional()
  subscriptionExpiresAt?: Date;

  @ApiProperty()
  coins: number;

  @ApiProperty()
  totalListenTime: number;

  @ApiProperty()
  isCreator: boolean;

  @ApiProperty()
  status: UserStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  lastActiveAt: Date;
}

export class GetUsersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['FREE', 'VIP', 'SVIP'] })
  @IsString()
  @IsOptional()
  subscription?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isCreator?: boolean;

  @ApiPropertyOptional({ enum: ['createdAt', 'lastActiveAt', 'coins', 'totalListenTime'] })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional({ enum: ['FREE', 'VIP', 'SVIP'] })
  @IsString()
  @IsOptional()
  subscription?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  subscriptionExpiresAt?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  coins?: number;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

export class BulkUserActionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ enum: ['suspend', 'unsuspend', 'ban', 'delete', 'upgrade', 'downgrade'] })
  @IsString()
  action: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

// ==================== Content Management ====================

export class AdminAlbumDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  coverUrl?: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  contentType: string;

  @ApiProperty()
  accessType: string;

  @ApiProperty()
  creatorName: string;

  @ApiProperty()
  totalEpisodes: number;

  @ApiProperty()
  playCount: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class GetAlbumsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accessType?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  creatorId?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'playCount', 'rating', 'title'] })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: string;
}

export class UpdateAlbumDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accessType?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isExclusive?: boolean;
}

// ==================== Creator Management ====================

export class AdminCreatorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  totalAlbums: number;

  @ApiProperty()
  totalEpisodes: number;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  totalPlayCount: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  pendingRevenue: number;

  @ApiProperty()
  createdAt: Date;
}

export class GetCreatorsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['INDIVIDUAL', 'STUDIO', 'PUBLISHER', 'BRAND'] })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({ enum: ['createdAt', 'followerCount', 'totalPlayCount', 'totalRevenue'] })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: string;
}

export class VerifyCreatorDto {
  @ApiProperty()
  @IsBoolean()
  isVerified: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCreatorRevenueShareDto {
  @ApiProperty({ description: 'Revenue share rate (0.0 - 1.0)' })
  @IsInt()
  @Min(0)
  @Max(100)
  revenueSharePercent: number;
}

// ==================== Revenue & Analytics ====================

export class RevenueAnalyticsDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  subscriptionRevenue: number;

  @ApiProperty()
  coinPurchaseRevenue: number;

  @ApiProperty()
  contentPurchaseRevenue: number;

  @ApiProperty()
  newSubscriptions: number;

  @ApiProperty()
  renewedSubscriptions: number;

  @ApiProperty()
  canceledSubscriptions: number;

  @ApiProperty()
  churnRate: number;

  @ApiProperty()
  averageRevenuePerUser: number;

  @ApiProperty({ type: [Object] })
  dailyRevenue: Array<{ date: string; amount: number; type: string }>;

  @ApiProperty({ type: [Object] })
  revenueByPlan: Array<{ plan: string; amount: number; count: number }>;
}

export class GetAnalyticsQueryDto {
  @ApiPropertyOptional({ default: '30d' })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

// ==================== System Settings ====================

export class SystemSettingsDto {
  @ApiProperty()
  maintenanceMode: boolean;

  @ApiProperty()
  signupEnabled: boolean;

  @ApiProperty()
  freeTrialDays: number;

  @ApiProperty()
  maxDownloadsPerUser: number;

  @ApiProperty()
  maxPlaylistsPerUser: number;

  @ApiProperty()
  defaultCoinBonus: number;

  @ApiProperty({ type: Object })
  subscriptionPrices: {
    VIP_MONTHLY: number;
    VIP_YEARLY: number;
    SVIP_MONTHLY: number;
    SVIP_YEARLY: number;
    FAMILY_MONTHLY: number;
    FAMILY_YEARLY: number;
  };

  @ApiProperty({ type: Object })
  creatorSettings: {
    minFollowersForMonetization: number;
    defaultRevenueShare: number;
    minPayoutAmount: number;
  };
}

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  signupEnabled?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  @IsOptional()
  freeTrialDays?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxDownloadsPerUser?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxPlaylistsPerUser?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  defaultCoinBonus?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  subscriptionPrices?: Record<string, number>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  creatorSettings?: Record<string, number>;
}

// ==================== Audit Log ====================

export class AuditLogDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty()
  adminEmail: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  targetType: string;

  @ApiProperty()
  targetId: string;

  @ApiPropertyOptional({ type: Object })
  details?: Record<string, any>;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  createdAt: Date;
}

export class GetAuditLogsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adminId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetType?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

// ==================== Response Wrappers ====================

export class PaginatedResponseDto<T> {
  @ApiProperty()
  items: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasMore: boolean;
}
