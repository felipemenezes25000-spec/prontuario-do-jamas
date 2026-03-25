import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface UploadedDocument {
  id: string;
  patientId: string;
  tenantId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  description?: string;
  doctorReview?: {
    reviewedBy: string;
    reviewedAt: string;
    notes?: string;
    incorporated: boolean;
  };
  uploadedAt: string;
}

@Injectable()
export class DocumentUploadService {
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

  async uploadDocument(
    tenantId: string,
    userEmail: string,
    dto: {
      documentType: string;
      fileName: string;
      fileUrl: string;
      mimeType: string;
      fileSize: number;
      description?: string;
    },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const doc: UploadedDocument = {
      id: crypto.randomUUID(),
      patientId,
      tenantId,
      documentType: dto.documentType,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      description: dto.description,
      uploadedAt: new Date().toISOString(),
    };

    const clinicalDoc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[UPLOAD:${dto.documentType}] ${dto.fileName}`,
        content: JSON.stringify(doc),
        status: 'DRAFT',
      },
    });

    return { documentId: clinicalDoc.id, fileName: dto.fileName, documentType: dto.documentType };
  }

  async listUploads(
    tenantId: string,
    userEmail: string,
    options: { documentType?: string; page?: number; pageSize?: number },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      patientId,
      type: 'CUSTOM',
      title: { startsWith: options.documentType ? `[UPLOAD:${options.documentType}]` : '[UPLOAD:' },
      status: { not: 'VOIDED' },
    };

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, content: true, createdAt: true },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const upload = JSON.parse(d.content ?? '{}') as UploadedDocument;
      return {
        documentId: d.id,
        documentType: upload.documentType,
        fileName: upload.fileName,
        fileUrl: upload.fileUrl,
        description: upload.description,
        hasReview: !!upload.doctorReview,
        incorporated: upload.doctorReview?.incorporated ?? false,
        uploadedAt: upload.uploadedAt,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async deleteUpload(tenantId: string, userEmail: string, documentId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: documentId, tenantId, patientId, type: 'CUSTOM', title: { startsWith: '[UPLOAD:' } },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado.');

    await this.prisma.clinicalDocument.update({
      where: { id: documentId },
      data: { status: 'VOIDED' },
    });

    return { documentId, status: 'DELETED' };
  }

  async reviewUpload(
    tenantId: string,
    userEmail: string,
    documentId: string,
    dto: { notes?: string; incorporated: boolean },
  ) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: documentId, tenantId, type: 'CUSTOM', title: { startsWith: '[UPLOAD:' } },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado.');

    const upload = JSON.parse(doc.content ?? '{}') as UploadedDocument;
    upload.doctorReview = {
      reviewedBy: userEmail,
      reviewedAt: new Date().toISOString(),
      notes: dto.notes,
      incorporated: dto.incorporated,
    };

    await this.prisma.clinicalDocument.update({
      where: { id: documentId },
      data: {
        content: JSON.stringify(upload),
        status: dto.incorporated ? 'SIGNED' : 'DRAFT',
      },
    });

    return { documentId, reviewed: true, incorporated: dto.incorporated };
  }

  async getPendingReviews(tenantId: string, options: { page?: number; pageSize?: number }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      type: 'CUSTOM' as const,
      title: { startsWith: '[UPLOAD:' },
      status: 'DRAFT' as const,
    };

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const upload = JSON.parse(d.content ?? '{}') as UploadedDocument;
      return {
        documentId: d.id,
        documentType: upload.documentType,
        fileName: upload.fileName,
        patientName: d.patient?.fullName,
        patientId: d.patient?.id,
        hasReview: !!upload.doctorReview,
        uploadedAt: upload.uploadedAt,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
