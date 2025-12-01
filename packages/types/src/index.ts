// AudioNest - Shared Types
// Premium Audio Content Platform

// ============================================
// Subscription Tiers
// ============================================

export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    monthlyFreeEpisodes: 5,
    adFree: false,
    offlineDownload: false,
    maxDownloads: 0,
    exclusiveContent: false,
    earlyAccess: false,
    highQualityAudio: false,
    familySharing: 0,
    monthlyCoins: 0,
    price: 0,
  },
  VIP: {
    name: 'VIP',
    monthlyFreeEpisodes: Infinity,
    adFree: true,
    offlineDownload: true,
    maxDownloads: 50,
    exclusiveContent: false,
    earlyAccess: false,
    highQualityAudio: true,
    familySharing: 0,
    monthlyCoins: 50,
    price: 7900,
    yearlyPrice: 79000,
  },
  SVIP: {
    name: 'SVIP',
    monthlyFreeEpisodes: Infinity,
    adFree: true,
    offlineDownload: true,
    maxDownloads: Infinity,
    exclusiveContent: true,
    earlyAccess: true,
    highQualityAudio: true,
    familySharing: 5,
    monthlyCoins: 200,
    prioritySupport: true,
    price: 14900,
    yearlyPrice: 149000,
  },
} as const;

export type SubscriptionTierType = keyof typeof SUBSCRIPTION_TIERS;

// ============================================
// Coin Packages
// ============================================

export const COIN_PACKAGES = [
  { id: 'small', name: '스몰', price: 3000, coins: 30, bonus: 0 },
  { id: 'medium', name: '미디엄', price: 10000, coins: 110, bonus: 10 },
  { id: 'large', name: '라지', price: 30000, coins: 360, bonus: 60 },
  { id: 'jumbo', name: '점보', price: 50000, coins: 650, bonus: 150 },
] as const;

export type CoinPackageId = (typeof COIN_PACKAGES)[number]['id'];

// ============================================
// Live Gifts
// ============================================

export const LIVE_GIFTS = [
  { id: 'heart', name: '하트', icon: '❤️', coinCost: 1, hostReceives: 0 },
  { id: 'coffee', name: '커피', icon: '☕', coinCost: 10, hostReceives: 5 },
  { id: 'mic', name: '마이크', icon: '🎤', coinCost: 50, hostReceives: 25 },
  { id: 'headphone', name: '헤드폰', icon: '🎧', coinCost: 100, hostReceives: 50 },
  { id: 'star', name: '별', icon: '⭐', coinCost: 500, hostReceives: 250 },
  { id: 'rocket', name: '로켓', icon: '🚀', coinCost: 1000, hostReceives: 500 },
  { id: 'crown', name: '왕관', icon: '👑', coinCost: 5000, hostReceives: 2500 },
] as const;

export type LiveGiftId = (typeof LIVE_GIFTS)[number]['id'];

// ============================================
// Categories
// ============================================

export const CATEGORIES = {
  AUDIOBOOK_FICTION: { name: '소설', icon: '📖', color: '#3B82F6' },
  AUDIOBOOK_NONFICTION: { name: '비소설', icon: '📚', color: '#10B981' },
  AUDIOBOOK_SELFHELP: { name: '자기계발', icon: '🚀', color: '#F59E0B' },
  AUDIOBOOK_BUSINESS: { name: '경영/경제', icon: '💼', color: '#8B5CF6' },
  PODCAST_TALK: { name: '토크', icon: '🎙️', color: '#EC4899' },
  PODCAST_COMEDY: { name: '코미디', icon: '😂', color: '#F97316' },
  PODCAST_NEWS: { name: '뉴스', icon: '📰', color: '#06B6D4' },
  PODCAST_TRUE_CRIME: { name: '범죄 실화', icon: '🔍', color: '#EF4444' },
  COURSE_LANGUAGE: { name: '어학', icon: '🌍', color: '#14B8A6' },
  COURSE_SKILL: { name: '스킬', icon: '💡', color: '#A855F7' },
  KIDS: { name: '어린이', icon: '🧒', color: '#22C55E' },
  ASMR: { name: 'ASMR', icon: '🎧', color: '#6366F1' },
  SLEEP: { name: '수면/명상', icon: '😴', color: '#8B5CF6' },
  MUSIC: { name: '음악', icon: '🎵', color: '#D946EF' },
} as const;

export type CategoryType = keyof typeof CATEGORIES;

// ============================================
// Achievements
// ============================================

export const ACHIEVEMENTS = [
  { id: 'first_listen', name: '첫 발걸음', desc: '첫 에피소드 청취', coins: 10, icon: '🎧' },
  { id: 'hour_1', name: '1시간 청취', desc: '누적 1시간', coins: 20, icon: '⏱️' },
  { id: 'hour_10', name: '10시간 청취', desc: '누적 10시간', coins: 50, icon: '🌟' },
  { id: 'hour_100', name: '100시간 청취', desc: '누적 100시간', coins: 200, icon: '🏆' },
  { id: 'book_1', name: '첫 완독', desc: '오디오북 1권 완료', coins: 50, icon: '📚' },
  { id: 'book_10', name: '독서왕', desc: '오디오북 10권 완료', coins: 200, icon: '📖' },
  { id: 'early_bird', name: '얼리버드', desc: '오전 6시 전 청취', coins: 20, icon: '🌅' },
  { id: 'night_owl', name: '올빼미', desc: '자정 이후 청취', coins: 20, icon: '🦉' },
  { id: 'streak_7', name: '1주 연속', desc: '7일 연속 청취', coins: 50, icon: '🔥' },
  { id: 'streak_30', name: '1달 연속', desc: '30일 연속 청취', coins: 200, icon: '💎' },
  { id: 'genre_explorer', name: '장르 탐험가', desc: '5개 장르 청취', coins: 50, icon: '🗺️' },
  { id: 'supporter', name: '서포터', desc: '첫 라이브 선물', coins: 30, icon: '🎁' },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

// ============================================
// Streak Rewards
// ============================================

export const STREAK_REWARDS = [
  { days: 3, coins: 5 },
  { days: 7, coins: 15, badge: '1주 청취' },
  { days: 14, coins: 30 },
  { days: 30, coins: 100, badge: '1달 청취', vipDays: 3 },
  { days: 60, coins: 200, badge: '2달 청취' },
  { days: 100, coins: 500, badge: '100일 청취', vipDays: 7 },
  { days: 365, coins: 2000, badge: '1년 청취', vipDays: 30 },
] as const;

// ============================================
// Playback Types
// ============================================

export interface PlaybackState {
  currentEpisodeId: string | null;
  currentAlbumId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  playbackRate: number;
  volume: number;
  queue: QueueItem[];
  queueIndex: number;
  repeatMode: 'none' | 'one' | 'all';
  shuffleEnabled: boolean;
  sleepTimerEndAt?: Date;
  sleepTimerType?: 'time' | 'episodes';
  sleepEpisodesRemaining?: number;
}

export interface QueueItem {
  episodeId: string;
  albumId: string;
  title: string;
  albumTitle: string;
  coverUrl: string;
  duration: number;
}

export const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0] as const;

export const SLEEP_TIMER_OPTIONS = [
  { label: '15분', value: 15 },
  { label: '30분', value: 30 },
  { label: '45분', value: 45 },
  { label: '60분', value: 60 },
  { label: '90분', value: 90 },
  { label: '2시간', value: 120 },
  { label: '에피소드 끝나면', value: -1 },
] as const;

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Utility Types
// ============================================

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatPlayCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}만`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}천`;
  }
  return count.toString();
}

export function formatPrice(price: number, currency = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
  }).format(price);
}
