import { Injectable } from '@nestjs/common';
import { ProblemListService } from './problem-list.service';
import { HomeMedicationsService } from './home-medications.service';
import { ClinicalTimelineService } from './clinical-timeline.service';
import { ObstetricHistoryService } from './obstetric-history.service';
import { TransfusionHistoryService } from './transfusion-history.service';
import { ImplantedDevicesService } from './implanted-devices.service';
import { CreateProblemDto, UpdateProblemDto, ProblemStatus } from './dto/problem-list.dto';
import { CreateHomeMedicationDto, HomeMedStatus } from './dto/home-medications.dto';
import { ClinicalTimelineQueryDto } from './dto/clinical-timeline.dto';

/**
 * Facade service that delegates to the specialized sub-services.
 * Provides a unified API for the /clinical-history/:patientId/* routes.
 */
@Injectable()
export class ClinicalHistoryService {
  constructor(
    private readonly problemList: ProblemListService,
    private readonly homeMedications: HomeMedicationsService,
    private readonly timeline: ClinicalTimelineService,
    private readonly obstetricHistory: ObstetricHistoryService,
    private readonly transfusionHistory: TransfusionHistoryService,
    private readonly implantedDevices: ImplantedDevicesService,
  ) {}

  // ─── Problems ──────────────────────────────────────────────────────────

  async getProblems(tenantId: string, patientId: string, status?: ProblemStatus) {
    return this.problemList.findAll(tenantId, patientId, status);
  }

  async addProblem(tenantId: string, patientId: string, dto: CreateProblemDto, authorId: string) {
    return this.problemList.create(tenantId, patientId, dto, authorId);
  }

  async updateProblem(tenantId: string, patientId: string, problemId: string, dto: UpdateProblemDto) {
    return this.problemList.update(tenantId, patientId, problemId, dto);
  }

  // ─── Medications ───────────────────────────────────────────────────────

  async getMedications(tenantId: string, patientId: string, status?: HomeMedStatus) {
    return this.homeMedications.findAll(tenantId, patientId, status);
  }

  async addMedication(tenantId: string, patientId: string, dto: CreateHomeMedicationDto, authorId: string) {
    return this.homeMedications.create(tenantId, patientId, dto, authorId);
  }

  // ─── Timeline ──────────────────────────────────────────────────────────

  async getTimeline(tenantId: string, patientId: string, query: Partial<ClinicalTimelineQueryDto>) {
    const timelineQuery: ClinicalTimelineQueryDto = {
      from: query.from,
      to: query.to,
      limit: query.limit ?? 100,
      offset: 0,
    };
    return this.timeline.getTimeline(tenantId, patientId, timelineQuery);
  }

  // ─── Obstetric History ─────────────────────────────────────────────────

  async getObstetricHistory(tenantId: string, patientId: string) {
    return this.obstetricHistory.findOne(tenantId, patientId);
  }

  // ─── Transfusion History ───────────────────────────────────────────────

  async getTransfusions(tenantId: string, patientId: string) {
    return this.transfusionHistory.findAll(tenantId, patientId);
  }

  // ─── Implanted Devices ─────────────────────────────────────────────────

  async getDevices(tenantId: string, patientId: string) {
    return this.implantedDevices.findAll(tenantId, patientId, false);
  }
}
