import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const governanceKeys = {
  all: ['governance'] as const,
  dpoDashboard: () => [...governanceKeys.all, 'dpo'] as const,
  portability: () => [...governanceKeys.all, 'portability'] as const,
  sessionConfig: () => [...governanceKeys.all, 'session'] as const,
  passwordPolicy: () => [...governanceKeys.all, 'password'] as const,
  dpia: () => [...governanceKeys.all, 'dpia'] as const,
  sensitiveData: () => [...governanceKeys.all, 'sensitive'] as const,
  accreditation: (s: string) => [...governanceKeys.all, 'accreditation', s] as const,
};

export function useDpoDashboard() {
  return useQuery({
    queryKey: governanceKeys.dpoDashboard(),
    queryFn: async () => { const { data } = await api.get('/governance/dpo/dashboard'); return data; },
  });
}

export function usePortabilityRequests() {
  return useQuery({
    queryKey: governanceKeys.portability(),
    queryFn: async () => { const { data } = await api.get('/governance/lgpd/portability'); return data; },
  });
}

export function useRequestPortability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patientId: string) => {
      const { data } = await api.post('/governance/lgpd/portability', { patientId });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: governanceKeys.portability() }); },
  });
}

export function useSessionConfig() {
  return useQuery({
    queryKey: governanceKeys.sessionConfig(),
    queryFn: async () => { const { data } = await api.get('/governance/session-config'); return data; },
  });
}

export function usePasswordPolicy() {
  return useQuery({
    queryKey: governanceKeys.passwordPolicy(),
    queryFn: async () => { const { data } = await api.get('/governance/password-policy'); return data; },
  });
}

export function useDpiaAssessments() {
  return useQuery({
    queryKey: governanceKeys.dpia(),
    queryFn: async () => { const { data } = await api.get('/governance/dpia'); return data; },
  });
}

export function useSensitiveDataConfig() {
  return useQuery({
    queryKey: governanceKeys.sensitiveData(),
    queryFn: async () => { const { data } = await api.get('/governance/sensitive-data'); return data; },
  });
}

export function useAccreditationChecklist(standard: string) {
  return useQuery({
    queryKey: governanceKeys.accreditation(standard),
    queryFn: async () => { const { data } = await api.get('/governance/accreditation-checklist', { params: { standard } }); return data; },
    enabled: !!standard,
  });
}
