import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsObject,
  IsDateString,
  Min,
} from 'class-validator';

export enum ChallengeType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  SPECIAL = 'SPECIAL',
  SEASONAL = 'SEASONAL',
}

export enum ChallengeDuration {
  ONE_DAY = 'ONE_DAY',
  THREE_DAYS = 'THREE_DAYS',
  ONE_WEEK = 'ONE_WEEK',
  TWO_WEEKS = 'TWO_WEEKS',
  ONE_MONTH = 'ONE_MONTH',
  CUSTOM = 'CUSTOM',
}

export enum UserChallengeStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export class CreateChallengeDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ enum: ChallengeType })
  @IsEnum(ChallengeType)
  type: ChallengeType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Challenge conditions',
    example: { type: 'listen_minutes', value: 60 },
  })
  @IsObject()
  conditions: Record<string, unknown>;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  coinReward?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  xpReward?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  badgeId?: string;

  @ApiProperty({ enum: ChallengeDuration })
  @IsEnum(ChallengeDuration)
  duration: ChallengeDuration;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  maxParticipants?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;
}

export class ChallengeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiProperty({ enum: ChallengeType })
  type: ChallengeType;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  conditions: Record<string, unknown>;

  @ApiProperty()
  coinReward: number;

  @ApiProperty()
  xpReward: number;

  @ApiPropertyOptional()
  badgeId?: string;

  @ApiProperty({ enum: ChallengeDuration })
  duration: ChallengeDuration;

  @ApiPropertyOptional()
  startsAt?: Date;

  @ApiPropertyOptional()
  endsAt?: Date;

  @ApiPropertyOptional()
  maxParticipants?: number;

  @ApiProperty()
  participantCount: number;
}

export class UserChallengeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  challenge: ChallengeResponseDto;

  @ApiProperty({ enum: UserChallengeStatus })
  status: UserChallengeStatus;

  @ApiProperty()
  progress: number;

  @ApiProperty()
  target: number;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progressPercent: number;

  @ApiProperty()
  joinedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ description: 'Time remaining in seconds' })
  timeRemaining: number;
}

export class JoinChallengeDto {
  @ApiProperty()
  @IsString()
  challengeId: string;
}
