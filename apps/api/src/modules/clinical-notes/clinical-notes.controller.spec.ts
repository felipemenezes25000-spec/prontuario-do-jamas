import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalNotesController } from './clinical-notes.controller';
import { ClinicalNotesService } from './clinical-notes.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('ClinicalNotesController', () => {
  let controller: ClinicalNotesController;
  let service: ClinicalNotesService;

  const mockUser: JwtPayload = {
    sub: 'user-1',
    email: 'doctor@voxpep.com',
    role: 'DOCTOR',
    tenantId: 'tenant-1',
  };

  const mockNote = {
    id: 'note-1',
    encounterId: 'enc-1',
    authorId: 'user-1',
    type: 'SOAP',
    status: 'DRAFT',
    subjective: 'Patient reports headache',
    objective: 'Alert and oriented',
    assessment: 'Migraine',
    plan: 'Prescribe analgesic',
  };

  const mockClinicalNotesService = {
    create: jest.fn(),
    findByEncounter: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    sign: jest.fn(),
    createAddendum: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClinicalNotesController],
      providers: [
        { provide: ClinicalNotesService, useValue: mockClinicalNotesService },
      ],
    }).compile();

    controller = module.get<ClinicalNotesController>(ClinicalNotesController);
    service = module.get<ClinicalNotesService>(ClinicalNotesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a clinical note', async () => {
      const dto = { encounterId: 'enc-1', type: 'SOAP', subjective: 'Headache' };
      mockClinicalNotesService.create.mockResolvedValue(mockNote);

      const result = await controller.create(mockUser, dto as never);

      expect(service.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockNote);
    });

    it('should propagate errors', async () => {
      mockClinicalNotesService.create.mockRejectedValue(new Error('Bad request'));

      await expect(controller.create(mockUser, {} as never)).rejects.toThrow('Bad request');
    });
  });

  describe('findByEncounter', () => {
    it('should return clinical notes for an encounter', async () => {
      mockClinicalNotesService.findByEncounter.mockResolvedValue([mockNote]);

      const result = await controller.findByEncounter('enc-1');

      expect(service.findByEncounter).toHaveBeenCalledWith('enc-1');
      expect(result).toEqual([mockNote]);
    });
  });

  describe('findById', () => {
    it('should return clinical note by ID', async () => {
      mockClinicalNotesService.findById.mockResolvedValue(mockNote);

      const result = await controller.findById('note-1');

      expect(service.findById).toHaveBeenCalledWith('note-1');
      expect(result).toEqual(mockNote);
    });

    it('should propagate not found error', async () => {
      mockClinicalNotesService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById('missing')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update a DRAFT clinical note', async () => {
      const dto = { subjective: 'Updated subjective' };
      const updated = { ...mockNote, subjective: 'Updated subjective' };
      mockClinicalNotesService.update.mockResolvedValue(updated);

      const result = await controller.update('note-1', dto as never);

      expect(service.update).toHaveBeenCalledWith('note-1', dto);
      expect(result.subjective).toBe('Updated subjective');
    });

    it('should propagate error when editing signed note', async () => {
      mockClinicalNotesService.update.mockRejectedValue(new Error('Only DRAFT notes can be edited'));

      await expect(controller.update('note-1', {} as never)).rejects.toThrow('Only DRAFT notes can be edited');
    });
  });

  describe('sign', () => {
    it('should sign a clinical note', async () => {
      const signed = { ...mockNote, status: 'SIGNED', signedAt: new Date() };
      mockClinicalNotesService.sign.mockResolvedValue(signed);

      const result = await controller.sign('note-1', mockUser);

      expect(service.sign).toHaveBeenCalledWith('note-1', 'user-1');
      expect(result.status).toBe('SIGNED');
    });
  });

  describe('createAddendum', () => {
    it('should create an addendum to a clinical note', async () => {
      const dto = { encounterId: 'enc-1', type: 'ADDENDUM', subjective: 'Addendum text' };
      const addendum = { id: 'note-2', parentId: 'note-1', ...dto };
      mockClinicalNotesService.createAddendum.mockResolvedValue(addendum);

      const result = await controller.createAddendum('note-1', mockUser, dto as never);

      expect(service.createAddendum).toHaveBeenCalledWith('note-1', 'user-1', dto);
      expect(result).toEqual(addendum);
    });
  });
});
