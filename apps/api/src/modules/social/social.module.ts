import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../../common/logger';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
