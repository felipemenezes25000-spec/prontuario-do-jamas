import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LgpdService } from './lgpd.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LgpdService', () => {
  let service: LgpdService;

  const tenantId = 'tenant-1';
  const patientId = 'patient-1';
  const userId = 'user-1';

  const mockPatient = {
    id: patientId,
    tenantId,
    fullName: 'Maria Silva',
    cpf: '12345678900',
    mrn: 'MRN-0001',
    birthDate: new Date('1985-03-15'),
    gender: 'F',
    createdAt: new Date('2020-01-01'),
    isActive: true,
    deletedAt: null,
  };

  const mockConsentRecord = {
    id: 'consent-1',
    patientId,
    tenantId,
    type: 'VOICE_RECORDING',
    purpose: 'Gravacao de voz',
    granted: true,
    grantedAt: new Date(),
    revokedAt: null,
    expiresAt: null,
    legalBasis: 'CONSENT',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    patient: {
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    consentRecord: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    dataRetentionPolicy: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    dataAccessLog: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    anonymizationLog: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    encounter: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    prescription: {
      aggregate: jest.fn(),
    },
    billingEntry: {
      aggregate: jest.fn(),
    },
    auditLog: {
      aggregate: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    dataAccessRequest: {
      count: jest.fn(),
    },
    clinicalDocument: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LgpdService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LgpdService>(LgpdService);
    jest.clearAllMocks();
  });

  // ─── Consent Recording ──────────────────────────────────────────────────

  describe('recordConsent', () => {
    it('should record a new consent for a patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      mockPrisma.consentRecord.create.mockResolvedValue(mockConsentRecord);

      const result = await service.recordConsent(patientId, tenantId, {
        consentType: 'VOICE_RECORDING',
        purpose: 'Gravacao de voz',
        granted: true,
        legalBasis: 'CONSENT',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockConsentRecord);
      expect(mockPrisma.consentRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId,
          tenantId,
          type: 'VOICE_RECORDING',
          granted: true,
          legalBasis: 'CONSENT',
        }),
      });
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.recordConsent(patientId, tenantId, {
          consentType: 'VOICE_RECORDING',
          purpose: 'test',
          granted: true,
          legalBasis: 'CONSENT',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Consent Revocation ─────────────────────────────────────────────────

  describe('revokeConsent', () => {
    it('should revoke an active consent', async () => {
      const revokedConsent = {
        ...mockConsentRecord,
        granted: false,
        revokedAt: new Date(),
      };

      mockPrisma.consentRecord.findFirst.mockResolvedValue(mockConsentRecord);
      mockPrisma.consentRecord.update.mockResolvedValue(revokedConsent);

      const result = await service.revokeConsent(
        patientId,
        'VOICE_RECORDING',
        tenantId,
      );

      expect(result.granted).toBe(false);
      expect(result.revokedAt).toBeDefined();
      expect(mockPrisma.consentRecord.update).toHaveBeenCalledWith({
        where: { id: mockConsentRecord.id },
        data: {
          granted: false,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if no active consent found', async () => {
      mockPrisma.consentRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeConsent(patientId, 'VOICE_RECORDING', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Check Consent ──────────────────────────────────────────────────────

  describe('checkConsent', () => {
    it('should return true when active consent exists', async () => {
      mockPrisma.consentRecord.findFirst.mockResolvedValue(mockConsentRecord);

      const result = await service.checkConsent(
        patientId,
        'VOICE_RECORDING',
        tenantId,
      );

      expect(result).toBe(true);
    });

    it('should return false when no active consent exists', async () => {
      mockPrisma.consentRecord.findFirst.mockResolvedValue(null);

      const result = await service.checkConsent(
        patientId,
        'VOICE_RECORDING',
        tenantId,
      );

      expect(result).toBe(false);
    });
  });

  // ─── Data Export (Portability) ──────────────────────────────────────────

  describe('exportPatientData', () => {
    it('should export complete patient data as JSON', async () => {
      const fullPatient = {
        ...mockPatient,
        allergies: [{ id: 'a1', substance: 'Penicillin' }],
        chronicConditions: [],
        familyHistory: [],
        surgicalHistory: [],
        socialHistory: null,
        vaccinations: [],
        encounters: [],
        vitalSigns: [],
        examResults: [],
        documents: [],
        consentRecords: [mockConsentRecord],
        dataAccessRequests: [],
        billingEntries: [],
      };

      mockPrisma.patient.findFirst.mockResolvedValue(fullPatient);
      mockPrisma.dataAccessLog.create.mockResolvedValue({});

      const result = await service.exportPatientData(patientId, tenantId);

      expect(result.lgpdReference).toBe('Lei 13.709/2018, Art. 18, V');
      expect(result.format).toBe('JSON');
      expect(result.patient).toBeDefined();
      expect(result.patient.fullName).toBe('Maria Silva');
      expect(result.patient.allergies).toHaveLength(1);
      expect(result.exportedAt).toBeDefined();

      // Verify export was logged
      expect(mockPrisma.dataAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EXPORT',
          resource: 'Patient',
          patientId,
          purpose: 'LGPD Art. 18, V — Portabilidade de dados',
        }),
      });
    });

    it('should throw NotFoundException for non-existent patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.exportPatientData('nonexistent', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Anonymization ─────────────────────────────────────────────────────

  describe('anonymizePatientData', () => {
    it('should anonymize PII and keep medical data', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      mockPrisma.encounter.count.mockResolvedValue(0);
      mockPrisma.dataRetentionPolicy.findMany.mockResolvedValue([]);
      mockPrisma.anonymizationLog.create.mockResolvedValue({
        id: 'anon-1',
        status: 'IN_PROGRESS',
      });
      mockPrisma.patient.update.mockResolvedValue({
        ...mockPatient,
        fullName: 'ANONIMIZADO-abc123',
        cpf: null,
      });
      mockPrisma.anonymizationLog.update.mockResolvedValue({
        id: 'anon-1',
        status: 'COMPLETED',
      });

      const result = await service.anonymizePatientData(
        patientId,
        tenantId,
        userId,
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.anonymizedHash).toBeDefined();
      expect(result.anonymizedHash.length).toBe(12);

      // Verify PII fields were anonymized
      expect(mockPrisma.patient.update).toHaveBeenCalledWith({
        where: { id: patientId },
        data: expect.objectContaining({
          fullName: expect.stringContaining('ANONIMIZADO-'),
          cpf: null,
          rg: null,
          phone: null,
          email: null,
          address: null,
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      });
    });

    it('should reject anonymization when patient has active encounters', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      mockPrisma.encounter.count.mockResolvedValue(2);

      await expect(
        service.anonymizePatientData(patientId, tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject anonymization when within retention period', async () => {
      const recentPatient = {
        ...mockPatient,
        createdAt: new Date(), // Created today — within 20-year retention
      };

      mockPrisma.patient.findFirst.mockResolvedValue(recentPatient);
      mockPrisma.encounter.count.mockResolvedValue(0);
      mockPrisma.dataRetentionPolicy.findMany.mockResolvedValue([
        {
          dataCategory: 'HEALTH_RECORDS',
          retentionYears: 20,
          legalBasis: 'CFM',
          description: 'test',
        },
      ]);

      await expect(
        service.anonymizePatientData(patientId, tenantId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.anonymizePatientData('nonexistent', tenantId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Retention Policies ─────────────────────────────────────────────────

  describe('getDataRetentionPolicies', () => {
    it('should return retention policies for a tenant', async () => {
      const policies = [
        {
          id: 'p1',
          tenantId,
          dataCategory: 'HEALTH_RECORDS',
          retentionYears: 20,
          legalBasis: 'CFM Resolucao 1.821/2007',
          description: 'Prontuarios medicos',
        },
      ];
      mockPrisma.dataRetentionPolicy.findMany.mockResolvedValue(policies);

      const result = await service.getDataRetentionPolicies(tenantId);

      expect(result).toEqual(policies);
      expect(mockPrisma.dataRetentionPolicy.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { dataCategory: 'asc' },
      });
    });
  });

  describe('setRetentionPolicy', () => {
    it('should create or update a retention policy', async () => {
      const policy = {
        dataCategory: 'HEALTH_RECORDS' as const,
        retentionYears: 20,
        legalBasis: 'CFM Resolucao 1.821/2007',
        description: 'Prontuarios medicos',
      };

      const expectedResult = { id: 'p1', tenantId, ...policy };
      mockPrisma.dataRetentionPolicy.upsert.mockResolvedValue(expectedResult);

      const result = await service.setRetentionPolicy(tenantId, policy);

      expect(result).toEqual(expectedResult);
      expect(mockPrisma.dataRetentionPolicy.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_dataCategory: {
            tenantId,
            dataCategory: 'HEALTH_RECORDS',
          },
        },
        update: {
          retentionYears: 20,
          legalBasis: 'CFM Resolucao 1.821/2007',
          description: 'Prontuarios medicos',
        },
        create: {
          tenantId,
          dataCategory: 'HEALTH_RECORDS',
          retentionYears: 20,
          legalBasis: 'CFM Resolucao 1.821/2007',
          description: 'Prontuarios medicos',
        },
      });
    });
  });

  describe('checkRetentionCompliance', () => {
    it('should return compliance status for each policy', async () => {
      mockPrisma.dataRetentionPolicy.findMany.mockResolvedValue([
        {
          dataCategory: 'HEALTH_RECORDS',
          retentionYears: 20,
        },
        {
          dataCategory: 'AUDIT_LOGS',
          retentionYears: 5,
        },
      ]);

      mockPrisma.encounter.aggregate.mockResolvedValue({
        _count: 3,
        _min: { createdAt: new Date('2000-01-01') },
      });

      mockPrisma.auditLog.aggregate.mockResolvedValue({
        _count: 150,
        _min: { timestamp: new Date('2018-01-01') },
      });

      const result = await service.checkRetentionCompliance(tenantId);

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('HEALTH_RECORDS');
      expect(result[0].expiredCount).toBe(3);
      expect(result[1].category).toBe('AUDIT_LOGS');
      expect(result[1].expiredCount).toBe(150);
    });
  });

  // ─── Compliance Report ──────────────────────────────────────────────────

  describe('generatePrivacyReport', () => {
    it('should generate a comprehensive compliance report', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      mockPrisma.patient.count.mockResolvedValue(100);
      mockPrisma.consentRecord.count
        .mockResolvedValueOnce(80)  // activeConsents
        .mockResolvedValueOnce(5);  // revokedConsents
      mockPrisma.dataAccessLog.count.mockResolvedValue(5000);
      mockPrisma.anonymizationLog.findMany.mockResolvedValue([
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'FAILED' },
      ]);
      mockPrisma.dataRetentionPolicy.findMany.mockResolvedValue([
        {
          dataCategory: 'HEALTH_RECORDS',
          retentionYears: 20,
          legalBasis: 'CFM',
        },
      ]);
      mockPrisma.dataAccessRequest.count.mockResolvedValue(10);
      mockPrisma.dataAccessLog.groupBy.mockResolvedValue([
        { action: 'VIEW', _count: 4000 },
        { action: 'CREATE', _count: 800 },
        { action: 'EXPORT', _count: 200 },
      ]);
      mockPrisma.consentRecord.groupBy.mockResolvedValue([
        { type: 'LGPD_GENERAL', _count: 50 },
        { type: 'VOICE_RECORDING', _count: 30 },
      ]);

      const result = await service.generatePrivacyReport(
        tenantId,
        startDate,
        endDate,
      );

      expect(result.lgpdReference).toBe('Lei 13.709/2018, Art. 37-38');
      expect(result.summary.totalPatients).toBe(100);
      expect(result.summary.activeConsents).toBe(80);
      expect(result.summary.revokedConsents).toBe(5);
      expect(result.summary.dataAccessEvents).toBe(5000);
      expect(result.summary.anonymizationRequests).toBe(3);
      expect(result.summary.anonymizationsCompleted).toBe(2);
      expect(result.accessBreakdown).toHaveLength(3);
      expect(result.consentBreakdown).toHaveLength(2);
      expect(result.retentionPolicies).toHaveLength(1);
    });
  });

  // ─── Data Purge ─────────────────────────────────────────────────────────

  describe('purgeExpiredData', () => {
    it('should purge only audit logs (health records require manual review)', async () => {
      mockPrisma.dataRetentionPolicy.findMany.mockResolvedValue([
        { dataCategory: 'AUDIT_LOGS', retentionYears: 5 },
        { dataCategory: 'HEALTH_RECORDS', retentionYears: 20 },
      ]);

      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 42 });

      const result = await service.purgeExpiredData(tenantId);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].category).toBe('AUDIT_LOGS');
      expect(result.results[0].purgedCount).toBe(42);
      expect(result.note).toContain('CFM Resolucao 1.821/2007');
    });

    it('should return empty results when no data exceeds retention', async () => {
      mockPrisma.dataRetentionPolicy.findMany.mockResolvedValue([
        { dataCategory: 'AUDIT_LOGS', retentionYears: 5 },
      ]);

      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.purgeExpiredData(tenantId);

      expect(result.results).toHaveLength(0);
    });
  });

  // ─── DPO Dashboard ───────────────────────────────────────────────────────

  describe('getDpoDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      mockPrisma.consentRecord.count
        .mockResolvedValueOnce(100) // totalConsents
        .mockResolvedValueOnce(80)  // activeConsents
        .mockResolvedValueOnce(10); // revokedConsents
      mockPrisma.consentRecord.groupBy.mockResolvedValue([
        { type: 'LGPD_GENERAL', _count: 50 },
        { type: 'VOICE_RECORDING', _count: 30 },
      ]);
      mockPrisma.dataAccessLog.findMany.mockResolvedValue([
        { createdAt: new Date('2026-03-20') },
        { createdAt: new Date('2026-03-20') },
        { createdAt: new Date('2026-03-21') },
      ]);
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([]);
      mockPrisma.anonymizationLog.count.mockResolvedValue(5);
      mockPrisma.consentRecord.findMany.mockResolvedValue([
        { type: 'LGPD_GENERAL' },
        { type: 'VOICE_RECORDING' },
      ]);
      mockPrisma.dataRetentionPolicy.findMany.mockResolvedValue([
        { dataCategory: 'HEALTH_RECORDS', retentionYears: 20 },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(50);

      const result = await service.getDpoDashboard(tenantId);

      expect(result.totalConsents).toBe(100);
      expect(result.activeConsents).toBe(80);
      expect(result.revokedConsents).toBe(10);
      expect(result.consentsByType).toHaveLength(2);
      expect(result.dataAccessLogsByDay).toHaveLength(2);
      expect(result.anonymizationsPerformed).toBe(5);
      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.complianceScore).toBeLessThanOrEqual(100);
    });
  });

  // ─── Subject Requests ────────────────────────────────────────────────────

  describe('createSubjectRequest', () => {
    it('should create a subject request stored as ClinicalDocument', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const mockDoc = {
        id: 'doc-1',
        patientId,
        tenantId,
        title: '[LGPD:REQUEST] ACCESS — Paciente',
        content: '{}',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.clinicalDocument.create.mockResolvedValue(mockDoc);

      const result = await service.createSubjectRequest(tenantId, {
        type: 'ACCESS',
        patientId,
        requestedBy: 'Paciente',
        description: 'Solicito acesso aos meus dados',
      }, userId);

      expect(result.id).toBe('doc-1');
      expect(result.type).toBe('ACCESS');
      expect(result.status).toBe('PENDING');
      expect(result.deadline).toBeDefined();
      expect(mockPrisma.clinicalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: expect.stringContaining('[LGPD:REQUEST]'),
          type: 'CUSTOM',
          status: 'DRAFT',
        }),
      });
    });

    it('should throw NotFoundException for non-existent patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.createSubjectRequest(tenantId, {
          type: 'DELETION',
          patientId: 'nonexistent',
          requestedBy: 'test',
          description: 'test',
        }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listSubjectRequests', () => {
    it('should list and parse subject requests from ClinicalDocuments', async () => {
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          patientId,
          title: '[LGPD:REQUEST] ACCESS — Paciente',
          content: JSON.stringify({
            type: 'ACCESS',
            requestedBy: 'Paciente',
            description: 'Acesso aos dados',
            status: 'PENDING',
            deadline: '2026-04-10T00:00:00.000Z',
            response: null,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.listSubjectRequests(tenantId, {});

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ACCESS');
      expect(result[0].status).toBe('PENDING');
      expect(result[0].requestedBy).toBe('Paciente');
    });
  });

  describe('updateSubjectRequest', () => {
    it('should update status of a subject request', async () => {
      const existingDoc = {
        id: 'doc-1',
        tenantId,
        title: '[LGPD:REQUEST] ACCESS — Paciente',
        content: JSON.stringify({
          type: 'ACCESS',
          requestedBy: 'Paciente',
          description: 'test',
          status: 'PENDING',
          deadline: '2026-04-10T00:00:00.000Z',
          response: null,
          statusHistory: [{ status: 'PENDING', timestamp: '2026-03-25T00:00:00.000Z' }],
        }),
      };
      mockPrisma.clinicalDocument.findFirst.mockResolvedValue(existingDoc);
      mockPrisma.clinicalDocument.update.mockResolvedValue({
        ...existingDoc,
        updatedAt: new Date(),
      });

      const result = await service.updateSubjectRequest(
        tenantId,
        'doc-1',
        'COMPLETED',
        'Dados exportados com sucesso',
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.response).toBe('Dados exportados com sucesso');
    });

    it('should throw NotFoundException for non-existent request', async () => {
      mockPrisma.clinicalDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSubjectRequest(tenantId, 'nonexistent', 'COMPLETED'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Data Incidents ──────────────────────────────────────────────────────

  describe('createDataIncident', () => {
    it('should create a data incident stored as ClinicalDocument', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const mockDoc = {
        id: 'inc-1',
        tenantId,
        title: '[LGPD:INCIDENT] HIGH — 50 registros afetados',
        content: '{}',
        status: 'DRAFT',
        createdAt: new Date(),
      };
      mockPrisma.clinicalDocument.create.mockResolvedValue(mockDoc);

      const result = await service.createDataIncident(tenantId, {
        severity: 'HIGH',
        affectedRecords: 50,
        description: 'Acesso nao autorizado detectado',
        containmentActions: 'Credenciais revogadas',
        notifiedAnpd: true,
      }, userId);

      expect(result.id).toBe('inc-1');
      expect(result.severity).toBe('HIGH');
      expect(result.status).toBe('DETECTED');
      expect(result.notifiedAnpd).toBe(true);
    });
  });

  describe('listDataIncidents', () => {
    it('should list and parse incidents', async () => {
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([
        {
          id: 'inc-1',
          title: '[LGPD:INCIDENT] HIGH — 50 registros afetados',
          content: JSON.stringify({
            severity: 'HIGH',
            affectedRecords: 50,
            description: 'Acesso nao autorizado',
            containmentActions: 'Credenciais revogadas',
            notifiedAnpd: true,
            status: 'DETECTED',
            timeline: [{ status: 'DETECTED', timestamp: '2026-03-25T00:00:00.000Z' }],
          }),
          createdAt: new Date(),
        },
      ]);

      const result = await service.listDataIncidents(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('HIGH');
      expect(result[0].affectedRecords).toBe(50);
      expect(result[0].notifiedAnpd).toBe(true);
    });
  });

  // ─── DPIA ────────────────────────────────────────────────────────────────

  describe('generateDpia', () => {
    it('should generate and store a DPIA', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const mockDoc = {
        id: 'dpia-1',
        tenantId,
        title: '[LGPD:DPIA] Processamento biometrico',
        content: '{}',
        status: 'FINAL',
        createdAt: new Date(),
      };
      mockPrisma.clinicalDocument.create.mockResolvedValue(mockDoc);

      const result = await service.generateDpia(tenantId, {
        processName: 'Processamento biometrico',
        purpose: 'Autenticacao de pacientes',
        dataCategories: ['PERSONAL_IDENTIFICATION'],
        risks: ['Vazamento de dados'],
        mitigationMeasures: ['Criptografia', 'Controle de acesso'],
      }, userId);

      expect(result.id).toBe('dpia-1');
      expect(result.processName).toBe('Processamento biometrico');
      expect(result.riskLevel).toBe('LOW'); // 2 mitigations for 1 risk = LOW
    });

    it('should calculate HIGH risk when mitigations are insufficient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      mockPrisma.clinicalDocument.create.mockResolvedValue({
        id: 'dpia-2',
        createdAt: new Date(),
      });

      const result = await service.generateDpia(tenantId, {
        processName: 'Processo arriscado',
        purpose: 'Teste',
        dataCategories: ['HEALTH_RECORDS'],
        risks: ['Risco 1', 'Risco 2', 'Risco 3', 'Risco 4'],
        mitigationMeasures: ['Mitigacao 1'],
      }, userId);

      expect(result.riskLevel).toBe('HIGH'); // 1 mitigation for 4 risks = HIGH
    });
  });

  describe('listDpias', () => {
    it('should list and parse DPIAs', async () => {
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([
        {
          id: 'dpia-1',
          title: '[LGPD:DPIA] Processamento biometrico',
          content: JSON.stringify({
            processName: 'Processamento biometrico',
            purpose: 'Autenticacao',
            dataCategories: ['PERSONAL_IDENTIFICATION'],
            risks: ['Vazamento'],
            mitigationMeasures: ['Criptografia'],
            riskLevel: 'LOW',
            generatedAt: '2026-03-25T00:00:00.000Z',
          }),
          createdAt: new Date(),
        },
      ]);

      const result = await service.listDpias(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].processName).toBe('Processamento biometrico');
      expect(result[0].riskLevel).toBe('LOW');
    });
  });
});
