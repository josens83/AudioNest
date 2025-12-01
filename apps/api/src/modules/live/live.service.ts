import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LiveGift {
  id: string;
  name: string;
  icon: string;
  coinCost: number;
  hostReceives: number;
}

const LIVE_GIFTS: LiveGift[] = [
  { id: 'heart', name: '하트', icon: '❤️', coinCost: 1, hostReceives: 0 },
  { id: 'coffee', name: '커피', icon: '☕', coinCost: 10, hostReceives: 5 },
  { id: 'mic', name: '마이크', icon: '🎤', coinCost: 50, hostReceives: 25 },
  { id: 'headphone', name: '헤드폰', icon: '🎧', coinCost: 100, hostReceives: 50 },
  { id: 'star', name: '별', icon: '⭐', coinCost: 500, hostReceives: 250 },
  { id: 'rocket', name: '로켓', icon: '🚀', coinCost: 1000, hostReceives: 500 },
  { id: 'crown', name: '왕관', icon: '👑', coinCost: 5000, hostReceives: 2500 },
];

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  async findLive(page = 1, limit = 20) {
    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where: { status: 'LIVE' },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
        orderBy: { currentListeners: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.liveRoom.count({ where: { status: 'LIVE' } }),
    ]);

    return {
      data: rooms,
      meta: { page, limit, total, hasMore: page * limit < total },
    };
  }

  async findUpcoming(page = 1, limit = 20) {
    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gte: new Date() },
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.liveRoom.count({
        where: { status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
      }),
    ]);

    return {
      data: rooms,
      meta: { page, limit, total, hasMore: page * limit < total },
    };
  }

  async findById(id: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            followerCount: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Live room not found');
    }

    return room;
  }

  async join(roomId: string, userId: string) {
    const room = await this.findById(roomId);

    if (room.status !== 'LIVE') {
      throw new ForbiddenException('Room is not live');
    }

    // Update listener count
    await this.prisma.liveRoom.update({
      where: { id: roomId },
      data: {
        currentListeners: { increment: 1 },
        totalUniqueListeners: { increment: 1 },
      },
    });

    // Update peak if necessary
    const updated = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { currentListeners: true, peakListeners: true },
    });

    if (updated && updated.currentListeners > updated.peakListeners) {
      await this.prisma.liveRoom.update({
        where: { id: roomId },
        data: { peakListeners: updated.currentListeners },
      });
    }

    return { success: true };
  }

  async leave(roomId: string) {
    await this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { currentListeners: { decrement: 1 } },
    });

    return { success: true };
  }

  async sendGift(roomId: string, userId: string, giftId: string, quantity = 1) {
    const room = await this.findById(roomId);
    const gift = LIVE_GIFTS.find((g) => g.id === giftId);

    if (!gift) {
      throw new NotFoundException('Gift not found');
    }

    const totalCost = gift.coinCost * quantity;
    const hostReceives = gift.hostReceives * quantity;

    // Check user coins
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.coins < totalCost) {
      throw new ForbiddenException('Insufficient coins');
    }

    // Deduct coins from sender
    await this.prisma.user.update({
      where: { id: userId },
      data: { coins: { decrement: totalCost } },
    });

    // Add coins to host (via creator revenue)
    await this.prisma.creator.update({
      where: { id: room.hostId },
      data: { pendingRevenue: { increment: hostReceives } },
    });

    // Create transaction records
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found after transaction');
    }

    await this.prisma.coinTransaction.create({
      data: {
        userId,
        type: 'GIFT_SENT',
        amount: -totalCost,
        balance: sender.coins,
        referenceType: 'LIVE_ROOM',
        referenceId: roomId,
        description: `${gift.name} x${quantity} 선물`,
      },
    });

    // Create gift transaction
    const giftTx = await this.prisma.liveGiftTransaction.create({
      data: {
        roomId,
        senderId: userId,
        hostId: room.hostId,
        giftId,
        quantity,
        totalCoins: totalCost,
        hostReceived: hostReceives,
      },
    });

    // Update room gift count
    await this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { totalGiftsReceived: { increment: totalCost } },
    });

    return {
      success: true,
      gift: { ...gift, quantity },
      transaction: giftTx,
    };
  }

  getGifts() {
    return LIVE_GIFTS;
  }
}
