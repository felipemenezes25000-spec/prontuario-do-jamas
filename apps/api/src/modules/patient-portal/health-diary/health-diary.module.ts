import { Module } from '@nestjs/common';
import { HealthDiaryService } from './health-diary.service';
import { HealthDiaryController } from './health-diary.controller';

@Module({
  controllers: [HealthDiaryController],
  providers: [HealthDiaryService],
  exports: [HealthDiaryService],
})
export class HealthDiaryModule {}
