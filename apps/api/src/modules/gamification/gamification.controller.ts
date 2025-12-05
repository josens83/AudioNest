import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GamificationService, UserGamificationStats } from './gamification.service';
import { LevelsService } from './levels/levels.service';
import { UserLevelResponseDto, LevelTierResponseDto } from './levels/dto/level.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, Roles, RolesGuard, Role } from '../../common';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly levelsService: LevelsService,
  ) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user gamification stats' })
  @ApiResponse({
    status: 200,
    description: 'User gamification statistics',
  })
  async getMyStats(
    @CurrentUser('sub') userId: string,
  ): Promise<UserGamificationStats> {
    return this.gamificationService.getUserStats(userId);
  }

  @Get('level')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user level and XP' })
  @ApiResponse({
    status: 200,
    description: 'User level information',
    type: UserLevelResponseDto,
  })
  async getMyLevel(
    @CurrentUser('sub') userId: string,
  ): Promise<UserLevelResponseDto> {
    return this.levelsService.getUserLevel(userId);
  }

  @Get('level-tiers')
  @ApiOperation({ summary: 'Get all level tiers' })
  @ApiResponse({
    status: 200,
    description: 'List of level tiers',
    type: [LevelTierResponseDto],
  })
  async getLevelTiers(): Promise<LevelTierResponseDto[]> {
    return this.levelsService.getLevelTiers();
  }

  @Post('daily-login')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record daily login and update streak' })
  @ApiResponse({
    status: 200,
    description: 'Daily login recorded',
  })
  async recordDailyLogin(
    @CurrentUser('sub') userId: string,
  ): Promise<{ streakUpdated: boolean; currentStreak: number }> {
    return this.gamificationService.onDailyLogin(userId);
  }

  @Post('initialize-badges')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize default badges (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Default badges initialized',
  })
  async initializeBadges(): Promise<{ message: string }> {
    await this.gamificationService.initializeDefaultBadges();
    return { message: 'Default badges initialized' };
  }
}
