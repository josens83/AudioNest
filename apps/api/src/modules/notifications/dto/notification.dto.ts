import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsEmail,
} from 'class-validator';

export enum NotificationType {
  // Content notifications
  NEW_EPISODE = 'NEW_EPISODE',
  NEW_ALBUM = 'NEW_ALBUM',
  CONTENT_RECOMMENDATION = 'CONTENT_RECOMMENDATION',

  // Social notifications
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  PLAYLIST_INVITE = 'PLAYLIST_INVITE',
  CLUB_INVITE = 'CLUB_INVITE',
  CLUB_MEETING = 'CLUB_MEETING',
  ACTIVITY_LIKE = 'ACTIVITY_LIKE',
  ACTIVITY_COMMENT = 'ACTIVITY_COMMENT',

  // Creator notifications
  TIP_RECEIVED = 'TIP_RECEIVED',
  PAYOUT_PROCESSED = 'PAYOUT_PROCESSED',
  MILESTONE_REACHED = 'MILESTONE_REACHED',

  // System notifications
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  FAMILY_INVITE = 'FAMILY_INVITE',
  GIFT_RECEIVED = 'GIFT_RECEIVED',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  LEVEL_UP = 'LEVEL_UP',

  // Promotional
  PROMOTION = 'PROMOTION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class NotificationPreferencesDto {
  @ApiProperty({ description: 'Enable push notifications' })
  @IsBoolean()
  pushEnabled: boolean;

  @ApiProperty({ description: 'Enable email notifications' })
  @IsBoolean()
  emailEnabled: boolean;

  @ApiProperty({ description: 'Enable in-app notifications' })
  @IsBoolean()
  inAppEnabled: boolean;

  @ApiPropertyOptional({ description: 'Quiet hours start (0-23)' })
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  quietHoursStart?: number;

  @ApiPropertyOptional({ description: 'Quiet hours end (0-23)' })
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  quietHoursEnd?: number;

  @ApiProperty({ type: Object, description: 'Per-type notification settings' })
  typeSettings: Record<NotificationType, {
    enabled: boolean;
    channels: NotificationChannel[];
  }>;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  quietHoursStart?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  quietHoursEnd?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  typeSettings?: Record<string, {
    enabled: boolean;
    channels: NotificationChannel[];
  }>;
}

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM or APNS device token' })
  @IsString()
  token: string;

  @ApiProperty({ enum: ['android', 'ios', 'web'] })
  @IsEnum(['android', 'ios', 'web'])
  platform: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deviceModel?: string;
}

export class DeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  platform: string;

  @ApiPropertyOptional()
  deviceName?: string;

  @ApiProperty()
  registeredAt: Date;

  @ApiProperty()
  lastActiveAt: Date;
}

export class NotificationDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ type: Object })
  data?: Record<string, any>;

  @ApiProperty()
  read: boolean;

  @ApiProperty({ enum: NotificationPriority })
  priority: NotificationPriority;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  readAt?: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  hasMore: boolean;

  @ApiPropertyOptional()
  cursor?: string;
}

export class SendNotificationDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[];
}

export class BroadcastNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Target user segment', enum: ['all', 'free', 'vip', 'svip', 'creators'] })
  @IsString()
  @IsOptional()
  segment?: string;

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[];
}

export class EmailTemplateDto {
  @ApiProperty()
  @IsString()
  templateId: string;

  @ApiProperty()
  @IsEmail()
  to: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ type: Object })
  variables: Record<string, any>;
}

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean;
}

export class MarkNotificationsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

export class NotificationStatsDto {
  @ApiProperty()
  totalSent: number;

  @ApiProperty()
  totalDelivered: number;

  @ApiProperty()
  totalRead: number;

  @ApiProperty()
  deliveryRate: number;

  @ApiProperty()
  openRate: number;

  @ApiProperty({ type: Object })
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
  }>;

  @ApiProperty({ type: Object })
  byType: Record<string, number>;
}
