import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type SubjectRequestType =
  | 'ACCESS'
  | 'PORTABILITY'
  | 'DELETION'
  | 'RECTIFICATION'
  | 'ANONYMIZATION'
  | 'OBJECTION';

export type SubjectRequestStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DENIED';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';

export interface ConsentByType {
  type: string;
  count: number;
}

export interface DataAccessDay {
  date: string;
  count: number;
}

export interface SubjectRequest {
  id: string;
  type: SubjectRequestType;
  patientId: string;
  requestedBy: string;
  description: string;
  status: SubjectRequestStatus;
  deadline: string | null;
  response: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DataIncident {
  id: string;
  severity: IncidentSeverity;
  affectedRecords: number;
  description: string;
  containmentActions: string;
  notifiedAnpd: boolean;
  status: IncidentStatus;
  timeline: Array<{ status: string; timestamp: string; note?: string }>;
  createdAt: string;
}

export interface Dpia {
  id: string;
  processName: string;
  purpose: string;
  dataCategories: string[];
  risks: string[];
  mitigationMeasures: string[];
  riskLevel: string;
  createdAt: string;
}

export interface DpoDashboard {
  totalConsents: number;
  activeConsents: number;
  revokedConsents: number;
  consentsByType: ConsentByType[];
  dataAccessLogsByDay: DataAccessDay[];
  pendingSubjectRequests: Array<{
    id: string;
    title: string;
    content: string | null;
    status: string;
    createdAt: string;
  }>;
  anonymizationsPerformed: number;
  categoriesAtRisk: string[];
  complianceScore: number;
}

// ============================================================================
// Hooks
// ============================================================================

export function useDpoDashboard() {
  return useQuery<DpoDashboard>({
    queryKey: ['lgpd', 'dpo-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DpoDashboard>('/lgpd/dpo/dashboard');
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useSubjectRequests(filters?: {
  status?: SubjectRequestStatus;
  type?: SubjectRequestType;
}) {
  return useQuery<SubjectRequest[]>({
    queryKey: ['lgpd', 'subject-requests', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);
      const { data } = await api.get<SubjectRequest[]>(
        `/lgpd/subject-requests?${params.toString()}`,
      );
      return data;
    },
  });
}

export function useCreateSubjectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      type: SubjectRequestType;
      patientId: string;
      requestedBy: string;
      description: string;
    }) => {
      const { data } = await api.post('/lgpd/subject-requests', dto);
      return data as SubjectRequest;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lgpd'] });
    },
  });
}

export function useUpdateSubjectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      status: SubjectRequestStatus;
      response?: string;
    }) => {
      const { data } = await api.put(
        `/lgpd/subject-requests/${params.requestId}`,
        { status: params.status, response: params.response },
      );
      return data as SubjectRequest;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lgpd'] });
    },
  });
}

export function useDataIncidents() {
  return useQuery<DataIncident[]>({
    queryKey: ['lgpd', 'incidents'],
    queryFn: async () => {
      const { data } = await api.get<DataIncident[]>('/lgpd/incidents');
      return data;
    },
  });
}

export function useCreateDataIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      severity: IncidentSeverity;
      affectedRecords: number;
      description: string;
      containmentActions: string;
      notifiedAnpd: boolean;
    }) => {
      const { data } = await api.post('/lgpd/incidents', dto);
      return data as DataIncident;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lgpd'] });
    },
  });
}

export function useDpias() {
  return useQuery<Dpia[]>({
    queryKey: ['lgpd', 'dpias'],
    queryFn: async () => {
      const { data } = await api.get<Dpia[]>('/lgpd/dpia');
      return data;
    },
  });
}

export function useCreateDpia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      processName: string;
      purpose: string;
      dataCategories: string[];
      risks: string[];
      mitigationMeasures: string[];
    }) => {
      const { data } = await api.post('/lgpd/dpia', dto);
      return data as Dpia;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lgpd'] });
    },
  });
}
