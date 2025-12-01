import { SetMetadata } from '@nestjs/common';

/**
 * User roles for RBAC
 */
export enum Role {
  USER = 'USER',
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN',
}

/**
 * Subscription-based access levels
 */
export enum SubscriptionLevel {
  FREE = 'FREE',
  VIP = 'VIP',
  SVIP = 'SVIP',
}

export const ROLES_KEY = 'roles';
export const SUBSCRIPTION_KEY = 'subscription';

/**
 * Decorator to restrict endpoint access to specific roles
 * @param roles - Array of allowed roles
 * @example
 * @Roles(Role.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async adminOnlyEndpoint() {}
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to restrict endpoint access to specific subscription levels
 * @param levels - Array of allowed subscription levels (or higher)
 * @example
 * @RequireSubscription(SubscriptionLevel.VIP)
 * @UseGuards(JwtAuthGuard, SubscriptionGuard)
 * async vipOnlyEndpoint() {}
 */
export const RequireSubscription = (...levels: SubscriptionLevel[]) =>
  SetMetadata(SUBSCRIPTION_KEY, levels);
