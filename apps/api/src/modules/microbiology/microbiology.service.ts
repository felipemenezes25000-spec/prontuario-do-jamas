import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegisterCultureDto,
  UpdateCultureStatusDto,
  RecordIsolateDto,
  RecordAstResultDto,
  GetInstitutionalAntibiogramDto,
  CultureStatus,
  AstInterpretation,
} from './dto/microbiology.dto';

// ─── In-memory interfaces ────────────────────────────────────────────────────

export interface AstEntry {
  antibiotic: string;
  mic: number | null;
  interpretation: string;
}

export interface MicroIsolate {
  id: string;
  cultureId: string;
  organism: string;
  colonyCount: string | null;
  gramStain: string | null;
  morphology: string | null;
  astResults: {
    method: string;
    antibiotics: AstEntry[];
  } | null;
  resistanceMechanisms: string[];
  createdAt: Date;
}

export interface MicroCulture {
  id: string;
  barcode: string;
  patientId: string;
  encounterId: string | null;
  sampleType: string;
  sampleSite: string;
  collectedAt: Date;
  clinicalIndication: string;
  priority: string;
  status: string;
  isolates: MicroIsolate[];
  tenantId: string;
  requestedById: string;
  documentId: string | null;
  statusHistory: Array<{ status: string; timestamp: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MicrobiologyService {
  private cultures: MicroCulture[] = [];
  private barcodeCounter = 1000;

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private generateBarcode(): string {
    this.barcodeCounter++;
    return `MICRO-${new Date().getFullYear()}-${String(this.barcodeCounter).padStart(6, '0')}`;
  }

  private findCulture(tenantId: string, cultureId: string): MicroCulture {
    const culture = this.cultures.find(
      (c) => c.id === cultureId && c.tenantId === tenantId,
    );
    if (!culture) {
      throw new NotFoundException(`Culture "${cultureId}" not found`);
    }
    return culture;
  }

  private findIsolate(tenantId: string, isolateId: string): { culture: MicroCulture; isolate: MicroIsolate } {
    for (const culture of this.cultures) {
      if (culture.tenantId !== tenantId) continue;
      const isolate = culture.isolates.find((i) => i.id === isolateId);
      if (isolate) {
        return { culture, isolate };
      }
    }
    throw new NotFoundException(`Isolate "${isolateId}" not found`);
  }

  // ─── 1. Register Culture ─────────────────────────────────────────────────

  async registerCulture(tenantId: string, userId: string, dto: RegisterCultureDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const barcode = this.generateBarcode();

    // Persist as ClinicalDocument
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId ?? null,
        authorId: userId,
        type: 'CUSTOM',
        title: `[MICRO] Culture - ${dto.sampleType} - ${dto.sampleSite}`,
        content: JSON.stringify({
          barcode,
          sampleType: dto.sampleType,
          sampleSite: dto.sampleSite,
          collectedAt: dto.collectedAt,
          clinicalIndication: dto.clinicalIndication,
          priority: dto.priority,
          status: CultureStatus.RECEIVED,
          isolates: [],
        }),
        status: 'DRAFT',
        generatedByAI: false,
      },
    });

    const culture: MicroCulture = {
      id: crypto.randomUUID(),
      barcode,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      sampleType: dto.sampleType,
      sampleSite: dto.sampleSite,
      collectedAt: new Date(dto.collectedAt),
      clinicalIndication: dto.clinicalIndication,
      priority: dto.priority,
      status: CultureStatus.RECEIVED,
      isolates: [],
      tenantId,
      requestedById: userId,
      documentId: doc.id,
      statusHistory: [{ status: CultureStatus.RECEIVED, timestamp: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.cultures.push(culture);

    return {
      id: culture.id,
      barcode: culture.barcode,
      patientId: culture.patientId,
      sampleType: culture.sampleType,
      sampleSite: culture.sampleSite,
      status: culture.status,
      priority: culture.priority,
      documentId: doc.id,
      createdAt: culture.createdAt,
    };
  }

  // ─── 2. Update Culture Status ────────────────────────────────────────────

  async updateCultureStatus(tenantId: string, cultureId: string, dto: UpdateCultureStatusDto) {
    const culture = this.findCulture(tenantId, cultureId);

    culture.status = dto.status;
    culture.statusHistory.push({ status: dto.status, timestamp: new Date() });
    culture.updatedAt = new Date();

    // Update the ClinicalDocument content
    if (culture.documentId) {
      const doc = await this.prisma.clinicalDocument.findUnique({
        where: { id: culture.documentId },
      });
      if (doc) {
        const content = typeof doc.content === 'string'
          ? JSON.parse(doc.content) as Record<string, unknown>
          : (doc.content as unknown as Record<string, unknown>) ?? {};
        content['status'] = dto.status;
        content['statusHistory'] = culture.statusHistory;

        await this.prisma.clinicalDocument.update({
          where: { id: culture.documentId },
          data: {
            content: JSON.stringify(content),
            status: dto.status === CultureStatus.FINAL ? 'FINAL' : 'DRAFT',
          },
        });
      }
    }

    return {
      id: culture.id,
      status: culture.status,
      statusHistory: culture.statusHistory,
      updatedAt: culture.updatedAt,
    };
  }

  // ─── 3. Record Isolate ───────────────────────────────────────────────────

  async recordIsolate(tenantId: string, dto: RecordIsolateDto) {
    const culture = this.findCulture(tenantId, dto.cultureId);

    if (culture.status === CultureStatus.FINAL || culture.status === CultureStatus.CANCELLED) {
      throw new BadRequestException(`Cannot add isolate to a culture with status "${culture.status}"`);
    }

    const isolate: MicroIsolate = {
      id: crypto.randomUUID(),
      cultureId: dto.cultureId,
      organism: dto.organism,
      colonyCount: dto.colonyCount ?? null,
      gramStain: dto.gramStain ?? null,
      morphology: dto.morphology ?? null,
      astResults: null,
      resistanceMechanisms: [],
      createdAt: new Date(),
    };

    culture.isolates.push(isolate);

    // Auto-update status to GROWTH_DETECTED if still incubating
    if (culture.status === CultureStatus.INCUBATING || culture.status === CultureStatus.RECEIVED) {
      culture.status = CultureStatus.GROWTH_DETECTED;
      culture.statusHistory.push({ status: CultureStatus.GROWTH_DETECTED, timestamp: new Date() });
    }

    culture.updatedAt = new Date();
    await this.syncDocumentContent(culture);

    return {
      id: isolate.id,
      cultureId: isolate.cultureId,
      organism: isolate.organism,
      colonyCount: isolate.colonyCount,
      gramStain: isolate.gramStain,
      morphology: isolate.morphology,
      cultureStatus: culture.status,
    };
  }

  // ─── 4. Record AST Result ───────────────────────────────────────────────

  async recordAstResult(tenantId: string, dto: RecordAstResultDto) {
    const { culture, isolate } = this.findIsolate(tenantId, dto.isolateId);

    isolate.astResults = {
      method: dto.method,
      antibiotics: dto.antibiotics.map((a) => ({
        antibiotic: a.antibiotic,
        mic: a.mic ?? null,
        interpretation: a.interpretation,
      })),
    };

    // Auto-detect resistance mechanisms
    isolate.resistanceMechanisms = this.detectResistancePatterns(
      isolate.organism,
      dto.antibiotics,
    );

    culture.updatedAt = new Date();
    await this.syncDocumentContent(culture);

    return {
      isolateId: isolate.id,
      organism: isolate.organism,
      method: dto.method,
      antibioticsCount: dto.antibiotics.length,
      resistantCount: dto.antibiotics.filter(
        (a) => a.interpretation === AstInterpretation.RESISTANT,
      ).length,
      sensitiveCount: dto.antibiotics.filter(
        (a) => a.interpretation === AstInterpretation.SENSITIVE,
      ).length,
      resistanceMechanisms: isolate.resistanceMechanisms,
    };
  }

  // ─── 5. Detect Resistance Mechanisms ─────────────────────────────────────

  detectResistanceMechanisms(tenantId: string, isolateId: string) {
    const { isolate } = this.findIsolate(tenantId, isolateId);

    if (!isolate.astResults) {
      return {
        isolateId: isolate.id,
        organism: isolate.organism,
        mechanisms: [],
        message: 'No AST results available for resistance analysis',
      };
    }

    const mechanisms = this.detectResistancePatterns(
      isolate.organism,
      isolate.astResults.antibiotics.map((a) => ({
        antibiotic: a.antibiotic,
        interpretation: a.interpretation as AstInterpretation,
      })),
    );

    isolate.resistanceMechanisms = mechanisms;

    return {
      isolateId: isolate.id,
      organism: isolate.organism,
      mechanisms,
      alert: mechanisms.length > 0,
      message: mechanisms.length > 0
        ? `ALERTA: ${mechanisms.length} mecanismo(s) de resistencia detectado(s)`
        : 'Nenhum mecanismo de resistencia detectado',
    };
  }

  private detectResistancePatterns(
    organism: string,
    antibiotics: Array<{ antibiotic: string; interpretation: AstInterpretation | string }>,
  ): string[] {
    const mechanisms: string[] = [];
    const resistantSet = new Set(
      antibiotics
        .filter((a) => a.interpretation === AstInterpretation.RESISTANT)
        .map((a) => a.antibiotic.toLowerCase()),
    );

    // MRSA: Staphylococcus + oxacillin resistant
    if (
      organism.toLowerCase().includes('staphylococcus') &&
      resistantSet.has('oxacillin')
    ) {
      mechanisms.push('MRSA (Methicillin-Resistant Staphylococcus aureus)');
    }

    // ESBL: ceftriaxone R + ceftazidime R
    if (resistantSet.has('ceftriaxone') && resistantSet.has('ceftazidime')) {
      mechanisms.push('ESBL (Extended-Spectrum Beta-Lactamase)');
    }

    // KPC: meropenem R
    if (resistantSet.has('meropenem')) {
      mechanisms.push('KPC (Klebsiella pneumoniae Carbapenemase) — suspected carbapenemase');
    }

    // VRE: Enterococcus + vancomycin R
    if (
      organism.toLowerCase().includes('enterococcus') &&
      resistantSet.has('vancomycin')
    ) {
      mechanisms.push('VRE (Vancomycin-Resistant Enterococcus)');
    }

    // Additional: AmpC if cefoxitin R in Gram-negatives
    if (
      resistantSet.has('cefoxitin') &&
      !organism.toLowerCase().includes('staphylococcus')
    ) {
      mechanisms.push('AmpC Beta-Lactamase (suspected)');
    }

    return mechanisms;
  }

  // ─── 6. Get Culture Result ───────────────────────────────────────────────

  async getCultureResult(tenantId: string, cultureId: string) {
    const culture = this.findCulture(tenantId, cultureId);

    return {
      id: culture.id,
      barcode: culture.barcode,
      patientId: culture.patientId,
      encounterId: culture.encounterId,
      sampleType: culture.sampleType,
      sampleSite: culture.sampleSite,
      collectedAt: culture.collectedAt,
      clinicalIndication: culture.clinicalIndication,
      priority: culture.priority,
      status: culture.status,
      statusHistory: culture.statusHistory,
      isolates: culture.isolates.map((isolate) => ({
        id: isolate.id,
        organism: isolate.organism,
        colonyCount: isolate.colonyCount,
        gramStain: isolate.gramStain,
        morphology: isolate.morphology,
        astResults: isolate.astResults,
        resistanceMechanisms: isolate.resistanceMechanisms,
      })),
      totalIsolates: culture.isolates.length,
      hasResistance: culture.isolates.some((i) => i.resistanceMechanisms.length > 0),
      documentId: culture.documentId,
      createdAt: culture.createdAt,
      updatedAt: culture.updatedAt,
    };
  }

  // ─── 7. Institutional Antibiogram ────────────────────────────────────────

  async getInstitutionalAntibiogram(tenantId: string, dto: GetInstitutionalAntibiogramDto) {
    const periodMonths = dto.period ? parseInt(dto.period, 10) : 6;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - periodMonths);

    let filtered = this.cultures.filter(
      (c) =>
        c.tenantId === tenantId &&
        c.createdAt >= cutoff &&
        (c.status === CultureStatus.FINAL || c.status === CultureStatus.PRELIMINARY),
    );

    if (dto.ward) {
      // ward filter would match on encounter data; for now filter by sampleSite as proxy
      filtered = filtered.filter((c) =>
        c.sampleSite.toLowerCase().includes(dto.ward!.toLowerCase()),
      );
    }

    // Aggregate: organism -> antibiotic -> { tested, sensitive }
    const aggregation: Record<string, Record<string, { tested: number; sensitive: number }>> = {};

    for (const culture of filtered) {
      for (const isolate of culture.isolates) {
        if (dto.organisms && dto.organisms.length > 0) {
          const match = dto.organisms.some((o) =>
            isolate.organism.toLowerCase().includes(o.toLowerCase()),
          );
          if (!match) continue;
        }

        if (!isolate.astResults) continue;

        if (!aggregation[isolate.organism]) {
          aggregation[isolate.organism] = {};
        }

        for (const abx of isolate.astResults.antibiotics) {
          if (abx.interpretation === AstInterpretation.NOT_TESTED) continue;

          if (!aggregation[isolate.organism][abx.antibiotic]) {
            aggregation[isolate.organism][abx.antibiotic] = { tested: 0, sensitive: 0 };
          }

          aggregation[isolate.organism][abx.antibiotic].tested++;
          if (abx.interpretation === AstInterpretation.SENSITIVE) {
            aggregation[isolate.organism][abx.antibiotic].sensitive++;
          }
        }
      }
    }

    // Build antibiogram table
    const antibiogram = Object.entries(aggregation).map(([organism, antibiotics]) => ({
      organism,
      antibiotics: Object.entries(antibiotics).map(([antibiotic, stats]) => ({
        antibiotic,
        tested: stats.tested,
        sensitive: stats.sensitive,
        resistant: stats.tested - stats.sensitive,
        sensitivityPercent:
          stats.tested > 0
            ? Math.round((stats.sensitive / stats.tested) * 10000) / 100
            : 0,
      })),
    }));

    return {
      period: {
        from: cutoff.toISOString(),
        to: new Date().toISOString(),
        months: periodMonths,
      },
      totalCultures: filtered.length,
      totalIsolates: filtered.reduce((sum, c) => sum + c.isolates.length, 0),
      antibiogram,
    };
  }

  // ─── 8. Pending Cultures ─────────────────────────────────────────────────

  async getPendingCultures(tenantId: string) {
    const pending = this.cultures.filter(
      (c) =>
        c.tenantId === tenantId &&
        c.status !== CultureStatus.FINAL &&
        c.status !== CultureStatus.CANCELLED &&
        c.status !== CultureStatus.NO_GROWTH,
    );

    return {
      total: pending.length,
      cultures: pending
        .sort((a, b) => {
          // STAT first, then URGENT, then ROUTINE
          const priorityOrder: Record<string, number> = { STAT: 0, URGENT: 1, ROUTINE: 2 };
          const pa = priorityOrder[a.priority] ?? 2;
          const pb = priorityOrder[b.priority] ?? 2;
          if (pa !== pb) return pa - pb;
          return a.createdAt.getTime() - b.createdAt.getTime();
        })
        .map((c) => ({
          id: c.id,
          barcode: c.barcode,
          patientId: c.patientId,
          sampleType: c.sampleType,
          sampleSite: c.sampleSite,
          priority: c.priority,
          status: c.status,
          isolateCount: c.isolates.length,
          hasResistance: c.isolates.some((i) => i.resistanceMechanisms.length > 0),
          collectedAt: c.collectedAt,
          createdAt: c.createdAt,
          ageHours: Math.round((Date.now() - c.collectedAt.getTime()) / 3_600_000 * 10) / 10,
        })),
    };
  }

  // ─── 9. Patient Micro History ────────────────────────────────────────────

  async getPatientMicroHistory(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    const patientCultures = this.cultures
      .filter((c) => c.patientId === patientId && c.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const allOrganisms = new Set<string>();
    const allResistance = new Set<string>();

    for (const culture of patientCultures) {
      for (const isolate of culture.isolates) {
        allOrganisms.add(isolate.organism);
        for (const mech of isolate.resistanceMechanisms) {
          allResistance.add(mech);
        }
      }
    }

    return {
      patientId,
      patientName: patient.fullName,
      totalCultures: patientCultures.length,
      uniqueOrganisms: Array.from(allOrganisms),
      resistanceMechanisms: Array.from(allResistance),
      cultures: patientCultures.map((c) => ({
        id: c.id,
        barcode: c.barcode,
        sampleType: c.sampleType,
        sampleSite: c.sampleSite,
        status: c.status,
        priority: c.priority,
        isolates: c.isolates.map((i) => ({
          organism: i.organism,
          gramStain: i.gramStain,
          resistanceMechanisms: i.resistanceMechanisms,
          hasAst: i.astResults !== null,
        })),
        collectedAt: c.collectedAt,
        createdAt: c.createdAt,
      })),
    };
  }

  // ─── Sync helper ─────────────────────────────────────────────────────────

  private async syncDocumentContent(culture: MicroCulture): Promise<void> {
    if (!culture.documentId) return;

    await this.prisma.clinicalDocument.update({
      where: { id: culture.documentId },
      data: {
        content: JSON.stringify({
          barcode: culture.barcode,
          sampleType: culture.sampleType,
          sampleSite: culture.sampleSite,
          collectedAt: culture.collectedAt,
          clinicalIndication: culture.clinicalIndication,
          priority: culture.priority,
          status: culture.status,
          isolates: culture.isolates.map((i) => ({
            id: i.id,
            organism: i.organism,
            colonyCount: i.colonyCount,
            gramStain: i.gramStain,
            morphology: i.morphology,
            astResults: i.astResults,
            resistanceMechanisms: i.resistanceMechanisms,
          })),
        }),
        status: culture.status === CultureStatus.FINAL ? 'FINAL' : 'DRAFT',
      },
    });
  }
}
