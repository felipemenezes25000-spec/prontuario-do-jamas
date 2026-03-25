import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface SafetyIndicator {
  name: string;
  value: number;
  unit: string;
  count: number;
}

export interface SafetyDashboard {
  period: string;
  estimatedPatientDays: number;
  indicators: SafetyIndicator[];
  totalIncidents: number;
}

export interface NearMissReport {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface AllergyAlert {
  patientId: string;
  patientName: string;
  hasAllergies: boolean;
  alertLevel: string;
  allergies: string[];
  displayIcon: string | null;
  wristbandColor: string;
  prescriptionPopup: boolean;
}

export interface ReadmissionPrediction {
  patientId: string;
  patientName: string;
  readmissionRisk: number;
  riskLevel: string;
  riskFactors: string[];
  recommendations: string[];
}

export interface MedicationErrorDetection {
  period: string;
  totalChecks: number;
  missedDoses: number;
  lateAdministrations: number;
  alerts: Array<{
    type: string;
    severity: string;
    patientName: string;
    medication: string;
    detail: string;
  }>;
  alertCount: number;
}

export interface FMEAResult {
  id: string;
  processName: string;
  totalFailureModes: number;
  criticalItems: number;
  topRisks: Array<{
    step: string;
    failureMode: string;
    rpn: number;
    severity: number;
    occurrence: number;
    detection: number;
  }>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const safetyKeys = {
  all: ['safety-enhanced'] as const,
  indicators: () => [...safetyKeys.all, 'indicators'] as const,
  allergyAlerts: (patientId: string) => [...safetyKeys.all, 'allergy', patientId] as const,
  readmission: (patientId: string) => [...safetyKeys.all, 'readmission', patientId] as const,
  medicationErrors: () => [...safetyKeys.all, 'medication-errors'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useSafetyIndicators() {
  return useQuery({
    queryKey: safetyKeys.indicators(),
    queryFn: async () => {
      const { data } = await api.get<SafetyDashboard>('/incident-reporting/safety-indicators');
      return data;
    },
  });
}

export function useAllergyAlerts(patientId: string) {
  return useQuery({
    queryKey: safetyKeys.allergyAlerts(patientId),
    queryFn: async () => {
      const { data } = await api.get<AllergyAlert>(`/incident-reporting/allergy-alerts/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useReportNearMiss() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      description: string;
      location?: string;
      interceptedBy?: string;
      howIntercepted: string;
      potentialConsequence: string;
      patientId?: string;
      anonymous?: boolean;
    }) => {
      const { data } = await api.post<NearMissReport>('/incident-reporting/near-miss', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: safetyKeys.indicators() }),
  });
}

export function useRecordTimeout() {
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      encounterId?: string;
      procedureName: string;
      procedureType: string;
      checklist: Array<{ item: string; confirmed: boolean }>;
      teamMembers: string[];
      site?: string;
      laterality?: string;
    }) => {
      const { data } = await api.post('/incident-reporting/timeout', dto);
      return data;
    },
  });
}

export function useVerifyIdentification() {
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      encounterId?: string;
      procedureType: string;
      identifier1Type: string;
      identifier1Value: string;
      identifier2Type: string;
      identifier2Value: string;
      verified: boolean;
    }) => {
      const { data } = await api.post('/incident-reporting/positive-identification', dto);
      return data;
    },
  });
}

export function usePredictReadmission(patientId: string) {
  return useQuery({
    queryKey: safetyKeys.readmission(patientId),
    queryFn: async () => {
      const { data } = await api.get<ReadmissionPrediction>(
        `/incident-reporting/ai/predict-readmission/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useDetectMedicationErrors() {
  return useQuery({
    queryKey: safetyKeys.medicationErrors(),
    queryFn: async () => {
      const { data } = await api.get<MedicationErrorDetection>(
        '/incident-reporting/ai/medication-error-detection',
      );
      return data;
    },
    refetchInterval: 120000, // 2 min
  });
}

export function useCreateFMEA() {
  return useMutation({
    mutationFn: async (dto: {
      processName: string;
      teamMembers: string[];
      failureModes: Array<{
        step: string;
        failureMode: string;
        effect: string;
        severity: number;
        occurrence: number;
        detection: number;
        currentControls?: string;
        recommendedActions?: string;
        responsible?: string;
      }>;
    }) => {
      const { data } = await api.post<FMEAResult>('/incident-reporting/fmea', dto);
      return data;
    },
  });
}
