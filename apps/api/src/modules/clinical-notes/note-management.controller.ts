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
import { NoteManagementService } from './note-management.service';
import {
  InterconsultationDto,
  InterconsultationResponseDto,
  CopyForwardNoteDto,
  NoteSignatureDto,
  NoteMediaDto,
  AnatomicalDrawingDto,
  SpecialtyTemplateDto,
  NoteAddendumDto,
} from './dto/note-management.dto';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Clinical Notes - Note Management')
@ApiBearerAuth('access-token')
@Controller('clinical-notes')
export class NoteManagementController {
  constructor(private readonly noteManagementService: NoteManagementService) {}

  // ─── Interconsultation ──────────────────────────────────────────────────────

  @Post('interconsultations')
  @ApiOperation({
    summary: 'Request interconsultation',
    description:
      'Creates a structured interconsultation request from the requesting doctor ' +
      'to a target specialty. Urgency determines notification priority.',
  })
  @ApiResponse({ status: 201, description: 'Interconsultation request created' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  async requestInterconsultation(@Body() dto: InterconsultationDto) {
    return this.noteManagementService.requestInterconsultation(dto);
  }

  @Post('interconsultations/:id/respond')
  @ApiOperation({
    summary: 'Respond to interconsultation',
    description:
      'Specialist provides a structured response with clinical opinion, ' +
      'recommendations, and optional proposed diagnosis.',
  })
  @ApiParam({ name: 'id', description: 'Interconsultation request UUID' })
  @ApiResponse({ status: 200, description: 'Interconsultation answered' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 409, description: 'Already answered' })
  async respondToInterconsultation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InterconsultationResponseDto,
  ) {
    return this.noteManagementService.respondToInterconsultation({
      ...dto,
      requestId: id,
    });
  }

  @Get('interconsultations')
  @ApiOperation({ summary: 'List interconsultation requests with filters' })
  @ApiQuery({ name: 'encounterId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'targetSpecialty', required: false })
  @ApiResponse({ status: 200, description: 'List of interconsultation requests' })
  async listInterconsultations(
    @Query('encounterId') encounterId?: string,
    @Query('status') status?: string,
    @Query('targetSpecialty') targetSpecialty?: string,
  ) {
    return this.noteManagementService.listInterconsultations({
      encounterId,
      status,
      targetSpecialty,
    });
  }

  @Get('interconsultations/:id')
  @ApiOperation({ summary: 'Get interconsultation by ID' })
  @ApiParam({ name: 'id', description: 'Interconsultation UUID' })
  @ApiResponse({ status: 200, description: 'Interconsultation details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getInterconsultation(@Param('id', ParseUUIDPipe) id: string) {
    return this.noteManagementService.getInterconsultation(id);
  }

  // ─── CopyForward ───────────────────────────────────────────────────────────

  @Post('copy-forward-enhanced')
  @ApiOperation({
    summary: 'Copy-forward previous note with section filtering',
    description:
      'Copies all or selected SOAP sections from a previous note into a new encounter draft. ' +
      'Optionally highlights sections that should be reviewed and updated.',
  })
  @ApiResponse({ status: 200, description: 'Copied content ready for editing' })
  @ApiResponse({ status: 404, description: 'Source note or target encounter not found' })
  async copyForwardNote(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CopyForwardNoteDto,
  ) {
    return this.noteManagementService.copyForwardNote(user.sub, dto);
  }

  // ─── Signature & Lock ──────────────────────────────────────────────────────

  @Post('notes/:id/sign')
  @ApiOperation({
    summary: 'Sign and optionally lock a clinical note (CFM requirement)',
    description:
      'Applies electronic or ICP-Brasil digital signature. ' +
      'Once signed, the note becomes read-only; changes must go through addenda.',
  })
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiResponse({ status: 200, description: 'Note signed successfully' })
  @ApiResponse({ status: 400, description: 'Already signed or invalid signature data' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async signNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NoteSignatureDto,
  ) {
    return this.noteManagementService.signNote(user.sub, { ...dto, noteId: id });
  }

  @Post('notes/:id/addendum')
  @ApiOperation({
    summary: 'Add an addendum to a signed/locked note',
    description:
      'Locked notes are immutable per CFM. Any correction must be made as a ' +
      'timestamped addendum with a mandatory reason field.',
  })
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiResponse({ status: 201, description: 'Addendum created' })
  @ApiResponse({ status: 400, description: 'Note is not signed/locked' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async addAddendum(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NoteAddendumDto,
  ) {
    return this.noteManagementService.addLockedNoteAddendum(id, user.sub, dto);
  }

  // ─── Note Media ────────────────────────────────────────────────────────────

  @Post('notes/:id/media')
  @ApiOperation({
    summary: 'Attach media to a clinical note (photo, audio, video)',
    description:
      'Links an already-uploaded S3 object to a clinical note. ' +
      'Use cases: wound photos, auscultation audio, gait video.',
  })
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiResponse({ status: 201, description: 'Media attached to note' })
  @ApiResponse({ status: 400, description: 'Note is signed — use addendum' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async attachMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NoteMediaDto,
  ) {
    return this.noteManagementService.attachMedia({ ...dto, noteId: id });
  }

  @Get('notes/:id/media')
  @ApiOperation({ summary: 'List all media attachments for a note' })
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiResponse({ status: 200, description: 'List of media items' })
  async listNoteMedia(@Param('id', ParseUUIDPipe) id: string) {
    return this.noteManagementService.listNoteMedia(id);
  }

  @Delete('media/:mediaId')
  @ApiOperation({ summary: 'Remove a media attachment' })
  @ApiParam({ name: 'mediaId', description: 'Media item UUID' })
  @ApiResponse({ status: 200, description: 'Media removed' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async deleteNoteMedia(@Param('mediaId', ParseUUIDPipe) mediaId: string) {
    return this.noteManagementService.deleteNoteMedia(mediaId);
  }

  // ─── Anatomical Drawing ────────────────────────────────────────────────────

  @Post('notes/:id/drawings')
  @ApiOperation({
    summary: 'Save anatomical drawing overlay on body diagram',
    description:
      'Stores SVG annotation paths over a standard body diagram image. ' +
      'Useful for documenting wound locations, surgical markings, or physical findings.',
  })
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiResponse({ status: 201, description: 'Anatomical drawing saved' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async saveAnatomicalDrawing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnatomicalDrawingDto,
  ) {
    return this.noteManagementService.saveAnatomicalDrawing({ ...dto, noteId: id });
  }

  @Get('notes/:id/drawings')
  @ApiOperation({ summary: 'List anatomical drawings for a note' })
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiResponse({ status: 200, description: 'List of drawings with SVG annotations' })
  async listAnatomicalDrawings(@Param('id', ParseUUIDPipe) id: string) {
    return this.noteManagementService.listAnatomicalDrawings(id);
  }

  @Put('drawings/:drawingId')
  @ApiOperation({ summary: 'Update anatomical drawing annotations' })
  @ApiParam({ name: 'drawingId', description: 'Drawing UUID' })
  @ApiResponse({ status: 200, description: 'Drawing updated' })
  @ApiResponse({ status: 404, description: 'Drawing not found' })
  async updateAnatomicalDrawing(
    @Param('drawingId', ParseUUIDPipe) drawingId: string,
    @Body() dto: AnatomicalDrawingDto,
  ) {
    return this.noteManagementService.updateAnatomicalDrawing(drawingId, dto);
  }

  // ─── Specialty Templates ───────────────────────────────────────────────────

  @Get('specialty-templates')
  @ApiOperation({
    summary: 'List specialty-specific note templates',
    description:
      'Returns structured templates for each medical specialty, including ' +
      'section ordering, embedded clinical scores (PHQ-9, CHADS2, EVA), and custom fields.',
  })
  @ApiQuery({ name: 'specialty', required: false, description: 'Filter by specialty enum' })
  @ApiResponse({ status: 200, description: 'List of specialty templates' })
  async listSpecialtyTemplates(@Query('specialty') specialty?: string) {
    return this.noteManagementService.listSpecialtyTemplates(specialty);
  }

  @Get('specialty-templates/:id')
  @ApiOperation({ summary: 'Get a specialty template by ID' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 200, description: 'Specialty template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getSpecialtyTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.noteManagementService.getSpecialtyTemplate(id);
  }

  @Post('specialty-templates')
  @ApiOperation({ summary: 'Create a new specialty-specific note template' })
  @ApiResponse({ status: 201, description: 'Specialty template created' })
  async createSpecialtyTemplate(@Body() dto: SpecialtyTemplateDto) {
    return this.noteManagementService.createSpecialtyTemplate(dto);
  }

  @Put('specialty-templates/:id')
  @ApiOperation({ summary: 'Update a specialty template' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateSpecialtyTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SpecialtyTemplateDto,
  ) {
    return this.noteManagementService.updateSpecialtyTemplate(id, dto);
  }
}
