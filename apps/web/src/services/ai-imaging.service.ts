import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type FindingSeverity = 'NORMAL' | 'INCIDENTAL' | 'SIGNIFICANT' | 'CRITICAL';

export interface ImagingFinding {
  id: string;
  description: string;
  location?: string;
  severity: FindingSeverity;
  confidence: number;
  suggestedFollowUp?: string;
}

export interface ImagingAnalysis {
  id: string;
  imageUrl: string;
  imageType?: string;
  modality?: string;
  patientId?: string;
  patientName?: string;
  status: 'UPLOADING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  findings: ImagingFinding[];
  aiUrgencyScore?: number;
  radiologistAgreement?: boolean;
  createdAt: string;
}

export interface ImagingFilters {
  severity?: FindingSeverity;
  status?: ImagingAnalysis['status'];
  modality?: string;
  page?: number;
  limit?: number;
}

export interface ImagingStats {
  totalAnalyzed: number;
  criticalFindings: number;
  normalFindings: number;
  significantFindings: number;
  incidentalFindings: number;
  avgProcessingTimeMs: number;
  radiologistAgreementRate: number;
  analysesToday: number;
}

export interface CADResult {
  id: string;
  modality: string;
  bodyRegion: string;
  patientName?: string;
  findings: Array<{
    label: string;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
    severity: FindingSeverity;
  }>;
  overallAssessment: string;
  biRads?: string;
  processedAt: string;
}

export interface WorklistItem {
  id: string;
  patientName: string;
  modality: string;
  bodyRegion: string;
  priority: number;
  aiUrgencyScore: number;
  scheduledAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

// ============================================================================
// Query Keys
// ============================================================================

export const imagingKeys = {
  all: ['ai', 'imaging'] as const,
  lists: () => [...imagingKeys.all, 'list'] as const,
  list: (filters?: ImagingFilters) => [...imagingKeys.lists(), filters] as const,
  detail: (id: string) => [...imagingKeys.all, 'detail', id] as const,
  stats: () => [...imagingKeys.all, 'stats'] as const,
  cad: () => [...imagingKeys.all, 'cad'] as const,
  worklist: () => [...imagingKeys.all, 'worklist'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useImagingAnalyses(filters?: ImagingFilters) {
  return useQuery({
    queryKey: imagingKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: ImagingAnalysis[]; total: number }>('/ai/imaging/analyses', {
        params: filters,
      });
      return data;
    },
  });
}

export function useImagingAnalysis(id: string) {
  return useQuery({
    queryKey: imagingKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ImagingAnalysis>(`/ai/imaging/analyses/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useImagingStats() {
  return useQuery({
    queryKey: imagingKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<ImagingStats>('/ai/imaging/stats');
      return data;
    },
  });
}

export function useCADResults() {
  return useQuery({
    queryKey: imagingKeys.cad(),
    queryFn: async () => {
      const { data } = await api.get<{ data: CADResult[]; total: number }>('/ai/imaging/cad');
      return data;
    },
  });
}

export function useImagingWorklist() {
  return useQuery({
    queryKey: imagingKeys.worklist(),
    queryFn: async () => {
      const { data } = await api.get<{ data: WorklistItem[]; total: number }>('/ai/imaging/worklist');
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { file: File; patientId?: string; imageType?: string; modality?: string }) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.patientId) formData.append('patientId', payload.patientId);
      if (payload.imageType) formData.append('imageType', payload.imageType);
      if (payload.modality) formData.append('modality', payload.modality);
      const { data } = await api.post<ImagingAnalysis>('/ai/imaging/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: imagingKeys.lists() });
      qc.invalidateQueries({ queryKey: imagingKeys.stats() });
    },
  });
}

export function useCompareWithRadiologist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { analysisId: string; radiologistFindings: string; agreement: boolean }) => {
      const { data } = await api.post<{ success: boolean }>(
        `/ai/imaging/analyses/${payload.analysisId}/compare`,
        { radiologistFindings: payload.radiologistFindings, agreement: payload.agreement },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: imagingKeys.lists() });
      qc.invalidateQueries({ queryKey: imagingKeys.stats() });
    },
  });
}

export function useReprioritizeWorklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean }>('/ai/imaging/worklist/reprioritize');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: imagingKeys.worklist() });
    },
  });
}
