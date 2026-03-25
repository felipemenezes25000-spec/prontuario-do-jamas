import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Cardiology Scores ───────────────────────────────────────────────────

export function useFramingham() {
  return useMutation({
    mutationFn: async (p: { age: number; gender: string; totalCholesterol: number; hdl: number; systolicBP: number; smoker: boolean; diabetic: boolean; bpTreated: boolean }) => {
      const { data } = await api.post('/cardiology/scores/framingham', p);
      return data;
    },
  });
}

export function useAscvd() {
  return useMutation({
    mutationFn: async (p: { age: number; gender: string; race: string; totalCholesterol: number; hdl: number; systolicBP: number; bpTreated: boolean; diabetic: boolean; smoker: boolean }) => {
      const { data } = await api.post('/cardiology/scores/ascvd', p);
      return data;
    },
  });
}

export function useChadsVasc() {
  return useMutation({
    mutationFn: async (p: { chf: boolean; hypertension: boolean; age: number; diabetes: boolean; stroke: boolean; vascularDisease: boolean; gender: string }) => {
      const { data } = await api.post('/cardiology/scores/chads-vasc', p);
      return data;
    },
  });
}

// ─── Nephrology ──────────────────────────────────────────────────────────

export function useCkdEpi() {
  return useMutation({
    mutationFn: async (p: { creatinine: number; age: number; gender: string }) => {
      const { data } = await api.post('/specialties/nephrology/ckd-epi', p);
      return data;
    },
  });
}

// ─── Neurology ───────────────────────────────────────────────────────────

export function useMRankin() {
  return useMutation({
    mutationFn: async (p: { score: number }) => {
      const { data } = await api.post('/specialties/neurology/mrankin', p);
      return data;
    },
  });
}

// ─── Rheumatology ────────────────────────────────────────────────────────

export function useDas28() {
  return useMutation({
    mutationFn: async (p: { tenderJoints: number; swollenJoints: number; esr: number; patientGlobalAssessment: number }) => {
      const { data } = await api.post('/specialties/rheumatology/das28', p);
      return data;
    },
  });
}

// ─── Pulmonology ─────────────────────────────────────────────────────────

export function useSpirometry() {
  return useMutation({
    mutationFn: async (p: { fev1: number; fvc: number; fev1Predicted: number; age: number }) => {
      const { data } = await api.post('/specialties/pulmonology/spirometry', p);
      return data;
    },
  });
}

// ─── Endocrinology ───────────────────────────────────────────────────────

export function useInsulinProtocol() {
  return useMutation({
    mutationFn: async (p: { patientId: string; currentGlycemia: number; weight: number; type: string }) => {
      const { data } = await api.post('/specialties/endocrinology/insulin-protocol', p);
      return data;
    },
  });
}

// ─── Gynecology ──────────────────────────────────────────────────────────

export function usePapanicolaou() {
  return useMutation({
    mutationFn: async (p: { result: string }) => {
      const { data } = await api.post('/specialties/gynecology/papanicolaou', p);
      return data;
    },
  });
}

// ─── Dermatology ─────────────────────────────────────────────────────────

export function useNevusMapping(patientId: string) {
  return useQuery({
    queryKey: ['specialties', 'dermatology', 'nevus', patientId],
    queryFn: async () => { const { data } = await api.get(`/specialties/dermatology/nevus-mapping/${patientId}`); return data; },
    enabled: !!patientId,
  });
}
