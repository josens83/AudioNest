import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const [creators, total] = await Promise.all([
      this.prisma.creator.findMany({
        orderBy: { followerCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creator.count(),
    ]);

    return {
      data: creators,
      meta: { page, limit, total, hasMore: page * limit < total },
    };
  }

  async findById(id: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return creator;
  }

  async getAlbums(creatorId: string, page = 1, limit = 20) {
    const [albums, total] = await Promise.all([
      this.prisma.album.findMany({
        where: { creatorId, isPublished: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.album.count({ where: { creatorId, isPublished: true } }),
    ]);

    return {
      data: albums,
      meta: { page, limit, total, hasMore: page * limit < total },
    };
  }

  async follow(creatorId: string, userId: string) {
    const existing = await this.prisma.creatorFollow.findUnique({
      where: { creatorId_userId: { creatorId, userId } },
    });

    if (existing) {
      return existing;
    }

    const follow = await this.prisma.creatorFollow.create({
      data: { creatorId, userId },
    });

    await this.prisma.creator.update({
      where: { id: creatorId },
      data: { followerCount: { increment: 1 } },
    });

    return follow;
  }

  async unfollow(creatorId: string, userId: string) {
    await this.prisma.creatorFollow.delete({
      where: { creatorId_userId: { creatorId, userId } },
    });

    await this.prisma.creator.update({
      where: { id: creatorId },
      data: { followerCount: { decrement: 1 } },
    });

    return { success: true };
  }

  async isFollowing(creatorId: string, userId: string) {
    const follow = await this.prisma.creatorFollow.findUnique({
      where: { creatorId_userId: { creatorId, userId } },
    });

    return { isFollowing: !!follow };
  }

  async getStats(creatorId: string, userId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId, userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return {
      totalAlbums: creator.totalAlbums,
      totalEpisodes: creator.totalEpisodes,
      totalPlayCount: creator.totalPlayCount,
      followerCount: creator.followerCount,
      totalRevenue: creator.totalRevenue,
      pendingRevenue: creator.pendingRevenue,
    };
  }
}
