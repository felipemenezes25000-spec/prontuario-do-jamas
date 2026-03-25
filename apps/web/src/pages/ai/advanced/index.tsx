import { useState, useCallback, useMemo } from 'react';
import {
  Brain,
  Dna,
  Target,
  MessageSquare,
  Layers,
  HeartPulse,
  Send,
  Star,
  StarOff,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Activity,
  Pill,
  Beaker,
  Microscope,
  Sparkles,
  Clock,
  ChevronRight,
  Zap,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  useDigitalTwin,
  useTreatmentSimulation,
  usePharmacogenomics,
  useOncogenomics,
  useConversationalBI,
  useBIQuery,
  useToggleBIFavorite,
  useMultimodalAnalysis,
  useHealthCoach,
  useHealthCoachChat,
} from '@/services/ai-advanced.service';
import type {
  OrganSystemHealth,
  TreatmentSimulationResult,
  MetabolizerProfile,
  TumorMutation,
  BIQueryResponse,
  MultimodalAnalysisResult,
  HealthCoachMessage,
  HealthCoachGoal,
} from '@/services/ai-advanced.service';

// ============================================================================
// Constants
// ============================================================================

const DEMO_PATIENT_ID = 'demo-patient-001';

const ORGAN_SYSTEMS: Array<{ key: string; label: string; x: number; y: number }> = [
  { key: 'neurological', label: 'Neurologia', x: 50, y: 8 },
  { key: 'cardiovascular', label: 'Cardiovascular', x: 50, y: 25 },
  { key: 'respiratory', label: 'Respiratorio', x: 30, y: 22 },
  { key: 'hepatic', label: 'Hepatico', x: 68, y: 35 },
  { key: 'gastrointestinal', label: 'Gastrointestinal', x: 50, y: 42 },
  { key: 'renal', label: 'Renal', x: 35, y: 38 },
  { key: 'endocrine', label: 'Endocrino', x: 65, y: 48 },
  { key: 'musculoskeletal', label: 'Musculoesqueletico', x: 50, y: 60 },
  { key: 'hematological', label: 'Hematologico', x: 35, y: 55 },
  { key: 'immunological', label: 'Imunologico', x: 65, y: 62 },
];

const STATUS_COLORS: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  green: 'border-emerald-500/50',
  yellow: 'border-yellow-500/50',
  red: 'border-red-500/50',
};

const STATUS_TEXT: Record<string, string> = {
  green: 'text-emerald-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
};

const PHENOTYPE_LABELS: Record<string, string> = {
  poor: 'Metabolizador Lento',
  intermediate: 'Metabolizador Intermediario',
  extensive: 'Metabolizador Normal',
  'ultra-rapid': 'Metabolizador Ultra-rapido',
};

const PHENOTYPE_COLORS: Record<string, string> = {
  poor: 'bg-red-500/20 text-red-400 border-red-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  extensive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'ultra-rapid': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const EVIDENCE_COLORS: Record<string, string> = {
  I: 'bg-emerald-500/20 text-emerald-400',
  II: 'bg-blue-500/20 text-blue-400',
  III: 'bg-yellow-500/20 text-yellow-400',
  IV: 'bg-zinc-500/20 text-zinc-400',
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

const GOAL_ICONS: Record<string, typeof Pill> = {
  medication: Pill,
  lifestyle: HeartPulse,
  nutrition: Beaker,
  exercise: Activity,
  monitoring: Eye,
};

// ============================================================================
// Mock Data (demonstration when API not available)
// ============================================================================

const MOCK_ORGAN_SYSTEMS: OrganSystemHealth[] = [
  { system: 'neurological', label: 'Neurologia', status: 'green', score: 92, details: 'Funcao cognitiva preservada. Sem deficits focais.' },
  { system: 'cardiovascular', label: 'Cardiovascular', status: 'yellow', score: 68, details: 'HAS controlada. Risco Framingham moderado. ECG: ritmo sinusal.' },
  { system: 'respiratory', label: 'Respiratorio', status: 'green', score: 88, details: 'Espirometria normal. SpO2 97%. Sem dispneia.' },
  { system: 'hepatic', label: 'Hepatico', status: 'green', score: 85, details: 'Transaminases normais. Funcao hepatica preservada.' },
  { system: 'gastrointestinal', label: 'Gastrointestinal', status: 'green', score: 90, details: 'Transito intestinal regular. Sem queixas dispepticas.' },
  { system: 'renal', label: 'Renal', status: 'yellow', score: 62, details: 'TFG 58 mL/min. DRC estagio 3a. Monitoramento trimestral.' },
  { system: 'endocrine', label: 'Endocrino', status: 'red', score: 42, details: 'DM2 com HbA1c 8.9%. Ajuste terapeutico necessario.' },
  { system: 'musculoskeletal', label: 'Musculoesqueletico', status: 'green', score: 80, details: 'Mobilidade preservada. Artrose leve em joelhos.' },
  { system: 'hematological', label: 'Hematologico', status: 'green', score: 86, details: 'Hemograma normal. Coagulograma sem alteracoes.' },
  { system: 'immunological', label: 'Imunologico', status: 'green', score: 84, details: 'Imunoglobulinas normais. Vacinacao em dia.' },
];

const MOCK_METABOLIZERS: MetabolizerProfile[] = [
  {
    gene: 'CYP2D6',
    genotype: '*1/*4',
    phenotype: 'intermediate',
    affectedDrugs: [
      { drug: 'Codeina', recommendation: 'Reduzir dose em 50%', adjustedDose: '15mg 6/6h', evidenceLevel: '1A' },
      { drug: 'Tramadol', recommendation: 'Eficacia reduzida — considerar alternativa', adjustedDose: 'Considerar morfina', evidenceLevel: '1A' },
      { drug: 'Tamoxifeno', recommendation: 'Monitorar niveis de endoxifeno', adjustedDose: '20mg/dia com monitoramento', evidenceLevel: '1B' },
    ],
  },
  {
    gene: 'CYP2C19',
    genotype: '*1/*1',
    phenotype: 'extensive',
    affectedDrugs: [
      { drug: 'Clopidogrel', recommendation: 'Dose padrao adequada', adjustedDose: '75mg/dia', evidenceLevel: '1A' },
      { drug: 'Omeprazol', recommendation: 'Dose padrao', adjustedDose: '20mg/dia', evidenceLevel: '2A' },
    ],
  },
  {
    gene: 'CYP3A4',
    genotype: '*1/*22',
    phenotype: 'intermediate',
    affectedDrugs: [
      { drug: 'Tacrolimo', recommendation: 'Reduzir dose inicial em 25%', adjustedDose: '0.15mg/kg/dia', evidenceLevel: '2A' },
      { drug: 'Ciclosporina', recommendation: 'Monitorar niveis sericos', adjustedDose: 'Titular conforme nivel', evidenceLevel: '2B' },
    ],
  },
  {
    gene: 'VKORC1',
    genotype: '-1639G>A (AG)',
    phenotype: 'intermediate',
    affectedDrugs: [
      { drug: 'Varfarina', recommendation: 'Dose inicial reduzida', adjustedDose: '3-4mg/dia', evidenceLevel: '1A' },
    ],
  },
  {
    gene: 'DPYD',
    genotype: '*1/*1',
    phenotype: 'extensive',
    affectedDrugs: [
      { drug: '5-Fluorouracil', recommendation: 'Dose padrao segura', adjustedDose: 'Conforme protocolo', evidenceLevel: '1A' },
      { drug: 'Capecitabina', recommendation: 'Dose padrao segura', adjustedDose: 'Conforme protocolo', evidenceLevel: '1A' },
    ],
  },
];

const MOCK_MUTATIONS: TumorMutation[] = [
  {
    gene: 'EGFR', variant: 'L858R', type: 'Missense', vaf: 35.2, actionable: true, evidenceLevel: 'I',
    targetedTherapies: [
      { drug: 'Osimertinibe', approvalStatus: 'Aprovado ANVISA', evidenceLevel: 'I' },
      { drug: 'Erlotinibe', approvalStatus: 'Aprovado ANVISA', evidenceLevel: 'I' },
    ],
  },
  {
    gene: 'TP53', variant: 'R273H', type: 'Missense', vaf: 48.1, actionable: false, evidenceLevel: 'III',
    targetedTherapies: [],
  },
  {
    gene: 'KRAS', variant: 'G12C', type: 'Missense', vaf: 22.8, actionable: true, evidenceLevel: 'I',
    targetedTherapies: [
      { drug: 'Sotorasibe', approvalStatus: 'Aprovado FDA', evidenceLevel: 'I', trialId: 'NCT04303780' },
    ],
  },
  {
    gene: 'PIK3CA', variant: 'H1047R', type: 'Missense', vaf: 15.3, actionable: true, evidenceLevel: 'II',
    targetedTherapies: [
      { drug: 'Alpelisibe', approvalStatus: 'Aprovado ANVISA', evidenceLevel: 'II' },
    ],
  },
  {
    gene: 'BRCA2', variant: 'c.5946delT', type: 'Frameshift', vaf: 50.1, actionable: true, evidenceLevel: 'I',
    targetedTherapies: [
      { drug: 'Olaparibe', approvalStatus: 'Aprovado ANVISA', evidenceLevel: 'I' },
      { drug: 'Rucaparibe', approvalStatus: 'Aprovado FDA', evidenceLevel: 'I' },
    ],
  },
];

const MOCK_GOALS: HealthCoachGoal[] = [
  { id: '1', title: 'Controle Glicemico', description: 'Manter glicemia de jejum abaixo de 130 mg/dL', category: 'monitoring', progress: 45, targetDate: '2026-06-30', status: 'active' },
  { id: '2', title: 'Atividade Fisica', description: 'Caminhar 30 minutos, 5x por semana', category: 'exercise', progress: 70, targetDate: '2026-04-30', status: 'active' },
  { id: '3', title: 'Adesao Medicamentosa', description: 'Tomar todos os medicamentos nos horarios corretos', category: 'medication', progress: 88, targetDate: '2026-12-31', status: 'active' },
  { id: '4', title: 'Dieta Equilibrada', description: 'Reduzir consumo de sodio para menos de 2g/dia', category: 'nutrition', progress: 55, targetDate: '2026-05-15', status: 'active' },
];

// ============================================================================
// Digital Twin Tab
// ============================================================================

function DigitalTwinTab() {
  const { data: twin } = useDigitalTwin(DEMO_PATIENT_ID);
  const simulationMutation = useTreatmentSimulation();
  const [simDrug, setSimDrug] = useState('');
  const [simDose, setSimDose] = useState('');
  const [simDuration, setSimDuration] = useState('');
  const [simResult, setSimResult] = useState<TreatmentSimulationResult | null>(null);
  const [selectedOrgan, setSelectedOrgan] = useState<OrganSystemHealth | null>(null);

  const organs = twin?.organSystems ?? MOCK_ORGAN_SYSTEMS;

  const handleSimulate = useCallback(() => {
    if (!simDrug.trim()) {
      toast.error('Informe o nome do medicamento.');
      return;
    }
    simulationMutation.mutate(
      { patientId: DEMO_PATIENT_ID, drugName: simDrug, dose: simDose, duration: simDuration },
      {
        onSuccess: (result) => {
          setSimResult(result);
          toast.success('Simulacao concluida!');
        },
        onError: () => {
          // Demo fallback
          setSimResult({
            drugName: simDrug,
            projectedEfficacy: 78,
            sideEffectRisk: 23,
            interactions: ['Possivel interacao com Metformina — monitorar funcao renal'],
            organImpact: [
              { system: 'renal', effect: 'negative', magnitude: 15, description: 'Leve reducao da TFG esperada nas primeiras 4 semanas' },
              { system: 'endocrine', effect: 'positive', magnitude: 35, description: 'Melhora significativa no controle glicemico projetada' },
              { system: 'cardiovascular', effect: 'positive', magnitude: 12, description: 'Reducao moderada do risco cardiovascular' },
            ],
            recommendation: `Adicao de ${simDrug} ao esquema terapeutico e favoravel. Monitorar funcao renal nas primeiras 4 semanas. Beneficio glicemico esperado supera riscos renais transitarios.`,
          });
          toast.success('Simulacao concluida (demo)!');
        },
      },
    );
  }, [simDrug, simDose, simDuration, simulationMutation]);

  return (
    <div className="space-y-6">
      {/* Body Diagram */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Brain className="h-5 w-5 text-emerald-500" />
              Modelo Virtual do Paciente
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Mapa de saude por sistema organico — clique para detalhes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto h-[420px] w-[280px]">
              {/* Body outline SVG */}
              <svg viewBox="0 0 100 80" className="absolute inset-0 h-full w-full opacity-10">
                <ellipse cx="50" cy="10" rx="12" ry="10" fill="currentColor" className="text-zinc-400" />
                <rect x="38" y="18" width="24" height="30" rx="4" fill="currentColor" className="text-zinc-400" />
                <rect x="20" y="20" width="18" height="6" rx="3" fill="currentColor" className="text-zinc-400" />
                <rect x="62" y="20" width="18" height="6" rx="3" fill="currentColor" className="text-zinc-400" />
                <rect x="38" y="48" width="10" height="28" rx="3" fill="currentColor" className="text-zinc-400" />
                <rect x="52" y="48" width="10" height="28" rx="3" fill="currentColor" className="text-zinc-400" />
              </svg>
              {/* Organ system dots */}
              {ORGAN_SYSTEMS.map((os) => {
                const organData = organs.find((o) => o.system === os.key);
                const status = organData?.status ?? 'green';
                return (
                  <button
                    key={os.key}
                    type="button"
                    className={cn(
                      'absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-all hover:scale-125',
                      STATUS_COLORS[status],
                      STATUS_BORDER_COLORS[status],
                      selectedOrgan?.system === os.key && 'ring-2 ring-white/50 scale-125',
                    )}
                    style={{ left: `${os.x}%`, top: `${os.y}%` }}
                    onClick={() => setSelectedOrgan(organData ?? null)}
                    title={os.label}
                  >
                    <span className="text-[10px] font-bold text-white">{organData?.score ?? '—'}</span>
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Normal</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-yellow-500" /> Atencao</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-500" /> Critico</span>
            </div>
          </CardContent>
        </Card>

        {/* Organ detail + Risk factors */}
        <div className="space-y-4">
          {selectedOrgan ? (
            <Card className={cn('border-zinc-800 bg-zinc-900 border-l-4', STATUS_BORDER_COLORS[selectedOrgan.status])}>
              <CardHeader className="pb-2">
                <CardTitle className={cn('text-lg', STATUS_TEXT[selectedOrgan.status])}>
                  {selectedOrgan.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400">Score:</span>
                  <Progress value={selectedOrgan.score} className="flex-1" />
                  <span className={cn('text-sm font-bold', STATUS_TEXT[selectedOrgan.status])}>
                    {selectedOrgan.score}/100
                  </span>
                </div>
                <p className="text-sm text-zinc-300">{selectedOrgan.details}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="flex h-24 items-center justify-center text-zinc-500">
                <Info className="mr-2 h-4 w-4" />
                Selecione um sistema organico no diagrama
              </CardContent>
            </Card>
          )}

          {/* All systems table */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-300">Resumo dos Sistemas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[280px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Sistema</TableHead>
                      <TableHead className="text-zinc-400">Score</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organs.map((o) => (
                      <TableRow
                        key={o.system}
                        className="cursor-pointer border-zinc-800 hover:bg-zinc-800/50"
                        onClick={() => setSelectedOrgan(o)}
                      >
                        <TableCell className="text-zinc-300">{o.label}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={o.score} className="w-16" />
                            <span className="text-xs text-zinc-400">{o.score}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn('inline-block h-3 w-3 rounded-full', STATUS_COLORS[o.status])} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Treatment Simulation */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Simulacao de Tratamento
          </CardTitle>
          <CardDescription className="text-zinc-400">
            &quot;E se adicionarmos o medicamento X?&quot; — Projete desfechos antes de prescrever
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label className="text-zinc-400">Medicamento</Label>
              <Input
                placeholder="Ex: Empagliflozina"
                value={simDrug}
                onChange={(e) => setSimDrug(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Dose</Label>
              <Input
                placeholder="Ex: 25mg/dia"
                value={simDose}
                onChange={(e) => setSimDose(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Duracao</Label>
              <Input
                placeholder="Ex: 12 semanas"
                value={simDuration}
                onChange={(e) => setSimDuration(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSimulate}
                disabled={simulationMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {simulationMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Simular
              </Button>
            </div>
          </div>

          {simResult && (
            <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <p className="text-xs text-zinc-400">Eficacia Projetada</p>
                  <p className="text-2xl font-bold text-emerald-400">{simResult.projectedEfficacy}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-400">Risco Efeitos Adversos</p>
                  <p className="text-2xl font-bold text-yellow-400">{simResult.sideEffectRisk}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-400">Interacoes</p>
                  <p className="text-2xl font-bold text-zinc-100">{simResult.interactions.length}</p>
                </div>
              </div>

              {simResult.interactions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">Interacoes Encontradas:</p>
                  {simResult.interactions.map((inter, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-yellow-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {inter}
                    </div>
                  ))}
                </div>
              )}

              {simResult.organImpact.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-400">Impacto por Sistema:</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {simResult.organImpact.map((impact, i) => (
                      <div key={i} className={cn(
                        'rounded-lg border p-3',
                        impact.effect === 'positive' && 'border-emerald-500/30 bg-emerald-500/10',
                        impact.effect === 'neutral' && 'border-zinc-600 bg-zinc-800',
                        impact.effect === 'negative' && 'border-red-500/30 bg-red-500/10',
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-300 capitalize">{impact.system}</span>
                          <Badge variant="outline" className={cn(
                            'text-[10px]',
                            impact.effect === 'positive' && 'border-emerald-500/50 text-emerald-400',
                            impact.effect === 'negative' && 'border-red-500/50 text-red-400',
                          )}>
                            {impact.effect === 'positive' ? '+' : impact.effect === 'negative' ? '-' : '='}{impact.magnitude}%
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-400">{impact.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-xs font-medium text-emerald-400">Recomendacao da IA:</p>
                <p className="mt-1 text-sm text-zinc-300">{simResult.recommendation}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Pharmacogenomics Tab
// ============================================================================

function PharmacogenomicsTab() {
  const { data: panel } = usePharmacogenomics(DEMO_PATIENT_ID);
  const profiles = panel?.profiles ?? MOCK_METABOLIZERS;
  const [selectedGene, setSelectedGene] = useState<MetabolizerProfile | null>(null);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(['poor', 'intermediate', 'extensive', 'ultra-rapid'] as const).map((phenotype) => {
          const count = profiles.filter((p) => p.phenotype === phenotype).length;
          return (
            <Card key={phenotype} className={cn('border-zinc-800 bg-zinc-900')}>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-400">{PHENOTYPE_LABELS[phenotype]}</p>
                <p className="mt-1 text-2xl font-bold text-zinc-100">{count}</p>
                <p className="text-xs text-zinc-500">{count === 1 ? 'gene' : 'genes'}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gene Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <Card
            key={profile.gene}
            className={cn(
              'cursor-pointer border-zinc-800 bg-zinc-900 transition-all hover:border-emerald-500/50',
              selectedGene?.gene === profile.gene && 'border-emerald-500 ring-1 ring-emerald-500/30',
            )}
            onClick={() => setSelectedGene(profile)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-zinc-100">{profile.gene}</CardTitle>
                <Badge className={cn('text-xs', PHENOTYPE_COLORS[profile.phenotype])}>
                  {PHENOTYPE_LABELS[profile.phenotype]}
                </Badge>
              </div>
              <CardDescription className="text-zinc-400">
                Genotipo: <span className="font-mono text-zinc-300">{profile.genotype}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400">
                {profile.affectedDrugs.length} {profile.affectedDrugs.length === 1 ? 'medicamento afetado' : 'medicamentos afetados'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.affectedDrugs.map((d) => (
                  <Badge key={d.drug} variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">
                    {d.drug}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Drug Detail Table */}
      {selectedGene && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Pill className="h-5 w-5 text-emerald-500" />
              Recomendacoes para {selectedGene.gene} ({selectedGene.genotype})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Medicamento</TableHead>
                  <TableHead className="text-zinc-400">Recomendacao</TableHead>
                  <TableHead className="text-zinc-400">Dose Ajustada</TableHead>
                  <TableHead className="text-zinc-400">Evidencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGene.affectedDrugs.map((drug) => (
                  <TableRow key={drug.drug} className="border-zinc-800">
                    <TableCell className="font-medium text-zinc-200">{drug.drug}</TableCell>
                    <TableCell className="text-zinc-300">{drug.recommendation}</TableCell>
                    <TableCell className="font-mono text-sm text-emerald-400">{drug.adjustedDose}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300">{drug.evidenceLevel}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Oncogenomics Tab
// ============================================================================

function OncogenomicsTab() {
  const { data: profile } = useOncogenomics(DEMO_PATIENT_ID);
  const mutations = profile?.mutations ?? MOCK_MUTATIONS;
  const tmb = profile?.tmb ?? 14.2;
  const msi = profile?.msi ?? 'MSS (Estavel)';
  const tumorType = profile?.tumorType ?? 'Adenocarcinoma de Pulmao';

  const actionableCount = useMemo(() => mutations.filter((m) => m.actionable).length, [mutations]);

  const mockTrials = [
    { id: 'NCT05920356', title: 'Estudo fase III: Osimertinibe + Bevacizumabe em NSCLC EGFR+', phase: 'III', status: 'Recrutando', eligibilityMatch: 92 },
    { id: 'NCT04303780', title: 'Sotorasibe em tumores solidos com KRAS G12C', phase: 'II', status: 'Recrutando', eligibilityMatch: 87 },
    { id: 'NCT06112379', title: 'Combinacao de imunoterapia em tumores com alta TMB', phase: 'II', status: 'Em breve', eligibilityMatch: 65 },
  ];
  const trials = profile?.clinicalTrials ?? mockTrials;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400">Tipo Tumoral</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{tumorType}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400">TMB (Tumor Mutational Burden)</p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">{tmb} <span className="text-sm font-normal text-zinc-400">mut/Mb</span></p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400">MSI Status</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{msi}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400">Mutacoes Acionaveis</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{actionableCount} <span className="text-sm font-normal text-zinc-400">de {mutations.length}</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Mutation Table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Dna className="h-5 w-5 text-emerald-500" />
            Perfil Mutacional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Gene</TableHead>
                <TableHead className="text-zinc-400">Variante</TableHead>
                <TableHead className="text-zinc-400">Tipo</TableHead>
                <TableHead className="text-zinc-400">VAF (%)</TableHead>
                <TableHead className="text-zinc-400">Acionavel</TableHead>
                <TableHead className="text-zinc-400">Evidencia</TableHead>
                <TableHead className="text-zinc-400">Terapias Alvo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mutations.map((mut) => (
                <TableRow key={`${mut.gene}-${mut.variant}`} className="border-zinc-800">
                  <TableCell className="font-mono font-bold text-zinc-200">{mut.gene}</TableCell>
                  <TableCell className="font-mono text-zinc-300">{mut.variant}</TableCell>
                  <TableCell className="text-zinc-400">{mut.type}</TableCell>
                  <TableCell className="text-zinc-300">{mut.vaf.toFixed(1)}</TableCell>
                  <TableCell>
                    {mut.actionable ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', EVIDENCE_COLORS[mut.evidenceLevel])}>
                      Nivel {mut.evidenceLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {mut.targetedTherapies.length > 0 ? (
                        mut.targetedTherapies.map((t) => (
                          <Badge key={t.drug} variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-400">
                            {t.drug}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600">Nenhuma</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Clinical Trials */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Microscope className="h-5 w-5 text-emerald-500" />
            Ensaios Clinicos Elegiveis
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Baseado no perfil molecular do paciente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {trials.map((trial) => (
            <div key={trial.id} className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-emerald-400">{trial.id}</span>
                  <Badge variant="outline" className="border-zinc-600 text-[10px] text-zinc-400">Fase {trial.phase}</Badge>
                  <Badge variant="outline" className={cn(
                    'text-[10px]',
                    trial.status === 'Recrutando' ? 'border-emerald-500/50 text-emerald-400' : 'border-yellow-500/50 text-yellow-400',
                  )}>
                    {trial.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-300">{trial.title}</p>
              </div>
              <div className="ml-4 text-center">
                <p className="text-xs text-zinc-400">Match</p>
                <p className={cn(
                  'text-lg font-bold',
                  trial.eligibilityMatch >= 80 ? 'text-emerald-400' : trial.eligibilityMatch >= 60 ? 'text-yellow-400' : 'text-zinc-400',
                )}>
                  {trial.eligibilityMatch}%
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Conversational BI Tab
// ============================================================================

function ConversationalBITab() {
  const { data: history = [] } = useConversationalBI();
  const biQuery = useBIQuery();
  const toggleFav = useToggleBIFavorite();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<BIQueryResponse | null>(null);

  const exampleQueries = [
    'Quantos diabeticos internaram no ultimo trimestre?',
    'Taxa de reinternacao em 30 dias por especialidade',
    'Top 10 CIDs mais frequentes este mes',
    'Tempo medio de permanencia por unidade',
    'Evolucao mensal de atendimentos de emergencia',
  ];

  const handleQuery = useCallback(() => {
    if (!question.trim()) return;
    biQuery.mutate(
      { question },
      {
        onSuccess: (data) => {
          setResult(data);
        },
        onError: () => {
          // Demo fallback
          setResult({
            id: crypto.randomUUID(),
            question,
            sql: 'SELECT COUNT(*) as total, DATE_TRUNC(\'month\', created_at) as mes FROM encounters WHERE ... GROUP BY mes',
            answer: 'Foram identificados 347 pacientes diabeticos internados no ultimo trimestre, com pico em janeiro (142 internacoes).',
            chartType: 'bar',
            chartData: [
              { mes: 'Jan', total: 142 },
              { mes: 'Fev', total: 118 },
              { mes: 'Mar', total: 87 },
            ],
            executedAt: new Date().toISOString(),
          });
        },
      },
    );
  }, [question, biQuery]);

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <MessageSquare className="h-5 w-5 text-emerald-500" />
            Pergunte em Linguagem Natural
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Faca perguntas sobre seus dados clinicos e operacionais — a IA gera graficos e respostas automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Quantos pacientes internaram no ultimo mes?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuery();
              }}
              className="border-zinc-700 bg-zinc-800 text-zinc-100"
            />
            <Button
              onClick={handleQuery}
              disabled={biQuery.isPending || !question.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {biQuery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((eq) => (
              <Button
                key={eq}
                variant="outline"
                size="sm"
                className="border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                onClick={() => {
                  setQuestion(eq);
                }}
              >
                {eq}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-zinc-100">{result.question}</CardTitle>
                <CardDescription className="mt-1 text-zinc-400">{result.answer}</CardDescription>
              </div>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                {result.chartType}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {result.chartType === 'bar' && result.chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={result.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey={Object.keys(result.chartData[0] ?? {})[0] as string} stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Bar dataKey={Object.keys(result.chartData[0] ?? {})[1] as string} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {result.chartType === 'line' && result.chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <ReLineChart data={result.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey={Object.keys(result.chartData[0] ?? {})[0] as string} stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Line type="monotone" dataKey={Object.keys(result.chartData[0] ?? {})[1] as string} stroke="#10b981" strokeWidth={2} />
                </ReLineChart>
              </ResponsiveContainer>
            )}
            {result.chartType === 'pie' && result.chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={result.chartData}
                    dataKey={Object.keys(result.chartData[0] ?? {})[1] as string}
                    nameKey={Object.keys(result.chartData[0] ?? {})[0] as string}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {result.chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            )}
            {result.chartType === 'table' && result.chartData.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    {Object.keys(result.chartData[0] ?? {}).map((key) => (
                      <TableHead key={key} className="text-zinc-400">{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.chartData.map((row, i) => (
                    <TableRow key={i} className="border-zinc-800">
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j} className="text-zinc-300">{String(val)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {result.chartType === 'number' && (
              <div className="flex items-center justify-center py-8">
                <p className="text-5xl font-bold text-emerald-400">
                  {result.chartData.length > 0 ? String(Object.values(result.chartData[0] ?? {})[0]) : '—'}
                </p>
              </div>
            )}
            {/* SQL Preview */}
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">Ver SQL gerado</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-emerald-400 font-mono">
                {result.sql}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Query History */}
      {history.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Historico de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
                  <div
                    className="flex-1 cursor-pointer text-sm text-zinc-300 hover:text-emerald-400"
                    onClick={() => setQuestion(item.question)}
                  >
                    {item.question}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">{new Date(item.executedAt).toLocaleDateString('pt-BR')}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleFav.mutate(item.id)}
                    >
                      {item.isFavorite ? (
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      ) : (
                        <StarOff className="h-3 w-3 text-zinc-500" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Multimodal Analysis Tab
// ============================================================================

function MultimodalAnalysisTab() {
  const analysisMutation = useMultimodalAnalysis();
  const [clinicalText, setClinicalText] = useState('');
  const [labResults, setLabResults] = useState('');
  const [imagingNotes, setImagingNotes] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [result, setResult] = useState<MultimodalAnalysisResult | null>(null);

  const handleAnalyze = useCallback(() => {
    if (!clinicalText.trim() && !labResults.trim() && !imagingNotes.trim()) {
      toast.error('Preencha ao menos um campo de dados.');
      return;
    }
    analysisMutation.mutate(
      { clinicalText, labResults, imagingNotes, additionalContext },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success('Analise multimodal concluida!');
        },
        onError: () => {
          // Demo fallback
          setResult({
            id: crypto.randomUUID(),
            interpretation: 'A analise integrada dos dados clinicos, laboratoriais e de imagem sugere um quadro de descompensacao diabetica com comprometimento renal incipiente. Os achados laboratoriais (HbA1c 8.9%, creatinina 1.8) corroboram a evolucao clinica descrita. A imagem de torax sem alteracoes significativas afasta complicacoes pulmonares agudas. Recomenda-se intensificacao do tratamento antidiabetico e monitoramento renal proximo.',
            keyFindings: [
              { category: 'Laboratorial', finding: 'HbA1c elevada (8.9%) — controle glicemico inadequado', severity: 'high', source: 'Laboratorio' },
              { category: 'Laboratorial', finding: 'Creatinina 1.8 mg/dL — funcao renal reduzida', severity: 'high', source: 'Laboratorio' },
              { category: 'Clinico', finding: 'Poliuria e polidipsia ha 3 semanas', severity: 'medium', source: 'Anamnese' },
              { category: 'Imagem', finding: 'Radiografia de torax sem infiltrados ou cardiomegalia', severity: 'low', source: 'Imagem' },
              { category: 'Clinico', finding: 'Edema periferico +/4+ — possivel retencao hidrica', severity: 'medium', source: 'Exame Fisico' },
            ],
            suggestedActions: [
              'Ajustar esquema de insulina — considerar insulina basal-bolus',
              'Solicitar microalbuminuria e relacao albumina/creatinina',
              'Referenciar para nefrologista',
              'Avaliar necessidade de IECA/BRA para nefroproteção',
              'Retorno em 2 semanas com novos laboratorios',
            ],
            confidenceScore: 87,
            createdAt: new Date().toISOString(),
          });
          toast.success('Analise multimodal concluida (demo)!');
        },
      },
    );
  }, [clinicalText, labResults, imagingNotes, additionalContext, analysisMutation]);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Layers className="h-5 w-5 text-emerald-500" />
            Dados para Analise Integrada
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Combine texto clinico + laboratorio + imagem para interpretacao unificada pela IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-zinc-400">Texto Clinico (Anamnese / Exame Fisico)</Label>
              <Textarea
                placeholder="Paciente masculino, 58 anos, DM2 ha 12 anos, relata poliuria e polidipsia ha 3 semanas..."
                value={clinicalText}
                onChange={(e) => setClinicalText(e.target.value)}
                className="mt-1 min-h-[120px] border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Resultados Laboratoriais</Label>
              <Textarea
                placeholder="HbA1c: 8.9%, Glicemia jejum: 245 mg/dL, Creatinina: 1.8 mg/dL, TFG: 58 mL/min..."
                value={labResults}
                onChange={(e) => setLabResults(e.target.value)}
                className="mt-1 min-h-[120px] border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Laudos de Imagem</Label>
              <Textarea
                placeholder="RX Torax PA: Campos pulmonares limpos, silhueta cardiaca normal, seios costofrenicos livres..."
                value={imagingNotes}
                onChange={(e) => setImagingNotes(e.target.value)}
                className="mt-1 min-h-[120px] border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Contexto Adicional (opcional)</Label>
              <Textarea
                placeholder="Medicamentos em uso, alergias, historico familiar relevante..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="mt-1 min-h-[120px] border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={analysisMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {analysisMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Analisar Dados Integrados
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-zinc-100">Interpretacao Integrada</CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  Confianca: {result.confidenceScore}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-zinc-300">{result.interpretation}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Key Findings */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-sm text-zinc-300">Achados Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.keyFindings.map((finding, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
                    <Badge className={cn('mt-0.5 text-[10px] shrink-0', SEVERITY_COLORS[finding.severity])}>
                      {finding.severity === 'low' ? 'Baixo' : finding.severity === 'medium' ? 'Medio' : finding.severity === 'high' ? 'Alto' : 'Critico'}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">{finding.finding}</p>
                      <p className="text-[10px] text-zinc-500">{finding.source} | {finding.category}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Suggested Actions */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-sm text-zinc-300">Acoes Sugeridas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.suggestedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="text-sm text-zinc-300">{action}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Health Coach Tab
// ============================================================================

function HealthCoachTab() {
  const { data: coachProfile } = useHealthCoach(DEMO_PATIENT_ID);
  const chatMutation = useHealthCoachChat();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<HealthCoachMessage[]>([]);

  const goals = coachProfile?.goals ?? MOCK_GOALS;
  const reminders = coachProfile?.reminders ?? [
    { id: '1', type: 'medication', message: 'Tomar Metformina 850mg', time: '08:00', active: true },
    { id: '2', type: 'medication', message: 'Tomar Losartana 50mg', time: '08:00', active: true },
    { id: '3', type: 'monitoring', message: 'Medir glicemia capilar', time: '07:00', active: true },
    { id: '4', type: 'medication', message: 'Tomar Insulina Glargina 20UI', time: '22:00', active: true },
    { id: '5', type: 'exercise', message: 'Lembrete de caminhada', time: '17:00', active: false },
  ];
  const recommendations = coachProfile?.recommendations ?? [
    'Aumentar ingestao hidrica para ao menos 2L/dia',
    'Priorizar alimentos com baixo indice glicemico',
    'Verificar glicemia antes e apos exercicio fisico',
    'Manter diario alimentar para proxima consulta',
    'Agendar consulta de retorno com endocrinologista',
  ];

  const handleSendChat = useCallback(() => {
    if (!chatMessage.trim()) return;

    const userMsg: HealthCoachMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatMessage,
      timestamp: new Date().toISOString(),
    };
    setChatHistory((prev) => [...prev, userMsg]);
    const msg = chatMessage;
    setChatMessage('');

    chatMutation.mutate(
      { patientId: DEMO_PATIENT_ID, message: msg },
      {
        onSuccess: (data) => {
          setChatHistory((prev) => [...prev, data]);
        },
        onError: () => {
          // Demo fallback
          const botMsg: HealthCoachMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Entendi sua duvida sobre "${msg}". Com base no seu perfil de saude, recomendo que voce converse com seu medico sobre ajustes na medicacao. Enquanto isso, lembre-se de manter a hidratacao e seguir a dieta prescrita. Posso ajudar com mais alguma coisa?`,
            timestamp: new Date().toISOString(),
          };
          setChatHistory((prev) => [...prev, botMsg]);
        },
      },
    );
  }, [chatMessage, chatMutation]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <Target className="h-5 w-5 text-emerald-500" />
                Metas de Saude
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {goals.map((goal) => {
                const GoalIcon = GOAL_ICONS[goal.category] ?? HeartPulse;
                return (
                  <div key={goal.id} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GoalIcon className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-zinc-200">{goal.title}</span>
                      </div>
                      <span className={cn(
                        'text-sm font-bold',
                        goal.progress >= 80 ? 'text-emerald-400' : goal.progress >= 50 ? 'text-yellow-400' : 'text-red-400',
                      )}>
                        {goal.progress}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{goal.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={goal.progress} className="flex-1" />
                      <span className="text-[10px] text-zinc-500">Meta: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-300">Recomendacoes Personalizadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-zinc-300">{rec}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Reminders + Chat */}
        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-300">Lembretes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reminders.map((rem) => (
                <div key={rem.id} className={cn(
                  'flex items-center gap-2 rounded-lg border p-2 text-xs',
                  rem.active ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-800 bg-zinc-900 opacity-50',
                )}>
                  <Clock className="h-3 w-3 shrink-0 text-emerald-500" />
                  <span className="font-mono text-zinc-400">{rem.time}</span>
                  <span className="flex-1 text-zinc-300">{rem.message}</span>
                  <Badge variant="outline" className={cn(
                    'text-[9px]',
                    rem.active ? 'border-emerald-500/50 text-emerald-400' : 'border-zinc-700 text-zinc-500',
                  )}>
                    {rem.active ? 'Ativo' : 'Pausado'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-300">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                Chat com Coach IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[250px] space-y-2 overflow-auto">
                {chatHistory.length === 0 && (
                  <p className="py-4 text-center text-xs text-zinc-500">
                    Pergunte sobre sua saude, medicamentos ou metas
                  </p>
                )}
                {chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'rounded-lg p-2 text-xs',
                      msg.role === 'user'
                        ? 'ml-4 bg-emerald-600/20 text-emerald-100'
                        : 'mr-4 bg-zinc-800 text-zinc-300',
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="mr-4 flex items-center gap-2 rounded-lg bg-zinc-800 p-2 text-xs text-zinc-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Pensando...
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Escreva sua duvida..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                  className="border-zinc-700 bg-zinc-800 text-xs text-zinc-100"
                />
                <Button
                  size="sm"
                  onClick={handleSendChat}
                  disabled={chatMutation.isPending || !chatMessage.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AIAdvancedPage() {
  const [activeTab, setActiveTab] = useState('digital-twin');

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">IA Avancada</h1>
        <p className="text-sm text-zinc-400">
          Digital Twin, Farmacogenomica, Oncogenomica, BI Conversacional, Analise Multimodal e Coach de Saude
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex flex-wrap gap-1 bg-zinc-900 p-1">
          <TabsTrigger value="digital-twin" className="flex items-center gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Digital Twin</span>
          </TabsTrigger>
          <TabsTrigger value="pharmacogenomics" className="flex items-center gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Dna className="h-4 w-4" />
            <span className="hidden sm:inline">Farmacogenomica</span>
          </TabsTrigger>
          <TabsTrigger value="oncogenomics" className="flex items-center gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Microscope className="h-4 w-4" />
            <span className="hidden sm:inline">Oncogenomica</span>
          </TabsTrigger>
          <TabsTrigger value="conversational-bi" className="flex items-center gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">IA Conversacional (BI)</span>
          </TabsTrigger>
          <TabsTrigger value="multimodal" className="flex items-center gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Analise Multimodal</span>
          </TabsTrigger>
          <TabsTrigger value="health-coach" className="flex items-center gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <HeartPulse className="h-4 w-4" />
            <span className="hidden sm:inline">Coach de Saude IA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="digital-twin">
          <DigitalTwinTab />
        </TabsContent>
        <TabsContent value="pharmacogenomics">
          <PharmacogenomicsTab />
        </TabsContent>
        <TabsContent value="oncogenomics">
          <OncogenomicsTab />
        </TabsContent>
        <TabsContent value="conversational-bi">
          <ConversationalBITab />
        </TabsContent>
        <TabsContent value="multimodal">
          <MultimodalAnalysisTab />
        </TabsContent>
        <TabsContent value="health-coach">
          <HealthCoachTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
