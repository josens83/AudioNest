import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

// ============================================
// Shared Playlist DTOs
// ============================================

export enum PlaylistVisibility {
  PRIVATE = 'PRIVATE',
  FRIENDS = 'FRIENDS',
  PUBLIC = 'PUBLIC',
}

export class CreateSharedPlaylistDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ enum: PlaylistVisibility, default: PlaylistVisibility.PRIVATE })
  @IsEnum(PlaylistVisibility)
  @IsOptional()
  visibility?: PlaylistVisibility;

  @ApiPropertyOptional({ description: 'Allow collaborators to add episodes' })
  @IsBoolean()
  @IsOptional()
  allowCollaborators?: boolean;
}

export class AddCollaboratorDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Can add/remove episodes' })
  @IsBoolean()
  @IsOptional()
  canEdit?: boolean;
}

export class SharedPlaylistResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  coverUrl?: string;

  @ApiProperty({ enum: PlaylistVisibility })
  visibility: PlaylistVisibility;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  ownerName: string;

  @ApiProperty()
  episodeCount: number;

  @ApiProperty()
  totalDuration: number;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  collaborators: Array<{
    userId: string;
    username: string;
    avatarUrl?: string;
    canEdit: boolean;
  }>;

  @ApiProperty()
  isFollowing: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// Audio Club DTOs
// ============================================

export enum ClubType {
  BOOK_CLUB = 'BOOK_CLUB',
  PODCAST_CLUB = 'PODCAST_CLUB',
  LISTENING_PARTY = 'LISTENING_PARTY',
  STUDY_GROUP = 'STUDY_GROUP',
}

export enum ClubMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class CreateClubDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ enum: ClubType })
  @IsEnum(ClubType)
  type: ClubType;

  @ApiPropertyOptional({ description: 'Max members (0 = unlimited)', default: 50 })
  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  maxMembers?: number;

  @ApiPropertyOptional({ description: 'Require approval to join' })
  @IsBoolean()
  @IsOptional()
  requireApproval?: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Category focus' })
  @IsString()
  @IsOptional()
  category?: string;
}

export class ClubResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  coverUrl?: string;

  @ApiProperty({ enum: ClubType })
  type: ClubType;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  maxMembers: number;

  @ApiProperty()
  requireApproval: boolean;

  @ApiProperty()
  tags: string[];

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  owner: {
    id: string;
    username: string;
    avatarUrl?: string;
  };

  @ApiProperty()
  currentContent?: {
    albumId: string;
    title: string;
    coverUrl?: string;
    progress: number;
  };

  @ApiProperty()
  nextMeeting?: {
    scheduledAt: Date;
    topic: string;
  };

  @ApiProperty()
  isMember: boolean;

  @ApiPropertyOptional()
  myRole?: ClubMemberRole;

  @ApiProperty()
  createdAt: Date;
}

export class ClubMemberDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: ClubMemberRole })
  role: ClubMemberRole;

  @ApiProperty()
  joinedAt: Date;

  @ApiProperty()
  listenProgress: number;
}

export class ScheduleMeetingDto {
  @ApiProperty()
  @IsDateString()
  scheduledAt: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  topic: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Episode/Album to discuss' })
  @IsString()
  @IsOptional()
  contentId?: string;
}

// ============================================
// Activity Feed DTOs
// ============================================

export enum ActivityType {
  STARTED_LISTENING = 'STARTED_LISTENING',
  FINISHED_EPISODE = 'FINISHED_EPISODE',
  FINISHED_ALBUM = 'FINISHED_ALBUM',
  WROTE_REVIEW = 'WROTE_REVIEW',
  EARNED_BADGE = 'EARNED_BADGE',
  JOINED_CLUB = 'JOINED_CLUB',
  CREATED_PLAYLIST = 'CREATED_PLAYLIST',
  FOLLOWED_CREATOR = 'FOLLOWED_CREATOR',
  STREAK_MILESTONE = 'STREAK_MILESTONE',
  LEVEL_UP = 'LEVEL_UP',
}

export class ActivityItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ActivityType })
  type: ActivityType;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };

  @ApiProperty()
  content: {
    title: string;
    subtitle?: string;
    coverUrl?: string;
    targetId?: string;
    targetType?: string;
  };

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  isLiked: boolean;
}

export class ActivityFeedResponseDto {
  @ApiProperty({ type: [ActivityItemDto] })
  items: ActivityItemDto[];

  @ApiProperty()
  hasMore: boolean;

  @ApiPropertyOptional()
  nextCursor?: string;
}

export class LikeActivityDto {
  @ApiProperty()
  @IsString()
  activityId: string;
}

export class CommentOnActivityDto {
  @ApiProperty()
  @IsString()
  activityId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  content: string;
}

// ============================================
// Friends/Following DTOs
// ============================================

export class FollowUserDto {
  @ApiProperty()
  @IsString()
  userId: string;
}

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  isFollowing: boolean;

  @ApiProperty()
  isFollowedBy: boolean;

  @ApiProperty()
  level: number;

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  badgeCount: number;

  @ApiProperty()
  totalListenTime: number;

  @ApiProperty()
  publicPlaylists: number;
}

export class FriendActivitySettingsDto {
  @ApiPropertyOptional({ description: 'Show my listening activity' })
  @IsBoolean()
  @IsOptional()
  showListeningActivity?: boolean;

  @ApiPropertyOptional({ description: 'Show my reviews' })
  @IsBoolean()
  @IsOptional()
  showReviews?: boolean;

  @ApiPropertyOptional({ description: 'Show my achievements' })
  @IsBoolean()
  @IsOptional()
  showAchievements?: boolean;

  @ApiPropertyOptional({ description: 'Show my club activity' })
  @IsBoolean()
  @IsOptional()
  showClubActivity?: boolean;
}
