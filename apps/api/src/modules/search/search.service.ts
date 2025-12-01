import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, options: {
    type?: 'all' | 'album' | 'episode' | 'creator';
    page?: number;
    limit?: number;
  } = {}) {
    const { type = 'all', page = 1, limit = 20 } = options;

    const results: any = {};

    if (type === 'all' || type === 'album') {
      const albums = await this.prisma.album.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } },
          ],
        },
        include: {
          creator: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { playCount: 'desc' },
        skip: (page - 1) * limit,
        take: type === 'all' ? 5 : limit,
      });

      results.albums = albums;
    }

    if (type === 'all' || type === 'episode') {
      const episodes = await this.prisma.episode.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          album: {
            select: { id: true, title: true, coverUrl: true },
          },
        },
        orderBy: { playCount: 'desc' },
        skip: (page - 1) * limit,
        take: type === 'all' ? 5 : limit,
      });

      results.episodes = episodes;
    }

    if (type === 'all' || type === 'creator') {
      const creators = await this.prisma.creator.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { followerCount: 'desc' },
        skip: (page - 1) * limit,
        take: type === 'all' ? 5 : limit,
      });

      results.creators = creators;
    }

    // Save search history
    await this.prisma.searchHistory.create({
      data: {
        query,
        resultCount: Object.values(results).flat().length,
      },
    });

    return results;
  }

  async getPopularSearches(limit = 10) {
    const searches = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });

    return searches.map((s) => s.query);
  }
}
