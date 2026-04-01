import {
  Controller,
  Get,
  Post,
  Put,
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
import { AdvancedDocumentationService } from './advanced-documentation.service';
import {
  AnatomicDrawingDto,
  UpdateAnatomicDrawingDto,
  ExamMacroDto,
  ExamSystem,
  CreateCustomMacroDto,
  NoteDiffDto,
  NoteMediaDto,
} from './dto/advanced-documentation.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Clinical Notes - Advanced Documentation')
@ApiBearerAuth('access-token')
@Controller('clinical-notes/advanced')
export class AdvancedDocumentationController {
  constructor(
    private readonly service: AdvancedDocumentationService,
  ) {}

  // ─── 8. Anatomic Diagram Drawing ─────────────────────────────────────

  @Post('drawings')
  @ApiOperation({ summary: 'Save anatomic diagram drawing with annotations' })
  @ApiResponse({ status: 201, description: 'Drawing saved' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  async saveDrawing(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AnatomicDrawingDto,
  ) {
    return this.service.saveDrawing(tenantId, user.sub, dto);
  }

  @Get('drawings/encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get all anatomic drawings for an encounter' })
  @ApiResponse({ status: 200, description: 'List of drawings' })
  async getDrawings(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getDrawings(tenantId, encounterId);
  }

  @Put('drawings/:drawingId')
  @ApiParam({ name: 'drawingId', description: 'Drawing UUID' })
  @ApiOperation({ summary: 'Update an existing anatomic drawing' })
  @ApiResponse({ status: 200, description: 'Drawing updated' })
  @ApiResponse({ status: 404, description: 'Drawing not found' })
  async updateDrawing(
    @CurrentTenant() tenantId: string,
    @Param('drawingId') drawingId: string,
    @Body() dto: UpdateAnatomicDrawingDto,
  ) {
    return this.service.updateDrawing(tenantId, drawingId, dto);
  }

  // ─── 9. Physical Exam Macros ──────────────────────────────────────────

  @Get('exam-macros')
  @ApiOperation({ summary: 'Get all default exam macro templates (Portuguese BR)' })
  @ApiResponse({ status: 200, description: 'All exam macro templates' })
  getAllExamMacros() {
    return this.service.getAllExamMacros();
  }

  @Get('exam-macros/:system')
  @ApiParam({ name: 'system', enum: ExamSystem, description: 'Body system' })
  @ApiOperation({ summary: 'Get exam macro template for a specific body system' })
  @ApiResponse({ status: 200, description: 'Exam macro template with normal text and common abnormalities' })
  getExamMacro(
    @Param('system') system: ExamSystem,
  ) {
    return this.service.getExamMacro(system);
  }

  @Post('exam-macros/apply')
  @ApiOperation({ summary: 'Apply exam macro — merge normal text with selected abnormal findings' })
  @ApiResponse({ status: 200, description: 'Generated exam text' })
  applyExamMacro(
    @Body() dto: ExamMacroDto,
  ) {
    return this.service.applyExamMacro(dto);
  }

  @Post('exam-macros/custom')
  @ApiOperation({ summary: 'Create a custom exam macro template' })
  @ApiResponse({ status: 201, description: 'Custom macro created' })
  async createCustomMacro(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCustomMacroDto,
  ) {
    return this.service.createCustomMacro(tenantId, user.sub, dto);
  }

  @Get('exam-macros/custom/mine')
  @ApiOperation({ summary: 'List my custom exam macros' })
  @ApiResponse({ status: 200, description: 'List of custom macros' })
  getCustomMacros(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getCustomMacros(tenantId, user.sub);
  }

  // ─── 10. Note Diff ────────────────────────────────────────────────────

  @Post('diff')
  @ApiOperation({ summary: 'Compare two clinical notes side-by-side (line-by-line diff)' })
  @ApiResponse({ status: 200, description: 'Diff result with changes' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async compareNotes(
    @CurrentTenant() tenantId: string,
    @Body() dto: NoteDiffDto,
  ) {
    return this.service.compareNotes(tenantId, dto);
  }

  @Get('consecutive-notes/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max notes to return (default 10)' })
  @ApiOperation({ summary: 'Get consecutive notes for rounds comparison' })
  @ApiResponse({ status: 200, description: 'List of consecutive notes' })
  async getConsecutiveNotes(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getConsecutiveNotes(
      tenantId,
      patientId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ─── 11. Note with Media ──────────────────────────────────────────────

  @Post('media')
  @ApiOperation({ summary: 'Attach media (photo, audio, video) to a clinical note' })
  @ApiResponse({ status: 201, description: 'Media attached' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async attachMedia(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NoteMediaDto,
  ) {
    return this.service.attachMedia(tenantId, user.sub, dto);
  }

  @Get('media/note/:noteId')
  @ApiParam({ name: 'noteId', description: 'Clinical note UUID' })
  @ApiOperation({ summary: 'Get all media attached to a clinical note' })
  @ApiResponse({ status: 200, description: 'List of media attachments' })
  getMediaForNote(
    @CurrentTenant() tenantId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.service.getMediaForNote(tenantId, noteId);
  }

  @Delete('media/:mediaId')
  @ApiParam({ name: 'mediaId', description: 'Media UUID' })
  @ApiOperation({ summary: 'Soft-delete a media attachment' })
  @ApiResponse({ status: 200, description: 'Media removed (soft delete)' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  removeMedia(
    @CurrentTenant() tenantId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.service.removeMedia(tenantId, mediaId);
  }
}
