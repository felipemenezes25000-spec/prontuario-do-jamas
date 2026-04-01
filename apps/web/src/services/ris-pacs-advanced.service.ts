import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const risPacsAdvancedKeys = {
  all: ['ris-pacs-advanced'] as const,
  dicomViewer: (studyId: string) => [...risPacsAdvancedKeys.all, 'dicom-viewer', studyId] as const,
  prepProtocol: (examType: string) => [...risPacsAdvancedKeys.all, 'prep-protocol', examType] as const,
  structuredReport: (id: string) => [...risPacsAdvancedKeys.all, 'structured-report', id] as const,
  worklist: (params?: RadiologistWorklistParams) =>
    [...risPacsAdvancedKeys.all, 'worklist', params] as const,
  incidentalFollowUps: (params?: IncidentalFollowUpListParams) =>
    [...risPacsAdvancedKeys.all, 'incidental-followup', params] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface DicomViewerSession {
  studyId: string;
  viewerUrl: string;
  token: string;
  expiresAt: string;
  modality: string;
  studyDate: string;
  patientName: string;
}

export interface PrepProtocol {
  examType: string;
  title: string;
  patientInstructions: string[];
  fastingRequired: boolean;
  fastingHours: number | null;
  contrastRequired: boolean;
  contrastPremedication?: string[];
  medicationsToHold?: string[];
  notes?: string;
}

export interface CreateStructuredReportPayload {
  studyId: string;
  radiologistId: string;
  templateId?: string;
  findings: string;
  impression: string;
  recommendations?: string;
  criticalFindings?: string;
  incidentalFindings?: string;
  followUpRequired: boolean;
  followUpIntervalDays?: number;
}

export interface StructuredReport {
  id: string;
  studyId: string;
  radiologistId: string;
  findings: string;
  impression: string;
  recommendations?: string;
  criticalFindings?: string;
  incidentalFindings?: string;
  followUpRequired: boolean;
  followUpIntervalDays?: number;
  status: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | 'AMENDED';
  createdAt: string;
  signedAt: string | null;
}

export interface RadiologistWorklistParams {
  radiologistId?: string;
  modality?: string;
  priority?: 'ROUTINE' | 'URGENT' | 'STAT';
  status?: 'PENDING' | 'IN_PROGRESS' | 'REPORTED';
  date?: string;
}

export interface RadiologistWorklistItem {
  id: string;
  studyId: string;
  patientId: string;
  patientName: string;
  modality: string;
  examDescription: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: 'PENDING' | 'IN_PROGRESS' | 'REPORTED';
  studyDate: string;
  assignedTo?: string;
  waitingMinutes: number;
}

export interface CreateIncidentalFollowUpPayload {
  studyId: string;
  patientId: string;
  finding: string;
  organ: string;
  size?: string;
  recommendation: string;
  followUpModalityCode?: string;
  followUpIntervalDays: number;
  priorityLevel: 'LOW' | 'INTERMEDIATE' | 'HIGH';
  notes?: string;
}

export interface IncidentalFollowUp {
  id: string;
  studyId: string;
  patientId: string;
  finding: string;
  organ: string;
  size?: string;
  recommendation: string;
  followUpIntervalDays: number;
  dueDate: string;
  priorityLevel: 'LOW' | 'INTERMEDIATE' | 'HIGH';
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'OVERDUE';
  createdAt: string;
}

export interface IncidentalFollowUpListParams {
  patientId?: string;
  status?: IncidentalFollowUp['status'];
  priorityLevel?: IncidentalFollowUp['priorityLevel'];
}

export interface UpdateIncidentalFollowUpPayload {
  status?: IncidentalFollowUp['status'];
  notes?: string;
  completedAt?: string;
  followUpStudyId?: string;
}

export interface ImageComparisonPayload {
  currentStudyId: string;
  priorStudyId: string;
  notes?: string;
}

export interface ImageComparisonResult {
  id: string;
  currentStudyId: string;
  priorStudyId: string;
  currentStudyDate: string;
  priorStudyDate: string;
  comparisonViewerUrl: string;
  token: string;
  expiresAt: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useDicomViewer(studyId: string) {
  return useQuery({
    queryKey: risPacsAdvancedKeys.dicomViewer(studyId),
    queryFn: async () => {
      const { data } = await api.get<DicomViewerSession>(`/ris-pacs/dicom-viewer/${studyId}`);
      return data;
    },
    enabled: !!studyId,
  });
}

export function usePrepProtocol(examType: string) {
  return useQuery({
    queryKey: risPacsAdvancedKeys.prepProtocol(examType),
    queryFn: async () => {
      const { data } = await api.get<PrepProtocol>(`/ris-pacs/prep-protocols/${examType}`);
      return data;
    },
    enabled: !!examType,
  });
}

export function useCreateStructuredReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStructuredReportPayload) => {
      const { data } = await api.post<StructuredReport>('/ris-pacs/structured-reports', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: risPacsAdvancedKeys.all });
    },
  });
}

export function useStructuredReport(id: string) {
  return useQuery({
    queryKey: risPacsAdvancedKeys.structuredReport(id),
    queryFn: async () => {
      const { data } = await api.get<StructuredReport>(`/ris-pacs/structured-reports/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useRadiologistWorklist(params?: RadiologistWorklistParams) {
  return useQuery({
    queryKey: risPacsAdvancedKeys.worklist(params),
    queryFn: async () => {
      const { data } = await api.get<RadiologistWorklistItem[]>('/ris-pacs/worklist', { params });
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useCreateIncidentalFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateIncidentalFollowUpPayload) => {
      const { data } = await api.post<IncidentalFollowUp>('/ris-pacs/incidental-followup', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: risPacsAdvancedKeys.incidentalFollowUps() });
    },
  });
}

export function useIncidentalFollowUps(params?: IncidentalFollowUpListParams) {
  return useQuery({
    queryKey: risPacsAdvancedKeys.incidentalFollowUps(params),
    queryFn: async () => {
      const { data } = await api.get<IncidentalFollowUp[]>('/ris-pacs/incidental-followup', { params });
      return data;
    },
  });
}

export function useUpdateIncidentalFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateIncidentalFollowUpPayload & { id: string }) => {
      const { data } = await api.patch<IncidentalFollowUp>(
        `/ris-pacs/incidental-followup/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: risPacsAdvancedKeys.incidentalFollowUps() });
    },
  });
}

export function useCompareImages() {
  return useMutation({
    mutationFn: async (payload: ImageComparisonPayload) => {
      const { data } = await api.post<ImageComparisonResult>('/ris-pacs/image-comparison', payload);
      return data;
    },
  });
}
