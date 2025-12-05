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
import { BadgesService } from './badges.service';
import {
  CreateBadgeDto,
  BadgeResponseDto,
  UserBadgeResponseDto,
  BadgeCategory,
} from './dto/badge.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, Roles, RolesGuard, Role } from '../../../common';

@ApiTags('Gamification - Badges')
@Controller('gamification/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all badges with user progress' })
  @ApiQuery({ name: 'category', enum: BadgeCategory, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of badges with earned status',
    type: [BadgeResponseDto],
  })
  async getAllBadges(
    @CurrentUser('sub') userId: string,
    @Query('category') category?: BadgeCategory,
  ): Promise<BadgeResponseDto[]> {
    return this.badgesService.getAllBadges(userId, category);
  }

  @Get('public')
  @ApiOperation({ summary: 'Get all public badges' })
  @ApiQuery({ name: 'category', enum: BadgeCategory, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of public badges',
    type: [BadgeResponseDto],
  })
  async getPublicBadges(
    @Query('category') category?: BadgeCategory,
  ): Promise<BadgeResponseDto[]> {
    return this.badgesService.getAllBadges(undefined, category);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user earned badges' })
  @ApiResponse({
    status: 200,
    description: 'List of earned badges',
    type: [UserBadgeResponseDto],
  })
  async getMyBadges(
    @CurrentUser('sub') userId: string,
  ): Promise<UserBadgeResponseDto[]> {
    return this.badgesService.getUserBadges(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new badge (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Badge created successfully',
    type: BadgeResponseDto,
  })
  async createBadge(@Body() dto: CreateBadgeDto): Promise<BadgeResponseDto> {
    return this.badgesService.createBadge(dto);
  }
}
