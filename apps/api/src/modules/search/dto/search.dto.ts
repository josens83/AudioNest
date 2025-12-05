import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum SearchType {
  ALL = 'all',
  ALBUM = 'album',
  EPISODE = 'episode',
  CREATOR = 'creator',
  PLAYLIST = 'playlist',
}

export enum SearchSortBy {
  RELEVANCE = 'relevance',
  POPULARITY = 'popularity',
  RECENT = 'recent',
  RATING = 'rating',
}

export enum ContentCategory {
  AUDIOBOOK_FICTION = 'AUDIOBOOK_FICTION',
  AUDIOBOOK_NONFICTION = 'AUDIOBOOK_NONFICTION',
  AUDIOBOOK_SELFHELP = 'AUDIOBOOK_SELFHELP',
  AUDIOBOOK_BUSINESS = 'AUDIOBOOK_BUSINESS',
  PODCAST_TALK = 'PODCAST_TALK',
  PODCAST_COMEDY = 'PODCAST_COMEDY',
  PODCAST_NEWS = 'PODCAST_NEWS',
  PODCAST_TRUE_CRIME = 'PODCAST_TRUE_CRIME',
  COURSE_LANGUAGE = 'COURSE_LANGUAGE',
  COURSE_SKILL = 'COURSE_SKILL',
  KIDS = 'KIDS',
  ASMR = 'ASMR',
  SLEEP = 'SLEEP',
  MUSIC = 'MUSIC',
}

export enum ContentType {
  AUDIOBOOK = 'AUDIOBOOK',
  PODCAST = 'PODCAST',
  COURSE = 'COURSE',
  ASMR = 'ASMR',
  MUSIC = 'MUSIC',
  RADIO = 'RADIO',
}

export enum AccessType {
  FREE = 'FREE',
  FREEMIUM = 'FREEMIUM',
  VIP = 'VIP',
  PAID = 'PAID',
}

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query string' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q: string;

  @ApiPropertyOptional({ enum: SearchType, default: SearchType.ALL })
  @IsEnum(SearchType)
  @IsOptional()
  type?: SearchType;

  @ApiPropertyOptional({ enum: SearchSortBy, default: SearchSortBy.RELEVANCE })
  @IsEnum(SearchSortBy)
  @IsOptional()
  sortBy?: SearchSortBy;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  // Filters
  @ApiPropertyOptional({ enum: ContentCategory, isArray: true })
  @IsArray()
  @IsEnum(ContentCategory, { each: true })
  @IsOptional()
  categories?: ContentCategory[];

  @ApiPropertyOptional({ enum: ContentType, isArray: true })
  @IsArray()
  @IsEnum(ContentType, { each: true })
  @IsOptional()
  contentTypes?: ContentType[];

  @ApiPropertyOptional({ enum: AccessType, isArray: true })
  @IsArray()
  @IsEnum(AccessType, { each: true })
  @IsOptional()
  accessTypes?: AccessType[];

  @ApiPropertyOptional({ description: 'Minimum rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @ApiPropertyOptional({ description: 'Minimum duration in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Maximum duration in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'Only show completed albums' })
  @IsBoolean()
  @IsOptional()
  completedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Only show exclusive content' })
  @IsBoolean()
  @IsOptional()
  exclusiveOnly?: boolean;

  @ApiPropertyOptional({ description: 'Include only featured content' })
  @IsBoolean()
  @IsOptional()
  featuredOnly?: boolean;
}

export class AutocompleteQueryDto {
  @ApiProperty({ description: 'Partial query for autocomplete' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q: string;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;
}

export class SearchResultItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string; // album, episode, creator, playlist

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  subtitle?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  relevanceScore: number;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class SearchResultsDto {
  @ApiProperty({ type: [SearchResultItemDto] })
  items: SearchResultItemDto[];

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  hasMore: boolean;

  @ApiProperty()
  query: string;

  @ApiPropertyOptional({ type: Object })
  facets?: {
    categories: Record<string, number>;
    contentTypes: Record<string, number>;
    accessTypes: Record<string, number>;
  };
}

export class AutocompleteSuggestionDto {
  @ApiProperty()
  text: string;

  @ApiProperty()
  type: 'query' | 'album' | 'creator' | 'category';

  @ApiPropertyOptional()
  id?: string;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class TrendingSearchDto {
  @ApiProperty()
  query: string;

  @ApiProperty()
  searchCount: number;

  @ApiPropertyOptional()
  trend?: 'up' | 'down' | 'stable';
}

export class RecentSearchDto {
  @ApiProperty()
  query: string;

  @ApiProperty()
  searchedAt: Date;

  @ApiPropertyOptional()
  resultCount?: number;
}

export class DiscoverContentDto {
  @ApiProperty({ type: [SearchResultItemDto] })
  trending: SearchResultItemDto[];

  @ApiProperty({ type: [SearchResultItemDto] })
  newReleases: SearchResultItemDto[];

  @ApiProperty({ type: [SearchResultItemDto] })
  recommended: SearchResultItemDto[];

  @ApiProperty({ type: [SearchResultItemDto] })
  popular: SearchResultItemDto[];

  @ApiPropertyOptional({ type: [SearchResultItemDto] })
  continueListening?: SearchResultItemDto[];

  @ApiPropertyOptional({ type: [SearchResultItemDto] })
  basedOnHistory?: SearchResultItemDto[];
}

export class BrowseCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  nameKo: string;

  @ApiPropertyOptional()
  iconUrl?: string;

  @ApiProperty()
  contentCount: number;

  @ApiPropertyOptional()
  subcategories?: string[];
}

export class GetTrendingQueryDto {
  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ContentCategory })
  @IsEnum(ContentCategory)
  @IsOptional()
  category?: ContentCategory;

  @ApiPropertyOptional({ default: '24h', description: 'Period: 24h, 7d, 30d' })
  @IsString()
  @IsOptional()
  period?: string;
}
