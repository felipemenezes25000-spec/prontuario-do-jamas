import { Module } from '@nestjs/common';
import { BulkFhirService } from './bulk-fhir.service';
import { BulkFhirController } from './bulk-fhir.controller';

@Module({
  controllers: [BulkFhirController],
  providers: [BulkFhirService],
  exports: [BulkFhirService],
})
export class BulkFhirModule {}
