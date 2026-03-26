import { Module } from '@nestjs/common';
import { DocumentOcrController } from './document-ocr.controller';
import { DocumentOcrService } from './document-ocr.service';

@Module({
  controllers: [DocumentOcrController],
  providers: [DocumentOcrService],
  exports: [DocumentOcrService],
})
export class DocumentOcrModule {}
