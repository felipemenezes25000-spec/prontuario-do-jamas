import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClinicalDocumentationService } from './clinical-documentation.service';
import {
  CreateInterConsultDto,
  RespondInterConsultDto,
  CreateCaseDiscussionDto,
  CreateAttendanceDeclarationDto,
  CopyForwardDto,
  SignNoteDto,
  CreateAddendumDto,
  CreateSmartPhraseDto,
  UpdateSmartPhraseDto,
  ResolveSmartLinkDto,
  PhysicalExamMacroDto,
  CompareNotesDto,
  AttachMediaDto,
  CreateAnatomicalDiagramDto,
  CreateFromTemplateDto,
  AiDifferentialDiagnosisDto,
  AiAutoCompleteDto,
  AiTranslateNoteDto,
  AiPatientSummaryDto,
} from './dto/clinical-documentation.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Clinical Documentation')
@ApiBearerAuth('access-token')
@Controller('clinical-documentation')
export class ClinicalDocumentationController {
  constructor(private readonly service: ClinicalDocumentationService) {}

  // --- Interconsultation ---

  @Post('interconsult')
  @ApiOperation({ summary: 'Create interconsultation request' })
  @ApiResponse({ status: 201, description: 'Interconsultation created' })
  async createInterConsult(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInterConsultDto,
  ) {
    return this.service.createInterConsult(tenantId, user.sub, dto);
  }

  @Patch('interconsult/:id/respond')
  @ApiParam({ name: 'id', description: 'Interconsultation document UUID' })
  @ApiOperation({ summary: 'Respond to interconsultation' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  async respondInterConsult(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RespondInterConsultDto,
  ) {
    return this.service.respondInterConsult(tenantId, user.sub, id, dto);
  }

  @Get('interconsult')
  @ApiOperation({ summary: 'List interconsultations' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of interconsultations' })
  async listInterConsults(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listInterConsults(tenantId, patientId, status);
  }

  // --- Case Discussion ---

  @Post('case-discussion')
  @ApiOperation({ summary: 'Create case discussion / medical board note' })
  @ApiResponse({ status: 201, description: 'Case discussion created' })
  async createCaseDiscussion(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCaseDiscussionDto,
  ) {
    return this.service.createCaseDiscussion(tenantId, user.sub, dto);
  }

  @Get('case-discussion')
  @ApiOperation({ summary: 'List case discussions' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiResponse({ status: 200, description: 'List of case discussions' })
  async listCaseDiscussions(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.listCaseDiscussions(tenantId, patientId);
  }

  // --- Attendance Declaration ---

  @Post('attendance-declaration')
  @ApiOperation({ summary: 'Create attendance declaration' })
  @ApiResponse({ status: 201, description: 'Declaration created' })
  async createAttendanceDeclaration(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAttendanceDeclarationDto,
  ) {
    return this.service.createAttendanceDeclaration(tenantId, user.sub, dto);
  }

  // --- Copy-Forward ---

  @Post('copy-forward')
  @ApiOperation({ summary: 'Copy note from previous encounter' })
  @ApiResponse({ status: 201, description: 'Note copied' })
  async copyForward(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CopyForwardDto,
  ) {
    return this.service.copyForward(tenantId, user.sub, dto);
  }

  // --- Sign / Lock / Addendum ---

  @Post('sign')
  @ApiOperation({ summary: 'Sign and lock a note (CFM compliant)' })
  @ApiResponse({ status: 200, description: 'Note signed and locked' })
  async signNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SignNoteDto,
  ) {
    return this.service.signNote(tenantId, user.sub, dto);
  }

  @Post('addendum')
  @ApiOperation({ summary: 'Create addendum to signed note' })
  @ApiResponse({ status: 201, description: 'Addendum created' })
  async createAddendum(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAddendumDto,
  ) {
    return this.service.createAddendum(tenantId, user.sub, dto);
  }

  // --- SmartPhrases ---

  @Post('smart-phrases')
  @ApiOperation({ summary: 'Create a text shortcut (SmartPhrase)' })
  @ApiResponse({ status: 201, description: 'SmartPhrase created' })
  async createSmartPhrase(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSmartPhraseDto,
  ) {
    return this.service.createSmartPhrase(tenantId, user.sub, dto);
  }

  @Get('smart-phrases')
  @ApiOperation({ summary: 'List user SmartPhrases' })
  @ApiResponse({ status: 200, description: 'List of SmartPhrases' })
  async listSmartPhrases(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.listSmartPhrases(tenantId, user.sub);
  }

  @Patch('smart-phrases/:id')
  @ApiParam({ name: 'id', description: 'SmartPhrase document UUID' })
  @ApiOperation({ summary: 'Update a SmartPhrase' })
  @ApiResponse({ status: 200, description: 'SmartPhrase updated' })
  async updateSmartPhrase(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSmartPhraseDto,
  ) {
    return this.service.updateSmartPhrase(tenantId, user.sub, id, dto);
  }

  @Delete('smart-phrases/:id')
  @ApiParam({ name: 'id', description: 'SmartPhrase document UUID' })
  @ApiOperation({ summary: 'Delete a SmartPhrase' })
  @ApiResponse({ status: 200, description: 'SmartPhrase deleted' })
  async deleteSmartPhrase(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.service.deleteSmartPhrase(tenantId, user.sub, id);
  }

  @Get('smart-phrases/expand/:shortcut')
  @ApiParam({ name: 'shortcut', description: 'SmartPhrase shortcut text' })
  @ApiOperation({ summary: 'Expand a SmartPhrase shortcut' })
  @ApiResponse({ status: 200, description: 'Expanded text' })
  async expandSmartPhrase(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('shortcut') shortcut: string,
  ) {
    return this.service.expandSmartPhrase(tenantId, user.sub, shortcut);
  }

  // --- SmartLinks ---

  @Post('smart-links/resolve')
  @ApiOperation({ summary: 'Resolve a SmartLink to live data' })
  @ApiResponse({ status: 200, description: 'Resolved data' })
  async resolveSmartLink(
    @CurrentTenant() tenantId: string,
    @Body() dto: ResolveSmartLinkDto,
  ) {
    return this.service.resolveSmartLink(tenantId, dto);
  }

  // --- Physical Exam Macros ---

  @Post('exam-macro')
  @ApiOperation({ summary: 'Apply physical exam macro by system' })
  @ApiResponse({ status: 201, description: 'Macro applied' })
  async applyPhysicalExamMacro(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PhysicalExamMacroDto,
  ) {
    return this.service.applyPhysicalExamMacro(tenantId, user.sub, dto);
  }

  @Get('exam-macro/defaults')
  @ApiOperation({ summary: 'Get normal physical exam defaults per system' })
  @ApiResponse({ status: 200, description: 'Default exam findings' })
  async getPhysicalExamDefaults() {
    return this.service.getPhysicalExamDefaults();
  }

  // --- Note Comparison ---

  @Post('compare')
  @ApiOperation({ summary: 'Compare two notes side-by-side' })
  @ApiResponse({ status: 200, description: 'Comparison result' })
  async compareNotes(
    @CurrentTenant() tenantId: string,
    @Body() dto: CompareNotesDto,
  ) {
    return this.service.compareNotes(tenantId, dto);
  }

  // --- Media Attachments ---

  @Post('media')
  @ApiOperation({ summary: 'Attach media to a document' })
  @ApiResponse({ status: 200, description: 'Media attached' })
  async attachMedia(
    @CurrentTenant() tenantId: string,
    @Body() dto: AttachMediaDto,
  ) {
    return this.service.attachMedia(tenantId, dto);
  }

  // --- Anatomical Diagram ---

  @Post('anatomical-diagram')
  @ApiOperation({ summary: 'Create anatomical diagram with markings' })
  @ApiResponse({ status: 201, description: 'Diagram created' })
  async createAnatomicalDiagram(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAnatomicalDiagramDto,
  ) {
    return this.service.createAnatomicalDiagram(tenantId, user.sub, dto);
  }

  // --- Specialty Templates ---

  @Post('template')
  @ApiOperation({ summary: 'Create note from specialty template' })
  @ApiResponse({ status: 201, description: 'Note created from template' })
  async createFromTemplate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFromTemplateDto,
  ) {
    return this.service.createFromTemplate(tenantId, user.sub, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available specialty templates' })
  @ApiResponse({ status: 200, description: 'Available templates' })
  async getAvailableTemplates() {
    return this.service.getAvailableTemplates();
  }

  // --- AI Features ---

  @Post('ai/differential-diagnosis')
  @ApiOperation({ summary: 'AI-powered differential diagnosis suggestion' })
  @ApiResponse({ status: 200, description: 'Differential diagnosis list' })
  async aiDifferentialDiagnosis(
    @CurrentTenant() tenantId: string,
    @Body() dto: AiDifferentialDiagnosisDto,
  ) {
    return this.service.aiDifferentialDiagnosis(tenantId, dto);
  }

  @Post('ai/auto-complete')
  @ApiOperation({ summary: 'AI auto-complete note text' })
  @ApiResponse({ status: 200, description: 'Auto-complete suggestions' })
  async aiAutoComplete(
    @CurrentTenant() tenantId: string,
    @Body() dto: AiAutoCompleteDto,
  ) {
    return this.service.aiAutoComplete(tenantId, dto);
  }

  @Post('ai/translate')
  @ApiOperation({ summary: 'AI translate note to another language' })
  @ApiResponse({ status: 200, description: 'Translated content' })
  async aiTranslateNote(
    @CurrentTenant() tenantId: string,
    @Body() dto: AiTranslateNoteDto,
  ) {
    return this.service.aiTranslateNote(tenantId, dto);
  }

  @Post('ai/patient-summary')
  @ApiOperation({ summary: 'AI generate patient-friendly admission summary' })
  @ApiResponse({ status: 200, description: 'Patient-friendly summary' })
  async aiPatientSummary(
    @CurrentTenant() tenantId: string,
    @Body() dto: AiPatientSummaryDto,
  ) {
    return this.service.aiPatientSummary(tenantId, dto);
  }
}
