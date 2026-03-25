import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type ChargeSource = 'MANUAL' | 'AUTO_CAPTURED';
export type ChargeStatus = 'CAPTURED' | 'REVIEWED' | 'BILLED' | 'VOIDED';

export interface ChargeItem {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  codingSystem?: string;
  source: ChargeSource;
}

export interface Charge {
  chargeId: string;
  encounterId: string;
  tenantId: string;
  items: ChargeItem[];
  totalAmount: number;
  status: ChargeStatus;
  notes?: string;
  capturedAt: string;
  billedAt?: string;
}

export interface UnbilledChargeSummary {
  chargeId: string;
  encounterId: string;
  patientName?: string;
  totalAmount: number;
  itemCount: number;
  status: ChargeStatus;
  capturedAt: string;
}

export interface PaginatedUnbilledCharges {
  data: UnbilledChargeSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateChargeCapturePayload {
  encounterId: string;
  autoCapture?: boolean;
  items?: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    codingSystem?: string;
  }>;
}

export interface UpdateChargePayload {
  chargeId: string;
  status?: ChargeStatus;
  notes?: string;
  items?: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    codingSystem?: string;
    source?: ChargeSource;
  }>;
}

export interface UnbilledChargesFilters {
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const chargeCaptureKeys = {
  all: ['charge-capture'] as const,
  encounter: (encounterId: string) => [...chargeCaptureKeys.all, 'encounter', encounterId] as const,
  unbilled: (filters?: UnbilledChargesFilters) => [...chargeCaptureKeys.all, 'unbilled', filters] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Auto-capture or manually add charges for an encounter.
 */
export function useCaptureCharges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateChargeCapturePayload) => {
      const { data } = await api.post<{ chargeId: string; itemCount: number; totalAmount: number; status: ChargeStatus }>(
        '/billing/charge-capture',
        payload,
      );
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: chargeCaptureKeys.encounter(vars.encounterId) });
      qc.invalidateQueries({ queryKey: chargeCaptureKeys.unbilled() });
    },
  });
}

/**
 * Get all charges captured for a specific encounter.
 */
export function useChargesForEncounter(encounterId: string) {
  return useQuery({
    queryKey: chargeCaptureKeys.encounter(encounterId),
    queryFn: async () => {
      const { data } = await api.get<Charge[]>(`/billing/charge-capture/encounter/${encounterId}`);
      return data;
    },
    enabled: !!encounterId,
  });
}

/**
 * Update a charge's items, status, or notes.
 */
export function useUpdateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chargeId, ...dto }: UpdateChargePayload) => {
      const { data } = await api.patch<{ chargeId: string; status: ChargeStatus; totalAmount: number }>(
        `/billing/charge-capture/${chargeId}`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chargeCaptureKeys.all });
    },
  });
}

/**
 * List all unbilled (status=DRAFT/CAPTURED) charges for the tenant.
 */
export function useUnbilledCharges(filters?: UnbilledChargesFilters) {
  return useQuery({
    queryKey: chargeCaptureKeys.unbilled(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedUnbilledCharges>('/billing/charge-capture/unbilled', {
        params: filters,
      });
      return data;
    },
  });
}
