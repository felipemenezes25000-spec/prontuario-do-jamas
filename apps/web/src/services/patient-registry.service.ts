import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Query Keys ────────────────────────────────────────────────────────────

export const patientRegistryKeys = {
  all: ['patient-registry'] as const,
  search: (query: string) => [...patientRegistryKeys.all, 'search', query] as const,
  duplicates: (patientId: string) => [...patientRegistryKeys.all, 'duplicates', patientId] as const,
  barcode: (patientId: string) => [...patientRegistryKeys.all, 'barcode', patientId] as const,
  addresses: (patientId: string) => [...patientRegistryKeys.all, 'addresses', patientId] as const,
  newborns: (motherId: string) => [...patientRegistryKeys.all, 'newborns', motherId] as const,
};

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface PhoneticSearchResult {
  id: string;
  fullName: string;
  cpf: string | null;
  birthDate: string | null;
  motherName: string | null;
  cns: string | null;
  phoneticScore: number;
  matchedFields: string[];
}

export interface DuplicateCandidate {
  id: string;
  fullName: string;
  cpf: string | null;
  birthDate: string | null;
  motherName: string | null;
  cns: string | null;
  matchScore: number;
  matchedCriteria: string[];
  createdAt: string;
}

export interface MergeResult {
  survivorId: string;
  mergedIds: string[];
  fieldsConsolidated: string[];
  encountersMoved: number;
  documentsMoved: number;
  mergedAt: string;
  mergedBy: string;
}

export interface PatientBarcode {
  patientId: string;
  barcodeType: 'CODE128' | 'QR' | 'DATAMATRIX';
  barcodeValue: string;
  barcodeImageBase64: string;
  label: string;
  generatedAt: string;
}

export interface PatientAddress {
  id: string;
  patientId: string;
  type: 'RESIDENCIAL' | 'COMERCIAL' | 'CORRESPONDENCIA' | 'TEMPORARIO';
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  ibgeCode: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface NewbornLink {
  id: string;
  newbornId: string;
  newbornName: string;
  motherId: string;
  motherName: string;
  birthDate: string;
  birthWeight: number | null;
  gestationalAge: number | null;
  apgar1: number | null;
  apgar5: number | null;
  deliveryType: 'VAGINAL' | 'CESAREAN' | null;
  linkedAt: string;
}

export interface PhoneticSearchPayload {
  query: string;
  fields?: ('name' | 'motherName' | 'cpf' | 'cns')[];
  limit?: number;
}

export interface AddAddressPayload {
  patientId: string;
  type: PatientAddress['type'];
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  ibgeCode?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
}

export interface LinkNewbornPayload {
  motherId: string;
  newbornId: string;
  birthWeight?: number;
  gestationalAge?: number;
  apgar1?: number;
  apgar5?: number;
  deliveryType?: 'VAGINAL' | 'CESAREAN';
}

export interface MergePatientsPayload {
  survivorId: string;
  duplicateIds: string[];
  fieldResolution?: Record<string, string>;
  reason: string;
}

export interface GenerateBarcodePayload {
  patientId: string;
  barcodeType?: PatientBarcode['barcodeType'];
  includeLabel?: boolean;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function usePhoneticSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: patientRegistryKeys.search(query),
    queryFn: async () => {
      const { data } = await api.get<PhoneticSearchResult[]>('/patient-registry/search/phonetic', {
        params: { query },
      });
      return data;
    },
    enabled: enabled && query.length >= 3,
  });
}

export function usePhoneticSearchMutation() {
  return useMutation({
    mutationFn: async (payload: PhoneticSearchPayload) => {
      const { data } = await api.post<PhoneticSearchResult[]>('/patient-registry/search/phonetic', payload);
      return data;
    },
  });
}

export function useFindDuplicates(patientId: string) {
  return useQuery({
    queryKey: patientRegistryKeys.duplicates(patientId),
    queryFn: async () => {
      const { data } = await api.get<DuplicateCandidate[]>(`/patient-registry/duplicates/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useFindDuplicatesMutation() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; threshold?: number }) => {
      const { data } = await api.post<DuplicateCandidate[]>('/patient-registry/duplicates', payload);
      return data;
    },
  });
}

export function useMergePatients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MergePatientsPayload) => {
      const { data } = await api.post<MergeResult>('/patient-registry/merge', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientRegistryKeys.all });
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useGenerateBarcode(patientId: string, barcodeType?: PatientBarcode['barcodeType']) {
  return useQuery({
    queryKey: [...patientRegistryKeys.barcode(patientId), barcodeType],
    queryFn: async () => {
      const { data } = await api.get<PatientBarcode>(`/patient-registry/barcode/${patientId}`, {
        params: barcodeType ? { barcodeType } : {},
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useGenerateBarcodeMutation() {
  return useMutation({
    mutationFn: async (payload: GenerateBarcodePayload) => {
      const { data } = await api.post<PatientBarcode>('/patient-registry/barcode', payload);
      return data;
    },
  });
}

export function usePatientAddresses(patientId: string) {
  return useQuery({
    queryKey: patientRegistryKeys.addresses(patientId),
    queryFn: async () => {
      const { data } = await api.get<PatientAddress[]>(`/patient-registry/addresses/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useAddAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddAddressPayload) => {
      const { data } = await api.post<PatientAddress>('/patient-registry/addresses', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: patientRegistryKeys.addresses(variables.patientId) });
    },
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patientId, ...updates }: Partial<AddAddressPayload> & { id: string; patientId: string }) => {
      const { data } = await api.patch<PatientAddress>(`/patient-registry/addresses/${id}`, updates);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: patientRegistryKeys.addresses(variables.patientId) });
    },
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      await api.delete(`/patient-registry/addresses/${id}`);
      return { id, patientId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: patientRegistryKeys.addresses(variables.patientId) });
    },
  });
}

export function useNewbornLinks(motherId: string) {
  return useQuery({
    queryKey: patientRegistryKeys.newborns(motherId),
    queryFn: async () => {
      const { data } = await api.get<NewbornLink[]>(`/patient-registry/newborns/${motherId}`);
      return data;
    },
    enabled: !!motherId,
  });
}

export function useLinkNewborn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LinkNewbornPayload) => {
      const { data } = await api.post<NewbornLink>('/patient-registry/newborns/link', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: patientRegistryKeys.newborns(variables.motherId) });
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUnlinkNewborn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId, motherId }: { linkId: string; motherId: string }) => {
      await api.delete(`/patient-registry/newborns/link/${linkId}`);
      return { linkId, motherId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: patientRegistryKeys.newborns(variables.motherId) });
    },
  });
}
