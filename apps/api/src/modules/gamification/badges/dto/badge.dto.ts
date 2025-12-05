import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsObject,
  Min,
} from 'class-validator';

export enum BadgeCategory {
  LISTENING = 'LISTENING',
  COLLECTION = 'COLLECTION',
  SOCIAL = 'SOCIAL',
  ACHIEVEMENT = 'ACHIEVEMENT',
  EVENT = 'EVENT',
  CREATOR = 'CREATOR',
}

export enum BadgeRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export class CreateBadgeDto {
  @ApiProperty({ description: 'Badge name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Badge description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Badge icon URL or identifier' })
  @IsString()
  icon: string;

  @ApiProperty({ enum: BadgeCategory })
  @IsEnum(BadgeCategory)
  category: BadgeCategory;

  @ApiPropertyOptional({ enum: BadgeRarity, default: BadgeRarity.COMMON })
  @IsEnum(BadgeRarity)
  @IsOptional()
  rarity?: BadgeRarity;

  @ApiProperty({
    description: 'Earning condition',
    example: { type: 'listen_time', value: 100 },
  })
  @IsObject()
  condition: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Coin reward', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  coinReward?: number;

  @ApiPropertyOptional({ description: 'XP reward', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  xpReward?: number;

  @ApiPropertyOptional({ description: 'Is badge hidden until earned' })
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;
}

export class BadgeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  icon: string;

  @ApiProperty({ enum: BadgeCategory })
  category: BadgeCategory;

  @ApiProperty({ enum: BadgeRarity })
  rarity: BadgeRarity;

  @ApiProperty()
  coinReward: number;

  @ApiProperty()
  xpReward: number;

  @ApiProperty()
  isHidden: boolean;

  @ApiPropertyOptional({ description: 'Whether the user has earned this badge' })
  earned?: boolean;

  @ApiPropertyOptional({ description: 'When the user earned this badge' })
  earnedAt?: Date;
}

export class UserBadgeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  badge: BadgeResponseDto;

  @ApiProperty()
  earnedAt: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}
