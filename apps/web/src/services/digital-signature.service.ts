import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type SignatureStatus = 'PENDING' | 'SIGNED' | 'REJECTED' | 'EXPIRED';

export interface PendingDocument {
  id: string;
  documentType: string;
  documentTitle: string;
  patientName: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string | null;
  status: SignatureStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface SignatureRecord {
  id: string;
  documentId: string;
  documentTitle: string;
  signerName: string;
  signerEmail: string;
  certificateType: 'ICP_BRASIL_A1' | 'ICP_BRASIL_A3' | 'CLOUD_CERTIFICATE';
  certificateSubject: string;
  certificateIssuer: string;
  signatureStandard: string;
  signedAt: string;
  verified: boolean;
  verifiedAt: string | null;
}

export interface VerificationResult {
  valid: boolean;
  signerName: string;
  certificateIssuer: string;
  signedAt: string;
  certificateExpiry: string;
  chainValid: boolean;
  timestampValid: boolean;
  errors: string[];
}

export interface SignPayload {
  documentId: string;
  certificateBase64: string;
  certificatePassword: string;
  signatureStandard: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const signatureKeys = {
  all: ['digital-signature'] as const,
  pending: () => [...signatureKeys.all, 'pending'] as const,
  history: () => [...signatureKeys.all, 'history'] as const,
  verification: (id: string) => [...signatureKeys.all, 'verify', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function usePendingDocuments() {
  return useQuery({
    queryKey: signatureKeys.pending(),
    queryFn: async () => {
      const { data } = await api.get<{ data: PendingDocument[]; total: number }>('/digital-signature/pending');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useSignatureHistory(page = 1) {
  return useQuery({
    queryKey: [...signatureKeys.history(), page],
    queryFn: async () => {
      const { data } = await api.get<{
        data: SignatureRecord[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>('/digital-signature/history', { params: { page, pageSize: 20 } });
      return data;
    },
  });
}

export function useSignDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SignPayload) => {
      const { data } = await api.post<SignatureRecord>('/digital-signature/sign', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: signatureKeys.pending() });
      qc.invalidateQueries({ queryKey: signatureKeys.history() });
    },
  });
}

export function useVerifySignature() {
  return useMutation({
    mutationFn: async (signatureId: string) => {
      const { data } = await api.post<VerificationResult>(`/digital-signature/verify/${signatureId}`);
      return data;
    },
  });
}
