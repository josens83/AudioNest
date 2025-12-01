import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCheckoutDto, PurchaseCoinsDto } from './dto/subscription.dto';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@ApiTags('subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription' })
  async getCurrentSubscription(@Request() req) {
    return this.subscriptionService.getCurrentSubscription(req.user.sub);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checkout session' })
  async createCheckout(@Request() req, @Body() dto: CreateCheckoutDto) {
    return this.subscriptionService.createCheckoutSession(
      req.user.sub,
      dto.tier,
      dto.planType,
    );
  }

  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    const stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });

    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        webhookSecret,
      );
      await this.subscriptionService.handleStripeWebhook(event);
      return { received: true };
    } catch (err) {
      console.error('Webhook error:', err.message);
      return { error: err.message };
    }
  }

  @Get('coins')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coin balance' })
  async getCoins(@Request() req) {
    return this.subscriptionService.getCoins(req.user.sub);
  }

  @Post('coins/purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase coins' })
  async purchaseCoins(@Request() req, @Body() dto: PurchaseCoinsDto) {
    return this.subscriptionService.purchaseCoins(req.user.sub, dto.packageId);
  }

  @Get('coins/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coin transactions' })
  async getCoinTransactions(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.subscriptionService.getCoinTransactions(req.user.sub, page, limit);
  }
}
