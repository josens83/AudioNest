import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AISpeedService } from './ai-speed.service';
import { AITTSService } from './ai-tts.service';
import { AIRecommendationService } from './ai-recommendation.service';
import {
  UpdatePlaybackSpeedDto,
  PlaybackSpeedResponseDto,
  SmartSpeedAnalysisDto,
  TextToSpeechDto,
  TTSResponseDto,
  TTSVoiceInfoDto,
  GetRecommendationsDto,
  RecommendationResponseDto,
  UserPreferencesDto,
} from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, RequireSubscription, SubscriptionLevel, SubscriptionGuard } from '../../common';

@ApiTags('AI Features')
@Controller('ai')
export class AIController {
  constructor(
    private readonly speedService: AISpeedService,
    private readonly ttsService: AITTSService,
    private readonly recommendationService: AIRecommendationService,
  ) {}

  // ============================================
  // Speed Control Endpoints
  // ============================================

  @Get('speed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current playback speed settings' })
  @ApiResponse({ status: 200, type: PlaybackSpeedResponseDto })
  async getPlaybackSpeed(
    @CurrentUser('sub') userId: string,
  ): Promise<PlaybackSpeedResponseDto> {
    return this.speedService.getPlaybackSpeed(userId);
  }

  @Post('speed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update playback speed settings' })
  @ApiResponse({ status: 200, type: PlaybackSpeedResponseDto })
  async updatePlaybackSpeed(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdatePlaybackSpeedDto,
  ): Promise<PlaybackSpeedResponseDto> {
    return this.speedService.updatePlaybackSpeed(userId, dto);
  }

  @Get('speed/available')
  @ApiOperation({ summary: 'Get available playback speeds' })
  @ApiResponse({ status: 200, type: [Number] })
  getAvailableSpeeds(): number[] {
    return this.speedService.getAvailableSpeeds();
  }

  @Get('speed/smart/:episodeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get smart speed recommendation for episode' })
  @ApiResponse({ status: 200 })
  async getSmartSpeed(
    @CurrentUser('sub') userId: string,
    @Param('episodeId') episodeId: string,
  ): Promise<{ recommendedSpeed: number; reason: string }> {
    return this.speedService.getSmartSpeedForContent(userId, episodeId);
  }

  @Get('speed/analyze/:episodeId')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireSubscription(SubscriptionLevel.VIP, SubscriptionLevel.SVIP)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze episode for smart speed (VIP+)' })
  @ApiResponse({ status: 200, type: SmartSpeedAnalysisDto })
  async analyzeForSmartSpeed(
    @Param('episodeId') episodeId: string,
  ): Promise<SmartSpeedAnalysisDto> {
    return this.speedService.analyzeForSmartSpeed(episodeId);
  }

  // ============================================
  // TTS Endpoints
  // ============================================

  @Get('tts/voices')
  @ApiOperation({ summary: 'Get available TTS voices' })
  @ApiQuery({ name: 'language', required: false, example: 'ko' })
  @ApiResponse({ status: 200, type: [TTSVoiceInfoDto] })
  async getVoices(
    @Query('language') language?: string,
  ): Promise<TTSVoiceInfoDto[]> {
    return this.ttsService.getAvailableVoices(language);
  }

  @Post('tts/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate speech from text' })
  @ApiResponse({ status: 200, type: TTSResponseDto })
  async textToSpeech(
    @CurrentUser('sub') userId: string,
    @Body() dto: TextToSpeechDto,
  ): Promise<TTSResponseDto> {
    return this.ttsService.textToSpeech(userId, dto);
  }

  @Get('tts/usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get TTS usage info' })
  @ApiResponse({ status: 200 })
  async getTTSUsage(
    @CurrentUser('sub') userId: string,
  ): Promise<{
    used: number;
    limit: number;
    remaining: number;
    resetsAt: Date;
  }> {
    return this.ttsService.getUsageInfo(userId);
  }

  @Post('tts/article')
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireSubscription(SubscriptionLevel.VIP, SubscriptionLevel.SVIP)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert article to audio (VIP+)' })
  @ApiResponse({ status: 200 })
  async convertArticle(
    @CurrentUser('sub') userId: string,
    @Body() body: { content: string; voice?: string; style?: string },
  ): Promise<{
    audioUrl: string;
    totalDuration: number;
    chapters: Array<{ title: string; startTime: number; endTime: number }>;
  }> {
    return this.ttsService.convertArticleToAudio(userId, body.content, {
      voice: body.voice as never,
      style: body.style as never,
    });
  }

  // ============================================
  // Recommendation Endpoints
  // ============================================

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get content recommendations' })
  @ApiResponse({ status: 200, type: RecommendationResponseDto })
  async getRecommendations(
    @CurrentUser('sub') userId: string,
    @Query() dto: GetRecommendationsDto,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations(userId, dto);
  }

  @Get('recommendations/for-you')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized For You feed' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async getForYouFeed(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    sections: Array<{
      title: string;
      type: string;
      items: unknown[];
    }>;
  }> {
    return this.recommendationService.getForYouFeed(
      userId,
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get('recommendations/similar/:contentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get similar content recommendations' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: RecommendationResponseDto })
  async getSimilarContent(
    @CurrentUser('sub') userId: string,
    @Param('contentId') contentId: string,
    @Query('limit') limit?: number,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations(userId, {
      type: 'SIMILAR' as never,
      referenceId: contentId,
      limit: limit ?? 10,
    });
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user listening preferences' })
  @ApiResponse({ status: 200, type: UserPreferencesDto })
  async getUserPreferences(
    @CurrentUser('sub') userId: string,
  ): Promise<UserPreferencesDto> {
    return this.recommendationService.getUserPreferences(userId);
  }
}
