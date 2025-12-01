import { SubscriptionTier } from '@audionest/database';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  subscription: SubscriptionTier;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  sub: string;
  email: string;
  username: string;
  subscription: SubscriptionTier;
}

export interface UserWithAuth {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  subscription: SubscriptionTier;
  coins: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: PaginationMeta;
}
