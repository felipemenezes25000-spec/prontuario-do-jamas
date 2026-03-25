import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface PrescriptionForValidation {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  prescribedBy: string;
  prescribedAt: string;
  items: PrescriptionItemForValidation[];
  status: 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED' | 'MODIFIED';
}

export interface PrescriptionItemForValidation {
  id: string;
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string | null;
  alerts: PharmacyAlert[];
}

export interface PharmacyAlert {
  id: string;
  type: 'RENAL_ADJUSTMENT' | 'HEPATIC_ADJUSTMENT' | 'INTERACTION' | 'ALLERGY' | 'DUPLICATE' | 'DOSE_RANGE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
}

export interface PharmacistIntervention {
  id: string;
  prescriptionId: string;
  patientName: string;
  mrn: string;
  type: 'DOSE_ADJUSTMENT' | 'ROUTE_CHANGE' | 'SUBSTITUTION' | 'SUSPENSION' | 'ADDITION' | 'MONITORING' | 'EDUCATION';
  description: string;
  accepted: boolean | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  createdBy: string;
  createdAt: string;
  impact: 'PREVENTED_HARM' | 'OPTIMIZED_THERAPY' | 'COST_SAVING' | 'EDUCATIONAL';
}

export interface InterventionMetrics {
  totalInterventions: number;
  acceptanceRate: number;
  preventedHarms: number;
  costSavings: number;
  byType: Array<{ type: string; count: number }>;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const clinicalPharmacyKeys = {
  all: ['clinical-pharmacy'] as const,
  pendingValidation: () =>
    [...clinicalPharmacyKeys.all, 'pending-validation'] as const,
  interventions: (filters?: Record<string, unknown>) =>
    [...clinicalPharmacyKeys.all, 'interventions', filters] as const,
  alerts: (patientId: string) =>
    [...clinicalPharmacyKeys.all, 'alerts', patientId] as const,
  metrics: () =>
    [...clinicalPharmacyKeys.all, 'metrics'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function usePendingValidation() {
  return useQuery({
    queryKey: clinicalPharmacyKeys.pendingValidation(),
    queryFn: async () => {
      const { data } = await api.get<PrescriptionForValidation[]>('/clinical-pharmacy/pending-validation');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function usePharmacyAlerts(patientId: string) {
  return useQuery({
    queryKey: clinicalPharmacyKeys.alerts(patientId),
    queryFn: async () => {
      const { data } = await api.get<PharmacyAlert[]>(`/clinical-pharmacy/alerts/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useInterventions(filters?: { type?: string; accepted?: boolean }) {
  return useQuery({
    queryKey: clinicalPharmacyKeys.interventions(filters),
    queryFn: async () => {
      const { data } = await api.get<PharmacistIntervention[]>('/clinical-pharmacy/interventions', { params: filters });
      return data;
    },
  });
}

export function useInterventionMetrics() {
  return useQuery({
    queryKey: clinicalPharmacyKeys.metrics(),
    queryFn: async () => {
      const { data } = await api.get<InterventionMetrics>('/clinical-pharmacy/metrics');
      return data;
    },
  });
}

export function useValidatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { prescriptionId: string; action: 'APPROVE' | 'REJECT' | 'MODIFY'; notes?: string; modifications?: string }) => {
      const { data } = await api.post(`/clinical-pharmacy/validate/${dto.prescriptionId}`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clinicalPharmacyKeys.pendingValidation() });
    },
  });
}

export function useCreateIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      prescriptionId: string;
      type: string;
      description: string;
      impact: string;
    }) => {
      const { data } = await api.post<PharmacistIntervention>('/clinical-pharmacy/interventions', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clinicalPharmacyKeys.interventions() });
      qc.invalidateQueries({ queryKey: clinicalPharmacyKeys.metrics() });
    },
  });
}
