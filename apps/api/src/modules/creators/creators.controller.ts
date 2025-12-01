import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatorsService } from './creators.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('creators')
@Controller('creators')
export class CreatorsController {
  constructor(private creatorsService: CreatorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all creators' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.creatorsService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get creator by ID' })
  async findOne(@Param('id') id: string) {
    return this.creatorsService.findById(id);
  }

  @Get(':id/albums')
  @ApiOperation({ summary: 'Get creator albums' })
  async getAlbums(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.creatorsService.getAlbums(id, page, limit);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a creator' })
  async follow(@Param('id') id: string, @Request() req) {
    return this.creatorsService.follow(id, req.user.sub);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a creator' })
  async unfollow(@Param('id') id: string, @Request() req) {
    return this.creatorsService.unfollow(id, req.user.sub);
  }

  @Get(':id/following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if following creator' })
  async isFollowing(@Param('id') id: string, @Request() req) {
    return this.creatorsService.isFollowing(id, req.user.sub);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator stats (for creators)' })
  async getMyStats(@Request() req) {
    return this.creatorsService.getStats(req.user.sub, req.user.sub);
  }
}
