import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface RequisitionItem {
  itemName: string;
  quantity: number;
  unit: string;
  specification: string;
  urgency: string;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  items: RequisitionItem[];
  requestedBy: string;
  department: string;
  justification: string;
  status: string;
  createdAt: string;
}

export interface QuotationItem {
  itemName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  requisitionId: string;
  supplierName: string;
  items: QuotationItem[];
  totalValue: number;
  deliveryDays: number;
  paymentTerms: string;
  validUntil: string;
  approved: boolean;
  createdAt: string;
}

export interface ProcurementDashboard {
  openRequisitions: number;
  pendingApprovals: number;
  totalSpendThisMonth: number;
  savingsThisMonth: number;
  recentRequisitions: Requisition[];
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const procurementKeys = {
  all: ['procurement'] as const,
  requisitions: (filters?: Record<string, unknown>) => [...procurementKeys.all, 'requisitions', filters] as const,
  dashboard: () => [...procurementKeys.all, 'dashboard'] as const,
  compare: (reqId: string) => [...procurementKeys.all, 'compare', reqId] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useRequisitions(filters?: { status?: string; department?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: procurementKeys.requisitions(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Requisition>>('/procurement/requisitions', { params: filters });
      return data;
    },
  });
}

export function useProcurementDashboard() {
  return useQuery({
    queryKey: procurementKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<ProcurementDashboard>('/procurement/dashboard');
      return data;
    },
  });
}

export function useCompareQuotations(requisitionId: string) {
  return useQuery({
    queryKey: procurementKeys.compare(requisitionId),
    queryFn: async () => {
      const { data } = await api.get(`/procurement/requisitions/${requisitionId}/compare`);
      return data;
    },
    enabled: Boolean(requisitionId),
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      items: Array<{ itemName: string; quantity: number; unit: string; specification: string; urgency: string }>;
      requestedBy: string;
      department: string;
      justification: string;
    }) => {
      const { data } = await api.post('/procurement/requisitions', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: procurementKeys.all });
    },
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      requisitionId: string;
      supplierName: string;
      items: Array<{ itemName: string; unitPrice: number; quantity: number; totalPrice: number }>;
      deliveryDays: number;
      paymentTerms: string;
      validUntil: string;
    }) => {
      const { data } = await api.post('/procurement/quotations', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: procurementKeys.all });
    },
  });
}

export function useApproveQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { quotationId: string; approvedBy: string; notes?: string }) => {
      const { data } = await api.patch('/procurement/quotations/approve', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: procurementKeys.all });
    },
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { quotationId: string }) => {
      const { data } = await api.post('/procurement/purchase-orders', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: procurementKeys.all });
    },
  });
}

export function useRecordDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { purchaseOrderId: string; receivedBy: string; notes?: string }) => {
      const { data } = await api.patch('/procurement/delivery', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: procurementKeys.all });
    },
  });
}
