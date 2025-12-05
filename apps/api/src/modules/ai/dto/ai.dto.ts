import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

// ============================================
// AI Speed Control DTOs
// ============================================

export enum SpeedMode {
  NORMAL = 'NORMAL',
  SMART = 'SMART', // AI adjusts speed based on content
  SILENCE_SKIP = 'SILENCE_SKIP', // Skip silent parts
  CUSTOM = 'CUSTOM',
}

export class UpdatePlaybackSpeedDto {
  @ApiProperty({ minimum: 0.5, maximum: 3.0 })
  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  speed: number;

  @ApiPropertyOptional({ enum: SpeedMode, default: SpeedMode.NORMAL })
  @IsEnum(SpeedMode)
  @IsOptional()
  mode?: SpeedMode;

  @ApiPropertyOptional({ description: 'Enable pitch correction' })
  @IsBoolean()
  @IsOptional()
  pitchCorrection?: boolean;

  @ApiPropertyOptional({ description: 'Silence threshold in ms (for SILENCE_SKIP)' })
  @IsNumber()
  @Min(100)
  @Max(2000)
  @IsOptional()
  silenceThreshold?: number;
}

export class PlaybackSpeedResponseDto {
  @ApiProperty()
  speed: number;

  @ApiProperty({ enum: SpeedMode })
  mode: SpeedMode;

  @ApiProperty()
  pitchCorrection: boolean;

  @ApiPropertyOptional()
  silenceThreshold?: number;

  @ApiProperty({ description: 'Estimated time saved in seconds' })
  estimatedTimeSaved: number;
}

export class SmartSpeedAnalysisDto {
  @ApiProperty()
  episodeId: string;

  @ApiProperty({ description: 'Recommended playback speed' })
  recommendedSpeed: number;

  @ApiProperty({ description: 'Content complexity score (1-10)' })
  complexityScore: number;

  @ApiProperty({ description: 'Speech rate (words per minute)' })
  speechRate: number;

  @ApiProperty({ description: 'Silence percentage' })
  silencePercentage: number;

  @ApiProperty()
  segments: Array<{
    startTime: number;
    endTime: number;
    type: 'speech' | 'silence' | 'music';
    recommendedSpeed: number;
  }>;
}

// ============================================
// AI TTS (Text-to-Speech) DTOs
// ============================================

export enum TTSVoice {
  KOREAN_FEMALE_1 = 'ko-KR-SunHiNeural',
  KOREAN_FEMALE_2 = 'ko-KR-JiMinNeural',
  KOREAN_MALE_1 = 'ko-KR-InJoonNeural',
  KOREAN_MALE_2 = 'ko-KR-BongJinNeural',
  ENGLISH_FEMALE_1 = 'en-US-JennyNeural',
  ENGLISH_MALE_1 = 'en-US-GuyNeural',
}

export enum TTSStyle {
  NEUTRAL = 'neutral',
  CHEERFUL = 'cheerful',
  SAD = 'sad',
  ANGRY = 'angry',
  FEARFUL = 'fearful',
  NEWSCAST = 'newscast',
  NARRATION = 'narration-professional',
}

export class TextToSpeechDto {
  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  text: string;

  @ApiPropertyOptional({ enum: TTSVoice, default: TTSVoice.KOREAN_FEMALE_1 })
  @IsEnum(TTSVoice)
  @IsOptional()
  voice?: TTSVoice;

  @ApiPropertyOptional({ enum: TTSStyle, default: TTSStyle.NEUTRAL })
  @IsEnum(TTSStyle)
  @IsOptional()
  style?: TTSStyle;

  @ApiPropertyOptional({ minimum: 0.5, maximum: 2.0, default: 1.0 })
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ minimum: 0.5, maximum: 2.0, default: 1.0 })
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  @IsOptional()
  pitch?: number;

  @ApiPropertyOptional({ description: 'Output format', default: 'mp3' })
  @IsString()
  @IsOptional()
  format?: string;
}

export class TTSResponseDto {
  @ApiProperty()
  audioUrl: string;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  characterCount: number;

  @ApiProperty()
  voice: TTSVoice;

  @ApiProperty()
  createdAt: Date;
}

export class TTSVoiceInfoDto {
  @ApiProperty()
  id: TTSVoice;

  @ApiProperty()
  name: string;

  @ApiProperty()
  language: string;

  @ApiProperty()
  gender: 'female' | 'male';

  @ApiProperty()
  supportedStyles: TTSStyle[];

  @ApiProperty()
  sampleUrl: string;
}

// ============================================
// AI Recommendation DTOs
// ============================================

export enum RecommendationType {
  PERSONALIZED = 'PERSONALIZED',
  SIMILAR = 'SIMILAR',
  TRENDING = 'TRENDING',
  CATEGORY = 'CATEGORY',
  MOOD = 'MOOD',
  CONTINUE_LISTENING = 'CONTINUE_LISTENING',
}

export class GetRecommendationsDto {
  @ApiPropertyOptional({ enum: RecommendationType, default: RecommendationType.PERSONALIZED })
  @IsEnum(RecommendationType)
  @IsOptional()
  type?: RecommendationType;

  @ApiPropertyOptional({ description: 'Reference content ID for SIMILAR type' })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Category for CATEGORY type' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Mood tags for MOOD type' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mood?: string[];

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}

export class RecommendedContentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: 'album' | 'episode' | 'playlist';

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  subtitle?: string;

  @ApiProperty()
  coverUrl: string;

  @ApiProperty()
  creatorName: string;

  @ApiProperty({ description: 'Relevance score (0-100)' })
  score: number;

  @ApiProperty({ description: 'Why this was recommended' })
  reason: string;

  @ApiPropertyOptional()
  duration?: number;

  @ApiPropertyOptional()
  episodeCount?: number;
}

export class RecommendationResponseDto {
  @ApiProperty({ enum: RecommendationType })
  type: RecommendationType;

  @ApiProperty({ type: [RecommendedContentDto] })
  items: RecommendedContentDto[];

  @ApiProperty()
  generatedAt: Date;

  @ApiPropertyOptional()
  nextRefreshAt?: Date;
}

export class UserPreferencesDto {
  @ApiProperty()
  favoriteCategories: string[];

  @ApiProperty()
  preferredDuration: { min: number; max: number };

  @ApiProperty()
  listenTimes: { morning: number; afternoon: number; evening: number; night: number };

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  avgSessionLength: number;
}

// ============================================
// AI Content Analysis DTOs
// ============================================

export class ContentAnalysisDto {
  @ApiProperty()
  contentId: string;

  @ApiProperty()
  contentType: 'album' | 'episode';

  @ApiProperty({ description: 'Auto-generated tags' })
  tags: string[];

  @ApiProperty({ description: 'Mood/atmosphere tags' })
  moodTags: string[];

  @ApiProperty({ description: 'Content complexity (1-10)' })
  complexity: number;

  @ApiProperty({ description: 'Suitable listening contexts' })
  contexts: string[];

  @ApiProperty({ description: 'Auto-generated summary' })
  summary: string;

  @ApiProperty({ description: 'Key topics discussed' })
  topics: string[];

  @ApiProperty()
  languageDetected: string;

  @ApiProperty()
  analyzedAt: Date;
}

export class TranscriptionRequestDto {
  @ApiProperty()
  @IsString()
  episodeId: string;

  @ApiPropertyOptional({ description: 'Target language for translation' })
  @IsString()
  @IsOptional()
  translateTo?: string;

  @ApiPropertyOptional({ description: 'Include timestamps' })
  @IsBoolean()
  @IsOptional()
  includeTimestamps?: boolean;
}

export class TranscriptionResponseDto {
  @ApiProperty()
  episodeId: string;

  @ApiProperty()
  text: string;

  @ApiPropertyOptional()
  segments?: Array<{
    startTime: number;
    endTime: number;
    text: string;
    confidence: number;
  }>;

  @ApiProperty()
  language: string;

  @ApiPropertyOptional()
  translatedText?: string;

  @ApiProperty()
  processedAt: Date;
}
