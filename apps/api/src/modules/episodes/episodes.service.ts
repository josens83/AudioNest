import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier, EpisodeAccessType } from '@audionest/database';

@Injectable()
export class EpisodesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAlbum(albumId: string, page = 1, limit = 50) {
    const [episodes, total] = await Promise.all([
      this.prisma.episode.findMany({
        where: { albumId },
        orderBy: { number: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.episode.count({ where: { albumId } }),
    ]);

    return {
      data: episodes,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async findById(id: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id },
      include: {
        album: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            creatorId: true,
            creator: {
              select: {
                id: true,
                name: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!episode) {
      throw new NotFoundException('Episode not found');
    }

    return episode;
  }

  async getStreamUrl(
    episodeId: string,
    userSubscription: SubscriptionTier,
    userId?: string,
  ) {
    const episode = await this.findById(episodeId);

    // Check access
    const hasAccess = this.checkAccess(episode.accessType, userSubscription);

    if (!hasAccess) {
      // Check if user purchased this episode
      if (userId) {
        const purchase = await this.prisma.purchase.findFirst({
          where: {
            userId,
            itemType: 'EPISODE',
            itemId: episodeId,
            status: 'COMPLETED',
          },
        });

        if (!purchase) {
          throw new ForbiddenException('VIP subscription required');
        }
      } else {
        throw new ForbiddenException('VIP subscription required');
      }
    }

    // Increment play count
    await this.prisma.episode.update({
      where: { id: episodeId },
      data: { playCount: { increment: 1 } },
    });

    return {
      streamUrl: episode.audioUrl,
      duration: episode.duration,
      chapters: episode.chapters,
    };
  }

  async getDownloadUrl(
    episodeId: string,
    userSubscription: SubscriptionTier,
    userId: string,
  ) {
    if (userSubscription === 'FREE') {
      throw new ForbiddenException('VIP subscription required for downloads');
    }

    const episode = await this.findById(episodeId);

    // Create/update download record
    await this.prisma.download.upsert({
      where: {
        userId_episodeId: {
          userId,
          episodeId,
        },
      },
      update: {
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      create: {
        userId,
        episodeId,
        albumId: episode.albumId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      downloadUrl: episode.audioUrl,
      fileSize: episode.fileSize,
    };
  }

  private checkAccess(
    accessType: EpisodeAccessType,
    subscription: SubscriptionTier,
  ): boolean {
    switch (accessType) {
      case 'FREE':
      case 'PREVIEW':
        return true;
      case 'VIP':
        return subscription === 'VIP' || subscription === 'SVIP';
      case 'PAID':
        return false; // Requires purchase
      default:
        return false;
    }
  }
}
