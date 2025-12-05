import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecommendationType,
  GetRecommendationsDto,
  RecommendedContentDto,
  RecommendationResponseDto,
  UserPreferencesDto,
} from './dto/ai.dto';
import { AppLoggerService } from '../../common/logger';

interface UserListeningProfile {
  favoriteCategories: string[];
  favoriteCreators: string[];
  listenedAlbumIds: string[];
  averageSessionMinutes: number;
  preferredDuration: { min: number; max: number };
  completionRate: number;
  listenTimeDistribution: Record<string, number>;
}

@Injectable()
export class AIRecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('AIRecommendationService');
  }

  async getRecommendations(
    userId: string,
    dto: GetRecommendationsDto,
  ): Promise<RecommendationResponseDto> {
    const type = dto.type ?? RecommendationType.PERSONALIZED;
    const limit = dto.limit ?? 20;

    let items: RecommendedContentDto[];

    switch (type) {
      case RecommendationType.PERSONALIZED:
        items = await this.getPersonalizedRecommendations(userId, limit);
        break;
      case RecommendationType.SIMILAR:
        items = await this.getSimilarContent(dto.referenceId!, limit);
        break;
      case RecommendationType.TRENDING:
        items = await this.getTrendingContent(limit);
        break;
      case RecommendationType.CATEGORY:
        items = await this.getCategoryRecommendations(userId, dto.category!, limit);
        break;
      case RecommendationType.MOOD:
        items = await this.getMoodBasedRecommendations(dto.mood ?? [], limit);
        break;
      case RecommendationType.CONTINUE_LISTENING:
        items = await this.getContinueListening(userId, limit);
        break;
      default:
        items = await this.getPersonalizedRecommendations(userId, limit);
    }

    return {
      type,
      items,
      generatedAt: new Date(),
      nextRefreshAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  async getUserPreferences(userId: string): Promise<UserPreferencesDto> {
    const profile = await this.buildUserProfile(userId);

    return {
      favoriteCategories: profile.favoriteCategories,
      preferredDuration: profile.preferredDuration,
      listenTimes: {
        morning: profile.listenTimeDistribution['morning'] ?? 0,
        afternoon: profile.listenTimeDistribution['afternoon'] ?? 0,
        evening: profile.listenTimeDistribution['evening'] ?? 0,
        night: profile.listenTimeDistribution['night'] ?? 0,
      },
      completionRate: profile.completionRate,
      avgSessionLength: profile.averageSessionMinutes,
    };
  }

  async getForYouFeed(userId: string, page = 1, limit = 20): Promise<{
    sections: Array<{
      title: string;
      type: RecommendationType;
      items: RecommendedContentDto[];
    }>;
  }> {
    const [
      continueListening,
      personalized,
      trending,
      newReleases,
    ] = await Promise.all([
      this.getContinueListening(userId, 5),
      this.getPersonalizedRecommendations(userId, 10),
      this.getTrendingContent(10),
      this.getNewReleases(10),
    ]);

    const sections = [];

    if (continueListening.length > 0) {
      sections.push({
        title: '이어서 듣기',
        type: RecommendationType.CONTINUE_LISTENING,
        items: continueListening,
      });
    }

    sections.push({
      title: '당신을 위한 추천',
      type: RecommendationType.PERSONALIZED,
      items: personalized,
    });

    sections.push({
      title: '지금 인기있는',
      type: RecommendationType.TRENDING,
      items: trending,
    });

    sections.push({
      title: '새로 나온 콘텐츠',
      type: RecommendationType.PERSONALIZED,
      items: newReleases,
    });

    return { sections };
  }

  private async getPersonalizedRecommendations(
    userId: string,
    limit: number,
  ): Promise<RecommendedContentDto[]> {
    const profile = await this.buildUserProfile(userId);

    // Get albums matching user's preferences
    const albums = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        id: { notIn: profile.listenedAlbumIds },
        OR: [
          { category: { in: profile.favoriteCategories as never[] } },
          { creatorId: { in: profile.favoriteCreators } },
        ],
      },
      orderBy: [
        { playCount: 'desc' },
        { rating: 'desc' },
      ],
      take: limit * 2, // Get more for scoring
      include: {
        creator: { select: { name: true } },
      },
    });

    // Score and rank albums
    const scoredAlbums = albums.map((album) => {
      let score = 50; // Base score

      // Boost for favorite categories
      if (profile.favoriteCategories.includes(album.category)) {
        score += 30;
      }

      // Boost for favorite creators
      if (profile.favoriteCreators.includes(album.creatorId)) {
        score += 25;
      }

      // Boost for matching duration preferences
      const avgEpisodeDuration = album.totalDuration / (album.totalEpisodes || 1);
      if (
        avgEpisodeDuration >= profile.preferredDuration.min &&
        avgEpisodeDuration <= profile.preferredDuration.max
      ) {
        score += 15;
      }

      // Boost for high ratings
      score += album.rating * 5;

      // Small random factor for diversity
      score += Math.random() * 10;

      return {
        album,
        score: Math.min(100, Math.round(score)),
      };
    });

    // Sort by score and take top items
    scoredAlbums.sort((a, b) => b.score - a.score);

    return scoredAlbums.slice(0, limit).map(({ album, score }) => ({
      id: album.id,
      type: 'album',
      title: album.title,
      subtitle: album.subtitle ?? undefined,
      coverUrl: album.coverUrl ?? '',
      creatorName: album.creator.name,
      score,
      reason: this.generateRecommendationReason(album, profile),
      episodeCount: album.totalEpisodes,
      duration: album.totalDuration,
    }));
  }

  private async getSimilarContent(
    referenceId: string,
    limit: number,
  ): Promise<RecommendedContentDto[]> {
    const reference = await this.prisma.album.findUnique({
      where: { id: referenceId },
      include: { creator: { select: { name: true } } },
    });

    if (!reference) {
      return [];
    }

    // Find similar albums by category, tags, and creator
    const similar = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        id: { not: referenceId },
        OR: [
          { category: reference.category },
          { creatorId: reference.creatorId },
          { tags: { hasSome: reference.tags } },
        ],
      },
      orderBy: { playCount: 'desc' },
      take: limit,
      include: {
        creator: { select: { name: true } },
      },
    });

    return similar.map((album) => {
      // Calculate similarity score
      let score = 0;
      if (album.category === reference.category) score += 40;
      if (album.creatorId === reference.creatorId) score += 30;
      const commonTags = album.tags.filter((t) => reference.tags.includes(t)).length;
      score += commonTags * 10;
      score = Math.min(100, score);

      return {
        id: album.id,
        type: 'album' as const,
        title: album.title,
        subtitle: album.subtitle ?? undefined,
        coverUrl: album.coverUrl ?? '',
        creatorName: album.creator.name,
        score,
        reason: `"${reference.title}"과(와) 비슷한 콘텐츠`,
        episodeCount: album.totalEpisodes,
        duration: album.totalDuration,
      };
    });
  }

  private async getTrendingContent(limit: number): Promise<RecommendedContentDto[]> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get albums with most recent plays
    const trending = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        lastEpisodeAt: { gte: oneWeekAgo },
      },
      orderBy: { playCount: 'desc' },
      take: limit,
      include: {
        creator: { select: { name: true } },
      },
    });

    return trending.map((album, index) => ({
      id: album.id,
      type: 'album' as const,
      title: album.title,
      subtitle: album.subtitle ?? undefined,
      coverUrl: album.coverUrl ?? '',
      creatorName: album.creator.name,
      score: Math.max(100 - index * 5, 50),
      reason: '이번 주 인기 콘텐츠',
      episodeCount: album.totalEpisodes,
      duration: album.totalDuration,
    }));
  }

  private async getCategoryRecommendations(
    userId: string,
    category: string,
    limit: number,
  ): Promise<RecommendedContentDto[]> {
    const listenedIds = await this.getListenedAlbumIds(userId);

    const albums = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        category: category as never,
        id: { notIn: listenedIds },
      },
      orderBy: [
        { rating: 'desc' },
        { playCount: 'desc' },
      ],
      take: limit,
      include: {
        creator: { select: { name: true } },
      },
    });

    return albums.map((album) => ({
      id: album.id,
      type: 'album' as const,
      title: album.title,
      subtitle: album.subtitle ?? undefined,
      coverUrl: album.coverUrl ?? '',
      creatorName: album.creator.name,
      score: Math.round(album.rating * 20),
      reason: `${category} 카테고리 인기 콘텐츠`,
      episodeCount: album.totalEpisodes,
      duration: album.totalDuration,
    }));
  }

  private async getMoodBasedRecommendations(
    moods: string[],
    limit: number,
  ): Promise<RecommendedContentDto[]> {
    // Map moods to content types and tags
    const moodMapping: Record<string, { categories: string[]; tags: string[] }> = {
      relaxing: { categories: ['ASMR', 'SLEEP', 'MUSIC'], tags: ['휴식', '힐링', '명상'] },
      focused: { categories: ['COURSE_SKILL', 'AUDIOBOOK_NONFICTION'], tags: ['집중', '학습'] },
      entertaining: { categories: ['PODCAST_COMEDY', 'PODCAST_TALK'], tags: ['재미', '유머'] },
      informative: { categories: ['PODCAST_NEWS', 'AUDIOBOOK_BUSINESS'], tags: ['정보', '뉴스'] },
      inspiring: { categories: ['AUDIOBOOK_SELFHELP'], tags: ['동기부여', '자기계발'] },
    };

    const categories: string[] = [];
    const tags: string[] = [];

    for (const mood of moods) {
      const mapping = moodMapping[mood.toLowerCase()];
      if (mapping) {
        categories.push(...mapping.categories);
        tags.push(...mapping.tags);
      }
    }

    const albums = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        OR: [
          { category: { in: categories as never[] } },
          { tags: { hasSome: tags } },
        ],
      },
      orderBy: { rating: 'desc' },
      take: limit,
      include: {
        creator: { select: { name: true } },
      },
    });

    return albums.map((album) => ({
      id: album.id,
      type: 'album' as const,
      title: album.title,
      subtitle: album.subtitle ?? undefined,
      coverUrl: album.coverUrl ?? '',
      creatorName: album.creator.name,
      score: Math.round(album.rating * 20),
      reason: `${moods.join(', ')} 분위기에 맞는 콘텐츠`,
      episodeCount: album.totalEpisodes,
      duration: album.totalDuration,
    }));
  }

  private async getContinueListening(
    userId: string,
    limit: number,
  ): Promise<RecommendedContentDto[]> {
    const inProgress = await this.prisma.listeningHistory.findMany({
      where: {
        userId,
        completed: false,
        progress: { gt: 5 }, // At least 5% progress
      },
      orderBy: { lastPlayedAt: 'desc' },
      take: limit,
      include: {
        episode: {
          include: {
            album: {
              include: {
                creator: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return inProgress.map((history) => ({
      id: history.episode.id,
      type: 'episode' as const,
      title: history.episode.title,
      subtitle: history.episode.album.title,
      coverUrl: history.episode.album.coverUrl ?? '',
      creatorName: history.episode.album.creator.name,
      score: 100, // Always highest priority
      reason: `${Math.round(history.progress)}% 진행 중`,
      duration: history.episode.duration,
    }));
  }

  private async getNewReleases(limit: number): Promise<RecommendedContentDto[]> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const albums = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        createdAt: { gte: oneWeekAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        creator: { select: { name: true } },
      },
    });

    return albums.map((album) => ({
      id: album.id,
      type: 'album' as const,
      title: album.title,
      subtitle: album.subtitle ?? undefined,
      coverUrl: album.coverUrl ?? '',
      creatorName: album.creator.name,
      score: 85,
      reason: '신규 콘텐츠',
      episodeCount: album.totalEpisodes,
      duration: album.totalDuration,
    }));
  }

  private async buildUserProfile(userId: string): Promise<UserListeningProfile> {
    const [listeningHistory, subscriptions, user] = await Promise.all([
      this.prisma.listeningHistory.findMany({
        where: { userId },
        include: {
          episode: {
            include: { album: true },
          },
        },
        orderBy: { lastPlayedAt: 'desc' },
        take: 100,
      }),
      this.prisma.librarySubscription.findMany({
        where: { userId },
        include: { album: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { totalListenTime: true },
      }),
    ]);

    // Analyze categories
    const categoryCounts: Record<string, number> = {};
    const creatorCounts: Record<string, number> = {};
    const durations: number[] = [];
    let completedCount = 0;

    for (const history of listeningHistory) {
      const category = history.episode.album.category;
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

      const creatorId = history.episode.album.creatorId;
      creatorCounts[creatorId] = (creatorCounts[creatorId] ?? 0) + 1;

      durations.push(history.episode.duration);

      if (history.completed) completedCount++;
    }

    // Get top categories and creators
    const favoriteCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    const favoriteCreators = Object.entries(creatorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([creatorId]) => creatorId);

    // Calculate preferred duration range
    const sortedDurations = durations.sort((a, b) => a - b);
    const preferredDuration = {
      min: sortedDurations[Math.floor(durations.length * 0.25)] ?? 600,
      max: sortedDurations[Math.floor(durations.length * 0.75)] ?? 3600,
    };

    // Get listened album IDs
    const listenedAlbumIds = [...new Set(listeningHistory.map((h) => h.episode.album.id))];

    return {
      favoriteCategories,
      favoriteCreators,
      listenedAlbumIds,
      averageSessionMinutes: (user?.totalListenTime ?? 0) / Math.max(listeningHistory.length, 1),
      preferredDuration,
      completionRate: listeningHistory.length > 0 ? completedCount / listeningHistory.length : 0,
      listenTimeDistribution: {}, // Would need timestamp analysis
    };
  }

  private async getListenedAlbumIds(userId: string): Promise<string[]> {
    const history = await this.prisma.listeningHistory.findMany({
      where: { userId },
      select: { episode: { select: { albumId: true } } },
    });

    return [...new Set(history.map((h) => h.episode.albumId))];
  }

  private generateRecommendationReason(
    album: { category: string; creatorId: string; rating: number },
    profile: UserListeningProfile,
  ): string {
    const reasons: string[] = [];

    if (profile.favoriteCategories.includes(album.category)) {
      reasons.push('즐겨 듣는 장르');
    }

    if (profile.favoriteCreators.includes(album.creatorId)) {
      reasons.push('팔로우 중인 크리에이터');
    }

    if (album.rating >= 4.5) {
      reasons.push('높은 평점');
    }

    return reasons.length > 0 ? reasons.join(' • ') : '맞춤 추천';
  }
}
