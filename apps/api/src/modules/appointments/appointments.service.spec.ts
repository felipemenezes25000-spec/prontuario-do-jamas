import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: any;

  const mockAppointment = {
    id: 'appt-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    doctorId: 'doc-1',
    type: 'CONSULTATION',
    scheduledAt: new Date('2026-03-25T10:00:00Z'),
    duration: 30,
    status: 'SCHEDULED',
    location: 'Room 101',
    room: '101',
    confirmedAt: null,
    cancellationReason: null,
    createdAt: new Date(),
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-001', phone: '11999999999', email: 'maria@test.com' },
    doctor: { id: 'doc-1', name: 'Dr. Silva', email: 'doc@test.com' },
  };

  const mockPrisma = {
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    professionalSchedule: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('schedule', () => {
    it('should schedule an appointment', async () => {
      const dto = {
        patientId: 'patient-1',
        doctorId: 'doc-1',
        type: 'CONSULTATION',
        scheduledAt: '2026-03-25T10:00:00Z',
        duration: 30,
        location: 'Room 101',
      };

      prisma.appointment.create.mockResolvedValue(mockAppointment);

      const result = await service.schedule('tenant-1', dto as any);

      expect(result).toEqual(mockAppointment);
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          patientId: 'patient-1',
          doctorId: 'doc-1',
          scheduledAt: expect.any(Date),
          duration: 30,
        }),
      });
    });
  });

  describe('findByDoctor', () => {
    it('should filter by doctor and date range', async () => {
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);

      const result = await service.findByDoctor(
        'tenant-1',
        'doc-1',
        '2026-03-25',
        '2026-03-26',
      );

      expect(result).toEqual([mockAppointment]);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          doctorId: 'doc-1',
          scheduledAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true, phone: true } },
        },
      });
    });
  });

  describe('confirm', () => {
    it('should set confirmedAt and status CONFIRMED', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      const confirmed = {
        ...mockAppointment,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      };
      prisma.appointment.update.mockResolvedValue(confirmed);

      const result = await service.confirm('appt-1');

      expect(result.status).toBe('CONFIRMED');
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: {
          status: 'CONFIRMED',
          confirmedAt: expect.any(Date),
        },
      });
    });
  });

  describe('cancel', () => {
    it('should set status CANCELLED and reason', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      const cancelled = {
        ...mockAppointment,
        status: 'CANCELLED',
        cancellationReason: 'Patient request',
      };
      prisma.appointment.update.mockResolvedValue(cancelled);

      const result = await service.cancel('appt-1', 'Patient request');

      expect(result.status).toBe('CANCELLED');
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'Patient request',
        },
      });
    });
  });

  describe('reschedule', () => {
    it('should update appointment with new time and status RESCHEDULED', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      const rescheduled = {
        ...mockAppointment,
        scheduledAt: new Date('2026-03-26T14:00:00Z'),
        status: 'RESCHEDULED',
      };
      prisma.appointment.update.mockResolvedValue(rescheduled);

      const result = await service.reschedule('appt-1', {
        scheduledAt: '2026-03-26T14:00:00Z',
      } as any);

      expect(result.status).toBe('RESCHEDULED');
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: expect.objectContaining({
          scheduledAt: expect.any(Date),
          status: 'RESCHEDULED',
        }),
      });
    });

    it('should throw BadRequestException if scheduledAt is missing', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      await expect(
        service.reschedule('appt-1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return open time slots', async () => {
      const schedule = {
        professionalId: 'doc-1',
        dayOfWeek: 3,
        startTime: '08:00',
        endTime: '12:00',
        slotDuration: 30,
        breakStart: null,
        breakEnd: null,
      };

      prisma.professionalSchedule.findMany.mockResolvedValue([schedule]);
      prisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots(
        'tenant-1',
        'doc-1',
        '2026-03-25',
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('startTime');
      expect(result[0]).toHaveProperty('endTime');
    });

    it('should return empty array if no schedule found', async () => {
      prisma.professionalSchedule.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots(
        'tenant-1',
        'doc-1',
        '2026-03-25',
      );

      expect(result).toEqual([]);
    });

    it('should exclude occupied slots', async () => {
      const schedule = {
        professionalId: 'doc-1',
        dayOfWeek: 3,
        startTime: '08:00',
        endTime: '09:00',
        slotDuration: 30,
        breakStart: null,
        breakEnd: null,
      };

      // Build the appointment time to match the slot generation (local time)
      const slotDate = new Date('2026-03-25');
      slotDate.setHours(8, 0, 0, 0);

      const existingAppt = {
        scheduledAt: slotDate,
        duration: 30,
      };

      prisma.professionalSchedule.findMany.mockResolvedValue([schedule]);
      prisma.appointment.findMany.mockResolvedValue([existingAppt]);

      const result = await service.getAvailableSlots(
        'tenant-1',
        'doc-1',
        '2026-03-25',
      );

      // The 08:00-08:30 slot is occupied, only 08:30-09:00 should be available
      expect(result.length).toBe(1);
    });
  });
});
