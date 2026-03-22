import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NursingService } from './nursing.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NursingService', () => {
  let service: NursingService;
  let prisma: any;

  const mockProcess = {
    id: 'np-1',
    encounterId: 'enc-1',
    patientId: 'patient-1',
    nurseId: 'nurse-1',
    status: 'IN_PROGRESS',
    dataCollectionNotes: 'Patient report',
    createdAt: new Date(),
    nurse: { id: 'nurse-1', name: 'Nurse Ana' },
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-001' },
    diagnoses: [],
  };

  const mockDiagnosis = {
    id: 'nd-1',
    nursingProcessId: 'np-1',
    nandaCode: '00132',
    nandaDomain: 'Comfort',
    nandaClass: 'Physical Comfort',
    nandaTitle: 'Acute Pain',
    status: 'ACTIVE',
    priority: 'HIGH',
  };

  const mockPrisma = {
    nursingProcess: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    nursingDiagnosis: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    nursingOutcome: {
      create: jest.fn(),
    },
    nursingIntervention: {
      create: jest.fn(),
    },
    nursingNote: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    fluidBalance: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NursingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NursingService>(NursingService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('createProcess', () => {
    it('should create process with IN_PROGRESS status', async () => {
      const dto = {
        encounterId: 'enc-1',
        patientId: 'patient-1',
        dataCollectionNotes: 'Patient report',
      };
      prisma.nursingProcess.create.mockResolvedValue(mockProcess);

      const result = await service.createProcess('nurse-1', dto as any);

      expect(result).toEqual(mockProcess);
      expect(prisma.nursingProcess.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encounterId: 'enc-1',
          patientId: 'patient-1',
          nurseId: 'nurse-1',
          dataCollectionNotes: 'Patient report',
        }),
      });
    });
  });

  describe('addDiagnosis', () => {
    it('should link diagnosis to process', async () => {
      prisma.nursingProcess.findUnique.mockResolvedValue(mockProcess);
      prisma.nursingDiagnosis.create.mockResolvedValue(mockDiagnosis);

      const dto = {
        nandaCode: '00132',
        nandaDomain: 'Comfort',
        nandaClass: 'Physical Comfort',
        nandaTitle: 'Acute Pain',
        priority: 'HIGH',
      };

      const result = await service.addDiagnosis('np-1', dto as any);

      expect(result).toEqual(mockDiagnosis);
      expect(prisma.nursingDiagnosis.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nursingProcessId: 'np-1',
          nandaCode: '00132',
          status: 'ACTIVE',
          aiSuggested: false,
        }),
      });
    });

    it('should throw NotFoundException if process not found', async () => {
      prisma.nursingProcess.findUnique.mockResolvedValue(null);

      await expect(
        service.addDiagnosis('nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addOutcome', () => {
    it('should link outcome to diagnosis', async () => {
      const mockOutcome = {
        id: 'no-1',
        nursingDiagnosisId: 'nd-1',
        nocCode: '2102',
        nocTitle: 'Pain Level',
        baselineScore: 2,
        targetScore: 4,
        currentScore: 2,
      };
      prisma.nursingDiagnosis.findUnique.mockResolvedValue(mockDiagnosis);
      prisma.nursingOutcome.create.mockResolvedValue(mockOutcome);

      const dto = {
        nocCode: '2102',
        nocTitle: 'Pain Level',
        baselineScore: 2,
        targetScore: 4,
        currentScore: 2,
      };

      const result = await service.addOutcome('nd-1', dto as any);

      expect(result).toEqual(mockOutcome);
      expect(prisma.nursingOutcome.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nursingDiagnosisId: 'nd-1',
          nocCode: '2102',
        }),
      });
    });

    it('should throw NotFoundException if diagnosis not found', async () => {
      prisma.nursingDiagnosis.findUnique.mockResolvedValue(null);

      await expect(
        service.addOutcome('nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addIntervention', () => {
    it('should link intervention to diagnosis', async () => {
      const mockIntervention = {
        id: 'ni-1',
        nursingDiagnosisId: 'nd-1',
        nicCode: '1400',
        nicTitle: 'Pain Management',
        notes: 'Apply cold compress',
      };
      prisma.nursingDiagnosis.findUnique.mockResolvedValue(mockDiagnosis);
      prisma.nursingIntervention.create.mockResolvedValue(mockIntervention);

      const dto = {
        nicCode: '1400',
        nicTitle: 'Pain Management',
        notes: 'Apply cold compress',
      };

      const result = await service.addIntervention('nd-1', dto as any);

      expect(result).toEqual(mockIntervention);
      expect(prisma.nursingIntervention.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nursingDiagnosisId: 'nd-1',
          nicCode: '1400',
        }),
      });
    });

    it('should throw NotFoundException if diagnosis not found', async () => {
      prisma.nursingDiagnosis.findUnique.mockResolvedValue(null);

      await expect(
        service.addIntervention('nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createNote', () => {
    it('should store content and voice reference', async () => {
      const mockNursingNote = {
        id: 'nn-1',
        encounterId: 'enc-1',
        nurseId: 'nurse-1',
        type: 'PROGRESS',
        content: 'Patient resting comfortably',
        shift: 'MORNING',
        voiceTranscriptionId: 'voice-1',
      };
      prisma.nursingNote.create.mockResolvedValue(mockNursingNote);

      const dto = {
        encounterId: 'enc-1',
        type: 'PROGRESS',
        content: 'Patient resting comfortably',
        shift: 'MORNING',
        voiceTranscriptionId: 'voice-1',
      };

      const result = await service.createNote('nurse-1', dto as any);

      expect(result).toEqual(mockNursingNote);
      expect(prisma.nursingNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encounterId: 'enc-1',
          nurseId: 'nurse-1',
          voiceTranscriptionId: 'voice-1',
        }),
      });
    });
  });

  describe('createFluidBalance', () => {
    it('should calculate intakeTotal correctly', async () => {
      const dto = {
        encounterId: 'enc-1',
        patientId: 'patient-1',
        period: 'SHIFT_6H',
        intakeOral: 500,
        intakeIV: 1000,
        intakeOther: 200,
        outputUrine: 800,
        outputDrain: 100,
        outputEmesis: 0,
        outputStool: 0,
        outputOther: 0,
      };

      const expectedResult = {
        ...dto,
        id: 'fb-1',
        nurseId: 'nurse-1',
        intakeTotal: 1700,
        outputTotal: 900,
        balance: 800,
      };

      prisma.fluidBalance.create.mockResolvedValue(expectedResult);

      const result = await service.createFluidBalance('nurse-1', dto as any);

      expect(prisma.fluidBalance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          intakeOral: 500,
          intakeIV: 1000,
          intakeOther: 200,
          intakeTotal: 1700,
          outputUrine: 800,
          outputDrain: 100,
          outputEmesis: 0,
          outputStool: 0,
          outputOther: 0,
          outputTotal: 900,
          balance: 800,
        }),
      });
    });

    it('should calculate balance = intakeTotal - outputTotal', async () => {
      const dto = {
        encounterId: 'enc-1',
        patientId: 'patient-1',
        period: 'SHIFT_6H',
        intakeOral: 300,
        intakeIV: 0,
        intakeOther: 0,
        outputUrine: 1000,
        outputDrain: 200,
        outputEmesis: 100,
        outputStool: 50,
        outputOther: 50,
      };

      prisma.fluidBalance.create.mockResolvedValue({});

      await service.createFluidBalance('nurse-1', dto as any);

      expect(prisma.fluidBalance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          intakeTotal: 300,
          outputTotal: 1400,
          balance: -1100,
        }),
      });
    });

    it('should default missing values to 0', async () => {
      const dto = {
        encounterId: 'enc-1',
        patientId: 'patient-1',
        period: 'SHIFT_6H',
      };

      prisma.fluidBalance.create.mockResolvedValue({});

      await service.createFluidBalance('nurse-1', dto as any);

      expect(prisma.fluidBalance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          intakeTotal: 0,
          outputTotal: 0,
          balance: 0,
        }),
      });
    });
  });

  describe('findByEncounter', () => {
    it('should return full process tree with notes and fluid balances', async () => {
      prisma.nursingProcess.findMany.mockResolvedValue([mockProcess]);
      prisma.nursingNote.findMany.mockResolvedValue([]);
      prisma.fluidBalance.findMany.mockResolvedValue([]);

      const result = await service.findByEncounter('enc-1');

      expect(result).toEqual({
        processes: [mockProcess],
        notes: [],
        fluidBalances: [],
      });
      expect(prisma.nursingProcess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { encounterId: 'enc-1' },
        }),
      );
    });
  });
});
