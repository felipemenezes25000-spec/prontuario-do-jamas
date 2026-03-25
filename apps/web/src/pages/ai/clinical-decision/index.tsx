import { useState, useCallback, useMemo } from 'react';
import {
  Brain,
  Calculator,
  AlertTriangle,
  FileText,
  Pill,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
  XCircle,
  Loader2,
  BookOpen,
  Beaker,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useDifferentialDiagnosis,
  usePredictiveAlerts,
  useProtocolRecommendation,
  useDrugInteractionCheck,
} from '@/services/ai-clinical-decision.service';
import type {
  DifferentialDiagnosisItem,
  DifferentialDiagnosisResult,
  PredictiveAlert,
  RiskType,
  ProtocolRecommendation,
  DrugInteractionCheckResult,
  InteractionSeverity,
  CalculatorResult,
  ClinicalCalculatorId,
} from '@/services/ai-clinical-decision.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_TYPE_CONFIG: Record<RiskType, { label: string; icon: typeof Activity; className: string }> = {
  SEPSIS: { label: 'Sepse', icon: Zap, className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  FALL: { label: 'Queda', icon: AlertTriangle, className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  READMISSION: { label: 'Readmissão', icon: RefreshCw, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  MORTALITY: { label: 'Mortalidade', icon: ShieldAlert, className: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  DETERIORATION: { label: 'Deterioração', icon: TrendingDown, className: 'bg-pink-500/20 text-pink-400 border-pink-500/50' },
};

const TREND_CONFIG: Record<string, { label: string; icon: typeof TrendingUp; className: string }> = {
  RISING: { label: 'Subindo', icon: TrendingUp, className: 'text-red-400' },
  STABLE: { label: 'Estável', icon: Minus, className: 'text-yellow-400' },
  FALLING: { label: 'Descendo', icon: TrendingDown, className: 'text-green-400' },
};

const SEVERITY_CONFIG: Record<InteractionSeverity, { label: string; className: string; bgClassName: string }> = {
  CRITICAL: { label: 'Crítica', className: 'text-red-400', bgClassName: 'bg-red-500/20 text-red-400 border-red-500/50' },
  MAJOR: { label: 'Maior', className: 'text-orange-400', bgClassName: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  MODERATE: { label: 'Moderada', className: 'text-yellow-400', bgClassName: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  MINOR: { label: 'Menor', className: 'text-blue-400', bgClassName: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
};

const EVIDENCE_LEVEL_LABELS: Record<string, string> = {
  A: 'Nível A — Evidência forte',
  B: 'Nível B — Evidência moderada',
  C: 'Nível C — Evidência fraca',
  D: 'Nível D — Opinião de especialista',
};

// ─── Calculator Definitions (local, no API needed) ─────────────────────────

interface LocalCalcField {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'select';
  options?: { value: number; label: string }[];
  min?: number;
  max?: number;
}

interface LocalCalculatorDef {
  id: ClinicalCalculatorId;
  name: string;
  description: string;
  category: string;
  fields: LocalCalcField[];
  calculate: (values: Record<string, number | boolean>) => CalculatorResult;
}

function boolToNum(v: unknown): number {
  return v === true ? 1 : 0;
}

function numVal(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : fallback;
}

const CALCULATORS: LocalCalculatorDef[] = [
  {
    id: 'GLASGOW',
    name: 'Escala de Coma de Glasgow',
    description: 'Avaliação do nível de consciência',
    category: 'Neurologia',
    fields: [
      { key: 'eye', label: 'Resposta Ocular', type: 'select', options: [
        { value: 1, label: '1 — Nenhuma' }, { value: 2, label: '2 — À pressão' },
        { value: 3, label: '3 — Ao som' }, { value: 4, label: '4 — Espontânea' },
      ]},
      { key: 'verbal', label: 'Resposta Verbal', type: 'select', options: [
        { value: 1, label: '1 — Nenhuma' }, { value: 2, label: '2 — Sons' },
        { value: 3, label: '3 — Palavras' }, { value: 4, label: '4 — Confusa' },
        { value: 5, label: '5 — Orientada' },
      ]},
      { key: 'motor', label: 'Resposta Motora', type: 'select', options: [
        { value: 1, label: '1 — Nenhuma' }, { value: 2, label: '2 — Extensão' },
        { value: 3, label: '3 — Flexão anormal' }, { value: 4, label: '4 — Flexão normal' },
        { value: 5, label: '5 — Localiza dor' }, { value: 6, label: '6 — Obedece comandos' },
      ]},
    ],
    calculate: (v) => {
      const score = numVal(v.eye, 1) + numVal(v.verbal, 1) + numVal(v.motor, 1);
      let interpretation = '';
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      if (score <= 8) { interpretation = 'TCE grave — IOT indicada'; riskLevel = 'VERY_HIGH'; }
      else if (score <= 12) { interpretation = 'TCE moderado'; riskLevel = 'HIGH'; }
      else if (score <= 14) { interpretation = 'TCE leve'; riskLevel = 'MODERATE'; }
      else { interpretation = 'Normal'; riskLevel = 'LOW'; }
      return { calculatorId: 'GLASGOW', score, maxScore: 15, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'CHADS2_VASC',
    name: 'CHA₂DS₂-VASc',
    description: 'Risco de AVC em fibrilação atrial',
    category: 'Cardiologia',
    fields: [
      { key: 'chf', label: 'IC congestiva', type: 'boolean' },
      { key: 'hypertension', label: 'Hipertensão', type: 'boolean' },
      { key: 'age75', label: 'Idade ≥ 75 anos', type: 'boolean' },
      { key: 'diabetes', label: 'Diabetes', type: 'boolean' },
      { key: 'stroke', label: 'AVC/AIT/tromboembolismo prévio', type: 'boolean' },
      { key: 'vascular', label: 'Doença vascular', type: 'boolean' },
      { key: 'age65', label: 'Idade 65-74 anos', type: 'boolean' },
      { key: 'female', label: 'Sexo feminino', type: 'boolean' },
    ],
    calculate: (v) => {
      const score = boolToNum(v.chf) + boolToNum(v.hypertension) + boolToNum(v.age75) * 2
        + boolToNum(v.diabetes) + boolToNum(v.stroke) * 2 + boolToNum(v.vascular)
        + boolToNum(v.age65) + boolToNum(v.female);
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (score === 0) { riskLevel = 'LOW'; interpretation = 'Risco baixo — anticoagulação geralmente não indicada'; }
      else if (score === 1) { riskLevel = 'MODERATE'; interpretation = 'Risco moderado — considerar anticoagulação'; }
      else { riskLevel = 'HIGH'; interpretation = 'Risco alto — anticoagulação recomendada'; }
      return { calculatorId: 'CHADS2_VASC', score, maxScore: 9, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'WELLS_DVT',
    name: 'Wells — TVP',
    description: 'Probabilidade clínica de trombose venosa profunda',
    category: 'Vascular',
    fields: [
      { key: 'cancer', label: 'Câncer ativo', type: 'boolean' },
      { key: 'paralysis', label: 'Paralisia/paresia/imobilização recente de MMII', type: 'boolean' },
      { key: 'bedridden', label: 'Acamado {\'>\'}3 dias ou cirurgia recente', type: 'boolean' },
      { key: 'tenderness', label: 'Dor à palpação em trajeto venoso profundo', type: 'boolean' },
      { key: 'swelling', label: 'Edema em toda a perna', type: 'boolean' },
      { key: 'calfSwelling', label: 'Diferença {\'>\'}3cm na panturrilha', type: 'boolean' },
      { key: 'pittingEdema', label: 'Edema depressível (cacifo)', type: 'boolean' },
      { key: 'collateralVeins', label: 'Veias colaterais superficiais', type: 'boolean' },
      { key: 'altDiagnosis', label: 'Diagnóstico alternativo tão provável (-2)', type: 'boolean' },
    ],
    calculate: (v) => {
      const score = boolToNum(v.cancer) + boolToNum(v.paralysis) + boolToNum(v.bedridden)
        + boolToNum(v.tenderness) + boolToNum(v.swelling) + boolToNum(v.calfSwelling)
        + boolToNum(v.pittingEdema) + boolToNum(v.collateralVeins) - boolToNum(v.altDiagnosis) * 2;
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (score <= 0) { riskLevel = 'LOW'; interpretation = 'Probabilidade baixa — D-dímero'; }
      else if (score <= 2) { riskLevel = 'MODERATE'; interpretation = 'Probabilidade moderada — D-dímero ou USG'; }
      else { riskLevel = 'HIGH'; interpretation = 'Probabilidade alta — USG Doppler venoso'; }
      return { calculatorId: 'WELLS_DVT', score, maxScore: 8, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'WELLS_PE',
    name: 'Wells — TEP',
    description: 'Probabilidade clínica de tromboembolismo pulmonar',
    category: 'Pneumologia',
    fields: [
      { key: 'dvtSymptoms', label: 'Sinais/sintomas de TVP', type: 'boolean' },
      { key: 'altDiagnosisUnlikely', label: 'TEP como diagnóstico principal', type: 'boolean' },
      { key: 'hrOver100', label: 'FC {\'>\'}100 bpm', type: 'boolean' },
      { key: 'immobilization', label: 'Imobilização ou cirurgia nas últimas 4 semanas', type: 'boolean' },
      { key: 'previousDvtPe', label: 'TVP/TEP prévio', type: 'boolean' },
      { key: 'hemoptysis', label: 'Hemoptise', type: 'boolean' },
      { key: 'malignancy', label: 'Malignidade em tratamento nos últimos 6 meses', type: 'boolean' },
    ],
    calculate: (v) => {
      const score = boolToNum(v.dvtSymptoms) * 3 + boolToNum(v.altDiagnosisUnlikely) * 3
        + boolToNum(v.hrOver100) * 1.5 + boolToNum(v.immobilization) * 1.5
        + boolToNum(v.previousDvtPe) * 1.5 + boolToNum(v.hemoptysis) + boolToNum(v.malignancy);
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (score < 2) { riskLevel = 'LOW'; interpretation = 'Probabilidade baixa — D-dímero'; }
      else if (score <= 6) { riskLevel = 'MODERATE'; interpretation = 'Probabilidade moderada — D-dímero ou angioTC'; }
      else { riskLevel = 'HIGH'; interpretation = 'Probabilidade alta — angioTC de tórax'; }
      return { calculatorId: 'WELLS_PE', score, maxScore: 12.5, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'CURB65',
    name: 'CURB-65',
    description: 'Gravidade da pneumonia adquirida na comunidade',
    category: 'Pneumologia',
    fields: [
      { key: 'confusion', label: 'Confusão mental', type: 'boolean' },
      { key: 'bun', label: 'Ureia {\'>\'}50 mg/dL', type: 'boolean' },
      { key: 'respRate', label: 'FR ≥ 30 irpm', type: 'boolean' },
      { key: 'lowBp', label: 'PAS {\'<\'}90 ou PAD ≤60 mmHg', type: 'boolean' },
      { key: 'age65', label: 'Idade ≥ 65 anos', type: 'boolean' },
    ],
    calculate: (v) => {
      const score = boolToNum(v.confusion) + boolToNum(v.bun) + boolToNum(v.respRate)
        + boolToNum(v.lowBp) + boolToNum(v.age65);
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (score <= 1) { riskLevel = 'LOW'; interpretation = 'Baixa mortalidade — tratamento ambulatorial'; }
      else if (score === 2) { riskLevel = 'MODERATE'; interpretation = 'Mortalidade intermediária — considerar internação'; }
      else { riskLevel = 'HIGH'; interpretation = 'Alta mortalidade — internação, considerar UTI'; }
      return { calculatorId: 'CURB65', score, maxScore: 5, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'MELD',
    name: 'MELD',
    description: 'Model for End-Stage Liver Disease — Gravidade da doença hepática',
    category: 'Hepatologia',
    fields: [
      { key: 'creatinine', label: 'Creatinina (mg/dL)', type: 'number', min: 0.1, max: 40 },
      { key: 'bilirubin', label: 'Bilirrubina total (mg/dL)', type: 'number', min: 0.1, max: 100 },
      { key: 'inr', label: 'INR', type: 'number', min: 0.1, max: 20 },
      { key: 'dialysis', label: 'Diálise ao menos 2x na semana', type: 'boolean' },
    ],
    calculate: (v) => {
      let cr = Math.max(numVal(v.creatinine, 1), 1);
      if (v.dialysis) cr = 4;
      cr = Math.min(cr, 4);
      const bil = Math.max(numVal(v.bilirubin, 1), 1);
      const inr = Math.max(numVal(v.inr, 1), 1);
      const score = Math.round(
        10 * (0.957 * Math.log(cr) + 0.378 * Math.log(bil) + 1.12 * Math.log(inr) + 0.643),
      );
      const clamped = Math.max(6, Math.min(score, 40));
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (clamped < 10) { riskLevel = 'LOW'; interpretation = 'Mortalidade em 3 meses ~1.9%'; }
      else if (clamped < 20) { riskLevel = 'MODERATE'; interpretation = 'Mortalidade em 3 meses ~6%'; }
      else if (clamped < 30) { riskLevel = 'HIGH'; interpretation = 'Mortalidade em 3 meses ~19.6%'; }
      else { riskLevel = 'VERY_HIGH'; interpretation = 'Mortalidade em 3 meses ~52.6% — prioridade transplante'; }
      return { calculatorId: 'MELD', score: clamped, maxScore: 40, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'CHILD_PUGH',
    name: 'Child-Pugh',
    description: 'Classificação da gravidade da cirrose hepática',
    category: 'Hepatologia',
    fields: [
      { key: 'bilirubin', label: 'Bilirrubina total', type: 'select', options: [
        { value: 1, label: '{\'<\'}2 mg/dL (1 pt)' }, { value: 2, label: '2-3 mg/dL (2 pts)' },
        { value: 3, label: '{\'>\'}3 mg/dL (3 pts)' },
      ]},
      { key: 'albumin', label: 'Albumina', type: 'select', options: [
        { value: 1, label: '{\'>\'}3.5 g/dL (1 pt)' }, { value: 2, label: '2.8-3.5 g/dL (2 pts)' },
        { value: 3, label: '{\'<\'}2.8 g/dL (3 pts)' },
      ]},
      { key: 'inr', label: 'INR', type: 'select', options: [
        { value: 1, label: '{\'<\'}1.7 (1 pt)' }, { value: 2, label: '1.7-2.3 (2 pts)' },
        { value: 3, label: '{\'>\'}2.3 (3 pts)' },
      ]},
      { key: 'ascites', label: 'Ascite', type: 'select', options: [
        { value: 1, label: 'Ausente (1 pt)' }, { value: 2, label: 'Leve (2 pts)' },
        { value: 3, label: 'Moderada a tensa (3 pts)' },
      ]},
      { key: 'encephalopathy', label: 'Encefalopatia', type: 'select', options: [
        { value: 1, label: 'Nenhuma (1 pt)' }, { value: 2, label: 'Grau I-II (2 pts)' },
        { value: 3, label: 'Grau III-IV (3 pts)' },
      ]},
    ],
    calculate: (v) => {
      const score = numVal(v.bilirubin, 1) + numVal(v.albumin, 1) + numVal(v.inr, 1)
        + numVal(v.ascites, 1) + numVal(v.encephalopathy, 1);
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (score <= 6) { riskLevel = 'LOW'; interpretation = 'Child A — Sobrevida 1 ano ~100%'; }
      else if (score <= 9) { riskLevel = 'MODERATE'; interpretation = 'Child B — Sobrevida 1 ano ~80%'; }
      else { riskLevel = 'HIGH'; interpretation = 'Child C — Sobrevida 1 ano ~45%'; }
      return { calculatorId: 'CHILD_PUGH', score, maxScore: 15, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'NIHSS',
    name: 'NIHSS',
    description: 'National Institutes of Health Stroke Scale — Gravidade do AVC',
    category: 'Neurologia',
    fields: [
      { key: 'consciousness', label: '1a. Nível de consciência', type: 'select', options: [
        { value: 0, label: '0 — Alerta' }, { value: 1, label: '1 — Não alerta, desperta com estímulo menor' },
        { value: 2, label: '2 — Não alerta, requer estímulo repetido' }, { value: 3, label: '3 — Não responsivo' },
      ]},
      { key: 'questions', label: '1b. Perguntas (mês/idade)', type: 'select', options: [
        { value: 0, label: '0 — Ambas corretas' }, { value: 1, label: '1 — Uma correta' }, { value: 2, label: '2 — Nenhuma correta' },
      ]},
      { key: 'commands', label: '1c. Comandos (fechar olhos/abrir mão)', type: 'select', options: [
        { value: 0, label: '0 — Ambos corretos' }, { value: 1, label: '1 — Um correto' }, { value: 2, label: '2 — Nenhum correto' },
      ]},
      { key: 'gaze', label: '2. Olhar conjugado', type: 'select', options: [
        { value: 0, label: '0 — Normal' }, { value: 1, label: '1 — Parcial' }, { value: 2, label: '2 — Desvio forçado' },
      ]},
      { key: 'visual', label: '3. Campo visual', type: 'select', options: [
        { value: 0, label: '0 — Sem perda' }, { value: 1, label: '1 — Hemianopsia parcial' },
        { value: 2, label: '2 — Hemianopsia completa' }, { value: 3, label: '3 — Bilateral/cegueira' },
      ]},
      { key: 'facialPalsy', label: '4. Paralisia facial', type: 'select', options: [
        { value: 0, label: '0 — Normal' }, { value: 1, label: '1 — Menor' },
        { value: 2, label: '2 — Parcial' }, { value: 3, label: '3 — Completa' },
      ]},
      { key: 'motorArmLeft', label: '5a. Motor braço esquerdo', type: 'select', options: [
        { value: 0, label: '0 — Sem queda' }, { value: 1, label: '1 — Queda' },
        { value: 2, label: '2 — Esforço contra gravidade' }, { value: 3, label: '3 — Sem esforço contra gravidade' },
        { value: 4, label: '4 — Sem movimento' },
      ]},
      { key: 'motorArmRight', label: '5b. Motor braço direito', type: 'select', options: [
        { value: 0, label: '0 — Sem queda' }, { value: 1, label: '1 — Queda' },
        { value: 2, label: '2 — Esforço contra gravidade' }, { value: 3, label: '3 — Sem esforço contra gravidade' },
        { value: 4, label: '4 — Sem movimento' },
      ]},
      { key: 'motorLegLeft', label: '6a. Motor perna esquerda', type: 'select', options: [
        { value: 0, label: '0 — Sem queda' }, { value: 1, label: '1 — Queda' },
        { value: 2, label: '2 — Esforço contra gravidade' }, { value: 3, label: '3 — Sem esforço contra gravidade' },
        { value: 4, label: '4 — Sem movimento' },
      ]},
      { key: 'motorLegRight', label: '6b. Motor perna direita', type: 'select', options: [
        { value: 0, label: '0 — Sem queda' }, { value: 1, label: '1 — Queda' },
        { value: 2, label: '2 — Esforço contra gravidade' }, { value: 3, label: '3 — Sem esforço contra gravidade' },
        { value: 4, label: '4 — Sem movimento' },
      ]},
      { key: 'ataxia', label: '7. Ataxia', type: 'select', options: [
        { value: 0, label: '0 — Ausente' }, { value: 1, label: '1 — Um membro' }, { value: 2, label: '2 — Dois membros' },
      ]},
      { key: 'sensory', label: '8. Sensibilidade', type: 'select', options: [
        { value: 0, label: '0 — Normal' }, { value: 1, label: '1 — Leve/moderada perda' }, { value: 2, label: '2 — Perda severa/total' },
      ]},
      { key: 'language', label: '9. Linguagem', type: 'select', options: [
        { value: 0, label: '0 — Sem afasia' }, { value: 1, label: '1 — Leve a moderada' },
        { value: 2, label: '2 — Grave' }, { value: 3, label: '3 — Mudo/global' },
      ]},
      { key: 'dysarthria', label: '10. Disartria', type: 'select', options: [
        { value: 0, label: '0 — Normal' }, { value: 1, label: '1 — Leve a moderada' }, { value: 2, label: '2 — Severa/anartria' },
      ]},
      { key: 'extinction', label: '11. Extinção/Inatenção', type: 'select', options: [
        { value: 0, label: '0 — Sem anormalidade' }, { value: 1, label: '1 — Uma modalidade' }, { value: 2, label: '2 — Profunda' },
      ]},
    ],
    calculate: (v) => {
      const keys = ['consciousness','questions','commands','gaze','visual','facialPalsy',
        'motorArmLeft','motorArmRight','motorLegLeft','motorLegRight','ataxia','sensory',
        'language','dysarthria','extinction'];
      const score = keys.reduce((sum, k) => sum + numVal(v[k], 0), 0);
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (score === 0) { interpretation = 'Sem déficit'; riskLevel = 'LOW'; }
      else if (score <= 4) { interpretation = 'AVC menor'; riskLevel = 'LOW'; }
      else if (score <= 15) { interpretation = 'AVC moderado'; riskLevel = 'MODERATE'; }
      else if (score <= 20) { interpretation = 'AVC moderado a grave'; riskLevel = 'HIGH'; }
      else { interpretation = 'AVC grave'; riskLevel = 'VERY_HIGH'; }
      return { calculatorId: 'NIHSS', score, maxScore: 42, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'FRAMINGHAM',
    name: 'Framingham (simplificado)',
    description: 'Risco cardiovascular em 10 anos',
    category: 'Cardiologia',
    fields: [
      { key: 'age', label: 'Idade (anos)', type: 'number', min: 30, max: 79 },
      { key: 'male', label: 'Sexo masculino', type: 'boolean' },
      { key: 'smoker', label: 'Tabagista', type: 'boolean' },
      { key: 'diabetes', label: 'Diabetes', type: 'boolean' },
      { key: 'systolicBp', label: 'PAS (mmHg)', type: 'number', min: 90, max: 250 },
      { key: 'totalChol', label: 'Colesterol total (mg/dL)', type: 'number', min: 100, max: 400 },
      { key: 'hdl', label: 'HDL (mg/dL)', type: 'number', min: 20, max: 100 },
      { key: 'bpTreated', label: 'PA tratada', type: 'boolean' },
    ],
    calculate: (v) => {
      const age = numVal(v.age, 50);
      const sbp = numVal(v.systolicBp, 120);
      const tc = numVal(v.totalChol, 200);
      const hdl = numVal(v.hdl, 50);
      let points = 0;
      if (age >= 35) points += 1; if (age >= 40) points += 1; if (age >= 45) points += 1;
      if (age >= 50) points += 1; if (age >= 55) points += 1; if (age >= 60) points += 1;
      if (age >= 65) points += 1; if (age >= 70) points += 1; if (age >= 75) points += 1;
      if (v.male) points += 2;
      if (v.smoker) points += 2;
      if (v.diabetes) points += 2;
      if (sbp >= 140) points += 2; else if (sbp >= 130) points += 1;
      if (v.bpTreated) points += 1;
      if (tc >= 240) points += 2; else if (tc >= 200) points += 1;
      if (hdl < 40) points += 2; else if (hdl < 50) points += 1;
      const riskPct = Math.min(Math.max(points * 1.5, 1), 30);
      const score = Math.round(riskPct);
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (score < 10) { riskLevel = 'LOW'; interpretation = `Risco em 10 anos: ~${score}% — baixo`; }
      else if (score < 20) { riskLevel = 'MODERATE'; interpretation = `Risco em 10 anos: ~${score}% — intermediário`; }
      else { riskLevel = 'HIGH'; interpretation = `Risco em 10 anos: ~${score}% — alto`; }
      return { calculatorId: 'FRAMINGHAM', score, maxScore: 30, interpretation, riskLevel, recommendation: interpretation };
    },
  },
  {
    id: 'APACHE_II',
    name: 'APACHE II (simplificado)',
    description: 'Gravidade do paciente em UTI',
    category: 'Terapia Intensiva',
    fields: [
      { key: 'temperature', label: 'Temperatura retal (°C)', type: 'number', min: 30, max: 42 },
      { key: 'mapMmhg', label: 'PAM (mmHg)', type: 'number', min: 40, max: 200 },
      { key: 'heartRate', label: 'FC (bpm)', type: 'number', min: 20, max: 200 },
      { key: 'respRate', label: 'FR (irpm)', type: 'number', min: 5, max: 60 },
      { key: 'ph', label: 'pH arterial', type: 'number', min: 6.8, max: 7.8 },
      { key: 'sodium', label: 'Sódio (mEq/L)', type: 'number', min: 110, max: 180 },
      { key: 'potassium', label: 'Potássio (mEq/L)', type: 'number', min: 2, max: 8 },
      { key: 'creatinine', label: 'Creatinina (mg/dL)', type: 'number', min: 0.1, max: 20 },
      { key: 'hematocrit', label: 'Hematócrito (%)', type: 'number', min: 10, max: 70 },
      { key: 'wbc', label: 'Leucócitos (x1000)', type: 'number', min: 0.5, max: 60 },
      { key: 'glasgowScore', label: 'Glasgow (3-15)', type: 'number', min: 3, max: 15 },
      { key: 'age', label: 'Idade (anos)', type: 'number', min: 18, max: 120 },
      { key: 'chronicHealth', label: 'Doença crônica grave', type: 'boolean' },
    ],
    calculate: (v) => {
      let score = 0;
      const temp = numVal(v.temperature, 37);
      if (temp >= 41 || temp < 30) score += 4; else if (temp >= 39 || temp < 32) score += 3;
      else if (temp >= 38.5 || temp < 34) score += 1;
      const gcs = numVal(v.glasgowScore, 15);
      score += (15 - gcs);
      const age = numVal(v.age, 50);
      if (age >= 75) score += 6; else if (age >= 65) score += 5;
      else if (age >= 55) score += 3; else if (age >= 45) score += 2;
      if (v.chronicHealth) score += 5;
      const hr = numVal(v.heartRate, 80);
      if (hr >= 180 || hr < 40) score += 4; else if (hr >= 140 || hr < 55) score += 3;
      else if (hr >= 110 || hr < 70) score += 2;
      score = Math.min(score, 71);
      let riskLevel: CalculatorResult['riskLevel'] = 'LOW';
      let interpretation = '';
      if (score <= 9) { riskLevel = 'LOW'; interpretation = 'Mortalidade estimada ~8%'; }
      else if (score <= 19) { riskLevel = 'MODERATE'; interpretation = 'Mortalidade estimada ~15%'; }
      else if (score <= 29) { riskLevel = 'HIGH'; interpretation = 'Mortalidade estimada ~35%'; }
      else { riskLevel = 'VERY_HIGH'; interpretation = 'Mortalidade estimada ~55%+'; }
      return { calculatorId: 'APACHE_II', score, maxScore: 71, interpretation, riskLevel, recommendation: interpretation };
    },
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function riskColor(score: number): string {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-orange-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-green-400';
}

function riskBg(score: number): string {
  if (score >= 80) return 'bg-red-500/20 border-red-500/50';
  if (score >= 60) return 'bg-orange-500/20 border-orange-500/50';
  if (score >= 40) return 'bg-yellow-500/20 border-yellow-500/50';
  return 'bg-green-500/20 border-green-500/50';
}

function levelColor(level: CalculatorResult['riskLevel']): string {
  switch (level) {
    case 'VERY_HIGH': return 'bg-red-500/20 text-red-400 border-red-500/50';
    case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'MODERATE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500/50';
  }
}

function levelLabel(level: CalculatorResult['riskLevel']): string {
  switch (level) {
    case 'VERY_HIGH': return 'Muito Alto';
    case 'HIGH': return 'Alto';
    case 'MODERATE': return 'Moderado';
    case 'LOW': return 'Baixo';
  }
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_DDX_RESULT: DifferentialDiagnosisResult = {
  id: 'ddx-001',
  patientId: null,
  symptoms: ['dor torácica', 'dispneia', 'sudorese'],
  age: 58,
  sex: 'M',
  comorbidities: ['hipertensão', 'diabetes'],
  diagnoses: [
    {
      rank: 1, diagnosis: 'Síndrome Coronariana Aguda (SCA)', icdCode: 'I21.9', probability: 82,
      evidence: ['Dor torácica + sudorese + HAS + DM em homem 58a é altamente sugestivo'],
      citationUrls: ['ESC Guidelines 2023'],
      recommendedWorkup: ['ECG 12 derivações', 'Troponina ultrassensível seriada', 'Ecocardiograma'],
      redFlags: ['Dor irradiada para braço esquerdo', 'Instabilidade hemodinâmica'],
    },
    {
      rank: 2, diagnosis: 'Tromboembolismo Pulmonar (TEP)', icdCode: 'I26.9', probability: 45,
      evidence: ['Dispneia aguda + dor torácica pleurítica podem sugerir TEP'],
      citationUrls: ['ESC PE Guidelines 2019'],
      recommendedWorkup: ['D-dímero', 'AngioTC de tórax', 'Wells Score PE'],
      redFlags: ['Taquicardia', 'Hipotensão', 'Dessaturação'],
    },
    {
      rank: 3, diagnosis: 'Dissecção Aórtica', icdCode: 'I71.0', probability: 22,
      evidence: ['Dor torácica aguda de início súbito em paciente hipertenso'],
      citationUrls: ['AHA/ACC Guidelines 2022'],
      recommendedWorkup: ['AngioTC de aorta', 'Ecocardiograma transesofágico', 'D-dímero'],
      redFlags: ['Dor dilacerante', 'Assimetria de pulsos', 'Sopro aórtico'],
    },
    {
      rank: 4, diagnosis: 'Pneumotórax', icdCode: 'J93.9', probability: 12,
      evidence: ['Dispneia súbita + dor torácica unilateral'],
      citationUrls: ['BTS Pleural Disease Guideline 2023'],
      recommendedWorkup: ['Radiografia de tórax AP', 'USG point-of-care'],
      redFlags: ['Desvio de traqueia', 'Jugulares distendidas'],
    },
    {
      rank: 5, diagnosis: 'Pericardite Aguda', icdCode: 'I30.9', probability: 8,
      evidence: ['Dor torácica pleurítica que melhora sentado'],
      citationUrls: ['ESC Pericardial Diseases 2015'],
      recommendedWorkup: ['ECG (supradesnível difuso)', 'Ecocardiograma', 'PCR/VHS'],
      redFlags: ['Derrame pericárdico volumoso', 'Tamponamento'],
    },
  ],
  generatedAt: new Date().toISOString(),
  modelVersion: 'GPT-4o-2025-03',
};

const MOCK_PREDICTIVE_ALERTS: PredictiveAlert[] = [
  {
    id: 'pa-1', patientId: 'p-101', patientName: 'Maria Silva', mrn: '00123456', bed: '301-A', ward: 'Clínica Médica',
    riskType: 'SEPSIS', riskScore: 78, trend: 'RISING', lastUpdated: new Date().toISOString(),
    factors: ['Leucocitose 18.000', 'Febre 38.9°C', 'Lactato 3.2', 'Taquicardia 115bpm'],
    suggestedActions: ['Hemoculturas x2', 'Iniciar antibiótico empírico', 'Ressuscitação volêmica'],
  },
  {
    id: 'pa-2', patientId: 'p-102', patientName: 'João Santos', mrn: '00234567', bed: '205-B', ward: 'Ortopedia',
    riskType: 'FALL', riskScore: 65, trend: 'STABLE', lastUpdated: new Date().toISOString(),
    factors: ['Idade 82a', 'Uso de benzodiazepínico', 'Deambulação instável', 'Polifarmácia'],
    suggestedActions: ['Grades no leito', 'Tapete antiderrapante', 'Reavaliar medicações'],
  },
  {
    id: 'pa-3', patientId: 'p-103', patientName: 'Ana Costa', mrn: '00345678', bed: '412-A', ward: 'Cardiologia',
    riskType: 'READMISSION', riskScore: 52, trend: 'FALLING', lastUpdated: new Date().toISOString(),
    factors: ['ICFER', '3 internações nos últimos 6 meses', 'Adesão medicamentosa baixa'],
    suggestedActions: ['Programa de transição de cuidados', 'Telemonitoramento pós-alta', 'Educação do paciente'],
  },
  {
    id: 'pa-4', patientId: 'p-104', patientName: 'Carlos Oliveira', mrn: '00456789', bed: 'UTI-08', ward: 'UTI',
    riskType: 'MORTALITY', riskScore: 41, trend: 'STABLE', lastUpdated: new Date().toISOString(),
    factors: ['APACHE II: 24', 'Ventilação mecânica D5', 'Lesão renal aguda KDIGO 2'],
    suggestedActions: ['Reavaliação diária de sedação', 'Protocolo de desmame ventilatório', 'Discussão com família'],
  },
  {
    id: 'pa-5', patientId: 'p-105', patientName: 'Lucia Ferreira', mrn: '00567890', bed: '108-C', ward: 'Clínica Médica',
    riskType: 'DETERIORATION', riskScore: 88, trend: 'RISING', lastUpdated: new Date().toISOString(),
    factors: ['NEWS score 8', 'SpO2 91%', 'PAS 88mmHg', 'Confusão mental'],
    suggestedActions: ['Acionamento time de resposta rápida', 'Vaga UTI', 'Gasometria arterial'],
  },
];

function generateRiskTimeline(): { timestamp: string; score: number }[] {
  const pts: { timestamp: string; score: number }[] = [];
  const now = Date.now();
  for (let i = 23; i >= 0; i--) {
    const ts = new Date(now - i * 3600000).toISOString();
    pts.push({ timestamp: ts, score: Math.round(30 + Math.random() * 50 + (23 - i) * 0.8) });
  }
  return pts;
}

const MOCK_PROTOCOLS: ProtocolRecommendation[] = [
  {
    id: 'proto-1', protocolName: 'Protocolo de Dor Torácica — SCA', diagnosis: 'Síndrome Coronariana Aguda',
    confidence: 92, evidenceLevel: 'A', source: 'Diretriz SBC 2024',
    lastUpdated: new Date().toISOString(),
    expectedOutcomes: ['Redução de mortalidade em 30 dias', 'Tempo porta-balão {\'<\'}90min', 'Diagnóstico precoce'],
    pathway: [
      { order: 1, title: 'ECG em 10 minutos', description: 'Realizar ECG de 12 derivações nos primeiros 10 minutos', isCompleted: true, timeframeMinutes: 10, orderSetItems: ['ECG 12 derivações'] },
      { order: 2, title: 'Troponina ultrassensível', description: 'Coleta de troponina T ou I ultrassensível', isCompleted: true, timeframeMinutes: 15, orderSetItems: ['Troponina US', 'CK-MB'] },
      { order: 3, title: 'Dupla antiagregação', description: 'AAS 300mg + Clopidogrel/Ticagrelor', isCompleted: false, timeframeMinutes: 20, orderSetItems: ['AAS 300mg VO', 'Ticagrelor 180mg VO'] },
      { order: 4, title: 'Anticoagulação', description: 'Enoxaparina ou HNF conforme peso', isCompleted: false, timeframeMinutes: 30, orderSetItems: ['Enoxaparina 1mg/kg SC 12/12h'] },
      { order: 5, title: 'Estratificação', description: 'Definir estratégia invasiva vs conservadora', isCompleted: false, timeframeMinutes: 60, orderSetItems: ['Cateterismo cardíaco', 'Ecocardiograma'] },
    ],
  },
  {
    id: 'proto-2', protocolName: 'Protocolo Sepse — Hour-1 Bundle', diagnosis: 'Sepse',
    confidence: 78, evidenceLevel: 'A', source: 'Surviving Sepsis Campaign 2021',
    lastUpdated: new Date().toISOString(),
    expectedOutcomes: ['Redução de mortalidade', 'Compliance com bundle 1h', 'Estabilização hemodinâmica'],
    pathway: [
      { order: 1, title: 'Lactato sérico', description: 'Medir lactato imediatamente', isCompleted: true, timeframeMinutes: 15, orderSetItems: ['Lactato arterial'] },
      { order: 2, title: 'Hemoculturas', description: '2 sets de hemoculturas antes do ATB', isCompleted: false, timeframeMinutes: 30, orderSetItems: ['Hemocultura aeróbia x2', 'Hemocultura anaeróbia x2'] },
      { order: 3, title: 'Antibiótico empírico', description: 'ATB de amplo espectro em até 1h', isCompleted: false, timeframeMinutes: 60, orderSetItems: ['Piperacilina-tazobactam 4.5g EV', 'Vancomicina 25mg/kg EV'] },
      { order: 4, title: 'Ressuscitação volêmica', description: '30mL/kg cristaloide se hipotensão/lactato elevado', isCompleted: false, timeframeMinutes: 60, orderSetItems: ['Ringer Lactato 30mL/kg EV'] },
      { order: 5, title: 'Vasopressor', description: 'Noradrenalina se PAM {\'<\'}65 após volume', isCompleted: false, timeframeMinutes: 90, orderSetItems: ['Noradrenalina 0.1mcg/kg/min EV BIC'] },
    ],
  },
];

const MOCK_DRUG_INTERACTIONS: DrugInteractionCheckResult = {
  id: 'di-001',
  medications: ['Varfarina', 'AAS', 'Omeprazol', 'Sinvastatina', 'Amiodarona', 'Metformina'],
  interactions: [
    {
      drug1: 'Varfarina', drug2: 'Amiodarona', severity: 'CRITICAL',
      description: 'Amiodarona inibe CYP2C9, aumentando significativamente o efeito anticoagulante da varfarina',
      mechanism: 'Inibição enzimática CYP2C9 e CYP3A4', clinicalEffect: 'Risco aumentado de sangramento grave (INR pode dobrar)',
      management: 'Reduzir dose de varfarina em 30-50%. Monitorar INR a cada 2-3 dias por 4 semanas.',
      alternatives: ['Considerar DOACs se possível', 'Reduzir dose de Amiodarona'],
      references: ['UpToDate: Amiodarone-Warfarin interaction'],
    },
    {
      drug1: 'Varfarina', drug2: 'AAS', severity: 'MAJOR',
      description: 'Dupla antitrombóticos aumentam significativamente o risco de sangramento',
      mechanism: 'Efeito aditivo na hemostasia', clinicalEffect: 'Risco aumentado de sangramento GI e intracraniano',
      management: 'Avaliar se ambos são necessários. Se indicação clara, adicionar IBP para proteção gástrica.',
      alternatives: ['Monoterapia antitrombótica se possível'],
      references: ['ACC/AHA Antithrombotic Guidelines'],
    },
    {
      drug1: 'Sinvastatina', drug2: 'Amiodarona', severity: 'MAJOR',
      description: 'Amiodarona aumenta níveis de sinvastatina por inibição de CYP3A4',
      mechanism: 'Inibição CYP3A4', clinicalEffect: 'Risco aumentado de miopatia/rabdomiólise',
      management: 'Limitar sinvastatina a 20mg/dia quando co-administrada com amiodarona.',
      alternatives: ['Trocar para rosuvastatina (não metabolizada por CYP3A4)', 'Pravastatina'],
      references: ['FDA Drug Safety Communication'],
    },
    {
      drug1: 'Omeprazol', drug2: 'Metformina', severity: 'MODERATE',
      description: 'IBPs podem aumentar absorção de metformina em 25-50%',
      mechanism: 'Alteração do pH gástrico', clinicalEffect: 'Possível aumento do efeito hipoglicemiante',
      management: 'Monitorar glicemia. Geralmente não requer ajuste de dose.',
      alternatives: ['Pantoprazol (menor interação)'],
      references: ['Br J Clin Pharmacol 2019'],
    },
    {
      drug1: 'Varfarina', drug2: 'Omeprazol', severity: 'MINOR',
      description: 'Omeprazol pode aumentar levemente o efeito da varfarina via CYP2C19',
      mechanism: 'Inibição CYP2C19', clinicalEffect: 'Pequeno aumento do INR geralmente sem relevância clínica',
      management: 'Monitorar INR. Usualmente não requer ajuste.',
      alternatives: ['Pantoprazol (menor interação com CYP2C19)'],
      references: ['Clin Pharmacol Ther 2008'],
    },
  ],
  checkedAt: new Date().toISOString(),
  totalCritical: 1,
  totalMajor: 2,
  totalModerate: 1,
  totalMinor: 1,
};

// ─── Tab 1: Diagnóstico Diferencial ────────────────────────────────────────

function DifferentialDiagnosisTab() {
  const ddxMutation = useDifferentialDiagnosis();
  const [symptomInput, setSymptomInput] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [comorbidities, setComorbidities] = useState('');
  const [result, setResult] = useState<DifferentialDiagnosisResult | null>(null);
  const [showDetail, setShowDetail] = useState<DifferentialDiagnosisItem | null>(null);

  const addSymptom = useCallback(() => {
    const trimmed = symptomInput.trim();
    if (trimmed && !symptoms.includes(trimmed)) {
      setSymptoms((prev) => [...prev, trimmed]);
      setSymptomInput('');
    }
  }, [symptomInput, symptoms]);

  const removeSymptom = useCallback((s: string) => {
    setSymptoms((prev) => prev.filter((x) => x !== s));
  }, []);

  const handleAnalyze = useCallback(() => {
    if (symptoms.length === 0) {
      toast.error('Adicione ao menos um sintoma.');
      return;
    }
    ddxMutation.mutate(
      {
        symptoms,
        age: age ? Number(age) : undefined,
        sex: sex || undefined,
        comorbidities: comorbidities ? comorbidities.split(',').map((c) => c.trim()) : undefined,
      },
      {
        onSuccess: (data) => setResult(data),
        onError: () => {
          // Use mock data as fallback for demo
          setResult(MOCK_DDX_RESULT);
          toast.info('Dados simulados carregados (API indisponível).');
        },
      },
    );
  }, [symptoms, age, sex, comorbidities, ddxMutation]);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Brain className="h-5 w-5 text-emerald-400" />
            Análise de Diagnóstico Diferencial por IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-zinc-300">Idade</Label>
              <Input
                placeholder="Ex: 58"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                type="number"
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Sexo</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Comorbidades (separadas por vírgula)</Label>
              <Input
                placeholder="Ex: hipertensão, diabetes"
                value={comorbidities}
                onChange={(e) => setComorbidities(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Sintomas</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite um sintoma e pressione Enter ou clique +"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSymptom(); } }}
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
              <Button onClick={addSymptom} size="icon" variant="outline" className="border-zinc-700">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {symptoms.map((s) => (
                  <Badge key={s} variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400 gap-1">
                    {s}
                    <button onClick={() => removeSymptom(s)} className="ml-1 hover:text-red-400">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={ddxMutation.isPending || symptoms.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {ddxMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Gerar Diagnóstico Diferencial</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">
              Diagnósticos Diferenciais Ranqueados
            </h3>
            <Badge variant="outline" className="border-zinc-600 text-zinc-400">
              Modelo: {result.modelVersion}
            </Badge>
          </div>

          <div className="space-y-3">
            {result.diagnoses.map((dx) => (
              <Card
                key={dx.rank}
                className={cn(
                  'border-zinc-800 bg-zinc-900 cursor-pointer transition-all hover:border-emerald-500/50',
                  showDetail?.rank === dx.rank && 'border-emerald-500/50',
                )}
                onClick={() => setShowDetail(showDetail?.rank === dx.rank ? null : dx)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold',
                      dx.probability >= 70 ? 'bg-red-500/20 text-red-400'
                        : dx.probability >= 40 ? 'bg-orange-500/20 text-orange-400'
                        : dx.probability >= 20 ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-zinc-700 text-zinc-400',
                    )}>
                      #{dx.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100 truncate">{dx.diagnosis}</span>
                        <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs shrink-0">
                          {dx.icdCode}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        <Progress value={dx.probability} className="h-2 bg-zinc-800" />
                      </div>
                    </div>
                    <div className={cn('text-2xl font-bold shrink-0', riskColor(dx.probability))}>
                      {dx.probability}%
                    </div>
                    <ChevronRight className={cn(
                      'h-5 w-5 text-zinc-500 transition-transform shrink-0',
                      showDetail?.rank === dx.rank && 'rotate-90',
                    )} />
                  </div>

                  {showDetail?.rank === dx.rank && (
                    <div className="mt-4 grid gap-4 border-t border-zinc-800 pt-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                          <BookOpen className="h-4 w-4" /> Evidências
                        </h4>
                        {dx.evidence.map((e, i) => (
                          <p key={i} className="text-sm text-zinc-400">{e}</p>
                        ))}
                        {dx.citationUrls.map((c, i) => (
                          <Badge key={i} variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                            📖 {c}
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-blue-400 flex items-center gap-1">
                          <Beaker className="h-4 w-4" /> Investigação Recomendada
                        </h4>
                        <ul className="space-y-1">
                          {dx.recommendedWorkup.map((w, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                              <ArrowRight className="h-3 w-3 text-blue-400 shrink-0" /> {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-red-400 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Red Flags
                        </h4>
                        <ul className="space-y-1">
                          {dx.redFlags.map((r, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-red-300">
                              <ShieldAlert className="h-3 w-3 shrink-0" /> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Calculadoras Clínicas ──────────────────────────────────────────

function ClinicalCalculatorsTab() {
  const [selectedCalcId, setSelectedCalcId] = useState<ClinicalCalculatorId>('GLASGOW');
  const [values, setValues] = useState<Record<string, number | boolean>>({});
  const [calcResult, setCalcResult] = useState<CalculatorResult | null>(null);

  const selectedCalc = useMemo(
    () => CALCULATORS.find((c) => c.id === selectedCalcId),
    [selectedCalcId],
  );

  const handleSelectCalc = useCallback((id: ClinicalCalculatorId) => {
    setSelectedCalcId(id);
    setValues({});
    setCalcResult(null);
  }, []);

  const handleFieldChange = useCallback((key: string, val: number | boolean) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleCalculate = useCallback(() => {
    if (!selectedCalc) return;
    const res = selectedCalc.calculate(values);
    setCalcResult(res);
  }, [selectedCalc, values]);

  const categories = useMemo(() => {
    const map = new Map<string, LocalCalculatorDef[]>();
    for (const c of CALCULATORS) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return map;
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calculator List */}
      <div className="space-y-4 lg:col-span-1">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Calculator className="h-5 w-5 text-emerald-400" />
              Scores Clínicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from(categories.entries()).map(([cat, calcs]) => (
              <div key={cat}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{cat}</p>
                <div className="space-y-1">
                  {calcs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCalc(c.id)}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        selectedCalcId === c.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'text-zinc-300 hover:bg-zinc-800 border border-transparent',
                      )}
                    >
                      <span className="font-medium">{c.name}</span>
                      <p className="text-xs text-zinc-500 mt-0.5">{c.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Calculator Form */}
      <div className="space-y-4 lg:col-span-2">
        {selectedCalc && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-100">{selectedCalc.name}</CardTitle>
              <p className="text-sm text-zinc-400">{selectedCalc.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {selectedCalc.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-zinc-300 text-sm">{field.label}</Label>
                    {field.type === 'boolean' ? (
                      <button
                        onClick={() => handleFieldChange(field.key, !values[field.key])}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                          values[field.key]
                            ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                        )}
                      >
                        {values[field.key] ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                        {values[field.key] ? 'Sim' : 'Não'}
                      </button>
                    ) : field.type === 'select' && field.options ? (
                      <Select
                        value={String(values[field.key] ?? '')}
                        onValueChange={(v) => handleFieldChange(field.key, Number(v))}
                      >
                        <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-100">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((o) => (
                            <SelectItem key={o.value} value={String(o.value)}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={typeof values[field.key] === 'number' ? String(values[field.key]) : ''}
                        onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
                        className="border-zinc-700 bg-zinc-800 text-zinc-100"
                        placeholder={
                          field.min !== undefined && field.max !== undefined
                            ? `${field.min} - ${field.max}`
                            : ''
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCalculate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Calculator className="mr-2 h-4 w-4" /> Calcular Score
              </Button>

              {calcResult && (
                <Card className={cn('border', levelColor(calcResult.riskLevel))}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-zinc-400">Resultado</p>
                        <p className="text-3xl font-bold text-zinc-100">
                          {calcResult.score}
                          <span className="text-lg text-zinc-500"> / {calcResult.maxScore}</span>
                        </p>
                      </div>
                      <Badge className={cn('text-sm', levelColor(calcResult.riskLevel))}>
                        {levelLabel(calcResult.riskLevel)}
                      </Badge>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-sm text-zinc-300">{calcResult.interpretation}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Alertas Preditivos ─────────────────────────────────────────────

function PredictiveAlertsTab() {
  const alertsQuery = usePredictiveAlerts();
  const [selectedAlert, setSelectedAlert] = useState<PredictiveAlert | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  // Use mock data as fallback
  const alerts: PredictiveAlert[] = alertsQuery.data ?? MOCK_PREDICTIVE_ALERTS;

  const filteredAlerts = useMemo(
    () => filterRisk === 'ALL' ? alerts : alerts.filter((a) => a.riskType === filterRisk),
    [alerts, filterRisk],
  );

  const sortedAlerts = useMemo(
    () => [...filteredAlerts].sort((a, b) => b.riskScore - a.riskScore),
    [filteredAlerts],
  );

  const summaryStats = useMemo(() => {
    const stats: Record<RiskType, { count: number; avgScore: number; criticalCount: number }> = {
      SEPSIS: { count: 0, avgScore: 0, criticalCount: 0 },
      FALL: { count: 0, avgScore: 0, criticalCount: 0 },
      READMISSION: { count: 0, avgScore: 0, criticalCount: 0 },
      MORTALITY: { count: 0, avgScore: 0, criticalCount: 0 },
      DETERIORATION: { count: 0, avgScore: 0, criticalCount: 0 },
    };
    for (const a of alerts) {
      stats[a.riskType].count++;
      stats[a.riskType].avgScore += a.riskScore;
      if (a.riskScore >= 70) stats[a.riskType].criticalCount++;
    }
    for (const key of Object.keys(stats) as RiskType[]) {
      if (stats[key].count > 0) stats[key].avgScore = Math.round(stats[key].avgScore / stats[key].count);
    }
    return stats;
  }, [alerts]);

  const timelineData = useMemo(() => generateRiskTimeline(), []);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {(Object.entries(RISK_TYPE_CONFIG) as [RiskType, typeof RISK_TYPE_CONFIG[RiskType]][]).map(([type, cfg]) => {
          const stat = summaryStats[type];
          const Icon = cfg.icon;
          return (
            <Card key={type} className={cn('border-zinc-800 bg-zinc-900 cursor-pointer transition-all hover:border-zinc-700', filterRisk === type && 'border-emerald-500/50')} onClick={() => setFilterRisk(filterRisk === type ? 'ALL' : type)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Icon className={cn('h-5 w-5', cfg.className.split(' ').find((c) => c.startsWith('text-')))} />
                  <Badge className={cn('text-xs', cfg.className)}>{stat.criticalCount} críticos</Badge>
                </div>
                <p className="mt-2 text-2xl font-bold text-zinc-100">{stat.count}</p>
                <p className="text-xs text-zinc-500">{cfg.label} — média {stat.avgScore}%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Timeline Chart */}
      {selectedAlert && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-sm">
              Evolução de Risco — {selectedAlert.patientName} ({RISK_TYPE_CONFIG[selectedAlert.riskType].label})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v: string) => new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  stroke="#71717a"
                  fontSize={11}
                />
                <YAxis domain={[0, 100]} stroke="#71717a" fontSize={11} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  labelFormatter={(v: string) => formatDate(v)}
                />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Crítico', fill: '#ef4444', fontSize: 11 }} />
                <Area type="monotone" dataKey="score" stroke="#10b981" fill="url(#riskGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {sortedAlerts.map((alert) => {
          const cfg = RISK_TYPE_CONFIG[alert.riskType];
          const trendCfg = TREND_CONFIG[alert.trend] ?? { label: '', icon: Minus, className: '' };
          const Icon = cfg.icon;
          const TrendIcon = trendCfg.icon;
          const isExpanded = selectedAlert?.id === alert.id;

          return (
            <Card
              key={alert.id}
              className={cn(
                'border-zinc-800 bg-zinc-900 cursor-pointer transition-all hover:border-zinc-700',
                isExpanded && 'border-emerald-500/50',
                alert.riskScore >= 80 && 'border-l-2 border-l-red-500',
              )}
              onClick={() => setSelectedAlert(isExpanded ? null : alert)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border', riskBg(alert.riskScore))}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-100">{alert.patientName}</span>
                      <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs">{alert.mrn}</Badge>
                      {alert.bed && (
                        <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs">
                          Leito {alert.bed}
                        </Badge>
                      )}
                      <Badge className={cn('text-xs', cfg.className)}>{cfg.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{alert.ward} — atualizado {formatDate(alert.lastUpdated)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={cn('text-2xl font-bold', riskColor(alert.riskScore))}>{alert.riskScore}%</p>
                      <div className={cn('flex items-center gap-1 text-xs', trendCfg.className)}>
                        <TrendIcon className="h-3 w-3" /> {trendCfg.label}
                      </div>
                    </div>
                    <ChevronRight className={cn('h-5 w-5 text-zinc-500 transition-transform', isExpanded && 'rotate-90')} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 grid gap-4 border-t border-zinc-800 pt-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium text-yellow-400 mb-2">Fatores de Risco</h4>
                      <ul className="space-y-1">
                        {alert.factors.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                            <AlertTriangle className="h-3 w-3 text-yellow-400 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-emerald-400 mb-2">Ações Sugeridas pela IA</h4>
                      <ul className="space-y-1">
                        {alert.suggestedActions.map((a, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                            <ArrowRight className="h-3 w-3 text-emerald-400 shrink-0" /> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab 4: Recomendação de Protocolo ──────────────────────────────────────

function ProtocolRecommendationTab() {
  const protocolMutation = useProtocolRecommendation();
  const [diagnosis, setDiagnosis] = useState('');
  const [protocols, setProtocols] = useState<ProtocolRecommendation[]>([]);
  const [expandedProto, setExpandedProto] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    if (!diagnosis.trim()) {
      toast.error('Informe o diagnóstico.');
      return;
    }
    protocolMutation.mutate(
      { diagnosis },
      {
        onSuccess: (data) => setProtocols(data),
        onError: () => {
          setProtocols(MOCK_PROTOCOLS);
          toast.info('Dados simulados carregados (API indisponível).');
        },
      },
    );
  }, [diagnosis, protocolMutation]);

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <FileText className="h-5 w-5 text-emerald-400" />
            Buscar Protocolo Clínico por IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Síndrome Coronariana Aguda, Sepse, AVC isquêmico..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="border-zinc-700 bg-zinc-800 text-zinc-100"
            />
            <Button
              onClick={handleSearch}
              disabled={protocolMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              {protocolMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Search className="mr-2 h-4 w-4" /> Buscar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {protocols.length > 0 && (
        <div className="space-y-4">
          {protocols.map((proto) => {
            const isExpanded = expandedProto === proto.id;
            const completedSteps = proto.pathway.filter((s) => s.isCompleted).length;
            const totalSteps = proto.pathway.length;
            const progress = Math.round((completedSteps / totalSteps) * 100);

            return (
              <Card
                key={proto.id}
                className={cn(
                  'border-zinc-800 bg-zinc-900 cursor-pointer transition-all hover:border-zinc-700',
                  isExpanded && 'border-emerald-500/50',
                )}
                onClick={() => setExpandedProto(isExpanded ? null : proto.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-100">{proto.protocolName}</span>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
                          Confiança {proto.confidence}%
                        </Badge>
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                          {EVIDENCE_LEVEL_LABELS[proto.evidenceLevel]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        Fonte: {proto.source} — {completedSteps}/{totalSteps} etapas concluídas
                      </p>
                      <Progress value={progress} className="mt-2 h-1.5 bg-zinc-800" />
                    </div>
                    <ChevronRight className={cn('h-5 w-5 text-zinc-500 transition-transform shrink-0', isExpanded && 'rotate-90')} />
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-zinc-800 pt-4 space-y-4">
                      {/* Pathway Steps */}
                      <div>
                        <h4 className="text-sm font-medium text-zinc-300 mb-3">Etapas do Protocolo</h4>
                        <div className="space-y-3">
                          {proto.pathway.map((step) => (
                            <div
                              key={step.order}
                              className={cn(
                                'flex gap-3 rounded-lg border p-3',
                                step.isCompleted
                                  ? 'border-green-500/30 bg-green-500/5'
                                  : 'border-zinc-700 bg-zinc-800/50',
                              )}
                            >
                              <div className="shrink-0 pt-0.5">
                                {step.isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                                ) : (
                                  <Circle className="h-5 w-5 text-zinc-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn('text-sm font-medium', step.isCompleted ? 'text-green-400' : 'text-zinc-200')}>
                                    {step.order}. {step.title}
                                  </span>
                                  {step.timeframeMinutes !== null && (
                                    <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs">
                                      <Clock className="mr-1 h-3 w-3" />
                                      {step.timeframeMinutes}min
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-zinc-400">{step.description}</p>
                                {step.orderSetItems.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {step.orderSetItems.map((item, i) => (
                                      <Badge key={i} variant="outline" className="border-zinc-600 bg-zinc-800 text-zinc-300 text-xs">
                                        {item}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Expected Outcomes */}
                      <div>
                        <h4 className="text-sm font-medium text-emerald-400 mb-2">Desfechos Esperados</h4>
                        <ul className="space-y-1">
                          {proto.expectedOutcomes.map((o, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 5: Drug Interaction Checker ───────────────────────────────────────

function DrugInteractionTab() {
  const interactionMutation = useDrugInteractionCheck();
  const [medsInput, setMedsInput] = useState('');
  const [result, setResult] = useState<DrugInteractionCheckResult | null>(null);
  const [expandedInteraction, setExpandedInteraction] = useState<number | null>(null);

  const handleCheck = useCallback(() => {
    const meds = medsInput
      .split(/[,\n;]+/)
      .map((m) => m.trim())
      .filter(Boolean);
    if (meds.length < 2) {
      toast.error('Informe ao menos 2 medicamentos.');
      return;
    }
    interactionMutation.mutate(
      { medications: meds },
      {
        onSuccess: (data) => setResult(data),
        onError: () => {
          setResult(MOCK_DRUG_INTERACTIONS);
          toast.info('Dados simulados carregados (API indisponível).');
        },
      },
    );
  }, [medsInput, interactionMutation]);

  const sortedInteractions = useMemo(() => {
    if (!result) return [];
    const order: Record<InteractionSeverity, number> = { CRITICAL: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 };
    return [...result.interactions].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [result]);

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Pill className="h-5 w-5 text-emerald-400" />
            Verificador de Interações Medicamentosas por IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Lista de Medicamentos (um por linha ou separados por vírgula)</Label>
            <Textarea
              placeholder={"Varfarina\nAAS\nOmeprazol\nSinvastatina\nAmiodarona\nMetformina"}
              value={medsInput}
              onChange={(e) => setMedsInput(e.target.value)}
              rows={6}
              className="border-zinc-700 bg-zinc-800 text-zinc-100 font-mono text-sm"
            />
          </div>
          <Button
            onClick={handleCheck}
            disabled={interactionMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {interactionMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" /> Verificar Interações</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            {([
              { key: 'totalCritical' as const, sev: 'CRITICAL' as InteractionSeverity },
              { key: 'totalMajor' as const, sev: 'MAJOR' as InteractionSeverity },
              { key: 'totalModerate' as const, sev: 'MODERATE' as InteractionSeverity },
              { key: 'totalMinor' as const, sev: 'MINOR' as InteractionSeverity },
            ]).map(({ key, sev }) => {
              const cfg = SEVERITY_CONFIG[sev];
              return (
                <Card key={key} className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-4 text-center">
                    <p className={cn('text-3xl font-bold', cfg.className)}>{result[key]}</p>
                    <p className="text-sm text-zinc-400">{cfg.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Medications badges */}
          <div className="flex flex-wrap gap-2">
            {result.medications.map((med) => (
              <Badge key={med} variant="outline" className="border-zinc-600 text-zinc-300">
                <Pill className="mr-1 h-3 w-3" /> {med}
              </Badge>
            ))}
          </div>

          {/* Interaction list */}
          <div className="space-y-3">
            {sortedInteractions.map((inter, idx) => {
              const cfg = SEVERITY_CONFIG[inter.severity];
              const isExpanded = expandedInteraction === idx;

              return (
                <Card
                  key={idx}
                  className={cn(
                    'border-zinc-800 bg-zinc-900 cursor-pointer transition-all hover:border-zinc-700',
                    isExpanded && 'border-emerald-500/50',
                    inter.severity === 'CRITICAL' && 'border-l-2 border-l-red-500',
                  )}
                  onClick={() => setExpandedInteraction(isExpanded ? null : idx)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Badge className={cn('shrink-0', cfg.bgClassName)}>{cfg.label}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100">{inter.drug1}</span>
                          <Zap className={cn('h-4 w-4 shrink-0', cfg.className)} />
                          <span className="font-semibold text-zinc-100">{inter.drug2}</span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-400 truncate">{inter.description}</p>
                      </div>
                      <ChevronRight className={cn('h-5 w-5 text-zinc-500 transition-transform shrink-0', isExpanded && 'rotate-90')} />
                    </div>

                    {isExpanded && (
                      <div className="mt-4 grid gap-4 border-t border-zinc-800 pt-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-zinc-500 mb-1">Mecanismo</h4>
                            <p className="text-sm text-zinc-300">{inter.mechanism}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-zinc-500 mb-1">Efeito Clínico</h4>
                            <p className="text-sm text-zinc-300">{inter.clinicalEffect}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-zinc-500 mb-1">Referências</h4>
                            {inter.references.map((r, i) => (
                              <Badge key={i} variant="outline" className="border-blue-500/50 text-blue-400 text-xs mr-1 mb-1">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-emerald-500 mb-1">Manejo</h4>
                            <p className="text-sm text-zinc-300">{inter.management}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-blue-500 mb-1">Alternativas</h4>
                            <ul className="space-y-1">
                              {inter.alternatives.map((alt, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                                  <ArrowRight className="h-3 w-3 text-blue-400 shrink-0" /> {alt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AiClinicalDecisionPage() {
  const [activeTab, setActiveTab] = useState('ddx');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Brain className="h-7 w-7 text-emerald-400" />
            Decisão Clínica com IA
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Suporte à decisão clínica potencializado por inteligência artificial
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
          <Sparkles className="mr-1 h-3 w-3" /> GPT-4o Powered
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="ddx" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 gap-1.5">
            <Brain className="h-4 w-4" /> Diagnóstico Diferencial
          </TabsTrigger>
          <TabsTrigger value="calculators" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 gap-1.5">
            <Calculator className="h-4 w-4" /> Calculadoras Clínicas
          </TabsTrigger>
          <TabsTrigger value="predictive" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 gap-1.5">
            <Activity className="h-4 w-4" /> Alertas Preditivos
          </TabsTrigger>
          <TabsTrigger value="protocols" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 gap-1.5">
            <FileText className="h-4 w-4" /> Protocolos
          </TabsTrigger>
          <TabsTrigger value="interactions" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 gap-1.5">
            <Pill className="h-4 w-4" /> Interações Medicamentosas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ddx" className="mt-6">
          <DifferentialDiagnosisTab />
        </TabsContent>
        <TabsContent value="calculators" className="mt-6">
          <ClinicalCalculatorsTab />
        </TabsContent>
        <TabsContent value="predictive" className="mt-6">
          <PredictiveAlertsTab />
        </TabsContent>
        <TabsContent value="protocols" className="mt-6">
          <ProtocolRecommendationTab />
        </TabsContent>
        <TabsContent value="interactions" className="mt-6">
          <DrugInteractionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
