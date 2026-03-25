import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const rndsKeys = {
  all: ['rnds'] as const,
  status: () => [...rndsKeys.all, 'status'] as const,
  history: () => [...rndsKeys.all, 'history'] as const,
  preview: (encounterId: string) => [...rndsKeys.all, 'preview', encounterId] as const,
};

// ============================================================================
// Types
// ============================================================================

export type SubmissionStatus = 'ENVIADO' | 'ACEITO' | 'REJEITADO' | 'ERRO';
export type SubmissionType = 'RESUMO_ATENDIMENTO' | 'VACINACAO' | 'RESULTADO_EXAME';

export interface RNDSConnectionStatus {
  connected: boolean;
  lastCheckAt: string;
  certificateExpiry: string | null;
  environment: 'HOMOLOGACAO' | 'PRODUCAO';
}

export interface RNDSSubmission {
  id: string;
  type: SubmissionType;
  patientName: string;
  patientCns: string;
  resourceId: string;
  status: SubmissionStatus;
  submittedAt: string;
  responseMessage: string | null;
  fhirBundleId: string | null;
}

export interface FHIRBundlePreview {
  resourceType: string;
  type: string;
  entry: Array<{
    resource: {
      resourceType: string;
      [key: string]: unknown;
    };
  }>;
}

export interface SendEncounterPayload {
  encounterId: string;
}

export interface SendVaccinationPayload {
  patientId: string;
  vaccine: string;
  dose: string;
  lot: string;
  administeredAt: string;
}

export interface SendLabResultPayload {
  patientId: string;
  examCode: string;
  result: string;
  unit: string;
  referenceRange: string;
  collectedAt: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useRNDSStatus() {
  return useQuery({
    queryKey: rndsKeys.status(),
    queryFn: async () => {
      const { data } = await api.get<RNDSConnectionStatus>('/rnds/status');
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useRNDSHistory() {
  return useQuery({
    queryKey: rndsKeys.history(),
    queryFn: async () => {
      const { data } = await api.get<RNDSSubmission[]>('/rnds/submissions');
      return data;
    },
  });
}

export function useFHIRBundlePreview(encounterId: string) {
  return useQuery({
    queryKey: rndsKeys.preview(encounterId),
    queryFn: async () => {
      const { data } = await api.get<FHIRBundlePreview>(`/rnds/preview/${encounterId}`);
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useSendEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendEncounterPayload) => {
      const { data } = await api.post('/rnds/send/encounter', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rndsKeys.history() });
    },
  });
}

export function useSendVaccination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendVaccinationPayload) => {
      const { data } = await api.post('/rnds/send/vaccination', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rndsKeys.history() });
    },
  });
}

export function useSendLabResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendLabResultPayload) => {
      const { data } = await api.post('/rnds/send/lab-result', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rndsKeys.history() });
    },
  });
}
