import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { TemplatesService } from './templates.service';
import { DocumentsController } from './documents.controller';
import { TemplatesController } from './templates.controller';

@Module({
  controllers: [DocumentsController, TemplatesController],
  providers: [DocumentsService, TemplatesService],
  exports: [DocumentsService, TemplatesService],
})
export class DocumentsModule {}
