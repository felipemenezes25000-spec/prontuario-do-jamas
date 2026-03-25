import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const bloodBankKeys = {
  all: ['blood-bank'] as const,
  typing: (patientId: string) => [...bloodBankKeys.all, 'typing', patientId] as const,
  crossmatches: () => [...bloodBankKeys.all, 'crossmatches'] as const,
  transfusions: () => [...bloodBankKeys.all, 'transfusions'] as const,
  inventory: () => [...bloodBankKeys.all, 'inventory'] as const,
  incidents: () => [...bloodBankKeys.all, 'incidents'] as const,
};

// ============================================================================
// Types
// ============================================================================

export type BloodType = 'A' | 'B' | 'AB' | 'O';
export type RhFactor = 'POSITIVO' | 'NEGATIVO';
export type CrossmatchResult = 'COMPATIVEL' | 'INCOMPATIVEL' | 'PENDENTE';
export type TransfusionStatus = 'EM_ANDAMENTO' | 'CONCLUIDA' | 'REACAO' | 'CANCELADA';
export type BloodProduct = 'CONCENTRADO_HEMACIA' | 'PLASMA' | 'PLAQUETAS' | 'CRIOPRECIPITADO';

export interface BloodTyping {
  id: string;
  patientId: string;
  patientName: string;
  bloodType: BloodType;
  rhFactor: RhFactor;
  antibodies: string[];
  typedAt: string;
  typedBy: string;
}

export interface Crossmatch {
  id: string;
  patientName: string;
  patientId: string;
  patientBloodType: BloodType;
  patientRh: RhFactor;
  donorBagId: string;
  donorBloodType: BloodType;
  donorRh: RhFactor;
  result: CrossmatchResult;
  testedAt: string;
  testedBy: string;
}

export interface Transfusion {
  id: string;
  patientName: string;
  patientId: string;
  product: BloodProduct;
  bagId: string;
  volume: number;
  startedAt: string;
  completedAt: string | null;
  status: TransfusionStatus;
  nurse: string;
  reactions: string[];
}

export interface InventoryItem {
  id: string;
  product: BloodProduct;
  bloodType: BloodType;
  rhFactor: RhFactor;
  quantity: number;
  expiresAt: string;
  isExpiringSoon: boolean;
}

export interface HemovigilanceIncident {
  id: string;
  transfusionId: string;
  patientName: string;
  reactionType: string;
  severity: 'LEVE' | 'MODERADA' | 'GRAVE' | 'FATAL';
  description: string;
  reportedAt: string;
  reportedBy: string;
  status: 'ABERTO' | 'INVESTIGANDO' | 'CONCLUIDO';
}

export interface CrossmatchPayload {
  patientId: string;
  donorBagId: string;
}

export interface StartTransfusionPayload {
  patientId: string;
  bagId: string;
  product: BloodProduct;
  volume: number;
}

export interface ReportIncidentPayload {
  transfusionId: string;
  reactionType: string;
  severity: HemovigilanceIncident['severity'];
  description: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useBloodTyping(patientId: string) {
  return useQuery({
    queryKey: bloodBankKeys.typing(patientId),
    queryFn: async () => {
      const { data } = await api.get<BloodTyping>(`/blood-bank/typing/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCrossmatches() {
  return useQuery({
    queryKey: bloodBankKeys.crossmatches(),
    queryFn: async () => {
      const { data } = await api.get<Crossmatch[]>('/blood-bank/crossmatches');
      return data;
    },
  });
}

export function useTransfusions() {
  return useQuery({
    queryKey: bloodBankKeys.transfusions(),
    queryFn: async () => {
      const { data } = await api.get<Transfusion[]>('/blood-bank/transfusions');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useBloodInventory() {
  return useQuery({
    queryKey: bloodBankKeys.inventory(),
    queryFn: async () => {
      const { data } = await api.get<InventoryItem[]>('/blood-bank/inventory');
      return data;
    },
  });
}

export function useHemovigilanceIncidents() {
  return useQuery({
    queryKey: bloodBankKeys.incidents(),
    queryFn: async () => {
      const { data } = await api.get<HemovigilanceIncident[]>('/blood-bank/incidents');
      return data;
    },
  });
}

export function usePerformCrossmatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CrossmatchPayload) => {
      const { data } = await api.post('/blood-bank/crossmatches', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bloodBankKeys.crossmatches() });
    },
  });
}

export function useStartTransfusion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StartTransfusionPayload) => {
      const { data } = await api.post('/blood-bank/transfusions', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bloodBankKeys.all });
    },
  });
}

export function useReportIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReportIncidentPayload) => {
      const { data } = await api.post('/blood-bank/incidents', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bloodBankKeys.incidents() });
    },
  });
}
