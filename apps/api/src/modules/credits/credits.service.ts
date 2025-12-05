import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCreditPackageDto,
  CreditPackageResponseDto,
  UserCreditResponseDto,
  CreditTransactionResponseDto,
  CreditTransactionType,
  CreditPurchaseResultDto,
  CreditSpendResultDto,
} from './dto/credit.dto';
import { AppLoggerService } from '../../common/logger';

@Injectable()
export class CreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('CreditsService');
  }

  async createCreditPackage(
    dto: CreateCreditPackageDto,
  ): Promise<CreditPackageResponseDto> {
    const pkg = await this.prisma.creditPackage.create({
      data: {
        name: dto.name,
        description: dto.description,
        credits: dto.credits,
        price: dto.price,
        currency: dto.currency ?? 'KRW',
        bonusCredits: dto.bonusCredits ?? 0,
        isPopular: dto.isPopular ?? false,
        isBestValue: dto.isBestValue ?? false,
      },
    });

    this.logger.log(`Credit package created: ${pkg.name} (${pkg.id})`);

    return this.mapPackageToResponse(pkg);
  }

  async getCreditPackages(): Promise<CreditPackageResponseDto[]> {
    const packages = await this.prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return packages.map((pkg) => this.mapPackageToResponse(pkg));
  }

  async getUserCredits(userId: string): Promise<UserCreditResponseDto> {
    let userCredit = await this.prisma.userCredit.findUnique({
      where: { userId },
    });

    if (!userCredit) {
      // Initialize user credit
      userCredit = await this.prisma.userCredit.create({
        data: {
          userId,
          balance: 0,
          bonusBalance: 0,
          totalPurchased: 0,
          totalSpent: 0,
        },
      });
    }

    return {
      balance: userCredit.balance,
      bonusBalance: userCredit.bonusBalance,
      totalBalance: userCredit.balance + userCredit.bonusBalance,
      totalPurchased: userCredit.totalPurchased,
      totalSpent: userCredit.totalSpent,
    };
  }

  async purchaseCredits(
    userId: string,
    packageId: string,
    paymentReference?: string,
  ): Promise<CreditPurchaseResultDto> {
    const pkg = await this.prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Credit package not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Get or create user credit
      let userCredit = await tx.userCredit.findUnique({
        where: { userId },
      });

      if (!userCredit) {
        userCredit = await tx.userCredit.create({
          data: {
            userId,
            balance: 0,
            bonusBalance: 0,
            totalPurchased: 0,
            totalSpent: 0,
          },
        });
      }

      // Add credits
      const newBalance = userCredit.balance + pkg.credits;
      const newBonusBalance = userCredit.bonusBalance + pkg.bonusCredits;

      await tx.userCredit.update({
        where: { userId },
        data: {
          balance: newBalance,
          bonusBalance: newBonusBalance,
          totalPurchased: { increment: pkg.credits + pkg.bonusCredits },
        },
      });

      // Create transaction for regular credits
      const mainTransaction = await tx.creditTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount: pkg.credits,
          balance: newBalance,
          isBonus: false,
          referenceType: 'credit_package',
          referenceId: packageId,
          description: `Purchased ${pkg.name}`,
        },
      });

      // Create transaction for bonus credits if any
      if (pkg.bonusCredits > 0) {
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'PURCHASE',
            amount: pkg.bonusCredits,
            balance: newBonusBalance,
            isBonus: true,
            referenceType: 'credit_package',
            referenceId: packageId,
            description: `Bonus credits from ${pkg.name}`,
          },
        });
      }

      return {
        success: true,
        creditsAdded: pkg.credits,
        bonusCreditsAdded: pkg.bonusCredits,
        newBalance: newBalance + newBonusBalance,
        transactionId: mainTransaction.id,
      };
    });

    this.logger.log(
      `User ${userId} purchased ${pkg.credits} credits (+${pkg.bonusCredits} bonus)`,
    );

    return result;
  }

  async spendCredits(
    userId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string,
  ): Promise<CreditSpendResultDto> {
    const userCredit = await this.prisma.userCredit.findUnique({
      where: { userId },
    });

    if (!userCredit) {
      throw new BadRequestException('No credits available');
    }

    const totalBalance = userCredit.balance + userCredit.bonusBalance;

    if (totalBalance < amount) {
      throw new BadRequestException('Insufficient credits');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct from bonus balance first, then regular balance
      let bonusToDeduct = Math.min(userCredit.bonusBalance, amount);
      let regularToDeduct = amount - bonusToDeduct;

      const newBonusBalance = userCredit.bonusBalance - bonusToDeduct;
      const newBalance = userCredit.balance - regularToDeduct;

      await tx.userCredit.update({
        where: { userId },
        data: {
          balance: newBalance,
          bonusBalance: newBonusBalance,
          totalSpent: { increment: amount },
        },
      });

      // Create transaction(s)
      let lastTransaction;

      if (bonusToDeduct > 0) {
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'CONTENT_PURCHASE',
            amount: -bonusToDeduct,
            balance: newBonusBalance,
            isBonus: true,
            referenceType,
            referenceId,
            description: description ?? `Purchase: ${referenceType}`,
          },
        });
      }

      if (regularToDeduct > 0) {
        lastTransaction = await tx.creditTransaction.create({
          data: {
            userId,
            type: 'CONTENT_PURCHASE',
            amount: -regularToDeduct,
            balance: newBalance,
            isBonus: false,
            referenceType,
            referenceId,
            description: description ?? `Purchase: ${referenceType}`,
          },
        });
      } else {
        // If only bonus was used, get the last transaction
        lastTransaction = await tx.creditTransaction.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
      }

      return {
        success: true,
        creditsSpent: amount,
        newBalance: newBalance + newBonusBalance,
        transactionId: lastTransaction?.id ?? '',
      };
    });

    this.logger.log(
      `User ${userId} spent ${amount} credits on ${referenceType}:${referenceId}`,
    );

    return result;
  }

  async giftCredits(
    senderId: string,
    recipientId: string,
    amount: number,
    message?: string,
  ): Promise<CreditSpendResultDto> {
    if (senderId === recipientId) {
      throw new BadRequestException('Cannot gift credits to yourself');
    }

    const senderCredit = await this.prisma.userCredit.findUnique({
      where: { userId: senderId },
    });

    if (!senderCredit || senderCredit.balance < amount) {
      throw new BadRequestException('Insufficient credits');
    }

    // Verify recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct from sender (regular balance only for gifts)
      const newSenderBalance = senderCredit.balance - amount;

      await tx.userCredit.update({
        where: { userId: senderId },
        data: {
          balance: newSenderBalance,
          totalSpent: { increment: amount },
        },
      });

      // Add to recipient
      let recipientCredit = await tx.userCredit.findUnique({
        where: { userId: recipientId },
      });

      if (!recipientCredit) {
        recipientCredit = await tx.userCredit.create({
          data: {
            userId: recipientId,
            balance: amount,
            bonusBalance: 0,
            totalPurchased: amount,
            totalSpent: 0,
          },
        });
      } else {
        await tx.userCredit.update({
          where: { userId: recipientId },
          data: {
            balance: { increment: amount },
            totalPurchased: { increment: amount },
          },
        });
      }

      // Create sender transaction
      await tx.creditTransaction.create({
        data: {
          userId: senderId,
          type: 'GIFT',
          amount: -amount,
          balance: newSenderBalance,
          isBonus: false,
          referenceType: 'gift',
          referenceId: recipientId,
          description: message ?? `Gift to ${recipient.username}`,
        },
      });

      // Create recipient transaction
      const recipientTransaction = await tx.creditTransaction.create({
        data: {
          userId: recipientId,
          type: 'GIFT',
          amount: amount,
          balance: recipientCredit.balance + amount,
          isBonus: false,
          referenceType: 'gift',
          referenceId: senderId,
          description: message ?? `Gift from ${senderId}`,
        },
      });

      // Notify recipient
      await tx.notification.create({
        data: {
          userId: recipientId,
          type: 'GIFT_RECEIVED',
          title: 'Credits Received!',
          body: `You received ${amount} credits as a gift!`,
          data: { senderId, amount, message },
        },
      });

      return {
        success: true,
        creditsSpent: amount,
        newBalance: newSenderBalance + senderCredit.bonusBalance,
        transactionId: recipientTransaction.id,
      };
    });

    this.logger.log(`User ${senderId} gifted ${amount} credits to ${recipientId}`);

    return result;
  }

  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<CreditTransactionResponseDto[]> {
    const transactions = await this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      type: tx.type as CreditTransactionType,
      amount: tx.amount,
      balance: tx.balance,
      isBonus: tx.isBonus,
      referenceType: tx.referenceType ?? undefined,
      referenceId: tx.referenceId ?? undefined,
      description: tx.description ?? undefined,
      createdAt: tx.createdAt,
    }));
  }

  async addPromotionalCredits(
    userId: string,
    amount: number,
    description: string,
  ): Promise<CreditPurchaseResultDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      let userCredit = await tx.userCredit.findUnique({
        where: { userId },
      });

      if (!userCredit) {
        userCredit = await tx.userCredit.create({
          data: {
            userId,
            balance: 0,
            bonusBalance: amount,
            totalPurchased: amount,
            totalSpent: 0,
          },
        });
      } else {
        await tx.userCredit.update({
          where: { userId },
          data: {
            bonusBalance: { increment: amount },
            totalPurchased: { increment: amount },
          },
        });
      }

      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          type: 'PROMOTION',
          amount: amount,
          balance: userCredit.bonusBalance + amount,
          isBonus: true,
          referenceType: 'promotion',
          description,
        },
      });

      return {
        success: true,
        creditsAdded: 0,
        bonusCreditsAdded: amount,
        newBalance: userCredit.balance + userCredit.bonusBalance + amount,
        transactionId: transaction.id,
      };
    });

    this.logger.log(`Added ${amount} promotional credits to user ${userId}`);

    return result;
  }

  async initializeDefaultPackages(): Promise<void> {
    const defaultPackages = [
      { name: '10 Credits', credits: 10, price: 1000, bonusCredits: 0 },
      { name: '50 Credits', credits: 50, price: 4500, bonusCredits: 5, isPopular: true },
      { name: '100 Credits', credits: 100, price: 8000, bonusCredits: 15 },
      { name: '300 Credits', credits: 300, price: 22000, bonusCredits: 60, isBestValue: true },
      { name: '500 Credits', credits: 500, price: 35000, bonusCredits: 125 },
      { name: '1000 Credits', credits: 1000, price: 65000, bonusCredits: 300 },
    ];

    for (let i = 0; i < defaultPackages.length; i++) {
      const pkg = defaultPackages[i];
      const existing = await this.prisma.creditPackage.findFirst({
        where: { name: pkg.name },
      });

      if (!existing) {
        await this.prisma.creditPackage.create({
          data: {
            ...pkg,
            currency: 'KRW',
            sortOrder: i,
            isPopular: pkg.isPopular ?? false,
            isBestValue: pkg.isBestValue ?? false,
          },
        });
      }
    }

    this.logger.log('Default credit packages initialized');
  }

  private mapPackageToResponse(pkg: {
    id: string;
    name: string;
    description: string | null;
    credits: number;
    price: number;
    currency: string;
    bonusCredits: number;
    isPopular: boolean;
    isBestValue: boolean;
  }): CreditPackageResponseDto {
    const totalCredits = pkg.credits + pkg.bonusCredits;
    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description ?? undefined,
      credits: pkg.credits,
      price: pkg.price,
      currency: pkg.currency,
      bonusCredits: pkg.bonusCredits,
      totalCredits,
      pricePerCredit: Math.round((pkg.price / totalCredits) * 100) / 100,
      isPopular: pkg.isPopular,
      isBestValue: pkg.isBestValue,
    };
  }
}
