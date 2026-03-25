import {
  Controller,
  Get,
  Post,
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
  ApproveAmbientNoteDto,
  AmbientSessionResponseDto,
  AmbientTranscriptResponseDto,
  AmbientClinicalNoteResponseDto,
  AmbientSessionListQueryDto,
} from './dto/ambient-listening.dto';

@ApiTags('AI — Ambient Listening')
@ApiBearerAuth('access-token')
@Controller('ai/ambient')
export class AmbientListeningController {
  constructor(private readonly ambientService: AmbientListeningService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start ambient listening session' })
  @ApiResponse({ status: 201, description: 'Session started', type: AmbientSessionResponseDto })
  async startSession(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: StartAmbientSessionDto,
  ): Promise<AmbientSessionResponseDto> {
    return this.ambientService.startSession(
      tenantId,
      user.sub,
      dto.encounterId,
      dto.language,
      dto.context,
    );
  }

  @Post(':sessionId/stop')
  @ApiOperation({ summary: 'Stop ambient session and process recording' })
  @ApiParam({ name: 'sessionId', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Session stopped and processed', type: AmbientSessionResponseDto })
  async stopSession(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<AmbientSessionResponseDto> {
    return this.ambientService.stopSession(tenantId, sessionId);
  }

  @Get(':sessionId/transcript')
  @ApiOperation({ summary: 'Get transcript for ambient session' })
  @ApiParam({ name: 'sessionId', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Transcript data', type: AmbientTranscriptResponseDto })
  async getTranscript(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<AmbientTranscriptResponseDto> {
    return this.ambientService.getTranscript(tenantId, sessionId);
  }

  @Get(':sessionId/note')
  @ApiOperation({ summary: 'Get AI-generated clinical note from ambient session' })
  @ApiParam({ name: 'sessionId', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Clinical note', type: AmbientClinicalNoteResponseDto })
  async getClinicalNote(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<AmbientClinicalNoteResponseDto> {
    return this.ambientService.getClinicalNote(tenantId, sessionId);
  }

  @Post(':sessionId/approve')
  @ApiOperation({ summary: 'Approve AI-generated note and save to chart' })
  @ApiParam({ name: 'sessionId', description: 'Ambient session UUID' })
  @ApiResponse({ status: 200, description: 'Note approved', type: AmbientSessionResponseDto })
  async approveNote(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: ApproveAmbientNoteDto,
  ): Promise<AmbientSessionResponseDto> {
    return this.ambientService.approveNote(tenantId, user.sub, sessionId, dto.editedNote);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List ambient listening sessions' })
  @ApiResponse({ status: 200, description: 'Session list', type: [AmbientSessionResponseDto] })
  async listSessions(
    @CurrentTenant() tenantId: string,
    @Query() query: AmbientSessionListQueryDto,
  ): Promise<AmbientSessionResponseDto[]> {
    return this.ambientService.listSessions(tenantId, query.encounterId, query.status);
  }
}
