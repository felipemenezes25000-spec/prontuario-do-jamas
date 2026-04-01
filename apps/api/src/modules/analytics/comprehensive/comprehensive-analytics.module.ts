import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ComprehensiveAnalyticsController } from './comprehensive-analytics.controller';
import { ComprehensiveAnalyticsService } from './comprehensive-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [ComprehensiveAnalyticsController],
  providers: [ComprehensiveAnalyticsService],
  exports: [ComprehensiveAnalyticsService],
})
export class ComprehensiveAnalyticsModule {}
