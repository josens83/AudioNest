import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsEmail,
  IsOptional,
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

// ============================================
// Family Plan DTOs
// ============================================

export enum FamilyPlanStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum FamilyMemberStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REMOVED = 'REMOVED',
}

export class CreateFamilyPlanDto {
  // Family plan is created automatically when user upgrades to family tier
}

export class InviteFamilyMemberDto {
  @ApiProperty({ description: 'Email of the family member to invite' })
  @IsEmail()
  email: string;
}

export class FamilyPlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  ownerName: string;

  @ApiProperty()
  maxMembers: number;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  availableSlots: number;

  @ApiProperty({ enum: FamilyPlanStatus })
  status: FamilyPlanStatus;

  @ApiProperty()
  members: FamilyMemberResponseDto[];

  @ApiProperty()
  createdAt: Date;
}

export class FamilyMemberResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty({ enum: FamilyMemberStatus })
  status: FamilyMemberStatus;

  @ApiProperty()
  invitedAt: Date;

  @ApiPropertyOptional()
  acceptedAt?: Date;
}

// ============================================
// Gift Subscription DTOs
// ============================================

export enum SubscriptionTier {
  VIP = 'VIP',
  SVIP = 'SVIP',
}

export class CreateGiftSubscriptionDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  recipientEmail: string;

  @ApiProperty({ enum: SubscriptionTier })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @ApiProperty({ description: 'Duration in months', minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  duration: number;

  @ApiPropertyOptional({ description: 'Personal message for the recipient' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  message?: string;

  @ApiProperty({ description: 'Sender name to display' })
  @IsString()
  @MaxLength(100)
  senderName: string;
}

export class GiftSubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  recipientEmail: string;

  @ApiProperty({ enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty()
  duration: number;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty()
  senderName: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  isRedeemed: boolean;

  @ApiPropertyOptional()
  redeemedAt?: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class RedeemGiftDto {
  @ApiProperty({ description: 'Gift redemption code' })
  @IsString()
  code: string;
}

export class GiftPricingDto {
  @ApiProperty({ enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  originalPrice: number;

  @ApiProperty()
  discount: number;
}
