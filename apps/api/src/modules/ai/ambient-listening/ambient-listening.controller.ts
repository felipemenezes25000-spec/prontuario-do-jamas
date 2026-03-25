import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { AmbientListeningService } from './ambient-listening.service';
import {
  StartAmbientSessionDto,
  GenerateNoteDto,
  ApproveAmbientNoteDto,
  AmbientSessionResponseDto,
  AmbientTranscriptResponseDto,
  AmbientClinicalNoteResponseDto,
  AmbientSessionListQueryDto,
  AmbientSessionListResponseDto,
} from './dto/ambient-listening.dto';

@ApiTags('AI — Ambient Listening')
@ApiBearerAuth('access-token')
@Controller('ai/ambient')
export class AmbientListeningController {
  constructor(private readonly ambientService: AmbientListeningService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start ambient recording session' })
  @ApiResponse({ status: 201, description: 'Session started', type: AmbientSessionResponseDto })
  async startSession(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: StartAmbientSessionDto,
  ): Promise<AmbientSessionResponseDto> {
    return this.ambientService.startSession(
      tenantId,
      user.sub,
      dto.patientId,
      dto.encounterId,
      dto.language,
      dto.specialty,
      dto.context,
    );
  }

  @Patch('sessions/:id/stop')
  @ApiOperation({ summary: 'Stop recording and trigger transcription' })
  @ApiParam({ name: 'id', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Session stopped and transcription triggered', type: AmbientSessionResponseDto })
  async stopSession(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AmbientSessionResponseDto> {
    return this.ambientService.stopSession(tenantId, id);
  }

  @Get('sessions/:id/transcript')
  @ApiOperation({ summary: 'Get transcription result with speaker diarization' })
  @ApiParam({ name: 'id', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Transcript data', type: AmbientTranscriptResponseDto })
  async getTranscript(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AmbientTranscriptResponseDto> {
    return this.ambientService.getTranscript(tenantId, id);
  }

  @Post('sessions/:id/generate-note')
  @ApiOperation({ summary: 'Generate SOAP note from transcript' })
  @ApiParam({ name: 'id', description: 'Ambient session UUID' })
  @ApiResponse({ status: 201, description: 'Clinical note generated', type: AmbientClinicalNoteResponseDto })
  async generateNote(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateNoteDto,
  ): Promise<AmbientClinicalNoteResponseDto> {
    return this.ambientService.generateNote(
      tenantId,
      id,
      dto.format,
      dto.includeCodingSuggestions,
      dto.includeMedications,
      dto.instructions,
    );
  }

  @Get('sessions/:id/note')
  @ApiOperation({ summary: 'Get AI-generated clinical note from ambient session' })
  @ApiParam({ name: 'id', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Clinical note', type: AmbientClinicalNoteResponseDto })
  async getClinicalNote(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AmbientClinicalNoteResponseDto> {
    return this.ambientService.getClinicalNote(tenantId, id);
  }

  @Post('sessions/:id/approve')
  @ApiOperation({ summary: 'Approve AI-generated note and save to chart' })
  @ApiParam({ name: 'id', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Note approved', type: AmbientSessionResponseDto })
  async approveNote(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveAmbientNoteDto,
  ): Promise<AmbientSessionResponseDto> {
    return this.ambientService.approveNote(
      tenantId,
      user.sub,
      id,
      dto.editedNote,
      dto.clinicianComments,
      dto.diagnosisCodes,
    );
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List ambient listening sessions with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Session list', type: AmbientSessionListResponseDto })
  async listSessions(
    @CurrentTenant() tenantId: string,
    @Query() query: AmbientSessionListQueryDto,
  ): Promise<AmbientSessionListResponseDto> {
    return this.ambientService.listSessions(
      tenantId,
      query.encounterId,
      query.patientId,
      query.status,
      query.page,
      query.limit,
    );
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get ambient session details' })
  @ApiParam({ name: 'id', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Session details', type: AmbientSessionResponseDto })
  async getSession(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AmbientSessionResponseDto> {
    return this.ambientService.getSession(tenantId, id);
  }
}
