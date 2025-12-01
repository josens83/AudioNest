import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  if (count >= 100000000) {
    return `${(count / 100000000).toFixed(1)}억`;
  }
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
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateAvatarUrl(name: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

export function getAccessTypeLabel(accessType: string): string {
  switch (accessType) {
    case 'FREE':
      return '무료';
    case 'FREEMIUM':
      return '일부 무료';
    case 'VIP':
      return 'VIP';
    case 'PAID':
      return '유료';
    default:
      return accessType;
  }
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    AUDIOBOOK_FICTION: '#3B82F6',
    AUDIOBOOK_NONFICTION: '#10B981',
    AUDIOBOOK_SELFHELP: '#F59E0B',
    AUDIOBOOK_BUSINESS: '#8B5CF6',
    PODCAST_TALK: '#EC4899',
    PODCAST_COMEDY: '#F97316',
    PODCAST_NEWS: '#06B6D4',
    PODCAST_TRUE_CRIME: '#EF4444',
    COURSE_LANGUAGE: '#14B8A6',
    COURSE_SKILL: '#A855F7',
    KIDS: '#22C55E',
    ASMR: '#6366F1',
    SLEEP: '#8B5CF6',
    MUSIC: '#D946EF',
  };
  return colors[category] || '#6B7280';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
