import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GrantProxyDto } from './proxy-access.dto';

interface ProxyRecord {
  id: string;
  proxyUserId: string;
  proxiedPatientId: string;
  tenantId: string;
  relationship: string;
  legalDocumentRef?: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  isActive: boolean;
}

@Injectable()
export class ProxyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveUserId(tenantId: string, userEmail: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    });
    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.');
    }
    return user.id;
  }

  async grantProxy(tenantId: string, userEmail: string, dto: GrantProxyDto) {
    const userId = await this.resolveUserId(tenantId, userEmail);

    const proxiedPatient = await this.prisma.patient.findFirst({
      where: { id: dto.proxiedPatientId, tenantId, isActive: true },
      select: { id: true, fullName: true },
    });
    if (!proxiedPatient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    const proxy: ProxyRecord = {
      id: crypto.randomUUID(),
      proxyUserId: userId,
      proxiedPatientId: dto.proxiedPatientId,
      tenantId,
      relationship: dto.relationship,
      legalDocumentRef: dto.legalDocumentRef,
      grantedAt: new Date().toISOString(),
      expiresAt: dto.expiresAt,
      isActive: true,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.proxiedPatientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `PROXY: ${dto.relationship} → ${proxiedPatient.fullName}`,
        content: JSON.stringify(proxy),
        status: 'SIGNED',
      },
    });

    return { proxyId: doc.id, relationship: dto.relationship, proxiedPatientName: proxiedPatient.fullName };
  }

  async listProxies(tenantId: string, userEmail: string) {
    const userId = await this.resolveUserId(tenantId, userEmail);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        authorId: userId,
        type: 'CUSTOM',
        title: { startsWith: 'PROXY:' },
        status: 'SIGNED',
      },
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { id: true, fullName: true } } },
    });

    return docs.map((d) => {
      const proxy = JSON.parse(d.content ?? '{}') as ProxyRecord;
      return {
        proxyId: d.id,
        proxiedPatientId: proxy.proxiedPatientId,
        proxiedPatientName: d.patient?.fullName,
        relationship: proxy.relationship,
        isActive: proxy.isActive && (!proxy.expiresAt || new Date(proxy.expiresAt) > new Date()),
        grantedAt: proxy.grantedAt,
        expiresAt: proxy.expiresAt,
      };
    });
  }

  async revokeProxy(tenantId: string, userEmail: string, proxyId: string) {
    const userId = await this.resolveUserId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: proxyId, tenantId, authorId: userId, type: 'CUSTOM', title: { startsWith: 'PROXY:' } },
    });
    if (!doc) {
      throw new NotFoundException('Procuração não encontrada.');
    }

    const proxy = JSON.parse(doc.content ?? '{}') as ProxyRecord;
    proxy.isActive = false;
    proxy.revokedAt = new Date().toISOString();

    await this.prisma.clinicalDocument.update({
      where: { id: proxyId },
      data: { content: JSON.stringify(proxy), status: 'VOIDED' },
    });

    return { proxyId, status: 'REVOKED' };
  }

  async getProxiedPatientData(tenantId: string, userEmail: string, proxyPatientId: string) {
    const userId = await this.resolveUserId(tenantId, userEmail);

    // Verify proxy relationship exists and is active
    const proxyDoc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        authorId: userId,
        patientId: proxyPatientId,
        type: 'CUSTOM',
        title: { startsWith: 'PROXY:' },
        status: 'SIGNED',
      },
    });

    if (!proxyDoc) {
      throw new ForbiddenException('Acesso proxy não autorizado para este paciente.');
    }

    const proxy = JSON.parse(proxyDoc.content ?? '{}') as ProxyRecord;
    if (!proxy.isActive || (proxy.expiresAt && new Date(proxy.expiresAt) < new Date())) {
      throw new ForbiddenException('Acesso proxy expirado ou revogado.');
    }

    // Fetch summary data for the proxied patient
    const [patient, recentEncounters, activePrescrptions, recentVitals] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: proxyPatientId, tenantId, isActive: true },
        select: {
          id: true, fullName: true, birthDate: true, bloodType: true,
          insuranceProvider: true, allergies: { where: { status: 'ACTIVE' }, select: { substance: true, severity: true } },
        },
      }),
      this.prisma.encounter.findMany({
        where: { patientId: proxyPatientId, tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, status: true, createdAt: true, chiefComplaint: true },
      }),
      this.prisma.prescription.findMany({
        where: { patientId: proxyPatientId, tenantId, status: 'ACTIVE' },
        take: 10,
        include: { items: { select: { medicationName: true, dose: true, frequency: true } } },
      }),
      this.prisma.vitalSigns.findMany({
        where: { patientId: proxyPatientId },
        take: 5,
        orderBy: { recordedAt: 'desc' },
        select: { recordedAt: true, systolicBP: true, diastolicBP: true, heartRate: true, temperature: true },
      }),
    ]);

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    return {
      patient,
      recentEncounters,
      activePrescriptions: activePrescrptions,
      recentVitals,
      proxyRelationship: proxy.relationship,
    };
  }
}
