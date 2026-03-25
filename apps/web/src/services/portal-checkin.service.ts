import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type CheckinStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface CheckinSession {
  id: string;
  appointmentId: string;
  status: CheckinStatus;
  currentStep: number;
  personalDataConfirmed: boolean;
  anamnesisCompleted: boolean;
  termsAccepted: boolean;
  signatureUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnamnesisData {
  chiefComplaint: string;
  currentMedications: string[];
  allergies: string[];
  surgicalHistory: string;
  familyHistory: string;
  additionalNotes: string;
}

export interface PersonalData {
  fullName: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export interface TermsAcceptance {
  consentTreatment: boolean;
  consentDataProcessing: boolean;
  consentTelemedicine: boolean;
  signatureDataUrl: string;
}

export interface CheckinPayload {
  appointmentId: string;
  step: 'personal-data' | 'anamnesis' | 'terms' | 'confirmation';
  personalData?: PersonalData;
  anamnesis?: AnamnesisData;
  terms?: TermsAcceptance;
}

// ============================================================================
// Query Keys
// ============================================================================

export const checkinKeys = {
  all: ['portal-checkin'] as const,
  session: (appointmentId: string) => [...checkinKeys.all, 'session', appointmentId] as const,
  pending: () => [...checkinKeys.all, 'pending'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function usePendingCheckins() {
  return useQuery({
    queryKey: checkinKeys.pending(),
    queryFn: async () => {
      const { data } = await api.get<CheckinSession[]>('/patient-portal/checkin/pending');
      return data;
    },
  });
}

export function useCheckinSession(appointmentId: string) {
  return useQuery({
    queryKey: checkinKeys.session(appointmentId),
    queryFn: async () => {
      const { data } = await api.get<CheckinSession>(
        `/patient-portal/checkin/${appointmentId}`,
      );
      return data;
    },
    enabled: !!appointmentId,
  });
}

export function useStartCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.post<CheckinSession>(
        `/patient-portal/checkin/${appointmentId}/start`,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checkinKeys.all });
    },
  });
}

export function useSaveCheckinStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CheckinPayload) => {
      const { data } = await api.post<CheckinSession>(
        `/patient-portal/checkin/${payload.appointmentId}/save`,
        payload,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: checkinKeys.session(vars.appointmentId) });
    },
  });
}

export function useCompleteCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.post<CheckinSession>(
        `/patient-portal/checkin/${appointmentId}/complete`,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checkinKeys.all });
    },
  });
}
