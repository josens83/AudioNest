import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('library')
@Controller('library')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LibraryController {
  constructor(private libraryService: LibraryService) {}

  // Subscriptions
  @Get('subscriptions')
  @ApiOperation({ summary: 'Get subscribed albums' })
  async getSubscriptions(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.libraryService.getSubscriptions(req.user.sub, page, limit);
  }

  @Post('subscriptions/:albumId')
  @ApiOperation({ summary: 'Subscribe to album' })
  async subscribe(@Request() req, @Param('albumId') albumId: string) {
    return this.libraryService.subscribe(req.user.sub, albumId);
  }

  @Delete('subscriptions/:albumId')
  @ApiOperation({ summary: 'Unsubscribe from album' })
  async unsubscribe(@Request() req, @Param('albumId') albumId: string) {
    return this.libraryService.unsubscribe(req.user.sub, albumId);
  }

  // Likes
  @Get('likes/albums')
  @ApiOperation({ summary: 'Get liked albums' })
  async getLikedAlbums(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.libraryService.getLikes(req.user.sub, 'ALBUM', page, limit);
  }

  @Get('likes/episodes')
  @ApiOperation({ summary: 'Get liked episodes' })
  async getLikedEpisodes(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.libraryService.getLikes(req.user.sub, 'EPISODE', page, limit);
  }

  @Post('likes/albums/:albumId')
  @ApiOperation({ summary: 'Like an album' })
  async likeAlbum(@Request() req, @Param('albumId') albumId: string) {
    return this.libraryService.like(req.user.sub, 'ALBUM', albumId);
  }

  @Post('likes/episodes/:episodeId')
  @ApiOperation({ summary: 'Like an episode' })
  async likeEpisode(@Request() req, @Param('episodeId') episodeId: string) {
    return this.libraryService.like(req.user.sub, 'EPISODE', episodeId);
  }

  @Delete('likes/albums/:albumId')
  @ApiOperation({ summary: 'Unlike an album' })
  async unlikeAlbum(@Request() req, @Param('albumId') albumId: string) {
    return this.libraryService.unlike(req.user.sub, 'ALBUM', albumId);
  }

  @Delete('likes/episodes/:episodeId')
  @ApiOperation({ summary: 'Unlike an episode' })
  async unlikeEpisode(@Request() req, @Param('episodeId') episodeId: string) {
    return this.libraryService.unlike(req.user.sub, 'EPISODE', episodeId);
  }

  // Downloads
  @Get('downloads')
  @ApiOperation({ summary: 'Get downloads' })
  async getDownloads(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.libraryService.getDownloads(req.user.sub, page, limit);
  }

  @Delete('downloads/:episodeId')
  @ApiOperation({ summary: 'Delete a download' })
  async deleteDownload(@Request() req, @Param('episodeId') episodeId: string) {
    return this.libraryService.deleteDownload(req.user.sub, episodeId);
  }
}
