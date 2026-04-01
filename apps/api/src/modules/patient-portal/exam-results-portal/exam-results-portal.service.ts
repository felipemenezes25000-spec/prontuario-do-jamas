import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ExamResultsPortalService {
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

  async listExamResults(
    tenantId: string,
    userEmail: string,
    options: { page?: number; pageSize?: number; examType?: string; status?: string },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { patientId };
    if (options.examType) where.examType = options.examType;
    if (options.status) where.status = options.status;

    const [data, total] = await Promise.all([
      this.prisma.examResult.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          examName: true,
          examCode: true,
          examType: true,
          status: true,
          requestedAt: true,
          completedAt: true,
          aiInterpretation: true,
          createdAt: true,
          requestedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.examResult.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getExamResultDetail(tenantId: string, userEmail: string, examId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const result = await this.prisma.examResult.findFirst({
      where: { id: examId, patientId },
      include: {
        requestedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    if (!result) {
      throw new NotFoundException('Resultado de exame não encontrado.');
    }

    // Generate lay-language explanation from AI interpretation
    let layExplanation: string | null = null;
    if (result.aiInterpretation) {
      layExplanation = this.generateLayExplanation(result.aiInterpretation, result.examName);
    }

    return {
      ...result,
      layExplanation,
    };
  }

  async getExamTrend(tenantId: string, userEmail: string, examId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const referenceExam = await this.prisma.examResult.findFirst({
      where: { id: examId, patientId },
      select: { examName: true, examCode: true, examType: true },
    });

    if (!referenceExam) {
      throw new NotFoundException('Exame não encontrado.');
    }

    // Find historical results of the same exam type
    const historicalResults = await this.prisma.examResult.findMany({
      where: {
        patientId,
        examName: referenceExam.examName,
        status: { in: ['COMPLETED', 'REVIEWED'] },
      },
      orderBy: { completedAt: 'asc' },
      select: {
        id: true,
        labResults: true,
        completedAt: true,
        createdAt: true,
        aiInterpretation: true,
        aiTrendComparison: true,
      },
      take: 20,
    });

    // Extract numeric values for trend chart
    const trendData = historicalResults.map((r) => {
      const labData = r.labResults as Record<string, unknown> | null;
      return {
        id: r.id,
        date: r.completedAt ?? r.createdAt,
        values: labData ?? {},
        aiTrend: r.aiTrendComparison,
      };
    });

    return {
      examName: referenceExam.examName,
      examType: referenceExam.examType,
      dataPoints: trendData.length,
      trend: trendData,
    };
  }

  async getExamResultForPdf(tenantId: string, userEmail: string, examId: string) {
    const detail = await this.getExamResultDetail(tenantId, userEmail, examId);

    return {
      ...detail,
      pdfReady: true,
      generatedAt: new Date().toISOString(),
      watermark: 'VoxPEP - Portal do Paciente',
      disclaimer: 'Este documento é uma cópia digital dos resultados de exames. Para uso clínico, consulte o original.',
    };
  }

  async shareExamResult(tenantId: string, userEmail: string, examId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const exam = await this.prisma.examResult.findFirst({
      where: { id: examId, patientId },
      select: { id: true, examName: true },
    });
    if (!exam) {
      throw new NotFoundException('Exame não encontrado.');
    }

    // Generate secure share token (production: signed JWT with expiration)
    const shareToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72h

    return {
      shareUrl: `https://portal.voxpep.com/shared/exam/${shareToken}`,
      examName: exam.examName,
      expiresAt,
      shareToken,
    };
  }

  private generateLayExplanation(aiInterpretation: string, examName: string): string {
    // Simplified lay-language generation — in production this would call GPT-4o
    return `Explicação simplificada do exame "${examName}": ${aiInterpretation.substring(0, 500)}. ` +
      'Para mais detalhes, consulte seu médico.';
  }
}
