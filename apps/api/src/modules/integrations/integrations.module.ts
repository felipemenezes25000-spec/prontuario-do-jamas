import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { FhirMapperService } from './fhir/fhir-mapper.service';
import { Hl7ParserService } from './hl7/hl7-parser.service';
import { PacsStubService } from './pacs/pacs-stub.service';
import { LisStubService } from './lis/lis-stub.service';

@Module({
  controllers: [IntegrationsController],
  providers: [
    FhirMapperService,
    Hl7ParserService,
    PacsStubService,
    LisStubService,
  ],
  exports: [
    FhirMapperService,
    Hl7ParserService,
    PacsStubService,
    LisStubService,
  ],
})
export class IntegrationsModule {}
