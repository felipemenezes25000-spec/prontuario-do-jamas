import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Patient,
  PaginatedResponse,
  Allergy,
  ChronicCondition,
  CreatePatientDto,
  CreateAllergyDto,
  CreateConditionDto,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface PatientFilters {
  search?: string;
  tags?: string[];
  insuranceProvider?: string;
  riskLevel?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters?: PatientFilters) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  allergies: (patientId: string) => [...patientKeys.detail(patientId), 'allergies'] as const,
  conditions: (patientId: string) => [...patientKeys.detail(patientId), 'conditions'] as const,
  history: (patientId: string) => [...patientKeys.detail(patientId), 'history'] as const,
  search: (query: string) => [...patientKeys.all, 'search', query] as const,
};

// ============================================================================
// Hooks — Patients CRUD
// ============================================================================

export function usePatients(filters?: PatientFilters) {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Patient>>('/patients', { params: filters });
      return data;
    },
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Patient>(`/patients/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSearchPatients(query: string) {
  return useQuery({
    queryKey: patientKeys.search(query),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Patient>>('/patients', {
        params: { search: query, limit: 20 },
      });
      return data;
    },
    enabled: query.length >= 2,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patient: CreatePatientDto) => {
      const { data } = await api.post<Patient>('/patients', patient);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
      const { data } = await api.patch<Patient>(`/patients/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
      qc.invalidateQueries({ queryKey: patientKeys.detail(vars.id) });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/patients/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

// ============================================================================
// Hooks — Allergies
// ============================================================================

export function usePatientAllergies(patientId: string) {
  return useQuery({
    queryKey: patientKeys.allergies(patientId),
    queryFn: async () => {
      const { data } = await api.get<Allergy[]>(`/patients/${patientId}/allergies`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateAllergy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (allergy: CreateAllergyDto) => {
      const { data } = await api.post<Allergy>(`/patients/${allergy.patientId}/allergies`, allergy);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: patientKeys.allergies(vars.patientId) });
      qc.invalidateQueries({ queryKey: patientKeys.detail(vars.patientId) });
    },
  });
}

export function useDeleteAllergy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, allergyId }: { patientId: string; allergyId: string }) => {
      await api.delete(`/patients/${patientId}/allergies/${allergyId}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: patientKeys.allergies(vars.patientId) });
      qc.invalidateQueries({ queryKey: patientKeys.detail(vars.patientId) });
    },
  });
}

// ============================================================================
// Hooks — Chronic Conditions
// ============================================================================

export function usePatientConditions(patientId: string) {
  return useQuery({
    queryKey: patientKeys.conditions(patientId),
    queryFn: async () => {
      const { data } = await api.get<ChronicCondition[]>(`/patients/${patientId}/conditions`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (condition: CreateConditionDto) => {
      const { data } = await api.post<ChronicCondition>(
        `/patients/${condition.patientId}/conditions`,
        condition,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: patientKeys.conditions(vars.patientId) });
      qc.invalidateQueries({ queryKey: patientKeys.detail(vars.patientId) });
    },
  });
}

export function useUpdateCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      patientId,
      conditionId,
      ...updates
    }: Partial<ChronicCondition> & { patientId: string; conditionId: string }) => {
      const { data } = await api.patch<ChronicCondition>(
        `/patients/${patientId}/conditions/${conditionId}`,
        updates,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: patientKeys.conditions(vars.patientId) });
    },
  });
}

// ============================================================================
// Hooks — Patient History
// ============================================================================

export function usePatientHistory(patientId: string) {
  return useQuery({
    queryKey: patientKeys.history(patientId),
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>>(`/patients/${patientId}/history`);
      return data;
    },
    enabled: !!patientId,
  });
}
