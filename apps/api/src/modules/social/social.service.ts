import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PlaylistVisibility,
  CreateSharedPlaylistDto,
  SharedPlaylistResponseDto,
  ClubType,
  ClubMemberRole,
  CreateClubDto,
  ClubResponseDto,
  ClubMemberDto,
  ScheduleMeetingDto,
  ActivityType,
  ActivityItemDto,
  ActivityFeedResponseDto,
  UserProfileDto,
} from './dto/social.dto';
import { AppLoggerService } from '../../common/logger';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('SocialService');
  }

  // ============================================
  // User Following
  // ============================================

  async followUser(followerId: string, followingId: string): Promise<{ success: boolean }> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.userFollow.upsert({
      where: {
        followerId_followingId: { followerId, followingId },
      },
      create: { followerId, followingId },
      update: {},
    });

    // Create activity
    await this.createActivity(followerId, 'FOLLOWED_CREATOR' as ActivityType, {
      targetType: 'user',
      targetId: followingId,
      targetTitle: targetUser.username,
      targetCoverUrl: targetUser.avatarUrl,
    });

    this.logger.log(`User ${followerId} followed user ${followingId}`);
    return { success: true };
  }

  async unfollowUser(followerId: string, followingId: string): Promise<{ success: boolean }> {
    await this.prisma.userFollow.deleteMany({
      where: { followerId, followingId },
    });

    return { success: true };
  }

  async getFollowers(userId: string, page = 1, limit = 20): Promise<{
    users: UserProfileDto[];
    total: number;
    hasMore: boolean;
  }> {
    const [followers, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            include: {
              userLevel: true,
              _count: { select: { badges: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userFollow.count({ where: { followingId: userId } }),
    ]);

    const users = await Promise.all(
      followers.map(async (f) => this.mapUserToProfile(f.follower, userId)),
    );

    return {
      users,
      total,
      hasMore: page * limit < total,
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20): Promise<{
    users: UserProfileDto[];
    total: number;
    hasMore: boolean;
  }> {
    const [following, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            include: {
              userLevel: true,
              _count: { select: { badges: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userFollow.count({ where: { followerId: userId } }),
    ]);

    const users = await Promise.all(
      following.map(async (f) => this.mapUserToProfile(f.following, userId)),
    );

    return {
      users,
      total,
      hasMore: page * limit < total,
    };
  }

  async getUserProfile(targetUserId: string, viewerId?: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        userLevel: true,
        _count: {
          select: {
            badges: true,
            playlists: { where: { isPublic: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToProfile(user, viewerId);
  }

  // ============================================
  // Shared Playlists
  // ============================================

  async createSharedPlaylist(
    userId: string,
    dto: CreateSharedPlaylistDto,
  ): Promise<SharedPlaylistResponseDto> {
    const playlist = await this.prisma.playlist.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        coverUrl: dto.coverUrl,
        isPublic: dto.visibility === PlaylistVisibility.PUBLIC,
        visibility: dto.visibility ?? 'PRIVATE',
        allowCollaborators: dto.allowCollaborators ?? false,
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    // Create activity
    if (dto.visibility === PlaylistVisibility.PUBLIC) {
      await this.createActivity(userId, 'CREATED_PLAYLIST' as ActivityType, {
        targetType: 'playlist',
        targetId: playlist.id,
        targetTitle: playlist.title,
        targetCoverUrl: playlist.coverUrl,
      });
    }

    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description ?? undefined,
      coverUrl: playlist.coverUrl ?? undefined,
      visibility: playlist.visibility as PlaylistVisibility,
      ownerId: playlist.userId,
      ownerName: playlist.user.username,
      episodeCount: 0,
      totalDuration: 0,
      followerCount: 0,
      collaborators: [],
      isFollowing: false,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  }

  async addCollaborator(
    playlistId: string,
    ownerId: string,
    collaboratorId: string,
    canEdit = false,
  ): Promise<{ success: boolean }> {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist || playlist.userId !== ownerId) {
      throw new ForbiddenException('Only the owner can add collaborators');
    }

    if (!playlist.allowCollaborators) {
      throw new BadRequestException('This playlist does not allow collaborators');
    }

    await this.prisma.playlistCollaborator.create({
      data: {
        playlistId,
        userId: collaboratorId,
        canEdit,
      },
    });

    return { success: true };
  }

  async followPlaylist(userId: string, playlistId: string): Promise<{ success: boolean }> {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist || !playlist.isPublic) {
      throw new NotFoundException('Playlist not found');
    }

    await this.prisma.$transaction([
      this.prisma.playlistFollower.upsert({
        where: { playlistId_userId: { playlistId, userId } },
        create: { playlistId, userId },
        update: {},
      }),
      this.prisma.playlist.update({
        where: { id: playlistId },
        data: { followerCount: { increment: 1 } },
      }),
    ]);

    return { success: true };
  }

  async getPublicPlaylists(page = 1, limit = 20): Promise<{
    playlists: SharedPlaylistResponseDto[];
    total: number;
  }> {
    const [playlists, total] = await Promise.all([
      this.prisma.playlist.findMany({
        where: { isPublic: true },
        include: {
          user: { select: { id: true, username: true } },
          collaborators: {
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
          },
          _count: { select: { episodes: true } },
        },
        orderBy: { followerCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.playlist.count({ where: { isPublic: true } }),
    ]);

    return {
      playlists: playlists.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description ?? undefined,
        coverUrl: p.coverUrl ?? undefined,
        visibility: p.visibility as PlaylistVisibility,
        ownerId: p.userId,
        ownerName: p.user.username,
        episodeCount: p._count.episodes,
        totalDuration: p.totalDuration,
        followerCount: p.followerCount,
        collaborators: p.collaborators.map((c) => ({
          userId: c.userId,
          username: c.user.username,
          avatarUrl: c.user.avatarUrl ?? undefined,
          canEdit: c.canEdit,
        })),
        isFollowing: false, // Would check for current user
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total,
    };
  }

  // ============================================
  // Audio Clubs
  // ============================================

  async createClub(userId: string, dto: CreateClubDto): Promise<ClubResponseDto> {
    const club = await this.prisma.audioClub.create({
      data: {
        ownerId: userId,
        name: dto.name,
        description: dto.description,
        coverUrl: dto.coverUrl,
        type: dto.type,
        category: dto.category,
        tags: dto.tags ?? [],
        maxMembers: dto.maxMembers ?? 50,
        requireApproval: dto.requireApproval ?? false,
        memberCount: 1,
      },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    // Add owner as member
    await this.prisma.clubMember.create({
      data: {
        clubId: club.id,
        userId,
        role: 'OWNER',
      },
    });

    // Create activity
    await this.createActivity(userId, 'JOINED_CLUB' as ActivityType, {
      targetType: 'club',
      targetId: club.id,
      targetTitle: club.name,
      targetCoverUrl: club.coverUrl,
      metadata: { action: 'created' },
    });

    this.logger.log(`Club created: ${club.name} by user ${userId}`);

    return this.mapClubToResponse(club, userId, 'OWNER');
  }

  async joinClub(userId: string, clubId: string): Promise<{ success: boolean; status: string }> {
    const club = await this.prisma.audioClub.findUnique({
      where: { id: clubId },
    });

    if (!club || !club.isActive) {
      throw new NotFoundException('Club not found');
    }

    if (club.memberCount >= club.maxMembers) {
      throw new BadRequestException('Club is full');
    }

    const existingMembership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (existingMembership) {
      throw new BadRequestException('Already a member of this club');
    }

    await this.prisma.$transaction([
      this.prisma.clubMember.create({
        data: {
          clubId,
          userId,
          role: 'MEMBER',
        },
      }),
      this.prisma.audioClub.update({
        where: { id: clubId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    // Create activity
    await this.createActivity(userId, 'JOINED_CLUB' as ActivityType, {
      targetType: 'club',
      targetId: club.id,
      targetTitle: club.name,
      targetCoverUrl: club.coverUrl,
    });

    return { success: true, status: 'joined' };
  }

  async leaveClub(userId: string, clubId: string): Promise<{ success: boolean }> {
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (!membership) {
      throw new BadRequestException('Not a member of this club');
    }

    if (membership.role === 'OWNER') {
      throw new BadRequestException('Owner cannot leave the club. Transfer ownership first.');
    }

    await this.prisma.$transaction([
      this.prisma.clubMember.delete({
        where: { clubId_userId: { clubId, userId } },
      }),
      this.prisma.audioClub.update({
        where: { id: clubId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  }

  async getClubs(
    type?: ClubType,
    category?: string,
    page = 1,
    limit = 20,
    userId?: string,
  ): Promise<{ clubs: ClubResponseDto[]; total: number }> {
    const [clubs, total] = await Promise.all([
      this.prisma.audioClub.findMany({
        where: {
          isActive: true,
          ...(type && { type }),
          ...(category && { category }),
        },
        include: {
          owner: { select: { id: true, username: true, avatarUrl: true } },
          members: userId ? { where: { userId } } : false,
          meetings: {
            where: { scheduledAt: { gte: new Date() } },
            orderBy: { scheduledAt: 'asc' },
            take: 1,
          },
        },
        orderBy: { memberCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.audioClub.count({
        where: {
          isActive: true,
          ...(type && { type }),
          ...(category && { category }),
        },
      }),
    ]);

    return {
      clubs: clubs.map((club) => {
        const membership = Array.isArray(club.members) ? club.members[0] : undefined;
        return this.mapClubToResponse(club, userId, membership?.role);
      }),
      total,
    };
  }

  async getClubMembers(clubId: string): Promise<ClubMemberDto[]> {
    const members = await this.prisma.clubMember.findMany({
      where: { clubId },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return members.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl ?? undefined,
      role: m.role as ClubMemberRole,
      joinedAt: m.joinedAt,
      listenProgress: m.listenProgress,
    }));
  }

  async scheduleMeeting(
    clubId: string,
    userId: string,
    dto: ScheduleMeetingDto,
  ): Promise<{ meetingId: string }> {
    const membership = await this.prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Only admins can schedule meetings');
    }

    const meeting = await this.prisma.clubMeeting.create({
      data: {
        clubId,
        topic: dto.topic,
        description: dto.description,
        scheduledAt: new Date(dto.scheduledAt),
        contentId: dto.contentId,
      },
    });

    return { meetingId: meeting.id };
  }

  // ============================================
  // Activity Feed
  // ============================================

  async getActivityFeed(
    userId: string,
    page = 1,
    limit = 20,
    feedType: 'following' | 'global' = 'following',
  ): Promise<ActivityFeedResponseDto> {
    let userIds: string[] = [];

    if (feedType === 'following') {
      const following = await this.prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      userIds = following.map((f) => f.followingId);
      userIds.push(userId); // Include own activities
    }

    const activities = await this.prisma.userActivity.findMany({
      where: {
        isPublic: true,
        ...(feedType === 'following' && { userId: { in: userIds } }),
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        likes: { where: { userId }, take: 1 },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit + 1, // Get one extra to check hasMore
    });

    const hasMore = activities.length > limit;
    const items = activities.slice(0, limit).map((a) => ({
      id: a.id,
      type: a.type as ActivityType,
      user: {
        id: a.user.id,
        username: a.user.username,
        avatarUrl: a.user.avatarUrl ?? undefined,
      },
      content: {
        title: a.targetTitle ?? '',
        subtitle: undefined,
        coverUrl: a.targetCoverUrl ?? undefined,
        targetId: a.targetId ?? undefined,
        targetType: a.targetType ?? undefined,
      },
      metadata: a.metadata as Record<string, unknown> | undefined,
      createdAt: a.createdAt,
      likeCount: a.likeCount,
      commentCount: a._count.comments,
      isLiked: a.likes.length > 0,
    }));

    return {
      items,
      hasMore,
      nextCursor: hasMore ? activities[limit - 1].id : undefined,
    };
  }

  async likeActivity(userId: string, activityId: string): Promise<{ success: boolean }> {
    const activity = await this.prisma.userActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const existing = await this.prisma.activityLike.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });

    if (existing) {
      // Unlike
      await this.prisma.$transaction([
        this.prisma.activityLike.delete({
          where: { activityId_userId: { activityId, userId } },
        }),
        this.prisma.userActivity.update({
          where: { id: activityId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
    } else {
      // Like
      await this.prisma.$transaction([
        this.prisma.activityLike.create({
          data: { activityId, userId },
        }),
        this.prisma.userActivity.update({
          where: { id: activityId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    }

    return { success: true };
  }

  async commentOnActivity(
    userId: string,
    activityId: string,
    content: string,
  ): Promise<{ commentId: string }> {
    const activity = await this.prisma.userActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const newComment = await tx.activityComment.create({
        data: { activityId, userId, content },
      });

      await tx.userActivity.update({
        where: { id: activityId },
        data: { commentCount: { increment: 1 } },
      });

      return newComment;
    });

    return { commentId: comment.id };
  }

  async createActivity(
    userId: string,
    type: ActivityType,
    data: {
      targetType?: string;
      targetId?: string;
      targetTitle?: string;
      targetCoverUrl?: string | null;
      metadata?: Record<string, unknown>;
      isPublic?: boolean;
    },
  ): Promise<void> {
    await this.prisma.userActivity.create({
      data: {
        userId,
        type,
        targetType: data.targetType,
        targetId: data.targetId,
        targetTitle: data.targetTitle,
        targetCoverUrl: data.targetCoverUrl,
        metadata: data.metadata,
        isPublic: data.isPublic ?? true,
      },
    });
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async mapUserToProfile(
    user: {
      id: string;
      username: string;
      avatarUrl: string | null;
      totalListenTime: number;
      userLevel?: { level: number; title: string | null } | null;
      _count?: { badges: number; playlists?: number };
    },
    viewerId?: string,
  ): Promise<UserProfileDto> {
    const [followerCount, followingCount, isFollowing, isFollowedBy] = await Promise.all([
      this.prisma.userFollow.count({ where: { followingId: user.id } }),
      this.prisma.userFollow.count({ where: { followerId: user.id } }),
      viewerId
        ? this.prisma.userFollow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
          })
        : null,
      viewerId
        ? this.prisma.userFollow.findUnique({
            where: { followerId_followingId: { followerId: user.id, followingId: viewerId } },
          })
        : null,
    ]);

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl ?? undefined,
      followerCount,
      followingCount,
      isFollowing: !!isFollowing,
      isFollowedBy: !!isFollowedBy,
      level: user.userLevel?.level ?? 1,
      title: user.userLevel?.title ?? undefined,
      badgeCount: user._count?.badges ?? 0,
      totalListenTime: user.totalListenTime,
      publicPlaylists: user._count?.playlists ?? 0,
    };
  }

  private mapClubToResponse(
    club: {
      id: string;
      name: string;
      description: string;
      coverUrl: string | null;
      type: string;
      category: string | null;
      tags: string[];
      maxMembers: number;
      requireApproval: boolean;
      memberCount: number;
      currentContentId: string | null;
      createdAt: Date;
      owner: { id: string; username: string; avatarUrl: string | null };
      meetings?: Array<{ scheduledAt: Date; topic: string }>;
    },
    viewerId?: string,
    viewerRole?: string,
  ): ClubResponseDto {
    return {
      id: club.id,
      name: club.name,
      description: club.description,
      coverUrl: club.coverUrl ?? undefined,
      type: club.type as ClubType,
      memberCount: club.memberCount,
      maxMembers: club.maxMembers,
      requireApproval: club.requireApproval,
      tags: club.tags,
      category: club.category ?? undefined,
      owner: {
        id: club.owner.id,
        username: club.owner.username,
        avatarUrl: club.owner.avatarUrl ?? undefined,
      },
      currentContent: club.currentContentId
        ? { albumId: club.currentContentId, title: '', progress: 0 }
        : undefined,
      nextMeeting: club.meetings?.[0]
        ? { scheduledAt: club.meetings[0].scheduledAt, topic: club.meetings[0].topic }
        : undefined,
      isMember: !!viewerRole,
      myRole: viewerRole as ClubMemberRole | undefined,
      createdAt: club.createdAt,
    };
  }
}
