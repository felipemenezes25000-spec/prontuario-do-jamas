import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentReplicationService } from './document-replication.service';
import { TemplatesService } from './templates.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { DocumentsController } from './documents.controller';
import { TemplatesController } from './templates.controller';

@Module({
  controllers: [DocumentsController, TemplatesController],
  providers: [
    DocumentsService,
    DocumentReplicationService,
    TemplatesService,
    PdfGeneratorService,
  ],
  exports: [
    DocumentsService,
    DocumentReplicationService,
    TemplatesService,
    PdfGeneratorService,
  ],
})
export class DocumentsModule {}
