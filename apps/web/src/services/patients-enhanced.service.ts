import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface MpiCandidate {
  id: string;
  fullName: string;
  cpf: string | null;
  birthDate: string | null;
  mrn: string;
  matchScore: number;
  matchDetails: {
    cpfMatch: boolean;
    nameScore: number;
    birthDateMatch: boolean;
    phoneticMatch: boolean;
  };
}

export interface MpiSearchParams {
  fullName?: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
}

export interface NewbornRegistrationPayload {
  motherId: string;
  fullName: string;
  birthDate: string;
  birthTime?: string;
  gender: string;
  weight?: number;
  length?: number;
  apgar1?: number;
  apgar5?: number;
  notes?: string;
}

export interface AddressPayload {
  patientId: string;
  type: 'RESIDENTIAL' | 'WORK' | 'TEMPORARY';
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
}

export interface PatientAddress {
  id: string;
  type: 'RESIDENTIAL' | 'WORK' | 'TEMPORARY';
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  isPrimary: boolean;
}

export interface GeocodeResult {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  formatted: string;
}

export interface LegacyImportPayload {
  format: 'CSV' | 'HL7' | 'FHIR';
  data: string;
}

export interface ImportResult {
  importId: string;
  format: string;
  status: string;
  message: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const patientsEnhancedKeys = {
  all: ['patients-enhanced'] as const,
  mpiSearch: (params: MpiSearchParams) => [...patientsEnhancedKeys.all, 'mpi', params] as const,
  phoneticSearch: (q: string) => [...patientsEnhancedKeys.all, 'phonetic', q] as const,
  addresses: (patientId: string) => [...patientsEnhancedKeys.all, 'addresses', patientId] as const,
  geocode: (zipCode: string) => [...patientsEnhancedKeys.all, 'geocode', zipCode] as const,
};

// ============================================================================
// MPI — Master Patient Index
// ============================================================================

export function useMpiSearch(params: MpiSearchParams, enabled = false) {
  return useQuery({
    queryKey: patientsEnhancedKeys.mpiSearch(params),
    queryFn: async () => {
      const { data } = await api.get<MpiCandidate[]>('/patients/mpi/search', { params });
      return data;
    },
    enabled,
  });
}

export function useMpiMerge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { keepId: string; mergeId: string }) => {
      const { data } = await api.post('/patients/mpi/merge', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientsEnhancedKeys.all });
    },
  });
}

// ============================================================================
// Phonetic Search (Soundex pt-BR)
// ============================================================================

export function usePhoneticSearch(q: string, enabled = false) {
  return useQuery({
    queryKey: patientsEnhancedKeys.phoneticSearch(q),
    queryFn: async () => {
      const { data } = await api.get<MpiCandidate[]>('/patients/phonetic-search', { params: { q } });
      return data;
    },
    enabled,
  });
}

// ============================================================================
// Newborn Registration
// ============================================================================

export function useRegisterNewborn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewbornRegistrationPayload) => {
      const { data } = await api.post('/patients/newborn', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

// ============================================================================
// Multiple Addresses
// ============================================================================

export function usePatientAddresses(patientId: string) {
  return useQuery({
    queryKey: patientsEnhancedKeys.addresses(patientId),
    queryFn: async () => {
      const { data } = await api.get<PatientAddress[]>(`/patients/${patientId}/addresses`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useAddAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddressPayload) => {
      const { data } = await api.post('/patients/addresses', payload);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: patientsEnhancedKeys.addresses(vars.patientId) });
    },
  });
}

// ============================================================================
// Geolocation / Address Geocoding
// ============================================================================

export function useGeocodeAddress(zipCode: string, enabled = false) {
  return useQuery({
    queryKey: patientsEnhancedKeys.geocode(zipCode),
    queryFn: async () => {
      const { data } = await api.get<GeocodeResult>('/patients/geocode', { params: { zipCode } });
      return data;
    },
    enabled: enabled && zipCode.replace(/\D/g, '').length === 8,
  });
}

// ============================================================================
// Legacy Import / ETL
// ============================================================================

export function useImportLegacyData() {
  return useMutation({
    mutationFn: async (payload: LegacyImportPayload) => {
      const { data } = await api.post<ImportResult>('/patients/import', payload);
      return data;
    },
  });
}
