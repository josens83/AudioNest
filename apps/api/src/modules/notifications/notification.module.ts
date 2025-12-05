import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { EmailService } from './email.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, PushService, EmailService],
  exports: [NotificationService, PushService, EmailService],
})
export class NotificationModule {}
