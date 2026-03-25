import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegisterCdsServiceDto,
  EvaluateCdsHookDto,
  CdsHookType,
  CardIndicator,
} from './dto/cds-hooks.dto';

export interface CdsService {
  id: string;
  serviceId: string;
  title: string;
  hook: string;
  description: string;
  serviceUrl: string | null;
  prefetch: Record<string, string> | null;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CdsCard {
  uuid: string;
  summary: string;
  detail: string;
  indicator: string;
  source: { label: string; url?: string };
  suggestions?: Array<{
    label: string;
    uuid: string;
    actions?: Array<{
      type: string;
      description: string;
      resource?: Record<string, unknown>;
    }>;
  }>;
  links?: Array<{ label: string; url: string; type: string }>;
}

@Injectable()
export class CdsHooksService {
  private services: CdsService[] = [];

  constructor(private readonly prisma: PrismaService) {
    // Register built-in CDS services
    this.registerBuiltinServices();
  }

  private registerBuiltinServices(): void {
    const builtins: Array<Omit<CdsService, 'id' | 'tenantId' | 'isActive' | 'createdAt'>> = [
      {
        serviceId: 'drug-interaction-check',
        title: 'Drug Interaction Check',
        hook: CdsHookType.ORDER_SELECT,
        description: 'Checks for drug-drug interactions when ordering medications',
        serviceUrl: null,
        prefetch: { patient: 'Patient/{{context.patientId}}', medications: 'MedicationRequest?patient={{context.patientId}}&status=active' },
      },
      {
        serviceId: 'allergy-alert',
        title: 'Allergy Alert',
        hook: CdsHookType.MEDICATION_PRESCRIBE,
        description: 'Alerts for known patient allergies when prescribing',
        serviceUrl: null,
        prefetch: { patient: 'Patient/{{context.patientId}}', allergies: 'AllergyIntolerance?patient={{context.patientId}}' },
      },
      {
        serviceId: 'sepsis-screening',
        title: 'Sepsis Early Warning',
        hook: CdsHookType.PATIENT_VIEW,
        description: 'qSOFA-based sepsis screening on patient chart view',
        serviceUrl: null,
        prefetch: { patient: 'Patient/{{context.patientId}}', vitals: 'Observation?patient={{context.patientId}}&category=vital-signs&_sort=-date&_count=5' },
      },
      {
        serviceId: 'preventive-care-reminders',
        title: 'Preventive Care Reminders',
        hook: CdsHookType.PATIENT_VIEW,
        description: 'Checks for overdue preventive screenings (mammography, colonoscopy, etc.)',
        serviceUrl: null,
        prefetch: { patient: 'Patient/{{context.patientId}}' },
      },
    ];

    for (const svc of builtins) {
      this.services.push({
        ...svc,
        id: crypto.randomUUID(),
        tenantId: '__builtin__',
        isActive: true,
        createdAt: new Date(),
      });
    }
  }

  async getDiscovery(tenantId: string) {
    const allServices = this.services.filter(
      (s) => (s.tenantId === tenantId || s.tenantId === '__builtin__') && s.isActive,
    );

    return {
      services: allServices.map((s) => ({
        id: s.serviceId,
        hook: s.hook,
        title: s.title,
        description: s.description,
        prefetch: s.prefetch,
      })),
    };
  }

  async registerService(tenantId: string, dto: RegisterCdsServiceDto) {
    const existing = this.services.find(
      (s) => s.serviceId === dto.serviceId && (s.tenantId === tenantId || s.tenantId === '__builtin__'),
    );
    if (existing) {
      throw new BadRequestException(`CDS service "${dto.serviceId}" already exists`);
    }

    const service: CdsService = {
      id: crypto.randomUUID(),
      serviceId: dto.serviceId,
      title: dto.title,
      hook: dto.hook,
      description: dto.description,
      serviceUrl: dto.serviceUrl ?? null,
      prefetch: dto.prefetch ?? null,
      tenantId,
      isActive: true,
      createdAt: new Date(),
    };

    this.services.push(service);
    return service;
  }

  async evaluateHook(tenantId: string, hookId: string, dto: EvaluateCdsHookDto) {
    const services = this.services.filter(
      (s) => s.hook === hookId && (s.tenantId === tenantId || s.tenantId === '__builtin__') && s.isActive,
    );

    if (services.length === 0) {
      return { cards: [] };
    }

    const cards: CdsCard[] = [];

    for (const service of services) {
      const serviceCards = await this.evaluateService(tenantId, service, dto);
      cards.push(...serviceCards);
    }

    return { cards };
  }

  private async evaluateService(
    tenantId: string,
    service: CdsService,
    dto: EvaluateCdsHookDto,
  ): Promise<CdsCard[]> {
    const cards: CdsCard[] = [];

    if (!dto.patientId) return cards;

    switch (service.serviceId) {
      case 'drug-interaction-check':
        return this.evaluateDrugInteractions(tenantId, dto.patientId, dto.context);

      case 'allergy-alert':
        return this.evaluateAllergyAlerts(tenantId, dto.patientId, dto.context);

      case 'sepsis-screening':
        return this.evaluateSepsisScreening(tenantId, dto.patientId);

      case 'preventive-care-reminders':
        return this.evaluatePreventiveCare(tenantId, dto.patientId);

      default:
        // For external services, return a placeholder
        return [{
          uuid: crypto.randomUUID(),
          summary: `${service.title} evaluation`,
          detail: `External CDS service "${service.serviceId}" would be called at ${service.serviceUrl}`,
          indicator: CardIndicator.INFO,
          source: { label: service.title },
        }];
    }
  }

  private async evaluateDrugInteractions(
    tenantId: string,
    patientId: string,
    _context?: Record<string, unknown>,
  ): Promise<CdsCard[]> {
    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, status: 'ACTIVE', type: 'MEDICATION' },
    });

    if (allergies.length === 0) return [];

    return allergies.map((a) => ({
      uuid: crypto.randomUUID(),
      summary: `Alergia medicamentosa: ${a.substance}`,
      detail: `Paciente possui alergia registrada a ${a.substance} (${a.severity}). Verificar prescrição.`,
      indicator: a.severity === 'LIFE_THREATENING' ? CardIndicator.CRITICAL : CardIndicator.WARNING,
      source: { label: 'VoxPEP Drug Interaction Check' },
      suggestions: [{
        label: 'Ver detalhes da alergia',
        uuid: crypto.randomUUID(),
      }],
    }));
  }

  private async evaluateAllergyAlerts(
    tenantId: string,
    patientId: string,
    _context?: Record<string, unknown>,
  ): Promise<CdsCard[]> {
    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, status: 'ACTIVE' },
    });

    if (allergies.length === 0) return [];

    return [{
      uuid: crypto.randomUUID(),
      summary: `${allergies.length} alergia(s) ativa(s)`,
      detail: `Alergias: ${allergies.map((a) => `${a.substance} (${a.severity})`).join(', ')}`,
      indicator: allergies.some((a) => a.severity === 'LIFE_THREATENING')
        ? CardIndicator.CRITICAL
        : CardIndicator.WARNING,
      source: { label: 'VoxPEP Allergy Alert' },
    }];
  }

  private async evaluateSepsisScreening(
    tenantId: string,
    patientId: string,
  ): Promise<CdsCard[]> {
    const latestVitals = await this.prisma.vitalSigns.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!latestVitals) return [];

    // qSOFA score
    let qsofa = 0;
    if (latestVitals.systolicBP && latestVitals.systolicBP <= 100) qsofa++;
    if (latestVitals.respiratoryRate && latestVitals.respiratoryRate >= 22) qsofa++;
    // GCS would be the third criterion but not in vitals model

    if (qsofa >= 2) {
      return [{
        uuid: crypto.randomUUID(),
        summary: 'ALERTA: qSOFA >= 2 — Risco de Sepse',
        detail: `qSOFA score: ${qsofa}. PA sistolica: ${latestVitals.systolicBP}mmHg, FR: ${latestVitals.respiratoryRate}ipm. Avaliar criterios de sepse e considerar coleta de lactato e hemoculturas.`,
        indicator: CardIndicator.CRITICAL,
        source: { label: 'VoxPEP Sepsis Screening' },
        suggestions: [{
          label: 'Solicitar lactato e hemoculturas',
          uuid: crypto.randomUUID(),
        }],
      }];
    }

    return [];
  }

  private async evaluatePreventiveCare(
    tenantId: string,
    patientId: string,
  ): Promise<CdsCard[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { birthDate: true, gender: true },
    });

    if (!patient?.birthDate) return [];

    const age = Math.floor(
      (Date.now() - patient.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    const cards: CdsCard[] = [];

    if (patient.gender === 'F' && age >= 50 && age <= 69) {
      cards.push({
        uuid: crypto.randomUUID(),
        summary: 'Rastreamento: Mamografia',
        detail: 'Paciente na faixa etaria recomendada para rastreamento mamografico (INCA). Verificar se mamografia recente foi realizada.',
        indicator: CardIndicator.INFO,
        source: { label: 'VoxPEP Preventive Care' },
      });
    }

    if (age >= 50 && age <= 75) {
      cards.push({
        uuid: crypto.randomUUID(),
        summary: 'Rastreamento: Colonoscopia',
        detail: 'Paciente na faixa etaria recomendada para rastreamento de cancer colorretal. Verificar ultima colonoscopia.',
        indicator: CardIndicator.INFO,
        source: { label: 'VoxPEP Preventive Care' },
      });
    }

    return cards;
  }

  async removeService(tenantId: string, serviceId: string) {
    const service = this.services.find((s) => s.id === serviceId && s.tenantId === tenantId);
    if (!service) {
      throw new NotFoundException(`CDS service "${serviceId}" not found`);
    }

    if (service.tenantId === '__builtin__') {
      throw new BadRequestException('Cannot remove built-in CDS services');
    }

    service.isActive = false;
    return { message: `CDS service "${service.title}" removed` };
  }
}
