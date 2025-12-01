import { SubscriptionTier, AccessType, Category, PlanType } from '@audionest/database';

/**
 * Test Fixtures for AudioNest API Tests
 */

// User Fixtures
export const userFixtures = {
  validUser: {
    id: 'user-001',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1e', // 'password123'
    subscription: 'FREE' as SubscriptionTier,
    subscriptionExpiresAt: null,
    coins: 0,
    avatarUrl: null,
    totalListenTime: 0,
    totalEpisodesCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastListenDate: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  vipUser: {
    id: 'user-002',
    email: 'vip@example.com',
    username: 'vipuser',
    passwordHash: '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1e',
    subscription: 'VIP' as SubscriptionTier,
    subscriptionExpiresAt: new Date('2025-12-31'),
    coins: 100,
    avatarUrl: null,
    totalListenTime: 3600,
    totalEpisodesCompleted: 5,
    currentStreak: 3,
    longestStreak: 7,
    lastListenDate: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Album Fixtures
export const albumFixtures = {
  freeAlbum: {
    id: 'album-001',
    title: 'Free Album',
    description: 'A free album for everyone',
    coverUrl: 'https://example.com/cover.jpg',
    category: 'AUDIOBOOK' as Category,
    accessType: 'FREE' as AccessType,
    isPublished: true,
    isFeatured: false,
    playCount: 100,
    likeCount: 10,
    subscriberCount: 5,
    creatorId: 'creator-001',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  vipAlbum: {
    id: 'album-002',
    title: 'VIP Album',
    description: 'A VIP-only album',
    coverUrl: 'https://example.com/cover2.jpg',
    category: 'DRAMA' as Category,
    accessType: 'VIP' as AccessType,
    isPublished: true,
    isFeatured: true,
    playCount: 500,
    likeCount: 50,
    subscriberCount: 25,
    creatorId: 'creator-001',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Episode Fixtures
export const episodeFixtures = {
  freeEpisode: {
    id: 'episode-001',
    albumId: 'album-001',
    title: 'Episode 1',
    description: 'First episode',
    number: 1,
    audioUrl: 'https://example.com/audio1.mp3',
    duration: 1800,
    accessType: 'FREE',
    playCount: 50,
    likeCount: 5,
    fileSize: 10000000,
    chapters: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  vipEpisode: {
    id: 'episode-002',
    albumId: 'album-002',
    title: 'VIP Episode 1',
    description: 'VIP only episode',
    number: 1,
    audioUrl: 'https://example.com/audio2.mp3',
    duration: 2400,
    accessType: 'VIP',
    playCount: 200,
    likeCount: 20,
    fileSize: 15000000,
    chapters: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Subscription Fixtures
export const subscriptionFixtures = {
  activeVip: {
    id: 'sub-001',
    userId: 'user-002',
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  canceledVip: {
    id: 'sub-002',
    userId: 'user-003',
    tier: 'VIP' as SubscriptionTier,
    status: 'CANCELED',
    platform: 'STRIPE',
    planType: 'MONTHLY' as PlanType,
    amount: 7900,
    currentPeriodStart: new Date('2024-10-01'),
    currentPeriodEnd: new Date('2024-11-01'),
    externalSubscriptionId: 'sub_stripe_002',
    externalCustomerId: 'cus_stripe_002',
    canceledAt: new Date('2024-10-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Creator Fixtures
export const creatorFixtures = {
  verifiedCreator: {
    id: 'creator-001',
    userId: 'user-creator-001',
    name: 'testcreator',
    displayName: 'Test Creator',
    bio: 'A test creator',
    avatarUrl: 'https://example.com/avatar.jpg',
    isVerified: true,
    followerCount: 1000,
    totalAlbums: 5,
    totalEpisodes: 50,
    totalPlayCount: 10000,
    totalRevenue: 100000,
    pendingRevenue: 5000,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// DTOs for testing
export const registerDtoFixtures = {
  valid: {
    email: 'newuser@example.com',
    username: 'newuser',
    password: 'Password123!',
  },
  duplicateEmail: {
    email: 'test@example.com', // Same as validUser
    username: 'differentuser',
    password: 'Password123!',
  },
  duplicateUsername: {
    email: 'different@example.com',
    username: 'testuser', // Same as validUser
    password: 'Password123!',
  },
};

export const loginDtoFixtures = {
  valid: {
    email: 'test@example.com',
    password: 'password123',
  },
  wrongPassword: {
    email: 'test@example.com',
    password: 'wrongpassword',
  },
  nonexistentEmail: {
    email: 'nonexistent@example.com',
    password: 'password123',
  },
};
