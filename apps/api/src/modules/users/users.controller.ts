import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.sub);
    const { passwordHash, ...result } = user;
    return result;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, dto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get listening statistics' })
  async getStats(@Request() req) {
    return this.usersService.getStats(req.user.sub);
  }
}
