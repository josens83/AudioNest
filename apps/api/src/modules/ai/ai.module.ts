import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AISpeedService } from './ai-speed.service';
import { AITTSService } from './ai-tts.service';
import { AIRecommendationService } from './ai-recommendation.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../../common/logger';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [AIController],
  providers: [AISpeedService, AITTSService, AIRecommendationService],
  exports: [AISpeedService, AITTSService, AIRecommendationService],
})
export class AIModule {}
