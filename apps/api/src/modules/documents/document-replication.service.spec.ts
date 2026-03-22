import { Test, TestingModule } from '@nestjs/testing';
import { DocumentReplicationService } from './document-replication.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DocumentReplicationService', () => {
  let service: DocumentReplicationService;
  let _prisma: Record<string, Record<string, jest.Mock>>;

  const tenantId = 'tenant-1';
  const patientId = 'patient-1';

  const mockPrisma = {
    clinicalDocument: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    clinicalNote: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    prescription: {
      findFirst: jest.fn(),
    },
    prescriptionItem: {
      findMany: jest.fn(),
    },
    allergy: {
      findMany: jest.fn(),
    },
    chronicCondition: {
      findMany: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentReplicationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DocumentReplicationService>(DocumentReplicationService);
    _prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // getLastDocumentMetadata
  // ==========================================================================

  describe('getLastDocumentMetadata', () => {
    it('should return found: false when no document exists', async () => {
      mockPrisma.clinicalDocument.findFirst.mockResolvedValue(null);

      const result = await service.getLastDocumentMetadata(
        tenantId,
        patientId,
        'ATESTADO',
      );

      expect(result.found).toBe(false);
      expect(result.template).toEqual({});
      expect(result.sourceDocumentId).toBeNull();
      expect(result.sourceDate).toBeNull();
    });

    it('should return metadata template from last document', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Atestado Médico',
        content: 'Content here',
        templateId: 'tpl-1',
        createdAt: new Date('2026-03-01'),
        author: { id: 'author-1', name: 'Dr. Silva' },
        template: { id: 'tpl-1', name: 'Template Atestado' },
      };
      mockPrisma.clinicalDocument.findFirst.mockResolvedValue(mockDoc);
      // enrichWithClinicalNoteData will be called for ATESTADO
      mockPrisma.clinicalNote.findFirst.mockResolvedValue(null);

      const result = await service.getLastDocumentMetadata(
        tenantId,
        patientId,
        'ATESTADO',
      );

      expect(result.found).toBe(true);
      expect(result.sourceDocumentId).toBe('doc-1');
      expect(result.sourceDate).toEqual(new Date('2026-03-01'));
      expect(result.template.title).toBe('Atestado Médico');
      expect(result.template.templateName).toBe('Template Atestado');
      expect(result.template.author).toEqual({ id: 'author-1', name: 'Dr. Silva' });
    });

    it('should enrich RECEITA type with prescription data', async () => {
      const mockDoc = {
        id: 'doc-2',
        title: 'Receita',
        content: 'Rx content',
        templateId: null,
        createdAt: new Date('2026-03-10'),
        author: { id: 'author-1', name: 'Dr. Silva' },
        template: null,
      };
      mockPrisma.clinicalDocument.findFirst.mockResolvedValue(mockDoc);

      const mockPrescription = {
        id: 'rx-1',
        type: 'MEDICATION',
        createdAt: new Date('2026-03-10'),
        items: [
          {
            medicationName: 'Amoxicilina',
            activeIngredient: 'Amoxicilina',
            concentration: '500mg',
            pharmaceuticalForm: 'Cápsula',
            dose: '500',
            doseUnit: 'mg',
            route: 'ORAL',
            frequency: '8/8h',
            duration: '7',
            durationUnit: 'DAYS',
            specialInstructions: null,
            examName: null,
            examCode: null,
            examType: null,
            examJustification: null,
          },
        ],
      };
      mockPrisma.prescription.findFirst.mockResolvedValue(mockPrescription);

      const result = await service.getLastDocumentMetadata(
        tenantId,
        patientId,
        'RECEITA',
      );

      expect(result.found).toBe(true);
      expect(result.template.lastPrescriptionId).toBe('rx-1');
      expect(result.template.medications).toHaveLength(1);
      const meds = result.template.medications as Array<Record<string, unknown>>;
      expect(meds[0].medicationName).toBe('Amoxicilina');
    });

    it('should enrich LAUDO type with clinical note data', async () => {
      const mockDoc = {
        id: 'doc-3',
        title: 'Laudo Médico',
        content: 'Laudo content',
        templateId: null,
        createdAt: new Date('2026-03-15'),
        author: { id: 'author-1', name: 'Dr. Silva' },
        template: null,
      };
      mockPrisma.clinicalDocument.findFirst.mockResolvedValue(mockDoc);

      const mockNote = {
        id: 'note-1',
        type: 'SOAP',
        subjective: 'Paciente com dor de cabeça',
        assessment: 'Cefaleia tensional',
        plan: 'Repouso e analgésico',
        diagnosisCodes: ['G44.2'],
        createdAt: new Date('2026-03-14'),
        author: { id: 'author-1', name: 'Dr. Silva' },
      };
      mockPrisma.clinicalNote.findFirst.mockResolvedValue(mockNote);

      const result = await service.getLastDocumentMetadata(
        tenantId,
        patientId,
        'LAUDO',
      );

      expect(result.found).toBe(true);
      expect(result.template.diagnosisCodes).toEqual(['G44.2']);
      expect(result.template.lastComplaint).toBe('Paciente com dor de cabeça');
      expect(result.template.attendingDoctor).toEqual({
        id: 'author-1',
        name: 'Dr. Silva',
      });
    });
  });

  // ==========================================================================
  // getPatientCommonData
  // ==========================================================================

  describe('getPatientCommonData', () => {
    it('should aggregate patient data correctly', async () => {
      mockPrisma.prescriptionItem.findMany.mockResolvedValue([
        { medicationName: 'Dipirona', dose: '500mg', route: 'ORAL', frequency: '6/6h' },
        { medicationName: 'Dipirona', dose: '500mg', route: 'ORAL', frequency: '6/6h' },
        { medicationName: 'Amoxicilina', dose: '500mg', route: 'ORAL', frequency: '8/8h' },
      ]);

      mockPrisma.clinicalNote.findMany.mockResolvedValue([
        { diagnosisCodes: ['J06.9', 'R50'] },
        { diagnosisCodes: ['J06.9'] },
      ]);

      mockPrisma.allergy.findMany.mockResolvedValue([
        {
          id: 'allergy-1',
          substance: 'Penicilina',
          type: 'MEDICATION',
          severity: 'SEVERE',
          reaction: 'Anafilaxia',
        },
      ]);

      mockPrisma.chronicCondition.findMany.mockResolvedValue([
        {
          id: 'cond-1',
          cidCode: 'I10',
          cidDescription: 'Hipertensão essencial',
          status: 'ACTIVE',
          severity: 'MODERATE',
          currentTreatment: 'Losartana 50mg',
        },
      ]);

      mockPrisma.patient.findFirst.mockResolvedValue({
        insuranceProvider: 'Unimed',
        insurancePlan: 'Nacional',
        insuranceNumber: '123456',
      });

      const result = await service.getPatientCommonData(tenantId, patientId);

      // Dipirona appears 2x, Amoxicilina 1x — Dipirona should be first
      expect(result.medications[0]).toBe('Dipirona');
      expect(result.medications).toContain('Amoxicilina');

      // J06.9 appears 2x, R50 1x
      expect(result.diagnoses[0]).toBe('J06.9');
      expect(result.diagnoses).toContain('R50');

      expect(result.allergies).toHaveLength(1);
      expect(result.allergies[0].substance).toBe('Penicilina');

      expect(result.conditions).toHaveLength(1);
      expect(result.conditions[0].cidCode).toBe('I10');

      expect(result.insurance.provider).toBe('Unimed');
      expect(result.insurance.plan).toBe('Nacional');
      expect(result.insurance.number).toBe('123456');
    });

    it('should handle patient with no data', async () => {
      mockPrisma.prescriptionItem.findMany.mockResolvedValue([]);
      mockPrisma.clinicalNote.findMany.mockResolvedValue([]);
      mockPrisma.allergy.findMany.mockResolvedValue([]);
      mockPrisma.chronicCondition.findMany.mockResolvedValue([]);
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      const result = await service.getPatientCommonData(tenantId, patientId);

      expect(result.medications).toEqual([]);
      expect(result.diagnoses).toEqual([]);
      expect(result.allergies).toEqual([]);
      expect(result.conditions).toEqual([]);
      expect(result.insurance.provider).toBeNull();
    });

    it('should limit medications and diagnoses to top 5', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        medicationName: `Med-${i}`,
        dose: '10mg',
        route: 'ORAL',
        frequency: '1x/dia',
      }));
      mockPrisma.prescriptionItem.findMany.mockResolvedValue(items);

      const notes = Array.from({ length: 10 }, (_, i) => ({
        diagnosisCodes: [`CID-${i}`],
      }));
      mockPrisma.clinicalNote.findMany.mockResolvedValue(notes);
      mockPrisma.allergy.findMany.mockResolvedValue([]);
      mockPrisma.chronicCondition.findMany.mockResolvedValue([]);
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      const result = await service.getPatientCommonData(tenantId, patientId);

      expect(result.medications.length).toBeLessThanOrEqual(5);
      expect(result.diagnoses.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // suggestFromHistory
  // ==========================================================================

  describe('suggestFromHistory', () => {
    it('should return matching suggestions from clinical notes', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([
        {
          id: 'note-1',
          type: 'SOAP',
          subjective: 'Paciente relata dor de cabeça intensa',
          objective: null,
          assessment: 'Cefaleia tensional',
          plan: 'Dipirona 500mg',
          diagnosisCodes: ['G44.2'],
          createdAt: new Date('2026-03-15'),
        },
      ]);
      mockPrisma.prescriptionItem.findMany.mockResolvedValue([]);
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([]);

      const result = await service.suggestFromHistory(
        tenantId,
        patientId,
        'cabeça',
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
      const subjectiveSuggestion = result.suggestions.find(
        (s) => s.field === 'subjective',
      );
      expect(subjectiveSuggestion).toBeDefined();
      expect(subjectiveSuggestion?.value).toContain('dor de cabeça');
    });

    it('should return matching medications from prescriptions', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([]);
      mockPrisma.prescriptionItem.findMany.mockResolvedValue([
        {
          medicationName: 'Amoxicilina 500mg',
          dose: '500mg',
          route: 'ORAL',
          frequency: '8/8h',
          createdAt: new Date('2026-03-10'),
        },
      ]);
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([]);

      const result = await service.suggestFromHistory(
        tenantId,
        patientId,
        'amoxicilina',
      );

      const medSuggestion = result.suggestions.find(
        (s) => s.field === 'medication',
      );
      expect(medSuggestion).toBeDefined();
      expect(medSuggestion?.value).toContain('Amoxicilina');
    });

    it('should return empty suggestions for no matches', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([
        {
          id: 'note-1',
          type: 'SOAP',
          subjective: 'Paciente com febre',
          objective: null,
          assessment: null,
          plan: null,
          diagnosisCodes: [],
          createdAt: new Date('2026-03-15'),
        },
      ]);
      mockPrisma.prescriptionItem.findMany.mockResolvedValue([]);
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([]);

      const result = await service.suggestFromHistory(
        tenantId,
        patientId,
        'xyz_nonexistent_term',
      );

      expect(result.suggestions).toEqual([]);
    });

    it('should sort suggestions by confidence descending', async () => {
      mockPrisma.clinicalNote.findMany.mockResolvedValue([
        {
          id: 'note-1',
          type: 'SOAP',
          subjective: 'Paciente com dor lombar',
          objective: null,
          assessment: 'Lombalgia — dor lombar crônica',
          plan: 'Fisioterapia para dor lombar',
          diagnosisCodes: [],
          createdAt: new Date('2026-03-15'),
        },
      ]);
      mockPrisma.prescriptionItem.findMany.mockResolvedValue([]);
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([]);

      const result = await service.suggestFromHistory(
        tenantId,
        patientId,
        'dor lombar',
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < result.suggestions.length; i++) {
        expect(result.suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          result.suggestions[i].confidence,
        );
      }
    });

    it('should limit suggestions to 10', async () => {
      const notes = Array.from({ length: 15 }, (_, i) => ({
        id: `note-${i}`,
        type: 'SOAP',
        subjective: `Paciente com dor ${i}`,
        objective: null,
        assessment: `Assessment dor ${i}`,
        plan: `Plan dor ${i}`,
        diagnosisCodes: [],
        createdAt: new Date('2026-03-15'),
      }));
      mockPrisma.clinicalNote.findMany.mockResolvedValue(notes);
      mockPrisma.prescriptionItem.findMany.mockResolvedValue([]);
      mockPrisma.clinicalDocument.findMany.mockResolvedValue([]);

      const result = await service.suggestFromHistory(
        tenantId,
        patientId,
        'dor',
      );

      expect(result.suggestions.length).toBeLessThanOrEqual(10);
    });
  });
});
