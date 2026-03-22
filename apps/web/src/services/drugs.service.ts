import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  therapeuticClass: string;
  pharmaceuticalForm: string;
  concentration: string;
  isControlled: boolean;
  controlType: string | null;
  isAntimicrobial: boolean;
  isHighAlert: boolean;
  maxDosePerDay: string | null;
  defaultRoute: string | null;
  defaultFrequency: string | null;
  pregnancyCategory: string | null;
  beersListCriteria: string | null;
  geriatricCaution: boolean;
  pediatricUse: boolean;
  renalAdjustment: boolean;
  hepaticAdjustment: boolean;
  isActive: boolean;
}

export interface DrugWithInteractions extends Drug {
  interactions: Array<{
    id: string;
    otherDrug: { id: string; name: string; activeIngredient: string };
    severity: string;
    effect: string;
    management: string | null;
    mechanism: string;
    evidence: string | null;
  }>;
}

export interface DrugSearchFilters {
  q?: string;
  isControlled?: boolean;
  isAntimicrobial?: boolean;
  isHighAlert?: boolean;
  class?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedDrugs {
  data: Drug[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InteractionResult {
  interactions: Array<{
    drug1: { id: string; name: string; activeIngredient: string };
    drug2: { id: string; name: string; activeIngredient: string };
    severity: string;
    effect: string;
    management: string | null;
    mechanism: string;
    evidence: string | null;
  }>;
  hasSevere: boolean;
}

export interface AllergyConflictResult {
  hasConflict: boolean;
  matchedAllergies: Array<{
    id: string;
    substance: string;
    severity: string;
    reaction: string | null;
  }>;
}

export interface ComprehensiveCheckResult {
  interactions: InteractionResult;
  allergyConflicts: Array<{
    drugId: string;
    drugName: string;
    conflict: AllergyConflictResult;
  }>;
  beersWarnings: Array<{
    drugId: string;
    drugName: string;
    beers: { isOnBeersList: boolean; criteria: string | null };
  }>;
  pregnancyWarnings: Array<{
    drugId: string;
    drugName: string;
    pregnancy: { category: string | null; isSafe: boolean; warning: string };
  }>;
  highAlertDrugs: Array<{ id: string; name: string }>;
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

// ============================================================================
// Query Keys
// ============================================================================

export const drugKeys = {
  all: ['drugs'] as const,
  lists: () => [...drugKeys.all, 'list'] as const,
  list: (filters?: DrugSearchFilters) => [...drugKeys.lists(), filters] as const,
  details: () => [...drugKeys.all, 'detail'] as const,
  detail: (id: string) => [...drugKeys.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Debounced drug search with filters.
 */
export function useDrugSearch(query: string, filters?: Omit<DrugSearchFilters, 'q'>) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const allFilters: DrugSearchFilters = {
    ...filters,
    q: debouncedQuery || undefined,
  };

  return useQuery({
    queryKey: drugKeys.list(allFilters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedDrugs>('/drugs', { params: allFilters });
      return data;
    },
    enabled: debouncedQuery.length >= 2 || Object.values(filters ?? {}).some(Boolean),
  });
}

/**
 * Get drug by ID with interactions.
 */
export function useDrug(id: string) {
  return useQuery({
    queryKey: drugKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<DrugWithInteractions>(`/drugs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Check drug-drug interactions.
 */
export function useCheckInteractions() {
  return useMutation({
    mutationFn: async (drugIds: string[]) => {
      const { data } = await api.post<InteractionResult>('/drugs/check-interactions', { drugIds });
      return data;
    },
  });
}

/**
 * Check drug-allergy conflicts.
 */
export function useCheckAllergy() {
  return useMutation({
    mutationFn: async (payload: { drugId: string; patientId: string }) => {
      const { data } = await api.post<AllergyConflictResult>('/drugs/check-allergy', payload);
      return data;
    },
  });
}

/**
 * Run comprehensive safety check.
 */
export function useComprehensiveCheck() {
  return useMutation({
    mutationFn: async (payload: { drugIds: string[]; patientId: string }) => {
      const { data } = await api.post<ComprehensiveCheckResult>('/drugs/comprehensive-check', payload);
      return data;
    },
  });
}
