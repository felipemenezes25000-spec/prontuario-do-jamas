import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface RunCalculatorDto {
  calculatorType: string;
  inputs: Record<string, number | string | boolean>;
  patientId?: string;
  encounterId?: string;
}

export interface CalculatorResult {
  calculatorType: string;
  score: number;
  interpretation: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  recommendations: string[];
  details: Record<string, number | string>;
  calculatedAt: string;
}

export interface Pathway {
  id: string;
  name: string;
  description: string;
  diagnosisCodes: string[];
  specialty: string;
  version: string;
  expectedDays: number;
  steps: PathwayStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PathwayStep {
  id: string;
  order: number;
  title: string;
  description: string;
  category: 'ASSESSMENT' | 'INTERVENTION' | 'MEDICATION' | 'LAB' | 'IMAGING' | 'EDUCATION' | 'DISCHARGE';
  dayRange: { min: number; max: number };
  mandatory: boolean;
  actions: string[];
}

export interface CreatePathwayDto {
  name: string;
  description: string;
  diagnosisCodes: string[];
  specialty: string;
  expectedDays: number;
  steps: Omit<PathwayStep, 'id'>[];
}

export interface UpdatePathwayDto extends Partial<CreatePathwayDto> {
  isActive?: boolean;
}

export interface PathwayProgress {
  pathwayId: string;
  patientId: string;
  patientName: string;
  enrolledAt: string;
  currentDay: number;
  expectedDays: number;
  completedSteps: number;
  totalSteps: number;
  complianceRate: number;
  status: 'ON_TRACK' | 'DELAYED' | 'COMPLETED' | 'DEVIATED';
  nextDueStep?: PathwayStep;
  stepStatuses: Array<{ stepId: string; status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE'; completedAt?: string }>;
}

export interface RecordComplianceDto {
  pathwayId: string;
  patientId: string;
  encounterId: string;
  checklist: Array<{ itemId: string; completed: boolean; notes?: string }>;
  recordedBy: string;
}

export interface ComplianceRecord {
  id: string;
  pathwayId: string;
  patientId: string;
  encounterId: string;
  completionRate: number;
  recordedAt: string;
  recordedBy: string;
}

export interface ComplianceStats {
  protocolId: string;
  protocolName: string;
  totalApplications: number;
  averageCompliance: number;
  byItem: Array<{
    itemId: string;
    itemName: string;
    complianceRate: number;
    completedCount: number;
    totalCount: number;
  }>;
  trend: Array<{ period: string; compliance: number }>;
}

export interface ReportDeviationDto {
  pathwayId: string;
  patientId: string;
  encounterId: string;
  stepId: string;
  deviationType: 'SKIPPED' | 'DELAYED' | 'MODIFIED' | 'ADDED_STEP';
  reason: string;
  clinicalJustification?: string;
  reportedBy: string;
}

export interface PathwayDeviation {
  id: string;
  pathwayId: string;
  patientId: string;
  stepId: string;
  deviationType: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';
  reportedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface PathwayFilters {
  specialty?: string;
  isActive?: boolean;
  search?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const clinicalPathwaysAdvancedKeys = {
  all: ['clinical-pathways-advanced'] as const,
  pathways: (filters?: PathwayFilters) => [...clinicalPathwaysAdvancedKeys.all, 'pathways', filters] as const,
  pathwayProgress: (id: string, patientId: string) => [...clinicalPathwaysAdvancedKeys.all, 'progress', id, patientId] as const,
  complianceStats: (protocolId: string) => [...clinicalPathwaysAdvancedKeys.all, 'compliance', protocolId] as const,
};

// ============================================================================
// Clinical Calculators
// ============================================================================

export function useRunCalculator() {
  return useMutation({
    mutationFn: async (data: RunCalculatorDto) => {
      const { data: res } = await api.post<CalculatorResult>('/clinical-pathways/calculators', data);
      return res;
    },
  });
}

// ============================================================================
// Pathways CRUD
// ============================================================================

export function useGetPathways(filters?: PathwayFilters) {
  return useQuery({
    queryKey: clinicalPathwaysAdvancedKeys.pathways(filters),
    queryFn: async () => {
      const { data } = await api.get<Pathway[]>('/clinical-pathways/pathways', { params: filters });
      return data;
    },
  });
}

export function useCreatePathway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePathwayDto) => {
      const { data } = await api.post<Pathway>('/clinical-pathways/pathways', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clinicalPathwaysAdvancedKeys.pathways() });
    },
  });
}

export function useUpdatePathway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdatePathwayDto & { id: string }) => {
      const { data } = await api.patch<Pathway>(`/clinical-pathways/pathways/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clinicalPathwaysAdvancedKeys.pathways() });
    },
  });
}

// ============================================================================
// Pathway Progress
// ============================================================================

export function useGetPathwayProgress(id: string, patientId: string) {
  return useQuery({
    queryKey: clinicalPathwaysAdvancedKeys.pathwayProgress(id, patientId),
    queryFn: async () => {
      const { data } = await api.get<PathwayProgress>(`/clinical-pathways/pathways/${id}/progress/${patientId}`);
      return data;
    },
    enabled: !!id && !!patientId,
  });
}

// ============================================================================
// Compliance Checklist
// ============================================================================

export function useRecordComplianceChecklist() {
  return useMutation({
    mutationFn: async (dto: RecordComplianceDto) => {
      const { data } = await api.post<ComplianceRecord>('/clinical-pathways/compliance', dto);
      return data;
    },
  });
}

export function useGetComplianceStats(protocolId: string) {
  return useQuery({
    queryKey: clinicalPathwaysAdvancedKeys.complianceStats(protocolId),
    queryFn: async () => {
      const { data } = await api.get<ComplianceStats>(`/clinical-pathways/compliance/${protocolId}`);
      return data;
    },
    enabled: !!protocolId,
    staleTime: 5 * 60 * 1_000,
  });
}

// ============================================================================
// Deviations
// ============================================================================

export function useReportDeviation() {
  return useMutation({
    mutationFn: async (dto: ReportDeviationDto) => {
      const { data } = await api.post<PathwayDeviation>('/clinical-pathways/deviations', dto);
      return data;
    },
  });
}
