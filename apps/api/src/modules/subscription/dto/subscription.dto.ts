import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ enum: ['VIP', 'SVIP'] })
  @IsEnum(['VIP', 'SVIP'])
  tier: 'VIP' | 'SVIP';

  @ApiProperty({ enum: ['MONTHLY', 'YEARLY'] })
  @IsEnum(['MONTHLY', 'YEARLY'])
  planType: 'MONTHLY' | 'YEARLY';
}

export class PurchaseCoinsDto {
  @ApiProperty({ example: 'medium' })
  @IsString()
  packageId: string;
}
