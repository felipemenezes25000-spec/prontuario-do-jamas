import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export type AntimicrobialStatus = 'ATIVO' | 'CONCLUIDO' | 'SUSPENSO';

export interface AntimicrobialUsage {
  id: string;
  patientId: string;
  patientName: string;
  drug: string;
  startDate: string;
  endDate: string | null;
  ddd: number;              // Defined Daily Dose
  indication: string;
  culture: string | null;
  sensitivity: string | null;
  deescalated: boolean;
  status: AntimicrobialStatus;
}

export interface AntibioticSensitivity {
  name: string;
  sensitivity: number; // percentage 0-100
}

export interface InstitutionalAntibiogram {
  organism: string;
  antibiotics: AntibioticSensitivity[];
}

export interface StewDashboard {
  totalDDD: number;
  avgDuration: number;          // days
  deescalationRate: number;     // percentage
  cultureComplianceRate: number; // percentage
}

export interface CreateUsageRecordDto {
  patientId: string;
  drug: string;
  startDate: string;
  indication: string;
  culture?: string;
  sensitivity?: string;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const antimicrobialKeys = {
  all: ['antimicrobial-stewardship'] as const,
  usage: (params?: Record<string, unknown>) =>
    [...antimicrobialKeys.all, 'usage', params] as const,
  antibiogram: () =>
    [...antimicrobialKeys.all, 'antibiogram'] as const,
  dashboard: (period?: string) =>
    [...antimicrobialKeys.all, 'dashboard', period] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useAntimicrobialUsage(params?: { status?: AntimicrobialStatus; patientId?: string }) {
  return useQuery({
    queryKey: antimicrobialKeys.usage(params),
    queryFn: async () => {
      const { data } = await api.get<AntimicrobialUsage[]>('/antimicrobial-stewardship/usage', { params });
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useAntibiogram() {
  return useQuery({
    queryKey: antimicrobialKeys.antibiogram(),
    queryFn: async () => {
      const { data } = await api.get<InstitutionalAntibiogram[]>('/antimicrobial-stewardship/antibiogram');
      return data;
    },
  });
}

export function useStewDashboard(period?: string) {
  return useQuery({
    queryKey: antimicrobialKeys.dashboard(period),
    queryFn: async () => {
      const { data } = await api.get<StewDashboard>('/antimicrobial-stewardship/dashboard', {
        params: period ? { period } : undefined,
      });
      return data;
    },
  });
}

export function useCreateUsageRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateUsageRecordDto) => {
      const { data } = await api.post<AntimicrobialUsage>('/antimicrobial-stewardship/usage', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: antimicrobialKeys.usage() });
      qc.invalidateQueries({ queryKey: antimicrobialKeys.dashboard() });
    },
  });
}

export function useDeescalate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/antimicrobial-stewardship/usage/${id}/deescalate`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: antimicrobialKeys.usage() });
      qc.invalidateQueries({ queryKey: antimicrobialKeys.dashboard() });
    },
  });
}
