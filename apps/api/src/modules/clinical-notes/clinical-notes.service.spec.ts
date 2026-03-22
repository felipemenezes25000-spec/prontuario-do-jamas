import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ClinicalNotesService', () => {
  let service: ClinicalNotesService;
  let prisma: any;

  const mockAuthor = {
    id: 'author-1',
    name: 'Dr. Silva',
    role: 'DOCTOR',
  };

  const mockNote = {
    id: 'note-1',
    encounterId: 'enc-1',
    authorId: 'author-1',
    authorRole: 'DOCTOR',
    type: 'EVOLUTION',
    status: 'DRAFT',
    subjective: 'Patient complains of headache',
    objective: 'BP 120/80',
    assessment: 'Migraine',
    plan: 'Prescribe ibuprofen',
    freeText: null,
    diagnosisCodes: [],
    procedureCodes: [],
    voiceTranscriptionId: null,
    wasGeneratedByAI: false,
    signedAt: null,
    signedById: null,
    parentNoteId: null,
    version: 1,
    createdAt: new Date(),
    author: mockAuthor,
    signedBy: null,
    cosignedBy: null,
    voiceTranscription: null,
    parentNote: null,
    amendments: [],
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    clinicalNote: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalNotesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClinicalNotesService>(ClinicalNotesService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      encounterId: 'enc-1',
      type: 'EVOLUTION',
      subjective: 'Patient complains of headache',
      objective: 'BP 120/80',
      assessment: 'Migraine',
      plan: 'Prescribe ibuprofen',
    };

    it('should create note in DRAFT status', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAuthor);
      prisma.clinicalNote.create.mockResolvedValue(mockNote);

      const result = await service.create('author-1', createDto as any);

      expect(result).toEqual(mockNote);
      expect(prisma.clinicalNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encounterId: 'enc-1',
          authorId: 'author-1',
          authorRole: 'DOCTOR',
          type: 'EVOLUTION',
          wasGeneratedByAI: false,
        }),
      });
    });

    it('should throw NotFoundException if author not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', createDto as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEncounter', () => {
    it('should return notes for encounter ordered by date desc', async () => {
      prisma.clinicalNote.findMany.mockResolvedValue([mockNote]);

      const result = await service.findByEncounter('enc-1');

      expect(result).toEqual([mockNote]);
      expect(prisma.clinicalNote.findMany).toHaveBeenCalledWith({
        where: { encounterId: 'enc-1' },
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({
          author: { select: { id: true, name: true, role: true } },
          signedBy: { select: { id: true, name: true } },
          amendments: { orderBy: { createdAt: 'desc' } },
        }),
      });
    });
  });

  describe('update', () => {
    it('should update only DRAFT notes', async () => {
      prisma.clinicalNote.findUnique.mockResolvedValue(mockNote);
      const updated = { ...mockNote, subjective: 'Updated complaint' };
      prisma.clinicalNote.update.mockResolvedValue(updated);

      const result = await service.update('note-1', {
        subjective: 'Updated complaint',
      } as any);

      expect(result.subjective).toBe('Updated complaint');
    });

    it('should throw BadRequestException on SIGNED notes', async () => {
      const signedNote = { ...mockNote, status: 'SIGNED' };
      prisma.clinicalNote.findUnique.mockResolvedValue(signedNote);

      await expect(
        service.update('note-1', { subjective: 'Updated' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sign', () => {
    it('should set signedAt and status SIGNED', async () => {
      prisma.clinicalNote.findUnique.mockResolvedValue(mockNote);
      const signed = {
        ...mockNote,
        status: 'SIGNED',
        signedAt: new Date(),
        signedById: 'signer-1',
      };
      prisma.clinicalNote.update.mockResolvedValue(signed);

      const result = await service.sign('note-1', 'signer-1');

      expect(result.status).toBe('SIGNED');
      expect(result.signedById).toBe('signer-1');
      expect(prisma.clinicalNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: {
          status: 'SIGNED',
          signedAt: expect.any(Date),
          signedById: 'signer-1',
        },
      });
    });

    it('should throw BadRequestException if already signed', async () => {
      const signedNote = { ...mockNote, status: 'SIGNED' };
      prisma.clinicalNote.findUnique.mockResolvedValue(signedNote);

      await expect(service.sign('note-1', 'signer-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createAddendum', () => {
    it('should create addendum with parentNoteId and incremented version', async () => {
      const signedParent = {
        ...mockNote,
        status: 'SIGNED',
        version: 1,
      };
      prisma.clinicalNote.findUnique.mockResolvedValue(signedParent);
      prisma.user.findUnique.mockResolvedValue(mockAuthor);
      prisma.clinicalNote.update.mockResolvedValue({
        ...signedParent,
        status: 'AMENDED',
      });

      const addendum = {
        ...mockNote,
        id: 'note-2',
        type: 'ADDENDUM',
        parentNoteId: 'note-1',
        version: 2,
      };
      prisma.clinicalNote.create.mockResolvedValue(addendum);

      const dto = {
        encounterId: 'enc-1',
        type: 'ADDENDUM',
        freeText: 'Additional info',
      };

      const result = await service.createAddendum(
        'note-1',
        'author-1',
        dto as any,
      );

      expect(result.parentNoteId).toBe('note-1');
      expect(result.version).toBe(2);
      expect(result.type).toBe('ADDENDUM');
      expect(prisma.clinicalNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { status: 'AMENDED' },
      });
      expect(prisma.clinicalNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentNoteId: 'note-1',
          version: 2,
          type: 'ADDENDUM',
        }),
      });
    });

    it('should throw NotFoundException if author not found', async () => {
      prisma.clinicalNote.findUnique.mockResolvedValue(mockNote);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createAddendum('note-1', 'nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
