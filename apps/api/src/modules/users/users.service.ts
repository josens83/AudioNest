import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(data: { email: string; username: string; passwordHash: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
      },
    });
  }

  async update(id: string, data: Partial<{ avatarUrl: string; phone: string; preferences: any }>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async getStats(userId: string) {
    const user = await this.findById(userId);
    return {
      totalListenTime: user.totalListenTime,
      totalEpisodesCompleted: user.totalEpisodesCompleted,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
    };
  }

  async updateListenStats(userId: string, listenTime: number, completed: boolean) {
    const user = await this.findById(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastListen = user.lastListenDate ? new Date(user.lastListenDate) : null;
    let currentStreak = user.currentStreak;

    if (lastListen) {
      lastListen.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastListen.getTime() === yesterday.getTime()) {
        currentStreak += 1;
      } else if (lastListen.getTime() !== today.getTime()) {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        totalListenTime: { increment: listenTime },
        totalEpisodesCompleted: completed
          ? { increment: 1 }
          : undefined,
        currentStreak,
        longestStreak: Math.max(user.longestStreak, currentStreak),
        lastListenDate: new Date(),
      },
    });
  }
}
