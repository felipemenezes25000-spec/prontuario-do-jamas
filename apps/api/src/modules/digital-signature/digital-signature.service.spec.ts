import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DigitalSignatureService } from './digital-signature.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DigitalSignatureService', () => {
  let service: DigitalSignatureService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: Record<string, Record<string, jest.Mock>>;

  const tenantId = 'tenant-1';
  const signerId = 'signer-1';
  const certificateBase64 = 'dGVzdC1jZXJ0aWZpY2F0ZQ=='; // base64 stub
  const certificatePassword = 'test-password';

  const mockDocument = {
    id: 'doc-1',
    tenantId,
    patientId: 'patient-1',
    authorId: 'author-1',
    title: 'Discharge Summary',
    content: 'Patient discharged in good condition.',
    type: 'DISCHARGE_SUMMARY',
    status: 'DRAFT',
    signedAt: null,
    createdAt: new Date(),
  };

  const mockClinicalNote = {
    id: 'note-1',
    encounterId: 'enc-1',
    authorId: 'author-1',
    subjective: 'Patient complains of headache',
    objective: 'BP 120/80, HR 72',
    assessment: 'Tension headache',
    plan: 'Prescribe analgesic',
    freeText: null,
    encounter: { tenantId },
  };

  const mockPrescription = {
    id: 'presc-1',
    tenantId,
    encounterId: 'enc-1',
    doctorId: 'doc-1',
    patientId: 'patient-1',
    type: 'REGULAR',
    status: 'DRAFT',
    items: [
      {
        id: 'item-1',
        medicationName: 'Dipirona',
        dose: '500mg',
        route: 'ORAL',
        frequency: '6/6h',
      },
    ],
  };

  const mockSignature = {
    id: 'sig-1',
    tenantId,
    documentId: 'doc-1',
    clinicalNoteId: null,
    prescriptionId: null,
    signerId,
    signatureType: 'DISCHARGE_SUMMARY',
    certificateType: 'ICP_BRASIL_A1',
    certificateSubject: 'CN=Dr. Exemplo Medico, OU=Pessoa Fisica, O=ICP-Brasil, C=BR',
    certificateIssuer: 'CN=AC Certisign Multipla G7, OU=Autoridade Certificadora, O=ICP-Brasil, C=BR',
    certificateSerial: 'SN-123',
    certificateNotBefore: new Date('2024-01-01'),
    certificateNotAfter: new Date('2027-01-01'),
    signatureHash: 'abc123hash',
    signatureValue: 'base64signature',
    signedAt: new Date(),
    signatureStandard: 'CADES_BES',
    verified: true,
    verifiedAt: new Date(),
    verificationChain: null,
    timestampToken: null,
    createdAt: new Date(),
    signer: { id: signerId, name: 'Dr. Exemplo', email: 'dr@example.com' },
  };

  const mockPrisma = {
    clinicalDocument: {
      findUnique: jest.fn(),
    },
    clinicalNote: {
      findUnique: jest.fn(),
    },
    prescription: {
      findUnique: jest.fn(),
    },
    digitalSignature: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalSignatureService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DigitalSignatureService>(DigitalSignatureService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('signDocument', () => {
    it('should create a signature record for a clinical document', async () => {
      prisma.clinicalDocument.findUnique.mockResolvedValue(mockDocument);
      prisma.digitalSignature.create.mockResolvedValue(mockSignature);

      const result = await service.signDocument(
        signerId,
        tenantId,
        'doc-1',
        certificateBase64,
        certificatePassword,
        'CADES_BES' as const,
      );

      expect(result).toEqual(mockSignature);
      expect(prisma.digitalSignature.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          documentId: 'doc-1',
          signerId,
          signatureType: 'DISCHARGE_SUMMARY',
          certificateType: 'ICP_BRASIL_A1',
          signatureStandard: 'CADES_BES',
          verified: true,
        }),
      });
    });

    it('should throw NotFoundException if document not found', async () => {
      prisma.clinicalDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.signDocument(
          signerId,
          tenantId,
          'nonexistent',
          certificateBase64,
          certificatePassword,
          'CADES_BES' as const,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if document belongs to another tenant', async () => {
      prisma.clinicalDocument.findUnique.mockResolvedValue({
        ...mockDocument,
        tenantId: 'other-tenant',
      });

      await expect(
        service.signDocument(
          signerId,
          tenantId,
          'doc-1',
          certificateBase64,
          certificatePassword,
          'CADES_BES' as const,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('signClinicalNote', () => {
    it('should create a signature record for a clinical note', async () => {
      prisma.clinicalNote.findUnique.mockResolvedValue(mockClinicalNote);
      prisma.digitalSignature.create.mockResolvedValue({
        ...mockSignature,
        clinicalNoteId: 'note-1',
        documentId: null,
        signatureType: 'CLINICAL_NOTE',
      });

      const result = await service.signClinicalNote(
        signerId,
        tenantId,
        'note-1',
        certificateBase64,
        certificatePassword,
        'CADES_BES' as const,
      );

      expect(result.signatureType).toBe('CLINICAL_NOTE');
      expect(prisma.digitalSignature.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          clinicalNoteId: 'note-1',
          signerId,
          signatureType: 'CLINICAL_NOTE',
        }),
      });
    });

    it('should throw NotFoundException if note not found', async () => {
      prisma.clinicalNote.findUnique.mockResolvedValue(null);

      await expect(
        service.signClinicalNote(
          signerId,
          tenantId,
          'nonexistent',
          certificateBase64,
          certificatePassword,
          'CADES_BES' as const,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('signPrescription', () => {
    it('should create a signature record for a prescription', async () => {
      prisma.prescription.findUnique.mockResolvedValue(mockPrescription);
      prisma.digitalSignature.create.mockResolvedValue({
        ...mockSignature,
        prescriptionId: 'presc-1',
        documentId: null,
        signatureType: 'PRESCRIPTION',
      });

      const result = await service.signPrescription(
        signerId,
        tenantId,
        'presc-1',
        certificateBase64,
        certificatePassword,
        'CADES_BES' as const,
      );

      expect(result.signatureType).toBe('PRESCRIPTION');
      expect(prisma.digitalSignature.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          prescriptionId: 'presc-1',
          signerId,
          signatureType: 'PRESCRIPTION',
        }),
      });
    });
  });

  describe('generateSignatureHash', () => {
    it('should produce a deterministic SHA-256 hash', () => {
      const content = 'Patient discharged in good condition.';
      const hash1 = service.generateSignatureHash(content);
      const hash2 = service.generateSignatureHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = service.generateSignatureHash('content A');
      const hash2 = service.generateSignatureHash('content B');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateCertificate', () => {
    it('should return valid for a stub certificate with ICP-Brasil issuer', () => {
      const result = service.validateCertificate(
        certificateBase64,
        certificatePassword,
      );

      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
      expect(result.revoked).toBe(false);
      expect(result.trustedChain).toBe(true);
      expect(result.subject).toContain('ICP-Brasil');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('verifySignature', () => {
    it('should verify and update a signature record', async () => {
      prisma.digitalSignature.findUnique.mockResolvedValue(mockSignature);
      prisma.digitalSignature.update.mockResolvedValue({
        ...mockSignature,
        verified: true,
        verifiedAt: expect.any(Date),
        verificationChain: expect.any(String),
      });

      const result = await service.verifySignature('sig-1');

      expect(prisma.digitalSignature.update).toHaveBeenCalledWith({
        where: { id: 'sig-1' },
        data: expect.objectContaining({
          verified: true,
          verifiedAt: expect.any(Date),
          verificationChain: expect.any(String),
        }),
        include: {
          signer: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if signature not found', async () => {
      prisma.digitalSignature.findUnique.mockResolvedValue(null);

      await expect(
        service.verifySignature('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDocumentSignatures', () => {
    it('should list signatures for a document', async () => {
      prisma.digitalSignature.findMany.mockResolvedValue([mockSignature]);

      const result = await service.getDocumentSignatures('doc-1');

      expect(result).toHaveLength(1);
      expect(prisma.digitalSignature.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc-1' },
        orderBy: { signedAt: 'desc' },
        include: {
          signer: { select: { id: true, name: true, email: true } },
        },
      });
    });
  });

  describe('getUserSignatures', () => {
    it('should list signatures by a user', async () => {
      prisma.digitalSignature.findMany.mockResolvedValue([mockSignature]);

      const result = await service.getUserSignatures(signerId);

      expect(result).toHaveLength(1);
      expect(prisma.digitalSignature.findMany).toHaveBeenCalledWith({
        where: { signerId },
        orderBy: { signedAt: 'desc' },
        include: {
          document: { select: { id: true, title: true, type: true } },
          clinicalNote: { select: { id: true, type: true } },
          prescription: { select: { id: true, type: true } },
        },
      });
    });
  });

  describe('createTimestamp', () => {
    it('should return a base64-encoded timestamp token', async () => {
      const hash = service.generateSignatureHash('test content');
      const token = await service.createTimestamp(hash);

      expect(token).toBeTruthy();
      // Token should be valid base64
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      expect(parsed.messageImprint.hashAlgorithm).toBe('SHA-256');
      expect(parsed.messageImprint.hashedMessage).toBe(hash);
    });
  });

  describe('getSignatureReport', () => {
    it('should return a report with aggregated data', async () => {
      prisma.digitalSignature.findMany.mockResolvedValue([mockSignature]);

      const result = await service.getSignatureReport(
        tenantId,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      expect(result.totalSignatures).toBe(1);
      expect(result.byType).toHaveProperty('DISCHARGE_SUMMARY', 1);
      expect(result.byStandard).toHaveProperty('CADES_BES', 1);
      expect(result.bySigner['Dr. Exemplo']).toBe(1);
      expect(result.signatures).toHaveLength(1);
    });
  });
});
