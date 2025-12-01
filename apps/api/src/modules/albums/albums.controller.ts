import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AlbumsService } from './albums.service';
import { Category, AccessType } from '@audionest/database';

@ApiTags('albums')
@Controller('albums')
export class AlbumsController {
  constructor(private albumsService: AlbumsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all albums with pagination' })
  @ApiQuery({ name: 'category', required: false, enum: Category })
  @ApiQuery({ name: 'accessType', required: false, enum: AccessType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('category') category?: Category,
    @Query('accessType') accessType?: AccessType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.albumsService.findAll({ category, accessType, page, limit });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured albums' })
  async getFeatured(@Query('limit') limit?: number) {
    return this.albumsService.getFeatured(limit);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending albums' })
  async getTrending(@Query('limit') limit?: number) {
    return this.albumsService.getTrending(limit);
  }

  @Get('new')
  @ApiOperation({ summary: 'Get new releases' })
  async getNewReleases(@Query('limit') limit?: number) {
    return this.albumsService.getNewReleases(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get album by ID' })
  async findOne(@Param('id') id: string) {
    return this.albumsService.findById(id);
  }
}
