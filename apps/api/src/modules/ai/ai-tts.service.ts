import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TTSVoice,
  TTSStyle,
  TextToSpeechDto,
  TTSResponseDto,
  TTSVoiceInfoDto,
} from './dto/ai.dto';
import { AppLoggerService } from '../../common/logger';

interface TTSUsage {
  userId: string;
  charactersUsed: number;
  date: string;
}

@Injectable()
export class AITTSService {
  private readonly voiceInfos: TTSVoiceInfoDto[] = [
    {
      id: TTSVoice.KOREAN_FEMALE_1,
      name: '선희',
      language: 'ko-KR',
      gender: 'female',
      supportedStyles: [TTSStyle.NEUTRAL, TTSStyle.CHEERFUL, TTSStyle.SAD, TTSStyle.NARRATION],
      sampleUrl: '/audio/samples/ko-kr-sunhi.mp3',
    },
    {
      id: TTSVoice.KOREAN_FEMALE_2,
      name: '지민',
      language: 'ko-KR',
      gender: 'female',
      supportedStyles: [TTSStyle.NEUTRAL, TTSStyle.CHEERFUL, TTSStyle.NEWSCAST],
      sampleUrl: '/audio/samples/ko-kr-jimin.mp3',
    },
    {
      id: TTSVoice.KOREAN_MALE_1,
      name: '인준',
      language: 'ko-KR',
      gender: 'male',
      supportedStyles: [TTSStyle.NEUTRAL, TTSStyle.NARRATION, TTSStyle.NEWSCAST],
      sampleUrl: '/audio/samples/ko-kr-injoon.mp3',
    },
    {
      id: TTSVoice.KOREAN_MALE_2,
      name: '봉진',
      language: 'ko-KR',
      gender: 'male',
      supportedStyles: [TTSStyle.NEUTRAL, TTSStyle.CHEERFUL],
      sampleUrl: '/audio/samples/ko-kr-bongjin.mp3',
    },
    {
      id: TTSVoice.ENGLISH_FEMALE_1,
      name: 'Jenny',
      language: 'en-US',
      gender: 'female',
      supportedStyles: [TTSStyle.NEUTRAL, TTSStyle.CHEERFUL, TTSStyle.SAD, TTSStyle.NARRATION, TTSStyle.NEWSCAST],
      sampleUrl: '/audio/samples/en-us-jenny.mp3',
    },
    {
      id: TTSVoice.ENGLISH_MALE_1,
      name: 'Guy',
      language: 'en-US',
      gender: 'male',
      supportedStyles: [TTSStyle.NEUTRAL, TTSStyle.NEWSCAST, TTSStyle.NARRATION],
      sampleUrl: '/audio/samples/en-us-guy.mp3',
    },
  ];

  // Daily usage limits per subscription tier
  private readonly usageLimits = {
    FREE: 1000,      // 1,000 characters per day
    VIP: 50000,      // 50,000 characters per day
    SVIP: 500000,    // 500,000 characters per day
  };

  // In-memory usage tracking (would use Redis in production)
  private dailyUsage: Map<string, TTSUsage> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('AITTSService');
  }

  async textToSpeech(
    userId: string,
    dto: TextToSpeechDto,
  ): Promise<TTSResponseDto> {
    // Check usage limits
    await this.checkUsageLimit(userId, dto.text.length);

    const voice = dto.voice ?? TTSVoice.KOREAN_FEMALE_1;
    const style = dto.style ?? TTSStyle.NEUTRAL;
    const speed = dto.speed ?? 1.0;
    const pitch = dto.pitch ?? 1.0;
    const format = dto.format ?? 'mp3';

    // Validate style for selected voice
    const voiceInfo = this.voiceInfos.find((v) => v.id === voice);
    if (voiceInfo && !voiceInfo.supportedStyles.includes(style)) {
      throw new BadRequestException(
        `Style "${style}" is not supported for voice "${voice}"`,
      );
    }

    // In a real implementation, this would call an external TTS API
    // (e.g., Azure Cognitive Services, Google Cloud TTS, or Naver CLOVA)
    const audioUrl = await this.generateTTS(dto.text, voice, style, speed, pitch, format);

    // Calculate estimated duration (rough estimate: ~150 words per minute)
    const wordCount = dto.text.split(/\s+/).length;
    const baseDuration = (wordCount / 150) * 60; // in seconds
    const duration = Math.round(baseDuration / speed);

    // Update usage
    await this.recordUsage(userId, dto.text.length);

    this.logger.log(
      `TTS generated for user ${userId}: ${dto.text.length} characters`,
    );

    return {
      audioUrl,
      duration,
      characterCount: dto.text.length,
      voice,
      createdAt: new Date(),
    };
  }

  async getAvailableVoices(language?: string): Promise<TTSVoiceInfoDto[]> {
    if (language) {
      return this.voiceInfos.filter((v) => v.language.startsWith(language));
    }
    return this.voiceInfos;
  }

  async getUsageInfo(userId: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
    resetsAt: Date;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: true },
    });

    const tier = user?.subscription ?? 'FREE';
    const limit = this.usageLimits[tier as keyof typeof this.usageLimits] ?? this.usageLimits.FREE;

    const today = new Date().toISOString().split('T')[0];
    const usage = this.dailyUsage.get(`${userId}:${today}`);
    const used = usage?.charactersUsed ?? 0;

    // Calculate reset time (midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetsAt: tomorrow,
    };
  }

  async batchTextToSpeech(
    userId: string,
    texts: string[],
    options: Partial<TextToSpeechDto> = {},
  ): Promise<TTSResponseDto[]> {
    const totalCharacters = texts.reduce((sum, t) => sum + t.length, 0);
    await this.checkUsageLimit(userId, totalCharacters);

    const results: TTSResponseDto[] = [];

    for (const text of texts) {
      const result = await this.textToSpeech(userId, {
        text,
        ...options,
      });
      results.push(result);
    }

    return results;
  }

  async convertArticleToAudio(
    userId: string,
    articleContent: string,
    options: {
      voice?: TTSVoice;
      style?: TTSStyle;
      splitByParagraphs?: boolean;
    } = {},
  ): Promise<{
    audioUrl: string;
    totalDuration: number;
    chapters: Array<{ title: string; startTime: number; endTime: number }>;
  }> {
    // Split article into manageable chunks
    const paragraphs = articleContent.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > 4000) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    // Generate audio for each chunk
    const audioResults = await this.batchTextToSpeech(userId, chunks, {
      voice: options.voice,
      style: options.style ?? TTSStyle.NARRATION,
    });

    // Combine results
    let totalDuration = 0;
    const chapters: Array<{ title: string; startTime: number; endTime: number }> = [];

    for (let i = 0; i < audioResults.length; i++) {
      const startTime = totalDuration;
      totalDuration += audioResults[i].duration;
      chapters.push({
        title: `Part ${i + 1}`,
        startTime,
        endTime: totalDuration,
      });
    }

    // In a real implementation, we would concatenate the audio files
    const combinedAudioUrl = `/audio/tts/combined/${Date.now()}.mp3`;

    return {
      audioUrl: combinedAudioUrl,
      totalDuration,
      chapters,
    };
  }

  private async generateTTS(
    text: string,
    voice: TTSVoice,
    style: TTSStyle,
    speed: number,
    pitch: number,
    format: string,
  ): Promise<string> {
    // In a real implementation, this would call an external TTS API
    // For now, return a placeholder URL
    const timestamp = Date.now();
    const hash = Buffer.from(text.slice(0, 50)).toString('base64').replace(/[^a-zA-Z0-9]/g, '');

    return `/audio/tts/${voice}/${hash}_${timestamp}.${format}`;
  }

  private async checkUsageLimit(userId: string, characterCount: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: true },
    });

    const tier = user?.subscription ?? 'FREE';
    const limit = this.usageLimits[tier as keyof typeof this.usageLimits] ?? this.usageLimits.FREE;

    const today = new Date().toISOString().split('T')[0];
    const usageKey = `${userId}:${today}`;
    const currentUsage = this.dailyUsage.get(usageKey);
    const used = currentUsage?.charactersUsed ?? 0;

    if (used + characterCount > limit) {
      throw new BadRequestException(
        `TTS usage limit exceeded. Used: ${used}, Limit: ${limit}, Requested: ${characterCount}`,
      );
    }
  }

  private async recordUsage(userId: string, characterCount: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `${userId}:${today}`;
    const currentUsage = this.dailyUsage.get(usageKey);

    this.dailyUsage.set(usageKey, {
      userId,
      charactersUsed: (currentUsage?.charactersUsed ?? 0) + characterCount,
      date: today,
    });
  }
}
