import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export enum CreatorTier {
  STARTER = 'STARTER',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  PARTNER = 'PARTNER',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class CreatorProgramInfoDto {
  @ApiProperty({ enum: CreatorTier })
  tier: CreatorTier;

  @ApiProperty({ description: 'Revenue share percentage (0-100)' })
  revenueSharePercent: number;

  @ApiProperty()
  minimumPayoutAmount: number;

  @ApiProperty()
  payoutCurrency: string;

  @ApiProperty()
  features: string[];

  @ApiProperty()
  requirements: {
    minFollowers: number;
    minMonthlyListeners: number;
    minContent: number;
  };
}

export class CreatorDashboardDto {
  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  pendingRevenue: number;

  @ApiProperty()
  monthlyRevenue: number;

  @ApiProperty()
  lifetimePayouts: number;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  totalPlayCount: number;

  @ApiProperty()
  monthlyPlayCount: number;

  @ApiProperty()
  totalAlbums: number;

  @ApiProperty()
  totalEpisodes: number;

  @ApiProperty({ enum: CreatorTier })
  currentTier: CreatorTier;

  @ApiProperty()
  revenueSharePercent: number;

  @ApiProperty()
  revenueBreakdown: {
    subscriptionShare: number;
    directSales: number;
    tips: number;
    adRevenue: number;
  };

  @ApiProperty()
  topContent: Array<{
    id: string;
    title: string;
    playCount: number;
    revenue: number;
  }>;
}

export class CreatorAnalyticsDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  plays: number;

  @ApiProperty()
  uniqueListeners: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  averageListenTime: number;

  @ApiProperty()
  newFollowers: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  tips: number;

  @ApiProperty()
  demographicData: {
    ageGroups: Record<string, number>;
    regions: Record<string, number>;
  };

  @ApiProperty()
  dailyStats: Array<{
    date: string;
    plays: number;
    revenue: number;
  }>;
}

export class RequestPayoutDto {
  @ApiProperty({ description: 'Amount to request in KRW' })
  @IsNumber()
  @Min(10000)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class PayoutResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PayoutStatus })
  status: PayoutStatus;

  @ApiProperty()
  requestedAt: Date;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiPropertyOptional()
  transactionId?: string;

  @ApiPropertyOptional()
  notes?: string;
}

export class SendTipDto {
  @ApiProperty()
  @IsString()
  creatorId: string;

  @ApiProperty({ description: 'Tip amount in coins' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  message?: string;

  @ApiPropertyOptional({ description: 'Content ID to attach tip to' })
  @IsString()
  @IsOptional()
  contentId?: string;
}

export class TipResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  creatorReceived: number;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty()
  createdAt: Date;
}

export class UpdatePaymentInfoDto {
  @ApiProperty({ description: 'Bank name' })
  @IsString()
  bankName: string;

  @ApiProperty({ description: 'Account number' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Account holder name' })
  @IsString()
  accountHolder: string;

  @ApiPropertyOptional({ description: 'Tax ID / Business registration number' })
  @IsString()
  @IsOptional()
  taxId?: string;
}

export class CreatorApplicationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  bio: string;

  @ApiProperty({ description: 'Type of content you will create' })
  @IsEnum(['INDIVIDUAL', 'STUDIO', 'PUBLISHER', 'BRAND'])
  type: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  socialLinks?: string;
}

export class RevenueReportDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  subscriptionShare: number;

  @ApiProperty()
  directSales: number;

  @ApiProperty()
  adRevenue: number;

  @ApiProperty()
  tips: number;

  @ApiProperty()
  totalGross: number;

  @ApiProperty()
  platformFee: number;

  @ApiProperty()
  netRevenue: number;

  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'PAID'] })
  status: string;

  @ApiPropertyOptional()
  paidAt?: Date;
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contentId?: string;
}
