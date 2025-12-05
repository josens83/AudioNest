import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

export enum LeaderboardType {
  LISTEN_TIME = 'LISTEN_TIME',
  EPISODES_COMPLETED = 'EPISODES_COMPLETED',
  STREAK = 'STREAK',
  XP_EARNED = 'XP_EARNED',
  GIFTS_SENT = 'GIFTS_SENT',
  REVIEWS_WRITTEN = 'REVIEWS_WRITTEN',
}

export enum LeaderboardScope {
  GLOBAL = 'GLOBAL',
  FRIENDS = 'FRIENDS',
  CATEGORY = 'CATEGORY',
}

export enum LeaderboardPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME',
}

export class CreateLeaderboardDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: LeaderboardType })
  @IsEnum(LeaderboardType)
  type: LeaderboardType;

  @ApiProperty({ enum: LeaderboardScope })
  @IsEnum(LeaderboardScope)
  scope: LeaderboardScope;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ enum: LeaderboardPeriod })
  @IsEnum(LeaderboardPeriod)
  resetPeriod: LeaderboardPeriod;
}

export class LeaderboardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: LeaderboardType })
  type: LeaderboardType;

  @ApiProperty({ enum: LeaderboardScope })
  scope: LeaderboardScope;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty({ enum: LeaderboardPeriod })
  resetPeriod: LeaderboardPeriod;

  @ApiProperty()
  lastResetAt: Date;

  @ApiProperty()
  nextResetAt: Date;
}

export class LeaderboardEntryDto {
  @ApiProperty()
  rank: number;

  @ApiProperty()
  previousRank: number | null;

  @ApiProperty({ description: 'Rank change: positive = improved, negative = dropped' })
  rankChange: number | null;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  score: number;

  @ApiPropertyOptional()
  level?: number;

  @ApiPropertyOptional()
  title?: string;
}

export class LeaderboardWithEntriesDto extends LeaderboardResponseDto {
  @ApiProperty({ type: [LeaderboardEntryDto] })
  entries: LeaderboardEntryDto[];

  @ApiProperty({ description: 'Total number of participants' })
  totalParticipants: number;

  @ApiPropertyOptional({ type: LeaderboardEntryDto })
  currentUserEntry?: LeaderboardEntryDto;
}

export class GetLeaderboardDto {
  @ApiProperty({ enum: LeaderboardType })
  @IsEnum(LeaderboardType)
  type: LeaderboardType;

  @ApiProperty({ enum: LeaderboardPeriod })
  @IsEnum(LeaderboardPeriod)
  period: LeaderboardPeriod;

  @ApiPropertyOptional({ enum: LeaderboardScope, default: LeaderboardScope.GLOBAL })
  @IsEnum(LeaderboardScope)
  @IsOptional()
  scope?: LeaderboardScope;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;
}
