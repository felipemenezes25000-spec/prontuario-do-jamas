import { useState, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  ScanEye,
  Upload,
  BrainCircuit,
  Bone,
  ListChecks,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Eye,
  Target,
  Shield,
  TrendingUp,
  RefreshCw,
  Search,
  FileImage,
  Zap,
  Heart,
  Loader2,
  CircleDot,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useChestXrayAnalysis,
  useAnalyzeChestXray,
  useCTBrainAnalysis,
  useAnalyzeCTBrain,
  useMammographyCAD,
  useAnalyzeMammography,
  useFractureDetection,
  useAnalyzeFracture,
  useAiRadiologyWorklist,
  useReprioritize,
  useImagingAccuracyMetrics,
  type ChestXrayAnalysis,
  type ChestXrayFinding,
  type ChestXrayFindingType,
  type CTBrainAnalysis,
  type StrokeType,
  type UrgencyClassification,
  type MammographyCADResult,
  type MammographyFinding,
  type BiRadsCategory,
  type FractureDetection as FractureDetectionType,
  type FractureType,
  type DisplacementLevel,
  type AiRadiologyWorklistItem,
  type WorklistPriority,
  type SeverityLevel,
  type ModalityAccuracyMetrics,
} from '@/services/ai-imaging-analysis.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; className: string }> = {
  NORMAL: { label: 'Normal', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  LEVE: { label: 'Leve', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  MODERADO: { label: 'Moderado', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  GRAVE: { label: 'Grave', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  CRITICO: { label: 'Crítico', className: 'bg-red-600/30 text-red-300 border-red-600/50' },
};

const FINDING_LABELS: Record<ChestXrayFindingType, string> = {
  PNEUMOTHORAX: 'Pneumotórax',
  CARDIOMEGALY: 'Cardiomegalia',
  PLEURAL_EFFUSION: 'Derrame Pleural',
  NODULE: 'Nódulo',
  CONSOLIDATION: 'Consolidação',
  ATELECTASIS: 'Atelectasia',
  PNEUMONIA: 'Pneumonia',
  MASS: 'Massa',
  FRACTURE: 'Fratura',
};

const STROKE_LABELS: Record<StrokeType, string> = {
  ISCHEMIC: 'Isquêmico',
  HEMORRHAGIC: 'Hemorrágico',
  NONE: 'Nenhum',
};

const URGENCY_CONFIG: Record<UrgencyClassification, { label: string; className: string }> = {
  ROUTINE: { label: 'Rotina', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  URGENT: { label: 'Urgente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  EMERGENT: { label: 'Emergente', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  STAT: { label: 'STAT', className: 'bg-red-600/30 text-red-300 border-red-600/50' },
};

const BIRADS_CONFIG: Record<BiRadsCategory, { label: string; risk: string; className: string }> = {
  '0': { label: 'BI-RADS 0', risk: 'Inconclusivo', className: 'bg-zinc-500/20 text-zinc-400' },
  '1': { label: 'BI-RADS 1', risk: 'Negativo', className: 'bg-green-500/20 text-green-400' },
  '2': { label: 'BI-RADS 2', risk: 'Benigno', className: 'bg-green-500/20 text-green-400' },
  '3': { label: 'BI-RADS 3', risk: 'Provavelmente Benigno', className: 'bg-blue-500/20 text-blue-400' },
  '4A': { label: 'BI-RADS 4A', risk: 'Baixa Suspeita', className: 'bg-yellow-500/20 text-yellow-400' },
  '4B': { label: 'BI-RADS 4B', risk: 'Moderada Suspeita', className: 'bg-orange-500/20 text-orange-400' },
  '4C': { label: 'BI-RADS 4C', risk: 'Alta Suspeita', className: 'bg-orange-500/20 text-orange-400' },
  '5': { label: 'BI-RADS 5', risk: 'Altamente Sugestivo', className: 'bg-red-600/30 text-red-300' },
  '6': { label: 'BI-RADS 6', risk: 'Malignidade Confirmada', className: 'bg-red-800/30 text-red-200' },
};

const FRACTURE_TYPE_LABELS: Record<FractureType, string> = {
  TRANSVERSE: 'Transversa',
  OBLIQUE: 'Oblíqua',
  SPIRAL: 'Espiral',
  COMMINUTED: 'Cominutiva',
  GREENSTICK: 'Galho Verde',
  COMPRESSION: 'Compressão',
  AVULSION: 'Avulsão',
};

const DISPLACEMENT_LABELS: Record<DisplacementLevel, string> = {
  NONE: 'Sem Desvio',
  MINIMAL: 'Desvio Mínimo',
  MODERATE: 'Desvio Moderado',
  SEVERE: 'Desvio Grave',
};

const PRIORITY_CONFIG: Record<WorklistPriority, { label: string; className: string }> = {
  STAT: { label: 'STAT', className: 'bg-red-600/30 text-red-300 border-red-600/50' },
  URGENT: { label: 'Urgente', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  ROUTINE: { label: 'Rotina', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  LOW: { label: 'Baixa', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ─── Mock Data for fallback ───────────────────────────────────────────────────

function getMockChestXray(): ChestXrayAnalysis[] {
  return [
    {
      id: 'cx-001',
      patientId: 'p-001',
      patientName: 'Maria Santos',
      imageUrl: '/images/chest-xray-sample.dcm',
      status: 'COMPLETED',
      findings: [
        { id: 'f1', type: 'CARDIOMEGALY', description: 'Aumento da silhueta cardíaca com índice cardiotorácico de 0.58', confidence: 0.92, severity: 'MODERADO', boundingBox: { x: 180, y: 120, width: 200, height: 250 }, laterality: 'BILATERAL' },
        { id: 'f2', type: 'PLEURAL_EFFUSION', description: 'Velamento do seio costofrênico direito', confidence: 0.87, severity: 'LEVE', boundingBox: { x: 350, y: 300, width: 120, height: 80 }, laterality: 'RIGHT' },
        { id: 'f3', type: 'CONSOLIDATION', description: 'Opacidade alveolar em base esquerda', confidence: 0.78, severity: 'MODERADO', boundingBox: { x: 60, y: 280, width: 100, height: 90 }, laterality: 'LEFT' },
      ],
      overallImpression: 'Cardiomegalia moderada com derrame pleural à direita e consolidação em base esquerda. Sugestivo de insuficiência cardíaca congestiva com possível pneumonia associada.',
      urgencyScore: 7.5,
      analyzedAt: '2026-03-25T08:30:00Z',
      processingTimeMs: 3200,
    },
    {
      id: 'cx-002',
      patientId: 'p-002',
      patientName: 'João Oliveira',
      imageUrl: '/images/chest-xray-sample2.dcm',
      status: 'COMPLETED',
      findings: [
        { id: 'f4', type: 'PNEUMOTHORAX', description: 'Pneumotórax à direita com colapso parcial de aproximadamente 30%', confidence: 0.95, severity: 'GRAVE', boundingBox: { x: 300, y: 50, width: 180, height: 200 }, laterality: 'RIGHT' },
        { id: 'f5', type: 'NODULE', description: 'Nódulo pulmonar em lobo superior esquerdo, 12mm', confidence: 0.73, severity: 'MODERADO', boundingBox: { x: 100, y: 80, width: 30, height: 30 }, laterality: 'LEFT' },
      ],
      overallImpression: 'Pneumotórax à direita significativo. Nódulo pulmonar em LSE necessitando investigação complementar. Encaminhamento urgente recomendado.',
      urgencyScore: 9.2,
      analyzedAt: '2026-03-25T09:15:00Z',
      processingTimeMs: 2800,
    },
    {
      id: 'cx-003',
      patientId: 'p-003',
      patientName: 'Ana Pereira',
      imageUrl: '/images/chest-xray-sample3.dcm',
      status: 'COMPLETED',
      findings: [],
      overallImpression: 'Radiografia de tórax dentro dos limites da normalidade. Sem alterações cardiopulmonares significativas.',
      urgencyScore: 1.0,
      analyzedAt: '2026-03-25T10:00:00Z',
      processingTimeMs: 2100,
    },
  ];
}

function getMockCTBrain(): CTBrainAnalysis[] {
  return [
    {
      id: 'ct-001',
      patientId: 'p-004',
      patientName: 'Carlos Mendes',
      imageUrl: '/images/ct-brain-sample.dcm',
      status: 'COMPLETED',
      strokeDetected: true,
      strokeType: 'ISCHEMIC',
      midlineShiftMm: 2.3,
      aspectsScore: 7,
      urgency: 'EMERGENT',
      hemorrhageVolumeMl: null,
      affectedTerritory: 'ACM direita',
      findings: [
        { id: 'ctf1', description: 'Hipodensidade em território da ACM direita compatível com AVC isquêmico agudo', confidence: 0.91, location: 'Hemisfério direito - território ACM' },
        { id: 'ctf2', description: 'Discreto desvio de linha média para a esquerda (2.3mm)', confidence: 0.85, location: 'Linha média' },
      ],
      analyzedAt: '2026-03-25T07:45:00Z',
    },
    {
      id: 'ct-002',
      patientId: 'p-005',
      patientName: 'Luciana Ferreira',
      imageUrl: '/images/ct-brain-sample2.dcm',
      status: 'COMPLETED',
      strokeDetected: true,
      strokeType: 'HEMORRHAGIC',
      midlineShiftMm: 5.1,
      aspectsScore: 4,
      urgency: 'STAT',
      hemorrhageVolumeMl: 42,
      affectedTerritory: 'Gânglios da base à esquerda',
      findings: [
        { id: 'ctf3', description: 'Hematoma intraparenquimatoso em gânglios da base à esquerda (42ml)', confidence: 0.96, location: 'Gânglios da base esquerdo' },
        { id: 'ctf4', description: 'Desvio de linha média significativo (5.1mm) para direita', confidence: 0.94, location: 'Linha média' },
        { id: 'ctf5', description: 'Extensão intraventricular do sangramento', confidence: 0.82, location: 'Ventrículo lateral esquerdo' },
      ],
      analyzedAt: '2026-03-25T06:20:00Z',
    },
  ];
}

function getMockMammography(): MammographyCADResult[] {
  return [
    {
      id: 'mam-001',
      patientId: 'p-006',
      patientName: 'Fernanda Costa',
      imageUrl: '/images/mammo-sample.dcm',
      biRads: '4A',
      biRadsDescription: 'Achado de baixa suspeita de malignidade',
      breastDensity: 'C',
      findings: [
        { id: 'mf1', type: 'MICROCALCIFICATION', confidence: 0.84, boundingBox: { x: 150, y: 200, width: 40, height: 35 }, density: 'HIGH', morphology: 'Pleomórficas', distribution: 'Agrupadas', laterality: 'LEFT', location: 'QSE' },
        { id: 'mf2', type: 'MASS', confidence: 0.71, boundingBox: { x: 220, y: 180, width: 25, height: 30 }, density: 'EQUAL', morphology: 'Irregular', distribution: 'Focal', laterality: 'LEFT', location: 'QSE' },
      ],
      recommendedAction: 'Biópsia recomendada. Agendar core biopsy guiada por ultrassom.',
      analyzedAt: '2026-03-25T11:00:00Z',
    },
    {
      id: 'mam-002',
      patientId: 'p-007',
      patientName: 'Juliana Ribeiro',
      imageUrl: '/images/mammo-sample2.dcm',
      biRads: '2',
      biRadsDescription: 'Achados benignos',
      breastDensity: 'B',
      findings: [],
      recommendedAction: 'Mamografia de rastreamento anual.',
      analyzedAt: '2026-03-25T11:30:00Z',
    },
  ];
}

function getMockFractures(): FractureDetectionType[] {
  return [
    {
      id: 'fr-001',
      patientId: 'p-008',
      patientName: 'Roberto Silva',
      imageUrl: '/images/fracture-sample.dcm',
      bodyRegion: 'Punho',
      fractureDetected: true,
      fractures: [
        { id: 'frf1', bone: 'Rádio distal', location: 'Metáfise distal', type: 'TRANSVERSE', displacement: 'MODERATE', confidence: 0.93, boundingBox: { x: 100, y: 200, width: 60, height: 40 }, angulation: 15, description: 'Fratura transversa do rádio distal com desvio dorsal (fratura de Colles)' },
      ],
      overallAssessment: 'Fratura de Colles com desvio moderado. Redução fechada e imobilização recomendadas.',
      analyzedAt: '2026-03-25T12:00:00Z',
    },
    {
      id: 'fr-002',
      patientId: 'p-009',
      patientName: 'Patrícia Lima',
      imageUrl: '/images/fracture-sample2.dcm',
      bodyRegion: 'Tornozelo',
      fractureDetected: true,
      fractures: [
        { id: 'frf2', bone: 'Maléolo lateral', location: 'Fíbula distal', type: 'OBLIQUE', displacement: 'MINIMAL', confidence: 0.88, boundingBox: { x: 180, y: 250, width: 45, height: 50 }, angulation: 8, description: 'Fratura oblíqua do maléolo lateral com desvio mínimo' },
        { id: 'frf3', bone: 'Maléolo medial', location: 'Tíbia distal', type: 'TRANSVERSE', displacement: 'NONE', confidence: 0.76, boundingBox: { x: 120, y: 260, width: 35, height: 30 }, angulation: null, description: 'Possível fratura não desviada do maléolo medial' },
      ],
      overallAssessment: 'Fratura bimaleolar do tornozelo. Avaliação ortopédica urgente recomendada para decisão cirúrgica.',
      analyzedAt: '2026-03-25T13:00:00Z',
    },
  ];
}

function getMockWorklist(): AiRadiologyWorklistItem[] {
  return [
    { id: 'wl-001', patientId: 'p-005', patientName: 'Luciana Ferreira', modality: 'TC', bodyRegion: 'Crânio', priority: 'STAT', aiUrgencyScore: 9.8, suspectedFindings: ['Hemorragia intracraniana', 'Desvio de linha média'], aiConfidence: 0.96, scheduledAt: '2026-03-25T06:15:00Z', status: 'IN_PROGRESS', assignedTo: 'Dr. Ricardo Souza', requestedBy: 'Dra. Ana Silva' },
    { id: 'wl-002', patientId: 'p-004', patientName: 'Carlos Mendes', modality: 'TC', bodyRegion: 'Crânio', priority: 'URGENT', aiUrgencyScore: 8.5, suspectedFindings: ['AVC isquêmico agudo'], aiConfidence: 0.91, scheduledAt: '2026-03-25T07:40:00Z', status: 'PENDING', assignedTo: null, requestedBy: 'Dr. Paulo Lima' },
    { id: 'wl-003', patientId: 'p-002', patientName: 'João Oliveira', modality: 'RX', bodyRegion: 'Tórax', priority: 'URGENT', aiUrgencyScore: 8.2, suspectedFindings: ['Pneumotórax', 'Nódulo pulmonar'], aiConfidence: 0.95, scheduledAt: '2026-03-25T09:10:00Z', status: 'PENDING', assignedTo: null, requestedBy: 'Dra. Claudia Santos' },
    { id: 'wl-004', patientId: 'p-006', patientName: 'Fernanda Costa', modality: 'MG', bodyRegion: 'Mama', priority: 'ROUTINE', aiUrgencyScore: 5.5, suspectedFindings: ['Microcalcificações suspeitas'], aiConfidence: 0.84, scheduledAt: '2026-03-25T10:55:00Z', status: 'PENDING', assignedTo: null, requestedBy: 'Dra. Maria Fernanda' },
    { id: 'wl-005', patientId: 'p-001', patientName: 'Maria Santos', modality: 'RX', bodyRegion: 'Tórax', priority: 'ROUTINE', aiUrgencyScore: 5.0, suspectedFindings: ['Cardiomegalia', 'Derrame pleural'], aiConfidence: 0.92, scheduledAt: '2026-03-25T08:25:00Z', status: 'COMPLETED', assignedTo: 'Dr. Ricardo Souza', requestedBy: 'Dr. João Barros' },
    { id: 'wl-006', patientId: 'p-009', patientName: 'Patrícia Lima', modality: 'RX', bodyRegion: 'Tornozelo', priority: 'ROUTINE', aiUrgencyScore: 4.8, suspectedFindings: ['Fratura bimaleolar'], aiConfidence: 0.88, scheduledAt: '2026-03-25T12:55:00Z', status: 'PENDING', assignedTo: null, requestedBy: 'Dr. Marcos Gomes' },
    { id: 'wl-007', patientId: 'p-003', patientName: 'Ana Pereira', modality: 'RX', bodyRegion: 'Tórax', priority: 'LOW', aiUrgencyScore: 1.0, suspectedFindings: [], aiConfidence: 0.98, scheduledAt: '2026-03-25T09:55:00Z', status: 'COMPLETED', assignedTo: 'Dra. Patrícia Nunes', requestedBy: 'Dr. André Lopes' },
  ];
}

function getMockAccuracyMetrics(): {
  modalityMetrics: ModalityAccuracyMetrics[];
  trends: Array<{ month: string; sensitivity: number; specificity: number; accuracy: number }>;
  overallSensitivity: number;
  overallSpecificity: number;
  totalCasesAnalyzed: number;
  averageProcessingTimeSec: number;
} {
  return {
    modalityMetrics: [
      { modality: 'RX Tórax', totalCases: 1240, sensitivity: 0.94, specificity: 0.91, ppv: 0.88, npv: 0.96, falsePositiveRate: 0.09, falseNegativeRate: 0.06, aiAccuracy: 0.92, radiologistAccuracy: 0.95, agreementRate: 0.89 },
      { modality: 'TC Crânio', totalCases: 680, sensitivity: 0.97, specificity: 0.93, ppv: 0.91, npv: 0.98, falsePositiveRate: 0.07, falseNegativeRate: 0.03, aiAccuracy: 0.95, radiologistAccuracy: 0.97, agreementRate: 0.92 },
      { modality: 'Mamografia', totalCases: 520, sensitivity: 0.91, specificity: 0.88, ppv: 0.82, npv: 0.95, falsePositiveRate: 0.12, falseNegativeRate: 0.09, aiAccuracy: 0.89, radiologistAccuracy: 0.93, agreementRate: 0.86 },
      { modality: 'RX Ortopédico', totalCases: 890, sensitivity: 0.93, specificity: 0.90, ppv: 0.87, npv: 0.95, falsePositiveRate: 0.10, falseNegativeRate: 0.07, aiAccuracy: 0.91, radiologistAccuracy: 0.94, agreementRate: 0.88 },
    ],
    trends: [
      { month: 'Out/25', sensitivity: 0.88, specificity: 0.86, accuracy: 0.87 },
      { month: 'Nov/25', sensitivity: 0.89, specificity: 0.87, accuracy: 0.88 },
      { month: 'Dez/25', sensitivity: 0.91, specificity: 0.89, accuracy: 0.90 },
      { month: 'Jan/26', sensitivity: 0.92, specificity: 0.90, accuracy: 0.91 },
      { month: 'Fev/26', sensitivity: 0.93, specificity: 0.91, accuracy: 0.92 },
      { month: 'Mar/26', sensitivity: 0.94, specificity: 0.92, accuracy: 0.93 },
    ],
    overallSensitivity: 0.94,
    overallSpecificity: 0.91,
    totalCasesAnalyzed: 3330,
    averageProcessingTimeSec: 3.1,
  };
}

// ─── Upload Area Component ────────────────────────────────────────────────────

function UploadArea({
  onUpload,
  isLoading,
  label,
}: {
  onUpload: (file: File) => void;
  isLoading: boolean;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(file);
    },
    [onUpload],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload],
  );

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
        dragOver
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600',
      )}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".dcm,.dicom,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleChange}
      />
      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
          <p className="text-sm text-zinc-400">Analisando imagem...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-zinc-500" />
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="text-xs text-zinc-600">DICOM, PNG, JPEG</p>
        </div>
      )}
    </div>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const color =
    value >= 0.9 ? 'bg-emerald-500' : value >= 0.75 ? 'bg-yellow-500' : 'bg-orange-500';
  return (
    <div className="flex items-center gap-2">
      <div className={cn('rounded-full bg-zinc-800 overflow-hidden', size === 'lg' ? 'h-3 w-24' : 'h-2 w-16')}>
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={cn('font-mono', size === 'lg' ? 'text-sm' : 'text-xs', 'text-zinc-400')}>
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function FindingDetailDialog({
  open,
  onClose,
  finding,
}: {
  open: boolean;
  onClose: () => void;
  finding: ChestXrayFinding | null;
}) {
  if (!finding) return null;
  const sev = SEVERITY_CONFIG[finding.severity];
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-400" />
            {FINDING_LABELS[finding.type]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-zinc-400 text-xs">Descrição</Label>
            <p className="text-zinc-200 text-sm mt-1">{finding.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs">Confiança</Label>
              <div className="mt-1"><ConfidenceBar value={finding.confidence} size="lg" /></div>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Severidade</Label>
              <Badge variant="outline" className={cn('mt-1', sev.className)}>{sev.label}</Badge>
            </div>
          </div>
          {finding.laterality && (
            <div>
              <Label className="text-zinc-400 text-xs">Lateralidade</Label>
              <p className="text-zinc-200 text-sm mt-1">
                {finding.laterality === 'LEFT' ? 'Esquerdo' : finding.laterality === 'RIGHT' ? 'Direito' : 'Bilateral'}
              </p>
            </div>
          )}
          {finding.boundingBox && (
            <div>
              <Label className="text-zinc-400 text-xs">Coordenadas (Bounding Box)</Label>
              <div className="mt-1 font-mono text-xs text-zinc-400 bg-zinc-800/50 rounded p-2">
                x: {finding.boundingBox.x}, y: {finding.boundingBox.y}, w: {finding.boundingBox.width}, h: {finding.boundingBox.height}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 1 — Análise de RX Tórax
// ═════════════════════════════════════════════════════════════════════════════

function ChestXrayTab() {
  const { data: apiData } = useChestXrayAnalysis();
  const analyzeXray = useAnalyzeChestXray();
  const [selectedFinding, setSelectedFinding] = useState<ChestXrayFinding | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const analyses = useMemo(() => apiData?.data ?? getMockChestXray(), [apiData]);

  const handleUpload = useCallback(
    (file: File) => {
      analyzeXray.mutate(
        { file },
        {
          onSuccess: () => toast.success('Análise de RX de tórax concluída!'),
          onError: () => toast.error('Erro ao analisar imagem.'),
        },
      );
    },
    [analyzeXray],
  );

  const totalFindings = useMemo(
    () => analyses.reduce((sum, a) => sum + a.findings.length, 0),
    [analyses],
  );

  const criticalCount = useMemo(
    () =>
      analyses.reduce(
        (sum, a) => sum + a.findings.filter((f) => f.severity === 'GRAVE' || f.severity === 'CRITICO').length,
        0,
      ),
    [analyses],
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2"><FileImage className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Exames Analisados</p>
              <p className="text-xl font-bold text-zinc-100">{analyses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2"><Target className="h-5 w-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Achados Totais</p>
              <p className="text-xl font-bold text-zinc-100">{totalFindings}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Achados Críticos</p>
              <p className="text-xl font-bold text-zinc-100">{criticalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/20 p-2"><Clock className="h-5 w-5 text-yellow-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Tempo Médio</p>
              <p className="text-xl font-bold text-zinc-100">
                {analyses.length > 0
                  ? `${(analyses.reduce((s, a) => s + a.processingTimeMs, 0) / analyses.length / 1000).toFixed(1)}s`
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-400" />
            Enviar RX de Tórax para Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadArea
            onUpload={handleUpload}
            isLoading={analyzeXray.isPending}
            label="Arraste uma radiografia de tórax ou clique para selecionar"
          />
        </CardContent>
      </Card>

      {/* Results */}
      {analyses.map((analysis) => (
        <Card key={analysis.id} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                <ScanEye className="h-4 w-4 text-emerald-400" />
                {analysis.patientName}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    analysis.urgencyScore >= 8
                      ? 'bg-red-600/30 text-red-300 border-red-600/50'
                      : analysis.urgencyScore >= 5
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                        : 'bg-green-500/20 text-green-400 border-green-500/50',
                  )}
                >
                  Urgência: {analysis.urgencyScore.toFixed(1)}
                </Badge>
                <span className="text-xs text-zinc-500">{formatDate(analysis.analyzedAt)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Findings */}
            {analysis.findings.length === 0 ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Sem achados significativos</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Achados da IA</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {analysis.findings.map((finding) => {
                    const sev = SEVERITY_CONFIG[finding.severity];
                    return (
                      <div
                        key={finding.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3 cursor-pointer hover:border-emerald-500/50 transition-colors"
                        onClick={() => { setSelectedFinding(finding); setDetailDialogOpen(true); }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-200">
                                {FINDING_LABELS[finding.type]}
                              </span>
                              <Badge variant="outline" className={cn('text-xs', sev.className)}>
                                {sev.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{finding.description}</p>
                          </div>
                          <div className="ml-2">
                            <ConfidenceBar value={finding.confidence} />
                          </div>
                        </div>
                        {finding.boundingBox && (
                          <div className="mt-2 text-xs text-zinc-600 font-mono">
                            BBox: ({finding.boundingBox.x}, {finding.boundingBox.y}) {finding.boundingBox.width}x{finding.boundingBox.height}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Overall Impression */}
            <div className="rounded-lg bg-zinc-800/30 p-3 border border-zinc-800">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Impressão Geral da IA</p>
              <p className="text-sm text-zinc-300">{analysis.overallImpression}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <FindingDetailDialog
        open={detailDialogOpen}
        onClose={() => { setDetailDialogOpen(false); setSelectedFinding(null); }}
        finding={selectedFinding}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 2 — Análise de TC Crânio
// ═════════════════════════════════════════════════════════════════════════════

function CTBrainTab() {
  const { data: apiData } = useCTBrainAnalysis();
  const analyzeCT = useAnalyzeCTBrain();

  const analyses = useMemo(() => apiData?.data ?? getMockCTBrain(), [apiData]);

  const handleUpload = useCallback(
    (file: File) => {
      analyzeCT.mutate(
        { file },
        {
          onSuccess: () => toast.success('Análise de TC de crânio concluída!'),
          onError: () => toast.error('Erro ao analisar imagem.'),
        },
      );
    },
    [analyzeCT],
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2"><BrainCircuit className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">TCs Analisadas</p>
              <p className="text-xl font-bold text-zinc-100">{analyses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2"><Zap className="h-5 w-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">AVCs Detectados</p>
              <p className="text-xl font-bold text-zinc-100">{analyses.filter((a) => a.strokeDetected).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/20 p-2"><AlertTriangle className="h-5 w-5 text-orange-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Hemorrágicos</p>
              <p className="text-xl font-bold text-zinc-100">{analyses.filter((a) => a.strokeType === 'HEMORRHAGIC').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/20 p-2"><Activity className="h-5 w-5 text-yellow-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Isquêmicos</p>
              <p className="text-xl font-bold text-zinc-100">{analyses.filter((a) => a.strokeType === 'ISCHEMIC').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-400" />
            Enviar TC de Crânio para Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadArea
            onUpload={handleUpload}
            isLoading={analyzeCT.isPending}
            label="Arraste uma tomografia de crânio ou clique para selecionar"
          />
        </CardContent>
      </Card>

      {/* Results */}
      {analyses.map((ct) => {
        const urgCfg = URGENCY_CONFIG[ct.urgency];
        return (
          <Card key={ct.id} className={cn('bg-zinc-900 border-zinc-800', ct.urgency === 'STAT' && 'border-red-600/50')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-emerald-400" />
                  {ct.patientName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(urgCfg.className)}>{urgCfg.label}</Badge>
                  <span className="text-xs text-zinc-500">{formatDate(ct.analyzedAt)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stroke Detection */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">AVC Detectado</p>
                  <div className="flex items-center gap-2 mt-1">
                    {ct.strokeDetected ? (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <span className="text-lg font-bold text-red-300">{STROKE_LABELS[ct.strokeType]}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        <span className="text-lg font-bold text-green-300">Não</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Desvio de Linha Média</p>
                  <p className={cn('text-lg font-bold mt-1', ct.midlineShiftMm > 5 ? 'text-red-300' : ct.midlineShiftMm > 2 ? 'text-yellow-300' : 'text-green-300')}>
                    {ct.midlineShiftMm.toFixed(1)} mm
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">ASPECTS Score</p>
                  <p className={cn('text-lg font-bold mt-1', ct.aspectsScore <= 5 ? 'text-red-300' : ct.aspectsScore <= 7 ? 'text-yellow-300' : 'text-green-300')}>
                    {ct.aspectsScore}/10
                  </p>
                </div>
              </div>

              {/* Extra info */}
              {ct.hemorrhageVolumeMl !== null && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-3">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Volume da Hemorragia</p>
                    <p className="text-lg font-bold text-red-300 mt-1">{ct.hemorrhageVolumeMl} ml</p>
                  </div>
                  {ct.affectedTerritory && (
                    <div className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-3">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">Território Afetado</p>
                      <p className="text-sm text-zinc-200 mt-1">{ct.affectedTerritory}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Findings */}
              {ct.findings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Achados</p>
                  {ct.findings.map((f) => (
                    <div key={f.id} className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-zinc-200">{f.description}</p>
                          <p className="text-xs text-zinc-500 mt-1">Local: {f.location}</p>
                        </div>
                        <ConfidenceBar value={f.confidence} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3 — CAD Mamografia
// ═════════════════════════════════════════════════════════════════════════════

function MammographyTab() {
  const { data: apiData } = useMammographyCAD();
  const analyzeMammo = useAnalyzeMammography();

  const results = useMemo(() => apiData?.data ?? getMockMammography(), [apiData]);

  const handleUpload = useCallback(
    (file: File) => {
      analyzeMammo.mutate(
        { file },
        {
          onSuccess: () => toast.success('Análise de mamografia concluída!'),
          onError: () => toast.error('Erro ao analisar imagem.'),
        },
      );
    },
    [analyzeMammo],
  );

  const findingTypeLabels: Record<MammographyFinding['type'], string> = {
    MICROCALCIFICATION: 'Microcalcificação',
    MASS: 'Massa',
    ARCHITECTURAL_DISTORTION: 'Distorção Arquitetural',
    ASYMMETRY: 'Assimetria',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-pink-500/20 p-2"><Heart className="h-5 w-5 text-pink-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Mamografias Analisadas</p>
              <p className="text-xl font-bold text-zinc-100">{results.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/20 p-2"><AlertTriangle className="h-5 w-5 text-orange-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">BI-RADS {'>'}= 4</p>
              <p className="text-xl font-bold text-zinc-100">
                {results.filter((r) => r.biRads >= '4A').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2"><CircleDot className="h-5 w-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Microcalcificações</p>
              <p className="text-xl font-bold text-zinc-100">
                {results.reduce((s, r) => s + r.findings.filter((f) => f.type === 'MICROCALCIFICATION').length, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Sem Achados</p>
              <p className="text-xl font-bold text-zinc-100">{results.filter((r) => r.findings.length === 0).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-400" />
            Enviar Mamografia para Análise CAD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadArea
            onUpload={handleUpload}
            isLoading={analyzeMammo.isPending}
            label="Arraste uma mamografia ou clique para selecionar"
          />
        </CardContent>
      </Card>

      {/* Results */}
      {results.map((mam) => {
        const birads = BIRADS_CONFIG[mam.biRads];
        return (
          <Card key={mam.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-400" />
                  {mam.patientName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(birads.className)}>{birads.label}</Badge>
                  <span className="text-xs text-zinc-500">{formatDate(mam.analyzedAt)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* BI-RADS + Density */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Classificação BI-RADS</p>
                  <p className="text-lg font-bold text-zinc-200 mt-1">{birads.label}</p>
                  <p className="text-xs text-zinc-400">{birads.risk}</p>
                </div>
                <div className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Densidade Mamária</p>
                  <p className="text-lg font-bold text-zinc-200 mt-1">Tipo {mam.breastDensity}</p>
                  <p className="text-xs text-zinc-400">
                    {mam.breastDensity === 'A' ? 'Quase inteiramente gordurosa' :
                     mam.breastDensity === 'B' ? 'Densidades fibroglandulares esparsas' :
                     mam.breastDensity === 'C' ? 'Heterogeneamente densa' :
                     'Extremamente densa'}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Ação Recomendada</p>
                  <p className="text-sm text-zinc-200 mt-1">{mam.recommendedAction}</p>
                </div>
              </div>

              {/* Findings */}
              {mam.findings.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Sem achados suspeitos</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Achados CAD</p>
                  {mam.findings.map((f) => (
                    <div key={f.id} className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-200">{findingTypeLabels[f.type]}</span>
                            <Badge variant="outline" className="text-xs bg-zinc-700/50 text-zinc-300">
                              {f.laterality === 'LEFT' ? 'Esq' : 'Dir'} — {f.location}
                            </Badge>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
                            <p>Morfologia: {f.morphology}</p>
                            <p>Distribuição: {f.distribution}</p>
                            <p>Densidade: {f.density === 'FAT' ? 'Gordurosa' : f.density === 'LOW' ? 'Baixa' : f.density === 'EQUAL' ? 'Igual' : 'Alta'}</p>
                          </div>
                        </div>
                        <ConfidenceBar value={f.confidence} />
                      </div>
                      {f.boundingBox && (
                        <div className="mt-2 text-xs text-zinc-600 font-mono">
                          BBox: ({f.boundingBox.x}, {f.boundingBox.y}) {f.boundingBox.width}x{f.boundingBox.height}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 4 — Detecção de Fraturas
// ═════════════════════════════════════════════════════════════════════════════

function FractureTab() {
  const { data: apiData } = useFractureDetection();
  const analyzeFracture = useAnalyzeFracture();

  const detections = useMemo(() => apiData?.data ?? getMockFractures(), [apiData]);

  const handleUpload = useCallback(
    (file: File) => {
      analyzeFracture.mutate(
        { file },
        {
          onSuccess: () => toast.success('Análise de fratura concluída!'),
          onError: () => toast.error('Erro ao analisar imagem.'),
        },
      );
    },
    [analyzeFracture],
  );

  const totalFractures = useMemo(
    () => detections.reduce((s, d) => s + d.fractures.length, 0),
    [detections],
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2"><Bone className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">RX Analisados</p>
              <p className="text-xl font-bold text-zinc-100">{detections.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2"><XCircle className="h-5 w-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Fraturas Detectadas</p>
              <p className="text-xl font-bold text-zinc-100">{totalFractures}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/20 p-2"><AlertTriangle className="h-5 w-5 text-orange-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Com Desvio</p>
              <p className="text-xl font-bold text-zinc-100">
                {detections.reduce((s, d) => s + d.fractures.filter((f) => f.displacement !== 'NONE').length, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-500/20 p-2"><CheckCircle2 className="h-5 w-5 text-green-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Sem Fraturas</p>
              <p className="text-xl font-bold text-zinc-100">{detections.filter((d) => !d.fractureDetected).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-400" />
            Enviar RX para Detecção de Fraturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadArea
            onUpload={handleUpload}
            isLoading={analyzeFracture.isPending}
            label="Arraste uma radiografia ortopédica ou clique para selecionar"
          />
        </CardContent>
      </Card>

      {/* Results */}
      {detections.map((det) => (
        <Card key={det.id} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                <Bone className="h-4 w-4 text-emerald-400" />
                {det.patientName}
                <Badge variant="outline" className="text-xs bg-zinc-700/50 text-zinc-300 ml-2">{det.bodyRegion}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {det.fractureDetected ? (
                  <Badge variant="outline" className="bg-red-600/30 text-red-300 border-red-600/50">
                    Fratura Detectada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                    Sem Fratura
                  </Badge>
                )}
                <span className="text-xs text-zinc-500">{formatDate(det.analyzedAt)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {det.fractures.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Fraturas Identificadas</p>
                {det.fractures.map((fr) => (
                  <div key={fr.id} className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-zinc-200">{fr.bone}</span>
                          <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400">
                            {FRACTURE_TYPE_LABELS[fr.type]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              fr.displacement === 'SEVERE'
                                ? 'bg-red-600/30 text-red-300'
                                : fr.displacement === 'MODERATE'
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : fr.displacement === 'MINIMAL'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-green-500/20 text-green-400',
                            )}
                          >
                            {DISPLACEMENT_LABELS[fr.displacement]}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{fr.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                          <span>Local: {fr.location}</span>
                          {fr.angulation !== null && <span>Angulação: {fr.angulation}°</span>}
                        </div>
                      </div>
                      <ConfidenceBar value={fr.confidence} />
                    </div>
                    {fr.boundingBox && (
                      <div className="mt-2 text-xs text-zinc-600 font-mono">
                        BBox: ({fr.boundingBox.x}, {fr.boundingBox.y}) {fr.boundingBox.width}x{fr.boundingBox.height}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Overall Assessment */}
            <div className="rounded-lg bg-zinc-800/30 p-3 border border-zinc-800">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Avaliação Geral da IA</p>
              <p className="text-sm text-zinc-300">{det.overallAssessment}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 5 — Worklist Priorizada
// ═════════════════════════════════════════════════════════════════════════════

function WorklistTab() {
  const { data: apiData } = useAiRadiologyWorklist();
  const reprioritize = useReprioritize();
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const items = useMemo(() => apiData?.data ?? getMockWorklist(), [apiData]);

  const filtered = useMemo(() => {
    let result = items;
    if (filterPriority !== 'all') {
      result = result.filter((i) => i.priority === filterPriority);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.patientName.toLowerCase().includes(lower) ||
          i.bodyRegion.toLowerCase().includes(lower) ||
          i.suspectedFindings.some((f) => f.toLowerCase().includes(lower)),
      );
    }
    return result.sort((a, b) => b.aiUrgencyScore - a.aiUrgencyScore);
  }, [items, filterPriority, searchTerm]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400' },
    IN_PROGRESS: { label: 'Em Progresso', className: 'bg-blue-500/20 text-blue-400' },
    COMPLETED: { label: 'Concluído', className: 'bg-green-500/20 text-green-400' },
    REPORTED: { label: 'Laudado', className: 'bg-emerald-500/20 text-emerald-400' },
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar paciente ou achado..."
              className="bg-zinc-900 border-zinc-800 pl-9 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="STAT">STAT</SelectItem>
              <SelectItem value="URGENT">Urgente</SelectItem>
              <SelectItem value="ROUTINE">Rotina</SelectItem>
              <SelectItem value="LOW">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-300"
          onClick={() => reprioritize.mutate(undefined, { onSuccess: () => toast.success('Worklist repriorizada!') })}
          disabled={reprioritize.isPending}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', reprioritize.isPending && 'animate-spin')} />
          Repriorizar IA
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2"><ListChecks className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Total na Fila</p>
              <p className="text-xl font-bold text-zinc-100">{items.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2"><Zap className="h-5 w-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">STAT</p>
              <p className="text-xl font-bold text-zinc-100">{items.filter((i) => i.priority === 'STAT').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/20 p-2"><Clock className="h-5 w-5 text-yellow-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Pendentes</p>
              <p className="text-xl font-bold text-zinc-100">{items.filter((i) => i.status === 'PENDING').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-500/20 p-2"><CheckCircle2 className="h-5 w-5 text-green-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Concluídos</p>
              <p className="text-xl font-bold text-zinc-100">{items.filter((i) => i.status === 'COMPLETED' || i.status === 'REPORTED').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">#</TableHead>
                <TableHead className="text-zinc-400">Paciente</TableHead>
                <TableHead className="text-zinc-400">Modalidade</TableHead>
                <TableHead className="text-zinc-400">Região</TableHead>
                <TableHead className="text-zinc-400">Prioridade</TableHead>
                <TableHead className="text-zinc-400">Score IA</TableHead>
                <TableHead className="text-zinc-400">Achados Suspeitos</TableHead>
                <TableHead className="text-zinc-400">Confiança</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => {
                const priCfg = PRIORITY_CONFIG[item.priority];
                const stCfg = statusConfig[item.status] ?? { label: item.status, className: '' };
                return (
                  <TableRow key={item.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="text-zinc-500 font-mono text-xs">{idx + 1}</TableCell>
                    <TableCell className="text-zinc-200 font-medium">{item.patientName}</TableCell>
                    <TableCell className="text-zinc-300">{item.modality}</TableCell>
                    <TableCell className="text-zinc-300">{item.bodyRegion}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', priCfg.className)}>{priCfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'font-mono font-bold text-sm',
                        item.aiUrgencyScore >= 8 ? 'text-red-400' : item.aiUrgencyScore >= 5 ? 'text-yellow-400' : 'text-green-400',
                      )}>
                        {item.aiUrgencyScore.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.suspectedFindings.length === 0 ? (
                          <span className="text-xs text-zinc-500">Nenhum</span>
                        ) : (
                          item.suspectedFindings.map((f, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700">
                              {f}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell><ConfidenceBar value={item.aiConfidence} /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', stCfg.className)}>{stCfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">{item.assignedTo ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={10} className="text-center text-zinc-500 py-8">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 6 — Métricas de Acurácia
// ═════════════════════════════════════════════════════════════════════════════

function AccuracyMetricsTab() {
  const { data: apiData } = useImagingAccuracyMetrics();

  const dashboard = useMemo(() => apiData ?? getMockAccuracyMetrics(), [apiData]);

  const comparisonData = useMemo(
    () =>
      dashboard.modalityMetrics.map((m) => ({
        modality: m.modality,
        'IA': +(m.aiAccuracy * 100).toFixed(1),
        'Radiologista': +(m.radiologistAccuracy * 100).toFixed(1),
      })),
    [dashboard],
  );

  const radarData = useMemo(
    () =>
      dashboard.modalityMetrics.map((m) => ({
        modality: m.modality,
        Sensibilidade: +(m.sensitivity * 100).toFixed(1),
        Especificidade: +(m.specificity * 100).toFixed(1),
        VPP: +(m.ppv * 100).toFixed(1),
        VPN: +(m.npv * 100).toFixed(1),
      })),
    [dashboard],
  );

  const trendData = useMemo(
    () =>
      dashboard.trends.map((t) => ({
        month: t.month,
        Sensibilidade: +(t.sensitivity * 100).toFixed(1),
        Especificidade: +(t.specificity * 100).toFixed(1),
        Acurácia: +(t.accuracy * 100).toFixed(1),
      })),
    [dashboard],
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2"><TrendingUp className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Sensibilidade Geral</p>
              <p className="text-xl font-bold text-emerald-400">{pct(dashboard.overallSensitivity)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2"><Shield className="h-5 w-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Especificidade Geral</p>
              <p className="text-xl font-bold text-blue-400">{pct(dashboard.overallSpecificity)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2"><BarChart3 className="h-5 w-5 text-purple-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Total Analisados</p>
              <p className="text-xl font-bold text-zinc-100">{dashboard.totalCasesAnalyzed.toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/20 p-2"><Clock className="h-5 w-5 text-yellow-400" /></div>
            <div>
              <p className="text-xs text-zinc-500">Tempo Médio</p>
              <p className="text-xl font-bold text-zinc-100">{dashboard.averageProcessingTimeSec.toFixed(1)}s</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Comparison + Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI vs Radiologist comparison */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              IA vs Radiologista — Acurácia (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="modality" stroke="#71717a" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#71717a" domain={[70, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#d4d4d8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="IA" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Radiologista" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend over time */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Evolução Temporal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#71717a" domain={[80, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#d4d4d8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Sensibilidade" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Especificidade" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Acurácia" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modality Metrics Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Métricas por Modalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Modalidade</TableHead>
                <TableHead className="text-zinc-400 text-center">Casos</TableHead>
                <TableHead className="text-zinc-400 text-center">Sensibilidade</TableHead>
                <TableHead className="text-zinc-400 text-center">Especificidade</TableHead>
                <TableHead className="text-zinc-400 text-center">VPP</TableHead>
                <TableHead className="text-zinc-400 text-center">VPN</TableHead>
                <TableHead className="text-zinc-400 text-center">Falso +</TableHead>
                <TableHead className="text-zinc-400 text-center">Falso -</TableHead>
                <TableHead className="text-zinc-400 text-center">Concordância</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.modalityMetrics.map((m) => (
                <TableRow key={m.modality} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="text-zinc-200 font-medium">{m.modality}</TableCell>
                  <TableCell className="text-center text-zinc-300">{m.totalCases}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn('font-mono text-sm', m.sensitivity >= 0.9 ? 'text-emerald-400' : 'text-yellow-400')}>
                      {pct(m.sensitivity)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn('font-mono text-sm', m.specificity >= 0.9 ? 'text-emerald-400' : 'text-yellow-400')}>
                      {pct(m.specificity)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-zinc-300 font-mono text-sm">{pct(m.ppv)}</TableCell>
                  <TableCell className="text-center text-zinc-300 font-mono text-sm">{pct(m.npv)}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn('font-mono text-sm', m.falsePositiveRate > 0.1 ? 'text-red-400' : 'text-zinc-400')}>
                      {pct(m.falsePositiveRate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn('font-mono text-sm', m.falseNegativeRate > 0.05 ? 'text-red-400' : 'text-zinc-400')}>
                      {pct(m.falseNegativeRate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-zinc-300 font-mono text-sm">{pct(m.agreementRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Radar chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            Performance por Modalidade (Radar)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis dataKey="modality" stroke="#71717a" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis stroke="#3f3f46" domain={[70, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Radar name="Sensibilidade" dataKey="Sensibilidade" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Radar name="Especificidade" dataKey="Especificidade" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                <Radar name="VPP" dataKey="VPP" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                <Radar name="VPN" dataKey="VPN" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* False positive/negative rates bar chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            Taxa de Falso Positivo / Falso Negativo (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.modalityMetrics.map((m) => ({
                  modality: m.modality,
                  'Falso Positivo': +(m.falsePositiveRate * 100).toFixed(1),
                  'Falso Negativo': +(m.falseNegativeRate * 100).toFixed(1),
                }))}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="modality" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" domain={[0, 15]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                  labelStyle={{ color: '#d4d4d8' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Falso Positivo" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Falso Negativo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═════════════════════════════════════════════════════════════════════════════

export default function ImagingAnalysisPage() {
  const [activeTab, setActiveTab] = useState('chest-xray');

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ScanEye className="h-7 w-7 text-emerald-400" />
            Análise de Imagens Médicas — IA
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Detecção assistida por inteligência artificial em radiologia diagnóstica
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
            <Activity className="h-3 w-3 mr-1" />
            IA Ativa
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1 flex-wrap h-auto">
          <TabsTrigger value="chest-xray" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <ScanEye className="h-4 w-4 mr-1.5" />
            RX Tórax
          </TabsTrigger>
          <TabsTrigger value="ct-brain" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <BrainCircuit className="h-4 w-4 mr-1.5" />
            TC Crânio
          </TabsTrigger>
          <TabsTrigger value="mammography" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Heart className="h-4 w-4 mr-1.5" />
            CAD Mamografia
          </TabsTrigger>
          <TabsTrigger value="fracture" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Bone className="h-4 w-4 mr-1.5" />
            Fraturas
          </TabsTrigger>
          <TabsTrigger value="worklist" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <ListChecks className="h-4 w-4 mr-1.5" />
            Worklist
          </TabsTrigger>
          <TabsTrigger value="accuracy" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Acurácia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chest-xray" className="mt-6">
          <ChestXrayTab />
        </TabsContent>
        <TabsContent value="ct-brain" className="mt-6">
          <CTBrainTab />
        </TabsContent>
        <TabsContent value="mammography" className="mt-6">
          <MammographyTab />
        </TabsContent>
        <TabsContent value="fracture" className="mt-6">
          <FractureTab />
        </TabsContent>
        <TabsContent value="worklist" className="mt-6">
          <WorklistTab />
        </TabsContent>
        <TabsContent value="accuracy" className="mt-6">
          <AccuracyMetricsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
