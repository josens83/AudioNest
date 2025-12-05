import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import {
  CreateCreditPackageDto,
  CreditPackageResponseDto,
  UserCreditResponseDto,
  CreditTransactionResponseDto,
  PurchaseCreditsDto,
  SpendCreditsDto,
  GiftCreditsDto,
  CreditPurchaseResultDto,
  CreditSpendResultDto,
} from './dto/credit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, Roles, RolesGuard, Role } from '../../common';

@ApiTags('Credits')
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('packages')
  @ApiOperation({ summary: 'Get available credit packages' })
  @ApiResponse({
    status: 200,
    description: 'List of credit packages',
    type: [CreditPackageResponseDto],
  })
  async getCreditPackages(): Promise<CreditPackageResponseDto[]> {
    return this.creditsService.getCreditPackages();
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user credit balance' })
  @ApiResponse({
    status: 200,
    description: 'User credit balance',
    type: UserCreditResponseDto,
  })
  async getMyCredits(
    @CurrentUser('sub') userId: string,
  ): Promise<UserCreditResponseDto> {
    return this.creditsService.getUserCredits(userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credit transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Transaction history',
    type: [CreditTransactionResponseDto],
  })
  async getTransactionHistory(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<CreditTransactionResponseDto[]> {
    return this.creditsService.getTransactionHistory(
      userId,
      limit ?? 50,
      offset ?? 0,
    );
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase a credit package' })
  @ApiResponse({
    status: 200,
    description: 'Credits purchased successfully',
    type: CreditPurchaseResultDto,
  })
  async purchaseCredits(
    @CurrentUser('sub') userId: string,
    @Body() dto: PurchaseCreditsDto,
  ): Promise<CreditPurchaseResultDto> {
    return this.creditsService.purchaseCredits(
      userId,
      dto.packageId,
      dto.paymentReference,
    );
  }

  @Post('spend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Spend credits on content' })
  @ApiResponse({
    status: 200,
    description: 'Credits spent successfully',
    type: CreditSpendResultDto,
  })
  async spendCredits(
    @CurrentUser('sub') userId: string,
    @Body() dto: SpendCreditsDto,
  ): Promise<CreditSpendResultDto> {
    return this.creditsService.spendCredits(
      userId,
      dto.amount,
      dto.referenceType,
      dto.referenceId,
      dto.description,
    );
  }

  @Post('gift')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gift credits to another user' })
  @ApiResponse({
    status: 200,
    description: 'Credits gifted successfully',
    type: CreditSpendResultDto,
  })
  async giftCredits(
    @CurrentUser('sub') userId: string,
    @Body() dto: GiftCreditsDto,
  ): Promise<CreditSpendResultDto> {
    return this.creditsService.giftCredits(
      userId,
      dto.recipientId,
      dto.amount,
      dto.message,
    );
  }

  @Post('packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a credit package (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Credit package created',
    type: CreditPackageResponseDto,
  })
  async createCreditPackage(
    @Body() dto: CreateCreditPackageDto,
  ): Promise<CreditPackageResponseDto> {
    return this.creditsService.createCreditPackage(dto);
  }

  @Post('packages/initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize default credit packages (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Default packages initialized',
  })
  async initializePackages(): Promise<{ message: string }> {
    await this.creditsService.initializeDefaultPackages();
    return { message: 'Default credit packages initialized' };
  }
}
