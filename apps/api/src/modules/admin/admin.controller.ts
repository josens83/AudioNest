import {
  Controller,
  Get,
  Put,
  Post,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  DashboardStatsDto,
  DashboardChartDataDto,
  AdminUserDto,
  GetUsersQueryDto,
  UpdateUserDto,
  BulkUserActionDto,
  AdminAlbumDto,
  GetAlbumsQueryDto,
  UpdateAlbumDto,
  AdminCreatorDto,
  GetCreatorsQueryDto,
  VerifyCreatorDto,
  UpdateCreatorRevenueShareDto,
  RevenueAnalyticsDto,
  GetAnalyticsQueryDto,
  SystemSettingsDto,
  UpdateSystemSettingsDto,
  AuditLogDto,
  GetAuditLogsQueryDto,
  PaginatedResponseDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== Dashboard ====================

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, type: DashboardStatsDto })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/charts')
  @ApiOperation({ summary: 'Get dashboard chart data' })
  @ApiResponse({ status: 200, type: DashboardChartDataDto })
  async getDashboardCharts(
    @Query('period') period?: string,
  ): Promise<DashboardChartDataDto> {
    return this.adminService.getDashboardCharts(period);
  }

  // ==================== User Management ====================

  @Get('users')
  @ApiOperation({ summary: 'Get users list' })
  @ApiResponse({ status: 200 })
  async getUsers(
    @Query() query: GetUsersQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserDto>> {
    return this.adminService.getUsers(query);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user details' })
  @ApiParam({ name: 'userId' })
  @ApiResponse({ status: 200, type: AdminUserDto })
  async getUser(@Param('userId') userId: string): Promise<AdminUserDto> {
    return this.adminService.getUser(userId);
  }

  @Put('users/:userId')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'userId' })
  @ApiResponse({ status: 200, type: AdminUserDto })
  async updateUser(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @Request() req,
  ): Promise<AdminUserDto> {
    return this.adminService.updateUser(userId, dto, req.user.sub);
  }

  @Post('users/bulk-action')
  @ApiOperation({ summary: 'Perform bulk action on users' })
  @ApiResponse({ status: 200 })
  async bulkUserAction(
    @Body() dto: BulkUserActionDto,
    @Request() req,
  ): Promise<{ affected: number }> {
    return this.adminService.bulkUserAction(dto, req.user.sub);
  }

  // ==================== Content Management ====================

  @Get('albums')
  @ApiOperation({ summary: 'Get albums list' })
  @ApiResponse({ status: 200 })
  async getAlbums(
    @Query() query: GetAlbumsQueryDto,
  ): Promise<PaginatedResponseDto<AdminAlbumDto>> {
    return this.adminService.getAlbums(query);
  }

  @Put('albums/:albumId')
  @ApiOperation({ summary: 'Update album' })
  @ApiParam({ name: 'albumId' })
  @ApiResponse({ status: 200, type: AdminAlbumDto })
  async updateAlbum(
    @Param('albumId') albumId: string,
    @Body() dto: UpdateAlbumDto,
    @Request() req,
  ): Promise<AdminAlbumDto> {
    return this.adminService.updateAlbum(albumId, dto, req.user.sub);
  }

  @Delete('albums/:albumId')
  @ApiOperation({ summary: 'Delete album' })
  @ApiParam({ name: 'albumId' })
  @ApiResponse({ status: 204 })
  async deleteAlbum(
    @Param('albumId') albumId: string,
    @Request() req,
  ): Promise<void> {
    return this.adminService.deleteAlbum(albumId, req.user.sub);
  }

  // ==================== Creator Management ====================

  @Get('creators')
  @ApiOperation({ summary: 'Get creators list' })
  @ApiResponse({ status: 200 })
  async getCreators(
    @Query() query: GetCreatorsQueryDto,
  ): Promise<PaginatedResponseDto<AdminCreatorDto>> {
    return this.adminService.getCreators(query);
  }

  @Put('creators/:creatorId/verify')
  @ApiOperation({ summary: 'Verify or unverify creator' })
  @ApiParam({ name: 'creatorId' })
  @ApiResponse({ status: 200, type: AdminCreatorDto })
  async verifyCreator(
    @Param('creatorId') creatorId: string,
    @Body() dto: VerifyCreatorDto,
    @Request() req,
  ): Promise<AdminCreatorDto> {
    return this.adminService.verifyCreator(creatorId, dto, req.user.sub);
  }

  @Put('creators/:creatorId/revenue-share')
  @ApiOperation({ summary: 'Update creator revenue share' })
  @ApiParam({ name: 'creatorId' })
  @ApiResponse({ status: 200, type: AdminCreatorDto })
  async updateCreatorRevenueShare(
    @Param('creatorId') creatorId: string,
    @Body() dto: UpdateCreatorRevenueShareDto,
    @Request() req,
  ): Promise<AdminCreatorDto> {
    return this.adminService.updateCreatorRevenueShare(creatorId, dto, req.user.sub);
  }

  // ==================== Analytics ====================

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, type: RevenueAnalyticsDto })
  async getRevenueAnalytics(
    @Query() query: GetAnalyticsQueryDto,
  ): Promise<RevenueAnalyticsDto> {
    return this.adminService.getRevenueAnalytics(query);
  }

  // ==================== System Settings ====================

  @Get('settings')
  @ApiOperation({ summary: 'Get system settings' })
  @ApiResponse({ status: 200, type: SystemSettingsDto })
  async getSystemSettings(): Promise<SystemSettingsDto> {
    return this.adminService.getSystemSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({ status: 200, type: SystemSettingsDto })
  async updateSystemSettings(
    @Body() dto: UpdateSystemSettingsDto,
    @Request() req,
  ): Promise<SystemSettingsDto> {
    return this.adminService.updateSystemSettings(dto, req.user.sub);
  }

  // ==================== Audit Logs ====================

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({ status: 200 })
  async getAuditLogs(
    @Query() query: GetAuditLogsQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogDto>> {
    return this.adminService.getAuditLogs(query);
  }
}
