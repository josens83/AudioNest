import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlaybackService {
  constructor(private prisma: PrismaService) {}

  async saveProgress(
    userId: string,
    episodeId: string,
    position: number,
    completed: boolean,
  ) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, albumId: true, duration: true },
    });

    if (!episode) return;

    const progress = (position / episode.duration) * 100;

    await this.prisma.listeningHistory.upsert({
      where: {
        userId_episodeId: {
          userId,
          episodeId,
        },
      },
      update: {
        position,
        progress,
        completed: completed || progress >= 95,
        totalListenTime: { increment: 1 },
        listenCount: { increment: 1 },
        lastPlayedAt: new Date(),
      },
      create: {
        userId,
        episodeId,
        albumId: episode.albumId,
        position,
        duration: episode.duration,
        progress,
        completed: completed || progress >= 95,
      },
    });

    return { success: true };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const [history, total] = await Promise.all([
      this.prisma.listeningHistory.findMany({
        where: { userId },
        include: {
          episode: {
            include: {
              album: {
                select: {
                  id: true,
                  title: true,
                  coverUrl: true,
                  creator: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { lastPlayedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listeningHistory.count({ where: { userId } }),
    ]);

    return {
      data: history,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async getSyncState(userId: string) {
    const sync = await this.prisma.playbackSync.findUnique({
      where: { userId },
    });

    return sync;
  }

  async saveSyncState(
    userId: string,
    data: {
      currentEpisodeId?: string;
      currentPosition?: number;
      deviceId?: string;
      queue?: any;
      settings?: any;
    },
  ) {
    return this.prisma.playbackSync.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...data,
      },
    });
  }
}
