import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface SinanNotification {
  notificationId: string;
  disease: string;
  cidCode: string;
  patientName?: string;
  status: string;
  notificationDate: string;
  submittedAt?: string;
}

export const interopKeys = {
  all: ['interop-brazil'] as const,
  sinan: (filters?: Record<string, unknown>) => [...interopKeys.all, 'sinan', filters] as const,
};

export function useSinanNotifications(filters?: { status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: interopKeys.sinan(filters),
    queryFn: async () => {
      const { data } = await api.get('/interop-brazil/sinan', { params: filters });
      return data as { data: SinanNotification[]; total: number; page: number; pageSize: number; totalPages: number };
    },
  });
}

export function useCreateSinanNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; disease: string; cidCode: string; symptomOnsetDate: string }) => {
      const { data } = await api.post('/interop-brazil/sinan', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: interopKeys.sinan() });
    },
  });
}

export function useSubmitSinanNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.patch(`/interop-brazil/sinan/${notificationId}/submit`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: interopKeys.sinan() });
    },
  });
}

export function useLookupCns() {
  return useMutation({
    mutationFn: async (cpf: string) => {
      const { data } = await api.get(`/interop-brazil/cadsus/lookup/${cpf}`);
      return data as { cpf: string; cns?: string; fullName?: string; status: string };
    },
  });
}

export function useAutoDetectCompulsoryDisease() {
  return useMutation({
    mutationFn: async (params: { patientId: string; cidCode: string }) => {
      const { data } = await api.get(`/interop-brazil/sinan/auto-detect/${params.patientId}/${params.cidCode}`);
      return data as { isCompulsory: boolean; disease?: string; message: string };
    },
  });
}

export function useSendDigitalPrescription() {
  return useMutation({
    mutationFn: async (params: { prescriptionId: string; pharmacy?: string; channel: string }) => {
      const { data } = await api.post(`/interop-brazil/prescription/${params.prescriptionId}/send`, {
        pharmacy: params.pharmacy,
        channel: params.channel,
      });
      return data;
    },
  });
}

export function useSendWhatsApp() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; templateName: string; templateParams: Record<string, string> }) => {
      const { data } = await api.post('/interop-brazil/whatsapp/send', payload);
      return data;
    },
  });
}

export function useSyncHealthApp() {
  return useMutation({
    mutationFn: async (payload: {
      platform: string;
      data: Array<{ metric: string; value: number; unit: string; recordedAt: string }>;
    }) => {
      const { data } = await api.post('/interop-brazil/health-app/sync', payload);
      return data;
    },
  });
}

export function useExportEsus() {
  return useMutation({
    mutationFn: async (encounterId: string) => {
      const { data } = await api.post(`/interop-brazil/esus/export/${encounterId}`);
      return data;
    },
  });
}
