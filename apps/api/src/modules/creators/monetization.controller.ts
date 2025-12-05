import {
  Controller,
  Get,
  Post,
  Put,
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
import { MonetizationService } from './monetization.service';
import {
  CreatorTier,
  CreatorProgramInfoDto,
  CreatorDashboardDto,
  CreatorAnalyticsDto,
  PayoutResponseDto,
  TipResponseDto,
  RevenueReportDto,
  SendTipDto,
  RequestPayoutDto,
  UpdatePaymentInfoDto,
  CreatorApplicationDto,
  GetAnalyticsQueryDto,
} from './dto/monetization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common';

@ApiTags('Creator Monetization')
@Controller('creators/monetization')
export class MonetizationController {
  constructor(private readonly monetizationService: MonetizationService) {}

  @Get('program-info')
  @ApiOperation({ summary: 'Get creator program information' })
  @ApiQuery({ name: 'tier', enum: CreatorTier, required: false })
  @ApiResponse({
    status: 200,
    description: 'Program info for specified tier',
    type: CreatorProgramInfoDto,
  })
  getProgramInfo(
    @Query('tier') tier?: CreatorTier,
  ): CreatorProgramInfoDto {
    return this.monetizationService.getCreatorProgramInfo(tier);
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Get all creator tier information' })
  @ApiResponse({
    status: 200,
    description: 'List of all tier information',
    type: [CreatorProgramInfoDto],
  })
  getAllTiers(): CreatorProgramInfoDto[] {
    return this.monetizationService.getAllTierInfo();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Creator dashboard data',
    type: CreatorDashboardDto,
  })
  async getDashboard(
    @CurrentUser('sub') userId: string,
  ): Promise<CreatorDashboardDto> {
    return this.monetizationService.getCreatorDashboard(userId);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator analytics' })
  @ApiQuery({ name: 'period', required: false, example: '30d' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: 200,
    description: 'Creator analytics data',
    type: CreatorAnalyticsDto,
  })
  async getAnalytics(
    @CurrentUser('sub') userId: string,
    @Query() query: GetAnalyticsQueryDto,
  ): Promise<CreatorAnalyticsDto> {
    return this.monetizationService.getAnalytics(
      userId,
      query.period ?? '30d',
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  @Get('revenue-reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue reports' })
  @ApiResponse({
    status: 200,
    description: 'List of monthly revenue reports',
    type: [RevenueReportDto],
  })
  async getRevenueReports(
    @CurrentUser('sub') userId: string,
  ): Promise<RevenueReportDto[]> {
    return this.monetizationService.getRevenueReports(userId);
  }

  @Post('tip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a tip to a creator' })
  @ApiResponse({
    status: 200,
    description: 'Tip sent successfully',
    type: TipResponseDto,
  })
  async sendTip(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendTipDto,
  ): Promise<TipResponseDto> {
    return this.monetizationService.sendTip(
      userId,
      dto.creatorId,
      dto.amount,
      dto.message,
      dto.contentId,
    );
  }

  @Post('request-payout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a payout' })
  @ApiResponse({
    status: 200,
    description: 'Payout request submitted',
    type: PayoutResponseDto,
  })
  async requestPayout(
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestPayoutDto,
  ): Promise<PayoutResponseDto> {
    return this.monetizationService.requestPayout(
      userId,
      dto.amount,
      dto.notes,
    );
  }

  @Put('payment-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment information' })
  @ApiResponse({
    status: 200,
    description: 'Payment info updated',
  })
  async updatePaymentInfo(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdatePaymentInfoDto,
  ): Promise<{ success: boolean }> {
    return this.monetizationService.updatePaymentInfo(userId, dto);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply for creator program' })
  @ApiResponse({
    status: 201,
    description: 'Application submitted',
  })
  async applyForProgram(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatorApplicationDto,
  ): Promise<{ creatorId: string }> {
    return this.monetizationService.applyForCreatorProgram(userId, dto);
  }
}
