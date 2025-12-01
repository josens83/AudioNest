import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Category, AccessType, Prisma } from '@audionest/database';
import { PaginatedResponse } from '../../common/types';

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: {
    category?: Category;
    accessType?: AccessType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { category, accessType, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    const where: Prisma.AlbumWhereInput = {
      isPublished: true,
    };

    if (category) where.category = category;
    if (accessType) where.accessType = accessType;

    const [albums, total] = await Promise.all([
      this.prisma.album.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.album.count({ where }),
    ]);

    return {
      data: albums,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async findById(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            followerCount: true,
          },
        },
        narrator: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            episodes: true,
            reviews: true,
          },
        },
      },
    });

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    // Increment play count
    await this.prisma.album.update({
      where: { id },
      data: { playCount: { increment: 1 } },
    });

    return album;
  }

  async getFeatured(limit = 10) {
    return this.prisma.album.findMany({
      where: {
        isPublished: true,
        isFeatured: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { playCount: 'desc' },
      take: limit,
    });
  }

  async getTrending(limit = 20) {
    return this.prisma.album.findMany({
      where: {
        isPublished: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { playCount: 'desc' },
      take: limit,
    });
  }

  async getNewReleases(limit = 20) {
    return this.prisma.album.findMany({
      where: {
        isPublished: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getByCategory(category: Category, page = 1, limit = 20) {
    return this.findAll({ category, page, limit });
  }
}
