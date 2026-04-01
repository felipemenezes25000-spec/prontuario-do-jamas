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

  // =========================================================================
  // NPS, PROMs, Satisfaction Dashboard
  // =========================================================================

  async sendNPSSurvey(tenantId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      select: {
        id: true,
        patientId: true,
        patient: { select: { fullName: true } },
        primaryDoctorId: true,
        primaryDoctor: { select: { name: true } },
      },
    });
    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const firstUser = await this.prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN' },
      select: { id: true },
    });

    const survey: SurveyRecord = {
      id: crypto.randomUUID(),
      surveyType: 'NPS',
      title: `NPS — ${encounter.patient?.fullName ?? 'Paciente'}`,
      tenantId,
      patientId: encounter.patientId,
      encounterId,
      questions: [
        {
          id: 'nps-score',
          text: 'De 0 a 10, qual a probabilidade de recomendar nosso serviço a um familiar ou amigo?',
          type: 'RATING_0_10',
          required: true,
        },
        {
          id: 'nps-comment',
          text: 'O que motivou sua nota?',
          type: 'TEXT',
          required: false,
        },
        {
          id: 'doctor-rating',
          text: `Como você avalia o atendimento do(a) Dr(a). ${encounter.primaryDoctor?.name ?? 'médico(a)'}?`,
          type: 'RATING_1_5',
          required: false,
        },
        {
          id: 'waiting-time',
          text: 'Como você avalia o tempo de espera?',
          type: 'RATING_1_5',
          required: false,
        },
        {
          id: 'facility',
          text: 'Como você avalia as instalações?',
          type: 'RATING_1_5',
          required: false,
        },
      ],
      responses: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: encounter.patientId,
        authorId: firstUser?.id ?? encounter.patientId,
        type: 'CUSTOM',
        title: `SURVEY:NPS: ${encounter.patient?.fullName}`,
        content: JSON.stringify(survey),
        status: 'DRAFT',
        encounterId,
      },
    });

    return { surveyId: doc.id, surveyType: 'NPS', patientName: encounter.patient?.fullName, expiresAt: survey.expiresAt };
  }

  async submitPROM(
    tenantId: string,
    patientId: string,
    dto: {
      instrumentType: 'KOOS' | 'DASH' | 'VHI' | 'PHQ9' | 'GAD7' | 'SF36' | 'CUSTOM';
      instrumentName: string;
      answers: Array<{ questionId: string; value: string | number | boolean }>;
      totalScore?: number;
      interpretation?: string;
      comment?: string;
    },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const firstUser = await this.prisma.user.findFirst({
      where: { tenantId, role: 'DOCTOR' },
      select: { id: true },
    });

    const promRecord = {
      id: crypto.randomUUID(),
      patientId,
      tenantId,
      instrumentType: dto.instrumentType,
      instrumentName: dto.instrumentName,
      answers: dto.answers,
      totalScore: dto.totalScore ?? dto.answers.reduce((s, a) => s + (typeof a.value === 'number' ? a.value : 0), 0),
      interpretation: dto.interpretation,
      comment: dto.comment,
      submittedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: firstUser?.id ?? patientId,
        type: 'CUSTOM',
        title: `PROM:${dto.instrumentType}: ${patient.fullName} — Score: ${promRecord.totalScore}`,
        content: JSON.stringify(promRecord),
        status: 'SIGNED',
      },
    });

    return {
      promId: doc.id,
      instrumentType: dto.instrumentType,
      totalScore: promRecord.totalScore,
      patientName: patient.fullName,
    };
  }

  async getSatisfactionDashboard(
    tenantId: string,
    dateRange: { startDate?: string; endDate?: string },
  ) {
    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: 'SURVEY:NPS:' },
    };
    if (dateRange.startDate || dateRange.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) (where.createdAt as Record<string, unknown>).gte = new Date(dateRange.startDate);
      if (dateRange.endDate) (where.createdAt as Record<string, unknown>).lte = new Date(dateRange.endDate);
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      select: { id: true, content: true, createdAt: true, encounterId: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const allScores: number[] = [];
    const byDoctor = new Map<string, { name: string; scores: number[] }>();
    const byMonth = new Map<string, number[]>();

    for (const d of docs) {
      const survey = JSON.parse(d.content ?? '{}') as SurveyRecord;
      for (const response of survey.responses) {
        const npsAnswer = response.answers.find((a) => a.questionId === 'nps-score');
        if (npsAnswer && typeof npsAnswer.value === 'number') {
          allScores.push(npsAnswer.value);

          const month = d.createdAt.toISOString().substring(0, 7);
          const monthScores = byMonth.get(month) ?? [];
          monthScores.push(npsAnswer.value);
          byMonth.set(month, monthScores);
        }

        // Doctor rating
        const doctorAnswer = response.answers.find((a) => a.questionId === 'doctor-rating');
        if (doctorAnswer && typeof doctorAnswer.value === 'number' && d.encounterId) {
          // Simplified — in production would join with encounter.primaryDoctor
          const key = d.encounterId;
          const existing = byDoctor.get(key) ?? { name: 'Doctor', scores: [] };
          existing.scores.push(doctorAnswer.value);
          byDoctor.set(key, existing);
        }
      }
    }

    // NPS calculation: % Promoters (9-10) - % Detractors (0-6)
    const promoters = allScores.filter((s) => s >= 9).length;
    const detractors = allScores.filter((s) => s <= 6).length;
    const nps = allScores.length > 0
      ? Math.round(((promoters - detractors) / allScores.length) * 100)
      : 0;

    const avgScore = allScores.length > 0
      ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 100) / 100
      : 0;

    const monthlyTrend = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, scores]) => ({
        month,
        avgScore: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100) / 100,
        responseCount: scores.length,
        nps: Math.round(
          ((scores.filter((s) => s >= 9).length - scores.filter((s) => s <= 6).length) / scores.length) * 100,
        ),
      }));

    return {
      nps,
      avgScore,
      totalResponses: allScores.length,
      totalSurveysSent: docs.length,
      responseRate: docs.length > 0 ? Math.round((allScores.length / docs.length) * 10000) / 100 : 0,
      distribution: {
        promoters: { count: promoters, percentage: allScores.length > 0 ? Math.round((promoters / allScores.length) * 10000) / 100 : 0 },
        passives: { count: allScores.filter((s) => s >= 7 && s <= 8).length },
        detractors: { count: detractors, percentage: allScores.length > 0 ? Math.round((detractors / allScores.length) * 10000) / 100 : 0 },
      },
      monthlyTrend,
    };
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
