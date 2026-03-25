import { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Circle,
  Plus,
  TrendingDown,
  TrendingUp,
  Heart,
  Droplets,
  Footprints,
  Brain,
  Utensils,
  Hand,
  ClipboardList,
  BarChart3,
  Shield,
  Syringe,
  BedDouble,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useFallRiskAlerts,
  useMorseHistory,
  useBradenHistory,
  usePreventionPlan,
  useCreateMorseAssessment,
  useCreateBradenAssessment,
  useToggleIntervention,
} from '@/services/fall-risk.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  LOW: { label: 'Baixo', className: 'bg-green-500/20 text-green-400 border-green-500/50', color: '#4ade80' },
  MODERATE: { label: 'Moderado', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', color: '#facc15' },
  HIGH: { label: 'Alto', className: 'bg-red-500/20 text-red-400 border-red-500/50', color: '#f87171' },
  VERY_HIGH: { label: 'Muito Alto', className: 'bg-red-600/30 text-red-300 border-red-600/50', color: '#ef4444' },
  NO_RISK: { label: 'Sem Risco', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50', color: '#a1a1aa' },
};

const DEMO_PATIENT_ID = 'demo-patient-1';

const MORSE_ITEMS = [
  {
    key: 'historyOfFalling',
    label: 'Histórico de Quedas',
    icon: AlertTriangle,
    options: [
      { value: 0, label: 'Não', description: 'Sem histórico de queda nos últimos 3 meses' },
      { value: 25, label: 'Sim', description: 'Queda registrada nos últimos 3 meses' },
    ],
  },
  {
    key: 'secondaryDiagnosis',
    label: 'Diagnóstico Secundário',
    icon: ClipboardList,
    options: [
      { value: 0, label: 'Não', description: 'Apenas um diagnóstico ativo' },
      { value: 15, label: 'Sim', description: 'Dois ou mais diagnósticos ativos' },
    ],
  },
  {
    key: 'ambulatoryAid',
    label: 'Dispositivo de Auxílio à Marcha',
    icon: Footprints,
    options: [
      { value: 0, label: 'Nenhum / Acamado / Cadeira de Rodas', description: 'Repouso no leito ou cadeirante' },
      { value: 15, label: 'Muletas / Bengala / Andador', description: 'Usa dispositivo auxiliar' },
      { value: 30, label: 'Apoio em Mobília', description: 'Apoia-se em mobília para deambular' },
    ],
  },
  {
    key: 'ivTherapy',
    label: 'Terapia Intravenosa / Heparina',
    icon: Syringe,
    options: [
      { value: 0, label: 'Não', description: 'Sem acesso venoso ou heparina' },
      { value: 20, label: 'Sim', description: 'Acesso venoso ou heparina em uso' },
    ],
  },
  {
    key: 'gait',
    label: 'Marcha',
    icon: Footprints,
    options: [
      { value: 0, label: 'Normal / Cadeira de Rodas / Acamado', description: 'Marcha normal ou não deambula' },
      { value: 10, label: 'Fraca', description: 'Passos curtos, arrastando os pés' },
      { value: 20, label: 'Prejudicada', description: 'Necessita de apoio para ficar em pé' },
    ],
  },
  {
    key: 'mentalStatus',
    label: 'Estado Mental',
    icon: Brain,
    options: [
      { value: 0, label: 'Orientado', description: 'Consciente de sua capacidade' },
      { value: 15, label: 'Superestima / Esquece Limitações', description: 'Desorientado ou agitado' },
    ],
  },
] as const;

const BRADEN_ITEMS = [
  {
    key: 'sensoryPerception',
    label: 'Percepção Sensorial',
    icon: Hand,
    max: 4,
    descriptions: [
      'Totalmente limitado',
      'Muito limitado',
      'Levemente limitado',
      'Sem comprometimento',
    ],
  },
  {
    key: 'moisture',
    label: 'Umidade',
    icon: Droplets,
    max: 4,
    descriptions: [
      'Constantemente úmida',
      'Muito úmida',
      'Ocasionalmente úmida',
      'Raramente úmida',
    ],
  },
  {
    key: 'activity',
    label: 'Atividade',
    icon: Footprints,
    max: 4,
    descriptions: [
      'Acamado',
      'Confinado à cadeira',
      'Caminha ocasionalmente',
      'Caminha frequentemente',
    ],
  },
  {
    key: 'mobility',
    label: 'Mobilidade',
    icon: Activity,
    max: 4,
    descriptions: [
      'Totalmente imóvel',
      'Muito limitada',
      'Levemente limitada',
      'Sem limitações',
    ],
  },
  {
    key: 'nutrition',
    label: 'Nutrição',
    icon: Utensils,
    max: 4,
    descriptions: [
      'Muito pobre',
      'Provavelmente inadequada',
      'Adequada',
      'Excelente',
    ],
  },
  {
    key: 'frictionShear',
    label: 'Fricção e Cisalhamento',
    icon: Hand,
    max: 3,
    descriptions: [
      'Problema',
      'Problema potencial',
      'Sem problema aparente',
    ],
  },
] as const;

// ─── Caprini VTE Risk ───────────────────────────────────────────────────────

interface CapriniFactor {
  id: string;
  label: string;
  points: number;
  category: string;
}

const CAPRINI_FACTORS: CapriniFactor[] = [
  // 1 ponto
  { id: 'age41_60', label: 'Idade 41–60 anos', points: 1, category: 'Dados demográficos' },
  { id: 'minor_surgery', label: 'Cirurgia menor planejada', points: 1, category: 'Cirurgia' },
  { id: 'swollen_legs', label: 'Pernas edemaciadas', points: 1, category: 'Sinais clínicos' },
  { id: 'varicose_veins', label: 'Veias varicosas', points: 1, category: 'Sinais clínicos' },
  { id: 'obesity', label: 'Obesidade (IMC > 25)', points: 1, category: 'Dados demográficos' },
  { id: 'mi_recent', label: 'IAM recente', points: 1, category: 'Comorbidades' },
  { id: 'icc', label: 'ICC (1 mês)', points: 1, category: 'Comorbidades' },
  { id: 'sepsis', label: 'Sepse (1 mês)', points: 1, category: 'Comorbidades' },
  { id: 'pneumonia', label: 'Doença pulmonar grave', points: 1, category: 'Comorbidades' },
  { id: 'oral_contraceptive', label: 'Uso de anticoncepcional oral / TRH', points: 1, category: 'Medicações' },
  { id: 'pregnancy', label: 'Gravidez / pós-parto', points: 1, category: 'Dados demográficos' },
  { id: 'bed_rest', label: 'Repouso no leito (> 72h)', points: 1, category: 'Mobilidade' },
  // 2 pontos
  { id: 'age61_74', label: 'Idade 61–74 anos', points: 2, category: 'Dados demográficos' },
  { id: 'major_surgery', label: 'Cirurgia maior (> 45 min)', points: 2, category: 'Cirurgia' },
  { id: 'arthroscopic', label: 'Cirurgia artroscópica', points: 2, category: 'Cirurgia' },
  { id: 'malignancy', label: 'Neoplasia maligna', points: 2, category: 'Comorbidades' },
  { id: 'cast', label: 'Imobilização gessada', points: 2, category: 'Mobilidade' },
  { id: 'central_venous', label: 'Cateter venoso central', points: 2, category: 'Procedimentos' },
  // 3 pontos
  { id: 'age75', label: 'Idade ≥ 75 anos', points: 3, category: 'Dados demográficos' },
  { id: 'dvt_history', label: 'Histórico de TVP/TEP', points: 3, category: 'Antecedentes' },
  { id: 'factor_v', label: 'Fator V de Leiden', points: 3, category: 'Trombofilia' },
  { id: 'lupus', label: 'Anticorpos antifosfolípides', points: 3, category: 'Trombofilia' },
  { id: 'heparin_thrombocytopenia', label: 'TIH (trombocitopenia por heparina)', points: 3, category: 'Trombofilia' },
  // 5 pontos
  { id: 'stroke', label: 'AVC (< 1 mês)', points: 5, category: 'Comorbidades' },
  { id: 'arthroplasty', label: 'Artroplastia eletiva de MMII', points: 5, category: 'Cirurgia' },
  { id: 'hip_fracture', label: 'Fratura de quadril/pelve/MMII', points: 5, category: 'Cirurgia' },
  { id: 'sci', label: 'Lesão medular (< 1 mês)', points: 5, category: 'Comorbidades' },
];

// ─── Padua VTE Risk ─────────────────────────────────────────────────────────

interface PaduaFactor {
  id: string;
  label: string;
  points: number;
}

const PADUA_FACTORS: PaduaFactor[] = [
  { id: 'active_cancer', label: 'Câncer ativo', points: 3 },
  { id: 'previous_vte', label: 'TEV prévio (exceto TVP superficial)', points: 3 },
  { id: 'reduced_mobility', label: 'Mobilidade reduzida (≥ 3 dias)', points: 3 },
  { id: 'thrombophilia', label: 'Trombofilia conhecida', points: 3 },
  { id: 'recent_trauma', label: 'Trauma e/ou cirurgia (≤ 1 mês)', points: 2 },
  { id: 'age_70', label: 'Idade ≥ 70 anos', points: 1 },
  { id: 'heart_respiratory', label: 'Insuficiência cardíaca / respiratória', points: 1 },
  { id: 'acute_mi_stroke', label: 'IAM ou AVC isquêmico agudo', points: 1 },
  { id: 'acute_infection', label: 'Infecção aguda e/ou doença reumatológica', points: 1 },
  { id: 'obesity_padua', label: 'Obesidade (IMC ≥ 30)', points: 1 },
  { id: 'hormonal_treatment', label: 'Tratamento hormonal em curso', points: 1 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.LOW;
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function getMorseRisk(score: number): { level: string; label: string; color: string } {
  if (score >= 45) return { level: 'HIGH', label: 'Alto Risco', color: 'text-red-400' };
  if (score >= 25) return { level: 'MODERATE', label: 'Risco Moderado', color: 'text-yellow-400' };
  return { level: 'LOW', label: 'Baixo Risco', color: 'text-green-400' };
}

function getBradenRisk(score: number): { level: string; label: string; color: string } {
  if (score <= 9) return { level: 'VERY_HIGH', label: 'Risco Muito Alto', color: 'text-red-400' };
  if (score <= 12) return { level: 'HIGH', label: 'Alto Risco', color: 'text-red-400' };
  if (score <= 14) return { level: 'MODERATE', label: 'Risco Moderado', color: 'text-yellow-400' };
  if (score <= 18) return { level: 'LOW', label: 'Baixo Risco', color: 'text-green-400' };
  return { level: 'NO_RISK', label: 'Sem Risco', color: 'text-zinc-400' };
}

function getCapriniRisk(score: number): { level: string; label: string; color: string; profilaxia: string } {
  if (score >= 5) return { level: 'VERY_HIGH', label: 'Muito Alto', color: 'text-red-400', profilaxia: 'Heparina + compressão pneumática intermitente' };
  if (score >= 3) return { level: 'HIGH', label: 'Alto', color: 'text-orange-400', profilaxia: 'Heparina SC ou HBPM' };
  if (score >= 2) return { level: 'MODERATE', label: 'Moderado', color: 'text-yellow-400', profilaxia: 'Heparina SC, HBPM ou compressão pneumática' };
  if (score >= 1) return { level: 'LOW', label: 'Baixo', color: 'text-green-400', profilaxia: 'Deambulação precoce' };
  return { level: 'NO_RISK', label: 'Muito Baixo', color: 'text-zinc-400', profilaxia: 'Nenhuma profilaxia necessária' };
}

function getPaduaRisk(score: number): { level: string; label: string; color: string; profilaxia: string } {
  if (score >= 4) return { level: 'HIGH', label: 'Alto Risco', color: 'text-red-400', profilaxia: 'Profilaxia farmacológica indicada (HBPM ou HNF)' };
  return { level: 'LOW', label: 'Baixo Risco', color: 'text-green-400', profilaxia: 'Profilaxia mecânica (meias elásticas / CPI)' };
}

// ─── Interactive Morse Form ─────────────────────────────────────────────────

interface MorseScores {
  historyOfFalling: number;
  secondaryDiagnosis: number;
  ambulatoryAid: number;
  ivTherapy: number;
  gait: number;
  mentalStatus: number;
}

function InteractiveMorseForm({ onClose }: { onClose?: () => void }) {
  const createMorse = useCreateMorseAssessment();
  const [patientId, setPatientId] = useState(DEMO_PATIENT_ID);
  const [scores, setScores] = useState<MorseScores>({
    historyOfFalling: 0,
    secondaryDiagnosis: 0,
    ambulatoryAid: 0,
    ivTherapy: 0,
    gait: 0,
    mentalStatus: 0,
  });

  const totalScore = useMemo(
    () => Object.values(scores).reduce((a, b) => a + b, 0),
    [scores],
  );

  const risk = useMemo(() => getMorseRisk(totalScore), [totalScore]);

  const handleSelect = useCallback((key: keyof MorseScores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = () => {
    createMorse.mutate(
      {
        patientId,
        historyOfFalling: scores.historyOfFalling,
        secondaryDiagnosis: scores.secondaryDiagnosis,
        ambulatoryAid: scores.ambulatoryAid,
        ivTherapy: scores.ivTherapy,
        gait: scores.gait,
        mentalStatus: scores.mentalStatus,
      },
      {
        onSuccess: () => {
          toast.success('Avaliação Morse registrada com sucesso!');
          onClose?.();
        },
        onError: () => toast.error('Erro ao registrar avaliação Morse.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-zinc-400 text-xs">ID do Paciente</Label>
        <Input
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="bg-zinc-950 border-zinc-700 h-8 text-sm"
        />
      </div>

      <div className="space-y-3">
        {MORSE_ITEMS.map(({ key, label, icon: Icon, options }) => {
          const selectedValue = scores[key as keyof MorseScores];
          return (
            <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">{label}</span>
                <span className="ml-auto text-xs font-mono text-zinc-500">
                  {selectedValue} pts
                </span>
              </div>
              <div className="grid gap-1.5">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(key as keyof MorseScores, opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-all',
                      selectedValue === opt.value
                        ? 'bg-amber-600/20 border border-amber-500/50 text-amber-300'
                        : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300',
                    )}
                  >
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <p className="text-xs text-zinc-500 mt-0.5">{opt.description}</p>
                    </div>
                    <span className="font-mono text-xs shrink-0 ml-2">
                      {opt.value > 0 ? `+${opt.value}` : '0'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score summary bar */}
      <div className="rounded-lg bg-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Pontuação Total Morse</span>
          <span className={cn('text-2xl font-bold', risk.color)}>{totalScore} pts</span>
        </div>
        <div className="w-full h-3 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              totalScore >= 45 ? 'bg-red-500' : totalScore >= 25 ? 'bg-yellow-500' : 'bg-green-500',
            )}
            style={{ width: `${Math.min((totalScore / 125) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>0 — Baixo</span>
          <span>25 — Moderado</span>
          <span>45+ — Alto</span>
        </div>
        <div className="mt-3 text-center">
          <Badge variant="outline" className={cn('text-sm px-3 py-1', RISK_CONFIG[risk.level as keyof typeof RISK_CONFIG]?.className)}>
            {risk.label}
          </Badge>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={createMorse.isPending}
        className="w-full bg-amber-600 hover:bg-amber-700"
      >
        {createMorse.isPending ? 'Salvando...' : 'Salvar Avaliação Morse'}
      </Button>
    </div>
  );
}

// ─── Interactive Braden Form ────────────────────────────────────────────────

interface BradenScores {
  sensoryPerception: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  frictionShear: number;
}

function InteractiveBradenForm({ onClose }: { onClose?: () => void }) {
  const createBraden = useCreateBradenAssessment();
  const [patientId, setPatientId] = useState(DEMO_PATIENT_ID);
  const [scores, setScores] = useState<BradenScores>({
    sensoryPerception: 4,
    moisture: 4,
    activity: 4,
    mobility: 4,
    nutrition: 4,
    frictionShear: 3,
  });

  const totalScore = useMemo(
    () => Object.values(scores).reduce((a, b) => a + b, 0),
    [scores],
  );

  const risk = useMemo(() => getBradenRisk(totalScore), [totalScore]);

  const handleSubmit = () => {
    createBraden.mutate(
      {
        patientId,
        sensoryPerception: scores.sensoryPerception,
        moisture: scores.moisture,
        activity: scores.activity,
        mobility: scores.mobility,
        nutrition: scores.nutrition,
        frictionShear: scores.frictionShear,
      },
      {
        onSuccess: () => {
          toast.success('Avaliação Braden registrada!');
          onClose?.();
        },
        onError: () => toast.error('Erro ao registrar avaliação Braden.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-zinc-400 text-xs">ID do Paciente</Label>
        <Input
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="bg-zinc-950 border-zinc-700 h-8 text-sm"
        />
      </div>

      <div className="space-y-3">
        {BRADEN_ITEMS.map(({ key, label, icon: Icon, max, descriptions }) => {
          const selectedValue = scores[key as keyof BradenScores];
          return (
            <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-medium">{label}</span>
                <span className="ml-auto text-xs font-mono text-zinc-500">
                  {selectedValue}/{max}
                </span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
                  <button
                    key={v}
                    onClick={() => setScores((prev) => ({ ...prev, [key]: v }))}
                    className={cn(
                      'flex-1 rounded-md py-2 text-center transition-all border',
                      selectedValue === v
                        ? 'bg-teal-600/20 border-teal-500/50 text-teal-300'
                        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400',
                    )}
                  >
                    <span className="text-lg font-bold block">{v}</span>
                    <span className="text-[10px] leading-tight block px-1">
                      {descriptions[v - 1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score summary */}
      <div className="rounded-lg bg-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Pontuação Total Braden</span>
          <span className={cn('text-2xl font-bold', risk.color)}>{totalScore} pts</span>
        </div>
        <div className="w-full h-3 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              totalScore <= 9 ? 'bg-red-600' : totalScore <= 12 ? 'bg-red-500' : totalScore <= 14 ? 'bg-yellow-500' : totalScore <= 18 ? 'bg-green-500' : 'bg-zinc-400',
            )}
            style={{ width: `${Math.min((totalScore / 23) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>6–9 Muito Alto</span>
          <span>10–12 Alto</span>
          <span>13–14 Mod.</span>
          <span>15–18 Baixo</span>
          <span>19–23 Sem</span>
        </div>
        <div className="mt-3 text-center">
          <Badge variant="outline" className={cn('text-sm px-3 py-1', RISK_CONFIG[risk.level as keyof typeof RISK_CONFIG]?.className)}>
            {risk.label}
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 text-center mt-2">
          Braden: quanto MENOR a pontuação, MAIOR o risco de lesão por pressão
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={createBraden.isPending}
        className="w-full bg-teal-600 hover:bg-teal-700"
      >
        {createBraden.isPending ? 'Salvando...' : 'Salvar Avaliação Braden'}
      </Button>
    </div>
  );
}

// ─── VTE Risk Calculator (Caprini) ──────────────────────────────────────────

function CapriniCalculator() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalScore = useMemo(
    () => CAPRINI_FACTORS.filter((f) => selected.has(f.id)).reduce((acc, f) => acc + f.points, 0),
    [selected],
  );

  const risk = useMemo(() => getCapriniRisk(totalScore), [totalScore]);

  const groupedFactors = useMemo(() => {
    const groups: Record<string, CapriniFactor[]> = {};
    for (const f of CAPRINI_FACTORS) {
      (groups[f.category] ??= []).push(f);
    }
    return groups;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="h-5 w-5 text-rose-400" />
        <h3 className="font-semibold">Escala de Caprini — Risco de TEV Cirúrgico</h3>
      </div>

      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
        {Object.entries(groupedFactors).map(([category, factors]) => (
          <div key={category}>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              {category}
            </p>
            <div className="grid gap-1">
              {factors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className={cn(
                    'flex items-center justify-between rounded-md px-3 py-2 text-sm text-left transition-all border',
                    selected.has(f.id)
                      ? 'bg-rose-600/20 border-rose-500/50 text-rose-300'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800',
                  )}
                >
                  <span>{f.label}</span>
                  <span className="font-mono text-xs shrink-0 ml-2">+{f.points}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Score Caprini</span>
          <span className={cn('text-2xl font-bold', risk.color)}>{totalScore}</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', RISK_CONFIG[risk.level as keyof typeof RISK_CONFIG]?.className ?? 'bg-zinc-500/20 text-zinc-400')}>
              {risk.label}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            <strong>Profilaxia:</strong> {risk.profilaxia}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── VTE Risk Calculator (Padua) ────────────────────────────────────────────

function PaduaCalculator() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalScore = useMemo(
    () => PADUA_FACTORS.filter((f) => selected.has(f.id)).reduce((acc, f) => acc + f.points, 0),
    [selected],
  );

  const risk = useMemo(() => getPaduaRisk(totalScore), [totalScore]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BedDouble className="h-5 w-5 text-indigo-400" />
        <h3 className="font-semibold">Escala de Padua — Risco de TEV Clínico</h3>
      </div>

      <div className="grid gap-1.5">
        {PADUA_FACTORS.map((f) => (
          <button
            key={f.id}
            onClick={() => toggle(f.id)}
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-left transition-all border',
              selected.has(f.id)
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800',
            )}
          >
            <span>{f.label}</span>
            <span className="font-mono text-xs shrink-0 ml-2">+{f.points}</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Score Padua</span>
          <span className={cn('text-2xl font-bold', risk.color)}>{totalScore}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-xs', totalScore >= 4 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50')}>
            {risk.label}
          </Badge>
          <span className="text-xs text-zinc-500">
            (corte: ≥ 4 = alto risco)
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          <strong>Conduta:</strong> {risk.profilaxia}
        </p>
      </div>
    </div>
  );
}

// ─── Risk Trend Chart ───────────────────────────────────────────────────────

function RiskTrendChart({
  morseHistory,
  bradenHistory,
}: {
  morseHistory: Array<{ assessedAt: string; totalScore: number }>;
  bradenHistory: Array<{ assessedAt: string; totalScore: number }>;
}) {
  const chartData = useMemo(() => {
    const dateMap = new Map<string, { date: string; morse?: number; braden?: number }>();

    for (const m of morseHistory) {
      const d = new Date(m.assessedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const existing = dateMap.get(d) ?? { date: d };
      existing.morse = m.totalScore;
      dateMap.set(d, existing);
    }

    for (const b of bradenHistory) {
      const d = new Date(b.assessedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const existing = dateMap.get(d) ?? { date: d };
      existing.braden = b.totalScore;
      dateMap.set(d, existing);
    }

    return Array.from(dateMap.values()).sort((a, b) => {
      const partsA = a.date.split('/').map(Number);
      const partsB = b.date.split('/').map(Number);
      const da = partsA[0] ?? 0;
      const ma = partsA[1] ?? 0;
      const db = partsB[0] ?? 0;
      const mb = partsB[1] ?? 0;
      return (ma - mb) || (da - db);
    });
  }, [morseHistory, bradenHistory]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Nenhuma avaliação registrada para gerar gráfico de tendência
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-emerald-400" />
        <h3 className="font-semibold">Tendência de Risco ao Longo do Tempo</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Morse trend */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400">Morse — Risco de Queda</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis domain={[0, 125]} tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Alto (45)', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={25} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Mod. (25)', fill: '#eab308', fontSize: 10 }} />
                <Area type="monotone" dataKey="morse" fill="#f59e0b20" stroke="none" />
                <Line type="monotone" dataKey="morse" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} name="Morse" />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-zinc-600 text-center mt-1">
              Morse: quanto MAIOR, pior (0–125)
            </p>
          </CardContent>
        </Card>

        {/* Braden trend */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-teal-400">Braden — Lesão por Pressão</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis domain={[6, 23]} tick={{ fill: '#71717a', fontSize: 11 }} reversed />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <ReferenceLine y={12} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Alto (≤12)', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={14} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Mod. (≤14)', fill: '#eab308', fontSize: 10 }} />
                <Area type="monotone" dataKey="braden" fill="#14b8a620" stroke="none" />
                <Line type="monotone" dataKey="braden" stroke="#14b8a6" strokeWidth={2} dot={{ r: 4, fill: '#14b8a6' }} name="Braden" />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-zinc-600 text-center mt-1">
              Braden: quanto MENOR, pior (6–23) — eixo invertido
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Prevention Plan Builder ────────────────────────────────────────────────

const DEFAULT_INTERVENTIONS = [
  { id: 'grades', description: 'Grades laterais do leito elevadas', category: 'Ambiente' },
  { id: 'cama_baixa', description: 'Cama na posição mais baixa', category: 'Ambiente' },
  { id: 'campainha', description: 'Campainha ao alcance do paciente', category: 'Ambiente' },
  { id: 'iluminacao', description: 'Iluminação noturna adequada', category: 'Ambiente' },
  { id: 'piso_seco', description: 'Piso limpo e seco, sem obstáculos', category: 'Ambiente' },
  { id: 'antiderrapante', description: 'Calçados antiderrapantes fornecidos', category: 'Equipamento' },
  { id: 'andador', description: 'Dispositivo de auxílio à marcha disponível', category: 'Equipamento' },
  { id: 'pulseira', description: 'Pulseira de identificação de risco (amarela)', category: 'Identificação' },
  { id: 'placa_leito', description: 'Sinalização no leito do paciente', category: 'Identificação' },
  { id: 'orientacao', description: 'Orientação ao paciente e família sobre risco', category: 'Educação' },
  { id: 'chamar_ajuda', description: 'Orientar a chamar ajuda antes de levantar', category: 'Educação' },
  { id: 'medicacao', description: 'Revisão de medicações que aumentam risco', category: 'Farmacológico' },
  { id: 'hipotensao', description: 'Avaliar hipotensão ortostática', category: 'Clínico' },
  { id: 'fisioterapia', description: 'Solicitar avaliação da fisioterapia', category: 'Clínico' },
  { id: 'visao', description: 'Verificar uso de óculos / lentes', category: 'Clínico' },
  { id: 'reavaliacao', description: 'Reavaliar risco a cada turno (8h)', category: 'Monitoramento' },
];

function PreventionPlanBuilder({
  plan,
  patientId,
}: {
  plan: { interventions: Array<{ id: string; description: string; completed: boolean; completedAt: string | null; completedBy: string | null }> } | undefined;
  patientId: string;
}) {
  const toggleIntervention = useToggleIntervention();
  const [customIntervention, setCustomIntervention] = useState('');

  const interventions = plan?.interventions ?? [];
  const completedCount = interventions.filter((i) => i.completed).length;
  const totalCount = interventions.length || DEFAULT_INTERVENTIONS.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (interventionId: string, completed: boolean) => {
    toggleIntervention.mutate(
      { patientId, interventionId, completed: !completed },
      {
        onSuccess: () => toast.success('Intervenção atualizada.'),
        onError: () => toast.error('Erro ao atualizar intervenção.'),
      },
    );
  };

  const groupedDefaults = useMemo(() => {
    const groups: Record<string, typeof DEFAULT_INTERVENTIONS> = {};
    for (const d of DEFAULT_INTERVENTIONS) {
      (groups[d.category] ??= []).push(d);
    }
    return groups;
  }, []);

  const displayInterventions = interventions.length > 0 ? interventions : null;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="rounded-lg bg-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="font-medium">Plano de Prevenção de Quedas</span>
          </div>
          <span className="text-sm text-zinc-400">
            {completedCount}/{totalCount} concluídas ({completionPct}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Active interventions */}
      {displayInterventions ? (
        <div className="space-y-2">
          {displayInterventions.map((intervention) => (
            <div
              key={intervention.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <button
                onClick={() => handleToggle(intervention.id, intervention.completed)}
                className="mt-0.5 shrink-0"
              >
                {intervention.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 text-zinc-600 hover:text-zinc-400" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', intervention.completed && 'line-through text-zinc-500')}>
                  {intervention.description}
                </p>
                {intervention.completedAt && (
                  <p className="text-xs text-zinc-600 mt-1">
                    Concluído em {formatDate(intervention.completedAt)} por {intervention.completedBy}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Nenhum plano ativo. Intervenções sugeridas por categoria:
          </p>
          {Object.entries(groupedDefaults).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                {category}
              </p>
              <div className="grid gap-1.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800"
                  >
                    <Circle className="h-4 w-4 text-zinc-600 shrink-0" />
                    <span className="text-sm text-zinc-400">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom intervention */}
      <div className="flex gap-2">
        <Input
          placeholder="Adicionar intervenção personalizada..."
          value={customIntervention}
          onChange={(e) => setCustomIntervention(e.target.value)}
          className="bg-zinc-950 border-zinc-700 text-sm"
        />
        <Button
          variant="outline"
          className="border-zinc-700 shrink-0"
          disabled={!customIntervention.trim()}
          onClick={() => {
            toast.info(`Intervenção "${customIntervention}" seria adicionada ao plano`);
            setCustomIntervention('');
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function FallRiskPage() {
  const [morseDialog, setMorseDialog] = useState(false);
  const [bradenDialog, setBradenDialog] = useState(false);
  const [selectedPatientId] = useState(DEMO_PATIENT_ID);

  const { data: alerts = [], isLoading: alertsLoading } = useFallRiskAlerts();
  const { data: morseHistory = [] } = useMorseHistory(selectedPatientId);
  const { data: bradenHistory = [] } = useBradenHistory(selectedPatientId);
  const { data: plan } = usePreventionPlan(selectedPatientId);

  const highRiskCount = alerts.filter((a) => a.riskLevel === 'HIGH').length;
  const moderateRiskCount = alerts.filter((a) => a.riskLevel === 'MODERATE').length;
  const lowRiskCount = alerts.filter((a) => a.riskLevel === 'LOW').length;

  const latestMorse = morseHistory.length > 0 ? morseHistory[0] : null;
  const latestBraden = bradenHistory.length > 0 ? bradenHistory[0] : null;

  if (alertsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-[#0a0a0f] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-600/20">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Risco de Queda e Segurança do Paciente</h1>
            <p className="text-sm text-zinc-500">Morse, Braden, TEV — avaliações e prevenção</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700 hover:border-amber-500/50" onClick={() => setMorseDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Morse
          </Button>
          <Button variant="outline" className="border-zinc-700 hover:border-teal-500/50" onClick={() => setBradenDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Braden
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-xs text-zinc-500">Alto Risco</p>
              <p className="text-2xl font-bold text-red-400">{highRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-xs text-zinc-500">Moderado</p>
              <p className="text-2xl font-bold text-yellow-400">{moderateRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-xs text-zinc-500">Baixo</p>
              <p className="text-2xl font-bold text-green-400">{lowRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">Último Morse</p>
              <p className={cn('text-2xl font-bold', latestMorse ? getMorseRisk(latestMorse.totalScore).color : 'text-zinc-600')}>
                {latestMorse?.totalScore ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-teal-400" />
            <div>
              <p className="text-xs text-zinc-500">Último Braden</p>
              <p className={cn('text-2xl font-bold', latestBraden ? getBradenRisk(latestBraden.totalScore).color : 'text-zinc-600')}>
                {latestBraden?.totalScore ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="alerts">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="alerts">Alertas Ativos</TabsTrigger>
          <TabsTrigger value="morse">Escala de Morse</TabsTrigger>
          <TabsTrigger value="braden">Escala de Braden</TabsTrigger>
          <TabsTrigger value="vte">Risco TEV</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="plan">Plano de Prevenção</TabsTrigger>
        </TabsList>

        {/* ─── Alertas Ativos ─────────────────────────────────────────── */}
        <TabsContent value="alerts" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Alertas de Risco de Queda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {alerts.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum alerta ativo</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Paciente</TableHead>
                      <TableHead>MRN</TableHead>
                      <TableHead>Leito</TableHead>
                      <TableHead>Enfermaria</TableHead>
                      <TableHead>Morse</TableHead>
                      <TableHead>Braden</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium">{alert.patientName}</TableCell>
                        <TableCell className="text-zinc-400 font-mono text-xs">{alert.mrn}</TableCell>
                        <TableCell className="text-zinc-400">{alert.bed ?? '—'}</TableCell>
                        <TableCell className="text-zinc-400">{alert.ward ?? '—'}</TableCell>
                        <TableCell>
                          {alert.morseScore != null ? (
                            <span className={cn('font-mono font-bold', getMorseRisk(alert.morseScore).color)}>
                              {alert.morseScore}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {alert.bradenScore != null ? (
                            <span className={cn('font-mono font-bold', getBradenRisk(alert.bradenScore).color)}>
                              {alert.bradenScore}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell><RiskBadge level={alert.riskLevel} /></TableCell>
                        <TableCell className="text-zinc-400 text-xs">{formatDate(alert.alertDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Escala de Morse ────────────────────────────────────────── */}
        <TabsContent value="morse" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base text-amber-400">Nova Avaliação Morse</CardTitle>
              </CardHeader>
              <CardContent>
                <InteractiveMorseForm />
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Histórico de Avaliações Morse</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {morseHistory.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">Nenhuma avaliação registrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead>Data</TableHead>
                        <TableHead>Queda</TableHead>
                        <TableHead>Diag. 2°</TableHead>
                        <TableHead>Aux.</TableHead>
                        <TableHead>IV</TableHead>
                        <TableHead>Marcha</TableHead>
                        <TableHead>Mental</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Risco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {morseHistory.map((a) => (
                        <TableRow key={a.id} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-400 text-xs">{formatDate(a.assessedAt)}</TableCell>
                          <TableCell className="font-mono text-xs">{a.historyOfFalling}</TableCell>
                          <TableCell className="font-mono text-xs">{a.secondaryDiagnosis}</TableCell>
                          <TableCell className="font-mono text-xs">{a.ambulatoryAid}</TableCell>
                          <TableCell className="font-mono text-xs">{a.ivTherapy}</TableCell>
                          <TableCell className="font-mono text-xs">{a.gait}</TableCell>
                          <TableCell className="font-mono text-xs">{a.mentalStatus}</TableCell>
                          <TableCell className={cn('font-bold', getMorseRisk(a.totalScore).color)}>
                            {a.totalScore}
                          </TableCell>
                          <TableCell><RiskBadge level={a.riskLevel} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Escala de Braden ───────────────────────────────────────── */}
        <TabsContent value="braden" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base text-teal-400">Nova Avaliação Braden</CardTitle>
              </CardHeader>
              <CardContent>
                <InteractiveBradenForm />
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Histórico de Avaliações Braden</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {bradenHistory.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">Nenhuma avaliação Braden registrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead>Data</TableHead>
                        <TableHead>Sens.</TableHead>
                        <TableHead>Umid.</TableHead>
                        <TableHead>Ativ.</TableHead>
                        <TableHead>Mob.</TableHead>
                        <TableHead>Nutr.</TableHead>
                        <TableHead>Fric.</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Risco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bradenHistory.map((a) => (
                        <TableRow key={a.id} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-400 text-xs">{formatDate(a.assessedAt)}</TableCell>
                          <TableCell className="font-mono text-xs">{a.sensoryPerception}</TableCell>
                          <TableCell className="font-mono text-xs">{a.moisture}</TableCell>
                          <TableCell className="font-mono text-xs">{a.activity}</TableCell>
                          <TableCell className="font-mono text-xs">{a.mobility}</TableCell>
                          <TableCell className="font-mono text-xs">{a.nutrition}</TableCell>
                          <TableCell className="font-mono text-xs">{a.frictionShear}</TableCell>
                          <TableCell className={cn('font-bold', getBradenRisk(a.totalScore).color)}>
                            {a.totalScore}
                          </TableCell>
                          <TableCell><RiskBadge level={a.riskLevel} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Risco TEV ──────────────────────────────────────────────── */}
        <TabsContent value="vte" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-400" />
                  Caprini — Pacientes Cirúrgicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CapriniCalculator />
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-indigo-400" />
                  Padua — Pacientes Clínicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaduaCalculator />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900 border-zinc-800 mt-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-1">Caprini 0</p>
                  <p className="text-sm font-medium text-green-400">Muito Baixo</p>
                  <p className="text-[10px] text-zinc-600">Deambulação precoce</p>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-1">Caprini 1–2</p>
                  <p className="text-sm font-medium text-yellow-400">Baixo–Moderado</p>
                  <p className="text-[10px] text-zinc-600">CPI / Meias elásticas</p>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-1">Caprini 3–4</p>
                  <p className="text-sm font-medium text-orange-400">Alto</p>
                  <p className="text-[10px] text-zinc-600">HBPM / HNF</p>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-1">Caprini ≥ 5</p>
                  <p className="text-sm font-medium text-red-400">Muito Alto</p>
                  <p className="text-[10px] text-zinc-600">HBPM + CPI combinados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tendências ─────────────────────────────────────────────── */}
        <TabsContent value="trends" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <RiskTrendChart morseHistory={morseHistory} bradenHistory={bradenHistory} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Plano de Prevenção ─────────────────────────────────────── */}
        <TabsContent value="plan" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <PreventionPlanBuilder plan={plan} patientId={selectedPatientId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs (legacy, still accessible) */}
      <Dialog open={morseDialog} onOpenChange={setMorseDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Nova Avaliação Morse</DialogTitle>
            <DialogDescription>Escala de Quedas de Morse (0–125 pontos)</DialogDescription>
          </DialogHeader>
          <InteractiveMorseForm onClose={() => setMorseDialog(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={bradenDialog} onOpenChange={setBradenDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-teal-400">Nova Avaliação Braden</DialogTitle>
            <DialogDescription>Risco de Lesão por Pressão (6–23 pontos)</DialogDescription>
          </DialogHeader>
          <InteractiveBradenForm onClose={() => setBradenDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
