import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface PositiveCulture {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  examName: string;
  microorganism: string;
  sensitivity: string;
  collectedAt: string | null;
  completedAt: string | null;
}

export interface IsolationPatient {
  admissionId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  isolationType: 'CONTACT' | 'DROPLET' | 'AIRBORNE' | 'PROTECTIVE' | 'COMBINED';
  isolationReason: string | null;
  isolationStartDate: string;
  admissionDate: string;
}

export interface InfectionDashboardData {
  infectionsBySector: Array<{ sector: string; count: number }>;
  topMicroorganisms: Array<{ name: string; count: number }>;
  resistanceProfile: Array<{
    microorganism: string;
    antibiotic: string;
    result: 'SENSITIVE' | 'RESISTANT' | 'INTERMEDIATE';
  }>;
  monthlyInfections: Array<{ month: string; count: number }>;
}

export interface NotifiableDisease {
  name: string;
  cidCode: string;
}

export interface CompulsoryNotificationEntry {
  id: string;
  patientId: string;
  disease: string;
  cidCode: string;
  notificationDate: string;
  symptomsDate: string;
  notifiedBy: string;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const infectionControlKeys = {
  all: ['infection-control'] as const,
  positiveCultures: (filters?: Record<string, unknown>) =>
    [...infectionControlKeys.all, 'positive-cultures', filters] as const,
  isolationPatients: () =>
    [...infectionControlKeys.all, 'isolation-patients'] as const,
  dashboard: () =>
    [...infectionControlKeys.all, 'dashboard'] as const,
  notifiableDiseases: () =>
    [...infectionControlKeys.all, 'notifiable-diseases'] as const,
  notifications: (filters?: Record<string, unknown>) =>
    [...infectionControlKeys.all, 'notifications', filters] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function usePositiveCultures(filters?: {
  page?: number;
  pageSize?: number;
  days?: number;
}) {
  return useQuery({
    queryKey: infectionControlKeys.positiveCultures(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PositiveCulture>>(
        '/infection-control/positive-cultures',
        { params: filters },
      );
      return data;
    },
  });
}

export function useIsolationPatients() {
  return useQuery({
    queryKey: infectionControlKeys.isolationPatients(),
    queryFn: async () => {
      const { data } = await api.get<IsolationPatient[]>(
        '/infection-control/isolation-patients',
      );
      return data;
    },
  });
}

export function useStartIsolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      admissionId: string;
      isolationType: string;
      reason: string;
    }) => {
      const { data } = await api.post('/infection-control/isolation', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infectionControlKeys.isolationPatients() });
    },
  });
}

export function useEndIsolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (admissionId: string) => {
      const { data } = await api.patch(
        `/infection-control/isolation/${admissionId}/end`,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infectionControlKeys.isolationPatients() });
    },
  });
}

export function useInfectionDashboard() {
  return useQuery({
    queryKey: infectionControlKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<InfectionDashboardData>(
        '/infection-control/dashboard',
      );
      return data;
    },
  });
}

export function useNotifiableDiseases() {
  return useQuery({
    queryKey: infectionControlKeys.notifiableDiseases(),
    queryFn: async () => {
      const { data } = await api.get<NotifiableDisease[]>(
        '/infection-control/notifiable-diseases',
      );
      return data;
    },
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      patientId: string;
      cidCode: string;
      disease: string;
      notificationDate: string;
      symptomsDate: string;
      confirmationCriteria: string;
      observations?: string;
    }) => {
      const { data } = await api.post('/infection-control/notification', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infectionControlKeys.notifications() });
    },
  });
}

export function useCompulsoryNotifications(filters?: {
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: infectionControlKeys.notifications(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CompulsoryNotificationEntry>>(
        '/infection-control/notifications',
        { params: filters },
      );
      return data;
    },
  });
}
