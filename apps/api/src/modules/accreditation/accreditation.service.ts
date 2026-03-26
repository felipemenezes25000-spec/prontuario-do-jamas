import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AccreditationStandard,
  ComplianceStatus,
  ActionPlanStatus,
  ActionPlanPriority,
  EvaluateChecklistItemDto,
  CreateActionPlanDto,
  ListActionPlansFilterDto,
} from './accreditation.dto';
import { randomUUID } from 'crypto';

// ============================================================================
// Exported Interfaces
// ============================================================================

export interface ChecklistItem {
  id: string;
  standard: AccreditationStandard;
  category: string;
  code: string;
  requirement: string;
  status: ComplianceStatus;
  evidence: string | null;
  evaluatedBy: string | null;
  evaluatedAt: string | null;
  notes: string | null;
}

export interface ChecklistEvaluationResult {
  itemId: string;
  status: ComplianceStatus;
  evaluatedAt: string;
  documentId: string;
}

export interface AccreditationDashboard {
  totalItems: number;
  compliant: number;
  nonCompliant: number;
  partial: number;
  notEvaluated: number;
  notApplicable: number;
  complianceScore: number;
  byCategory: Record<string, { total: number; compliant: number; score: number }>;
}

export interface ActionPlan {
  id: string;
  checklistItemId: string;
  description: string;
  responsible: string;
  deadline: string;
  priority: ActionPlanPriority;
  status: ActionPlanStatus;
  createdBy: string;
  createdAt: string;
  documentId: string;
}

// ============================================================================
// ONA Checklist Reference Data
// ============================================================================

const ONA_CHECKLIST: Omit<ChecklistItem, 'status' | 'evidence' | 'evaluatedBy' | 'evaluatedAt' | 'notes'>[] = [
  { id: 'ONA-GL-001', standard: AccreditationStandard.ONA, category: 'Gestão e Liderança', code: 'GL-001', requirement: 'Planejamento estratégico institucional documentado e revisado anualmente' },
  { id: 'ONA-GL-002', standard: AccreditationStandard.ONA, category: 'Gestão e Liderança', code: 'GL-002', requirement: 'Política de gestão da qualidade formalmente aprovada' },
  { id: 'ONA-GL-003', standard: AccreditationStandard.ONA, category: 'Gestão e Liderança', code: 'GL-003', requirement: 'Indicadores de desempenho definidos e monitorados mensalmente' },
  { id: 'ONA-AC-001', standard: AccreditationStandard.ONA, category: 'Atenção ao Paciente', code: 'AC-001', requirement: 'Protocolo de identificação do paciente com pelo menos 2 identificadores' },
  { id: 'ONA-AC-002', standard: AccreditationStandard.ONA, category: 'Atenção ao Paciente', code: 'AC-002', requirement: 'Protocolo de segurança na prescrição e administração de medicamentos' },
  { id: 'ONA-AC-003', standard: AccreditationStandard.ONA, category: 'Atenção ao Paciente', code: 'AC-003', requirement: 'Protocolo de cirurgia segura implementado' },
  { id: 'ONA-AC-004', standard: AccreditationStandard.ONA, category: 'Atenção ao Paciente', code: 'AC-004', requirement: 'Protocolo de prevenção de queda com avaliação de risco' },
  { id: 'ONA-AC-005', standard: AccreditationStandard.ONA, category: 'Atenção ao Paciente', code: 'AC-005', requirement: 'Protocolo de higienização das mãos' },
  { id: 'ONA-DI-001', standard: AccreditationStandard.ONA, category: 'Diagnóstico', code: 'DI-001', requirement: 'Laboratório com controle de qualidade interno e externo' },
  { id: 'ONA-DI-002', standard: AccreditationStandard.ONA, category: 'Diagnóstico', code: 'DI-002', requirement: 'Laudos emitidos em prazo definido e com rastreabilidade' },
  { id: 'ONA-IN-001', standard: AccreditationStandard.ONA, category: 'Infraestrutura', code: 'IN-001', requirement: 'Plano de manutenção preventiva de equipamentos' },
  { id: 'ONA-IN-002', standard: AccreditationStandard.ONA, category: 'Infraestrutura', code: 'IN-002', requirement: 'Gerenciamento de resíduos de serviços de saúde (PGRSS)' },
  { id: 'ONA-RH-001', standard: AccreditationStandard.ONA, category: 'Gestão de Pessoas', code: 'RH-001', requirement: 'Programa de educação continuada para todos os colaboradores' },
  { id: 'ONA-RH-002', standard: AccreditationStandard.ONA, category: 'Gestão de Pessoas', code: 'RH-002', requirement: 'Avaliação de competências profissionais periódica' },
];

const JCI_CHECKLIST: Omit<ChecklistItem, 'status' | 'evidence' | 'evaluatedBy' | 'evaluatedAt' | 'notes'>[] = [
  { id: 'JCI-IPSG-001', standard: AccreditationStandard.JCI, category: 'International Patient Safety Goals', code: 'IPSG.1', requirement: 'Identify patients correctly using at least two identifiers' },
  { id: 'JCI-IPSG-002', standard: AccreditationStandard.JCI, category: 'International Patient Safety Goals', code: 'IPSG.2', requirement: 'Improve effective communication among caregivers' },
  { id: 'JCI-IPSG-003', standard: AccreditationStandard.JCI, category: 'International Patient Safety Goals', code: 'IPSG.3', requirement: 'Improve the safety of high-alert medications' },
  { id: 'JCI-IPSG-004', standard: AccreditationStandard.JCI, category: 'International Patient Safety Goals', code: 'IPSG.4', requirement: 'Ensure safe surgery (correct site, correct procedure, correct patient)' },
  { id: 'JCI-IPSG-005', standard: AccreditationStandard.JCI, category: 'International Patient Safety Goals', code: 'IPSG.5', requirement: 'Reduce the risk of health care-associated infections' },
  { id: 'JCI-IPSG-006', standard: AccreditationStandard.JCI, category: 'International Patient Safety Goals', code: 'IPSG.6', requirement: 'Reduce the risk of patient harm from falls' },
  { id: 'JCI-ACC-001', standard: AccreditationStandard.JCI, category: 'Access to Care and Continuity of Care', code: 'ACC.1', requirement: 'Patients are screened at initial contact for admission or service' },
  { id: 'JCI-ACC-002', standard: AccreditationStandard.JCI, category: 'Access to Care and Continuity of Care', code: 'ACC.2', requirement: 'Transfer and discharge criteria are standardized' },
  { id: 'JCI-PFR-001', standard: AccreditationStandard.JCI, category: 'Patient and Family Rights', code: 'PFR.1', requirement: 'Patient rights and responsibilities are identified and protected' },
  { id: 'JCI-PFR-002', standard: AccreditationStandard.JCI, category: 'Patient and Family Rights', code: 'PFR.2', requirement: 'Informed consent is obtained before treatment' },
  { id: 'JCI-COP-001', standard: AccreditationStandard.JCI, category: 'Care of Patients', code: 'COP.1', requirement: 'Care planning is integrated and coordinated among disciplines' },
  { id: 'JCI-COP-002', standard: AccreditationStandard.JCI, category: 'Care of Patients', code: 'COP.2', requirement: 'Pain management protocols are implemented' },
  { id: 'JCI-GLD-001', standard: AccreditationStandard.JCI, category: 'Governance, Leadership, Direction', code: 'GLD.1', requirement: 'Governance structure and responsibilities are defined' },
  { id: 'JCI-GLD-002', standard: AccreditationStandard.JCI, category: 'Governance, Leadership, Direction', code: 'GLD.2', requirement: 'Quality improvement and patient safety program is established' },
];

@Injectable()
export class AccreditationService {
  private readonly logger = new Logger(AccreditationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateChecklistItem(
    tenantId: string,
    userEmail: string,
    dto: EvaluateChecklistItemDto,
  ): Promise<ChecklistEvaluationResult> {
    this.logger.log(
      `Evaluating checklist item ${dto.itemId} as ${dto.status}`,
    );

    const document = await this.prisma.clinicalDocument.create({
      data: {
        patientId: null as unknown as string,
        authorId: userEmail,
        tenantId,
        type: 'CUSTOM',
        title: `[ACCREDITATION] Avaliação - ${dto.itemId}`,
        content: JSON.stringify({
          itemId: dto.itemId,
          status: dto.status,
          evidence: dto.evidence ?? null,
          evaluatedBy: dto.evaluatedBy,
          evaluatedAt: new Date().toISOString(),
          notes: dto.notes ?? null,
        }),
        generatedByAI: false,
      },
    });

    return {
      itemId: dto.itemId,
      status: dto.status,
      evaluatedAt: new Date().toISOString(),
      documentId: document.id,
    };
  }

  async getChecklistByStandard(
    tenantId: string,
    standard: AccreditationStandard,
  ): Promise<ChecklistItem[]> {
    this.logger.log(`Fetching checklist for standard ${standard}`);

    const baseChecklist =
      standard === AccreditationStandard.ONA
        ? ONA_CHECKLIST
        : JCI_CHECKLIST;

    // Load existing evaluations from stored documents
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[ACCREDITATION] Avaliação' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const evaluationMap = new Map<
      string,
      { status: ComplianceStatus; evidence: string | null; evaluatedBy: string | null; evaluatedAt: string | null; notes: string | null }
    >();

    for (const doc of documents) {
      if (!doc.content) continue;
      const content = JSON.parse(doc.content) as {
        itemId: string;
        status: ComplianceStatus;
        evidence: string | null;
        evaluatedBy: string | null;
        evaluatedAt: string | null;
        notes: string | null;
      };
      // Only keep the most recent evaluation per item (already sorted desc)
      if (!evaluationMap.has(content.itemId)) {
        evaluationMap.set(content.itemId, {
          status: content.status,
          evidence: content.evidence,
          evaluatedBy: content.evaluatedBy,
          evaluatedAt: content.evaluatedAt,
          notes: content.notes,
        });
      }
    }

    return baseChecklist.map((item) => {
      const evaluation = evaluationMap.get(item.id);
      return {
        ...item,
        status: evaluation?.status ?? ComplianceStatus.NOT_EVALUATED,
        evidence: evaluation?.evidence ?? null,
        evaluatedBy: evaluation?.evaluatedBy ?? null,
        evaluatedAt: evaluation?.evaluatedAt ?? null,
        notes: evaluation?.notes ?? null,
      };
    });
  }

  async getDashboard(tenantId: string): Promise<AccreditationDashboard> {
    this.logger.log('Building accreditation compliance dashboard');

    // Merge both standards for a full overview
    const onaItems = await this.getChecklistByStandard(tenantId, AccreditationStandard.ONA);
    const jciItems = await this.getChecklistByStandard(tenantId, AccreditationStandard.JCI);
    const allItems = [...onaItems, ...jciItems];

    const totalItems = allItems.length;
    const compliant = allItems.filter((i) => i.status === ComplianceStatus.COMPLIANT).length;
    const nonCompliant = allItems.filter((i) => i.status === ComplianceStatus.NON_COMPLIANT).length;
    const partial = allItems.filter((i) => i.status === ComplianceStatus.PARTIAL).length;
    const notEvaluated = allItems.filter((i) => i.status === ComplianceStatus.NOT_EVALUATED).length;
    const notApplicable = allItems.filter((i) => i.status === ComplianceStatus.NOT_APPLICABLE).length;

    const evaluatedCount = totalItems - notEvaluated - notApplicable;
    const complianceScore =
      evaluatedCount > 0
        ? parseFloat(
            (((compliant + partial * 0.5) / evaluatedCount) * 100).toFixed(1),
          )
        : 0;

    // Group by category
    const byCategory: Record<string, { total: number; compliant: number; score: number }> = {};
    for (const item of allItems) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { total: 0, compliant: 0, score: 0 };
      }
      byCategory[item.category].total++;
      if (item.status === ComplianceStatus.COMPLIANT) {
        byCategory[item.category].compliant++;
      }
    }
    for (const key of Object.keys(byCategory)) {
      const cat = byCategory[key];
      cat.score =
        cat.total > 0
          ? parseFloat(((cat.compliant / cat.total) * 100).toFixed(1))
          : 0;
    }

    return {
      totalItems,
      compliant,
      nonCompliant,
      partial,
      notEvaluated,
      notApplicable,
      complianceScore,
      byCategory,
    };
  }

  async createActionPlan(
    tenantId: string,
    userEmail: string,
    dto: CreateActionPlanDto,
  ): Promise<ActionPlan> {
    this.logger.log(
      `Creating action plan for checklist item ${dto.checklistItemId}`,
    );

    const actionPlanId = randomUUID();

    const document = await this.prisma.clinicalDocument.create({
      data: {
        patientId: null as unknown as string,
        authorId: userEmail,
        tenantId,
        type: 'CUSTOM',
        title: `[ACCREDITATION] Plano de Ação - ${dto.checklistItemId}`,
        content: JSON.stringify({
          actionPlanId,
          checklistItemId: dto.checklistItemId,
          description: dto.description,
          responsible: dto.responsible,
          deadline: dto.deadline,
          priority: dto.priority,
          status: ActionPlanStatus.PENDING,
          createdBy: userEmail,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
      },
    });

    return {
      id: actionPlanId,
      checklistItemId: dto.checklistItemId,
      description: dto.description,
      responsible: dto.responsible,
      deadline: dto.deadline,
      priority: dto.priority,
      status: ActionPlanStatus.PENDING,
      createdBy: userEmail,
      createdAt: new Date().toISOString(),
      documentId: document.id,
    };
  }

  async listActionPlans(
    tenantId: string,
    filters: ListActionPlansFilterDto,
  ): Promise<ActionPlan[]> {
    this.logger.log('Listing action plans');

    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[ACCREDITATION] Plano de Ação' },
      },
      orderBy: { createdAt: 'desc' },
    });

    let plans: ActionPlan[] = documents
      .filter((doc) => doc.content !== null)
      .map((doc) => {
        const content = JSON.parse(doc.content!) as {
          actionPlanId: string;
          checklistItemId: string;
          description: string;
          responsible: string;
          deadline: string;
          priority: ActionPlanPriority;
          status: ActionPlanStatus;
          createdBy: string;
          createdAt: string;
        };

        return {
          id: content.actionPlanId,
          checklistItemId: content.checklistItemId,
          description: content.description,
          responsible: content.responsible,
          deadline: content.deadline,
          priority: content.priority,
          status: content.status,
          createdBy: content.createdBy,
          createdAt: content.createdAt,
          documentId: doc.id,
        };
      });

    // Apply filters
    if (filters.status) {
      plans = plans.filter((p) => p.status === filters.status);
    }
    if (filters.priority) {
      plans = plans.filter((p) => p.priority === filters.priority);
    }
    if (filters.responsible) {
      plans = plans.filter((p) => p.responsible === filters.responsible);
    }

    return plans;
  }
}
