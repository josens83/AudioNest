import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPriority } from './dto/notification.dto';

interface PushPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
}

interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly fcmEnabled: boolean;
  private readonly fcmServerKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.fcmServerKey = this.config.get<string>('FCM_SERVER_KEY', '');
    this.fcmEnabled = !!this.fcmServerKey;

    if (!this.fcmEnabled) {
      this.logger.warn('FCM is not configured. Push notifications will be simulated.');
    }
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<PushResult[]> {
    const devices = await this.prisma.userDevice.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (devices.length === 0) {
      this.logger.debug(`No active devices found for user ${userId}`);
      return [];
    }

    const results: PushResult[] = [];

    for (const device of devices) {
      const result = await this.sendToDevice(device.pushToken, payload, device.platform);
      results.push(result);

      // If token is invalid, mark device as inactive
      if (!result.success && result.error?.includes('InvalidRegistration')) {
        await this.prisma.userDevice.update({
          where: { id: device.id },
          data: { isActive: false },
        });
      }
    }

    return results;
  }

  async sendToDevice(
    token: string,
    payload: PushPayload,
    platform: string,
  ): Promise<PushResult> {
    if (!this.fcmEnabled) {
      // Simulate push notification in development
      this.logger.debug(`[SIMULATED PUSH] Token: ${token.substring(0, 20)}...`);
      this.logger.debug(`[SIMULATED PUSH] Title: ${payload.title}`);
      this.logger.debug(`[SIMULATED PUSH] Body: ${payload.body}`);
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    try {
      const message = this.buildFcmMessage(token, payload, platform);
      const response = await this.sendFcmMessage(message);

      return {
        success: true,
        messageId: response.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendToMultipleDevices(
    tokens: string[],
    payload: PushPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.fcmEnabled) {
      this.logger.debug(`[SIMULATED MULTICAST] Sending to ${tokens.length} devices`);
      return { successCount: tokens.length, failureCount: 0 };
    }

    let successCount = 0;
    let failureCount = 0;

    // Send in batches of 500 (FCM limit)
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      try {
        const message = {
          registration_ids: batch,
          notification: {
            title: payload.title,
            body: payload.body,
            image: payload.imageUrl,
          },
          data: payload.data || {},
          priority: this.mapPriority(payload.priority),
        };

        const response = await this.sendFcmMessage(message);
        successCount += response.success || 0;
        failureCount += response.failure || 0;
      } catch (error) {
        this.logger.error(`Batch send failed: ${error.message}`);
        failureCount += batch.length;
      }
    }

    return { successCount, failureCount };
  }

  async sendTopicNotification(
    topic: string,
    payload: PushPayload,
  ): Promise<PushResult> {
    if (!this.fcmEnabled) {
      this.logger.debug(`[SIMULATED TOPIC PUSH] Topic: ${topic}`);
      return { success: true, messageId: `simulated-topic-${Date.now()}` };
    }

    try {
      const message = {
        to: `/topics/${topic}`,
        notification: {
          title: payload.title,
          body: payload.body,
          image: payload.imageUrl,
        },
        data: payload.data || {},
        priority: this.mapPriority(payload.priority),
      };

      const response = await this.sendFcmMessage(message);
      return { success: true, messageId: response.message_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<boolean> {
    if (!this.fcmEnabled) {
      this.logger.debug(`[SIMULATED] Subscribing ${tokens.length} devices to topic: ${topic}`);
      return true;
    }

    try {
      const response = await fetch(
        `https://iid.googleapis.com/iid/v1:batchAdd`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${this.fcmServerKey}`,
          },
          body: JSON.stringify({
            to: `/topics/${topic}`,
            registration_tokens: tokens,
          }),
        },
      );

      return response.ok;
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic: ${error.message}`);
      return false;
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<boolean> {
    if (!this.fcmEnabled) {
      this.logger.debug(`[SIMULATED] Unsubscribing ${tokens.length} devices from topic: ${topic}`);
      return true;
    }

    try {
      const response = await fetch(
        `https://iid.googleapis.com/iid/v1:batchRemove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${this.fcmServerKey}`,
          },
          body: JSON.stringify({
            to: `/topics/${topic}`,
            registration_tokens: tokens,
          }),
        },
      );

      return response.ok;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic: ${error.message}`);
      return false;
    }
  }

  private buildFcmMessage(
    token: string,
    payload: PushPayload,
    platform: string,
  ): any {
    const message: any = {
      to: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      priority: this.mapPriority(payload.priority),
    };

    if (payload.imageUrl) {
      message.notification.image = payload.imageUrl;
    }

    // Platform-specific configurations
    if (platform === 'ios') {
      message.notification.sound = 'default';
      message.notification.badge = 1;
      message.content_available = true;
      message.mutable_content = true;
    } else if (platform === 'android') {
      message.android = {
        notification: {
          icon: 'notification_icon',
          color: '#6366f1',
          sound: 'default',
          channel_id: 'default',
        },
      };
    }

    return message;
  }

  private async sendFcmMessage(message: any): Promise<any> {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${this.fcmServerKey}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FCM request failed: ${error}`);
    }

    return response.json();
  }

  private mapPriority(priority?: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
      case NotificationPriority.HIGH:
        return 'high';
      default:
        return 'normal';
    }
  }
}
