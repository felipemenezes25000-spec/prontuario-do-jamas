import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface AdverseEvent {
  id: string;
  patientId: string;
  encounterId?: string;
  type: string;
  severity: 'NEAR_MISS' | 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
  description: string;
  location: string;
  involvedStaff: string[];
  contributingFactors: string[];
  immediateActions: string;
  reportedById: string;
  reportedAt: string;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED';
  rootCauseCompleted: boolean;
  createdAt: string;
}

export interface ReportAdverseEventDto {
  patientId: string;
  encounterId?: string;
  type: string;
  severity: AdverseEvent['severity'];
  description: string;
  location: string;
  involvedStaff?: string[];
  contributingFactors?: string[];
  immediateActions: string;
}

export interface AdverseEventParams {
  patientId?: string;
  severity?: AdverseEvent['severity'];
  status?: AdverseEvent['status'];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface NearMissReport {
  id: string;
  patientId?: string;
  description: string;
  location: string;
  category: string;
  recoveryFactor: string;
  reportedById: string;
  reportedAt: string;
  createdAt: string;
}

export interface ReportNearMissDto {
  patientId?: string;
  description: string;
  location: string;
  category: string;
  recoveryFactor: string;
}

export interface PositiveIdentificationResult {
  verified: boolean;
  patientId: string;
  checkedItems: string[];
  discrepancies: string[];
  verifiedById: string;
  verifiedAt: string;
}

export interface VerifyIdentificationDto {
  patientId: string;
  encounterId?: string;
  checkedItems: string[];
  wristbandMatch: boolean;
  nameMatch: boolean;
  dateOfBirthMatch: boolean;
  mrNumberMatch: boolean;
}

export interface AllergyAlertConfig {
  id: string;
  patientId: string;
  allergen: string;
  alertType: 'POPUP' | 'BANNER' | 'BLOCK';
  severity: 'WARNING' | 'CRITICAL';
  active: boolean;
  createdAt: string;
}

export interface ConfigureAllergyAlertsDto {
  patientId: string;
  allergen: string;
  alertType: AllergyAlertConfig['alertType'];
  severity: AllergyAlertConfig['severity'];
}

export interface ProcedureTimeout {
  id: string;
  procedureId: string;
  patientId: string;
  correctPatient: boolean;
  correctSite: boolean;
  correctProcedure: boolean;
  consentVerified: boolean;
  implants: boolean;
  antibioticProphylaxis: boolean;
  imagingAvailable: boolean;
  teamAgreement: boolean;
  performedById: string;
  performedAt: string;
  notes?: string;
}

export interface RecordTimeoutDto {
  procedureId: string;
  patientId: string;
  correctPatient: boolean;
  correctSite: boolean;
  correctProcedure: boolean;
  consentVerified: boolean;
  implants: boolean;
  antibioticProphylaxis: boolean;
  imagingAvailable: boolean;
  teamAgreement: boolean;
  notes?: string;
}

export interface RootCauseAnalysis {
  id: string;
  adverseEventId: string;
  methodology: 'FISHBONE' | 'FIVE_WHYS' | 'FMEA' | 'OTHER';
  rootCauses: string[];
  contributingFactors: string[];
  systemFactors: string[];
  humanFactors: string[];
  recommendations: string[];
  actionPlan: Array<{ action: string; responsible: string; deadline: string; status: string }>;
  completedById: string;
  completedAt: string;
  createdAt: string;
}

export interface CreateRCADto {
  adverseEventId: string;
  methodology: RootCauseAnalysis['methodology'];
  rootCauses: string[];
  contributingFactors: string[];
  systemFactors: string[];
  humanFactors: string[];
  recommendations: string[];
  actionPlan: Array<{ action: string; responsible: string; deadline: string }>;
}

export interface DeviceTrackingRecord {
  id: string;
  deviceId: string;
  deviceType: string;
  serialNumber: string;
  patientId?: string;
  location: string;
  status: 'IN_USE' | 'AVAILABLE' | 'MAINTENANCE' | 'DECOMMISSIONED';
  assignedAt?: string;
  returnedAt?: string;
  notes?: string;
}

export interface DeviceTrackingParams {
  deviceType?: string;
  status?: DeviceTrackingRecord['status'];
  patientId?: string;
  location?: string;
}

export interface SafetyDashboard {
  period: { from: string; to: string };
  adverseEvents: { total: number; bySeverity: Record<string, number>; trend: number };
  nearMisses: { total: number; trend: number };
  timeouts: { total: number; completionRate: number };
  bundleCompliance: { overall: number; byType: Record<string, number> };
  openRCAs: number;
  safetyScore: number;
  topRisks: Array<{ description: string; count: number; severity: string }>;
}

export interface SafetyDashboardParams {
  from?: string;
  to?: string;
  unit?: string;
}

export interface VteRiskAssessment {
  id: string;
  patientId: string;
  encounterId?: string;
  totalScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  factors: Record<string, number>;
  recommendedProphylaxis: string;
  mechanicalProphylaxis: boolean;
  pharmacologicalProphylaxis: boolean;
  contraindications: string[];
  assessedAt: string;
}

export interface AssessVteRiskDto {
  patientId: string;
  encounterId?: string;
  factors: Record<string, boolean | number>;
  contraindications?: string[];
}

export interface SsiChecklist {
  id: string;
  procedureId: string;
  patientId: string;
  hairRemoval: boolean;
  hairRemovalMethod?: string;
  antibioticGiven: boolean;
  antibioticName?: string;
  antibioticTime?: string;
  skinPrep: string;
  normothermia: boolean;
  glycemicControl: boolean;
  glucoseValue?: number;
  oxygenation: boolean;
  notes?: string;
  recordedAt: string;
}

export interface RecordSsiChecklistDto {
  procedureId: string;
  patientId: string;
  hairRemoval: boolean;
  hairRemovalMethod?: string;
  antibioticGiven: boolean;
  antibioticName?: string;
  antibioticTime?: string;
  skinPrep: string;
  normothermia: boolean;
  glycemicControl: boolean;
  glucoseValue?: number;
  oxygenation: boolean;
  notes?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const patientSafetyKeys = {
  all: ['patient-safety'] as const,
  adverseEvents: (params?: AdverseEventParams) => [...patientSafetyKeys.all, 'adverse-events', params] as const,
  deviceTracking: (params?: DeviceTrackingParams) => [...patientSafetyKeys.all, 'device-tracking', params] as const,
  dashboard: (params?: SafetyDashboardParams) => [...patientSafetyKeys.all, 'dashboard', params] as const,
};

// ============================================================================
// Adverse Events (Eventos Adversos)
// ============================================================================

export function useAdverseEvents(params?: AdverseEventParams) {
  return useQuery({
    queryKey: patientSafetyKeys.adverseEvents(params),
    queryFn: async () => {
      const { data } = await api.get<AdverseEvent[]>('/patient-safety/adverse-events', { params });
      return data;
    },
  });
}

export function useReportAdverseEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ReportAdverseEventDto) => {
      const { data } = await api.post<AdverseEvent>('/patient-safety/adverse-events', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientSafetyKeys.adverseEvents() });
      qc.invalidateQueries({ queryKey: patientSafetyKeys.dashboard() });
    },
  });
}

// ============================================================================
// Near Miss (Quase-Erro)
// ============================================================================

export function useReportNearMiss() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ReportNearMissDto) => {
      const { data } = await api.post<NearMissReport>('/patient-safety/near-miss', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientSafetyKeys.dashboard() });
    },
  });
}

// ============================================================================
// Positive Identification (Identificação Positiva)
// ============================================================================

export function useVerifyIdentification() {
  return useMutation({
    mutationFn: async (dto: VerifyIdentificationDto) => {
      const { data } = await api.post<PositiveIdentificationResult>('/patient-safety/positive-identification', dto);
      return data;
    },
  });
}

// ============================================================================
// Allergy Alerts (Alertas de Alergia)
// ============================================================================

export function useConfigureAllergyAlerts() {
  return useMutation({
    mutationFn: async (dto: ConfigureAllergyAlertsDto) => {
      const { data } = await api.post<AllergyAlertConfig>('/patient-safety/allergy-alerts', dto);
      return data;
    },
  });
}

// ============================================================================
// Procedure Timeout (Time-Out Cirúrgico)
// ============================================================================

export function useRecordTimeout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: RecordTimeoutDto) => {
      const { data } = await api.post<ProcedureTimeout>('/patient-safety/procedure-timeout', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientSafetyKeys.dashboard() });
    },
  });
}

// ============================================================================
// Root Cause Analysis (Análise de Causa Raiz)
// ============================================================================

export function useCreateRCA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateRCADto) => {
      const { data } = await api.post<RootCauseAnalysis>('/patient-safety/root-cause-analysis', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientSafetyKeys.adverseEvents() });
      qc.invalidateQueries({ queryKey: patientSafetyKeys.dashboard() });
    },
  });
}

// ============================================================================
// Device Tracking (Rastreamento de Dispositivos)
// ============================================================================

export function useDeviceTracking(params?: DeviceTrackingParams) {
  return useQuery({
    queryKey: patientSafetyKeys.deviceTracking(params),
    queryFn: async () => {
      const { data } = await api.get<DeviceTrackingRecord[]>('/patient-safety/device-tracking', { params });
      return data;
    },
  });
}

// ============================================================================
// Safety Dashboard (Painel de Segurança)
// ============================================================================

export function useSafetyDashboard(params?: SafetyDashboardParams) {
  return useQuery({
    queryKey: patientSafetyKeys.dashboard(params),
    queryFn: async () => {
      const { data } = await api.get<SafetyDashboard>('/patient-safety/dashboard', { params });
      return data;
    },
  });
}

// ============================================================================
// VTE Prophylaxis (Profilaxia de TEV)
// ============================================================================

export function useAssessVteRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AssessVteRiskDto) => {
      const { data } = await api.post<VteRiskAssessment>('/patient-safety/vte-prophylaxis', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientSafetyKeys.dashboard() });
    },
  });
}

// ============================================================================
// SSI Prevention (Prevenção de ISC)
// ============================================================================

export function useRecordSsiChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: RecordSsiChecklistDto) => {
      const { data } = await api.post<SsiChecklist>('/patient-safety/ssi-prevention', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientSafetyKeys.dashboard() });
    },
  });
}
