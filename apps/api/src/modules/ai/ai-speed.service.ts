import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SpeedMode,
  UpdatePlaybackSpeedDto,
  PlaybackSpeedResponseDto,
  SmartSpeedAnalysisDto,
} from './dto/ai.dto';
import { AppLoggerService } from '../../common/logger';

interface UserSpeedSettings {
  speed: number;
  mode: SpeedMode;
  pitchCorrection: boolean;
  silenceThreshold?: number;
}

@Injectable()
export class AISpeedService {
  // In-memory cache for user speed settings (would use Redis in production)
  private userSpeedSettings: Map<string, UserSpeedSettings> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('AISpeedService');
  }

  async updatePlaybackSpeed(
    userId: string,
    dto: UpdatePlaybackSpeedDto,
  ): Promise<PlaybackSpeedResponseDto> {
    const settings: UserSpeedSettings = {
      speed: dto.speed,
      mode: dto.mode ?? SpeedMode.NORMAL,
      pitchCorrection: dto.pitchCorrection ?? true,
      silenceThreshold: dto.silenceThreshold,
    };

    this.userSpeedSettings.set(userId, settings);

    // Save to user preferences
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          playbackSpeed: settings,
        },
      },
    });

    // Calculate estimated time saved based on speed
    const estimatedTimeSaved = this.calculateTimeSaved(dto.speed);

    this.logger.debug(`User ${userId} updated playback speed to ${dto.speed}x`);

    return {
      speed: settings.speed,
      mode: settings.mode,
      pitchCorrection: settings.pitchCorrection,
      silenceThreshold: settings.silenceThreshold,
      estimatedTimeSaved,
    };
  }

  async getPlaybackSpeed(userId: string): Promise<PlaybackSpeedResponseDto> {
    // Check in-memory cache first
    let settings = this.userSpeedSettings.get(userId);

    if (!settings) {
      // Load from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });

      const prefs = user?.preferences as Record<string, unknown> | null;
      const playbackSpeed = prefs?.playbackSpeed as UserSpeedSettings | undefined;

      settings = playbackSpeed ?? {
        speed: 1.0,
        mode: SpeedMode.NORMAL,
        pitchCorrection: true,
      };

      this.userSpeedSettings.set(userId, settings);
    }

    return {
      speed: settings.speed,
      mode: settings.mode,
      pitchCorrection: settings.pitchCorrection,
      silenceThreshold: settings.silenceThreshold,
      estimatedTimeSaved: this.calculateTimeSaved(settings.speed),
    };
  }

  async analyzeForSmartSpeed(episodeId: string): Promise<SmartSpeedAnalysisDto> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { album: true },
    });

    if (!episode) {
      throw new Error('Episode not found');
    }

    // In a real implementation, this would analyze the audio file
    // For now, we'll generate simulated analysis based on content type
    const contentType = episode.album.contentType;
    const duration = episode.duration;

    // Simulate audio analysis
    const analysis = this.simulateAudioAnalysis(contentType, duration);

    return {
      episodeId,
      recommendedSpeed: analysis.recommendedSpeed,
      complexityScore: analysis.complexityScore,
      speechRate: analysis.speechRate,
      silencePercentage: analysis.silencePercentage,
      segments: analysis.segments,
    };
  }

  async getSmartSpeedForContent(
    userId: string,
    episodeId: string,
  ): Promise<{ recommendedSpeed: number; reason: string }> {
    // Get user's listening history and preferences
    const [user, episode, listeningHistory] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true, totalListenTime: true },
      }),
      this.prisma.episode.findUnique({
        where: { id: episodeId },
        include: { album: true },
      }),
      this.prisma.listeningHistory.findMany({
        where: { userId },
        orderBy: { lastPlayedAt: 'desc' },
        take: 50,
        include: { episode: { include: { album: true } } },
      }),
    ]);

    if (!episode) {
      return { recommendedSpeed: 1.0, reason: 'Default speed' };
    }

    // Calculate user's average preferred speed for this content type
    const contentType = episode.album.contentType;
    const userPrefs = user?.preferences as Record<string, unknown> | null;

    // Analyze user's behavior
    const behaviorAnalysis = this.analyzeUserBehavior(listeningHistory, contentType);

    // Calculate recommended speed based on:
    // 1. Content type (audiobooks slower, podcasts faster)
    // 2. User's completion rate at different speeds
    // 3. Content complexity
    let recommendedSpeed = 1.0;
    let reason = '';

    switch (contentType) {
      case 'AUDIOBOOK':
        recommendedSpeed = 1.25;
        reason = 'Audiobooks benefit from slightly faster speeds for engagement';
        break;
      case 'PODCAST':
        recommendedSpeed = 1.5;
        reason = 'Conversational content is easily understood at higher speeds';
        break;
      case 'COURSE':
        recommendedSpeed = 1.0;
        reason = 'Educational content is best at normal speed for comprehension';
        break;
      case 'ASMR':
        recommendedSpeed = 1.0;
        reason = 'ASMR is best experienced at normal speed';
        break;
      default:
        recommendedSpeed = 1.0;
        reason = 'Default recommendation';
    }

    // Adjust based on user behavior
    if (behaviorAnalysis.averageCompletionRate > 0.8) {
      recommendedSpeed += 0.25;
      reason += '. You typically complete content, so a faster speed may work well.';
    }

    // Cap the speed
    recommendedSpeed = Math.min(2.0, Math.max(0.75, recommendedSpeed));

    return { recommendedSpeed, reason };
  }

  getAvailableSpeeds(): number[] {
    return [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  }

  private calculateTimeSaved(speed: number): number {
    // Calculate time saved per hour of content
    if (speed <= 1.0) return 0;
    const hourInSeconds = 3600;
    const actualPlayTime = hourInSeconds / speed;
    return Math.round(hourInSeconds - actualPlayTime);
  }

  private simulateAudioAnalysis(
    contentType: string,
    duration: number,
  ): {
    recommendedSpeed: number;
    complexityScore: number;
    speechRate: number;
    silencePercentage: number;
    segments: SmartSpeedAnalysisDto['segments'];
  } {
    // Simulate analysis based on content type
    const baseComplexity = contentType === 'COURSE' ? 7 : contentType === 'AUDIOBOOK' ? 5 : 4;
    const baseSpeechRate = contentType === 'PODCAST' ? 160 : 140;

    // Generate sample segments
    const segmentCount = Math.floor(duration / 300); // One segment per 5 minutes
    const segments: SmartSpeedAnalysisDto['segments'] = [];

    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * 300;
      const endTime = Math.min((i + 1) * 300, duration);
      const type = Math.random() > 0.9 ? 'silence' : Math.random() > 0.95 ? 'music' : 'speech';

      segments.push({
        startTime,
        endTime,
        type: type as 'speech' | 'silence' | 'music',
        recommendedSpeed: type === 'speech' ? 1.25 : type === 'silence' ? 2.0 : 1.0,
      });
    }

    return {
      recommendedSpeed: contentType === 'PODCAST' ? 1.5 : 1.25,
      complexityScore: baseComplexity + Math.floor(Math.random() * 3),
      speechRate: baseSpeechRate + Math.floor(Math.random() * 40),
      silencePercentage: 5 + Math.floor(Math.random() * 10),
      segments,
    };
  }

  private analyzeUserBehavior(
    history: Array<{ completed: boolean; progress: number }>,
    contentType: string,
  ): { averageCompletionRate: number } {
    if (history.length === 0) {
      return { averageCompletionRate: 0 };
    }

    const completedCount = history.filter((h) => h.completed).length;
    return {
      averageCompletionRate: completedCount / history.length,
    };
  }
}
