import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
export type IncidentSeverity = 'NEAR_MISS' | 'MILD' | 'MODERATE' | 'SEVERE' | 'SENTINEL';
export type IncidentType = 'MEDICATION' | 'FALL' | 'PROCEDURE' | 'IDENTIFICATION' | 'INFECTION' | 'EQUIPMENT' | 'COMMUNICATION' | 'OTHER';

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  location: string;
  patientId: string | null;
  patientName: string | null;
  reportedBy: string;
  reportedAt: string;
  resolvedAt: string | null;
  rootCauseAnalysis: string | null;
}

export interface IncidentActionPlan {
  id: string;
  incidentId: string;
  action: string;
  responsible: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  completedAt: string | null;
}

export interface IncidentDashboardData {
  totalOpen: number;
  totalInvestigating: number;
  totalResolved: number;
  totalClosed: number;
  byType: Array<{ type: IncidentType; count: number }>;
  bySeverity: Array<{ severity: IncidentSeverity; count: number }>;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const incidentReportingKeys = {
  all: ['incident-reporting'] as const,
  incidents: (filters?: Record<string, unknown>) =>
    [...incidentReportingKeys.all, 'incidents', filters] as const,
  incident: (id: string) =>
    [...incidentReportingKeys.all, 'incident', id] as const,
  actionPlans: (incidentId: string) =>
    [...incidentReportingKeys.all, 'action-plans', incidentId] as const,
  dashboard: () =>
    [...incidentReportingKeys.all, 'dashboard'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useIncidents(filters?: { status?: string; type?: string; severity?: string }) {
  return useQuery({
    queryKey: incidentReportingKeys.incidents(filters),
    queryFn: async () => {
      const { data } = await api.get<Incident[]>('/incident-reporting/incidents', { params: filters });
      return data;
    },
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentReportingKeys.incident(id),
    queryFn: async () => {
      const { data } = await api.get<Incident>(`/incident-reporting/incidents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useActionPlans(incidentId: string) {
  return useQuery({
    queryKey: incidentReportingKeys.actionPlans(incidentId),
    queryFn: async () => {
      const { data } = await api.get<IncidentActionPlan[]>(`/incident-reporting/incidents/${incidentId}/action-plans`);
      return data;
    },
    enabled: !!incidentId,
  });
}

export function useIncidentDashboard() {
  return useQuery({
    queryKey: incidentReportingKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<IncidentDashboardData>('/incident-reporting/dashboard');
      return data;
    },
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      type: IncidentType;
      severity: IncidentSeverity;
      title: string;
      description: string;
      location: string;
      patientId?: string;
    }) => {
      const { data } = await api.post<Incident>('/incident-reporting/incidents', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incidentReportingKeys.incidents() });
      qc.invalidateQueries({ queryKey: incidentReportingKeys.dashboard() });
    },
  });
}

export function useUpdateIncidentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { id: string; status: IncidentStatus; rootCauseAnalysis?: string }) => {
      const { data } = await api.patch(`/incident-reporting/incidents/${dto.id}/status`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incidentReportingKeys.incidents() });
      qc.invalidateQueries({ queryKey: incidentReportingKeys.dashboard() });
    },
  });
}

export function useCreateActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { incidentId: string; action: string; responsible: string; dueDate: string }) => {
      const { data } = await api.post<IncidentActionPlan>(`/incident-reporting/incidents/${dto.incidentId}/action-plans`, dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: incidentReportingKeys.actionPlans(variables.incidentId) });
    },
  });
}
