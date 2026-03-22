import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    type: 'ALERT',
    title: 'New Alert',
    body: 'Patient needs attention',
    channel: 'IN_APP',
    readAt: null,
    sentAt: new Date(),
    createdAt: new Date(),
  };

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const dto = {
        userId: 'user-1',
        type: 'ALERT',
        title: 'New Alert',
        body: 'Patient needs attention',
      };

      prisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create('tenant-1', dto as any);

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          tenantId: 'tenant-1',
          type: 'ALERT',
          channel: 'IN_APP',
          sentAt: expect.any(Date),
        }),
      });
    });
  });

  describe('findByUser', () => {
    it('should return paginated results, unread first', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);
      prisma.notification.count.mockResolvedValue(1);

      const pagination = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findByUser('user-1', pagination);

      expect(result.data).toEqual([mockNotification]);
      expect(result.total).toBe(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 10,
        orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('markRead', () => {
    it('should set readAt', async () => {
      const read = { ...mockNotification, readAt: new Date() };
      prisma.notification.update.mockResolvedValue(read);

      const result = await service.markRead('notif-1');

      expect(result.readAt).toBeInstanceOf(Date);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications for user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllRead('user-1');

      expect(result).toEqual({ count: 5 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct count', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ unreadCount: 3 });
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
      });
    });
  });
});
