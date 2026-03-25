import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSocialAssessmentDto, CreateSocialReferralDto } from './dto/create-social-work.dto';

@Injectable()
export class SocialWorkService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[SOCIAL_WORK:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createAssessment(tenantId: string, dto: CreateSocialAssessmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ASSESSMENT',
        'Avaliação Social',
        {
          familyStructure: dto.familyStructure,
          housingConditions: dto.housingConditions,
          economicStatus: dto.economicStatus,
          socialSupport: dto.socialSupport,
          vulnerabilities: dto.vulnerabilities,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async createReferral(tenantId: string, dto: CreateSocialReferralDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'REFERRAL',
        `Encaminhamento Social - ${dto.referralType}`,
        {
          referralType: dto.referralType,
          referralTo: dto.referralTo,
          reason: dto.reason,
          urgency: dto.urgency,
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
        title: { startsWith: '[SOCIAL_WORK:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
