import { Test, TestingModule } from '@nestjs/testing';
import { NotificationProcessor, NotificationJobData } from './notification.processor';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { Job } from 'bullmq';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
    },
  };

  const mockRealtime = {
    emitNotification: jest.fn(),
  };

  const createMockJob = (data: NotificationJobData): Job<NotificationJobData> =>
    ({ id: 'job-1', data }) as unknown as Job<NotificationJobData>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RealtimeGateway, useValue: mockRealtime },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    jest.clearAllMocks();
  });

  const baseJobData: NotificationJobData = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    channel: 'IN_APP',
    title: 'Test Alert',
    body: 'Test alert body',
    type: 'ALERT',
  };

  describe('IN_APP notifications', () => {
    it('should persist notification and emit via WebSocket', async () => {
      const notification = { id: 'notif-1', ...baseJobData, sentAt: new Date() };
      mockPrisma.notification.create.mockResolvedValue(notification);

      const job = createMockJob(baseJobData);
      await processor.process(job);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          tenantId: 'tenant-1',
          title: 'Test Alert',
          body: 'Test alert body',
          type: 'ALERT',
          channel: 'IN_APP',
          sentAt: expect.any(Date),
        }),
      });
      expect(mockRealtime.emitNotification).toHaveBeenCalledWith('user-1', notification);
    });

    it('should include actionUrl and data when provided', async () => {
      const jobData: NotificationJobData = {
        ...baseJobData,
        actionUrl: '/patients/patient-1',
        data: { patientId: 'patient-1' },
      };
      const notification = { id: 'notif-1', ...jobData };
      mockPrisma.notification.create.mockResolvedValue(notification);

      const job = createMockJob(jobData);
      await processor.process(job);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionUrl: '/patients/patient-1',
          data: { patientId: 'patient-1' },
        }),
      });
    });
  });

  describe('EMAIL notifications', () => {
    it('should handle email notifications without throwing', async () => {
      const job = createMockJob({ ...baseJobData, channel: 'EMAIL' });

      await expect(processor.process(job)).resolves.toBeUndefined();
    });
  });

  describe('PUSH notifications', () => {
    it('should handle push notifications without throwing', async () => {
      const job = createMockJob({ ...baseJobData, channel: 'PUSH' });

      await expect(processor.process(job)).resolves.toBeUndefined();
    });
  });

  describe('SMS notifications', () => {
    it('should handle SMS notifications without throwing', async () => {
      const job = createMockJob({ ...baseJobData, channel: 'SMS' });

      await expect(processor.process(job)).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should re-throw errors from IN_APP handling', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('DB connection lost'));

      const job = createMockJob(baseJobData);

      await expect(processor.process(job)).rejects.toThrow('DB connection lost');
    });
  });
});
