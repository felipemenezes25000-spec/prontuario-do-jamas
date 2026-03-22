import { Test, TestingModule } from '@nestjs/testing';
import { AiProcessor, AiJobData } from './ai.processor';
import { SoapGeneratorService } from '../../ai/soap-generator.service';
import { PatientSummaryAiService } from '../../ai/patient-summary-ai.service';
import { DischargeAiService } from '../../ai/discharge-ai.service';
import { PrescriptionAiService } from '../../ai/prescription-ai.service';
import { TriageAiService } from '../../ai/triage-ai.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { Job } from 'bullmq';

describe('AiProcessor', () => {
  let processor: AiProcessor;

  const mockSoapGenerator = { generateSOAP: jest.fn() };
  const mockPatientSummary = { generateSummary: jest.fn() };
  const mockDischargeAi = { generateDischargeSummary: jest.fn() };
  const mockPrescriptionAi = { checkSafety: jest.fn() };
  const mockTriageAi = { classifyTriage: jest.fn() };
  const mockPrisma = {
    clinicalNote: { create: jest.fn() },
  };
  const mockRealtime = { emitNotification: jest.fn() };

  const createMockJob = (data: AiJobData): Job<AiJobData> =>
    ({ id: 'job-1', data }) as unknown as Job<AiJobData>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProcessor,
        { provide: SoapGeneratorService, useValue: mockSoapGenerator },
        { provide: PatientSummaryAiService, useValue: mockPatientSummary },
        { provide: DischargeAiService, useValue: mockDischargeAi },
        { provide: PrescriptionAiService, useValue: mockPrescriptionAi },
        { provide: TriageAiService, useValue: mockTriageAi },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RealtimeGateway, useValue: mockRealtime },
      ],
    }).compile();

    processor = module.get<AiProcessor>(AiProcessor);
    jest.clearAllMocks();
  });

  describe('soap-generation', () => {
    it('should generate SOAP note and persist when encounterId is provided', async () => {
      const soapResult = {
        subjective: 'S',
        objective: 'O',
        assessment: 'A',
        plan: 'P',
        diagnosisCodes: ['R51'],
      };
      mockSoapGenerator.generateSOAP.mockResolvedValue(soapResult);
      mockPrisma.clinicalNote.create.mockResolvedValue({});

      const job = createMockJob({
        type: 'soap-generation',
        userId: 'user-1',
        tenantId: 'tenant-1',
        payload: {
          transcription: 'Paciente relata cefaleia',
          patientContext: { age: 40 },
          encounterId: 'enc-1',
          userId: 'user-1',
          authorRole: 'DOCTOR',
        },
      });

      await processor.process(job);

      expect(mockSoapGenerator.generateSOAP).toHaveBeenCalledWith(
        'Paciente relata cefaleia',
        { age: 40 },
      );
      expect(mockPrisma.clinicalNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encounterId: 'enc-1',
          type: 'SOAP',
          status: 'DRAFT',
          wasGeneratedByAI: true,
        }),
      });
      expect(mockRealtime.emitNotification).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: 'ai-processing-complete',
          jobType: 'soap-generation',
        }),
      );
    });
  });

  describe('patient-summary', () => {
    it('should generate patient summary', async () => {
      const summary = { summary: 'Patient summary text' };
      mockPatientSummary.generateSummary.mockResolvedValue(summary);

      const job = createMockJob({
        type: 'patient-summary',
        userId: 'user-1',
        tenantId: 'tenant-1',
        payload: { patient: { id: 'p-1', name: 'Maria' } },
      });

      await processor.process(job);

      expect(mockPatientSummary.generateSummary).toHaveBeenCalledWith({ id: 'p-1', name: 'Maria' });
      expect(mockRealtime.emitNotification).toHaveBeenCalled();
    });
  });

  describe('prescription-safety', () => {
    it('should check prescription safety', async () => {
      const safetyResult = { safe: true, warnings: [] };
      mockPrescriptionAi.checkSafety.mockResolvedValue(safetyResult);

      const job = createMockJob({
        type: 'prescription-safety',
        userId: 'user-1',
        tenantId: 'tenant-1',
        payload: {
          items: [{ medicationName: 'Amoxicillin', dose: '500mg' }],
          patient: { id: 'p-1', allergies: ['Penicillin'] },
        },
      });

      await processor.process(job);

      expect(mockPrescriptionAi.checkSafety).toHaveBeenCalledWith(
        [{ medicationName: 'Amoxicillin', dose: '500mg' }],
        { id: 'p-1', allergies: ['Penicillin'] },
      );
    });
  });

  describe('error handling', () => {
    it('should emit failure notification and re-throw on error', async () => {
      mockSoapGenerator.generateSOAP.mockRejectedValue(new Error('AI service down'));

      const job = createMockJob({
        type: 'soap-generation',
        userId: 'user-1',
        tenantId: 'tenant-1',
        payload: { transcription: 'text', patientContext: {} },
      });

      await expect(processor.process(job)).rejects.toThrow('AI service down');

      expect(mockRealtime.emitNotification).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: 'ai-processing-failed',
          error: expect.any(String),
        }),
      );
    });

    it('should throw on unknown job type', async () => {
      const job = createMockJob({
        type: 'unknown-type' as never,
        userId: 'user-1',
        tenantId: 'tenant-1',
        payload: {},
      });

      await expect(processor.process(job)).rejects.toThrow('Unknown AI job type');
    });
  });

  describe('triage-classification', () => {
    it('should classify triage', async () => {
      const triageResult = { level: 'YELLOW', confidence: 0.85 };
      mockTriageAi.classifyTriage.mockResolvedValue(triageResult);

      const job = createMockJob({
        type: 'triage-classification',
        userId: 'user-1',
        tenantId: 'tenant-1',
        payload: {
          symptoms: ['headache', 'fever'],
          vitalSigns: { temperature: 38.5 },
          patientAge: 35,
          patientGender: 'FEMALE',
        },
      });

      await processor.process(job);

      expect(mockTriageAi.classifyTriage).toHaveBeenCalledWith(
        ['headache', 'fever'],
        { temperature: 38.5 },
        35,
        'FEMALE',
      );
    });
  });
});
