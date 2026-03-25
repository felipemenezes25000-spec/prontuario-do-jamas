import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface RevenueExpenseCard {
  label: string;
  value: number;
  previousValue: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercent: number;
}

export interface GlosaRate {
  rate: number;
  totalGlosas: number;
  totalBilled: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface AgingBucket {
  range: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MarginByItem {
  name: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

export interface CashFlowMonth {
  month: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface FinancialDashboardData {
  cards: RevenueExpenseCard[];
  glosaRate: GlosaRate;
  aging: AgingBucket[];
  marginByProcedure: MarginByItem[];
  marginBySector: MarginByItem[];
  cashFlow: CashFlowMonth[];
}

export interface FinancialFilters {
  startDate?: string;
  endDate?: string;
  sector?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

// ============================================================================
// Pre-billing Audit types
// ============================================================================

export interface PreBillingAuditItem {
  encounterId: string;
  patientName: string;
  mrn: string;
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedAction: string;
}

export interface PreBillingAuditResult {
  checkedAt: string;
  totalEncounters: number;
  issuesFound: number;
  items: PreBillingAuditItem[];
}

// ============================================================================
// TISS Batch types
// ============================================================================

export interface TissBatch {
  batchId: string;
  insurer: string;
  totalClaims: number;
  totalValue: number;
  status: 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'PARTIAL';
  createdAt: string;
  sentAt?: string;
}

export interface SendTissBatchPayload {
  insurerCode: string;
  periodStart: string;
  periodEnd: string;
  claimIds?: string[];
}

// ============================================================================
// Glosa Prediction types
// ============================================================================

export interface GlosaPrediction {
  encounterId: string;
  patientName: string;
  procedure: string;
  billedValue: number;
  glosaRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  reason: string;
  recommendation: string;
}

// ============================================================================
// Revenue Leakage types
// ============================================================================

export interface LeakageItem {
  category: string;
  description: string;
  estimatedLoss: number;
  occurrences: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface RevenueLeakageResult {
  totalEstimatedLoss: number;
  analysedPeriod: string;
  items: LeakageItem[];
}

// ============================================================================
// Query Keys
// ============================================================================

export const financialKeys = {
  all: ['billing-financial'] as const,
  dashboard: (filters?: FinancialFilters) => [...financialKeys.all, 'dashboard', filters] as const,
  preBillingAudit: () => [...financialKeys.all, 'pre-billing-audit'] as const,
  tissBatches: () => [...financialKeys.all, 'tiss-batches'] as const,
  glosaPredictions: () => [...financialKeys.all, 'glosa-predictions'] as const,
  revenuLeakage: () => [...financialKeys.all, 'revenue-leakage'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useFinancialDashboard(filters?: FinancialFilters) {
  return useQuery({
    queryKey: financialKeys.dashboard(filters),
    queryFn: async () => {
      const { data } = await api.get<FinancialDashboardData>(
        '/billing/financial/dashboard',
        { params: filters },
      );
      return data;
    },
  });
}

// ============================================================================
// Pre-billing Audit hook
// ============================================================================

export function usePreBillingAudit(enabled = false) {
  return useQuery({
    queryKey: financialKeys.preBillingAudit(),
    queryFn: async () => {
      const { data } = await api.get<PreBillingAuditResult>('/billing/pre-billing-audit');
      return data;
    },
    enabled,
  });
}

// ============================================================================
// TISS Batches
// ============================================================================

export function useTissBatches() {
  return useQuery({
    queryKey: financialKeys.tissBatches(),
    queryFn: async () => {
      const { data } = await api.get<TissBatch[]>('/billing/tiss/batches');
      return data;
    },
  });
}

export function useSendTissBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendTissBatchPayload) => {
      const { data } = await api.post<TissBatch>('/billing/tiss/send', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financialKeys.tissBatches() });
    },
  });
}

// ============================================================================
// Glosa Prediction (IA)
// ============================================================================

export function useGlosaPredictions(enabled = false) {
  return useQuery({
    queryKey: financialKeys.glosaPredictions(),
    queryFn: async () => {
      const { data } = await api.get<GlosaPrediction[]>('/billing/ai/glosa-prediction');
      return data;
    },
    enabled,
  });
}

// ============================================================================
// Revenue Leakage (IA)
// ============================================================================

export function useRevenueLeakage(enabled = false) {
  return useQuery({
    queryKey: financialKeys.revenuLeakage(),
    queryFn: async () => {
      const { data } = await api.get<RevenueLeakageResult>('/billing/ai/revenue-leakage');
      return data;
    },
    enabled,
  });
}
