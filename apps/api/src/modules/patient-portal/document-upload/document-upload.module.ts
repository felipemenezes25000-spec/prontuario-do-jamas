import { Module } from '@nestjs/common';
import { DocumentUploadService } from './document-upload.service';
import { DocumentUploadController } from './document-upload.controller';

@Module({
  controllers: [DocumentUploadController],
  providers: [DocumentUploadService],
  exports: [DocumentUploadService],
})
export class DocumentUploadModule {}
