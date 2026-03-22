import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ClinicalDocument,
  DocumentTemplate,
  PaginatedResponse,
  CreateDocumentDto,
  DocumentType,
} from '@/types';

// ============================================================================
// Filter types
// ============================================================================

export interface DocumentFilters {
  patientId?: string;
  encounterId?: string;
  type?: DocumentType;
  status?: string;
  page?: number;
  limit?: number;
}

export interface TemplateFilters {
  type?: DocumentType;
  category?: string;
  isActive?: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters?: DocumentFilters) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  byPatient: (patientId: string) => [...documentKeys.all, 'patient', patientId] as const,
  templates: () => [...documentKeys.all, 'templates'] as const,
  templateList: (filters?: TemplateFilters) => [...documentKeys.templates(), filters] as const,
  templateDetail: (id: string) => [...documentKeys.templates(), id] as const,
};

// ============================================================================
// Documents
// ============================================================================

export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ClinicalDocument>>('/documents', {
        params: filters,
      });
      return data;
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ClinicalDocument>(`/documents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientDocuments(patientId: string) {
  return useQuery({
    queryKey: documentKeys.byPatient(patientId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ClinicalDocument>>('/documents', {
        params: { patientId },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: CreateDocumentDto) => {
      const { data } = await api.post<ClinicalDocument>('/documents', doc);
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: documentKeys.lists() });
      qc.invalidateQueries({ queryKey: documentKeys.byPatient(result.patientId) });
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClinicalDocument> & { id: string }) => {
      const { data } = await api.patch<ClinicalDocument>(`/documents/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useSignDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ClinicalDocument>(`/documents/${id}/sign`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useVoidDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<ClinicalDocument>(`/documents/${id}/void`, { reason });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useGenerateDocumentPdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ pdfUrl: string }>(`/documents/${id}/generate-pdf`);
      return data;
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

// ============================================================================
// Templates
// ============================================================================

export function useDocumentTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: documentKeys.templateList(filters),
    queryFn: async () => {
      const { data } = await api.get<DocumentTemplate[]>('/documents/templates', {
        params: filters,
      });
      return data;
    },
  });
}

export function useDocumentTemplate(id: string) {
  return useQuery({
    queryKey: documentKeys.templateDetail(id),
    queryFn: async () => {
      const { data } = await api.get<DocumentTemplate>(`/documents/templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: Partial<DocumentTemplate>) => {
      const { data } = await api.post<DocumentTemplate>('/documents/templates', template);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.templates() });
    },
  });
}

export function useUpdateDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DocumentTemplate> & { id: string }) => {
      const { data } = await api.patch<DocumentTemplate>(`/documents/templates/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: documentKeys.templateDetail(vars.id) });
      qc.invalidateQueries({ queryKey: documentKeys.templates() });
    },
  });
}

export function useDeleteDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/templates/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.templates() });
    },
  });
}

export function useGenerateFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      patientId,
      encounterId,
      variables,
    }: {
      templateId: string;
      patientId: string;
      encounterId?: string;
      variables?: Record<string, string>;
    }) => {
      const { data } = await api.post<ClinicalDocument>(
        `/documents/templates/${templateId}/generate`,
        { patientId, encounterId, variables },
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: documentKeys.lists() });
      qc.invalidateQueries({ queryKey: documentKeys.byPatient(result.patientId) });
    },
  });
}
