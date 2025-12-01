import { Throttle } from '@nestjs/throttler';

/**
 * Rate limiting configurations for different endpoint types
 */
export const RateLimits = {
  /**
   * Login endpoint - 5 requests per minute
   * @security Prevents brute-force attacks
   */
  LOGIN: Throttle({ default: { limit: 5, ttl: 60000 } }),

  /**
   * Registration endpoint - 3 requests per minute
   * @security Prevents mass account creation
   */
  REGISTER: Throttle({ default: { limit: 3, ttl: 60000 } }),

  /**
   * Password reset - 3 requests per 15 minutes
   * @security Prevents enumeration and spam
   */
  PASSWORD_RESET: Throttle({ default: { limit: 3, ttl: 900000 } }),

  /**
   * Checkout/Payment - 10 requests per hour
   * @security Prevents payment fraud attempts
   */
  CHECKOUT: Throttle({ default: { limit: 10, ttl: 3600000 } }),

  /**
   * Content upload - 20 requests per hour
   */
  UPLOAD: Throttle({ default: { limit: 20, ttl: 3600000 } }),

  /**
   * Search endpoint - 30 requests per minute
   */
  SEARCH: Throttle({ default: { limit: 30, ttl: 60000 } }),

  /**
   * Live streaming actions - 60 requests per minute
   */
  LIVE_ACTION: Throttle({ default: { limit: 60, ttl: 60000 } }),

  /**
   * Default API - 100 requests per minute
   */
  DEFAULT: Throttle({ default: { limit: 100, ttl: 60000 } }),

  /**
   * Strict rate limit - 10 requests per minute
   * For sensitive operations
   */
  STRICT: Throttle({ default: { limit: 10, ttl: 60000 } }),

  /**
   * Relaxed rate limit - 200 requests per minute
   * For read-heavy endpoints
   */
  RELAXED: Throttle({ default: { limit: 200, ttl: 60000 } }),
} as const;

/**
 * Skip rate limiting for specific routes
 * Use with caution - only for health checks and internal endpoints
 */
export { SkipThrottle } from '@nestjs/throttler';
