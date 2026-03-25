import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type CalculatorType =
  | 'CHADS2_VASC' | 'MELD' | 'CHILD_PUGH' | 'APACHE_II'
  | 'WELLS_DVT' | 'WELLS_PE' | 'GENEVA' | 'CURB_65'
  | 'CAPRINI' | 'PADUA';

export interface CalculatorResult {
  calculator: string;
  score: number;
  interpretation: string;
  riskLevel: string;
  recommendation: string;
  details: Record<string, unknown>;
}

export interface OrderSet {
  docId: string;
  id: string;
  name: string;
  diagnosisCodes: string[];
  description?: string;
  items: Array<{
    itemType: string;
    description: string;
    dose?: string;
    route?: string;
    frequency?: string;
    mandatory?: boolean;
  }>;
  totalItems: number;
  createdAt: string;
}

export interface ClinicalPathway {
  docId: string;
  id: string;
  name: string;
  diagnosisCodes: string[];
  expectedDays: number;
  days: Array<{
    dayNumber: number;
    goals: string[];
    orders: string[];
    nursingInterventions?: string[];
    dischargeCriteria?: string[];
  }>;
  createdAt: string;
}

export interface ComplianceDashboard {
  period: string;
  totalRecords: number;
  avgCompliance: number;
  byPathway: Array<{
    pathwayId: string;
    count: number;
    avgCompliance: number;
  }>;
  alerts?: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
}

export interface Deviation {
  docId: string;
  id: string;
  pathwayId: string;
  deviationDescription: string;
  justification: string;
  severity: string;
  recordedAt: string;
  patient?: { id: string; fullName: string };
  author?: { id: string; name: string };
}

export interface Guideline {
  title: string;
  source: string;
  summary: string;
  url?: string;
}

export interface ProtocolRecommendation {
  protocolName: string;
  relevance: number;
  diagnosisMatch: string;
  orderSetSuggestion: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const pathwayKeys = {
  all: ['clinical-pathways'] as const,
  orderSets: (diagnosisCode?: string) => [...pathwayKeys.all, 'order-sets', diagnosisCode] as const,
  pathways: () => [...pathwayKeys.all, 'pathways'] as const,
  pathway: (id: string) => [...pathwayKeys.all, 'pathway', id] as const,
  compliance: () => [...pathwayKeys.all, 'compliance'] as const,
  deviations: (pathwayId?: string) => [...pathwayKeys.all, 'deviations', pathwayId] as const,
  guidelines: (code: string) => [...pathwayKeys.all, 'guidelines', code] as const,
  complianceMonitor: () => [...pathwayKeys.all, 'compliance-monitor'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useCalculateScore() {
  return useMutation({
    mutationFn: async (dto: {
      calculator: CalculatorType;
      patientId: string;
      encounterId?: string;
      parameters: Record<string, number | boolean | string>;
    }) => {
      const { data } = await api.post<CalculatorResult>('/clinical-pathways/calculators', dto);
      return data;
    },
  });
}

export function useOrderSets(diagnosisCode?: string) {
  return useQuery({
    queryKey: pathwayKeys.orderSets(diagnosisCode),
    queryFn: async () => {
      const { data } = await api.get<OrderSet[]>('/clinical-pathways/order-sets', {
        params: { diagnosisCode },
      });
      return data;
    },
  });
}

export function useCreateOrderSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      diagnosisCodes: string[];
      description?: string;
      items: Array<{
        itemType: string;
        description: string;
        dose?: string;
        route?: string;
        frequency?: string;
        mandatory?: boolean;
      }>;
    }) => {
      const { data } = await api.post<OrderSet>('/clinical-pathways/order-sets', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: pathwayKeys.orderSets() }),
  });
}

export function usePathways() {
  return useQuery({
    queryKey: pathwayKeys.pathways(),
    queryFn: async () => {
      const { data } = await api.get<ClinicalPathway[]>('/clinical-pathways/pathways');
      return data;
    },
  });
}

export function useComplianceDashboard() {
  return useQuery({
    queryKey: pathwayKeys.compliance(),
    queryFn: async () => {
      const { data } = await api.get<ComplianceDashboard>('/clinical-pathways/compliance/dashboard');
      return data;
    },
  });
}

export function useDeviations(pathwayId?: string) {
  return useQuery({
    queryKey: pathwayKeys.deviations(pathwayId),
    queryFn: async () => {
      const { data } = await api.get<{ data: Deviation[]; total: number }>('/clinical-pathways/deviations', {
        params: { pathwayId },
      });
      return data;
    },
  });
}

export function useGuidelines(diagnosisCode: string) {
  return useQuery({
    queryKey: pathwayKeys.guidelines(diagnosisCode),
    queryFn: async () => {
      const { data } = await api.get<{ guidelines: Guideline[]; guidelinesFound: number }>(
        `/clinical-pathways/guidelines/${diagnosisCode}`,
      );
      return data;
    },
    enabled: diagnosisCode.length >= 3,
  });
}

export function useRecommendProtocol() {
  return useMutation({
    mutationFn: async (dto: { diagnosisCodes: string[] }) => {
      const { data } = await api.post<{
        recommendations: ProtocolRecommendation[];
        aiConfidence: number;
      }>('/clinical-pathways/ai/recommend-protocol', dto);
      return data;
    },
  });
}

export function useComplianceMonitor() {
  return useQuery({
    queryKey: pathwayKeys.complianceMonitor(),
    queryFn: async () => {
      const { data } = await api.get<ComplianceDashboard>('/clinical-pathways/ai/compliance-monitor');
      return data;
    },
    refetchInterval: 60000,
  });
}
