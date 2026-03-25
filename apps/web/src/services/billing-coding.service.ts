import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface CodingSuggestion {
  id: string;
  code: string;
  system: 'CID10' | 'CBHPM' | 'TUSS';
  description: string;
  confidence: number;
  source: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED';
}

export interface EncounterForCoding {
  id: string;
  patientName: string;
  date: string;
  type: string;
  doctorName: string;
  codingStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  suggestionsCount: number;
}

export interface CodingSearchResult {
  code: string;
  system: 'CID10' | 'CBHPM' | 'TUSS';
  description: string;
}

export interface AcceptCodingPayload {
  suggestionId: string;
  encounterId: string;
  modifiedCode?: string;
  modifiedDescription?: string;
}

export interface CodingFilters {
  status?: string;
  encounterId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const codingKeys = {
  all: ['billing-coding'] as const,
  encounters: (filters?: CodingFilters) => [...codingKeys.all, 'encounters', filters] as const,
  suggestions: (encounterId: string) => [...codingKeys.all, 'suggestions', encounterId] as const,
  search: (query: string, system?: string) => [...codingKeys.all, 'search', query, system] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useEncountersForCoding(filters?: CodingFilters) {
  return useQuery({
    queryKey: codingKeys.encounters(filters),
    queryFn: async () => {
      const { data } = await api.get<EncounterForCoding[]>(
        '/billing/coding/encounters',
        { params: filters },
      );
      return data;
    },
  });
}

export function useCodingSuggestions(encounterId: string) {
  return useQuery({
    queryKey: codingKeys.suggestions(encounterId),
    queryFn: async () => {
      const { data } = await api.get<CodingSuggestion[]>(
        `/billing/coding/encounters/${encounterId}/suggestions`,
      );
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useSearchCodes(query: string, system?: string) {
  return useQuery({
    queryKey: codingKeys.search(query, system),
    queryFn: async () => {
      const { data } = await api.get<CodingSearchResult[]>(
        '/billing/coding/search',
        { params: { q: query, system } },
      );
      return data;
    },
    enabled: query.length >= 2,
  });
}

export function useGenerateSuggestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (encounterId: string) => {
      const { data } = await api.post<CodingSuggestion[]>(
        `/billing/coding/encounters/${encounterId}/generate`,
      );
      return data;
    },
    onSuccess: (_, encounterId) => {
      qc.invalidateQueries({ queryKey: codingKeys.suggestions(encounterId) });
    },
  });
}

export function useAcceptCoding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AcceptCodingPayload) => {
      const { data } = await api.post<CodingSuggestion>(
        `/billing/coding/suggestions/${payload.suggestionId}/accept`,
        payload,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: codingKeys.suggestions(vars.encounterId) });
    },
  });
}

export function useRejectCoding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ suggestionId, encounterId }: { suggestionId: string; encounterId: string }) => {
      await api.post(`/billing/coding/suggestions/${suggestionId}/reject`);
      return encounterId;
    },
    onSuccess: (encounterId) => {
      qc.invalidateQueries({ queryKey: codingKeys.suggestions(encounterId) });
    },
  });
}
