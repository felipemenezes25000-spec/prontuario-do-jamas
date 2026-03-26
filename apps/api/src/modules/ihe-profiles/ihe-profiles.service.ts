import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  XdsProvideRegisterDto,
  XdsQueryDto,
  PixQueryDto,
  PdqSearchDto,
  MhdDocumentDto,
  MhdFindDto,
  XcaQueryDto,
  XcaRetrieveDto,
  IheProfile,
} from './dto/ihe-profiles.dto';

export interface XdsDocument {
  id: string;
  uniqueId: string;
  patientId: string;
  title: string;
  classCode: string | null;
  mimeType: string;
  size: number;
  hash: string;
  authorInstitution: string | null;
  sourcePatientInfo: Record<string, string> | null;
  clinicalDocumentId: string | null;
  repositoryUniqueId: string;
  status: string;
  tenantId: string;
  submittedById: string;
  createdAt: Date;
}

export interface AtnaAuditEntry {
  id: string;
  eventId: string;
  eventType: string;
  eventAction: string;
  eventOutcome: string;
  sourceId: string;
  userId: string;
  patientId: string | null;
  objectId: string | null;
  objectType: string | null;
  tenantId: string;
  timestamp: Date;
}

@Injectable()
export class IheProfilesService {
  private xdsDocuments: XdsDocument[] = [];
  private auditEntries: AtnaAuditEntry[] = [];
  private readonly repositoryUniqueId = '1.2.840.113619.2.55.3.VoxPEP';

  constructor(private readonly prisma: PrismaService) {}

  async getSupportedProfiles() {
    return {
      profiles: [
        {
          id: IheProfile.XDS_B,
          name: 'Cross-Enterprise Document Sharing',
          version: 'ITI TF-2x',
          status: 'SUPPORTED',
          transactions: ['ITI-41 (Provide & Register)', 'ITI-18 (Registry Stored Query)', 'ITI-43 (Retrieve Document Set)'],
        },
        {
          id: IheProfile.PIX,
          name: 'Patient Identifier Cross-Referencing',
          version: 'ITI TF-2x',
          status: 'SUPPORTED',
          transactions: ['ITI-45 (PIXV3 Query)'],
        },
        {
          id: IheProfile.ATNA,
          name: 'Audit Trail and Node Authentication',
          version: 'ITI TF-2x',
          status: 'SUPPORTED',
          transactions: ['ITI-20 (Record Audit Event)'],
        },
        {
          id: IheProfile.PDQ,
          name: 'Patient Demographics Query',
          version: 'ITI TF-2x',
          status: 'SUPPORTED',
          transactions: ['ITI-47 (Patient Demographics Query V3)'],
        },
        {
          id: IheProfile.MHD,
          name: 'Mobile Access to Health Documents',
          version: 'ITI TF-2x',
          status: 'SUPPORTED',
          transactions: ['ITI-65 (Provide Document Bundle)', 'ITI-66 (Find Document Lists)', 'ITI-67 (Find Document References)', 'ITI-68 (Retrieve Document)'],
        },
        {
          id: IheProfile.XCA,
          name: 'Cross-Community Access',
          version: 'ITI TF-2x',
          status: 'SUPPORTED',
          transactions: ['ITI-38 (Cross Gateway Query)', 'ITI-39 (Cross Gateway Retrieve)'],
        },
      ],
    };
  }

  async xdsProvideAndRegister(tenantId: string, userId: string, dto: XdsProvideRegisterDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const content = dto.content ?? '';
    const doc: XdsDocument = {
      id: crypto.randomUUID(),
      uniqueId: `2.25.${Date.now()}.${Math.floor(Math.random() * 100000)}`,
      patientId: dto.patientId,
      title: dto.title,
      classCode: dto.classCode ?? null,
      mimeType: dto.mimeType ?? 'text/xml',
      size: Buffer.byteLength(content, 'utf8'),
      hash: this.simpleHash(content),
      authorInstitution: dto.authorInstitution ?? null,
      sourcePatientInfo: dto.sourcePatientInfo ?? null,
      clinicalDocumentId: dto.clinicalDocumentId ?? null,
      repositoryUniqueId: this.repositoryUniqueId,
      status: 'Approved',
      tenantId,
      submittedById: userId,
      createdAt: new Date(),
    };

    this.xdsDocuments.push(doc);

    // Record ATNA audit event
    this.recordAuditEvent(tenantId, userId, 'ITI-41', 'C', '0', dto.patientId, doc.id, 'Document');

    return {
      registryResponse: {
        status: 'urn:oasis:names:tc:ebxml-regrep:ResponseStatusType:Success',
        requestId: crypto.randomUUID(),
      },
      document: {
        id: doc.id,
        uniqueId: doc.uniqueId,
        repositoryUniqueId: doc.repositoryUniqueId,
        title: doc.title,
        status: doc.status,
      },
    };
  }

  async xdsRegistryStoredQuery(tenantId: string, dto: XdsQueryDto) {
    let docs = this.xdsDocuments.filter((d) => d.tenantId === tenantId);

    if (dto.patientId) {
      docs = docs.filter((d) => d.patientId === dto.patientId);
    }
    if (dto.classCode) {
      docs = docs.filter((d) => d.classCode === dto.classCode);
    }
    if (dto.dateFrom) {
      const from = new Date(dto.dateFrom);
      docs = docs.filter((d) => d.createdAt >= from);
    }
    if (dto.dateTo) {
      const to = new Date(dto.dateTo);
      docs = docs.filter((d) => d.createdAt <= to);
    }
    if (dto.status) {
      docs = docs.filter((d) => d.status === dto.status);
    }

    // Also query ClinicalDocuments from Prisma
    const where: Record<string, unknown> = { tenantId };
    if (dto.patientId) where.patientId = dto.patientId;

    const clinicalDocs = await this.prisma.clinicalDocument.findMany({
      where,
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        patientId: true,
      },
    });

    return {
      registryObjectList: {
        extrinsicObjects: docs.map((d) => ({
          id: d.id,
          uniqueId: d.uniqueId,
          title: d.title,
          classCode: d.classCode,
          mimeType: d.mimeType,
          size: d.size,
          hash: d.hash,
          status: d.status,
          repositoryUniqueId: d.repositoryUniqueId,
          creationTime: d.createdAt.toISOString(),
        })),
        additionalDocuments: clinicalDocs.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          status: d.status,
          createdAt: d.createdAt.toISOString(),
          patientId: d.patientId,
        })),
      },
      totalResults: docs.length + clinicalDocs.length,
    };
  }

  async pixQuery(tenantId: string, dto: PixQueryDto) {
    // Search patient by various identifiers
    const patients = await this.prisma.patient.findMany({
      where: {
        tenantId,
        OR: [
          { cpf: dto.patientIdentifier },
          { mrn: dto.patientIdentifier },
          { id: dto.patientIdentifier.length === 36 ? dto.patientIdentifier : undefined },
        ],
      },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        mrn: true,
        birthDate: true,
        gender: true,
      },
    });

    if (patients.length === 0) {
      throw new NotFoundException(`No patient found with identifier "${dto.patientIdentifier}"`);
    }

    return {
      patientIdentifiers: patients.map((p) => ({
        patientId: p.id,
        identifiers: [
          { domain: 'VoxPEP', domainOid: '2.16.840.1.113883.2.2.1.VoxPEP', value: p.id },
          ...(p.cpf ? [{ domain: 'CPF', domainOid: '2.16.840.1.113883.13.237', value: p.cpf }] : []),
          ...(p.mrn ? [{ domain: 'MRN', domainOid: `${this.repositoryUniqueId}.MRN`, value: p.mrn }] : []),
        ],
        demographics: {
          name: p.fullName,
          birthDate: p.birthDate?.toISOString().split('T')[0],
          gender: p.gender,
        },
      })),
    };
  }

  async getAtnaAuditTrail(
    tenantId: string,
    filters: { userId?: string; patientId?: string; eventType?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number },
  ) {
    let entries = this.auditEntries.filter((e) => e.tenantId === tenantId);

    if (filters.userId) {
      entries = entries.filter((e) => e.userId === filters.userId);
    }
    if (filters.patientId) {
      entries = entries.filter((e) => e.patientId === filters.patientId);
    }
    if (filters.eventType) {
      entries = entries.filter((e) => e.eventType === filters.eventType);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      entries = entries.filter((e) => e.timestamp >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      entries = entries.filter((e) => e.timestamp <= to);
    }

    // Also get audit entries from Prisma
    const prismaAudits = await this.prisma.auditLog.findMany({
      where: { tenantId },
      take: 50,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        userId: true,
        timestamp: true,
      },
    });

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const total = entries.length;
    const data = entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice((page - 1) * pageSize, page * pageSize);

    return {
      data,
      prismaAuditEntries: prismaAudits,
      total: total + prismaAudits.length,
      page,
      pageSize,
    };
  }

  // ─── PDQ: Patient Demographics Query (ITI-47) ─────────────────────────────

  /**
   * Search patients by demographics — IHE PDQv3 ITI-47.
   */
  async pdqSearch(tenantId: string, dto: PdqSearchDto) {
    const where: Record<string, unknown> = { tenantId };

    // Build dynamic search conditions
    const orConditions: Record<string, unknown>[] = [];

    if (dto.familyName) {
      orConditions.push({
        fullName: { contains: dto.familyName, mode: 'insensitive' },
      });
    }
    if (dto.givenName) {
      orConditions.push({
        fullName: { contains: dto.givenName, mode: 'insensitive' },
      });
    }
    if (dto.gender) {
      where.gender = dto.gender;
    }
    if (dto.birthDate) {
      where.birthDate = new Date(dto.birthDate);
    }
    if (dto.identifierValue) {
      orConditions.push(
        { cpf: dto.identifierValue },
        { mrn: dto.identifierValue },
        { cns: dto.identifierValue },
      );
    }

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    const patients = await this.prisma.patient.findMany({
      where,
      take: 50,
      select: {
        id: true,
        fullName: true,
        socialName: true,
        cpf: true,
        mrn: true,
        cns: true,
        birthDate: true,
        gender: true,
        phone: true,
        email: true,
        city: true,
        state: true,
      },
    });

    this.recordAuditEvent(tenantId, 'system', 'ITI-47', 'E', '0', null, null, 'PDQ Query');

    return {
      queryId: crypto.randomUUID(),
      resultCount: patients.length,
      patients: patients.map((p) => ({
        patientId: p.id,
        identifiers: [
          { domain: 'VoxPEP', value: p.id },
          ...(p.cpf ? [{ domain: 'CPF', value: p.cpf }] : []),
          ...(p.mrn ? [{ domain: 'MRN', value: p.mrn }] : []),
          ...(p.cns ? [{ domain: 'CNS', value: p.cns }] : []),
        ],
        demographics: {
          fullName: p.fullName,
          socialName: p.socialName,
          birthDate: p.birthDate?.toISOString().split('T')[0] ?? null,
          gender: p.gender,
          phone: p.phone,
          email: p.email,
          city: p.city,
          state: p.state,
        },
      })),
    };
  }

  // ─── MHD: Mobile access to Health Documents (ITI-65, ITI-67) ──────────────

  /**
   * Provide (submit) a document via MHD — IHE MHD ITI-65.
   * Simplified document submission stored as ClinicalDocument.
   */
  async mhdProvideDocument(tenantId: string, userId: string, dto: MhdDocumentDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: userId,
        type: 'RELATORIO',
        title: `[MHD] ${dto.title}`,
        content: JSON.stringify({
          documentType: dto.documentType,
          mimeType: dto.mimeType,
          content: dto.content,
          submittedVia: 'MHD ITI-65',
        }),
        status: 'FINAL',
      },
    });

    this.recordAuditEvent(tenantId, userId, 'ITI-65', 'C', '0', dto.patientId, doc.id, 'MHD Document');

    return {
      transactionStatus: 'SUCCESS',
      documentId: doc.id,
      title: dto.title,
      documentType: dto.documentType,
      mimeType: dto.mimeType,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  /**
   * Find documents via MHD — IHE MHD ITI-67.
   */
  async mhdFindDocuments(tenantId: string, dto: MhdFindDto) {
    const where: Record<string, unknown> = {
      tenantId,
      patientId: dto.patientId,
      title: { startsWith: '[MHD]' },
    };

    if (dto.dateFrom || dto.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dto.dateFrom) createdAt.gte = new Date(dto.dateFrom);
      if (dto.dateTo) createdAt.lte = new Date(dto.dateTo);
      where.createdAt = createdAt;
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    this.recordAuditEvent(tenantId, 'system', 'ITI-67', 'E', '0', dto.patientId, null, 'MHD Find');

    return {
      total: docs.length,
      documents: docs.map((d) => {
        const parsed = d.content ? (JSON.parse(d.content) as { documentType?: string; mimeType?: string }) : null;
        return {
          id: d.id,
          title: d.title.replace('[MHD] ', ''),
          documentType: parsed?.documentType ?? 'UNKNOWN',
          mimeType: parsed?.mimeType ?? 'application/octet-stream',
          status: d.status,
          createdAt: d.createdAt.toISOString(),
        };
      }),
    };
  }

  // ─── XCA: Cross-Community Access (ITI-38, ITI-39) ─────────────────────────

  /**
   * Cross-community gateway query — IHE XCA ITI-38.
   * Queries documents from external communities. Currently returns
   * local ClinicalDocuments tagged with the community ID.
   */
  async xcaCrossGatewayQuery(tenantId: string, dto: XcaQueryDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // In a real implementation, this would call external community gateways.
    // For now, we query local documents that match the community tag.
    const where: Record<string, unknown> = {
      tenantId,
      patientId: dto.patientId,
    };

    if (dto.dateFrom || dto.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dto.dateFrom) createdAt.gte = new Date(dto.dateFrom);
      if (dto.dateTo) createdAt.lte = new Date(dto.dateTo);
      where.createdAt = createdAt;
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    this.recordAuditEvent(tenantId, 'system', 'ITI-38', 'E', '0', dto.patientId, null, 'XCA Query');

    return {
      queryId: crypto.randomUUID(),
      respondingCommunity: dto.communityId,
      homeCommunityId: this.repositoryUniqueId,
      results: docs.map((d) => ({
        documentUniqueId: `${this.repositoryUniqueId}.${d.id}`,
        documentId: d.id,
        title: d.title,
        type: d.type,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        repositoryUniqueId: this.repositoryUniqueId,
        homeCommunityId: this.repositoryUniqueId,
      })),
      totalResults: docs.length,
    };
  }

  /**
   * Cross-community gateway retrieve — IHE XCA ITI-39.
   * Retrieves a specific document from an external community.
   */
  async xcaCrossGatewayRetrieve(tenantId: string, dto: XcaRetrieveDto) {
    // Extract the local document ID from the unique ID
    const parts = dto.documentUniqueId.split('.');
    const localDocId = parts[parts.length - 1];

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: localDocId,
        tenantId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        content: true,
        status: true,
        createdAt: true,
        patientId: true,
      },
    });

    if (!doc) {
      throw new NotFoundException(
        `Document "${dto.documentUniqueId}" not found in community "${dto.communityId}"`,
      );
    }

    this.recordAuditEvent(tenantId, 'system', 'ITI-39', 'R', '0', doc.patientId, doc.id, 'XCA Retrieve');

    return {
      documentUniqueId: dto.documentUniqueId,
      communityId: dto.communityId,
      repositoryUniqueId: this.repositoryUniqueId,
      document: {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        content: doc.content,
        status: doc.status,
        mimeType: 'text/xml',
        createdAt: doc.createdAt.toISOString(),
      },
    };
  }

  private recordAuditEvent(
    tenantId: string,
    userId: string,
    eventId: string,
    eventAction: string,
    eventOutcome: string,
    patientId: string | null,
    objectId: string | null,
    objectType: string | null,
  ): void {
    this.auditEntries.push({
      id: crypto.randomUUID(),
      eventId,
      eventType: 'IHE Transaction',
      eventAction,
      eventOutcome,
      sourceId: 'VoxPEP',
      userId,
      patientId,
      objectId,
      objectType,
      tenantId,
      timestamp: new Date(),
    });
  }

  private simpleHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
