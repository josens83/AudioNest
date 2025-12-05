import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export enum CreditTransactionType {
  PURCHASE = 'PURCHASE',
  SUBSCRIPTION_BONUS = 'SUBSCRIPTION_BONUS',
  CONTENT_PURCHASE = 'CONTENT_PURCHASE',
  REFUND = 'REFUND',
  GIFT = 'GIFT',
  PROMOTION = 'PROMOTION',
  EXPIRED = 'EXPIRED',
}

export class CreateCreditPackageDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Number of credits' })
  @IsInt()
  @Min(1)
  credits: number;

  @ApiProperty({ description: 'Price in KRW' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ default: 'KRW' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Bonus credits', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  bonusCredits?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isBestValue?: boolean;
}

export class CreditPackageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  credits: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  bonusCredits: number;

  @ApiProperty({ description: 'Total credits including bonus' })
  totalCredits: number;

  @ApiProperty({ description: 'Price per credit' })
  pricePerCredit: number;

  @ApiProperty()
  isPopular: boolean;

  @ApiProperty()
  isBestValue: boolean;
}

export class UserCreditResponseDto {
  @ApiProperty()
  balance: number;

  @ApiProperty()
  bonusBalance: number;

  @ApiProperty({ description: 'Total available balance' })
  totalBalance: number;

  @ApiProperty()
  totalPurchased: number;

  @ApiProperty()
  totalSpent: number;
}

export class CreditTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CreditTransactionType })
  type: CreditTransactionType;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  isBonus: boolean;

  @ApiPropertyOptional()
  referenceType?: string;

  @ApiPropertyOptional()
  referenceId?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdAt: Date;
}

export class PurchaseCreditsDto {
  @ApiProperty()
  @IsString()
  packageId: string;

  @ApiPropertyOptional({ description: 'External payment reference' })
  @IsString()
  @IsOptional()
  paymentReference?: string;
}

export class SpendCreditsDto {
  @ApiProperty({ description: 'Credits to spend' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Type of purchase (album, episode)' })
  @IsString()
  referenceType: string;

  @ApiProperty({ description: 'ID of the purchased item' })
  @IsString()
  referenceId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class GiftCreditsDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  recipientId: string;

  @ApiProperty({ description: 'Credits to gift' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;
}

export class CreditPurchaseResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  creditsAdded: number;

  @ApiProperty()
  bonusCreditsAdded: number;

  @ApiProperty()
  newBalance: number;

  @ApiProperty()
  transactionId: string;
}

export class CreditSpendResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  creditsSpent: number;

  @ApiProperty()
  newBalance: number;

  @ApiProperty()
  transactionId: string;
}
