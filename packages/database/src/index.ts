import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export * from '@prisma/client';

// Re-export types
export type {
  User,
  Account,
  Session,
  Subscription,
  CoinTransaction,
  Purchase,
  Album,
  Episode,
  Creator,
  CreatorFollow,
  CreatorRevenue,
  ListeningHistory,
  LibrarySubscription,
  LibraryLike,
  Playlist,
  PlaylistEpisode,
  Download,
  LiveRoom,
  LiveGift,
  LiveGiftTransaction,
  Comment,
  Review,
  Achievement,
  UserAchievement,
  Notification,
  SearchHistory,
  PlaybackSync,
} from '@prisma/client';
