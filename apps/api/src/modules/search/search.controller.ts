import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search content' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'album', 'episode', 'creator'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') query: string,
    @Query('type') type?: 'all' | 'album' | 'episode' | 'creator',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.search(query, { type, page, limit });
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular searches' })
  async getPopular(@Query('limit') limit?: number) {
    return this.searchService.getPopularSearches(limit);
  }
}
