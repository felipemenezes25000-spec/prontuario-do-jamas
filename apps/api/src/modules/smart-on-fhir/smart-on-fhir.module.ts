import { Module } from '@nestjs/common';
import { SmartOnFhirService } from './smart-on-fhir.service';
import { SmartOnFhirController } from './smart-on-fhir.controller';

@Module({
  controllers: [SmartOnFhirController],
  providers: [SmartOnFhirService],
  exports: [SmartOnFhirService],
})
export class SmartOnFhirModule {}
