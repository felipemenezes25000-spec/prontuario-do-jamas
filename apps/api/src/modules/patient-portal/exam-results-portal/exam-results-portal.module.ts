import { Module } from '@nestjs/common';
import { ExamResultsPortalService } from './exam-results-portal.service';
import { ExamResultsPortalController } from './exam-results-portal.controller';

@Module({
  controllers: [ExamResultsPortalController],
  providers: [ExamResultsPortalService],
  exports: [ExamResultsPortalService],
})
export class ExamResultsPortalModule {}
