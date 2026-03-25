import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSpeechAssessmentDto, RecordSpeechSessionDto } from './dto/create-speech-therapy.dto';

@Injectable()
export class SpeechTherapyService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[SPEECH_THERAPY:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createAssessment(tenantId: string, dto: CreateSpeechAssessmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ASSESSMENT',
        'Avaliação Fonoaudiológica',
        {
          swallowingAssessment: dto.swallowingAssessment,
          speechAssessment: dto.speechAssessment,
          languageAssessment: dto.languageAssessment,
          voiceAssessment: dto.voiceAssessment,
          dysphagiaSeverity: dto.dysphagiaSeverity,
          dietConsistency: dto.dietConsistency,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async recordSession(tenantId: string, dto: RecordSpeechSessionDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'SESSION',
        'Sessão de Fonoaudiologia',
        {
          procedures: dto.procedures,
          evolution: dto.evolution,
          patientResponse: dto.patientResponse,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[SPEECH_THERAPY:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
