import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: any;

  const mockDocument = {
    id: 'doc-1',
    patientId: 'patient-1',
    encounterId: 'enc-1',
    authorId: 'author-1',
    tenantId: 'tenant-1',
    type: 'DISCHARGE_SUMMARY',
    title: 'Discharge Summary',
    content: 'Patient discharged in good condition',
    status: 'DRAFT',
    signedAt: null,
    signedById: null,
    createdAt: new Date(),
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-001' },
    author: { id: 'author-1', name: 'Dr. Silva' },
    signedBy: null,
    template: null,
  };

  const mockPrisma = {
    clinicalDocument: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    documentTemplate: {
      findUnique: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a document', async () => {
      const dto = {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        type: 'DISCHARGE_SUMMARY',
        title: 'Discharge Summary',
        content: 'Patient discharged in good condition',
      };

      prisma.clinicalDocument.create.mockResolvedValue(mockDocument);

      const result = await service.create('tenant-1', 'author-1', dto as any);

      expect(result).toEqual(mockDocument);
      expect(prisma.clinicalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'patient-1',
          authorId: 'author-1',
          tenantId: 'tenant-1',
          type: 'DISCHARGE_SUMMARY',
          generatedByAI: false,
        }),
      });
    });
  });

  describe('sign', () => {
    it('should set signedAt and status SIGNED', async () => {
      prisma.clinicalDocument.findUnique.mockResolvedValue(mockDocument);
      const signed = {
        ...mockDocument,
        signedAt: new Date(),
        signedById: 'signer-1',
        status: 'SIGNED',
      };
      prisma.clinicalDocument.update.mockResolvedValue(signed);

      const result = await service.sign('doc-1', 'signer-1');

      expect(result.status).toBe('SIGNED');
      expect(prisma.clinicalDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: {
          signedAt: expect.any(Date),
          signedById: 'signer-1',
          status: 'SIGNED',
        },
      });
    });

    it('should throw BadRequestException on already-signed document', async () => {
      const signedDoc = { ...mockDocument, signedAt: new Date() };
      prisma.clinicalDocument.findUnique.mockResolvedValue(signedDoc);

      await expect(service.sign('doc-1', 'signer-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateFromTemplate', () => {
    const mockTemplate = {
      id: 'template-1',
      name: 'Discharge Template',
      type: 'DISCHARGE_SUMMARY',
      content:
        'Patient: {{patient.fullName}}, CPF: {{patient.cpf}}, MRN: {{patient.mrn}}, Doctor: {{doctor.name}}',
    };

    const mockPatient = {
      id: 'patient-1',
      fullName: 'Maria Silva',
      cpf: '12345678900',
      mrn: 'MRN-001',
      birthDate: new Date('1985-03-15'),
      gender: 'FEMALE',
      address: 'Rua A',
      city: 'Sao Paulo',
      state: 'SP',
    };

    const mockAuthor = {
      id: 'author-1',
      name: 'Dr. Silva',
    };

    it('should replace template variables', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.user.findUnique.mockResolvedValue(mockAuthor);
      prisma.clinicalDocument.create.mockResolvedValue({
        ...mockDocument,
        content:
          'Patient: Maria Silva, CPF: 12345678900, MRN: MRN-001, Doctor: Dr. Silva',
      });

      await service.generateFromTemplate(
        'tenant-1',
        'author-1',
        'template-1',
        'patient-1',
      );

      expect(prisma.clinicalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'patient-1',
          authorId: 'author-1',
          tenantId: 'tenant-1',
          templateId: 'template-1',
          type: 'DISCHARGE_SUMMARY',
          title: 'Discharge Template',
          content: expect.stringContaining('Maria Silva'),
        }),
      });
    });

    it('should throw NotFoundException if template not found', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.generateFromTemplate(
          'tenant-1',
          'author-1',
          'nonexistent',
          'patient-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if patient not found', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.generateFromTemplate(
          'tenant-1',
          'author-1',
          'template-1',
          'nonexistent',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
