import { Module } from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalNotesController } from './clinical-notes.controller';
import { SmartDocumentationService } from './smart-documentation.service';
import { SmartDocumentationController } from './smart-documentation.controller';
import { AdvancedDocumentationService } from './advanced-documentation.service';
import { AdvancedDocumentationController } from './advanced-documentation.controller';
import { SmartTextService } from './smart-text.service';
import { SmartTextController } from './smart-text.controller';
import { NoteManagementService } from './note-management.service';
import { NoteManagementController } from './note-management.controller';

@Module({
  controllers: [
    ClinicalNotesController,
    SmartDocumentationController,
    AdvancedDocumentationController,
    SmartTextController,
    NoteManagementController,
  ],
  providers: [
    ClinicalNotesService,
    SmartDocumentationService,
    AdvancedDocumentationService,
    SmartTextService,
    NoteManagementService,
  ],
  exports: [
    ClinicalNotesService,
    SmartDocumentationService,
    AdvancedDocumentationService,
    SmartTextService,
    NoteManagementService,
  ],
})
export class ClinicalNotesModule {}
