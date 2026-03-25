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
  patientId?: string;
  patientName?: string;
  status: 'UPLOADING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  findings: ImagingFinding[];
  createdAt: string;
}

export interface ImagingFilters {
  severity?: FindingSeverity;
  status?: ImagingAnalysis['status'];
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

export function useImagingStats() {
  return useQuery({
    queryKey: imagingKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<ImagingStats>('/ai/imaging/stats');
      return data;
    },
  });
}

export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { file: File; patientId?: string; imageType?: string }) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.patientId) formData.append('patientId', payload.patientId);
      if (payload.imageType) formData.append('imageType', payload.imageType);
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
