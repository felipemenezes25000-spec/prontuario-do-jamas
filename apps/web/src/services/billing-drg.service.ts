import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type DrgSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface DrgResult {
  drgCode: string;
  drgDescription: string;
  mdc: string;
  mdcDescription: string;
  weight: number;
  averageLos: number;
  expectedCost: number;
  severity: DrgSeverity;
}

export interface EncounterDrgResult extends DrgResult {
  encounterId: string;
  actualLos: number | null;
  losVariance: number | null;
  diagnoses: {
    principal: string;
    secondary: string[];
  };
  procedureCodes: string[];
}

export interface CalculateDrgPayload {
  principalDiagnosis: string;
  secondaryDiagnoses?: string[];
  procedureCodes?: string[];
  age?: number;
  gender?: string;
  dischargeStatus?: string;
  ventilationHours?: number;
}

export interface DrgMixItem {
  mdcCategory: string;
  encounterCount: number;
  totalCost: number;
  averageLos: number;
  averageCost: number;
}

export interface DrgAnalytics {
  totalEncounters: number;
  drgMix: DrgMixItem[];
}

export interface DrgAnalyticsFilters {
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const drgKeys = {
  all: ['billing-drg'] as const,
  calculate: (payload: CalculateDrgPayload) => [...drgKeys.all, 'calculate', payload] as const,
  encounter: (encounterId: string) => [...drgKeys.all, 'encounter', encounterId] as const,
  analytics: (filters?: DrgAnalyticsFilters) => [...drgKeys.all, 'analytics', filters] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Calculates DRG from diagnosis codes (mutation so caller controls when to fire).
 */
export function useCalculateDrg() {
  return useMutation({
    mutationFn: async (payload: CalculateDrgPayload) => {
      const { data } = await api.post<DrgResult>('/billing/drg/calculate', payload);
      return data;
    },
  });
}

/**
 * Get DRG classification derived from an encounter's existing clinical notes.
 */
export function useDrgForEncounter(encounterId: string) {
  return useQuery({
    queryKey: drgKeys.encounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<EncounterDrgResult>(`/billing/drg/encounter/${encounterId}`);
      return data;
    },
    enabled: !!encounterId,
  });
}

/**
 * DRG mix analytics — can be filtered by date range.
 */
export function useDrgAnalytics(filters?: DrgAnalyticsFilters) {
  return useQuery({
    queryKey: drgKeys.analytics(filters),
    queryFn: async () => {
      const { data } = await api.get<DrgAnalytics>('/billing/drg/analytics', { params: filters });
      return data;
    },
  });
}
