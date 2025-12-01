import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  // Subscriptions
  async getSubscriptions(userId: string, page = 1, limit = 20) {
    const [subscriptions, total] = await Promise.all([
      this.prisma.librarySubscription.findMany({
        where: { userId },
        include: {
          album: {
            include: {
              creator: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.librarySubscription.count({ where: { userId } }),
    ]);

    return {
      data: subscriptions,
      meta: { page, limit, total, hasMore: page * limit < total },
    };
  }

  async subscribe(userId: string, albumId: string) {
    const existing = await this.prisma.librarySubscription.findUnique({
      where: { userId_albumId: { userId, albumId } },
    });

    if (existing) {
      return existing;
    }

    const subscription = await this.prisma.librarySubscription.create({
      data: { userId, albumId },
    });

    // Increment subscriber count
    await this.prisma.album.update({
      where: { id: albumId },
      data: { subscriberCount: { increment: 1 } },
    });

    return subscription;
  }

  async unsubscribe(userId: string, albumId: string) {
    await this.prisma.librarySubscription.delete({
      where: { userId_albumId: { userId, albumId } },
    });

    // Decrement subscriber count
    await this.prisma.album.update({
      where: { id: albumId },
      data: { subscriberCount: { decrement: 1 } },
    });

    return { success: true };
  }

  // Likes
  async getLikes(userId: string, targetType: 'ALBUM' | 'EPISODE', page = 1, limit = 20) {
    const [likes, total] = await Promise.all([
      this.prisma.libraryLike.findMany({
        where: { userId, targetType },
        include: {
          album: targetType === 'ALBUM' ? {
            include: {
              creator: { select: { id: true, name: true, avatarUrl: true } },
            },
          } : false,
          episode: targetType === 'EPISODE' ? {
            include: {
              album: { select: { id: true, title: true, coverUrl: true } },
            },
          } : false,
        },
        orderBy: { likedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.libraryLike.count({ where: { userId, targetType } }),
    ]);

    return {
      data: likes,
      meta: { page, limit, total, hasMore: page * limit < total },
    };
  }

  async like(userId: string, targetType: 'ALBUM' | 'EPISODE', targetId: string) {
    const existing = await this.prisma.libraryLike.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    });

    if (existing) {
      return existing;
    }

    const like = await this.prisma.libraryLike.create({
      data: { userId, targetType, targetId },
    });

    // Increment like count
    if (targetType === 'ALBUM') {
      await this.prisma.album.update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
      });
    } else {
      await this.prisma.episode.update({
        where: { id: targetId },
        data: { likeCount: { increment: 1 } },
      });
    }

    return like;
  }

  async unlike(userId: string, targetType: 'ALBUM' | 'EPISODE', targetId: string) {
    await this.prisma.libraryLike.delete({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    });

    // Decrement like count
    if (targetType === 'ALBUM') {
      await this.prisma.album.update({
        where: { id: targetId },
        data: { likeCount: { decrement: 1 } },
      });
    } else {
      await this.prisma.episode.update({
        where: { id: targetId },
        data: { likeCount: { decrement: 1 } },
      });
    }

    return { success: true };
  }

  // Downloads
  async getDownloads(userId: string, page = 1, limit = 20) {
    const [downloads, total] = await Promise.all([
      this.prisma.download.findMany({
        where: { userId, status: 'COMPLETED' },
        include: {
          episode: {
            include: {
              album: { select: { id: true, title: true, coverUrl: true } },
            },
          },
        },
        orderBy: { downloadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.download.count({ where: { userId, status: 'COMPLETED' } }),
    ]);

    return {
      data: downloads,
      meta: { page, limit, total, hasMore: page * limit < total },
    };
  }

  async deleteDownload(userId: string, episodeId: string) {
    await this.prisma.download.delete({
      where: { userId_episodeId: { userId, episodeId } },
    });

    return { success: true };
  }
}
