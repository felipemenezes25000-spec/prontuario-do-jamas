import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let service: AppointmentsService;

  const tenantId = 'tenant-1';

  const mockAppointment = {
    id: 'apt-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    scheduledAt: new Date('2026-03-25T10:00:00Z'),
    status: 'SCHEDULED',
    tenantId,
  };

  const mockAppointmentsService = {
    schedule: jest.fn(),
    findAll: jest.fn(),
    getAvailableSlots: jest.fn(),
    findByDoctor: jest.fn(),
    findByPatient: jest.fn(),
    findById: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    reschedule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        { provide: AppointmentsService, useValue: mockAppointmentsService },
      ],
    }).compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
  });

  describe('schedule', () => {
    it('should schedule an appointment', async () => {
      const dto = { patientId: 'patient-1', doctorId: 'doctor-1', scheduledAt: '2026-03-25T10:00:00Z' };
      mockAppointmentsService.schedule.mockResolvedValue(mockAppointment);

      const result = await controller.schedule(tenantId, dto as never);

      expect(service.schedule).toHaveBeenCalledWith(tenantId, dto);
      expect(result).toEqual(mockAppointment);
    });

    it('should propagate scheduling errors', async () => {
      mockAppointmentsService.schedule.mockRejectedValue(new Error('Slot unavailable'));

      await expect(controller.schedule(tenantId, {} as never)).rejects.toThrow('Slot unavailable');
    });
  });

  describe('findAll', () => {
    it('should return paginated appointments', async () => {
      const query = { page: 1, pageSize: 10 };
      const expected = { data: [mockAppointment], total: 1 };
      mockAppointmentsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(tenantId, query as never);

      expect(service.findAll).toHaveBeenCalledWith(tenantId, query);
      expect(result).toEqual(expected);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots for a doctor on a date', async () => {
      const slots = ['09:00', '10:00', '11:00'];
      mockAppointmentsService.getAvailableSlots.mockResolvedValue(slots);

      const result = await controller.getAvailableSlots(tenantId, 'doctor-1', '2026-03-25');

      expect(service.getAvailableSlots).toHaveBeenCalledWith(tenantId, 'doctor-1', '2026-03-25');
      expect(result).toEqual(slots);
    });
  });

  describe('findByDoctor', () => {
    it('should return doctor appointments in date range', async () => {
      mockAppointmentsService.findByDoctor.mockResolvedValue([mockAppointment]);

      const result = await controller.findByDoctor(tenantId, 'doctor-1', '2026-03-01', '2026-03-31');

      expect(service.findByDoctor).toHaveBeenCalledWith(tenantId, 'doctor-1', '2026-03-01', '2026-03-31');
      expect(result).toEqual([mockAppointment]);
    });
  });

  describe('findByPatient', () => {
    it('should return patient appointments', async () => {
      mockAppointmentsService.findByPatient.mockResolvedValue([mockAppointment]);

      const result = await controller.findByPatient('patient-1');

      expect(service.findByPatient).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual([mockAppointment]);
    });
  });

  describe('findById', () => {
    it('should return appointment by ID', async () => {
      mockAppointmentsService.findById.mockResolvedValue(mockAppointment);

      const result = await controller.findById('apt-1');

      expect(service.findById).toHaveBeenCalledWith('apt-1');
      expect(result).toEqual(mockAppointment);
    });

    it('should propagate not found error', async () => {
      mockAppointmentsService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById('missing')).rejects.toThrow('Not found');
    });
  });

  describe('confirm', () => {
    it('should confirm an appointment', async () => {
      const confirmed = { ...mockAppointment, status: 'CONFIRMED' };
      mockAppointmentsService.confirm.mockResolvedValue(confirmed);

      const result = await controller.confirm('apt-1');

      expect(service.confirm).toHaveBeenCalledWith('apt-1');
      expect(result.status).toBe('CONFIRMED');
    });
  });

  describe('cancel', () => {
    it('should cancel an appointment with reason', async () => {
      const cancelled = { ...mockAppointment, status: 'CANCELLED' };
      mockAppointmentsService.cancel.mockResolvedValue(cancelled);

      const result = await controller.cancel('apt-1', 'Patient requested');

      expect(service.cancel).toHaveBeenCalledWith('apt-1', 'Patient requested');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('reschedule', () => {
    it('should reschedule an appointment', async () => {
      const dto = { scheduledAt: '2026-03-26T14:00:00Z' };
      const rescheduled = { ...mockAppointment, scheduledAt: new Date('2026-03-26T14:00:00Z') };
      mockAppointmentsService.reschedule.mockResolvedValue(rescheduled);

      const result = await controller.reschedule('apt-1', dto as never);

      expect(service.reschedule).toHaveBeenCalledWith('apt-1', dto);
      expect(result).toEqual(rescheduled);
    });
  });
});
