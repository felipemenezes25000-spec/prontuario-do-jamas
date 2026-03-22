import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

export interface FindAllDocumentsOptions {
  patientId?: string;
  encounterId?: string;
  type?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, options: FindAllDocumentsOptions = {}) {
    const { patientId, encounterId, type, status, page = 1, pageSize = 20 } = options;
    const where: Record<string, unknown> = { tenantId };

    if (patientId) where.patientId = patientId;
    if (encounterId) where.encounterId = encounterId;
    if (type) where.type = type;
    if (status) where.status = status;

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          author: { select: { id: true, name: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(tenantId: string, authorId: string, dto: CreateDocumentDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        templateId: dto.templateId,
        voiceTranscriptionId: dto.voiceTranscriptionId,
        generatedByAI: dto.generatedByAI ?? false,
      },
    });
  }

  async findById(id: string) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        author: { select: { id: true, name: true } },
        signedBy: { select: { id: true, name: true } },
        template: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }

    return document;
  }

  async findByPatient(patientId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
      },
    });
  }

  async findByEncounter(encounterId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
      },
    });
  }

  async sign(id: string, signedById: string) {
    const document = await this.findById(id);

    if (document.signedAt) {
      throw new BadRequestException('Document is already signed');
    }

    return this.prisma.clinicalDocument.update({
      where: { id },
      data: {
        signedAt: new Date(),
        signedById,
        status: 'SIGNED',
      },
    });
  }

  async generateFromTemplate(
    tenantId: string,
    authorId: string,
    templateId: string,
    patientId: string,
    encounterId?: string,
    variables?: Record<string, string>,
  ) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${templateId}" not found`);
    }

    // Load patient data for variable replacement
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    // Load author data
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
    });

    // Replace placeholders in template content
    let content = template.content;

    const replacements: Record<string, string> = {
      '{{patient.fullName}}': patient.fullName,
      '{{patient.cpf}}': patient.cpf ?? '',
      '{{patient.mrn}}': patient.mrn,
      '{{patient.birthDate}}': patient.birthDate.toLocaleDateString('pt-BR'),
      '{{patient.gender}}': patient.gender,
      '{{patient.address}}': patient.address ?? '',
      '{{patient.city}}': patient.city ?? '',
      '{{patient.state}}': patient.state ?? '',
      '{{doctor.name}}': author?.name ?? '',
      '{{date}}': new Date().toLocaleDateString('pt-BR'),
      '{{datetime}}': new Date().toLocaleString('pt-BR'),
      ...variables,
    };

    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return this.prisma.clinicalDocument.create({
      data: {
        patientId,
        encounterId,
        authorId,
        tenantId,
        type: template.type,
        title: template.name,
        content,
        templateId,
      },
    });
  }
}
