import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from './push.service';
import { EmailService } from './email.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationPreferencesDto,
  UpdateNotificationPreferencesDto,
  RegisterDeviceDto,
  DeviceResponseDto,
  NotificationDto,
  NotificationListResponseDto,
  SendNotificationDto,
  BroadcastNotificationDto,
  GetNotificationsQueryDto,
  NotificationStatsDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Default notification preferences
  private readonly defaultPreferences: NotificationPreferencesDto = {
    pushEnabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    typeSettings: {
      // Content
      [NotificationType.NEW_EPISODE]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },
      [NotificationType.NEW_ALBUM]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },
      [NotificationType.CONTENT_RECOMMENDATION]: { enabled: true, channels: [NotificationChannel.IN_APP] },

      // Social
      [NotificationType.NEW_FOLLOWER]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },
      [NotificationType.PLAYLIST_INVITE]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL] },
      [NotificationType.CLUB_INVITE]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL] },
      [NotificationType.CLUB_MEETING]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },
      [NotificationType.ACTIVITY_LIKE]: { enabled: true, channels: [NotificationChannel.IN_APP] },
      [NotificationType.ACTIVITY_COMMENT]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },

      // Creator
      [NotificationType.TIP_RECEIVED]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL] },
      [NotificationType.PAYOUT_PROCESSED]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL] },
      [NotificationType.MILESTONE_REACHED]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },

      // System
      [NotificationType.SUBSCRIPTION_EXPIRING]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL] },
      [NotificationType.SUBSCRIPTION_RENEWED]: { enabled: true, channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL] },
      [NotificationType.FAMILY_INVITE]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL] },
      [NotificationType.GIFT_RECEIVED]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL] },
      [NotificationType.ACHIEVEMENT_UNLOCKED]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },
      [NotificationType.LEVEL_UP]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },

      // Promotional
      [NotificationType.PROMOTION]: { enabled: true, channels: [NotificationChannel.IN_APP] },
      [NotificationType.ANNOUNCEMENT]: { enabled: true, channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP] },
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
  ) {}

  // ==================== User Preferences ====================

  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      return this.defaultPreferences;
    }

    return {
      pushEnabled: prefs.pushEnabled,
      emailEnabled: prefs.emailEnabled,
      inAppEnabled: prefs.inAppEnabled,
      quietHoursStart: prefs.quietHoursStart ?? undefined,
      quietHoursEnd: prefs.quietHoursEnd ?? undefined,
      typeSettings: (prefs.typeSettings as any) || this.defaultPreferences.typeSettings,
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    const data: any = {};

    if (dto.pushEnabled !== undefined) data.pushEnabled = dto.pushEnabled;
    if (dto.emailEnabled !== undefined) data.emailEnabled = dto.emailEnabled;
    if (dto.inAppEnabled !== undefined) data.inAppEnabled = dto.inAppEnabled;
    if (dto.quietHoursStart !== undefined) data.quietHoursStart = dto.quietHoursStart;
    if (dto.quietHoursEnd !== undefined) data.quietHoursEnd = dto.quietHoursEnd;

    if (dto.typeSettings) {
      const currentSettings = existing?.typeSettings || this.defaultPreferences.typeSettings;
      data.typeSettings = { ...currentSettings, ...dto.typeSettings };
    }

    const updated = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
        typeSettings: data.typeSettings || this.defaultPreferences.typeSettings,
      },
    });

    return this.getPreferences(userId);
  }

  // ==================== Device Management ====================

  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<DeviceResponseDto> {
    // Check if device already exists
    const existing = await this.prisma.userDevice.findFirst({
      where: {
        userId,
        pushToken: dto.token,
      },
    });

    if (existing) {
      // Update last active
      const updated = await this.prisma.userDevice.update({
        where: { id: existing.id },
        data: {
          lastActiveAt: new Date(),
          isActive: true,
        },
      });

      return this.mapDeviceToDto(updated);
    }

    const device = await this.prisma.userDevice.create({
      data: {
        userId,
        pushToken: dto.token,
        platform: dto.platform,
        deviceName: dto.deviceName,
        deviceModel: dto.deviceModel,
        isActive: true,
      },
    });

    return this.mapDeviceToDto(device);
  }

  async getDevices(userId: string): Promise<DeviceResponseDto[]> {
    const devices = await this.prisma.userDevice.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return devices.map(d => this.mapDeviceToDto(d));
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.prisma.userDevice.findFirst({
      where: {
        id: deviceId,
        userId,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.userDevice.update({
      where: { id: deviceId },
      data: { isActive: false },
    });
  }

  // ==================== Notification Sending ====================

  async send(dto: SendNotificationDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: {
        notificationPreference: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const prefs = user.notificationPreference || this.defaultPreferences;
    const typeSettings = (prefs.typeSettings as any)?.[dto.type] ||
      this.defaultPreferences.typeSettings[dto.type];

    if (!typeSettings?.enabled) {
      this.logger.debug(`Notification type ${dto.type} is disabled for user ${dto.userId}`);
      return;
    }

    // Check quiet hours
    if (prefs.quietHoursStart !== null && prefs.quietHoursEnd !== null) {
      const now = new Date();
      const currentHour = now.getHours();
      const start = prefs.quietHoursStart;
      const end = prefs.quietHoursEnd;

      const isQuietHour = start <= end
        ? currentHour >= start && currentHour < end
        : currentHour >= start || currentHour < end;

      if (isQuietHour && dto.priority !== NotificationPriority.URGENT) {
        this.logger.debug(`Skipping non-urgent notification during quiet hours`);
        // Store for later delivery or just save to in-app
        typeSettings.channels = [NotificationChannel.IN_APP];
      }
    }

    const channels = dto.channels || typeSettings.channels;
    const notificationId = await this.createInAppNotification(dto);

    // Send to each channel
    for (const channel of channels) {
      try {
        switch (channel) {
          case NotificationChannel.PUSH:
            if (prefs.pushEnabled) {
              await this.pushService.sendToUser(dto.userId, {
                title: dto.title,
                body: dto.body,
                imageUrl: dto.imageUrl,
                data: { ...dto.data, notificationId },
                priority: dto.priority,
              });
            }
            break;

          case NotificationChannel.EMAIL:
            if (prefs.emailEnabled && user.email) {
              await this.sendEmailNotification(user.email, dto);
            }
            break;

          case NotificationChannel.IN_APP:
            // Already created above
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send ${channel} notification: ${error.message}`);
      }
    }
  }

  async broadcast(dto: BroadcastNotificationDto): Promise<{ sentCount: number }> {
    let userFilter: any = {};

    // Apply segment filter
    switch (dto.segment) {
      case 'free':
        userFilter.subscriptionTier = 'FREE';
        break;
      case 'vip':
        userFilter.subscriptionTier = 'VIP';
        break;
      case 'svip':
        userFilter.subscriptionTier = 'SVIP';
        break;
      case 'creators':
        userFilter.isCreator = true;
        break;
      // 'all' or undefined = no filter
    }

    const users = await this.prisma.user.findMany({
      where: userFilter,
      select: { id: true, email: true },
    });

    let sentCount = 0;

    for (const user of users) {
      try {
        await this.send({
          userId: user.id,
          type: dto.type,
          title: dto.title,
          body: dto.body,
          imageUrl: dto.imageUrl,
          data: dto.data,
          channels: dto.channels,
        });
        sentCount++;
      } catch (error) {
        this.logger.error(`Failed to send broadcast to user ${user.id}: ${error.message}`);
      }
    }

    return { sentCount };
  }

  // ==================== Notification Retrieval ====================

  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    const limit = query.limit || 20;
    const where: any = { userId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.unreadOnly) {
      where.read = false;
    }

    if (query.cursor) {
      where.id = { lt: query.cursor };
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = notifications.length > limit;
    if (hasMore) {
      notifications.pop();
    }

    const unreadCount = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return {
      notifications: notifications.map(n => this.mapNotificationToDto(n)),
      unreadCount,
      hasMore,
      cursor: notifications.length > 0 ? notifications[notifications.length - 1].id : undefined,
    };
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });
  }

  // ==================== Admin/Analytics ====================

  async getStats(period: string = '7d'): Promise<NotificationStatsDto> {
    const days = parseInt(period) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const notifications = await this.prisma.notification.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const totalSent = notifications.length;
    const totalDelivered = notifications.length; // In a real impl, track delivery status
    const totalRead = notifications.filter(n => n.read).length;

    const byType: Record<string, number> = {};
    for (const n of notifications) {
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    return {
      totalSent,
      totalDelivered,
      totalRead,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalSent > 0 ? (totalRead / totalSent) * 100 : 0,
      byChannel: {
        [NotificationChannel.PUSH]: { sent: 0, delivered: 0, failed: 0 },
        [NotificationChannel.EMAIL]: { sent: 0, delivered: 0, failed: 0 },
        [NotificationChannel.IN_APP]: { sent: totalSent, delivered: totalDelivered, failed: 0 },
      },
      byType,
    };
  }

  // ==================== Helper Methods ====================

  private async createInAppNotification(dto: SendNotificationDto): Promise<string> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        imageUrl: dto.imageUrl,
        data: dto.data || {},
        priority: dto.priority || NotificationPriority.NORMAL,
        read: false,
      },
    });

    return notification.id;
  }

  private async sendEmailNotification(
    email: string,
    dto: SendNotificationDto,
  ): Promise<void> {
    // Map notification type to email template
    const templateMap: Partial<Record<NotificationType, string>> = {
      [NotificationType.NEW_FOLLOWER]: 'new_follower',
      [NotificationType.TIP_RECEIVED]: 'tip_received',
      [NotificationType.PAYOUT_PROCESSED]: 'payout_processed',
      [NotificationType.GIFT_RECEIVED]: 'gift_received',
      [NotificationType.FAMILY_INVITE]: 'family_invite',
      [NotificationType.SUBSCRIPTION_EXPIRING]: 'subscription_expiring',
      [NotificationType.SUBSCRIPTION_RENEWED]: 'subscription_renewed',
      [NotificationType.ACHIEVEMENT_UNLOCKED]: 'achievement_unlocked',
      [NotificationType.NEW_EPISODE]: 'new_episode',
    };

    const templateId = templateMap[dto.type];

    if (templateId) {
      await this.emailService.sendTemplate(templateId, email, dto.data || {});
    } else {
      // Fallback to simple email
      await this.emailService.send({
        to: email,
        subject: dto.title,
        text: dto.body,
        html: `<p>${dto.body}</p>`,
      });
    }
  }

  private mapDeviceToDto(device: any): DeviceResponseDto {
    return {
      id: device.id,
      platform: device.platform,
      deviceName: device.deviceName,
      registeredAt: device.createdAt,
      lastActiveAt: device.lastActiveAt,
    };
  }

  private mapNotificationToDto(notification: any): NotificationDto {
    return {
      id: notification.id,
      type: notification.type as NotificationType,
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      data: notification.data,
      read: notification.read,
      priority: notification.priority as NotificationPriority,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    };
  }

  // ==================== Convenience Methods for Specific Notifications ====================

  async notifyNewFollower(userId: string, followerName: string, followerId: string): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.NEW_FOLLOWER,
      title: '새로운 팔로워',
      body: `${followerName}님이 회원님을 팔로우하기 시작했습니다.`,
      data: { followerName, followerId },
    });
  }

  async notifyNewEpisode(
    subscriberIds: string[],
    albumTitle: string,
    episodeTitle: string,
    episodeId: string,
  ): Promise<void> {
    for (const userId of subscriberIds) {
      await this.send({
        userId,
        type: NotificationType.NEW_EPISODE,
        title: '새 에피소드',
        body: `${albumTitle}의 새 에피소드 "${episodeTitle}"가 공개되었습니다.`,
        data: { albumTitle, episodeTitle, episodeId },
      });
    }
  }

  async notifyTipReceived(
    creatorId: string,
    senderName: string,
    amount: number,
    message?: string,
  ): Promise<void> {
    await this.send({
      userId: creatorId,
      type: NotificationType.TIP_RECEIVED,
      title: '팁 수령',
      body: `${senderName}님이 ${amount} 코인을 팁으로 보냈습니다.`,
      data: { senderName, amount, message },
      priority: NotificationPriority.HIGH,
    });
  }

  async notifyAchievementUnlocked(
    userId: string,
    achievementName: string,
    rewardCoins: number,
    rewardXp: number,
  ): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: '업적 달성! 🏆',
      body: `${achievementName} 업적을 달성했습니다!`,
      data: { achievementName, rewardCoins, rewardXp },
    });
  }

  async notifyFamilyInvite(
    inviteeId: string,
    ownerName: string,
    inviteCode: string,
  ): Promise<void> {
    await this.send({
      userId: inviteeId,
      type: NotificationType.FAMILY_INVITE,
      title: '가족 요금제 초대',
      body: `${ownerName}님이 가족 요금제에 초대했습니다.`,
      data: { ownerName, inviteCode },
    });
  }

  async notifyGiftReceived(
    recipientId: string,
    senderName: string,
    tierName: string,
    duration: number,
    message?: string,
  ): Promise<void> {
    await this.send({
      userId: recipientId,
      type: NotificationType.GIFT_RECEIVED,
      title: '선물 구독 도착! 🎁',
      body: `${senderName}님이 ${tierName} ${duration}개월 구독을 선물로 보냈습니다!`,
      data: { senderName, tierName, duration, message },
      priority: NotificationPriority.HIGH,
    });
  }
}
