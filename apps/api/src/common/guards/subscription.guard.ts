import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionLevel, SUBSCRIPTION_KEY } from '../decorators/roles.decorator';

/**
 * Subscription level hierarchy (higher index = higher tier)
 */
const SUBSCRIPTION_HIERARCHY: SubscriptionLevel[] = [
  SubscriptionLevel.FREE,
  SubscriptionLevel.VIP,
  SubscriptionLevel.SVIP,
];

/**
 * Guard that checks if user has required subscription level
 * @description Must be used after JwtAuthGuard to ensure user is authenticated
 * @example
 * @UseGuards(JwtAuthGuard, SubscriptionGuard)
 * @RequireSubscription(SubscriptionLevel.VIP)
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredLevels = this.reflector.getAllAndOverride<SubscriptionLevel[]>(
      SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no subscription levels are specified, allow access
    if (!requiredLevels || requiredLevels.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userSubscription = user.subscription || SubscriptionLevel.FREE;
    const userLevel = SUBSCRIPTION_HIERARCHY.indexOf(userSubscription as SubscriptionLevel);

    // Check if user meets any of the required subscription levels
    const meetsRequirement = requiredLevels.some((required) => {
      const requiredLevel = SUBSCRIPTION_HIERARCHY.indexOf(required);
      return userLevel >= requiredLevel;
    });

    if (!meetsRequirement) {
      const lowestRequired = requiredLevels.reduce((lowest, current) => {
        const lowestIdx = SUBSCRIPTION_HIERARCHY.indexOf(lowest);
        const currentIdx = SUBSCRIPTION_HIERARCHY.indexOf(current);
        return currentIdx < lowestIdx ? current : lowest;
      });

      throw new ForbiddenException(
        `${lowestRequired} subscription or higher is required to access this resource`,
      );
    }

    return true;
  }
}
