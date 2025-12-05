import {
  Controller,
  Get,
  Post,
  Body,
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
import { LeaderboardsService } from './leaderboards.service';
import {
  CreateLeaderboardDto,
  LeaderboardResponseDto,
  LeaderboardWithEntriesDto,
  LeaderboardType,
  LeaderboardScope,
  LeaderboardPeriod,
} from './dto/leaderboard.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, Roles, RolesGuard, Role } from '../../../common';

@ApiTags('Gamification - Leaderboards')
@Controller('gamification/leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get leaderboard with entries' })
  @ApiQuery({ name: 'type', enum: LeaderboardType })
  @ApiQuery({ name: 'period', enum: LeaderboardPeriod })
  @ApiQuery({ name: 'scope', enum: LeaderboardScope, required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard with entries',
    type: LeaderboardWithEntriesDto,
  })
  async getLeaderboard(
    @Query('type') type: LeaderboardType,
    @Query('period') period: LeaderboardPeriod,
    @Query('scope') scope?: LeaderboardScope,
    @Query('category') category?: string,
    @Query('limit') limit?: number,
  ): Promise<LeaderboardWithEntriesDto> {
    return this.leaderboardsService.getLeaderboard(
      type,
      period,
      scope ?? LeaderboardScope.GLOBAL,
      category,
      undefined,
      limit ?? 100,
    );
  }

  @Get('my-rank')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get leaderboard with current user rank' })
  @ApiQuery({ name: 'type', enum: LeaderboardType })
  @ApiQuery({ name: 'period', enum: LeaderboardPeriod })
  @ApiQuery({ name: 'scope', enum: LeaderboardScope, required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard with user rank',
    type: LeaderboardWithEntriesDto,
  })
  async getLeaderboardWithMyRank(
    @CurrentUser('sub') userId: string,
    @Query('type') type: LeaderboardType,
    @Query('period') period: LeaderboardPeriod,
    @Query('scope') scope?: LeaderboardScope,
    @Query('category') category?: string,
  ): Promise<LeaderboardWithEntriesDto> {
    return this.leaderboardsService.getLeaderboard(
      type,
      period,
      scope ?? LeaderboardScope.GLOBAL,
      category,
      userId,
      100,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new leaderboard (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Leaderboard created successfully',
    type: LeaderboardResponseDto,
  })
  async createLeaderboard(
    @Body() dto: CreateLeaderboardDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.createLeaderboard(dto);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize default leaderboards (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Default leaderboards initialized',
  })
  async initializeDefaults(): Promise<{ message: string }> {
    await this.leaderboardsService.initializeDefaultLeaderboards();
    return { message: 'Default leaderboards initialized' };
  }
}
