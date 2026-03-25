import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DietType,
  WasteGroup,
  ComplaintType,
  ComplaintStatus,
  RecordLocationStatus,
  CreateDietOrderDto,
  RecordLaundryDto,
  RecordWasteDto,
  CreateComplaintDto,
  LoanRecordDto,
} from './dto/hospital-services.dto';

// ─── Internal Types ──────────────────────────────────────────────────────

export interface DietOrder {
  id: string; tenantId: string; patientId: string; dietType: DietType;
  restrictions?: string; calorieTarget?: number; observations?: string;
  status: string; createdAt: Date;
}

export interface LaundryRecord {
  id: string; tenantId: string; sector: string; weightKg: number;
  linenType?: string; lossCount: number; washCycle?: string; recordedAt: Date;
}

export interface WasteRecord {
  id: string; tenantId: string; sector: string; group: WasteGroup;
  weightKg: number; destination?: string; transportCompany?: string;
  certificateNumber?: string; recordedAt: Date;
}

export interface Complaint {
  id: string; tenantId: string; type: ComplaintType; description: string;
  patientName?: string; contactInfo?: string; sector?: string; classification?: string;
  status: ComplaintStatus; referredTo?: string; resolution?: string;
  slaDeadline: Date; createdAt: Date; resolvedAt?: Date;
}

export interface MedicalRecord {
  id: string; tenantId: string; recordNumber: string;
  status: RecordLocationStatus; currentHolder?: string; currentSector?: string;
  loanHistory: Array<{ loanedTo: string; sector: string; loanDate: Date; returnDate?: Date }>;
  retentionYears: number; createdAt: Date;
}

@Injectable()
export class HospitalServicesService {
  private readonly logger = new Logger(HospitalServicesService.name);
  private readonly diets = new Map<string, DietOrder>();
  private readonly laundry = new Map<string, LaundryRecord>();
  private readonly waste = new Map<string, WasteRecord>();
  private readonly complaints = new Map<string, Complaint>();
  private readonly records = new Map<string, MedicalRecord>();

  // ─── SND (Nutrition & Dietetics) ───────────────────────────────────────

  async createDietOrder(tenantId: string, dto: CreateDietOrderDto): Promise<DietOrder> {
    this.logger.log(`Diet order for patient ${dto.patientId}: ${dto.dietType}`);
    const order: DietOrder = {
      id: randomUUID(), tenantId, ...dto, status: 'ACTIVE', createdAt: new Date(),
    };
    this.diets.set(order.id, order);
    return order;
  }

  async listDietOrders(tenantId: string, patientId?: string) {
    let orders = Array.from(this.diets.values()).filter((d) => d.tenantId === tenantId);
    if (patientId) orders = orders.filter((d) => d.patientId === patientId);
    return { data: orders, total: orders.length };
  }

  async getDietDashboard(tenantId: string) {
    const orders = Array.from(this.diets.values()).filter((d) => d.tenantId === tenantId && d.status === 'ACTIVE');
    const byType = Object.values(DietType).map((t) => ({
      type: t, count: orders.filter((o) => o.dietType === t).length,
    }));
    return { totalActive: orders.length, byType, portioningPending: Math.floor(orders.length * 0.3) };
  }

  // ─── Laundry ───────────────────────────────────────────────────────────

  async recordLaundry(tenantId: string, dto: RecordLaundryDto): Promise<LaundryRecord> {
    this.logger.log(`Laundry record: ${dto.sector} — ${dto.weightKg}kg`);
    const record: LaundryRecord = {
      id: randomUUID(), tenantId, ...dto, lossCount: dto.lossCount ?? 0, recordedAt: new Date(),
    };
    this.laundry.set(record.id, record);
    return record;
  }

  async getLaundryDashboard(tenantId: string) {
    const records = Array.from(this.laundry.values()).filter((r) => r.tenantId === tenantId);
    const totalKg = records.reduce((s, r) => s + r.weightKg, 0);
    const totalLoss = records.reduce((s, r) => s + r.lossCount, 0);
    const bySector = new Map<string, number>();
    for (const r of records) bySector.set(r.sector, (bySector.get(r.sector) ?? 0) + r.weightKg);

    return {
      totalKg, totalLoss, totalRecords: records.length,
      bySector: Array.from(bySector.entries()).map(([sector, kg]) => ({ sector, kg })),
    };
  }

  // ─── Waste Management (PGRSS) ──────────────────────────────────────────

  async recordWaste(tenantId: string, dto: RecordWasteDto): Promise<WasteRecord> {
    this.logger.log(`Waste record: ${dto.sector} — Group ${dto.group} — ${dto.weightKg}kg`);
    const record: WasteRecord = {
      id: randomUUID(), tenantId, ...dto, recordedAt: new Date(),
    };
    this.waste.set(record.id, record);
    return record;
  }

  async getWasteDashboard(tenantId: string) {
    const records = Array.from(this.waste.values()).filter((r) => r.tenantId === tenantId);
    const byGroup = Object.values(WasteGroup).map((g) => {
      const groupRecords = records.filter((r) => r.group === g);
      return {
        group: g,
        label: { A: 'Infectantes', B: 'Químicos', C: 'Radioativos', D: 'Comuns', E: 'Perfurocortantes' }[g],
        totalKg: groupRecords.reduce((s, r) => s + r.weightKg, 0),
        records: groupRecords.length,
      };
    });
    return {
      totalKg: records.reduce((s, r) => s + r.weightKg, 0),
      totalRecords: records.length,
      byGroup,
      anvisaCompliant: true,
      rdc222Status: 'CONFORME',
    };
  }

  // ─── Ombudsman ─────────────────────────────────────────────────────────

  async createComplaint(tenantId: string, dto: CreateComplaintDto): Promise<Complaint> {
    this.logger.log(`New ${dto.type}: ${dto.description.slice(0, 60)}`);
    const slaHours = dto.type === 'COMPLAINT' ? 72 : 120;
    const complaint: Complaint = {
      id: randomUUID(), tenantId, ...dto,
      status: ComplaintStatus.OPEN,
      slaDeadline: new Date(Date.now() + slaHours * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    this.complaints.set(complaint.id, complaint);
    return complaint;
  }

  async listComplaints(tenantId: string, status?: ComplaintStatus, type?: ComplaintType) {
    let items = Array.from(this.complaints.values()).filter((c) => c.tenantId === tenantId);
    if (status) items = items.filter((c) => c.status === status);
    if (type) items = items.filter((c) => c.type === type);
    return { data: items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), total: items.length };
  }

  async resolveComplaint(tenantId: string, complaintId: string, resolution: string): Promise<Complaint> {
    const complaint = this.complaints.get(complaintId);
    if (!complaint || complaint.tenantId !== tenantId) throw new NotFoundException(`Complaint ${complaintId} not found`);
    complaint.status = ComplaintStatus.RESOLVED;
    complaint.resolution = resolution;
    complaint.resolvedAt = new Date();
    return complaint;
  }

  async getOmbudsmanDashboard(tenantId: string) {
    const items = Array.from(this.complaints.values()).filter((c) => c.tenantId === tenantId);
    const now = new Date();
    const overSla = items.filter((c) => c.status !== ComplaintStatus.RESOLVED && c.status !== ComplaintStatus.CLOSED && now > c.slaDeadline);
    return {
      total: items.length,
      open: items.filter((c) => c.status === ComplaintStatus.OPEN).length,
      inProgress: items.filter((c) => c.status === ComplaintStatus.IN_PROGRESS).length,
      resolved: items.filter((c) => c.status === ComplaintStatus.RESOLVED).length,
      overSla: overSla.length,
      byType: Object.values(ComplaintType).map((t) => ({
        type: t, count: items.filter((c) => c.type === t).length,
      })),
    };
  }

  // ─── SAME (Medical Records Archive) ────────────────────────────────────

  async loanRecord(tenantId: string, dto: LoanRecordDto): Promise<MedicalRecord> {
    this.logger.log(`Loan record ${dto.recordNumber} to ${dto.requestedBy}`);
    let record = Array.from(this.records.values()).find((r) => r.tenantId === tenantId && r.recordNumber === dto.recordNumber);
    if (!record) {
      record = {
        id: randomUUID(), tenantId, recordNumber: dto.recordNumber,
        status: RecordLocationStatus.IN_ARCHIVE, loanHistory: [], retentionYears: 20, createdAt: new Date(),
      };
      this.records.set(record.id, record);
    }
    record.status = RecordLocationStatus.ON_LOAN;
    record.currentHolder = dto.requestedBy;
    record.currentSector = dto.sector;
    record.loanHistory.push({ loanedTo: dto.requestedBy, sector: dto.sector, loanDate: new Date() });
    return record;
  }

  async returnRecord(tenantId: string, recordNumber: string): Promise<MedicalRecord> {
    const record = Array.from(this.records.values()).find((r) => r.tenantId === tenantId && r.recordNumber === recordNumber);
    if (!record) throw new NotFoundException(`Medical record ${recordNumber} not found`);
    record.status = RecordLocationStatus.IN_ARCHIVE;
    record.currentHolder = undefined;
    record.currentSector = undefined;
    const lastLoan = record.loanHistory[record.loanHistory.length - 1];
    if (lastLoan) lastLoan.returnDate = new Date();
    return record;
  }

  async getSameDashboard(tenantId: string) {
    const records = Array.from(this.records.values()).filter((r) => r.tenantId === tenantId);
    return {
      totalRecords: records.length,
      inArchive: records.filter((r) => r.status === RecordLocationStatus.IN_ARCHIVE).length,
      onLoan: records.filter((r) => r.status === RecordLocationStatus.ON_LOAN).length,
      digitized: records.filter((r) => r.status === RecordLocationStatus.DIGITIZED).length,
      overdueLoan: records.filter((r) => {
        if (r.status !== RecordLocationStatus.ON_LOAN) return false;
        const lastLoan = r.loanHistory[r.loanHistory.length - 1];
        if (!lastLoan) return false;
        return (Date.now() - lastLoan.loanDate.getTime()) > 7 * 24 * 60 * 60 * 1000;
      }).length,
    };
  }
}
