import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

// ── Severity Scores ──────────────────────────────────────────────────────────

export interface ApacheIIInput {
  patientId: string;
  encounterId?: string;
  age: number;
  temperature: number;
  meanArterialPressure: number;
  heartRate: number;
  respiratoryRate: number;
  fio2: number;
  pao2?: number;
  paco2?: number;
  arterialPh: number;
  sodium: number;
  potassium: number;
  creatinine: number;
  acuteRenalFailure: boolean;
  hematocrit: number;
  wbc: number;
  gcs: number;
  chronicHealthPoints: number;
}

export interface Saps3Input {
  patientId: string;
  encounterId?: string;
  age: number;
  admissionSource: string;
  lengthOfStayBeforeAdmission: number;
  comorbidities: string[];
  surgicalStatus: string;
  heartRate: number;
  systolicBP: number;
  temperature: number;
  oxygenation: number;
  gcs: number;
  bilirubin: number;
  creatinine: number;
  platelets: number;
  ph: number;
}

export interface SofaInput {
  patientId: string;
  encounterId?: string;
  pao2fio2: number;
  plateletsCount: number;
  bilirubinMgDl: number;
  meanArterialPressure: number;
  vasopressors: Array<{ drug: string; dose: number }>;
  glasgowComaScale: number;
  creatinineMgDl: number;
  urineOutputMlDay?: number;
}

export interface Tiss28Input {
  patientId: string;
  encounterId?: string;
  date: string;
  items: Record<string, boolean>;
}

export interface SeverityScoreResult {
  id: string;
  patientId: string;
  scoreType: 'APACHE_II' | 'SAPS3' | 'SOFA' | 'TISS28';
  totalScore: number;
  estimatedMortality?: number;
  components: Record<string, number>;
  interpretation?: string;
  createdAt: string;
}

// ── Vasoactive Drugs ──────────────────────────────────────────────────────────

export interface VasoactiveDrugInput {
  drug: string;
  weightKg: number;
  targetDoseMcgKgMin: number;
  concentrationMgMl: number;
}

export interface VasoactiveDrugResult {
  drug: string;
  weightKg: number;
  targetDoseMcgKgMin: number;
  concentrationMgMl: number;
  dosePerMinuteMcg: number;
  dosePerHourMcg: number;
  pumpRateMlH: number;
}

// ── Sedation ─────────────────────────────────────────────────────────────────

export interface SedationRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  agent: string;
  dose: string;
  route: string;
  rassTarget: number;
  rassActual: number;
  camIcuPositive?: boolean;
  analgesicAgent?: string;
  analgesicDose?: string;
  notes?: string;
  recordedAt: string;
  createdAt: string;
}

export interface CreateSedationDto {
  patientId: string;
  encounterId?: string;
  agent: string;
  dose: string;
  route: string;
  rassTarget: number;
  rassActual: number;
  camIcuPositive?: boolean;
  analgesicAgent?: string;
  analgesicDose?: string;
  notes?: string;
}

// ── Ventilation ───────────────────────────────────────────────────────────────

export interface VentilationRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  mode: string;
  tidalVolumeMl: number;
  respiratoryRate: number;
  peep: number;
  fio2: number;
  pressureSupport?: number;
  plateau?: number;
  compliance?: number;
  resistance?: number;
  pao2?: number;
  paco2?: number;
  spo2?: number;
  etco2?: number;
  minuteVentilation?: number;
  recordedAt: string;
  createdAt: string;
}

export interface CreateVentilationDto {
  patientId: string;
  encounterId?: string;
  mode: string;
  tidalVolumeMl: number;
  respiratoryRate: number;
  peep: number;
  fio2: number;
  pressureSupport?: number;
  plateau?: number;
  pao2?: number;
  paco2?: number;
  spo2?: number;
  etco2?: number;
}

// ── Weaning Trial ─────────────────────────────────────────────────────────────

export interface WeaningTrial {
  id: string;
  patientId: string;
  encounterId?: string;
  trialType: 'SBT' | 'T_PIECE' | 'CPAP' | 'PSV';
  durationMinutes: number;
  success: boolean;
  failureReason?: string;
  heartRateBefore: number;
  heartRateAfter: number;
  sbpBefore: number;
  sbpAfter: number;
  spo2Before: number;
  spo2After: number;
  rrBefore: number;
  rrAfter: number;
  rsbi?: number;
  notes?: string;
  performedAt: string;
  createdAt: string;
}

export interface CreateWeaningTrialDto {
  patientId: string;
  encounterId?: string;
  trialType: WeaningTrial['trialType'];
  durationMinutes: number;
  success: boolean;
  failureReason?: string;
  heartRateBefore: number;
  heartRateAfter: number;
  sbpBefore: number;
  sbpAfter: number;
  spo2Before: number;
  spo2After: number;
  rrBefore: number;
  rrAfter: number;
  rsbi?: number;
  notes?: string;
}

// ── Dialysis ──────────────────────────────────────────────────────────────────

export interface DialysisSession {
  id: string;
  patientId: string;
  encounterId?: string;
  modality: 'HD' | 'CRRT' | 'SLED' | 'PD';
  accessType: string;
  accessSite?: string;
  dialysateName?: string;
  bloodFlowRate?: number;
  dialysateFlowRate?: number;
  ultrafiltrationGoal?: number;
  ultrafiltrationAchieved?: number;
  durationMinutes?: number;
  complications: string[];
  startedAt: string;
  endedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateDialysisDto {
  patientId: string;
  encounterId?: string;
  modality: DialysisSession['modality'];
  accessType: string;
  accessSite?: string;
  dialysateName?: string;
  bloodFlowRate?: number;
  dialysateFlowRate?: number;
  ultrafiltrationGoal?: number;
  durationMinutes?: number;
  startedAt: string;
  notes?: string;
}

// ── Devices ───────────────────────────────────────────────────────────────────

export interface IcuInvasiveDevice {
  id: string;
  patientId: string;
  encounterId?: string;
  deviceType: 'CVC' | 'ARTERIAL_LINE' | 'URINARY_CATHETER' | 'ENDOTRACHEAL_TUBE' | 'CHEST_TUBE' | 'NGT' | 'OTHER';
  site?: string;
  size?: string;
  insertedAt: string;
  removedAt?: string;
  daysInserted: number;
  removed: boolean;
  bundleChecklist: Record<string, boolean>;
  bundleCompliance: number;
  complications: string[];
  notes?: string;
  createdAt: string;
}

export interface RegisterDeviceDto {
  patientId: string;
  encounterId?: string;
  deviceType: IcuInvasiveDevice['deviceType'];
  site?: string;
  size?: string;
  insertedAt: string;
  bundleChecklist?: Record<string, boolean>;
  notes?: string;
}

// ── Bundles ───────────────────────────────────────────────────────────────────

export interface BundleChecklistRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  bundleType: 'CVC' | 'VAP' | 'UTI' | 'SEPSIS' | 'DELIRIUM';
  items: Record<string, boolean>;
  compliance: number;
  checkedAt: string;
  notes?: string;
  createdAt: string;
}

export interface CreateBundleDto {
  patientId: string;
  encounterId?: string;
  bundleType: BundleChecklistRecord['bundleType'];
  items: Record<string, boolean>;
  notes?: string;
}

// ── Pronation (Decúbito Ventral) ──────────────────────────────────────────────

export interface PronationSession {
  id: string;
  patientId: string;
  encounterId?: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  pao2fio2Before?: number;
  pao2fio2After?: number;
  spo2Before?: number;
  spo2After?: number;
  complications: string[];
  notes?: string;
  createdAt: string;
}

export interface CreatePronationDto {
  patientId: string;
  encounterId?: string;
  startedAt: string;
  pao2fio2Before?: number;
  spo2Before?: number;
  notes?: string;
}

// ── Daily Goals ───────────────────────────────────────────────────────────────

export interface DailyGoals {
  id: string;
  patientId: string;
  encounterId?: string;
  date: string;
  goals: Record<string, { goal: string; achieved: boolean; notes?: string }>;
  sedationTarget: number;
  painTarget: number;
  mobilizationPlan: string;
  nutritionGoal?: string;
  fluidBalance?: string;
  other?: string;
  completedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetDailyGoalsDto {
  patientId: string;
  encounterId?: string;
  date: string;
  goals: Record<string, { goal: string; achieved?: boolean; notes?: string }>;
  sedationTarget: number;
  painTarget: number;
  mobilizationPlan: string;
  nutritionGoal?: string;
  fluidBalance?: string;
  other?: string;
}

// ── Enteral Nutrition ─────────────────────────────────────────────────────────

export interface EnteralNutritionRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  formula: string;
  volumeMlH: number;
  targetVolumeDay: number;
  administeredVolumeDay?: number;
  route: 'NGT' | 'OGT' | 'JEJUNOSTOMY' | 'GASTROSTOMY';
  caloricDensity: number;
  proteinContent: number;
  startedAt: string;
  pausedAt?: string;
  resumedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateEnteralNutritionDto {
  patientId: string;
  encounterId?: string;
  formula: string;
  volumeMlH: number;
  targetVolumeDay: number;
  route: EnteralNutritionRecord['route'];
  caloricDensity: number;
  proteinContent: number;
  startedAt: string;
  notes?: string;
}

// ── Flowsheet ─────────────────────────────────────────────────────────────────

export interface IcuAdvancedFlowsheet {
  patientId: string;
  period: { from: string; to: string };
  scores: SeverityScoreResult[];
  ventilation: VentilationRecord[];
  sedation: SedationRecord[];
  dialysis: DialysisSession[];
  devices: IcuInvasiveDevice[];
  bundles: BundleChecklistRecord[];
  nutrition: EnteralNutritionRecord[];
  dailyGoals: DailyGoals[];
}

// ============================================================================
// Query Keys
// ============================================================================

export const icuAdvancedKeys = {
  all: ['icu-advanced'] as const,
  scores: (patientId: string) => [...icuAdvancedKeys.all, 'scores', patientId] as const,
  ventilation: (patientId: string) => [...icuAdvancedKeys.all, 'ventilation', patientId] as const,
  dialysis: (patientId: string) => [...icuAdvancedKeys.all, 'dialysis', patientId] as const,
  devices: (patientId: string) => [...icuAdvancedKeys.all, 'devices', patientId] as const,
  dailyGoals: (patientId: string) => [...icuAdvancedKeys.all, 'daily-goals', patientId] as const,
  flowsheet: (patientId: string) => [...icuAdvancedKeys.all, 'flowsheet', patientId] as const,
  nutrition: (patientId: string) => [...icuAdvancedKeys.all, 'enteral-nutrition', patientId] as const,
};

// ============================================================================
// Severity Scores
// ============================================================================

export function useCalculateApacheII() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ApacheIIInput) => {
      const { data } = await api.post<SeverityScoreResult>('/icu/scores/apache-ii', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.scores(vars.patientId) });
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}

export function useCalculateSaps3() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Saps3Input) => {
      const { data } = await api.post<SeverityScoreResult>('/icu/scores/saps3', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.scores(vars.patientId) });
    },
  });
}

export function useCalculateSofa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SofaInput) => {
      const { data } = await api.post<SeverityScoreResult>('/icu/scores/sofa', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.scores(vars.patientId) });
    },
  });
}

export function useCalculateTiss28() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Tiss28Input) => {
      const { data } = await api.post<SeverityScoreResult>('/icu/scores/tiss28', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.scores(vars.patientId) });
    },
  });
}

// ============================================================================
// Vasoactive Drug Calculator
// ============================================================================

export function useCalculateVasoactiveDrug() {
  return useMutation({
    mutationFn: async (dto: VasoactiveDrugInput) => {
      const { data } = await api.post<VasoactiveDrugResult>('/icu/vasoactive-drugs/calculate', dto);
      return data;
    },
  });
}

// ============================================================================
// Sedation Protocol
// ============================================================================

export function useRecordSedation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSedationDto) => {
      const { data } = await api.post<SedationRecord>('/icu/sedation-protocol', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}

// ============================================================================
// Ventilation
// ============================================================================

export function useVentilationRecords(patientId: string) {
  return useQuery({
    queryKey: icuAdvancedKeys.ventilation(patientId),
    queryFn: async () => {
      const { data } = await api.get<VentilationRecord[]>(`/icu/ventilation/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
    refetchInterval: 60000,
  });
}

export function useRecordVentilation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateVentilationDto) => {
      const { data } = await api.post<VentilationRecord>('/icu/ventilation', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.ventilation(vars.patientId) });
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}

// ============================================================================
// Weaning Trial (Teste de Respiração Espontânea)
// ============================================================================

export function useRecordWeaningTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateWeaningTrialDto) => {
      const { data } = await api.post<WeaningTrial>('/icu/weaning-trial', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}

// ============================================================================
// Dialysis (Diálise)
// ============================================================================

export function useDialysisSessions(patientId: string) {
  return useQuery({
    queryKey: icuAdvancedKeys.dialysis(patientId),
    queryFn: async () => {
      const { data } = await api.get<DialysisSession[]>(`/icu/dialysis/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRecordDialysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDialysisDto) => {
      const { data } = await api.post<DialysisSession>('/icu/dialysis', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.dialysis(vars.patientId) });
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}

// ============================================================================
// Invasive Devices (Dispositivos)
// ============================================================================

export function useIcuDevicesAdvanced(patientId: string) {
  return useQuery({
    queryKey: icuAdvancedKeys.devices(patientId),
    queryFn: async () => {
      const { data } = await api.get<IcuInvasiveDevice[]>(`/icu/devices/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRegisterDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: RegisterDeviceDto) => {
      const { data } = await api.post<IcuInvasiveDevice>('/icu/devices', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.devices(vars.patientId) });
    },
  });
}

// ============================================================================
// Bundle Checklists
// ============================================================================

export function useRecordBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateBundleDto) => {
      const { data } = await api.post<BundleChecklistRecord>('/icu/bundles', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}

// ============================================================================
// Pronation (Prona)
// ============================================================================

export function useRecordPronation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePronationDto) => {
      const { data } = await api.post<PronationSession>('/icu/pronation', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}

// ============================================================================
// Daily Goals (Metas Diárias)
// ============================================================================

export function useDailyGoals(patientId: string) {
  return useQuery({
    queryKey: icuAdvancedKeys.dailyGoals(patientId),
    queryFn: async () => {
      const { data } = await api.get<DailyGoals[]>(`/icu/daily-goals/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useSetDailyGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SetDailyGoalsDto) => {
      const { data } = await api.post<DailyGoals>('/icu/daily-goals', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.dailyGoals(vars.patientId) });
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}

// ============================================================================
// Flowsheet (Folha de Evolução)
// ============================================================================

export function useIcuAdvancedFlowsheet(patientId: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...icuAdvancedKeys.flowsheet(patientId), dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const { data } = await api.get<IcuAdvancedFlowsheet>(`/icu/flowsheet/${patientId}?${params.toString()}`);
      return data;
    },
    enabled: !!patientId,
    refetchInterval: 60000,
  });
}

// ============================================================================
// Enteral Nutrition (Nutrição Enteral)
// ============================================================================

export function useEnteralNutrition(patientId: string) {
  return useQuery({
    queryKey: icuAdvancedKeys.nutrition(patientId),
    queryFn: async () => {
      const { data } = await api.get<EnteralNutritionRecord[]>(`/icu/enteral-nutrition/patient/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRecordEnteralNutrition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateEnteralNutritionDto) => {
      const { data } = await api.post<EnteralNutritionRecord>('/icu/enteral-nutrition', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.nutrition(vars.patientId) });
      qc.invalidateQueries({ queryKey: icuAdvancedKeys.flowsheet(vars.patientId) });
    },
  });
}
