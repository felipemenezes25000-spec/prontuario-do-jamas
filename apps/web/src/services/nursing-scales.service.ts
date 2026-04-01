import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

// ── Pain Assessment (Avaliação de Dor) ───────────────────────────────────────

export interface PainRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  scale: 'NRS' | 'VAS' | 'FACES' | 'FLACC' | 'CPOT' | 'BPS';
  score: number;
  location?: string;
  character?: string;
  radiation?: boolean;
  radiationSite?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  associatedSymptoms?: string[];
  impactOnActivity?: string;
  interventionApplied?: string;
  reassessmentScore?: number;
  reassessedAt?: string;
  assessedAt: string;
  createdAt: string;
}

export interface CreatePainRecordDto {
  patientId: string;
  encounterId?: string;
  scale: PainRecord['scale'];
  score: number;
  location?: string;
  character?: string;
  radiation?: boolean;
  radiationSite?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  associatedSymptoms?: string[];
  impactOnActivity?: string;
  interventionApplied?: string;
}

// ── Elimination (Eliminações) ─────────────────────────────────────────────────

export interface EliminationRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  type: 'URINARY' | 'INTESTINAL' | 'OSTOMY';
  urinaryOutput?: number;
  urinaryCharacteristics?: string;
  urinaryMethod?: 'SPONTANEOUS' | 'CATHETER' | 'DIAPER';
  intestinalFrequency?: number;
  intestinalConsistency?: string;
  intestinalColor?: string;
  ostomyOutput?: number;
  ostomyCharacteristics?: string;
  abnormalities: string[];
  recordedAt: string;
  createdAt: string;
}

export interface CreateEliminationDto {
  patientId: string;
  encounterId?: string;
  type: EliminationRecord['type'];
  urinaryOutput?: number;
  urinaryCharacteristics?: string;
  urinaryMethod?: EliminationRecord['urinaryMethod'];
  intestinalFrequency?: number;
  intestinalConsistency?: string;
  intestinalColor?: string;
  ostomyOutput?: number;
  ostomyCharacteristics?: string;
  abnormalities?: string[];
}

// ── Decubitus Change (Mudança de Decúbito) ────────────────────────────────────

export interface DecubitusChange {
  id: string;
  patientId: string;
  encounterId?: string;
  fromPosition: string;
  toPosition: string;
  skinIntegrityChecked: boolean;
  pressureAreasNote?: string;
  repositionedById: string;
  repositionedAt: string;
  nextScheduled?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateDecubitusChangeDto {
  patientId: string;
  encounterId?: string;
  fromPosition: string;
  toPosition: string;
  skinIntegrityChecked: boolean;
  pressureAreasNote?: string;
  nextScheduled?: string;
  notes?: string;
}

// ── Admission Checklist (Checklist de Admissão) ───────────────────────────────

export interface AdmissionChecklist {
  id: string;
  patientId: string;
  encounterId: string;
  identificationBand: boolean;
  allergyAlert: boolean;
  fallRisk: boolean;
  fallRiskScore?: number;
  vteRisk: boolean;
  pressureUlcerRisk: boolean;
  pressureUlcerScore?: number;
  nutritionalScreening: boolean;
  nutritionalScore?: number;
  painAssessed: boolean;
  vitalsTaken: boolean;
  medicationsReconciled: boolean;
  consentSigned: boolean;
  valuablesInventoried: boolean;
  educationProvided: boolean;
  emergencyContactRegistered: boolean;
  notes?: string;
  completedById: string;
  completedAt: string;
  createdAt: string;
}

export interface CreateAdmissionChecklistDto {
  patientId: string;
  encounterId: string;
  identificationBand: boolean;
  allergyAlert: boolean;
  fallRisk: boolean;
  fallRiskScore?: number;
  vteRisk: boolean;
  pressureUlcerRisk: boolean;
  pressureUlcerScore?: number;
  nutritionalScreening: boolean;
  nutritionalScore?: number;
  painAssessed: boolean;
  vitalsTaken: boolean;
  medicationsReconciled: boolean;
  consentSigned: boolean;
  valuablesInventoried: boolean;
  educationProvided: boolean;
  emergencyContactRegistered: boolean;
  notes?: string;
}

// ── Wound Evolution (Evolução de Ferida) ──────────────────────────────────────

export interface WoundEvolutionRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  woundSite: string;
  woundType: string;
  length?: number;
  width?: number;
  depth?: number;
  stage?: string;
  exudateType?: string;
  exudateAmount?: string;
  tissueType: string[];
  periwoundSkin?: string;
  odor?: string;
  pain?: number;
  dressingApplied?: string;
  photos?: string[];
  healingProgress?: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  notes?: string;
  assessedAt: string;
  createdAt: string;
}

export interface CreateWoundEvolutionDto {
  patientId: string;
  encounterId?: string;
  woundSite: string;
  woundType: string;
  length?: number;
  width?: number;
  depth?: number;
  stage?: string;
  exudateType?: string;
  exudateAmount?: string;
  tissueType?: string[];
  periwoundSkin?: string;
  odor?: string;
  pain?: number;
  dressingApplied?: string;
  notes?: string;
}

// ── Care Plan (Plano de Cuidados) ─────────────────────────────────────────────

export interface CarePlan {
  id: string;
  patientId: string;
  encounterId: string;
  diagnoses: Array<{
    nursingDiagnosis: string;
    relatedTo?: string;
    evidencedBy?: string[];
  }>;
  outcomes: Array<{
    diagnosisId: string;
    outcome: string;
    targetDate: string;
    achieved: boolean;
  }>;
  interventions: Array<{
    diagnosisId: string;
    intervention: string;
    frequency: string;
    responsible: string;
  }>;
  status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCarePlanDto {
  patientId: string;
  encounterId: string;
  diagnoses: Array<{
    nursingDiagnosis: string;
    relatedTo?: string;
    evidencedBy?: string[];
  }>;
  outcomes: Array<{
    outcome: string;
    targetDate: string;
  }>;
  interventions: Array<{
    intervention: string;
    frequency: string;
    responsible: string;
  }>;
}

// ── Fugulin Scale (Escala de Fugulin) ─────────────────────────────────────────

export interface FugulinAssessment {
  id: string;
  patientId: string;
  encounterId?: string;
  items: {
    stateOfConsciousness: number;
    oxygenotherapy: number;
    vitalSigns: number;
    nutrition: number;
    mobility: number;
    elimination: number;
    bodyTherapy: number;
    skinIntegrity: number;
    nursing: number;
  };
  totalScore: number;
  careCategory: 'MINIMAL' | 'INTERMEDIATE' | 'SEMI_INTENSIVE' | 'INTENSIVE';
  assessedAt: string;
  createdAt: string;
}

export interface AssessFugulinDto {
  patientId: string;
  encounterId?: string;
  items: {
    stateOfConsciousness: number;
    oxygenotherapy: number;
    vitalSigns: number;
    nutrition: number;
    mobility: number;
    elimination: number;
    bodyTherapy: number;
    skinIntegrity: number;
    nursing: number;
  };
}

// ── Staff Dimensioning (Dimensionamento de Pessoal) ───────────────────────────

export interface StaffDimensioningResult {
  unit: string;
  beds: number;
  occupancyRate: number;
  patientsByCategory: {
    minimal: number;
    intermediate: number;
    semiIntensive: number;
    intensive: number;
  };
  requiredNursingHours: number;
  recommendedNurses: number;
  recommendedTechnicians: number;
  currentNurses?: number;
  currentTechnicians?: number;
  deficit?: { nurses: number; technicians: number };
  calculatedAt: string;
}

export interface CalculateStaffingDto {
  unit: string;
  beds: number;
  occupancyRate: number;
  patientsByCategory: {
    minimal: number;
    intermediate: number;
    semiIntensive: number;
    intensive: number;
  };
  currentNurses?: number;
  currentTechnicians?: number;
}

// ── Catheter Bundle (Bundle de Cateter Urinário) ──────────────────────────────

export interface CatheterBundleRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  indication: string;
  indicationValid: boolean;
  smallestCaliberUsed: boolean;
  sterileInsertionTechnique: boolean;
  perinealHygiene: boolean;
  closedSystem: boolean;
  bagPositionBelow: boolean;
  dailyNeedEvaluated: boolean;
  removalConsidered: boolean;
  compliance: number;
  checkedAt: string;
  notes?: string;
  createdAt: string;
}

export interface CreateCatheterBundleDto {
  patientId: string;
  encounterId?: string;
  indication: string;
  indicationValid: boolean;
  smallestCaliberUsed: boolean;
  sterileInsertionTechnique: boolean;
  perinealHygiene: boolean;
  closedSystem: boolean;
  bagPositionBelow: boolean;
  dailyNeedEvaluated: boolean;
  removalConsidered: boolean;
  notes?: string;
}

// ── CVC Bundle (Bundle de CVC) ────────────────────────────────────────────────

export interface CvcBundleRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  handHygiene: boolean;
  maxBarrierPrecautions: boolean;
  chlorhexidineSkinPrep: boolean;
  optimalSiteSelection: boolean;
  avoidFemoral: boolean;
  dailyNeedEvaluated: boolean;
  dressingIntact: boolean;
  lineNecessityReviewed: boolean;
  compliance: number;
  checkedAt: string;
  notes?: string;
  createdAt: string;
}

export interface CreateCvcBundleDto {
  patientId: string;
  encounterId?: string;
  handHygiene: boolean;
  maxBarrierPrecautions: boolean;
  chlorhexidineSkinPrep: boolean;
  optimalSiteSelection: boolean;
  avoidFemoral: boolean;
  dailyNeedEvaluated: boolean;
  dressingIntact: boolean;
  lineNecessityReviewed: boolean;
  notes?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const nursingScalesKeys = {
  all: ['nursing-scales'] as const,
  pain: (patientId: string) => [...nursingScalesKeys.all, 'pain', patientId] as const,
};

// ============================================================================
// Pain (Dor)
// ============================================================================

export function useRecordPain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePainRecordDto) => {
      const { data } = await api.post<PainRecord>('/nursing/scales/pain', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: nursingScalesKeys.pain(vars.patientId) });
    },
  });
}

export function usePainHistory(patientId: string) {
  return useQuery({
    queryKey: nursingScalesKeys.pain(patientId),
    queryFn: async () => {
      const { data } = await api.get<PainRecord[]>(`/nursing/scales/pain/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

// ============================================================================
// Elimination (Eliminações)
// ============================================================================

export function useRecordElimination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateEliminationDto) => {
      const { data } = await api.post<EliminationRecord>('/nursing/scales/elimination', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...nursingScalesKeys.all, 'elimination', vars.patientId] });
    },
  });
}

// ============================================================================
// Decubitus Change (Mudança de Decúbito)
// ============================================================================

export function useRecordDecubitusChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDecubitusChangeDto) => {
      const { data } = await api.post<DecubitusChange>('/nursing/scales/decubitus', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...nursingScalesKeys.all, 'decubitus', vars.patientId] });
    },
  });
}

// ============================================================================
// Admission Checklist (Checklist de Admissão)
// ============================================================================

export function useCreateAdmissionChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAdmissionChecklistDto) => {
      const { data } = await api.post<AdmissionChecklist>('/nursing/scales/admission-checklist', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...nursingScalesKeys.all, 'admission-checklist', vars.patientId] });
    },
  });
}

// ============================================================================
// Wound Evolution (Evolução de Feridas)
// ============================================================================

export function useRecordWoundEvolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateWoundEvolutionDto) => {
      const { data } = await api.post<WoundEvolutionRecord>('/nursing/scales/wound-evolution', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...nursingScalesKeys.all, 'wound-evolution', vars.patientId] });
    },
  });
}

// ============================================================================
// Care Plan (Plano de Cuidados)
// ============================================================================

export function useCreateCarePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCarePlanDto) => {
      const { data } = await api.post<CarePlan>('/nursing/scales/care-plan', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...nursingScalesKeys.all, 'care-plan', vars.patientId] });
    },
  });
}

// ============================================================================
// Fugulin Scale (Escala de Fugulin)
// ============================================================================

export function useAssessFugulin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AssessFugulinDto) => {
      const { data } = await api.post<FugulinAssessment>('/nursing/scales/fugulin', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...nursingScalesKeys.all, 'fugulin', vars.patientId] });
    },
  });
}

// ============================================================================
// Staff Dimensioning (Dimensionamento COFEN)
// ============================================================================

export function useCalculateStaffing() {
  return useMutation({
    mutationFn: async (dto: CalculateStaffingDto) => {
      const { data } = await api.post<StaffDimensioningResult>('/nursing/scales/staff-dimensioning', dto);
      return data;
    },
  });
}

// ============================================================================
// Catheter Bundle (Bundle CAUTI)
// ============================================================================

export function useRecordCatheterBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCatheterBundleDto) => {
      const { data } = await api.post<CatheterBundleRecord>('/nursing/scales/catheter-bundle', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...nursingScalesKeys.all, 'catheter-bundle', vars.patientId] });
    },
  });
}

// ============================================================================
// CVC Bundle (Bundle CLABSI)
// ============================================================================

export function useRecordCvcBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCvcBundleDto) => {
      const { data } = await api.post<CvcBundleRecord>('/nursing/scales/cvc-bundle', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...nursingScalesKeys.all, 'cvc-bundle', vars.patientId] });
    },
  });
}
