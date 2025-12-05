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
import { ChallengesService } from './challenges.service';
import {
  CreateChallengeDto,
  ChallengeResponseDto,
  UserChallengeResponseDto,
  JoinChallengeDto,
  ChallengeType,
  UserChallengeStatus,
} from './dto/challenge.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, Roles, RolesGuard, Role } from '../../../common';

@ApiTags('Gamification - Challenges')
@Controller('gamification/challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @ApiOperation({ summary: 'Get active challenges' })
  @ApiQuery({ name: 'type', enum: ChallengeType, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of active challenges',
    type: [ChallengeResponseDto],
  })
  async getActiveChallenges(
    @Query('type') type?: ChallengeType,
  ): Promise<ChallengeResponseDto[]> {
    return this.challengesService.getActiveChallenges(type);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user challenges' })
  @ApiQuery({ name: 'status', enum: UserChallengeStatus, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of user challenges',
    type: [UserChallengeResponseDto],
  })
  async getMyChall(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: UserChallengeStatus,
  ): Promise<UserChallengeResponseDto[]> {
    return this.challengesService.getUserChallenges(userId, status);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a challenge' })
  @ApiResponse({
    status: 200,
    description: 'Successfully joined challenge',
    type: UserChallengeResponseDto,
  })
  async joinChallenge(
    @CurrentUser('sub') userId: string,
    @Body() dto: JoinChallengeDto,
  ): Promise<UserChallengeResponseDto> {
    return this.challengesService.joinChallenge(userId, dto.challengeId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new challenge (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Challenge created successfully',
    type: ChallengeResponseDto,
  })
  async createChallenge(
    @Body() dto: CreateChallengeDto,
  ): Promise<ChallengeResponseDto> {
    return this.challengesService.createChallenge(dto);
  }

  @Post('generate-daily')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate daily challenges (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Daily challenges generated',
    type: [ChallengeResponseDto],
  })
  async generateDailyChallenges(): Promise<ChallengeResponseDto[]> {
    return this.challengesService.generateDailyChallenges();
  }
}
