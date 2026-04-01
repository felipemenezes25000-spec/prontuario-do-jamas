import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;

  const mockEntry = {
    id: 'bill-1',
    encounterId: 'enc-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    insuranceProvider: 'SUS',
    planType: 'BASIC',
    guideNumber: 'G-001',
    guideType: 'SP_SADT',
    status: 'PENDING',
    totalAmount: 1500.0,
    submittedAt: null,
    approvedAt: null,
    paidAt: null,
    createdAt: new Date(),
    encounter: { id: 'enc-1', type: 'OUTPATIENT', status: 'COMPLETED', createdAt: new Date() },
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-001' },
  };

  const mockPrisma = {
    billingEntry: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a billing entry', async () => {
      const dto = {
        encounterId: 'enc-1',
        patientId: 'patient-1',
        insuranceProvider: 'SUS',
        planType: 'BASIC',
        guideNumber: 'G-001',
        guideType: 'SP_SADT',
        totalAmount: 1500.0,
      };

      prisma.billingEntry.create.mockResolvedValue(mockEntry);

      const result = await service.create('tenant-1', dto as any);

      expect(result).toEqual(mockEntry);
      expect(prisma.billingEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          patientId: 'patient-1',
          totalAmount: 1500.0,
        }),
      });
    });
  });

  describe('findByTenant', () => {
    it('should return paginated results', async () => {
      prisma.billingEntry.findMany.mockResolvedValue([mockEntry]);
      prisma.billingEntry.count.mockResolvedValue(1);

      const pagination = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findByTenant('tenant-1', pagination);

      expect(result.data).toEqual([mockEntry]);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should change status and set submittedAt for SUBMITTED', async () => {
      prisma.billingEntry.findFirst.mockResolvedValue(mockEntry);
      prisma.billingEntry.update.mockResolvedValue({
        ...mockEntry,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      });

      await service.updateStatus('tenant-1', 'bill-1', 'SUBMITTED' as any);

      expect(prisma.billingEntry.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: {
          status: 'SUBMITTED',
          submittedAt: expect.any(Date),
        },
      });
    });

    it('should set approvedAt for APPROVED status', async () => {
      prisma.billingEntry.findFirst.mockResolvedValue(mockEntry);
      prisma.billingEntry.update.mockResolvedValue({});

      await service.updateStatus('tenant-1', 'bill-1', 'APPROVED' as any);

      expect(prisma.billingEntry.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: {
          status: 'APPROVED',
          approvedAt: expect.any(Date),
        },
      });
    });

    it('should set paidAt for PAID status', async () => {
      prisma.billingEntry.findFirst.mockResolvedValue(mockEntry);
      prisma.billingEntry.update.mockResolvedValue({});

      await service.updateStatus('tenant-1', 'bill-1', 'PAID' as any);

      expect(prisma.billingEntry.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: {
          status: 'PAID',
          paidAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      prisma.billingEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus('tenant-1', 'nonexistent', 'SUBMITTED' as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateSummary', () => {
    it('should return totals grouped by status', async () => {
      const entries = [
        { status: 'PENDING', totalAmount: 1000 },
        { status: 'SUBMITTED', totalAmount: 2000 },
        { status: 'APPROVED', totalAmount: 1500 },
        { status: 'DENIED', totalAmount: 500 },
        { status: 'PAID', totalAmount: 3000 },
        { status: 'PARTIALLY_APPROVED', totalAmount: 800 },
      ];

      prisma.billingEntry.findMany.mockResolvedValue(entries);

      const result = await service.generateSummary('tenant-1');

      expect(result.totalEntries).toBe(6);
      expect(result.pending).toBe(1);
      expect(result.submitted).toBe(1);
      expect(result.approved).toBe(2); // APPROVED + PARTIALLY_APPROVED
      expect(result.denied).toBe(1);
      expect(result.paid).toBe(1);
      expect(result.totalBilled).toBe(8800);
      expect(result.totalApproved).toBe(2300); // 1500 + 800
      expect(result.totalPaid).toBe(3000);
    });

    it('should handle empty entries', async () => {
      prisma.billingEntry.findMany.mockResolvedValue([]);

      const result = await service.generateSummary('tenant-1');

      expect(result.totalEntries).toBe(0);
      expect(result.totalBilled).toBe(0);
    });
  });
});
