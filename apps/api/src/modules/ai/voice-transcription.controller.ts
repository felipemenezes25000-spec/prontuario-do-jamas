import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';

import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { VoiceTranscriptionService } from './voice-transcription.service';

import {
  ListTranscriptionsQueryDto,
  TranscriptionResponseDto,
  PaginatedTranscriptionsResponseDto,
  StreamStartDto,
  StreamStartResponseDto,
  StreamStopDto,
  StreamStopResponseDto,
  EditTranscriptionDto,
} from './dto';

@ApiTags('AI / Voice Transcriptions')
@ApiBearerAuth('access-token')
@Controller('ai/voice')
export class VoiceTranscriptionController {
  private readonly logger = new Logger(VoiceTranscriptionController.name);

  constructor(
    private readonly transcriptionService: VoiceTranscriptionService,
    private readonly auditService: AuditService,
  ) {}

  // ─── GET /ai/voice/transcriptions/:id ─────────────────────────────

  @Get('transcriptions/:id')
  @ApiOperation({ summary: 'Get a specific transcription by ID' })
  @ApiParam({ name: 'id', description: 'Transcription UUID' })
  @ApiResponse({ status: 200, description: 'Transcription found', type: TranscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  async getTranscription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TranscriptionResponseDto> {
    const result = await this.transcriptionService.findById(id);

    await this.auditService
      .log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'READ',
        entity: 'VoiceTranscription',
        entityId: id,
      })
      .catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

    return result;
  }

  // ─── GET /ai/voice/transcriptions ─────────────────────────────────

  @Get('transcriptions')
  @ApiOperation({ summary: 'List transcriptions with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of transcriptions',
    type: PaginatedTranscriptionsResponseDto,
  })
  async listTranscriptions(
    @Query() query: ListTranscriptionsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedTranscriptionsResponseDto> {
    const result = await this.transcriptionService.findAll(query);

    await this.auditService
      .log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'READ',
        entity: 'VoiceTranscription',
        newData: {
          encounterId: query.encounterId,
          patientId: query.patientId,
          page: query.page,
          limit: query.limit,
          resultsReturned: result.data.length,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

    return result;
  }

  // ─── POST /ai/voice/stream/start ─────────────────────────────────

  @Post('stream/start')
  @ApiOperation({
    summary: 'Start a streaming transcription session (stub)',
    description:
      'Placeholder endpoint. Real streaming uses WebSockets. Returns a sessionId that can be used with the stop endpoint.',
  })
  @ApiResponse({ status: 201, description: 'Streaming session started', type: StreamStartResponseDto })
  async startStream(
    @Body() dto: StreamStartDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StreamStartResponseDto> {
    const sessionId = randomUUID();

    this.logger.log(
      `Streaming session started: ${sessionId} for encounter ${dto.encounterId}`,
    );

    await this.auditService
      .log({
        tenantId: user.tenantId,
        userId: user.sub,
        patientId: dto.patientId,
        action: 'VOICE_COMMAND',
        entity: 'VoiceStreamSession',
        entityId: sessionId,
        newData: {
          encounterId: dto.encounterId,
          context: dto.context,
          status: 'started',
        },
      })
      .catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

    return { sessionId };
  }

  // ─── POST /ai/voice/stream/stop ──────────────────────────────────

  @Post('stream/stop')
  @ApiOperation({
    summary: 'Stop a streaming transcription session (stub)',
    description:
      'Placeholder endpoint. Returns a stub transcription result. Real implementation would finalize the WebSocket stream.',
  })
  @ApiResponse({ status: 200, description: 'Streaming session stopped', type: StreamStopResponseDto })
  async stopStream(
    @Body() dto: StreamStopDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StreamStopResponseDto> {
    this.logger.log(`Streaming session stopped: ${dto.sessionId}`);

    await this.auditService
      .log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'VOICE_COMMAND',
        entity: 'VoiceStreamSession',
        entityId: dto.sessionId,
        newData: { status: 'stopped' },
      })
      .catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

    // Stub response — real implementation would return the accumulated transcription
    return {
      transcription: '',
      duration: 0,
    };
  }

  // ─── PATCH /ai/voice/transcriptions/:id ───────────────────────────

  @Patch('transcriptions/:id')
  @ApiOperation({ summary: 'Edit a transcription text' })
  @ApiParam({ name: 'id', description: 'Transcription UUID' })
  @ApiResponse({ status: 200, description: 'Transcription updated', type: TranscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  async editTranscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditTranscriptionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TranscriptionResponseDto> {
    const result = await this.transcriptionService.update(id, dto.text, user.sub);

    await this.auditService
      .log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'UPDATE',
        entity: 'VoiceTranscription',
        entityId: id,
        newData: { textLength: dto.text.length },
      })
      .catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });

    return result;
  }

  // ─── DELETE /ai/voice/transcriptions/:id ──────────────────────────

  @Delete('transcriptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transcription' })
  @ApiParam({ name: 'id', description: 'Transcription UUID' })
  @ApiResponse({ status: 204, description: 'Transcription deleted' })
  @ApiResponse({ status: 404, description: 'Transcription not found' })
  async deleteTranscription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.transcriptionService.remove(id);

    await this.auditService
      .log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'DELETE',
        entity: 'VoiceTranscription',
        entityId: id,
      })
      .catch((err: unknown) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
      });
  }
}
