import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type ComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SBISCheckItem {
  id: string;
  category: string;
  requirement: string;
  ngsLevel: 'NGS1' | 'NGS2';
  status: ComplianceStatus;
  evidenceUrl?: string;
  notes?: string;
  lastReviewedAt?: string;
  reviewedBy?: string;
}

export interface CFMResolution {
  id: string;
  resolutionNumber: string;
  title: string;
  description: string;
  status: ComplianceStatus;
  applicableDate: string;
  notes?: string;
}

export interface ComplianceScore {
  overall: number;
  ngs1: number;
  ngs2: number;
  totalItems: number;
  compliantItems: number;
  partialItems: number;
  nonCompliantItems: number;
}

export interface ComplianceGap {
  id: string;
  checkItemId: string;
  requirement: string;
  priority: Priority;
  description: string;
  remediation?: string;
  dueDate?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const sbisKeys = {
  all: ['sbis-compliance'] as const,
  checklist: () => [...sbisKeys.all, 'checklist'] as const,
  score: () => [...sbisKeys.all, 'score'] as const,
  gaps: () => [...sbisKeys.all, 'gaps'] as const,
  cfm: () => [...sbisKeys.all, 'cfm'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useSBISChecklist() {
  return useQuery({
    queryKey: sbisKeys.checklist(),
    queryFn: async () => {
      const { data } = await api.get<{ data: SBISCheckItem[]; total: number }>('/compliance/sbis/checklist');
      return data;
    },
  });
}

export function useComplianceScore() {
  return useQuery({
    queryKey: sbisKeys.score(),
    queryFn: async () => {
      const { data } = await api.get<ComplianceScore>('/compliance/sbis/score');
      return data;
    },
  });
}

export function useComplianceGaps() {
  return useQuery({
    queryKey: sbisKeys.gaps(),
    queryFn: async () => {
      const { data } = await api.get<{ data: ComplianceGap[]; total: number }>('/compliance/sbis/gaps');
      return data;
    },
  });
}

export function useCFMResolutions() {
  return useQuery({
    queryKey: sbisKeys.cfm(),
    queryFn: async () => {
      const { data } = await api.get<{ data: CFMResolution[]; total: number }>('/compliance/sbis/cfm');
      return data;
    },
  });
}

export function useUpdateCheckItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      evidenceUrl,
    }: {
      id: string;
      status: ComplianceStatus;
      notes?: string;
      evidenceUrl?: string;
    }) => {
      const { data } = await api.patch<SBISCheckItem>(`/compliance/sbis/checklist/${id}`, {
        status,
        notes,
        evidenceUrl,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sbisKeys.all });
    },
  });
}

export function useSubmitEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ checkItemId, file }: { checkItemId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<{ url: string }>(
        `/compliance/sbis/checklist/${checkItemId}/evidence`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sbisKeys.checklist() });
    },
  });
}
