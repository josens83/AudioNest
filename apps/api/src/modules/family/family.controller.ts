import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FamilyService } from './family.service';
import {
  FamilyPlanResponseDto,
  FamilyMemberResponseDto,
  InviteFamilyMemberDto,
  CreateGiftSubscriptionDto,
  GiftSubscriptionResponseDto,
  RedeemGiftDto,
  GiftPricingDto,
  SubscriptionTier,
} from './dto/family.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, RequireSubscription, SubscriptionLevel, SubscriptionGuard } from '../../common';

@ApiTags('Family & Gifts')
@Controller()
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  // ============================================
  // Family Plan Endpoints
  // ============================================

  @Get('family')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current family plan' })
  @ApiResponse({ status: 200, type: FamilyPlanResponseDto })
  async getFamilyPlan(
    @CurrentUser('sub') userId: string,
  ): Promise<FamilyPlanResponseDto | null> {
    return this.familyService.getFamilyPlan(userId);
  }

  @Post('family')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireSubscription(SubscriptionLevel.SVIP)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a family plan (SVIP only)' })
  @ApiResponse({ status: 201, type: FamilyPlanResponseDto })
  async createFamilyPlan(
    @CurrentUser('sub') userId: string,
  ): Promise<FamilyPlanResponseDto> {
    return this.familyService.createFamilyPlan(userId);
  }

  @Post('family/invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invite a family member' })
  @ApiResponse({ status: 200, type: FamilyMemberResponseDto })
  async inviteFamilyMember(
    @CurrentUser('sub') ownerId: string,
    @Body() dto: InviteFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    return this.familyService.inviteFamilyMember(ownerId, dto.email);
  }

  @Post('family/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept family plan invitation' })
  async acceptInvitation(
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    return this.familyService.acceptFamilyInvitation(userId);
  }

  @Post('family/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline family plan invitation' })
  async declineInvitation(
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    return this.familyService.declineFamilyInvitation(userId);
  }

  @Delete('family/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a family member (owner only)' })
  async removeMember(
    @CurrentUser('sub') ownerId: string,
    @Param('memberId') memberId: string,
  ): Promise<{ success: boolean }> {
    return this.familyService.removeFamilyMember(ownerId, memberId);
  }

  @Delete('family/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave the family plan' })
  async leaveFamilyPlan(
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    return this.familyService.leaveFamilyPlan(userId);
  }

  // ============================================
  // Gift Subscription Endpoints
  // ============================================

  @Get('gifts/pricing')
  @ApiOperation({ summary: 'Get gift subscription pricing' })
  @ApiResponse({ status: 200, type: [GiftPricingDto] })
  async getGiftPricing(): Promise<GiftPricingDto[]> {
    return this.familyService.getGiftPricing();
  }

  @Post('gifts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Purchase a gift subscription' })
  @ApiResponse({ status: 201, type: GiftSubscriptionResponseDto })
  async createGiftSubscription(
    @CurrentUser('sub') senderId: string,
    @Body() dto: CreateGiftSubscriptionDto,
  ): Promise<GiftSubscriptionResponseDto> {
    return this.familyService.createGiftSubscription(senderId, dto);
  }

  @Post('gifts/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem a gift subscription' })
  async redeemGift(
    @CurrentUser('sub') userId: string,
    @Body() dto: RedeemGiftDto,
  ): Promise<{ success: boolean; tier: SubscriptionTier; duration: number }> {
    return this.familyService.redeemGiftSubscription(userId, dto.code);
  }

  @Get('gifts/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my sent and received gifts' })
  async getMyGifts(
    @CurrentUser('sub') userId: string,
  ): Promise<{
    sent: GiftSubscriptionResponseDto[];
    received: GiftSubscriptionResponseDto[];
  }> {
    return this.familyService.getMyGifts(userId);
  }
}
