import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export type ReconciliationDecision = 'KEEP' | 'MODIFY' | 'SUSPEND' | 'PENDING';

export interface HomeMedication {
  id: string;
  patientId: string;
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  prescribedBy: string;
  source: 'PATIENT_REPORT' | 'PHARMACY' | 'MEDICAL_RECORD';
}

export interface CurrentPrescriptionItem {
  id: string;
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  prescribedBy: string;
  prescribedAt: string;
}

export interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  homeMedicationId: string | null;
  currentPrescriptionItemId: string | null;
  homeMedicationName: string;
  homeDose: string;
  homeRoute: string;
  homeFrequency: string;
  currentMedicationName: string | null;
  currentDose: string | null;
  currentRoute: string | null;
  currentFrequency: string | null;
  hasDiscrepancy: boolean;
  discrepancyType: 'OMISSION' | 'COMMISSION' | 'DOSE_CHANGE' | 'ROUTE_CHANGE' | 'FREQUENCY_CHANGE' | null;
  decision: ReconciliationDecision;
  decisionNotes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
}

export interface Reconciliation {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  admissionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  items: ReconciliationItem[];
  createdAt: string;
  completedAt: string | null;
  completedBy: string | null;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const medicationReconciliationKeys = {
  all: ['medication-reconciliation'] as const,
  reconciliations: (filters?: Record<string, unknown>) =>
    [...medicationReconciliationKeys.all, 'list', filters] as const,
  reconciliation: (id: string) =>
    [...medicationReconciliationKeys.all, 'detail', id] as const,
  patientHome: (patientId: string) =>
    [...medicationReconciliationKeys.all, 'home', patientId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useReconciliations(filters?: { status?: string }) {
  return useQuery({
    queryKey: medicationReconciliationKeys.reconciliations(filters),
    queryFn: async () => {
      const { data } = await api.get<Reconciliation[]>('/medication-reconciliation', { params: filters });
      return data;
    },
  });
}

export function useReconciliation(id: string) {
  return useQuery({
    queryKey: medicationReconciliationKeys.reconciliation(id),
    queryFn: async () => {
      const { data } = await api.get<Reconciliation>(`/medication-reconciliation/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientHomeMedications(patientId: string) {
  return useQuery({
    queryKey: medicationReconciliationKeys.patientHome(patientId),
    queryFn: async () => {
      const { data } = await api.get<HomeMedication[]>(`/medication-reconciliation/home/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useStartReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; admissionId: string }) => {
      const { data } = await api.post<Reconciliation>('/medication-reconciliation', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicationReconciliationKeys.reconciliations() });
    },
  });
}

export function useRecordDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { reconciliationId: string; itemId: string; decision: ReconciliationDecision; notes?: string }) => {
      const { data } = await api.patch(
        `/medication-reconciliation/${dto.reconciliationId}/items/${dto.itemId}/decision`,
        { decision: dto.decision, notes: dto.notes },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: medicationReconciliationKeys.reconciliation(variables.reconciliationId) });
    },
  });
}

export function useCompleteReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reconciliationId: string) => {
      const { data } = await api.patch(`/medication-reconciliation/${reconciliationId}/complete`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicationReconciliationKeys.reconciliations() });
    },
  });
}
