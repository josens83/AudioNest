import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../../common/logger';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
