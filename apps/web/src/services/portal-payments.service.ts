import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface PendingPayment {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  encounterDate: string | null;
  doctorName: string | null;
}

export interface PaymentRecord {
  id: string;
  description: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  installments: number;
  receiptUrl: string | null;
  createdAt: string;
}

export interface ProcessPaymentPayload {
  paymentId: string;
  method: PaymentMethod;
  installments?: number;
  cardToken?: string;
}

export interface PaymentBalance {
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const paymentKeys = {
  all: ['portal-payments'] as const,
  pending: () => [...paymentKeys.all, 'pending'] as const,
  history: (filters?: PaymentFilters) => [...paymentKeys.all, 'history', filters] as const,
  balance: () => [...paymentKeys.all, 'balance'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function usePendingPayments() {
  return useQuery({
    queryKey: paymentKeys.pending(),
    queryFn: async () => {
      const { data } = await api.get<PendingPayment[]>(
        '/patient-portal/payments/pending',
      );
      return data;
    },
  });
}

export function usePaymentHistory(filters?: PaymentFilters) {
  return useQuery({
    queryKey: paymentKeys.history(filters),
    queryFn: async () => {
      const { data } = await api.get<PaymentRecord[]>(
        '/patient-portal/payments/history',
        { params: filters },
      );
      return data;
    },
  });
}

export function usePaymentBalance() {
  return useQuery({
    queryKey: paymentKeys.balance(),
    queryFn: async () => {
      const { data } = await api.get<PaymentBalance>(
        '/patient-portal/payments/balance',
      );
      return data;
    },
  });
}

export function useProcessPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProcessPaymentPayload) => {
      const { data } = await api.post<PaymentRecord>(
        '/patient-portal/payments/process',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}

export function useDownloadReceipt() {
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data } = await api.get<Blob>(
        `/patient-portal/payments/${paymentId}/receipt`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-${paymentId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}
