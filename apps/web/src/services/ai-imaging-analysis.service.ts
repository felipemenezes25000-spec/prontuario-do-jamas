import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types — Chest X-Ray
// ============================================================================

export type ChestXrayFindingType =
  | 'PNEUMOTHORAX'
  | 'CARDIOMEGALY'
  | 'PLEURAL_EFFUSION'
  | 'NODULE'
  | 'CONSOLIDATION'
  | 'ATELECTASIS'
  | 'PNEUMONIA'
  | 'MASS'
  | 'FRACTURE';

export type SeverityLevel = 'NORMAL' | 'LEVE' | 'MODERADO' | 'GRAVE' | 'CRITICO';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChestXrayFinding {
  id: string;
  type: ChestXrayFindingType;
  description: string;
  confidence: number;
  severity: SeverityLevel;
  boundingBox: BoundingBox | null;
  laterality: 'LEFT' | 'RIGHT' | 'BILATERAL' | null;
}

export interface ChestXrayAnalysis {
  id: string;
  patientId: string;
  patientName: string;
  imageUrl: string;
  status: 'UPLOADING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  findings: ChestXrayFinding[];
  overallImpression: string;
  urgencyScore: number;
  analyzedAt: string;
  processingTimeMs: number;
}

// ============================================================================
// Types — CT Brain
// ============================================================================

export type StrokeType = 'ISCHEMIC' | 'HEMORRHAGIC' | 'NONE';
export type UrgencyClassification = 'ROUTINE' | 'URGENT' | 'EMERGENT' | 'STAT';

export interface CTBrainAnalysis {
  id: string;
  patientId: string;
  patientName: string;
  imageUrl: string;
  status: 'UPLOADING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  strokeDetected: boolean;
  strokeType: StrokeType;
  midlineShiftMm: number;
  aspectsScore: number;
  urgency: UrgencyClassification;
  hemorrhageVolumeMl: number | null;
  affectedTerritory: string | null;
  findings: Array<{
    id: string;
    description: string;
    confidence: number;
    location: string;
  }>;
  analyzedAt: string;
}

// ============================================================================
// Types — Mammography CAD
// ============================================================================

export type BiRadsCategory = '0' | '1' | '2' | '3' | '4A' | '4B' | '4C' | '5' | '6';

export interface MammographyFinding {
  id: string;
  type: 'MICROCALCIFICATION' | 'MASS' | 'ARCHITECTURAL_DISTORTION' | 'ASYMMETRY';
  confidence: number;
  boundingBox: BoundingBox | null;
  density: 'FAT' | 'LOW' | 'EQUAL' | 'HIGH';
  morphology: string;
  distribution: string;
  laterality: 'LEFT' | 'RIGHT';
  location: string;
}

export interface MammographyCADResult {
  id: string;
  patientId: string;
  patientName: string;
  imageUrl: string;
  biRads: BiRadsCategory;
  biRadsDescription: string;
  breastDensity: 'A' | 'B' | 'C' | 'D';
  findings: MammographyFinding[];
  recommendedAction: string;
  analyzedAt: string;
}

// ============================================================================
// Types — Fracture Detection
// ============================================================================

export type FractureType = 'TRANSVERSE' | 'OBLIQUE' | 'SPIRAL' | 'COMMINUTED' | 'GREENSTICK' | 'COMPRESSION' | 'AVULSION';
export type DisplacementLevel = 'NONE' | 'MINIMAL' | 'MODERATE' | 'SEVERE';

export interface FractureDetection {
  id: string;
  patientId: string;
  patientName: string;
  imageUrl: string;
  bodyRegion: string;
  fractureDetected: boolean;
  fractures: Array<{
    id: string;
    bone: string;
    location: string;
    type: FractureType;
    displacement: DisplacementLevel;
    confidence: number;
    boundingBox: BoundingBox | null;
    angulation: number | null;
    description: string;
  }>;
  overallAssessment: string;
  analyzedAt: string;
}

// ============================================================================
// Types — Worklist
// ============================================================================

export type WorklistPriority = 'STAT' | 'URGENT' | 'ROUTINE' | 'LOW';

export interface AiRadiologyWorklistItem {
  id: string;
  patientId: string;
  patientName: string;
  modality: string;
  bodyRegion: string;
  priority: WorklistPriority;
  aiUrgencyScore: number;
  suspectedFindings: string[];
  aiConfidence: number;
  scheduledAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REPORTED';
  assignedTo: string | null;
  requestedBy: string;
}

// ============================================================================
// Types — Accuracy Metrics
// ============================================================================

export interface ModalityAccuracyMetrics {
  modality: string;
  totalCases: number;
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  aiAccuracy: number;
  radiologistAccuracy: number;
  agreementRate: number;
}

export interface AccuracyTrend {
  month: string;
  sensitivity: number;
  specificity: number;
  accuracy: number;
}

export interface ImagingAccuracyDashboard {
  modalityMetrics: ModalityAccuracyMetrics[];
  trends: AccuracyTrend[];
  overallSensitivity: number;
  overallSpecificity: number;
  totalCasesAnalyzed: number;
  averageProcessingTimeSec: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const imagingAnalysisKeys = {
  all: ['ai', 'imaging-analysis'] as const,
  chestXray: () => [...imagingAnalysisKeys.all, 'chest-xray'] as const,
  ctBrain: () => [...imagingAnalysisKeys.all, 'ct-brain'] as const,
  mammography: () => [...imagingAnalysisKeys.all, 'mammography'] as const,
  fracture: () => [...imagingAnalysisKeys.all, 'fracture'] as const,
  worklist: () => [...imagingAnalysisKeys.all, 'worklist'] as const,
  accuracy: () => [...imagingAnalysisKeys.all, 'accuracy'] as const,
};

// ============================================================================
// Hooks — Chest X-Ray
// ============================================================================

export function useChestXrayAnalysis() {
  return useQuery({
    queryKey: imagingAnalysisKeys.chestXray(),
    queryFn: async () => {
      const { data } = await api.get<{ data: ChestXrayAnalysis[]; total: number }>(
        '/ai/imaging/chest-xray',
      );
      return data;
    },
  });
}

export function useAnalyzeChestXray() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { file: File; patientId?: string }) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.patientId) formData.append('patientId', payload.patientId);
      const { data } = await api.post<ChestXrayAnalysis>(
        '/ai/imaging/chest-xray/analyze',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: imagingAnalysisKeys.chestXray() });
    },
  });
}

// ============================================================================
// Hooks — CT Brain
// ============================================================================

export function useCTBrainAnalysis() {
  return useQuery({
    queryKey: imagingAnalysisKeys.ctBrain(),
    queryFn: async () => {
      const { data } = await api.get<{ data: CTBrainAnalysis[]; total: number }>(
        '/ai/imaging/ct-brain',
      );
      return data;
    },
  });
}

export function useAnalyzeCTBrain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { file: File; patientId?: string }) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.patientId) formData.append('patientId', payload.patientId);
      const { data } = await api.post<CTBrainAnalysis>(
        '/ai/imaging/ct-brain/analyze',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: imagingAnalysisKeys.ctBrain() });
    },
  });
}

// ============================================================================
// Hooks — Mammography CAD
// ============================================================================

export function useMammographyCAD() {
  return useQuery({
    queryKey: imagingAnalysisKeys.mammography(),
    queryFn: async () => {
      const { data } = await api.get<{ data: MammographyCADResult[]; total: number }>(
        '/ai/imaging/mammography-cad',
      );
      return data;
    },
  });
}

export function useAnalyzeMammography() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { file: File; patientId?: string }) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.patientId) formData.append('patientId', payload.patientId);
      const { data } = await api.post<MammographyCADResult>(
        '/ai/imaging/mammography-cad/analyze',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: imagingAnalysisKeys.mammography() });
    },
  });
}

// ============================================================================
// Hooks — Fracture Detection
// ============================================================================

export function useFractureDetection() {
  return useQuery({
    queryKey: imagingAnalysisKeys.fracture(),
    queryFn: async () => {
      const { data } = await api.get<{ data: FractureDetection[]; total: number }>(
        '/ai/imaging/fracture-detection',
      );
      return data;
    },
  });
}

export function useAnalyzeFracture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { file: File; patientId?: string; bodyRegion?: string }) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.patientId) formData.append('patientId', payload.patientId);
      if (payload.bodyRegion) formData.append('bodyRegion', payload.bodyRegion);
      const { data } = await api.post<FractureDetection>(
        '/ai/imaging/fracture-detection/analyze',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: imagingAnalysisKeys.fracture() });
    },
  });
}

// ============================================================================
// Hooks — Worklist
// ============================================================================

export function useAiRadiologyWorklist() {
  return useQuery({
    queryKey: imagingAnalysisKeys.worklist(),
    queryFn: async () => {
      const { data } = await api.get<{ data: AiRadiologyWorklistItem[]; total: number }>(
        '/ai/imaging/worklist/prioritized',
      );
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useReprioritize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean }>(
        '/ai/imaging/worklist/reprioritize',
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: imagingAnalysisKeys.worklist() });
    },
  });
}

// ============================================================================
// Hooks — Accuracy Metrics
// ============================================================================

export function useImagingAccuracyMetrics() {
  return useQuery({
    queryKey: imagingAnalysisKeys.accuracy(),
    queryFn: async () => {
      const { data } = await api.get<ImagingAccuracyDashboard>(
        '/ai/imaging/accuracy-metrics',
      );
      return data;
    },
  });
}
