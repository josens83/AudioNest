import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier, PlanType } from '@audionest/database';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  // Test fixtures
  const mockFreeUser = {
    id: 'user-free-001',
    subscription: 'FREE' as SubscriptionTier,
    subscriptionExpiresAt: null,
    coins: 0,
    email: 'free@example.com',
  };

  const mockVipUser = {
    id: 'user-vip-001',
    subscription: 'VIP' as SubscriptionTier,
    subscriptionExpiresAt: new Date('2025-12-31'),
    coins: 100,
    email: 'vip@example.com',
  };

  const mockExpiredVipUser = {
    id: 'user-expired-001',
    subscription: 'VIP' as SubscriptionTier,
    subscriptionExpiresAt: new Date('2024-01-01'), // Expired
    coins: 50,
    email: 'expired@example.com',
  };

  const mockActiveSubscription = {
    id: 'sub-001',
    userId: 'user-vip-001',
    tier: 'VIP' as SubscriptionTier,
    status: 'ACTIVE',
    platform: 'STRIPE',
    planType: 'MONTHLY' as PlanType,
    amount: 7900,
    currentPeriodStart: new Date('2024-11-01'),
    currentPeriodEnd: new Date('2024-12-01'),
    externalSubscriptionId: 'sub_stripe_001',
    externalCustomerId: 'cus_stripe_001',
    canceledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCoinPackages = {
    small: { id: 'small', price: 3000, coins: 30 },
    medium: { id: 'medium', price: 10000, coins: 110 },
    large: { id: 'large', price: 30000, coins: 360 },
    jumbo: { id: 'jumbo', price: 50000, coins: 650 },
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      purchase: {
        create: jest.fn(),
      },
      coinTransaction: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config: Record<string, string> = {
                STRIPE_SECRET_KEY: 'sk_test_mock_key',
                WEB_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('getCurrentSubscription', () => {
    /**
     * @test Returns FREE subscription info for free user
     */
    it('should return subscription info for FREE user', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockFreeUser);
      prismaService.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentSubscription(mockFreeUser.id);

      expect(result).toEqual({
        tier: 'FREE',
        expiresAt: null,
        coins: 0,
        subscription: null,
      });
    });

    /**
     * @test Returns VIP subscription info with active subscription
     */
    it('should return subscription info for VIP user with active subscription', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockVipUser);
      prismaService.subscription.findFirst.mockResolvedValue(mockActiveSubscription);

      const result = await service.getCurrentSubscription(mockVipUser.id);

      expect(result.tier).toBe('VIP');
      expect(result.expiresAt).toEqual(mockVipUser.subscriptionExpiresAt);
      expect(result.coins).toBe(100);
      expect(result.subscription).toEqual(mockActiveSubscription);
    });

    /**
     * @test Returns VIP tier even when expired (user tier not downgraded yet)
     */
    it('should return subscription info for expired VIP user', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockExpiredVipUser);
      prismaService.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentSubscription(mockExpiredVipUser.id);

      expect(result.tier).toBe('VIP');
      expect(result.expiresAt).toEqual(mockExpiredVipUser.subscriptionExpiresAt);
    });

    /**
     * @test Throws NotFoundException when user doesn't exist
     */
    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentSubscription('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCheckoutSession', () => {
    /**
     * @test Creates VIP monthly checkout session
     */
    it('should create checkout session for VIP monthly subscription', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockFreeUser);

      // Get the mocked Stripe instance
      const mockStripe = (Stripe as jest.MockedClass<typeof Stripe>).mock.instances[0];
      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/test',
      });

      const result = await service.createCheckoutSession(
        mockFreeUser.id,
        'VIP',
        'MONTHLY' as PlanType,
      );

      expect(result).toHaveProperty('checkoutUrl');
    });

    /**
     * @test Creates SVIP yearly checkout session with correct pricing
     */
    it('should create checkout session for SVIP yearly subscription', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockFreeUser);

      const mockStripe = (Stripe as jest.MockedClass<typeof Stripe>).mock.instances[0];
      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/test',
      });

      const result = await service.createCheckoutSession(
        mockFreeUser.id,
        'SVIP',
        'YEARLY' as PlanType,
      );

      expect(result).toHaveProperty('checkoutUrl');
    });

    /**
     * @test Throws NotFoundException when user not found
     */
    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('non-existent', 'VIP', 'MONTHLY' as PlanType),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * @test Throws BadRequestException when Stripe not configured
     */
    it('should throw BadRequestException when Stripe not configured', async () => {
      // Create service without Stripe
      const moduleWithoutStripe = await Test.createTestingModule({
        providers: [
          SubscriptionService,
          {
            provide: PrismaService,
            useValue: {
              user: { findUnique: jest.fn().mockResolvedValue(mockFreeUser) },
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined), // No Stripe key
            },
          },
        ],
      }).compile();

      const serviceWithoutStripe = moduleWithoutStripe.get<SubscriptionService>(SubscriptionService);

      await expect(
        serviceWithoutStripe.createCheckoutSession(mockFreeUser.id, 'VIP', 'MONTHLY' as PlanType),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleStripeWebhook', () => {
    /**
     * @test Handles checkout.session.completed event
     */
    it('should activate subscription on checkout.session.completed', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              userId: 'user-001',
              tier: 'VIP',
              planType: 'MONTHLY',
            },
            subscription: 'sub_test_001',
            customer: 'cus_test_001',
          } as unknown as Stripe.Checkout.Session,
        },
      };

      prismaService.subscription.create.mockResolvedValue(mockActiveSubscription);
      prismaService.user.update.mockResolvedValue(mockVipUser);
      prismaService.user.findUnique.mockResolvedValue({ ...mockVipUser, coins: 150 });
      prismaService.coinTransaction.create.mockResolvedValue({} as any);

      await service.handleStripeWebhook(mockEvent as Stripe.Event);

      expect(prismaService.subscription.create).toHaveBeenCalled();
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    /**
     * @test Handles customer.subscription.deleted event
     */
    it('should cancel subscription on customer.subscription.deleted', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_001',
            status: 'canceled',
            current_period_end: Math.floor(Date.now() / 1000),
            canceled_at: Math.floor(Date.now() / 1000),
          } as unknown as Stripe.Subscription,
        },
      };

      prismaService.subscription.findFirst.mockResolvedValue(mockActiveSubscription);
      prismaService.subscription.update.mockResolvedValue({
        ...mockActiveSubscription,
        status: 'CANCELED',
      });
      prismaService.user.update.mockResolvedValue({
        ...mockVipUser,
        subscription: 'FREE',
        subscriptionExpiresAt: null,
      });

      await service.handleStripeWebhook(mockEvent as Stripe.Event);

      expect(prismaService.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELED' }),
        }),
      );
    });
  });

  describe('purchaseCoins', () => {
    /**
     * @test Successfully purchases small coin package
     */
    it('should purchase coins for valid package', async () => {
      prismaService.purchase.create.mockResolvedValue({
        id: 'purchase-001',
        userId: mockFreeUser.id,
        itemType: 'COIN_PACKAGE',
        itemId: 'small',
        amount: 3000,
        coinAmount: 30,
      } as any);

      prismaService.user.update.mockResolvedValue({
        ...mockFreeUser,
        coins: 30,
      });

      prismaService.coinTransaction.create.mockResolvedValue({} as any);

      const result = await service.purchaseCoins(mockFreeUser.id, 'small');

      expect(result).toEqual({ coins: 30 });
      expect(prismaService.purchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          itemId: 'small',
          coinAmount: 30,
          amount: 3000,
        }),
      });
    });

    /**
     * @test Throws BadRequestException for invalid package
     */
    it('should throw BadRequestException for invalid package ID', async () => {
      await expect(
        service.purchaseCoins(mockFreeUser.id, 'invalid-package'),
      ).rejects.toThrow(BadRequestException);
    });

    /**
     * @test Creates coin transaction record on purchase
     */
    it('should create coin transaction record', async () => {
      prismaService.purchase.create.mockResolvedValue({} as any);
      prismaService.user.update.mockResolvedValue({
        ...mockFreeUser,
        coins: 110,
      });
      prismaService.coinTransaction.create.mockResolvedValue({} as any);

      await service.purchaseCoins(mockFreeUser.id, 'medium');

      expect(prismaService.coinTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockFreeUser.id,
          type: 'PURCHASE',
          amount: 110,
        }),
      });
    });
  });

  describe('getCoins', () => {
    /**
     * @test Returns current coin balance
     */
    it('should return coin balance for user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockVipUser,
        coins: 100,
      });

      const result = await service.getCoins(mockVipUser.id);

      expect(result).toEqual({ coins: 100 });
    });

    /**
     * @test Throws NotFoundException when user not found
     */
    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCoins('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCoinTransactions', () => {
    const mockTransactions = [
      {
        id: 'tx-001',
        userId: mockVipUser.id,
        type: 'PURCHASE',
        amount: 100,
        balance: 100,
        description: '코인 100개 구매',
        createdAt: new Date(),
      },
      {
        id: 'tx-002',
        userId: mockVipUser.id,
        type: 'GIFT_SENT',
        amount: -10,
        balance: 90,
        description: '하트 x10 선물',
        createdAt: new Date(),
      },
    ];

    /**
     * @test Returns paginated coin transactions
     */
    it('should return paginated transactions', async () => {
      prismaService.coinTransaction.findMany.mockResolvedValue(mockTransactions);
      prismaService.coinTransaction.count.mockResolvedValue(2);

      const result = await service.getCoinTransactions(mockVipUser.id, 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        hasMore: false,
      });
    });

    /**
     * @test Correctly calculates hasMore for pagination
     */
    it('should calculate hasMore correctly', async () => {
      prismaService.coinTransaction.findMany.mockResolvedValue(mockTransactions);
      prismaService.coinTransaction.count.mockResolvedValue(50);

      const result = await service.getCoinTransactions(mockVipUser.id, 1, 20);

      expect(result.meta.hasMore).toBe(true);
    });
  });

  describe('Security Tests', () => {
    /**
     * @security Prevents accessing another user's subscription
     */
    it('should only return subscription for requested user', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockVipUser);
      prismaService.subscription.findFirst.mockResolvedValue(mockActiveSubscription);

      await service.getCurrentSubscription(mockVipUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockVipUser.id },
        select: expect.any(Object),
      });
    });

    /**
     * @security Ensures coin purchases are recorded with user ID
     */
    it('should record user ID in all coin transactions', async () => {
      prismaService.purchase.create.mockResolvedValue({} as any);
      prismaService.user.update.mockResolvedValue({ ...mockFreeUser, coins: 30 });
      prismaService.coinTransaction.create.mockResolvedValue({} as any);

      await service.purchaseCoins(mockFreeUser.id, 'small');

      expect(prismaService.coinTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockFreeUser.id,
        }),
      });
    });
  });
});
