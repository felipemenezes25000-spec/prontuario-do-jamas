import { useState, useMemo } from 'react';
import { Brain, ClipboardList, Users, AlertTriangle, Plus, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageLoading } from '@/components/common/page-loading';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  usePsychAssessments,
  usePsychSessions,
  useCreatePsychSession,
  useSuicideRiskAssessments,
  useCreateRiskAssessment,
  type ScaleType,
  type RiskLevel,
  type PsychologicalAssessment,
  type PsychSession,
  type SuicideRiskAssessment,
} from '@/services/psychology.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCALE_LABELS: Record<ScaleType, string> = {
  PHQ9: 'PHQ-9 (Depressao)',
  GAD7: 'GAD-7 (Ansiedade)',
  BDI: 'BDI (Inventario Beck — Depressao)',
  BAI: 'BAI (Inventario Beck — Ansiedade)',
  MINI: 'MINI (Entrevista Neuropsiquiatrica)',
  WHOQOL: 'WHOQOL (Qualidade de Vida)',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  CRITICAL: 'Critico',
};

const SESSION_TYPE_LABELS: Record<PsychSession['type'], string> = {
  INDIVIDUAL: 'Individual',
  GROUP: 'Grupo',
  FAMILY: 'Familia',
};

// ─── PHQ-9 Questions ────────────────────────────────────────────────────────

const PHQ9_QUESTIONS = [
  'Pouco interesse ou prazer em fazer as coisas',
  'Se sentir para baixo, deprimido(a) ou sem esperanca',
  'Dificuldade para pegar no sono, permanecer dormindo ou dormir demais',
  'Se sentir cansado(a) ou com pouca energia',
  'Falta de apetite ou comendo demais',
  'Se sentir mal consigo mesmo(a), ou se achar um fracasso, ou ter decepcionado a si ou a sua familia',
  'Dificuldade para se concentrar em coisas como ler jornal ou ver TV',
  'Se mover ou falar tao lentamente que as pessoas percebem, ou ao contrario, ficar inquieto(a) demais',
  'Pensar em se machucar de alguma forma ou que seria melhor estar morto(a)',
];

const PHQ9_OPTIONS = [
  { value: 0, label: 'Nenhuma vez' },
  { value: 1, label: 'Varios dias' },
  { value: 2, label: 'Mais da metade dos dias' },
  { value: 3, label: 'Quase todos os dias' },
];

function phq9Interpretation(score: number): { text: string; color: string; severity: string } {
  if (score <= 4) return { text: 'Depressao minima', color: 'text-emerald-400', severity: 'Minima' };
  if (score <= 9) return { text: 'Depressao leve', color: 'text-blue-400', severity: 'Leve' };
  if (score <= 14) return { text: 'Depressao moderada', color: 'text-yellow-400', severity: 'Moderada' };
  if (score <= 19) return { text: 'Depressao moderadamente grave', color: 'text-orange-400', severity: 'Mod. Grave' };
  return { text: 'Depressao grave', color: 'text-red-400', severity: 'Grave' };
}

// ─── GAD-7 Questions ────────────────────────────────────────────────────────

const GAD7_QUESTIONS = [
  'Sentir-se nervoso(a), ansioso(a) ou no limite',
  'Nao conseguir parar ou controlar as preocupacoes',
  'Preocupar-se demais com diversas coisas',
  'Dificuldade para relaxar',
  'Ficar tao inquieto(a) que e dificil ficar parado(a)',
  'Ficar facilmente irritado(a) ou aborrecido(a)',
  'Sentir medo, como se algo terrivel pudesse acontecer',
];

const GAD7_OPTIONS = [
  { value: 0, label: 'Nenhuma vez' },
  { value: 1, label: 'Varios dias' },
  { value: 2, label: 'Mais da metade dos dias' },
  { value: 3, label: 'Quase todos os dias' },
];

function gad7Interpretation(score: number): { text: string; color: string; severity: string } {
  if (score <= 4) return { text: 'Ansiedade minima', color: 'text-emerald-400', severity: 'Minima' };
  if (score <= 9) return { text: 'Ansiedade leve', color: 'text-blue-400', severity: 'Leve' };
  if (score <= 14) return { text: 'Ansiedade moderada', color: 'text-yellow-400', severity: 'Moderada' };
  return { text: 'Ansiedade grave', color: 'text-red-400', severity: 'Grave' };
}

// ─── Interactive Scale Form ─────────────────────────────────────────────────

function InteractiveScaleForm({ type, onComplete }: {
  type: 'PHQ9' | 'GAD7';
  onComplete: (responses: number[], score: number) => void;
}) {
  const questions = type === 'PHQ9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const options = type === 'PHQ9' ? PHQ9_OPTIONS : GAD7_OPTIONS;
  const interpret = type === 'PHQ9' ? phq9Interpretation : gad7Interpretation;
  const maxScore = type === 'PHQ9' ? 27 : 21;

  const [responses, setResponses] = useState<number[]>(new Array(questions.length).fill(-1));

  const score = useMemo(() => {
    return responses.reduce((sum, r) => sum + (r >= 0 ? r : 0), 0);
  }, [responses]);

  const allAnswered = responses.every((r) => r >= 0);
  const interp = interpret(score);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{type === 'PHQ9' ? 'PHQ-9 — Depressao' : 'GAD-7 — Ansiedade'}</p>
        <p className="text-xs text-zinc-400">Nas ultimas 2 semanas, com que frequencia voce foi incomodado(a) por:</p>
      </div>

      <div className="space-y-2">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-sm mb-2">
              <span className="text-zinc-500 font-mono mr-2">{qi + 1}.</span>
              {q}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const next = [...responses];
                    next[qi] = opt.value;
                    setResponses(next);
                  }}
                  className={cn(
                    'rounded border p-1.5 text-xs transition-colors text-center',
                    responses[qi] === opt.value
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                  )}
                >
                  {opt.label} ({opt.value})
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Score Display */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Pontuacao</p>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-black', interp.color)}>{score}</span>
              <span className="text-sm text-zinc-500">/ {maxScore}</span>
            </div>
            <p className={cn('text-sm mt-1', interp.color)}>{interp.text}</p>
          </div>
          {/* Visual bar */}
          <div className="w-48">
            <div className="h-3 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  score <= maxScore * 0.2 ? 'bg-emerald-500' :
                  score <= maxScore * 0.4 ? 'bg-blue-500' :
                  score <= maxScore * 0.6 ? 'bg-yellow-500' :
                  score <= maxScore * 0.75 ? 'bg-orange-500' : 'bg-red-500',
                )}
                style={{ width: `${(score / maxScore) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>Minima</span>
              <span>Leve</span>
              <span>Moderada</span>
              <span>Grave</span>
            </div>
          </div>
        </div>
        {type === 'PHQ9' && (responses[8] ?? 0) >= 1 && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300">Item 9 positivo — Avaliar risco de suicidio imediatamente (C-SSRS)</p>
          </div>
        )}
        {allAnswered && (
          <Button onClick={() => onComplete(responses, score)} className="mt-3 bg-emerald-600 hover:bg-emerald-700 w-full">
            Concluir e Registrar Avaliacao
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Columbia Suicide Severity Rating Scale ─────────────────────────────────

function CSSRSForm() {
  const [answers, setAnswers] = useState({
    q1_wishDead: false,
    q2_suicidalThoughts: false,
    q3_suicidalThoughtsMethod: false,
    q4_suicidalIntent: false,
    q5_suicidalPlan: false,
    q6_preparatoryActs: false,
  });

  const riskLevel = useMemo((): RiskLevel => {
    if (answers.q5_suicidalPlan || answers.q6_preparatoryActs) return 'CRITICAL';
    if (answers.q4_suicidalIntent) return 'HIGH';
    if (answers.q3_suicidalThoughtsMethod) return 'HIGH';
    if (answers.q2_suicidalThoughts) return 'MODERATE';
    if (answers.q1_wishDead) return 'MODERATE';
    return 'LOW';
  }, [answers]);

  const items = [
    { key: 'q1_wishDead', label: '1. Desejo de estar morto(a)', desc: 'Desejou estar morto(a) ou nao ter nascido?' },
    { key: 'q2_suicidalThoughts', label: '2. Pensamentos suicidas nao especificos', desc: 'Pensou em se matar, mas sem plano especifico?' },
    { key: 'q3_suicidalThoughtsMethod', label: '3. Ideacao suicida com metodo', desc: 'Pensou em suicidio e considerou como faria (metodo)?' },
    { key: 'q4_suicidalIntent', label: '4. Ideacao suicida com intencao', desc: 'Pensou em se matar com alguma intencao de agir?' },
    { key: 'q5_suicidalPlan', label: '5. Ideacao suicida com plano', desc: 'Tem um plano especifico e pensou em detalhes?' },
    { key: 'q6_preparatoryActs', label: '6. Atos preparatorios / tentativa', desc: 'Fez algo para se preparar ou tentou se matar?' },
  ];

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Columbia Suicide Severity Rating Scale (C-SSRS)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-zinc-400">Avaliacao de ideacao e comportamento suicida. Interromper se qualquer item for positivo e avaliar o nivel adequado.</p>
        <div className="space-y-2">
          {items.map(({ key, label, desc }) => {
            const isPositive = answers[key as keyof typeof answers];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAnswers((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                className={cn(
                  'flex items-start gap-3 w-full rounded-lg border p-3 text-left transition-colors',
                  isPositive ? 'border-red-500 bg-red-500/10' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600',
                )}
              >
                <div className={cn(
                  'h-5 w-5 rounded-sm border flex items-center justify-center shrink-0 mt-0.5',
                  isPositive ? 'bg-red-500 border-red-500' : 'border-zinc-600',
                )}>
                  {isPositive && <span className="text-xs text-white font-bold">{'✓'}</span>}
                </div>
                <div>
                  <p className={cn('text-sm font-medium', isPositive && 'text-red-400')}>{label}</p>
                  <p className="text-xs text-zinc-400">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Nivel de Risco</p>
            <Badge variant="outline" className={cn('text-sm mt-1', RISK_COLORS[riskLevel])}>
              {RISK_LABELS[riskLevel]}
            </Badge>
          </div>
          <div className="text-right text-xs space-y-1">
            {riskLevel === 'LOW' && <p className="text-emerald-400">Monitorar em acompanhamento de rotina</p>}
            {riskLevel === 'MODERATE' && <p className="text-yellow-400">Avaliar fatores de risco e protetores. Considerar plano de seguranca.</p>}
            {riskLevel === 'HIGH' && <p className="text-orange-400">Acionar equipe de saude mental. Plano de seguranca obrigatorio.</p>}
            {riskLevel === 'CRITICAL' && <p className="text-red-400">EMERGENCIA — Nao deixar o paciente sozinho. Acionar SAMU/internacao.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Mood Tracking Chart ────────────────────────────────────────────────────

function MoodTrackingChart({ sessions }: { sessions: PsychSession[] }) {
  const data = useMemo(() => {
    return sessions.slice(-20).map((s) => ({
      data: new Date(s.date).toLocaleDateString('pt-BR'),
      sessao: s.sessionNumber,
      antes: s.moodBefore,
      depois: s.moodAfter,
      delta: s.moodAfter - s.moodBefore,
    }));
  }, [sessions]);

  if (data.length < 2) return null;

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Evolucao do Humor ao Longo das Sessoes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="sessao" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Sessao #', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#71717a' }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Humor', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }} />
            <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
            <ReferenceLine y={5} stroke="#71717a" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="antes" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Humor Antes" />
            <Line type="monotone" dataKey="depois" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Humor Depois" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center text-xs">
          <span className="text-amber-400">--- Antes da sessao</span>
          <span className="text-emerald-400">--- Depois da sessao</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Therapy Session Notes Form ─────────────────────────────────────────────

function TherapySessionForm({ onClose }: { onClose: () => void }) {
  const createSession = useCreatePsychSession();
  const [form, setForm] = useState({
    patientId: '', encounterId: '', type: '' as PsychSession['type'],
    topics: '', chiefComplaint: '', sessionNotes: '', techniques: '',
    moodBefore: '', moodAfter: '', nextSessionPlan: '', homework: '', duration: '50',
  });

  const handleSubmit = async () => {
    if (!form.patientId || !form.type || !form.sessionNotes) {
      toast.error('Preencha todos os campos obrigatorios.'); return;
    }
    try {
      await createSession.mutateAsync({
        patientId: form.patientId,
        encounterId: form.encounterId,
        type: form.type,
        topics: form.topics.split(',').map((t) => t.trim()).filter(Boolean),
        notes: `Queixa: ${form.chiefComplaint}\n\nEvolucao: ${form.sessionNotes}\n\nTecnicas: ${form.techniques}\n\nTarefa: ${form.homework}`,
        moodBefore: Number(form.moodBefore),
        moodAfter: Number(form.moodAfter),
        nextSessionPlan: form.nextSessionPlan,
        duration: Number(form.duration),
      });
      toast.success('Sessao registrada com sucesso.');
      onClose();
    } catch {
      toast.error('Erro ao registrar sessao.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">ID do Paciente *</Label><Input placeholder="UUID" value={form.patientId} onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo de Sessao *</Label>
          <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as PsychSession['type'] }))}>
            <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent><SelectItem value="INDIVIDUAL">Individual</SelectItem><SelectItem value="GROUP">Grupo</SelectItem><SelectItem value="FAMILY">Familia</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Duracao (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Topicos Abordados (separados por virgula)</Label>
        <Input placeholder="Ansiedade, Relacoes familiares, Autoestima" value={form.topics} onChange={(e) => setForm((p) => ({ ...p, topics: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Queixa Principal</Label>
        <Textarea placeholder="Queixa do paciente ao iniciar a sessao..." value={form.chiefComplaint} onChange={(e) => setForm((p) => ({ ...p, chiefComplaint: e.target.value }))} className="bg-zinc-950 border-zinc-700 min-h-[60px]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Evolucao da Sessao *</Label>
        <Textarea placeholder="Descreva a evolucao, dinamica e observacoes clinicas..." value={form.sessionNotes} onChange={(e) => setForm((p) => ({ ...p, sessionNotes: e.target.value }))} className="bg-zinc-950 border-zinc-700 min-h-[100px]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tecnicas Utilizadas</Label>
        <Input placeholder="TCC, Mindfulness, Reestruturacao cognitiva..." value={form.techniques} onChange={(e) => setForm((p) => ({ ...p, techniques: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Humor Antes (0-10)</Label>
          <div className="flex gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <button key={i} type="button" onClick={() => setForm((p) => ({ ...p, moodBefore: String(i) }))}
                className={cn('flex-1 rounded border p-1 text-xs', Number(form.moodBefore) === i ? 'bg-amber-600 border-amber-500 text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600')}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Humor Depois (0-10)</Label>
          <div className="flex gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <button key={i} type="button" onClick={() => setForm((p) => ({ ...p, moodAfter: String(i) }))}
                className={cn('flex-1 rounded border p-1 text-xs', Number(form.moodAfter) === i ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600')}>
                {i}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Plano para Proxima Sessao</Label><Input placeholder="Temas, objetivos..." value={form.nextSessionPlan} onChange={(e) => setForm((p) => ({ ...p, nextSessionPlan: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
        <div className="space-y-1"><Label className="text-xs">Tarefa de Casa</Label><Input placeholder="Registro de pensamentos, exercicio de respiracao..." value={form.homework} onChange={(e) => setForm((p) => ({ ...p, homework: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={createSession.isPending} className="bg-emerald-600 hover:bg-emerald-700">
          {createSession.isPending ? 'Salvando...' : 'Registrar Sessao'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PsychologyPage() {
  const [activeTab, setActiveTab] = useState('phq9');
  const [scaleMode, setScaleMode] = useState<'PHQ9' | 'GAD7' | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const [riskOpen, setRiskOpen] = useState(false);
  const [riskForm, setRiskForm] = useState({
    patientId: '', encounterId: '', riskLevel: '' as RiskLevel,
    riskFactors: '', protectiveFactors: '', plan: '', safetyPlan: '',
  });

  const { data: assessmentsData, isLoading: assessmentsLoading } = usePsychAssessments();
  const { data: sessionsData, isLoading: sessionsLoading } = usePsychSessions();
  const { data: riskData, isLoading: riskLoading } = useSuicideRiskAssessments();
  const createRisk = useCreateRiskAssessment();

  const handleScaleComplete = async (_responses: number[], score: number) => {
    if (!scaleMode) return;
    // In a real app, would prompt for patientId first. Simplified here.
    toast.success(`${scaleMode} concluido — Pontuacao: ${score}. Registre vinculando ao paciente.`);
    setScaleMode(null);
  };

  const handleCreateRisk = async () => {
    if (!riskForm.patientId || !riskForm.riskLevel || !riskForm.plan || !riskForm.safetyPlan) {
      toast.error('Preencha todos os campos obrigatorios.'); return;
    }
    try {
      await createRisk.mutateAsync({
        patientId: riskForm.patientId,
        encounterId: riskForm.encounterId,
        riskLevel: riskForm.riskLevel,
        riskFactors: riskForm.riskFactors.split(',').map((r) => r.trim()).filter(Boolean),
        protectiveFactors: riskForm.protectiveFactors.split(',').map((r) => r.trim()).filter(Boolean),
        plan: riskForm.plan,
        safetyPlan: riskForm.safetyPlan,
      });
      toast.success('Avaliacao de risco registrada.');
      setRiskOpen(false);
      setRiskForm({ patientId: '', encounterId: '', riskLevel: '' as RiskLevel, riskFactors: '', protectiveFactors: '', plan: '', safetyPlan: '' });
    } catch {
      toast.error('Erro ao registrar avaliacao de risco.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-violet-400" />
          Psicologia
        </h1>
        <p className="text-muted-foreground">
          PHQ-9, GAD-7, C-SSRS, sessoes terapeuticas estruturadas e acompanhamento de humor
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-violet-400" />
            <div><p className="text-xs text-zinc-400">Avaliacoes</p><p className="text-2xl font-bold">{assessmentsData?.total ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-400" />
            <div><p className="text-xs text-zinc-400">Sessoes</p><p className="text-2xl font-bold">{sessionsData?.total ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div><p className="text-xs text-zinc-400">Risco Alto/Critico</p><p className="text-2xl font-bold text-red-400">{riskData?.data?.filter((r: SuicideRiskAssessment) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <div><p className="text-xs text-zinc-400">Melhora Media Humor</p><p className="text-2xl font-bold text-emerald-400">
              {sessionsData?.data && sessionsData.data.length > 0
                ? `+${(sessionsData.data.reduce((sum: number, s: PsychSession) => sum + (s.moodAfter - s.moodBefore), 0) / sessionsData.data.length).toFixed(1)}`
                : '—'}
            </p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1">
          <TabsTrigger value="phq9" className="text-xs data-[state=active]:bg-violet-700">PHQ-9</TabsTrigger>
          <TabsTrigger value="gad7" className="text-xs data-[state=active]:bg-violet-700">GAD-7</TabsTrigger>
          <TabsTrigger value="cssrs" className="text-xs data-[state=active]:bg-violet-700">C-SSRS</TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs data-[state=active]:bg-violet-700">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Sessoes
          </TabsTrigger>
          <TabsTrigger value="mood" className="text-xs data-[state=active]:bg-violet-700">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Humor
          </TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs data-[state=active]:bg-violet-700">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Historico
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs data-[state=active]:bg-violet-700">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Risco
          </TabsTrigger>
        </TabsList>

        {/* Tab: PHQ-9 */}
        <TabsContent value="phq9" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">PHQ-9 — Rastreamento de Depressao</CardTitle>
            </CardHeader>
            <CardContent>
              <InteractiveScaleForm type="PHQ9" onComplete={handleScaleComplete} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: GAD-7 */}
        <TabsContent value="gad7" className="mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">GAD-7 — Rastreamento de Ansiedade</CardTitle>
            </CardHeader>
            <CardContent>
              <InteractiveScaleForm type="GAD7" onComplete={handleScaleComplete} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: C-SSRS */}
        <TabsContent value="cssrs" className="mt-4">
          <CSSRSForm />
        </TabsContent>

        {/* Tab: Sessions */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{sessionsData?.total ?? 0} sessoes registradas</p>
            <Button onClick={() => setSessionDialogOpen(true)} className="flex items-center gap-2 bg-violet-700 hover:bg-violet-800">
              <Plus className="h-4 w-4" />
              Registrar Sessao
            </Button>
          </div>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-0">
              {sessionsLoading ? <PageLoading /> : sessionsData?.data && sessionsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Paciente</TableHead>
                      <TableHead>Sessao #</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Humor Antes</TableHead>
                      <TableHead>Humor Depois</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Duracao</TableHead>
                      <TableHead>Terapeuta</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsData.data.map((s: PsychSession) => {
                      const delta = s.moodAfter - s.moodBefore;
                      return (
                        <TableRow key={s.id} className="border-zinc-800">
                          <TableCell className="font-medium">{s.patientName}</TableCell>
                          <TableCell>#{s.sessionNumber}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{SESSION_TYPE_LABELS[s.type]}</Badge></TableCell>
                          <TableCell>{s.moodBefore}/10</TableCell>
                          <TableCell>
                            <span className={cn('font-semibold', s.moodAfter > s.moodBefore ? 'text-emerald-400' : s.moodAfter < s.moodBefore ? 'text-red-400' : 'text-zinc-400')}>
                              {s.moodAfter}/10
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={cn('font-mono text-xs', delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-zinc-500')}>
                              {delta > 0 ? '+' : ''}{delta}
                            </span>
                          </TableCell>
                          <TableCell>{s.duration} min</TableCell>
                          <TableCell className="text-sm text-zinc-400">{s.therapist}</TableCell>
                          <TableCell>{new Date(s.date).toLocaleDateString('pt-BR')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma sessao registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Mood */}
        <TabsContent value="mood" className="mt-4">
          {sessionsData?.data && sessionsData.data.length >= 2 ? (
            <MoodTrackingChart sessions={sessionsData.data} />
          ) : (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-10 w-10 text-zinc-500 mx-auto" />
                <p className="text-zinc-400 mt-3">Necessario pelo menos 2 sessoes para exibir o grafico de humor</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Assessment History */}
        <TabsContent value="assessments" className="space-y-4 mt-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader><CardTitle className="text-base">Historico de Avaliacoes Psicometricas</CardTitle></CardHeader>
            <CardContent className="p-0">
              {assessmentsLoading ? <PageLoading /> : assessmentsData?.data && assessmentsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Paciente</TableHead>
                      <TableHead>Escala</TableHead>
                      <TableHead>Pontuacao</TableHead>
                      <TableHead>Interpretacao</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentsData.data.map((a: PsychologicalAssessment) => (
                      <TableRow key={a.id} className="border-zinc-800">
                        <TableCell className="font-medium">{a.patientName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{SCALE_LABELS[a.scaleType] ?? a.scaleType}</Badge></TableCell>
                        <TableCell>
                          <span className="font-semibold">{a.score}</span>
                          <span className="text-muted-foreground text-xs">/{a.maxScore}</span>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm">{a.interpretation}</TableCell>
                        <TableCell className="text-sm text-zinc-400">{a.assessedBy}</TableCell>
                        <TableCell>{new Date(a.assessedAt).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma avaliacao registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Risk */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((r) => (
                <Badge key={r} variant="outline" className={cn('text-xs', RISK_COLORS[r])}>
                  {RISK_LABELS[r]}: {riskData?.data?.filter((a: SuicideRiskAssessment) => a.riskLevel === r).length ?? 0}
                </Badge>
              ))}
            </div>
            <Button onClick={() => setRiskOpen(true)} className="flex items-center gap-2 bg-red-700 hover:bg-red-800">
              <Plus className="h-4 w-4" />
              Nova Avaliacao de Risco
            </Button>
          </div>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader><CardTitle className="text-base">Avaliacoes de Risco de Suicidio</CardTitle></CardHeader>
            <CardContent>
              {riskLoading ? <PageLoading /> : riskData?.data && riskData.data.length > 0 ? (
                <div className="space-y-3">
                  {riskData.data.map((r: SuicideRiskAssessment) => (
                    <div key={r.id} className="rounded-lg border border-zinc-800 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.patientName}</span>
                        <Badge variant="outline" className={cn('text-xs', RISK_COLORS[r.riskLevel])}>
                          Risco {RISK_LABELS[r.riskLevel]}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-zinc-400 mb-1">Fatores de Risco</p>
                          <div className="flex flex-wrap gap-1">
                            {r.riskFactors.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-red-500/30 text-red-400">{f}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-400 mb-1">Fatores Protetores</p>
                          <div className="flex flex-wrap gap-1">
                            {r.protectiveFactors.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{f}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">Avaliado por {r.assessedBy} em {new Date(r.assessedAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma avaliacao de risco registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Session */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Sessao Terapeutica</DialogTitle>
            <DialogDescription>Documente a sessao com campos estruturados.</DialogDescription>
          </DialogHeader>
          <TherapySessionForm onClose={() => setSessionDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog: Risk Assessment */}
      <Dialog open={riskOpen} onOpenChange={setRiskOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Avaliacao de Risco de Suicidio</DialogTitle>
            <DialogDescription>Registre a avaliacao de risco e o plano de seguranca.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>ID do Paciente *</Label><Input placeholder="UUID" value={riskForm.patientId} onChange={(e) => setRiskForm((p) => ({ ...p, patientId: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1">
                <Label>Nivel de Risco *</Label>
                <Select value={riskForm.riskLevel} onValueChange={(v) => setRiskForm((p) => ({ ...p, riskLevel: v as RiskLevel }))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="LOW">Baixo</SelectItem><SelectItem value="MODERATE">Moderado</SelectItem><SelectItem value="HIGH">Alto</SelectItem><SelectItem value="CRITICAL">Critico</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Fatores de Risco (separados por virgula)</Label><Input placeholder="Ideacao ativa, Plano, Tentativa previa" value={riskForm.riskFactors} onChange={(e) => setRiskForm((p) => ({ ...p, riskFactors: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
            <div className="space-y-1"><Label>Fatores Protetores (separados por virgula)</Label><Input placeholder="Suporte familiar, Religiosidade" value={riskForm.protectiveFactors} onChange={(e) => setRiskForm((p) => ({ ...p, protectiveFactors: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
            <div className="space-y-1"><Label>Plano de Intervencao *</Label><Textarea placeholder="Descreva o plano de manejo" value={riskForm.plan} onChange={(e) => setRiskForm((p) => ({ ...p, plan: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
            <div className="space-y-1"><Label>Plano de Seguranca *</Label><Textarea placeholder="Contatos de crise, remocao de meios, rede de apoio..." value={riskForm.safetyPlan} onChange={(e) => setRiskForm((p) => ({ ...p, safetyPlan: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleCreateRisk} disabled={createRisk.isPending} className="bg-red-700 hover:bg-red-800">
              {createRisk.isPending ? 'Salvando...' : 'Registrar Avaliacao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
