import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const genomicsKeys = {
  all: ['genomics'] as const,
  profile: (patientId: string) => [...genomicsKeys.all, 'profile', patientId] as const,
  interactions: (patientId: string) => [...genomicsKeys.all, 'interactions', patientId] as const,
  variants: (patientId: string) => [...genomicsKeys.all, 'variants', patientId] as const,
  pharmacogenomics: (patientId: string) => [...genomicsKeys.all, 'pgx', patientId] as const,
};

// ============================================================================
// Types
// ============================================================================

export type RiskLevel = 'ALTO' | 'MODERADO' | 'BAIXO' | 'NORMAL';
export type MetabolizerStatus = 'ULTRARAPIDO' | 'EXTENSIVO' | 'INTERMEDIARIO' | 'LENTO';

export interface GenomicProfile {
  id: string;
  patientId: string;
  patientName: string;
  sequencingDate: string;
  lab: string;
  panelName: string;
  variantsCount: number;
  lastUpdated: string;
}

export interface GeneDrugInteraction {
  id: string;
  gene: string;
  variant: string;
  drug: string;
  recommendation: string;
  riskLevel: RiskLevel;
  evidenceLevel: string;
  source: string;
}

export interface GeneticVariant {
  id: string;
  gene: string;
  variant: string;
  zygosity: 'HOMOZIGOTO' | 'HETEROZIGOTO';
  classification: 'PATOGENICA' | 'PROVAVEL_PATOGENICA' | 'VUS' | 'PROVAVEL_BENIGNA' | 'BENIGNA';
  clinicalSignificance: string;
  dbSnpId: string | null;
}

export interface PharmacogenomicSummary {
  id: string;
  gene: string;
  phenotype: MetabolizerStatus;
  affectedDrugs: string[];
  recommendation: string;
}

export interface RegisterVariantPayload {
  patientId: string;
  gene: string;
  variant: string;
  zygosity: GeneticVariant['zygosity'];
  classification: GeneticVariant['classification'];
  clinicalSignificance: string;
  dbSnpId?: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useGenomicProfile(patientId: string) {
  return useQuery({
    queryKey: genomicsKeys.profile(patientId),
    queryFn: async () => {
      const { data } = await api.get<GenomicProfile>(`/genomics/patients/${patientId}/profile`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useGeneDrugInteractions(patientId: string) {
  return useQuery({
    queryKey: genomicsKeys.interactions(patientId),
    queryFn: async () => {
      const { data } = await api.get<GeneDrugInteraction[]>(`/genomics/patients/${patientId}/interactions`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useGeneticVariants(patientId: string) {
  return useQuery({
    queryKey: genomicsKeys.variants(patientId),
    queryFn: async () => {
      const { data } = await api.get<GeneticVariant[]>(`/genomics/patients/${patientId}/variants`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function usePharmacogenomics(patientId: string) {
  return useQuery({
    queryKey: genomicsKeys.pharmacogenomics(patientId),
    queryFn: async () => {
      const { data } = await api.get<PharmacogenomicSummary[]>(`/genomics/patients/${patientId}/pharmacogenomics`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRegisterVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterVariantPayload) => {
      const { data } = await api.post('/genomics/variants', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: genomicsKeys.variants(variables.patientId) });
      qc.invalidateQueries({ queryKey: genomicsKeys.interactions(variables.patientId) });
    },
  });
}
