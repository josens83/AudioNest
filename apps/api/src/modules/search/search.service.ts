import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SearchQueryDto,
  SearchResultsDto,
  SearchResultItemDto,
  SearchType,
  SearchSortBy,
  AutocompleteQueryDto,
  AutocompleteSuggestionDto,
  TrendingSearchDto,
  RecentSearchDto,
  DiscoverContentDto,
  BrowseCategoryDto,
  GetTrendingQueryDto,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  // Category name mappings
  private readonly categoryNames: Record<string, { en: string; ko: string }> = {
    AUDIOBOOK_FICTION: { en: 'Fiction', ko: '소설/문학' },
    AUDIOBOOK_NONFICTION: { en: 'Non-Fiction', ko: '비소설' },
    AUDIOBOOK_SELFHELP: { en: 'Self-Help', ko: '자기계발' },
    AUDIOBOOK_BUSINESS: { en: 'Business', ko: '비즈니스' },
    PODCAST_TALK: { en: 'Talk Show', ko: '토크쇼' },
    PODCAST_COMEDY: { en: 'Comedy', ko: '코미디' },
    PODCAST_NEWS: { en: 'News', ko: '뉴스' },
    PODCAST_TRUE_CRIME: { en: 'True Crime', ko: '범죄실화' },
    COURSE_LANGUAGE: { en: 'Language Learning', ko: '언어학습' },
    COURSE_SKILL: { en: 'Skills', ko: '스킬' },
    KIDS: { en: 'Kids', ko: '어린이' },
    ASMR: { en: 'ASMR', ko: 'ASMR' },
    SLEEP: { en: 'Sleep', ko: '수면' },
    MUSIC: { en: 'Music', ko: '음악' },
  };

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Main Search ====================

  async search(
    query: SearchQueryDto,
    userId?: string,
  ): Promise<SearchResultsDto> {
    const {
      q,
      type = SearchType.ALL,
      sortBy = SearchSortBy.RELEVANCE,
      page = 1,
      limit = 20,
      categories,
      contentTypes,
      accessTypes,
      minRating,
      minDuration,
      maxDuration,
      completedOnly,
      exclusiveOnly,
      featuredOnly,
    } = query;

    const items: SearchResultItemDto[] = [];
    let totalCount = 0;

    // Build album filters
    const albumWhere: any = {
      isPublished: true,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: q.split(' ').filter(w => w.length > 1) } },
      ],
    };

    if (categories?.length) {
      albumWhere.category = { in: categories };
    }
    if (contentTypes?.length) {
      albumWhere.contentType = { in: contentTypes };
    }
    if (accessTypes?.length) {
      albumWhere.accessType = { in: accessTypes };
    }
    if (minRating) {
      albumWhere.rating = { gte: minRating };
    }
    if (minDuration) {
      albumWhere.totalDuration = { gte: minDuration * 60 };
    }
    if (maxDuration) {
      albumWhere.totalDuration = { ...albumWhere.totalDuration, lte: maxDuration * 60 };
    }
    if (completedOnly) {
      albumWhere.status = 'COMPLETED';
    }
    if (exclusiveOnly) {
      albumWhere.isExclusive = true;
    }
    if (featuredOnly) {
      albumWhere.isFeatured = true;
    }

    // Determine order by
    const getOrderBy = () => {
      switch (sortBy) {
        case SearchSortBy.POPULARITY:
          return { playCount: 'desc' as const };
        case SearchSortBy.RECENT:
          return { createdAt: 'desc' as const };
        case SearchSortBy.RATING:
          return { rating: 'desc' as const };
        default:
          return { playCount: 'desc' as const };
      }
    };

    // Search albums
    if (type === SearchType.ALL || type === SearchType.ALBUM) {
      const [albums, albumCount] = await Promise.all([
        this.prisma.album.findMany({
          where: albumWhere,
          include: {
            creator: {
              select: { id: true, name: true, avatarUrl: true, isVerified: true },
            },
          },
          orderBy: getOrderBy(),
          skip: (page - 1) * limit,
          take: type === SearchType.ALL ? 5 : limit,
        }),
        this.prisma.album.count({ where: albumWhere }),
      ]);

      items.push(...albums.map(album => this.mapAlbumToSearchResult(album, q)));
      totalCount += albumCount;
    }

    // Search episodes
    if (type === SearchType.ALL || type === SearchType.EPISODE) {
      const episodeWhere: any = {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
        album: {
          isPublished: true,
        },
      };

      if (minDuration) {
        episodeWhere.duration = { gte: minDuration * 60 };
      }
      if (maxDuration) {
        episodeWhere.duration = { ...episodeWhere.duration, lte: maxDuration * 60 };
      }

      const [episodes, episodeCount] = await Promise.all([
        this.prisma.episode.findMany({
          where: episodeWhere,
          include: {
            album: {
              select: { id: true, title: true, coverUrl: true, creator: { select: { name: true } } },
            },
          },
          orderBy: { playCount: 'desc' },
          skip: (page - 1) * limit,
          take: type === SearchType.ALL ? 5 : limit,
        }),
        this.prisma.episode.count({ where: episodeWhere }),
      ]);

      items.push(...episodes.map(ep => this.mapEpisodeToSearchResult(ep, q)));
      totalCount += episodeCount;
    }

    // Search creators
    if (type === SearchType.ALL || type === SearchType.CREATOR) {
      const creatorWhere: any = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
        ],
      };

      const [creators, creatorCount] = await Promise.all([
        this.prisma.creator.findMany({
          where: creatorWhere,
          orderBy: { followerCount: 'desc' },
          skip: (page - 1) * limit,
          take: type === SearchType.ALL ? 5 : limit,
        }),
        this.prisma.creator.count({ where: creatorWhere }),
      ]);

      items.push(...creators.map(c => this.mapCreatorToSearchResult(c, q)));
      totalCount += creatorCount;
    }

    // Search playlists
    if (type === SearchType.ALL || type === SearchType.PLAYLIST) {
      const playlistWhere: any = {
        isPublic: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      };

      const [playlists, playlistCount] = await Promise.all([
        this.prisma.playlist.findMany({
          where: playlistWhere,
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
            _count: { select: { episodes: true } },
          },
          orderBy: { followerCount: 'desc' },
          skip: (page - 1) * limit,
          take: type === SearchType.ALL ? 5 : limit,
        }),
        this.prisma.playlist.count({ where: playlistWhere }),
      ]);

      items.push(...playlists.map(p => this.mapPlaylistToSearchResult(p, q)));
      totalCount += playlistCount;
    }

    // Sort by relevance if needed
    if (sortBy === SearchSortBy.RELEVANCE) {
      items.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Save search history
    this.saveSearchHistory(q, userId, totalCount);

    // Get facets for filtering UI
    const facets = type === SearchType.ALL ? await this.getSearchFacets(q) : undefined;

    return {
      items,
      totalCount,
      page,
      pageSize: limit,
      hasMore: page * limit < totalCount,
      query: q,
      facets,
    };
  }

  // ==================== Autocomplete ====================

  async autocomplete(
    query: AutocompleteQueryDto,
    userId?: string,
  ): Promise<AutocompleteSuggestionDto[]> {
    const { q, limit = 10 } = query;
    const suggestions: AutocompleteSuggestionDto[] = [];

    // Get recent searches for this user
    if (userId) {
      const recentSearches = await this.prisma.searchHistory.findMany({
        where: {
          userId,
          query: { startsWith: q, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        distinct: ['query'],
      });

      suggestions.push(...recentSearches.map(s => ({
        text: s.query,
        type: 'query' as const,
      })));
    }

    // Get popular searches
    const popularSearches = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      where: {
        query: { startsWith: q, mode: 'insensitive' },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 3,
    });

    suggestions.push(...popularSearches
      .filter(s => !suggestions.some(existing => existing.text.toLowerCase() === s.query.toLowerCase()))
      .map(s => ({
        text: s.query,
        type: 'query' as const,
      }))
    );

    // Get matching albums
    const albums = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        title: { startsWith: q, mode: 'insensitive' },
      },
      select: { id: true, title: true, coverUrl: true },
      take: 3,
    });

    suggestions.push(...albums.map(a => ({
      text: a.title,
      type: 'album' as const,
      id: a.id,
      imageUrl: a.coverUrl ?? undefined,
    })));

    // Get matching creators
    const creators = await this.prisma.creator.findMany({
      where: {
        OR: [
          { name: { startsWith: q, mode: 'insensitive' } },
          { displayName: { startsWith: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, displayName: true, avatarUrl: true },
      take: 3,
    });

    suggestions.push(...creators.map(c => ({
      text: c.displayName || c.name,
      type: 'creator' as const,
      id: c.id,
      imageUrl: c.avatarUrl ?? undefined,
    })));

    return suggestions.slice(0, limit);
  }

  // ==================== Trending & Recent ====================

  async getTrendingSearches(query: GetTrendingQueryDto): Promise<TrendingSearchDto[]> {
    const { limit = 10, period = '24h' } = query;

    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const previousStartDate = new Date(Date.now() - 2 * hours * 60 * 60 * 1000);

    // Current period searches
    const currentSearches = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });

    // Previous period searches for trend calculation
    const previousSearches = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      where: {
        createdAt: { gte: previousStartDate, lt: startDate },
        query: { in: currentSearches.map(s => s.query) },
      },
      _count: { query: true },
    });

    const previousMap = new Map(previousSearches.map(s => [s.query, s._count.query]));

    return currentSearches.map(s => {
      const previousCount = previousMap.get(s.query) || 0;
      const currentCount = s._count.query;
      const trend = currentCount > previousCount * 1.2 ? 'up' :
                    currentCount < previousCount * 0.8 ? 'down' : 'stable';

      return {
        query: s.query,
        searchCount: currentCount,
        trend: trend as 'up' | 'down' | 'stable',
      };
    });
  }

  async getRecentSearches(userId: string, limit = 10): Promise<RecentSearchDto[]> {
    const searches = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      distinct: ['query'],
    });

    return searches.map(s => ({
      query: s.query,
      searchedAt: s.createdAt,
      resultCount: s.resultCount,
    }));
  }

  async clearRecentSearches(userId: string): Promise<void> {
    await this.prisma.searchHistory.deleteMany({
      where: { userId },
    });
  }

  // ==================== Discovery ====================

  async discover(userId?: string): Promise<DiscoverContentDto> {
    const [trending, newReleases, popular] = await Promise.all([
      this.getTrendingContent(10),
      this.getNewReleases(10),
      this.getPopularContent(10),
    ]);

    const result: DiscoverContentDto = {
      trending,
      newReleases,
      popular,
      recommended: [], // Would use AI recommendation service
    };

    if (userId) {
      const [continueListening, basedOnHistory] = await Promise.all([
        this.getContinueListening(userId, 10),
        this.getBasedOnHistory(userId, 10),
      ]);

      result.continueListening = continueListening;
      result.basedOnHistory = basedOnHistory;
    }

    return result;
  }

  async getCategories(): Promise<BrowseCategoryDto[]> {
    const categoryCounts = await this.prisma.album.groupBy({
      by: ['category'],
      where: { isPublished: true },
      _count: { id: true },
    });

    return categoryCounts.map(c => ({
      id: c.category,
      name: this.categoryNames[c.category]?.en || c.category,
      nameKo: this.categoryNames[c.category]?.ko || c.category,
      contentCount: c._count.id,
    }));
  }

  async getCategoryContent(
    category: string,
    page = 1,
    limit = 20,
  ): Promise<SearchResultsDto> {
    const [albums, total] = await Promise.all([
      this.prisma.album.findMany({
        where: {
          isPublished: true,
          category: category as any,
        },
        include: {
          creator: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { playCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.album.count({
        where: {
          isPublished: true,
          category: category as any,
        },
      }),
    ]);

    return {
      items: albums.map(a => this.mapAlbumToSearchResult(a, '')),
      totalCount: total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
      query: '',
    };
  }

  // ==================== Helper Methods ====================

  private async getTrendingContent(limit: number): Promise<SearchResultItemDto[]> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const albums = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        updatedAt: { gte: oneWeekAgo },
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { playCount: 'desc' },
      take: limit,
    });

    return albums.map(a => this.mapAlbumToSearchResult(a, ''));
  }

  private async getNewReleases(limit: number): Promise<SearchResultItemDto[]> {
    const albums = await this.prisma.album.findMany({
      where: { isPublished: true },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return albums.map(a => this.mapAlbumToSearchResult(a, ''));
  }

  private async getPopularContent(limit: number): Promise<SearchResultItemDto[]> {
    const albums = await this.prisma.album.findMany({
      where: { isPublished: true },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { playCount: 'desc' },
      take: limit,
    });

    return albums.map(a => this.mapAlbumToSearchResult(a, ''));
  }

  private async getContinueListening(
    userId: string,
    limit: number,
  ): Promise<SearchResultItemDto[]> {
    const history = await this.prisma.listeningHistory.findMany({
      where: {
        userId,
        completed: false,
        progress: { gt: 0, lt: 90 },
      },
      include: {
        episode: {
          include: {
            album: {
              select: { id: true, title: true, coverUrl: true, creator: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { lastPlayedAt: 'desc' },
      take: limit,
    });

    return history.map(h => ({
      id: h.episode.id,
      type: 'episode',
      title: h.episode.title,
      subtitle: h.episode.album.title,
      imageUrl: h.episode.album.coverUrl ?? undefined,
      relevanceScore: 100,
      metadata: {
        progress: h.progress,
        position: h.position,
        albumId: h.episode.albumId,
        creatorName: h.episode.album.creator.name,
      },
    }));
  }

  private async getBasedOnHistory(
    userId: string,
    limit: number,
  ): Promise<SearchResultItemDto[]> {
    // Get user's most listened categories
    const history = await this.prisma.listeningHistory.findMany({
      where: { userId },
      include: {
        episode: {
          include: { album: { select: { category: true } } },
        },
      },
      orderBy: { totalListenTime: 'desc' },
      take: 50,
    });

    const categoryCounts: Record<string, number> = {};
    for (const h of history) {
      const cat = h.episode.album.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);

    if (topCategories.length === 0) {
      return this.getPopularContent(limit);
    }

    const albums = await this.prisma.album.findMany({
      where: {
        isPublished: true,
        category: { in: topCategories as any },
        NOT: {
          episodes: {
            some: {
              listeningHistory: {
                some: { userId },
              },
            },
          },
        },
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { playCount: 'desc' },
      take: limit,
    });

    return albums.map(a => this.mapAlbumToSearchResult(a, ''));
  }

  private async getSearchFacets(query: string) {
    const [categories, contentTypes, accessTypes] = await Promise.all([
      this.prisma.album.groupBy({
        by: ['category'],
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        _count: { id: true },
      }),
      this.prisma.album.groupBy({
        by: ['contentType'],
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        _count: { id: true },
      }),
      this.prisma.album.groupBy({
        by: ['accessType'],
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        _count: { id: true },
      }),
    ]);

    return {
      categories: Object.fromEntries(categories.map(c => [c.category, c._count.id])),
      contentTypes: Object.fromEntries(contentTypes.map(c => [c.contentType, c._count.id])),
      accessTypes: Object.fromEntries(accessTypes.map(c => [c.accessType, c._count.id])),
    };
  }

  private mapAlbumToSearchResult(album: any, query: string): SearchResultItemDto {
    return {
      id: album.id,
      type: 'album',
      title: album.title,
      subtitle: album.creator?.name,
      imageUrl: album.coverUrl,
      description: album.description?.substring(0, 200),
      relevanceScore: this.calculateRelevance(album.title, query),
      metadata: {
        category: album.category,
        contentType: album.contentType,
        accessType: album.accessType,
        rating: album.rating,
        playCount: Number(album.playCount),
        totalEpisodes: album.totalEpisodes,
        totalDuration: album.totalDuration,
        isExclusive: album.isExclusive,
        isFeatured: album.isFeatured,
        creatorId: album.creator?.id,
        creatorVerified: album.creator?.isVerified,
      },
    };
  }

  private mapEpisodeToSearchResult(episode: any, query: string): SearchResultItemDto {
    return {
      id: episode.id,
      type: 'episode',
      title: episode.title,
      subtitle: episode.album?.title,
      imageUrl: episode.album?.coverUrl,
      description: episode.description?.substring(0, 200),
      relevanceScore: this.calculateRelevance(episode.title, query),
      metadata: {
        albumId: episode.albumId,
        episodeNumber: episode.number,
        duration: episode.duration,
        playCount: episode.playCount,
        accessType: episode.accessType,
        creatorName: episode.album?.creator?.name,
      },
    };
  }

  private mapCreatorToSearchResult(creator: any, query: string): SearchResultItemDto {
    return {
      id: creator.id,
      type: 'creator',
      title: creator.displayName || creator.name,
      subtitle: creator.type,
      imageUrl: creator.avatarUrl,
      description: creator.bio?.substring(0, 200),
      relevanceScore: this.calculateRelevance(creator.name, query),
      metadata: {
        followerCount: creator.followerCount,
        totalAlbums: creator.totalAlbums,
        isVerified: creator.isVerified,
        type: creator.type,
      },
    };
  }

  private mapPlaylistToSearchResult(playlist: any, query: string): SearchResultItemDto {
    return {
      id: playlist.id,
      type: 'playlist',
      title: playlist.title,
      subtitle: `by ${playlist.user?.username}`,
      imageUrl: playlist.coverUrl,
      description: playlist.description?.substring(0, 200),
      relevanceScore: this.calculateRelevance(playlist.title, query),
      metadata: {
        followerCount: playlist.followerCount,
        episodeCount: playlist._count?.episodes || 0,
        totalDuration: playlist.totalDuration,
        userId: playlist.userId,
        userName: playlist.user?.username,
      },
    };
  }

  private calculateRelevance(title: string, query: string): number {
    if (!query) return 50;

    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();

    if (titleLower === queryLower) return 100;
    if (titleLower.startsWith(queryLower)) return 90;
    if (titleLower.includes(queryLower)) return 70;

    // Word match
    const queryWords = queryLower.split(' ');
    const matchedWords = queryWords.filter(w => titleLower.includes(w));
    return Math.round((matchedWords.length / queryWords.length) * 60);
  }

  private async saveSearchHistory(
    query: string,
    userId: string | undefined,
    resultCount: number,
  ): Promise<void> {
    try {
      await this.prisma.searchHistory.create({
        data: {
          query,
          userId,
          resultCount,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save search history: ${error.message}`);
    }
  }
}
