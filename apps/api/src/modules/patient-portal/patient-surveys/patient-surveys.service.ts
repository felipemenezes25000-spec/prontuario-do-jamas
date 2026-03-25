import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSurveyDto, SubmitSurveyResponseDto } from './patient-surveys.dto';

interface SurveyRecord {
  id: string;
  surveyType: string;
  title: string;
  tenantId: string;
  patientId?: string;
  encounterId?: string;
  questions: Array<{ id: string; text: string; type: string; options?: string[]; required: boolean }>;
  responses: Array<{
    respondentId: string;
    respondentName: string;
    answers: Array<{ questionId: string; value: string | number | boolean }>;
    comment?: string;
    submittedAt: string;
  }>;
  expiresAt?: string;
  createdAt: string;
}

@Injectable()
export class PatientSurveysService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatientId(tenantId: string, userEmail: string): Promise<string> {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException('Nenhum registro de paciente vinculado a esta conta.');
    }
    return patient.id;
  }

  async createSurvey(tenantId: string, userEmail: string, dto: CreateSurveyDto) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    });
    if (!user) throw new ForbiddenException('Usuário não encontrado.');

    const survey: SurveyRecord = {
      id: crypto.randomUUID(),
      surveyType: dto.surveyType,
      title: dto.title,
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      questions: dto.questions,
      responses: [],
      expiresAt: dto.expiresAt,
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId ?? user.id,
        authorId: user.id,
        type: 'CUSTOM',
        title: `SURVEY:${dto.surveyType}: ${dto.title}`,
        content: JSON.stringify(survey),
        status: 'DRAFT',
        encounterId: dto.encounterId,
      },
    });

    return { surveyId: doc.id, surveyType: dto.surveyType, title: dto.title };
  }

  async getPendingSurveys(tenantId: string, userEmail: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'SURVEY:' },
        status: 'DRAFT',
        OR: [
          { patientId },
          { content: { contains: patientId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, createdAt: true },
    });

    return docs
      .map((d) => {
        const survey = JSON.parse(d.content ?? '{}') as SurveyRecord;
        const alreadyResponded = survey.responses.some((r) => r.respondentId === patientId);
        if (alreadyResponded) return null;
        if (survey.expiresAt && new Date(survey.expiresAt) < new Date()) return null;

        return {
          surveyId: d.id,
          surveyType: survey.surveyType,
          title: survey.title,
          questionCount: survey.questions.length,
          createdAt: survey.createdAt,
          expiresAt: survey.expiresAt,
        };
      })
      .filter(Boolean);
  }

  async submitResponse(tenantId: string, userEmail: string, surveyId: string, dto: SubmitSurveyResponseDto) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
      select: { fullName: true },
    });

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: surveyId, tenantId, type: 'CUSTOM', title: { startsWith: 'SURVEY:' } },
    });
    if (!doc) throw new NotFoundException('Pesquisa não encontrada.');

    const survey = JSON.parse(doc.content ?? '{}') as SurveyRecord;

    if (survey.expiresAt && new Date(survey.expiresAt) < new Date()) {
      throw new BadRequestException('Pesquisa expirada.');
    }

    const alreadyResponded = survey.responses.some((r) => r.respondentId === patientId);
    if (alreadyResponded) {
      throw new BadRequestException('Você já respondeu esta pesquisa.');
    }

    survey.responses.push({
      respondentId: patientId,
      respondentName: patient?.fullName ?? 'Paciente',
      answers: dto.answers,
      comment: dto.comment,
      submittedAt: new Date().toISOString(),
    });

    await this.prisma.clinicalDocument.update({
      where: { id: surveyId },
      data: { content: JSON.stringify(survey) },
    });

    return { surveyId, status: 'RESPONDED' };
  }

  async getSurveyResults(tenantId: string, userEmail: string, options: { surveyType?: string; page?: number; pageSize?: number }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const titleFilter = options.surveyType
      ? { startsWith: `SURVEY:${options.surveyType}:` }
      : { startsWith: 'SURVEY:' };

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where: { tenantId, type: 'CUSTOM', title: titleFilter },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, content: true, createdAt: true },
      }),
      this.prisma.clinicalDocument.count({
        where: { tenantId, type: 'CUSTOM', title: titleFilter },
      }),
    ]);

    const results = docs.map((d) => {
      const survey = JSON.parse(d.content ?? '{}') as SurveyRecord;
      const npsScores = survey.responses
        .flatMap((r) => r.answers)
        .filter((a) => typeof a.value === 'number')
        .map((a) => a.value as number);

      const avgScore = npsScores.length > 0 ? npsScores.reduce((s, v) => s + v, 0) / npsScores.length : null;

      return {
        surveyId: d.id,
        surveyType: survey.surveyType,
        title: survey.title,
        totalResponses: survey.responses.length,
        averageScore: avgScore ? Math.round(avgScore * 100) / 100 : null,
        createdAt: survey.createdAt,
      };
    });

    return { data: results, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
