import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const risPacsKeys = {
  all: ['ris-pacs'] as const,
  worklist: () => [...risPacsKeys.all, 'worklist'] as const,
  reports: () => [...risPacsKeys.all, 'reports'] as const,
  report: (id: string) => [...risPacsKeys.all, 'report', id] as const,
  patientExams: (patientId: string) => [...risPacsKeys.all, 'patient', patientId] as const,
  templates: () => [...risPacsKeys.all, 'templates'] as const,
  incidentals: () => [...risPacsKeys.all, 'incidentals'] as const,
  prepProtocols: () => [...risPacsKeys.all, 'prep-protocols'] as const,
  pacsStudies: (filters?: PacsStudyFilters) => [...risPacsKeys.all, 'pacs-studies', filters] as const,
  volumeRendering: (studyUid: string) => [...risPacsKeys.all, 'volume-rendering', studyUid] as const,
  teleradiology: () => [...risPacsKeys.all, 'teleradiology'] as const,
};

// ============================================================================
// Types
// ============================================================================

export type Modality = 'RX' | 'CT' | 'RM' | 'US' | 'MN' | 'PET' | 'MG';
export type ReportStatus = 'PENDENTE' | 'EM_LAUDO' | 'ASSINADO' | 'CANCELADO';

export interface RadiologyOrder {
  id: string;
  accessionNumber: string;
  patientName: string;
  patientId: string;
  modality: Modality;
  examDescription: string;
  status: ReportStatus;
  requestedAt: string;
  scheduledAt: string | null;
  performedAt: string | null;
  radiologist: string | null;
  priority: 'ROTINA' | 'URGENTE' | 'EMERGENCIA';
  studyInstanceUid: string | null;
}

export interface RadiologyReport {
  id: string;
  orderId: string;
  patientName: string;
  modality: Modality;
  examDescription: string;
  findings: string;
  impression: string;
  technique: string;
  comparison: string;
  status: ReportStatus;
  radiologist: string;
  signedAt: string | null;
  templateId: string | null;
}

export interface ReportTemplate {
  id: string;
  name: string;
  modality: Modality;
  body: string;
}

export interface IncidentalFinding {
  id: string;
  patientName: string;
  patientId: string;
  finding: string;
  modality: Modality;
  examDate: string;
  followUpDate: string | null;
  status: 'PENDENTE' | 'AGENDADO' | 'CONCLUIDO';
  reportId: string;
}

export interface DicomMetadata {
  studyInstanceUid: string;
  seriesCount: number;
  imageCount: number;
  modality: Modality;
  studyDate: string;
  bodyPart: string;
  institutionName: string;
}

export interface CreateReportPayload {
  orderId: string;
  findings: string;
  impression: string;
  technique: string;
  comparison: string;
  templateId?: string;
}

// ============================================================================
// Exam Preparation Protocols
// ============================================================================

export interface PrepProtocol {
  id: string;
  modality: Modality;
  examType: string;
  title: string;
  instructions: string;
  fastingHours: number | null;
  contrastRequired: boolean;
  contrastType: string | null;
  allergyWarning: boolean;
  estimatedDuration: number;
  specialNotes: string | null;
}

// ============================================================================
// PACS Archive / Retrieve
// ============================================================================

export interface PacsStudyFilters {
  patientName?: string;
  modality?: Modality;
  dateFrom?: string;
  dateTo?: string;
}

export interface PacsStudy {
  studyInstanceUid: string;
  patientName: string;
  patientId: string;
  modality: Modality;
  studyDate: string;
  studyDescription: string;
  seriesCount: number;
  imageCount: number;
  bodyPart: string;
  archiveStatus: 'ONLINE' | 'NEARLINE' | 'OFFLINE';
  sizeBytes: number;
}

export interface PacsRetrieveResult {
  studyInstanceUid: string;
  status: 'RETRIEVED' | 'QUEUED' | 'ERROR';
  message: string;
}

// ============================================================================
// 3D Volume Rendering
// ============================================================================

export interface VolumeRenderingData {
  studyInstanceUid: string;
  patientName: string;
  modality: Modality;
  seriesCount: number;
  sliceCount: number;
  sliceThickness: number;
  viewerUrl: string;
  presets: VolumePreset[];
  thumbnailUrl: string | null;
}

export interface VolumePreset {
  id: string;
  name: string;
  description: string;
  windowWidth: number;
  windowCenter: number;
  colorMap: string;
}

// ============================================================================
// Teleradiology Workflow
// ============================================================================

export type TeleradStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export interface TeleradCase {
  id: string;
  orderId: string;
  patientName: string;
  modality: Modality;
  examDescription: string;
  priority: 'ROTINA' | 'URGENTE' | 'EMERGENCIA';
  status: TeleradStatus;
  assignedRadiologist: string | null;
  assignedAt: string | null;
  turnaroundMinutes: number | null;
  slaDeadline: string | null;
  createdAt: string;
}

export interface AssignTeleradPayload {
  caseId: string;
  radiologistId: string;
}

export interface CreateTeleradPayload {
  orderId: string;
  priority: 'ROTINA' | 'URGENTE' | 'EMERGENCIA';
}

// ============================================================================
// Hooks
// ============================================================================

export function useRisWorklist() {
  return useQuery({
    queryKey: risPacsKeys.worklist(),
    queryFn: async () => {
      const { data } = await api.get<RadiologyOrder[]>('/ris-pacs/worklist');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useRadiologyReports() {
  return useQuery({
    queryKey: risPacsKeys.reports(),
    queryFn: async () => {
      const { data } = await api.get<RadiologyReport[]>('/ris-pacs/reports');
      return data;
    },
  });
}

export function useRadiologyReport(id: string) {
  return useQuery({
    queryKey: risPacsKeys.report(id),
    queryFn: async () => {
      const { data } = await api.get<RadiologyReport>(`/ris-pacs/reports/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientExams(patientId: string) {
  return useQuery({
    queryKey: risPacsKeys.patientExams(patientId),
    queryFn: async () => {
      const { data } = await api.get<RadiologyOrder[]>(`/ris-pacs/patients/${patientId}/exams`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useReportTemplates() {
  return useQuery({
    queryKey: risPacsKeys.templates(),
    queryFn: async () => {
      const { data } = await api.get<ReportTemplate[]>('/ris-pacs/templates');
      return data;
    },
  });
}

export function useIncidentalFindings() {
  return useQuery({
    queryKey: risPacsKeys.incidentals(),
    queryFn: async () => {
      const { data } = await api.get<IncidentalFinding[]>('/ris-pacs/incidentals');
      return data;
    },
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReportPayload) => {
      const { data } = await api.post('/ris-pacs/reports', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: risPacsKeys.all });
    },
  });
}

export function useSignReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data } = await api.patch(`/ris-pacs/reports/${reportId}/sign`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: risPacsKeys.all });
    },
  });
}

// ============================================================================
// Exam Preparation Protocols Hooks
// ============================================================================

export function usePrepProtocols() {
  return useQuery({
    queryKey: risPacsKeys.prepProtocols(),
    queryFn: async () => {
      const { data } = await api.get<PrepProtocol[]>('/ris-pacs/prep-protocols');
      return data;
    },
  });
}

// ============================================================================
// PACS Archive / Retrieve Hooks
// ============================================================================

export function usePacsStudies(filters?: PacsStudyFilters) {
  return useQuery({
    queryKey: risPacsKeys.pacsStudies(filters),
    queryFn: async () => {
      const { data } = await api.get<PacsStudy[]>('/ris-pacs/pacs/studies', { params: filters });
      return data;
    },
  });
}

export function usePacsRetrieve() {
  return useMutation({
    mutationFn: async (studyInstanceUid: string) => {
      const { data } = await api.post<PacsRetrieveResult>('/ris-pacs/pacs/retrieve', { studyInstanceUid });
      return data;
    },
  });
}

export function usePacsArchive() {
  return useMutation({
    mutationFn: async (studyInstanceUid: string) => {
      const { data } = await api.post<{ status: string; message: string }>('/ris-pacs/pacs/archive', { studyInstanceUid });
      return data;
    },
  });
}

// ============================================================================
// 3D Volume Rendering Hooks
// ============================================================================

export function useVolumeRendering(studyUid: string) {
  return useQuery({
    queryKey: risPacsKeys.volumeRendering(studyUid),
    queryFn: async () => {
      const { data } = await api.get<VolumeRenderingData>(`/ris-pacs/volume-rendering/${studyUid}`);
      return data;
    },
    enabled: !!studyUid,
  });
}

// ============================================================================
// Teleradiology Workflow Hooks
// ============================================================================

export function useTeleradCases() {
  return useQuery({
    queryKey: risPacsKeys.teleradiology(),
    queryFn: async () => {
      const { data } = await api.get<TeleradCase[]>('/ris-pacs/teleradiology');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useCreateTeleradCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTeleradPayload) => {
      const { data } = await api.post<TeleradCase>('/ris-pacs/teleradiology', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: risPacsKeys.teleradiology() });
    },
  });
}

export function useAssignTeleradCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AssignTeleradPayload) => {
      const { data } = await api.post<TeleradCase>(`/ris-pacs/teleradiology/${payload.caseId}/assign`, {
        radiologistId: payload.radiologistId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: risPacsKeys.teleradiology() });
    },
  });
}

export function useCompleteTeleradCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caseId: string) => {
      const { data } = await api.patch<TeleradCase>(`/ris-pacs/teleradiology/${caseId}/complete`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: risPacsKeys.teleradiology() });
    },
  });
}
