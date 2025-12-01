import { JwtService } from '@nestjs/jwt';
import { SubscriptionTier } from '@audionest/database';

export interface TestUser {
  id: string;
  email: string;
  username: string;
  subscription: SubscriptionTier;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  subscription: SubscriptionTier;
}

/**
 * Create a JWT token for testing
 */
export function createTestToken(
  jwtService: JwtService,
  user: TestUser,
  options?: { expiresIn?: string },
): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    subscription: user.subscription,
  };

  return jwtService.sign(payload, {
    expiresIn: options?.expiresIn ?? '1h',
  });
}

/**
 * Create a mock JwtService for testing
 */
export const createMockJwtService = () => ({
  sign: jest.fn().mockImplementation((payload: JwtPayload) => {
    return `mock-token-${payload.sub}`;
  }),
  verify: jest.fn().mockImplementation((token: string) => {
    const userId = token.replace('mock-token-', '');
    return {
      sub: userId,
      email: `${userId}@test.com`,
      username: `user_${userId}`,
      subscription: 'FREE' as SubscriptionTier,
    };
  }),
  decode: jest.fn(),
});

/**
 * Create test users with different subscription tiers
 */
export const testUsers = {
  freeUser: {
    id: 'user-free-001',
    email: 'free@test.com',
    username: 'freeuser',
    subscription: 'FREE' as SubscriptionTier,
    passwordHash: '$2b$10$test-hash-for-password123',
    coins: 0,
    avatarUrl: null,
  },
  vipUser: {
    id: 'user-vip-001',
    email: 'vip@test.com',
    username: 'vipuser',
    subscription: 'VIP' as SubscriptionTier,
    passwordHash: '$2b$10$test-hash-for-password123',
    coins: 100,
    avatarUrl: null,
  },
  svipUser: {
    id: 'user-svip-001',
    email: 'svip@test.com',
    username: 'svipuser',
    subscription: 'SVIP' as SubscriptionTier,
    passwordHash: '$2b$10$test-hash-for-password123',
    coins: 500,
    avatarUrl: null,
  },
  oauthUser: {
    id: 'user-oauth-001',
    email: 'oauth@test.com',
    username: 'oauthuser',
    subscription: 'FREE' as SubscriptionTier,
    passwordHash: null, // OAuth users don't have password
    coins: 0,
    avatarUrl: 'https://example.com/avatar.jpg',
  },
};

export type TestUserType = keyof typeof testUsers;
