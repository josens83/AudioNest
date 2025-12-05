import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationService } from './notification.service';
import {
  NotificationPreferencesDto,
  UpdateNotificationPreferencesDto,
  RegisterDeviceDto,
  DeviceResponseDto,
  NotificationListResponseDto,
  GetNotificationsQueryDto,
  MarkNotificationsDto,
  SendNotificationDto,
  BroadcastNotificationDto,
  NotificationStatsDto,
} from './dto/notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ==================== User Preferences ====================

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, type: NotificationPreferencesDto })
  async getPreferences(@Request() req): Promise<NotificationPreferencesDto> {
    return this.notificationService.getPreferences(req.user.sub);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, type: NotificationPreferencesDto })
  async updatePreferences(
    @Request() req,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    return this.notificationService.updatePreferences(req.user.sub, dto);
  }

  // ==================== Device Management ====================

  @Post('devices')
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ApiResponse({ status: 201, type: DeviceResponseDto })
  async registerDevice(
    @Request() req,
    @Body() dto: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    return this.notificationService.registerDevice(req.user.sub, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get registered devices' })
  @ApiResponse({ status: 200, type: [DeviceResponseDto] })
  async getDevices(@Request() req): Promise<DeviceResponseDto[]> {
    return this.notificationService.getDevices(req.user.sub);
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Remove a registered device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 204 })
  async removeDevice(
    @Request() req,
    @Param('deviceId') deviceId: string,
  ): Promise<void> {
    return this.notificationService.removeDevice(req.user.sub, deviceId);
  }

  // ==================== User Notifications ====================

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  async getNotifications(
    @Request() req,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notificationService.getNotifications(req.user.sub, query);
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 204 })
  async markAsRead(
    @Request() req,
    @Body() dto: MarkNotificationsDto,
  ): Promise<void> {
    return this.notificationService.markAsRead(req.user.sub, dto.notificationIds);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 204 })
  async markAllAsRead(@Request() req): Promise<void> {
    return this.notificationService.markAllAsRead(req.user.sub);
  }

  @Delete(':notificationId')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @ApiResponse({ status: 204 })
  async deleteNotification(
    @Request() req,
    @Param('notificationId') notificationId: string,
  ): Promise<void> {
    return this.notificationService.deleteNotification(req.user.sub, notificationId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all notifications' })
  @ApiResponse({ status: 204 })
  async deleteAllNotifications(@Request() req): Promise<void> {
    return this.notificationService.deleteAllNotifications(req.user.sub);
  }

  // ==================== Admin Endpoints ====================

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send notification to a user (Admin only)' })
  @ApiResponse({ status: 201 })
  async sendNotification(@Body() dto: SendNotificationDto): Promise<void> {
    return this.notificationService.send(dto);
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Broadcast notification to users (Admin only)' })
  @ApiResponse({ status: 201 })
  async broadcastNotification(
    @Body() dto: BroadcastNotificationDto,
  ): Promise<{ sentCount: number }> {
    return this.notificationService.broadcast(dto);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get notification statistics (Admin only)' })
  @ApiQuery({ name: 'period', required: false, description: 'Period in days (e.g., 7d, 30d)' })
  @ApiResponse({ status: 200, type: NotificationStatsDto })
  async getStats(@Query('period') period?: string): Promise<NotificationStatsDto> {
    return this.notificationService.getStats(period);
  }
}
