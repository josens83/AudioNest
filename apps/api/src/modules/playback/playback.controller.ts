import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlaybackService } from './playback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaveProgressDto, SaveSyncDto } from './dto/playback.dto';

@ApiTags('playback')
@Controller('playback')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlaybackController {
  constructor(private playbackService: PlaybackService) {}

  @Post('progress')
  @ApiOperation({ summary: 'Save playback progress' })
  async saveProgress(@Request() req, @Body() dto: SaveProgressDto) {
    return this.playbackService.saveProgress(
      req.user.sub,
      dto.episodeId,
      dto.position,
      dto.completed,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get listening history' })
  async getHistory(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.playbackService.getHistory(req.user.sub, page, limit);
  }

  @Get('sync')
  @ApiOperation({ summary: 'Get sync state' })
  async getSyncState(@Request() req) {
    return this.playbackService.getSyncState(req.user.sub);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Save sync state' })
  async saveSyncState(@Request() req, @Body() dto: SaveSyncDto) {
    return this.playbackService.saveSyncState(req.user.sub, dto);
  }
}
