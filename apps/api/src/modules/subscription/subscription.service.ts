import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';
import { SubscriptionTier, PlanType } from '@audionest/database';

type SubscriptionTierKey = 'VIP' | 'SVIP';
type PlanTypeKey = 'MONTHLY' | 'YEARLY';

const SUBSCRIPTION_PRICES: Record<SubscriptionTierKey, Record<PlanTypeKey, number>> = {
  VIP: {
    MONTHLY: 7900,
    YEARLY: 79000,
  },
  SVIP: {
    MONTHLY: 14900,
    YEARLY: 149000,
  },
};

interface CoinPackage {
  id: string;
  price: number;
  coins: number;
}

const COIN_PACKAGES: CoinPackage[] = [
  { id: 'small', price: 3000, coins: 30 },
  { id: 'medium', price: 10000, coins: 110 },
  { id: 'large', price: 30000, coins: 360 },
  { id: 'jumbo', price: 50000, coins: 650 },
];

@Injectable()
export class SubscriptionService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    }
  }

  async getCurrentSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: true,
        subscriptionExpiresAt: true,
        coins: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      tier: user.subscription,
      expiresAt: user.subscriptionExpiresAt,
      coins: user.coins,
      subscription: activeSubscription,
    };
  }

  async createCheckoutSession(
    userId: string,
    tier: SubscriptionTierKey,
    planType: PlanType,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const planTypeKey = planType as PlanTypeKey;
    const price = SUBSCRIPTION_PRICES[tier][planTypeKey];

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'krw',
            product_data: {
              name: `AudioNest ${tier} - ${planType === 'MONTHLY' ? '월간' : '연간'}`,
              description: `AudioNest ${tier} 멤버십`,
            },
            unit_amount: price,
            recurring: {
              interval: planType === 'MONTHLY' ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        tier,
        planType,
      },
      success_url: `${this.configService.get('WEB_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('WEB_URL')}/subscription`,
    });

    return { checkoutUrl: session.url };
  }

  async handleStripeWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.activateSubscription(session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.updateSubscriptionStatus(subscription);
        break;
      }
    }
  }

  private async activateSubscription(session: Stripe.Checkout.Session) {
    const metadata = session.metadata;
    if (!metadata?.userId || !metadata?.tier || !metadata?.planType) {
      throw new BadRequestException('Invalid session metadata');
    }

    const { userId, tier, planType } = metadata;
    const tierKey = tier as SubscriptionTierKey;
    const planTypeKey = planType as PlanTypeKey;

    const expiresAt = new Date();
    if (planType === 'MONTHLY') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Create subscription record
    await this.prisma.subscription.create({
      data: {
        userId,
        tier: tier as SubscriptionTier,
        status: 'ACTIVE',
        platform: 'STRIPE',
        planType: planType as PlanType,
        amount: SUBSCRIPTION_PRICES[tierKey][planTypeKey],
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiresAt,
        externalSubscriptionId: session.subscription as string,
        externalCustomerId: session.customer as string,
      },
    });

    // Update user
    const monthlyCoins = tier === 'VIP' ? 50 : 200;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscription: tier as SubscriptionTier,
        subscriptionExpiresAt: expiresAt,
        subscriptionPlatform: 'web',
        coins: { increment: monthlyCoins },
      },
    });

    // Create coin transaction
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user) {
      throw new NotFoundException('User not found after subscription activation');
    }

    await this.prisma.coinTransaction.create({
      data: {
        userId,
        type: 'SUBSCRIPTION_BONUS',
        amount: monthlyCoins,
        balance: user.coins,
        description: `${tier} 구독 보너스`,
      },
    });
  }

  private async updateSubscriptionStatus(subscription: Stripe.Subscription) {
    const dbSubscription = await this.prisma.subscription.findFirst({
      where: { externalSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    const status = subscription.status === 'active' ? 'ACTIVE' : 'CANCELED';

    await this.prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
    });

    if (status === 'CANCELED') {
      await this.prisma.user.update({
        where: { id: dbSubscription.userId },
        data: {
          subscription: 'FREE',
          subscriptionExpiresAt: null,
        },
      });
    }
  }

  // Coins
  async purchaseCoins(userId: string, packageId: string) {
    const pkg = COIN_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      throw new BadRequestException('Invalid package');
    }

    // Create purchase record
    await this.prisma.purchase.create({
      data: {
        userId,
        itemType: 'COIN_PACKAGE',
        itemId: packageId,
        amount: pkg.price,
        coinAmount: pkg.coins,
      },
    });

    // Add coins
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: pkg.coins } },
      select: { coins: true },
    });

    // Create transaction
    await this.prisma.coinTransaction.create({
      data: {
        userId,
        type: 'PURCHASE',
        amount: pkg.coins,
        balance: user.coins,
        description: `코인 ${pkg.coins}개 구매`,
      },
    });

    return { coins: user.coins };
  }

  async getCoins(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { coins: user.coins };
  }

  async getCoinTransactions(userId: string, page = 1, limit = 20) {
    const [transactions, total] = await Promise.all([
      this.prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.coinTransaction.count({ where: { userId } }),
    ]);

    return {
      data: transactions,
      meta: { page, limit, total, hasMore: page * limit < total },
    };
  }
}
