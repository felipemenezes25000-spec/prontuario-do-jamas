import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface PriceItem {
  code: string;
  description: string;
  unitPrice: number;
  category?: string;
}

export interface PriceTable {
  id: string;
  docId: string;
  tenantId: string;
  name: string;
  description?: string;
  items: PriceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceTablePayload {
  name: string;
  description?: string;
  items: PriceItem[];
}

export interface BudgetItem {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type BudgetStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

export interface Budget {
  docId: string;
  budgetId: string;
  patientId: string;
  patientName?: string;
  priceTableId?: string;
  status: BudgetStatus;
  totalAmount: number;
  validUntil: string;
  itemCount: number;
  notes?: string;
  createdAt: string;
}

export interface BudgetDetail extends Budget {
  items: BudgetItem[];
  statusReason?: string;
  updatedAt: string;
}

export interface CreateBudgetPayload {
  patientId: string;
  priceTableId?: string;
  validDays?: number;
  notes?: string;
  items: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface UpdateBudgetStatusPayload {
  docId: string;
  status: BudgetStatus;
  reason?: string;
}

export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface InstallmentEntry {
  number: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidAt?: string;
}

export interface InstallmentPlan {
  docId: string;
  id: string;
  tenantId: string;
  budgetId: string;
  totalAmount: number;
  downPayment: number;
  installments: number;
  interestRateMonthly: number;
  installmentAmount: number;
  totalWithInterest: number;
  firstDueDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  entries: InstallmentEntry[];
  createdAt: string;
}

export interface CreateInstallmentPlanPayload {
  budgetId: string;
  installments: number;
  downPayment?: number;
  interestRateMonthly?: number;
  firstDueDate?: string;
}

export interface BudgetFilters {
  patientId?: string;
  status?: BudgetStatus;
  page?: number;
  pageSize?: number;
}

export interface PaginatedBudgets {
  data: Budget[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const privatePayKeys = {
  all: ['billing-private-pay'] as const,
  priceTables: () => [...privatePayKeys.all, 'price-tables'] as const,
  budgets: (filters?: BudgetFilters) => [...privatePayKeys.all, 'budgets', filters] as const,
  installments: (budgetId: string) => [...privatePayKeys.all, 'installments', budgetId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function usePriceTables() {
  return useQuery({
    queryKey: privatePayKeys.priceTables(),
    queryFn: async () => {
      const { data } = await api.get<PriceTable[]>('/billing/private-pay/price-tables');
      return data;
    },
  });
}

export function useCreatePriceTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePriceTablePayload) => {
      const { data } = await api.post<PriceTable>('/billing/private-pay/price-tables', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: privatePayKeys.priceTables() });
    },
  });
}

export function useBudgets(filters?: BudgetFilters) {
  return useQuery({
    queryKey: privatePayKeys.budgets(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedBudgets>('/billing/private-pay/budgets', {
        params: filters,
      });
      return data;
    },
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBudgetPayload) => {
      const { data } = await api.post<{ budgetId: string; patientName: string; totalAmount: number; status: BudgetStatus; validUntil: string }>(
        '/billing/private-pay/budgets',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: privatePayKeys.budgets() });
    },
  });
}

export function useUpdateBudgetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, ...dto }: UpdateBudgetStatusPayload) => {
      const { data } = await api.patch<{ docId: string; budgetId: string; status: BudgetStatus }>(
        `/billing/private-pay/budgets/${docId}/status`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: privatePayKeys.budgets() });
    },
  });
}

export function useInstallmentPlans(budgetId: string) {
  return useQuery({
    queryKey: privatePayKeys.installments(budgetId),
    queryFn: async () => {
      const { data } = await api.get<InstallmentPlan[]>(`/billing/private-pay/installments/${budgetId}`);
      return data;
    },
    enabled: !!budgetId,
  });
}

export function useCreateInstallmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInstallmentPlanPayload) => {
      const { data } = await api.post<InstallmentPlan>('/billing/private-pay/installments', payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: privatePayKeys.installments(data.budgetId) });
    },
  });
}
