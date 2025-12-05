import { Module } from '@nestjs/common';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { MonetizationController } from './monetization.controller';
import { MonetizationService } from './monetization.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../../common/logger';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [CreatorsController, MonetizationController],
  providers: [CreatorsService, MonetizationService],
  exports: [CreatorsService, MonetizationService],
})
export class CreatorsModule {}
