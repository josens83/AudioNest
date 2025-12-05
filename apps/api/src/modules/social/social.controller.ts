import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
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
import { SocialService } from './social.service';
import {
  CreateSharedPlaylistDto,
  SharedPlaylistResponseDto,
  AddCollaboratorDto,
  ClubType,
  CreateClubDto,
  ClubResponseDto,
  ClubMemberDto,
  ScheduleMeetingDto,
  ActivityFeedResponseDto,
  UserProfileDto,
  FollowUserDto,
  LikeActivityDto,
  CommentOnActivityDto,
} from './dto/social.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common';

@ApiTags('Social')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ============================================
  // User Following
  // ============================================

  @Post('follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a user' })
  async followUser(
    @CurrentUser('sub') userId: string,
    @Body() dto: FollowUserDto,
  ): Promise<{ success: boolean }> {
    return this.socialService.followUser(userId, dto.userId);
  }

  @Delete('follow/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user' })
  async unfollowUser(
    @CurrentUser('sub') currentUserId: string,
    @Param('userId') targetUserId: string,
  ): Promise<{ success: boolean }> {
    return this.socialService.unfollowUser(currentUserId, targetUserId);
  }

  @Get('followers/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user followers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ users: UserProfileDto[]; total: number; hasMore: boolean }> {
    return this.socialService.getFollowers(userId, page ?? 1, limit ?? 20);
  }

  @Get('following/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users being followed' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ users: UserProfileDto[]; total: number; hasMore: boolean }> {
    return this.socialService.getFollowing(userId, page ?? 1, limit ?? 20);
  }

  @Get('profile/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getUserProfile(
    @CurrentUser('sub') viewerId: string,
    @Param('userId') targetUserId: string,
  ): Promise<UserProfileDto> {
    return this.socialService.getUserProfile(targetUserId, viewerId);
  }

  // ============================================
  // Shared Playlists
  // ============================================

  @Post('playlists')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shared playlist' })
  @ApiResponse({ status: 201, type: SharedPlaylistResponseDto })
  async createPlaylist(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSharedPlaylistDto,
  ): Promise<SharedPlaylistResponseDto> {
    return this.socialService.createSharedPlaylist(userId, dto);
  }

  @Post('playlists/:playlistId/collaborators')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add collaborator to playlist' })
  async addCollaborator(
    @CurrentUser('sub') ownerId: string,
    @Param('playlistId') playlistId: string,
    @Body() dto: AddCollaboratorDto,
  ): Promise<{ success: boolean }> {
    return this.socialService.addCollaborator(playlistId, ownerId, dto.userId, dto.canEdit);
  }

  @Post('playlists/:playlistId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a public playlist' })
  async followPlaylist(
    @CurrentUser('sub') userId: string,
    @Param('playlistId') playlistId: string,
  ): Promise<{ success: boolean }> {
    return this.socialService.followPlaylist(userId, playlistId);
  }

  @Get('playlists/public')
  @ApiOperation({ summary: 'Get public playlists' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPublicPlaylists(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ playlists: SharedPlaylistResponseDto[]; total: number }> {
    return this.socialService.getPublicPlaylists(page ?? 1, limit ?? 20);
  }

  // ============================================
  // Audio Clubs
  // ============================================

  @Post('clubs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an audio club' })
  @ApiResponse({ status: 201, type: ClubResponseDto })
  async createClub(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateClubDto,
  ): Promise<ClubResponseDto> {
    return this.socialService.createClub(userId, dto);
  }

  @Get('clubs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audio clubs' })
  @ApiQuery({ name: 'type', enum: ClubType, required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getClubs(
    @CurrentUser('sub') userId: string,
    @Query('type') type?: ClubType,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ clubs: ClubResponseDto[]; total: number }> {
    return this.socialService.getClubs(type, category, page ?? 1, limit ?? 20, userId);
  }

  @Post('clubs/:clubId/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join an audio club' })
  async joinClub(
    @CurrentUser('sub') userId: string,
    @Param('clubId') clubId: string,
  ): Promise<{ success: boolean; status: string }> {
    return this.socialService.joinClub(userId, clubId);
  }

  @Delete('clubs/:clubId/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave an audio club' })
  async leaveClub(
    @CurrentUser('sub') userId: string,
    @Param('clubId') clubId: string,
  ): Promise<{ success: boolean }> {
    return this.socialService.leaveClub(userId, clubId);
  }

  @Get('clubs/:clubId/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get club members' })
  @ApiResponse({ status: 200, type: [ClubMemberDto] })
  async getClubMembers(
    @Param('clubId') clubId: string,
  ): Promise<ClubMemberDto[]> {
    return this.socialService.getClubMembers(clubId);
  }

  @Post('clubs/:clubId/meetings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule a club meeting' })
  async scheduleMeeting(
    @CurrentUser('sub') userId: string,
    @Param('clubId') clubId: string,
    @Body() dto: ScheduleMeetingDto,
  ): Promise<{ meetingId: string }> {
    return this.socialService.scheduleMeeting(clubId, userId, dto);
  }

  // ============================================
  // Activity Feed
  // ============================================

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get activity feed' })
  @ApiQuery({ name: 'type', enum: ['following', 'global'], required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: ActivityFeedResponseDto })
  async getActivityFeed(
    @CurrentUser('sub') userId: string,
    @Query('type') feedType?: 'following' | 'global',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ActivityFeedResponseDto> {
    return this.socialService.getActivityFeed(
      userId,
      page ?? 1,
      limit ?? 20,
      feedType ?? 'following',
    );
  }

  @Post('feed/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like/unlike an activity' })
  async likeActivity(
    @CurrentUser('sub') userId: string,
    @Body() dto: LikeActivityDto,
  ): Promise<{ success: boolean }> {
    return this.socialService.likeActivity(userId, dto.activityId);
  }

  @Post('feed/comment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Comment on an activity' })
  async commentOnActivity(
    @CurrentUser('sub') userId: string,
    @Body() dto: CommentOnActivityDto,
  ): Promise<{ commentId: string }> {
    return this.socialService.commentOnActivity(userId, dto.activityId, dto.content);
  }
}
