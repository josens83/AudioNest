import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LiveService } from './live.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendGiftDto } from './dto/live.dto';

@ApiTags('live')
@Controller('live')
export class LiveController {
  constructor(private liveService: LiveService) {}

  @Get()
  @ApiOperation({ summary: 'Get live rooms' })
  async findLive(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.liveService.findLive(page, limit);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming live rooms' })
  async findUpcoming(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.liveService.findUpcoming(page, limit);
  }

  @Get('gifts')
  @ApiOperation({ summary: 'Get available gifts' })
  async getGifts() {
    return this.liveService.getGifts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get live room by ID' })
  async findOne(@Param('id') id: string) {
    return this.liveService.findById(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a live room' })
  async join(@Param('id') id: string, @Request() req) {
    return this.liveService.join(id, req.user.sub);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a live room' })
  async leave(@Param('id') id: string) {
    return this.liveService.leave(id);
  }

  @Post(':id/gift')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a gift' })
  async sendGift(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: SendGiftDto,
  ) {
    return this.liveService.sendGift(id, req.user.sub, dto.giftId, dto.quantity);
  }
}
