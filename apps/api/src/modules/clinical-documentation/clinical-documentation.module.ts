import { Module } from '@nestjs/common';
import { ClinicalDocumentationService } from './clinical-documentation.service';
import { ClinicalDocumentationController } from './clinical-documentation.controller';

@Module({
  controllers: [ClinicalDocumentationController],
  providers: [ClinicalDocumentationService],
  exports: [ClinicalDocumentationService],
})
export class ClinicalDocumentationModule {}
