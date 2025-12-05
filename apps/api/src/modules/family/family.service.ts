import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FamilyPlanStatus,
  FamilyMemberStatus,
  FamilyPlanResponseDto,
  FamilyMemberResponseDto,
  SubscriptionTier,
  CreateGiftSubscriptionDto,
  GiftSubscriptionResponseDto,
  GiftPricingDto,
} from './dto/family.dto';
import { AppLoggerService } from '../../common/logger';
import { randomBytes } from 'crypto';

@Injectable()
export class FamilyService {
  private readonly giftPricing: Record<SubscriptionTier, Record<number, number>> = {
    [SubscriptionTier.VIP]: {
      1: 9900,
      3: 26700, // 10% discount
      6: 47500, // 20% discount
      12: 83200, // 30% discount
    },
    [SubscriptionTier.SVIP]: {
      1: 19900,
      3: 53700, // 10% discount
      6: 95500, // 20% discount
      12: 167200, // 30% discount
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('FamilyService');
  }

  // ============================================
  // Family Plan
  // ============================================

  async createFamilyPlan(userId: string): Promise<FamilyPlanResponseDto> {
    // Check if user already has a family plan
    const existing = await this.prisma.familyPlan.findUnique({
      where: { ownerId: userId },
    });

    if (existing) {
      throw new BadRequestException('User already has a family plan');
    }

    const familyPlan = await this.prisma.familyPlan.create({
      data: {
        ownerId: userId,
        maxMembers: 6,
        memberCount: 1,
        status: 'ACTIVE',
      },
      include: {
        owner: { select: { id: true, username: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, email: true } },
          },
        },
      },
    });

    this.logger.log(`Family plan created for user ${userId}`);

    return this.mapFamilyPlanToResponse(familyPlan);
  }

  async getFamilyPlan(userId: string): Promise<FamilyPlanResponseDto | null> {
    // Check if user is owner
    let familyPlan = await this.prisma.familyPlan.findUnique({
      where: { ownerId: userId },
      include: {
        owner: { select: { id: true, username: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, email: true } },
          },
        },
      },
    });

    if (!familyPlan) {
      // Check if user is a member
      const membership = await this.prisma.familyMember.findUnique({
        where: { userId },
        include: {
          familyPlan: {
            include: {
              owner: { select: { id: true, username: true } },
              members: {
                include: {
                  user: { select: { id: true, username: true, avatarUrl: true, email: true } },
                },
              },
            },
          },
        },
      });

      if (membership) {
        familyPlan = membership.familyPlan;
      }
    }

    if (!familyPlan) {
      return null;
    }

    return this.mapFamilyPlanToResponse(familyPlan);
  }

  async inviteFamilyMember(
    ownerId: string,
    memberEmail: string,
  ): Promise<FamilyMemberResponseDto> {
    const familyPlan = await this.prisma.familyPlan.findUnique({
      where: { ownerId },
    });

    if (!familyPlan) {
      throw new NotFoundException('Family plan not found');
    }

    if (familyPlan.status !== 'ACTIVE') {
      throw new BadRequestException('Family plan is not active');
    }

    if (familyPlan.memberCount >= familyPlan.maxMembers) {
      throw new BadRequestException('Family plan is full');
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: memberEmail },
    });

    if (!user) {
      throw new NotFoundException('User not found with this email');
    }

    if (user.id === ownerId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    // Check if already a member
    const existingMembership = await this.prisma.familyMember.findUnique({
      where: { userId: user.id },
    });

    if (existingMembership) {
      throw new BadRequestException('User is already part of a family plan');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const newMember = await tx.familyMember.create({
        data: {
          familyPlanId: familyPlan.id,
          userId: user.id,
          status: 'PENDING',
        },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, email: true } },
        },
      });

      // Send invitation notification
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Family Plan Invitation',
          body: 'You have been invited to join a family plan!',
          data: { familyPlanId: familyPlan.id },
        },
      });

      return newMember;
    });

    this.logger.log(`User ${user.id} invited to family plan ${familyPlan.id}`);

    return {
      id: member.id,
      userId: member.userId,
      username: member.user.username,
      avatarUrl: member.user.avatarUrl ?? undefined,
      email: member.user.email,
      status: member.status as FamilyMemberStatus,
      invitedAt: member.invitedAt,
      acceptedAt: member.acceptedAt ?? undefined,
    };
  }

  async acceptFamilyInvitation(userId: string): Promise<{ success: boolean }> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { userId },
      include: { familyPlan: true },
    });

    if (!membership) {
      throw new NotFoundException('No pending invitation found');
    }

    if (membership.status !== 'PENDING') {
      throw new BadRequestException('Invitation is not pending');
    }

    await this.prisma.$transaction([
      this.prisma.familyMember.update({
        where: { id: membership.id },
        data: {
          status: 'ACTIVE',
          acceptedAt: new Date(),
        },
      }),
      this.prisma.familyPlan.update({
        where: { id: membership.familyPlanId },
        data: { memberCount: { increment: 1 } },
      }),
      // Update user's subscription to family tier
      this.prisma.user.update({
        where: { id: userId },
        data: { subscription: 'SVIP' }, // Family members get SVIP access
      }),
    ]);

    this.logger.log(`User ${userId} accepted family plan invitation`);

    return { success: true };
  }

  async declineFamilyInvitation(userId: string): Promise<{ success: boolean }> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { userId },
    });

    if (!membership || membership.status !== 'PENDING') {
      throw new NotFoundException('No pending invitation found');
    }

    await this.prisma.familyMember.delete({
      where: { id: membership.id },
    });

    return { success: true };
  }

  async removeFamilyMember(
    ownerId: string,
    memberId: string,
  ): Promise<{ success: boolean }> {
    const familyPlan = await this.prisma.familyPlan.findUnique({
      where: { ownerId },
    });

    if (!familyPlan) {
      throw new ForbiddenException('Only the owner can remove members');
    }

    const membership = await this.prisma.familyMember.findFirst({
      where: {
        familyPlanId: familyPlan.id,
        userId: memberId,
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.$transaction([
      this.prisma.familyMember.delete({
        where: { id: membership.id },
      }),
      this.prisma.familyPlan.update({
        where: { id: familyPlan.id },
        data: { memberCount: { decrement: membership.status === 'ACTIVE' ? 1 : 0 } },
      }),
      // Downgrade user's subscription
      this.prisma.user.update({
        where: { id: memberId },
        data: { subscription: 'FREE' },
      }),
    ]);

    this.logger.log(`Member ${memberId} removed from family plan ${familyPlan.id}`);

    return { success: true };
  }

  async leaveFamilyPlan(userId: string): Promise<{ success: boolean }> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { userId },
      include: { familyPlan: true },
    });

    if (!membership) {
      throw new NotFoundException('Not a member of any family plan');
    }

    // Check if user is the owner
    if (membership.familyPlan.ownerId === userId) {
      throw new BadRequestException('Owner cannot leave. Transfer ownership or cancel the plan.');
    }

    await this.prisma.$transaction([
      this.prisma.familyMember.delete({
        where: { id: membership.id },
      }),
      this.prisma.familyPlan.update({
        where: { id: membership.familyPlanId },
        data: { memberCount: { decrement: membership.status === 'ACTIVE' ? 1 : 0 } },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { subscription: 'FREE' },
      }),
    ]);

    return { success: true };
  }

  // ============================================
  // Gift Subscriptions
  // ============================================

  async getGiftPricing(): Promise<GiftPricingDto[]> {
    const pricing: GiftPricingDto[] = [];

    for (const tier of Object.values(SubscriptionTier)) {
      for (const [duration, price] of Object.entries(this.giftPricing[tier])) {
        const months = parseInt(duration);
        const monthlyPrice = tier === SubscriptionTier.VIP ? 9900 : 19900;
        const originalPrice = monthlyPrice * months;
        const discount = Math.round((1 - price / originalPrice) * 100);

        pricing.push({
          tier,
          duration: months,
          price,
          currency: 'KRW',
          originalPrice,
          discount,
        });
      }
    }

    return pricing;
  }

  async createGiftSubscription(
    senderId: string,
    dto: CreateGiftSubscriptionDto,
  ): Promise<GiftSubscriptionResponseDto> {
    const price = this.giftPricing[dto.tier]?.[dto.duration];
    if (!price) {
      throw new BadRequestException('Invalid tier or duration');
    }

    // Generate unique gift code
    const code = this.generateGiftCode();

    // Set expiration (gift codes expire in 1 year)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const gift = await this.prisma.giftSubscription.create({
      data: {
        senderId,
        recipientEmail: dto.recipientEmail,
        tier: dto.tier,
        duration: dto.duration,
        message: dto.message,
        senderName: dto.senderName,
        amount: price,
        currency: 'KRW',
        code,
        expiresAt,
      },
    });

    // Send email notification to recipient (would integrate with email service)
    // For now, just log
    this.logger.log(
      `Gift subscription created: ${code} for ${dto.recipientEmail}`,
    );

    return {
      id: gift.id,
      code: gift.code,
      recipientEmail: gift.recipientEmail,
      tier: gift.tier as SubscriptionTier,
      duration: gift.duration,
      message: gift.message ?? undefined,
      senderName: gift.senderName,
      amount: gift.amount,
      currency: gift.currency,
      isRedeemed: !!gift.redeemedBy,
      redeemedAt: gift.redeemedAt ?? undefined,
      expiresAt: gift.expiresAt,
      createdAt: gift.createdAt,
    };
  }

  async redeemGiftSubscription(
    userId: string,
    code: string,
  ): Promise<{ success: boolean; tier: SubscriptionTier; duration: number }> {
    const gift = await this.prisma.giftSubscription.findUnique({
      where: { code },
    });

    if (!gift) {
      throw new NotFoundException('Gift code not found');
    }

    if (gift.redeemedBy) {
      throw new BadRequestException('Gift code has already been redeemed');
    }

    if (gift.expiresAt < new Date()) {
      throw new BadRequestException('Gift code has expired');
    }

    // Calculate subscription end date
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + gift.duration);

    await this.prisma.$transaction([
      this.prisma.giftSubscription.update({
        where: { id: gift.id },
        data: {
          redeemedBy: userId,
          redeemedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          subscription: gift.tier,
          subscriptionExpiresAt: subscriptionEnd,
        },
      }),
      // Create subscription record
      this.prisma.subscription.create({
        data: {
          userId,
          tier: gift.tier,
          status: 'ACTIVE',
          platform: 'TOSS', // Gift redemption
          planType: gift.duration === 12 ? 'YEARLY' : 'MONTHLY',
          amount: gift.amount,
          currentPeriodStart: new Date(),
          currentPeriodEnd: subscriptionEnd,
          externalSubscriptionId: `gift_${gift.id}`,
        },
      }),
    ]);

    // Notify sender
    await this.prisma.notification.create({
      data: {
        userId: gift.senderId,
        type: 'SYSTEM',
        title: 'Gift Redeemed!',
        body: `Your gift subscription has been redeemed!`,
        data: { giftId: gift.id },
      },
    });

    this.logger.log(`Gift ${code} redeemed by user ${userId}`);

    return {
      success: true,
      tier: gift.tier as SubscriptionTier,
      duration: gift.duration,
    };
  }

  async getMyGifts(userId: string): Promise<{
    sent: GiftSubscriptionResponseDto[];
    received: GiftSubscriptionResponseDto[];
  }> {
    const [sent, received] = await Promise.all([
      this.prisma.giftSubscription.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.giftSubscription.findMany({
        where: { redeemedBy: userId },
        orderBy: { redeemedAt: 'desc' },
      }),
    ]);

    return {
      sent: sent.map((g) => ({
        id: g.id,
        code: g.code,
        recipientEmail: g.recipientEmail,
        tier: g.tier as SubscriptionTier,
        duration: g.duration,
        message: g.message ?? undefined,
        senderName: g.senderName,
        amount: g.amount,
        currency: g.currency,
        isRedeemed: !!g.redeemedBy,
        redeemedAt: g.redeemedAt ?? undefined,
        expiresAt: g.expiresAt,
        createdAt: g.createdAt,
      })),
      received: received.map((g) => ({
        id: g.id,
        code: g.code,
        recipientEmail: g.recipientEmail,
        tier: g.tier as SubscriptionTier,
        duration: g.duration,
        message: g.message ?? undefined,
        senderName: g.senderName,
        amount: g.amount,
        currency: g.currency,
        isRedeemed: true,
        redeemedAt: g.redeemedAt ?? undefined,
        expiresAt: g.expiresAt,
        createdAt: g.createdAt,
      })),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private generateGiftCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars
    const bytes = randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    // Format: XXXX-XXXX
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }

  private mapFamilyPlanToResponse(familyPlan: {
    id: string;
    ownerId: string;
    maxMembers: number;
    memberCount: number;
    status: string;
    createdAt: Date;
    owner: { id: string; username: string };
    members: Array<{
      id: string;
      userId: string;
      status: string;
      invitedAt: Date;
      acceptedAt: Date | null;
      user: { id: string; username: string; avatarUrl: string | null; email: string };
    }>;
  }): FamilyPlanResponseDto {
    return {
      id: familyPlan.id,
      ownerId: familyPlan.ownerId,
      ownerName: familyPlan.owner.username,
      maxMembers: familyPlan.maxMembers,
      memberCount: familyPlan.memberCount,
      availableSlots: familyPlan.maxMembers - familyPlan.memberCount,
      status: familyPlan.status as FamilyPlanStatus,
      members: familyPlan.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        username: m.user.username,
        avatarUrl: m.user.avatarUrl ?? undefined,
        email: m.user.email,
        status: m.status as FamilyMemberStatus,
        invitedAt: m.invitedAt,
        acceptedAt: m.acceptedAt ?? undefined,
      })),
      createdAt: familyPlan.createdAt,
    };
  }
}
