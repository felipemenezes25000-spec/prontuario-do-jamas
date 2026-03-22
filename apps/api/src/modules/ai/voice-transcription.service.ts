import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ListTranscriptionsQueryDto,
  TranscriptionResponseDto,
  PaginatedTranscriptionsResponseDto,
} from './dto';

@Injectable()
export class VoiceTranscriptionService {
  private readonly logger = new Logger(VoiceTranscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TranscriptionResponseDto> {
    const transcription = await this.prisma.voiceTranscription.findUnique({
      where: { id },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcricao ${id} nao encontrada.`);
    }

    return this.toResponseDto(transcription);
  }

  async findAll(
    query: ListTranscriptionsQueryDto,
  ): Promise<PaginatedTranscriptionsResponseDto> {
    const where: Record<string, unknown> = {};

    if (query.encounterId) {
      where.encounterId = query.encounterId;
    }
    if (query.patientId) {
      where.patientId = query.patientId;
    }

    const [data, total] = await Promise.all([
      this.prisma.voiceTranscription.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.voiceTranscription.count({ where }),
    ]);

    return {
      data: data.map((t) => this.toResponseDto(t)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async update(
    id: string,
    text: string,
    editorUserId: string,
  ): Promise<TranscriptionResponseDto> {
    // Verify existence first
    const existing = await this.prisma.voiceTranscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Transcricao ${id} nao encontrada.`);
    }

    const updated = await this.prisma.voiceTranscription.update({
      where: { id },
      data: {
        processedTranscription: text,
        wasEdited: true,
        editedAt: new Date(),
        editedById: editorUserId,
      },
    });

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.voiceTranscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Transcricao ${id} nao encontrada.`);
    }

    await this.prisma.voiceTranscription.delete({ where: { id } });
  }

  private toResponseDto(transcription: {
    id: string;
    rawTranscription: string | null;
    processedTranscription: string | null;
    confidence: number | null;
    structuredData: unknown;
    createdAt: Date;
    audioDuration: number | null;
  }): TranscriptionResponseDto {
    return {
      id: transcription.id,
      text:
        transcription.processedTranscription ??
        transcription.rawTranscription ??
        '',
      confidence: transcription.confidence,
      structuredData: (transcription.structuredData as Record<string, unknown>) ?? null,
      createdAt: transcription.createdAt,
      duration: transcription.audioDuration,
    };
  }
}
