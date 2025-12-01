import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EpisodesService } from './episodes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';

@ApiTags('episodes')
@Controller('episodes')
export class EpisodesController {
  constructor(private episodesService: EpisodesService) {}

  @Get('album/:albumId')
  @ApiOperation({ summary: 'Get episodes by album' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByAlbum(
    @Param('albumId') albumId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.episodesService.findByAlbum(albumId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get episode by ID' })
  async findOne(@Param('id') id: string) {
    return this.episodesService.findById(id);
  }

  @Get(':id/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stream URL for episode' })
  async getStreamUrl(@Param('id') id: string, @Request() req) {
    return this.episodesService.getStreamUrl(
      id,
      req.user.subscription,
      req.user.sub,
    );
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get download URL for episode (VIP only)' })
  async getDownloadUrl(@Param('id') id: string, @Request() req) {
    return this.episodesService.getDownloadUrl(
      id,
      req.user.subscription,
      req.user.sub,
    );
  }
}
