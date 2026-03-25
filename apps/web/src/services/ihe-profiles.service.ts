import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const iheKeys = {
  all: ['ihe-profiles'] as const,
  profiles: () => [...iheKeys.all, 'profiles'] as const,
  xdsDocuments: () => [...iheKeys.all, 'xds-documents'] as const,
  pixResults: () => [...iheKeys.all, 'pix'] as const,
  auditTrail: () => [...iheKeys.all, 'atna'] as const,
};

// ============================================================================
// Types
// ============================================================================

export type ComplianceStatus = 'IMPLEMENTADO' | 'PARCIAL' | 'PENDENTE';

export interface IHEProfile {
  id: string;
  acronym: string;
  name: string;
  domain: string;
  description: string;
  complianceStatus: ComplianceStatus;
  lastTestedAt: string | null;
  notes: string;
}

export interface XDSDocument {
  id: string;
  documentUniqueId: string;
  patientId: string;
  patientName: string;
  title: string;
  classCode: string;
  typeCode: string;
  formatCode: string;
  creationTime: string;
  repositoryUniqueId: string;
  size: number;
  hash: string;
  status: 'APROVADO' | 'DEPRECADO';
}

export interface PIXQueryResult {
  patientId: string;
  domains: Array<{
    authority: string;
    identifier: string;
  }>;
  matchConfidence: number;
}

export interface ATNAAuditEntry {
  id: string;
  eventType: string;
  eventAction: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  eventOutcome: 'SUCCESS' | 'MINOR_FAILURE' | 'SERIOUS_FAILURE' | 'MAJOR_FAILURE';
  timestamp: string;
  sourceId: string;
  userId: string;
  patientId: string | null;
  objectId: string | null;
  description: string;
}

export interface PIXQueryPayload {
  patientId: string;
  sourceAuthority: string;
  targetAuthorities: string[];
}

export interface XDSQueryPayload {
  patientId: string;
  classCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useIHEProfiles() {
  return useQuery({
    queryKey: iheKeys.profiles(),
    queryFn: async () => {
      const { data } = await api.get<IHEProfile[]>('/ihe/profiles');
      return data;
    },
  });
}

export function useXDSDocuments() {
  return useQuery({
    queryKey: iheKeys.xdsDocuments(),
    queryFn: async () => {
      const { data } = await api.get<XDSDocument[]>('/ihe/xds/documents');
      return data;
    },
  });
}

export function useATNAAuditTrail() {
  return useQuery({
    queryKey: iheKeys.auditTrail(),
    queryFn: async () => {
      const { data } = await api.get<ATNAAuditEntry[]>('/ihe/atna/audit');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function usePIXQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PIXQueryPayload) => {
      const { data } = await api.post<PIXQueryResult>('/ihe/pix/query', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: iheKeys.pixResults() });
    },
  });
}

export function useXDSQuery() {
  return useMutation({
    mutationFn: async (payload: XDSQueryPayload) => {
      const { data } = await api.post<XDSDocument[]>('/ihe/xds/query', payload);
      return data;
    },
  });
}

export function useXDSRetrieve() {
  return useMutation({
    mutationFn: async (documentUniqueId: string) => {
      const { data } = await api.get(`/ihe/xds/documents/${documentUniqueId}/retrieve`, {
        responseType: 'blob',
      });
      return data;
    },
  });
}
