import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ClinicalNote,
  PaginatedResponse,
  NoteType,
  CreateClinicalNoteDto,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface ClinicalNoteFilters {
  encounterId?: string;
  authorId?: string;
  type?: NoteType;
  status?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const clinicalNoteKeys = {
  all: ['clinical-notes'] as const,
  lists: () => [...clinicalNoteKeys.all, 'list'] as const,
  list: (filters?: ClinicalNoteFilters) => [...clinicalNoteKeys.lists(), filters] as const,
  details: () => [...clinicalNoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...clinicalNoteKeys.details(), id] as const,
  byEncounter: (encounterId: string) =>
    [...clinicalNoteKeys.all, 'encounter', encounterId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useClinicalNotes(filters?: ClinicalNoteFilters) {
  return useQuery({
    queryKey: clinicalNoteKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ClinicalNote>>('/clinical-notes', {
        params: filters,
      });
      return data;
    },
  });
}

export function useClinicalNote(id: string) {
  return useQuery({
    queryKey: clinicalNoteKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ClinicalNote>(`/clinical-notes/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useEncounterNotes(encounterId: string) {
  return useQuery({
    queryKey: clinicalNoteKeys.byEncounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<ClinicalNote[]>('/clinical-notes', {
        params: { encounterId },
      });
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useCreateClinicalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: CreateClinicalNoteDto) => {
      const { data } = await api.post<ClinicalNote>('/clinical-notes', note);
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.lists() });
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.byEncounter(result.encounterId) });
    },
  });
}

export function useUpdateClinicalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClinicalNote> & { id: string }) => {
      const { data } = await api.patch<ClinicalNote>(`/clinical-notes/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.lists() });
    },
  });
}

export function useSignClinicalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ClinicalNote>(`/clinical-notes/${id}/sign`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.detail(id) });
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.all });
    },
  });
}

export function useCosignClinicalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ClinicalNote>(`/clinical-notes/${id}/cosign`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.detail(id) });
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.all });
    },
  });
}

export function useAddAddendum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      parentNoteId,
      content,
    }: {
      parentNoteId: string;
      content: string;
    }) => {
      const { data } = await api.post<ClinicalNote>(
        `/clinical-notes/${parentNoteId}/addendum`,
        { freeText: content, type: 'ADDENDUM' as const },
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.all });
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.byEncounter(result.encounterId) });
    },
  });
}

export function useVoidClinicalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<ClinicalNote>(`/clinical-notes/${id}/void`, { reason });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: clinicalNoteKeys.all });
    },
  });
}
