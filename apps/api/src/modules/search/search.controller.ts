import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { SearchService } from './search.service';
import {
  SearchQueryDto,
  SearchResultsDto,
  AutocompleteQueryDto,
  AutocompleteSuggestionDto,
  TrendingSearchDto,
  RecentSearchDto,
  DiscoverContentDto,
  BrowseCategoryDto,
  GetTrendingQueryDto,
} from './dto/search.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search content with filters' })
  @ApiResponse({ status: 200, type: SearchResultsDto })
  async search(
    @Query() query: SearchQueryDto,
    @Request() req,
  ): Promise<SearchResultsDto> {
    return this.searchService.search(query, req.user?.sub);
  }

  @Get('autocomplete')
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get autocomplete suggestions' })
  @ApiResponse({ status: 200, type: [AutocompleteSuggestionDto] })
  async autocomplete(
    @Query() query: AutocompleteQueryDto,
    @Request() req,
  ): Promise<AutocompleteSuggestionDto[]> {
    return this.searchService.autocomplete(query, req.user?.sub);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending searches' })
  @ApiResponse({ status: 200, type: [TrendingSearchDto] })
  async getTrending(
    @Query() query: GetTrendingQueryDto,
  ): Promise<TrendingSearchDto[]> {
    return this.searchService.getTrendingSearches(query);
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user recent searches' })
  @ApiResponse({ status: 200, type: [RecentSearchDto] })
  async getRecent(
    @Request() req,
    @Query('limit') limit?: number,
  ): Promise<RecentSearchDto[]> {
    return this.searchService.getRecentSearches(req.user.sub, limit);
  }

  @Delete('recent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear user recent searches' })
  @ApiResponse({ status: 204 })
  async clearRecent(@Request() req): Promise<void> {
    return this.searchService.clearRecentSearches(req.user.sub);
  }

  @Get('discover')
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get discovery content (trending, new releases, recommendations)' })
  @ApiResponse({ status: 200, type: DiscoverContentDto })
  async discover(@Request() req): Promise<DiscoverContentDto> {
    return this.searchService.discover(req.user?.sub);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all content categories with counts' })
  @ApiResponse({ status: 200, type: [BrowseCategoryDto] })
  async getCategories(): Promise<BrowseCategoryDto[]> {
    return this.searchService.getCategories();
  }

  @Get('categories/:category')
  @ApiOperation({ summary: 'Get content by category' })
  @ApiParam({ name: 'category', description: 'Category ID' })
  @ApiResponse({ status: 200, type: SearchResultsDto })
  async getCategoryContent(
    @Param('category') category: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<SearchResultsDto> {
    return this.searchService.getCategoryContent(category, page, limit);
  }
}
