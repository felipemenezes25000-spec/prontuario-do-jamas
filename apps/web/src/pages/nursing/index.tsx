import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Mic,
  CheckCircle2,
  Pill,
  Activity,
  BedDouble,
  XCircle,
  CalendarClock,
  AlertTriangle,
  Shield,
  Droplets,
  Camera,
  RotateCcw,
  Users,
  Heart,
  Smile,
  Frown,
  ClipboardCheck,
  Eye,
  Plus,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, getInitials, calculateAge } from '@/lib/utils';
import { useBeds } from '@/services/admissions.service';
import {
  useMedicationChecks,
  useAdministerMedication,
  useSkipMedication,
} from '@/services/nursing.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type { MedicationCheck } from '@/types';

// ============================================================================
// Morse Fall Scale Calculator
// ============================================================================

const MORSE_ITEMS = [
  {
    key: 'fallHistory',
    label: 'Historia de queda (nos ultimos 3 meses)',
    options: [{ v: 0, l: 'Nao' }, { v: 25, l: 'Sim' }],
  },
  {
    key: 'secondaryDiagnosis',
    label: 'Diagnostico secundario',
    options: [{ v: 0, l: 'Nao' }, { v: 15, l: 'Sim' }],
  },
  {
    key: 'ambulatoryAid',
    label: 'Auxilio para deambulacao',
    options: [
      { v: 0, l: 'Nenhum / Acamado / Cadeira de rodas' },
      { v: 15, l: 'Muletas / Bengala / Andador' },
      { v: 30, l: 'Apoio nos moveis' },
    ],
  },
  {
    key: 'ivAccess',
    label: 'Terapia IV / Heparina Lock',
    options: [{ v: 0, l: 'Nao' }, { v: 20, l: 'Sim' }],
  },
  {
    key: 'gait',
    label: 'Marcha',
    options: [
      { v: 0, l: 'Normal / Acamado / Cadeira' },
      { v: 10, l: 'Fraca' },
      { v: 20, l: 'Comprometida' },
    ],
  },
  {
    key: 'mentalStatus',
    label: 'Estado mental',
    options: [
      { v: 0, l: 'Orientado / Capaz' },
      { v: 15, l: 'Superestima capacidades' },
    ],
  },
];

function MorseFallScale() {
  const [scores, setScores] = useState<Record<string, number>>({
    fallHistory: 0, secondaryDiagnosis: 0, ambulatoryAid: 0, ivAccess: 0, gait: 0, mentalStatus: 0,
  });

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);
  const risk = total >= 45 ? 'ALTO' : total >= 25 ? 'MODERADO' : 'BAIXO';
  const riskColor = total >= 45 ? 'text-red-400' : total >= 25 ? 'text-yellow-400' : 'text-emerald-400';
  const riskBg = total >= 45 ? 'bg-red-500/20 border-red-500/50' : total >= 25 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-emerald-500/20 border-emerald-500/50';

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          Escala de Morse — Risco de Queda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {MORSE_ITEMS.map(({ key, label, options }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-zinc-400">{label}</Label>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => (
                <button
                  key={opt.v + opt.l}
                  type="button"
                  onClick={() => setScores((p) => ({ ...p, [key]: opt.v }))}
                  className={cn(
                    'rounded border px-2.5 py-1.5 text-xs transition-colors',
                    scores[key] === opt.v
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                  )}
                >
                  {opt.l} ({opt.v})
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={cn('rounded-lg border p-4 mt-4', riskBg)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Score Total</p>
              <p className={cn('text-4xl font-black', riskColor)}>{total}</p>
            </div>
            <div className="text-right">
              <Badge className={cn('text-sm', riskBg, riskColor)}>{risk}</Badge>
              <p className="text-xs text-zinc-400 mt-1">
                {risk === 'ALTO' ? 'Implementar protocolo de prevencao de quedas' : risk === 'MODERADO' ? 'Orientacoes e sinalizacao no leito' : 'Cuidados padrao'}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={Math.min((total / 125) * 100, 100)} className="h-2" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-zinc-500">0</span>
              <span className="text-[10px] text-yellow-400">25</span>
              <span className="text-[10px] text-red-400">45</span>
              <span className="text-[10px] text-zinc-500">125</span>
            </div>
          </div>
        </div>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={() => toast.success(`Morse registrado: ${total} pontos (${risk})`)}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Registrar Avaliacao
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Braden Scale Calculator
// ============================================================================

const BRADEN_ITEMS = [
  {
    key: 'sensory',
    label: 'Percepcao Sensorial',
    options: [
      { v: 1, l: 'Totalmente limitado' }, { v: 2, l: 'Muito limitado' },
      { v: 3, l: 'Levemente limitado' }, { v: 4, l: 'Nenhuma limitacao' },
    ],
  },
  {
    key: 'moisture',
    label: 'Umidade',
    options: [
      { v: 1, l: 'Constantemente umida' }, { v: 2, l: 'Muito umida' },
      { v: 3, l: 'Ocasionalmente umida' }, { v: 4, l: 'Raramente umida' },
    ],
  },
  {
    key: 'activity',
    label: 'Atividade',
    options: [
      { v: 1, l: 'Acamado' }, { v: 2, l: 'Confinado a cadeira' },
      { v: 3, l: 'Anda ocasionalmente' }, { v: 4, l: 'Anda frequentemente' },
    ],
  },
  {
    key: 'mobility',
    label: 'Mobilidade',
    options: [
      { v: 1, l: 'Totalmente imobilizado' }, { v: 2, l: 'Muito limitado' },
      { v: 3, l: 'Levemente limitado' }, { v: 4, l: 'Sem limitacao' },
    ],
  },
  {
    key: 'nutrition',
    label: 'Nutricao',
    options: [
      { v: 1, l: 'Muito pobre' }, { v: 2, l: 'Provavelmente inadequada' },
      { v: 3, l: 'Adequada' }, { v: 4, l: 'Excelente' },
    ],
  },
  {
    key: 'friction',
    label: 'Friccao e Cisalhamento',
    options: [
      { v: 1, l: 'Problema' }, { v: 2, l: 'Problema potencial' },
      { v: 3, l: 'Sem problema aparente' },
    ],
  },
];

function BradenScale() {
  const [scores, setScores] = useState<Record<string, number>>({
    sensory: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction: 3,
  });

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);
  const risk = total <= 9 ? 'MUITO ALTO' : total <= 12 ? 'ALTO' : total <= 14 ? 'MODERADO' : total <= 18 ? 'BAIXO' : 'SEM RISCO';
  const riskColor = total <= 9 ? 'text-red-400' : total <= 12 ? 'text-orange-400' : total <= 14 ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-400" />
          Escala de Braden — Risco de Lesao por Pressao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {BRADEN_ITEMS.map(({ key, label, options }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-zinc-400">{label}</Label>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setScores((p) => ({ ...p, [key]: opt.v }))}
                  className={cn(
                    'rounded border px-2 py-1.5 text-xs transition-colors flex-1 min-w-[120px]',
                    scores[key] === opt.v
                      ? opt.v <= 2 ? 'bg-red-600 border-red-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                  )}
                >
                  {opt.l} ({opt.v})
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={cn('rounded-lg border p-4 mt-4', total <= 12 ? 'bg-red-500/10 border-red-500/50' : total <= 14 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-emerald-500/10 border-emerald-500/50')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Score Total (menor = maior risco)</p>
              <p className={cn('text-4xl font-black', riskColor)}>{total}</p>
            </div>
            <div className="text-right">
              <Badge className={cn('text-sm border', total <= 12 ? 'bg-red-500/20 text-red-400 border-red-500/50' : total <= 14 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50')}>
                {risk}
              </Badge>
              <p className="text-xs text-zinc-400 mt-1">Escala: 6-23 pontos</p>
            </div>
          </div>
        </div>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={() => toast.success(`Braden registrado: ${total} pontos (${risk})`)}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Registrar Avaliacao
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Pain Assessment (EVA + FLACC + BPS)
// ============================================================================

function PainAssessment() {
  const [evaScore, setEvaScore] = useState(0);
  const [scaleType, setScaleType] = useState<'EVA' | 'FLACC' | 'BPS'>('EVA');
  const [flacc, setFlacc] = useState({ face: 0, legs: 0, activity: 0, cry: 0, consolability: 0 });
  const [bps, setBps] = useState({ facialExpression: 1, upperLimbs: 1, compliance: 1 });

  const flaccTotal = useMemo(() => Object.values(flacc).reduce((a, b) => a + b, 0), [flacc]);
  const bpsTotal = useMemo(() => Object.values(bps).reduce((a, b) => a + b, 0), [bps]);

  const evaColor = evaScore <= 3 ? 'text-emerald-400' : evaScore <= 6 ? 'text-yellow-400' : 'text-red-400';
  const evaLabel = evaScore === 0 ? 'Sem dor' : evaScore <= 3 ? 'Dor leve' : evaScore <= 6 ? 'Dor moderada' : 'Dor intensa';

  const FLACC_ITEMS = [
    { key: 'face', label: 'Face', opts: [{ v: 0, l: 'Sem expressao / Sorriso' }, { v: 1, l: 'Careta ocasional' }, { v: 2, l: 'Tremor frequente do queixo' }] },
    { key: 'legs', label: 'Pernas', opts: [{ v: 0, l: 'Posicao normal / Relaxadas' }, { v: 1, l: 'Inquietas / Tensas' }, { v: 2, l: 'Chutando / Esticadas' }] },
    { key: 'activity', label: 'Atividade', opts: [{ v: 0, l: 'Quieto / Posicao normal' }, { v: 1, l: 'Contorcendo-se' }, { v: 2, l: 'Arqueado / Rigido' }] },
    { key: 'cry', label: 'Choro', opts: [{ v: 0, l: 'Sem choro' }, { v: 1, l: 'Gemidos / Choramingo' }, { v: 2, l: 'Choro constante / Grito' }] },
    { key: 'consolability', label: 'Consolabilidade', opts: [{ v: 0, l: 'Contente / Relaxado' }, { v: 1, l: 'Distraivel' }, { v: 2, l: 'Dificil de consolar' }] },
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-400" />
          Avaliacao da Dor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {(['EVA', 'FLACC', 'BPS'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={scaleType === s ? 'default' : 'outline'}
              className={scaleType === s ? 'bg-emerald-600' : 'border-zinc-700'}
              onClick={() => setScaleType(s)}
            >
              {s === 'EVA' ? 'EVA (Adulto)' : s === 'FLACC' ? 'FLACC (Pediatrico)' : 'BPS (UTI Intubado)'}
            </Button>
          ))}
        </div>

        {scaleType === 'EVA' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Smile className="h-6 w-6 text-emerald-400" />
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={evaScore}
                  onChange={(e) => setEvaScore(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between mt-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <span key={n} className={cn('text-[10px]', n === evaScore ? evaColor + ' font-bold' : 'text-zinc-500')}>{n}</span>
                  ))}
                </div>
              </div>
              <Frown className="h-6 w-6 text-red-400" />
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[
                { face: '😊', label: 'Sem dor', range: '0' },
                { face: '🙂', label: 'Leve', range: '1-3' },
                { face: '😐', label: 'Moderada', range: '4-5' },
                { face: '😣', label: 'Intensa', range: '6-7' },
                { face: '😫', label: 'Insuportavel', range: '8-10' },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <span className="text-2xl">{item.face}</span>
                  <p className="text-[10px] text-zinc-400">{item.label}</p>
                  <p className="text-[9px] text-zinc-500">{item.range}</p>
                </div>
              ))}
            </div>
            <div className={cn('rounded-lg border p-3 text-center', evaScore <= 3 ? 'bg-emerald-500/10 border-emerald-500/50' : evaScore <= 6 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-red-500/10 border-red-500/50')}>
              <p className={cn('text-3xl font-black', evaColor)}>{evaScore}</p>
              <p className="text-xs text-zinc-400">{evaLabel}</p>
            </div>
          </div>
        )}

        {scaleType === 'FLACC' && (
          <div className="space-y-3">
            {FLACC_ITEMS.map(({ key, label, opts }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-zinc-400">{label}</Label>
                <div className="flex flex-wrap gap-1">
                  {opts.map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setFlacc((p) => ({ ...p, [key]: opt.v }))}
                      className={cn(
                        'rounded border px-2 py-1 text-[11px] transition-colors flex-1 min-w-[100px]',
                        flacc[key as keyof typeof flacc] === opt.v
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                      )}
                    >
                      {opt.l} ({opt.v})
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className={cn('rounded-lg border p-3 text-center', flaccTotal <= 3 ? 'bg-emerald-500/10 border-emerald-500/50' : flaccTotal <= 6 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-red-500/10 border-red-500/50')}>
              <p className={cn('text-3xl font-black', flaccTotal <= 3 ? 'text-emerald-400' : flaccTotal <= 6 ? 'text-yellow-400' : 'text-red-400')}>{flaccTotal}</p>
              <p className="text-xs text-zinc-400">{flaccTotal <= 3 ? 'Dor leve ou ausente' : flaccTotal <= 6 ? 'Dor moderada' : 'Dor intensa'}</p>
            </div>
          </div>
        )}

        {scaleType === 'BPS' && (
          <div className="space-y-3">
            {[
              { key: 'facialExpression', label: 'Expressao facial', opts: [{ v: 1, l: 'Relaxada' }, { v: 2, l: 'Parcialmente tensa' }, { v: 3, l: 'Totalmente tensa' }, { v: 4, l: 'Careta' }] },
              { key: 'upperLimbs', label: 'Membros superiores', opts: [{ v: 1, l: 'Sem movimento' }, { v: 2, l: 'Parcialmente flexionados' }, { v: 3, l: 'Totalmente flexionados' }, { v: 4, l: 'Permanentemente retraidos' }] },
              { key: 'compliance', label: 'Adaptacao ao ventilador', opts: [{ v: 1, l: 'Tolerando' }, { v: 2, l: 'Tossindo' }, { v: 3, l: 'Lutando contra' }, { v: 4, l: 'Incapaz de controlar' }] },
            ].map(({ key, label, opts }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-zinc-400">{label}</Label>
                <div className="flex flex-wrap gap-1">
                  {opts.map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setBps((p) => ({ ...p, [key]: opt.v }))}
                      className={cn(
                        'rounded border px-2 py-1 text-[11px] transition-colors flex-1 min-w-[100px]',
                        bps[key as keyof typeof bps] === opt.v
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                      )}
                    >
                      {opt.l} ({opt.v})
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className={cn('rounded-lg border p-3 text-center', bpsTotal <= 5 ? 'bg-emerald-500/10 border-emerald-500/50' : bpsTotal <= 8 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-red-500/10 border-red-500/50')}>
              <p className={cn('text-3xl font-black', bpsTotal <= 5 ? 'text-emerald-400' : bpsTotal <= 8 ? 'text-yellow-400' : 'text-red-400')}>{bpsTotal}</p>
              <p className="text-xs text-zinc-400">BPS: {bpsTotal <= 5 ? 'Sem dor / dor leve' : bpsTotal <= 8 ? 'Dor moderada' : 'Dor intensa'} (3-12)</p>
            </div>
          </div>
        )}

        <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={() => toast.success('Avaliacao de dor registrada')}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Registrar Dor
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Wound Assessment with Photo Grid
// ============================================================================

const MOCK_WOUNDS = [
  { id: 'w1', location: 'Sacral', stage: 'Estagio II', size: '4x3 cm', depth: '0.5 cm', exudate: 'Moderado seroso', edges: 'Definidas', bed: 'Granulacao 70%', lastPhoto: '2026-03-25', dressing: 'Hidrogel + Espuma', nextChange: '2026-03-28', color: 'text-yellow-400' },
  { id: 'w2', location: 'Calcanhar D', stage: 'Estagio I', size: '2x2 cm', depth: 'Superficial', exudate: 'Nenhum', edges: 'Definidas', bed: 'Hiperemia nao branqueavel', lastPhoto: '2026-03-26', dressing: 'Filme transparente', nextChange: '2026-03-29', color: 'text-emerald-400' },
  { id: 'w3', location: 'Trocanter E', stage: 'Estagio III', size: '6x5 cm', depth: '2 cm', exudate: 'Abundante purulento', edges: 'Maceradas', bed: 'Esfacelo 40%', lastPhoto: '2026-03-24', dressing: 'Alginato + Espuma', nextChange: '2026-03-27', color: 'text-red-400' },
];

function WoundAssessment() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-400" />
            Avaliacao de Feridas
          </CardTitle>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" /> Nova Ferida
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {MOCK_WOUNDS.map((wound) => (
          <div key={wound.id} className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">{wound.location}</p>
                  <Badge className={cn('text-[10px] border', wound.stage.includes('III') ? 'bg-red-500/20 text-red-400 border-red-500/50' : wound.stage.includes('II') ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50')}>
                    {wound.stage}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs">
                  <span className="text-zinc-400">Tamanho: <span className="text-zinc-200">{wound.size}</span></span>
                  <span className="text-zinc-400">Profundidade: <span className="text-zinc-200">{wound.depth}</span></span>
                  <span className="text-zinc-400">Exsudato: <span className="text-zinc-200">{wound.exudate}</span></span>
                  <span className="text-zinc-400">Bordas: <span className="text-zinc-200">{wound.edges}</span></span>
                  <span className="text-zinc-400">Leito: <span className="text-zinc-200">{wound.bed}</span></span>
                  <span className="text-zinc-400">Cobertura: <span className="text-zinc-200">{wound.dressing}</span></span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Proxima troca: {wound.nextChange}</p>
              </div>
              <button className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-zinc-900 hover:border-zinc-500 transition-colors">
                <div className="text-center">
                  <Camera className="h-5 w-5 text-zinc-500 mx-auto" />
                  <p className="text-[9px] text-zinc-500 mt-0.5">Foto</p>
                </div>
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Elimination Tracking
// ============================================================================

const MOCK_ELIMINATIONS = [
  { id: 'e1', time: '06:00', type: 'Diurese', volume: '350 mL', characteristics: 'Amarelo claro', catheter: 'SVD', patient: 'Maria Silva' },
  { id: 'e2', time: '08:30', type: 'Evacuacao', volume: '-', characteristics: 'Pastosa, Bristol 4', catheter: 'N/A', patient: 'Maria Silva' },
  { id: 'e3', time: '10:00', type: 'Diurese', volume: '200 mL', characteristics: 'Amarelo escuro', catheter: 'SVD', patient: 'Joao Santos' },
  { id: 'e4', time: '12:00', type: 'Vomito', volume: '100 mL', characteristics: 'Alimentar', catheter: 'N/A', patient: 'Ana Costa' },
  { id: 'e5', time: '14:00', type: 'Drenagem', volume: '50 mL', characteristics: 'Serohematico', catheter: 'Dreno JP', patient: 'Joao Santos' },
];

function EliminationTracking() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-400" />
            Controle de Eliminacoes
          </CardTitle>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" /> Registrar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-center">
            <p className="text-xs text-zinc-400">Balanco Hidrico</p>
            <p className="text-2xl font-bold text-blue-400">+450 mL</p>
            <p className="text-[10px] text-zinc-500">Entrada: 1200 | Saida: 750</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-center">
            <p className="text-xs text-zinc-400">Diurese 24h</p>
            <p className="text-2xl font-bold text-emerald-400">1.2 mL/kg/h</p>
            <p className="text-[10px] text-zinc-500">Total: 1450 mL</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-center">
            <p className="text-xs text-zinc-400">Ultima Evacuacao</p>
            <p className="text-2xl font-bold text-yellow-400">18h</p>
            <p className="text-[10px] text-zinc-500">Bristol 4</p>
          </div>
        </div>
        <div className="space-y-2">
          {MOCK_ELIMINATIONS.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded border border-zinc-700 bg-zinc-800 p-2">
              <div className="text-center min-w-[50px]">
                <p className="text-sm font-bold text-white">{e.time}</p>
              </div>
              <div className="h-6 w-px bg-zinc-700" />
              <Badge className={cn('text-[10px] border min-w-[70px] justify-center',
                e.type === 'Diurese' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                e.type === 'Evacuacao' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                e.type === 'Vomito' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                'bg-purple-500/20 text-purple-400 border-purple-500/50'
              )}>{e.type}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300">{e.characteristics}</p>
                <p className="text-[10px] text-zinc-500">{e.patient} {e.volume !== '-' && `| ${e.volume}`} {e.catheter !== 'N/A' && `| ${e.catheter}`}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Repositioning Schedule with Timer
// ============================================================================

const MOCK_REPOSITION_PATIENTS = [
  { id: 'rp1', name: 'Maria Silva', bed: '201-A', lastPosition: 'DLE', lastTime: new Date(Date.now() - 100 * 60000).toISOString(), interval: 120, braden: 12 },
  { id: 'rp2', name: 'Joao Santos', bed: '202-B', lastPosition: 'DD', lastTime: new Date(Date.now() - 90 * 60000).toISOString(), interval: 120, braden: 14 },
  { id: 'rp3', name: 'Ana Costa', bed: '203-A', lastPosition: 'DLD', lastTime: new Date(Date.now() - 140 * 60000).toISOString(), interval: 120, braden: 9 },
  { id: 'rp4', name: 'Pedro Oliveira', bed: '204-B', lastPosition: 'Fowler 30', lastTime: new Date(Date.now() - 30 * 60000).toISOString(), interval: 120, braden: 16 },
];

const POSITIONS = ['DD', 'DLE', 'DLD', 'Fowler 30', 'Fowler 45', 'Semi-Fowler'];

function RepositioningSchedule() {
  const [patients, setPatients] = useState(MOCK_REPOSITION_PATIENTS);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleReposition = (id: string, newPosition: string) => {
    setPatients((prev) => prev.map((p) => p.id === id ? { ...p, lastPosition: newPosition, lastTime: new Date().toISOString() } : p));
    toast.success('Mudanca de decubito registrada');
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-cyan-400" />
          Mudanca de Decubito — Reposicionamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {patients.map((patient) => {
          const elapsed = Math.floor((Date.now() - new Date(patient.lastTime).getTime()) / 60000);
          const remaining = patient.interval - elapsed;
          const isOverdue = remaining <= 0;
          const percent = Math.min((elapsed / patient.interval) * 100, 100);

          return (
            <div key={patient.id} className={cn('rounded-lg border p-3', isOverdue ? 'border-red-500/50 bg-red-500/10 animate-pulse' : remaining < 30 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-zinc-700 bg-zinc-800')}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-white">{patient.name}</p>
                  <p className="text-[10px] text-zinc-400">Leito {patient.bed} | Braden: {patient.braden} | Posicao atual: {patient.lastPosition}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-lg font-bold tabular-nums', isOverdue ? 'text-red-400' : remaining < 30 ? 'text-yellow-400' : 'text-emerald-400')}>
                    {isOverdue ? `+${Math.abs(remaining)}min` : `${remaining}min`}
                  </p>
                  <p className="text-[10px] text-zinc-500">{isOverdue ? 'ATRASADO' : 'restante'}</p>
                </div>
              </div>
              <Progress value={percent} className="h-1.5 mb-2" />
              <div className="flex gap-1 flex-wrap">
                {POSITIONS.filter((p) => p !== patient.lastPosition).map((pos) => (
                  <Button key={pos} size="sm" variant="outline" className="h-6 text-[10px] border-zinc-600 px-2" onClick={() => handleReposition(patient.id, pos)}>
                    {pos}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Fugulin Patient Classification
// ============================================================================

const FUGULIN_ITEMS = [
  { key: 'mentalState', label: 'Estado Mental', opts: [{ v: 1, l: 'Orientado' }, { v: 2, l: 'Periodos de desorientacao' }, { v: 3, l: 'Desorientacao continua' }, { v: 4, l: 'Inconsciente' }] },
  { key: 'oxygenation', label: 'Oxigenacao', opts: [{ v: 1, l: 'Ar ambiente' }, { v: 2, l: 'O2 por cateter/mascara' }, { v: 3, l: 'Mascara c/ reservatorio' }, { v: 4, l: 'VM / TOT' }] },
  { key: 'vitals', label: 'Sinais Vitais', opts: [{ v: 1, l: 'Estaveis' }, { v: 2, l: 'Controle 6/6h' }, { v: 3, l: 'Controle 4/4h' }, { v: 4, l: 'Controle 2/2h ou menos' }] },
  { key: 'mobility', label: 'Motilidade', opts: [{ v: 1, l: 'Deambula' }, { v: 2, l: 'Auxilio parcial' }, { v: 3, l: 'Cadeira de rodas' }, { v: 4, l: 'Acamado' }] },
  { key: 'ambulation', label: 'Deambulacao', opts: [{ v: 1, l: 'Independente' }, { v: 2, l: 'Auxilio parcial' }, { v: 3, l: 'Auxilio total' }, { v: 4, l: 'Incapaz' }] },
  { key: 'feeding', label: 'Alimentacao', opts: [{ v: 1, l: 'Auto-suficiente' }, { v: 2, l: 'Auxilio parcial' }, { v: 3, l: 'Auxilio total / SNG' }, { v: 4, l: 'NPT / Jejum' }] },
  { key: 'bodycare', label: 'Cuidado corporal', opts: [{ v: 1, l: 'Auto-suficiente' }, { v: 2, l: 'Auxilio parcial' }, { v: 3, l: 'Auxilio total' }, { v: 4, l: 'Banho no leito' }] },
  { key: 'elimination', label: 'Eliminacao', opts: [{ v: 1, l: 'Independente' }, { v: 2, l: 'Uso de comadre/urinol' }, { v: 3, l: 'SVD / Colostomia' }, { v: 4, l: 'Incontrol. / Irrigacao' }] },
  { key: 'therapy', label: 'Terapeutica', opts: [{ v: 1, l: 'VO simples' }, { v: 2, l: 'EV intermitente' }, { v: 3, l: 'EV continua / PCA' }, { v: 4, l: 'Vasoativos / DVA' }] },
];

function FugulinClassification() {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(FUGULIN_ITEMS.map((i) => [i.key, 1])),
  );

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);

  const classification = total >= 31 ? 'Intensiva' : total >= 27 ? 'Semi-intensiva' : total >= 22 ? 'Alta Dependencia' : total >= 17 ? 'Intermediaria' : 'Minima';
  const classColor = total >= 31 ? 'text-red-400' : total >= 27 ? 'text-orange-400' : total >= 22 ? 'text-yellow-400' : total >= 17 ? 'text-blue-400' : 'text-emerald-400';
  const hoursPerPatient = total >= 31 ? '17.9h' : total >= 27 ? '12.5h' : total >= 22 ? '9.4h' : total >= 17 ? '5.6h' : '3.8h';

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-400" />
          Classificacao de Pacientes — Fugulin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {FUGULIN_ITEMS.map(({ key, label, opts }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-zinc-400">{label}</Label>
            <div className="flex flex-wrap gap-1">
              {opts.map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setScores((p) => ({ ...p, [key]: opt.v }))}
                  className={cn(
                    'rounded border px-2 py-1 text-[11px] transition-colors flex-1 min-w-[90px]',
                    scores[key] === opt.v
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                  )}
                >
                  {opt.l} ({opt.v})
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={cn('rounded-lg border p-4 mt-4', total >= 31 ? 'bg-red-500/10 border-red-500/50' : total >= 22 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-emerald-500/10 border-emerald-500/50')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Score Total</p>
              <p className={cn('text-4xl font-black', classColor)}>{total}</p>
            </div>
            <div className="text-right">
              <Badge className={cn('text-sm border', classColor)}>{classification}</Badge>
              <p className="text-xs text-zinc-400 mt-1">Horas de enfermagem: {hoursPerPatient}</p>
            </div>
          </div>
        </div>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={() => toast.success(`Fugulin registrado: ${total} — ${classification}`)}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Registrar Classificacao
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Device / Bundle Tracking
// ============================================================================

const MOCK_DEVICES = [
  { id: 'd1', patient: 'Maria Silva', bed: '201-A', device: 'CVC Subclavia D', insertDate: '2026-03-20', days: 7, bundleCompliance: 85, bundleItems: { curativo: true, necessidade: true, higieneMaos: true, barreiraPrecaucao: true, sitioInsercao: false } },
  { id: 'd2', patient: 'Joao Santos', bed: '202-B', device: 'SVD', insertDate: '2026-03-22', days: 5, bundleCompliance: 100, bundleItems: { necessidade: true, fixacao: true, bolsaAbaixoVesica: true, higiene: true, sistemaFechado: true } },
  { id: 'd3', patient: 'Ana Costa', bed: '203-A', device: 'TOT 7.5', insertDate: '2026-03-24', days: 3, bundleCompliance: 80, bundleItems: { cabeceira30: true, pausaSedacao: true, higieneBucal: true, profilaxiaTVP: false, profilaxiaUlcera: true } },
];

function DeviceBundleTracking() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-400" />
          Dispositivos e Bundles de Prevencao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {MOCK_DEVICES.map((device) => (
          <div key={device.id} className={cn('rounded-lg border p-3', device.days >= 7 ? 'border-red-500/50 bg-red-500/5' : device.days >= 5 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-zinc-700 bg-zinc-800')}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-white">{device.device}</p>
                <p className="text-[10px] text-zinc-400">{device.patient} | Leito {device.bed} | Inserido: {device.insertDate}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-xl font-bold', device.days >= 7 ? 'text-red-400' : device.days >= 5 ? 'text-yellow-400' : 'text-emerald-400')}>
                  D{device.days}
                </p>
                <p className="text-[10px] text-zinc-500">dias</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] text-zinc-400">Bundle:</p>
              <Progress value={device.bundleCompliance} className="h-1.5 flex-1" />
              <span className={cn('text-xs font-bold', device.bundleCompliance === 100 ? 'text-emerald-400' : 'text-yellow-400')}>{device.bundleCompliance}%</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(device.bundleItems).map(([key, done]) => (
                <Badge key={key} className={cn('text-[9px] border', done ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50')}>
                  {done ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                  {key}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component — Medication Check Section (preserved from original)
// ============================================================================

function MedicationCheckSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<MedicationCheck | null>(null);
  const [dialogMode, setDialogMode] = useState<'administer' | 'skip'>('administer');
  const [lot, setLot] = useState('');
  const [observations, setObservations] = useState('');
  const [skipReason, setSkipReason] = useState('');

  const { data: allMedicationChecks = [] } = useMedicationChecks({ status: 'SCHEDULED' });
  const administerMutation = useAdministerMedication();
  const skipMutation = useSkipMedication();

  const pendingChecks = useMemo(() =>
    allMedicationChecks
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [allMedicationChecks],
  );

  const handleOpenAdminister = useCallback((check: MedicationCheck) => {
    setSelectedCheck(check);
    setLot('');
    setObservations('');
    setSkipReason('');
    setDialogMode('administer');
    setDialogOpen(true);
  }, []);

  const handleAdminister = useCallback(async () => {
    if (!selectedCheck) return;
    const isControlled = selectedCheck.prescriptionItem?.isControlled;
    if (isControlled && !lot.trim()) {
      toast.error('Lote obrigatorio para medicamentos controlados');
      return;
    }
    try {
      await administerMutation.mutateAsync({
        prescriptionItemId: selectedCheck.prescriptionItemId,
        encounterId: '',
        scheduledAt: selectedCheck.scheduledAt,
        lot: lot.trim() || undefined,
        observations: observations.trim() || undefined,
      });
      toast.success('Medicamento administrado com sucesso');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao registrar administracao');
    }
  }, [selectedCheck, lot, observations, administerMutation]);

  const handleSkip = useCallback(async () => {
    if (!selectedCheck) return;
    if (!skipReason.trim()) {
      toast.error('Informe o motivo');
      return;
    }
    try {
      await skipMutation.mutateAsync({
        prescriptionItemId: selectedCheck.prescriptionItemId,
        encounterId: '',
        scheduledAt: selectedCheck.scheduledAt,
        observations: skipReason.trim(),
      });
      toast.success('Medicamento marcado como nao administrado');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao registrar');
    }
  }, [selectedCheck, skipReason, skipMutation]);

  return (
    <>
      <div className="space-y-2">
        {pendingChecks.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex flex-col items-center py-10">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="mt-3 text-sm text-zinc-400">Nenhuma checagem pendente no momento.</p>
            </CardContent>
          </Card>
        ) : (
          pendingChecks.map((check) => {
            const isLate = new Date(check.scheduledAt).getTime() < Date.now();
            const isDone = check.status === 'ADMINISTERED';
            const isSkipped = check.status === 'REFUSED' || check.status === 'HELD';

            return (
              <Card
                key={check.id}
                className={cn(
                  'border transition-all',
                  isDone ? 'border-green-500/30 bg-green-500/5' : isSkipped ? 'border-orange-500/30 bg-orange-500/5' : isLate ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 bg-zinc-900',
                )}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="text-center min-w-[50px]">
                    <p className="text-sm font-bold">
                      {new Date(check.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className={cn('text-[10px]', isLate ? 'text-red-400 font-medium' : 'text-zinc-400')}>
                      {isDone ? 'Feito' : isSkipped ? 'Pulado' : isLate ? 'Atrasado' : 'Agendado'}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-zinc-700" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{check.prescriptionItem?.medicationName ?? 'Medicamento'}</p>
                      {check.prescriptionItem?.isHighAlert && (
                        <Badge className="bg-red-500/20 text-[9px] text-red-400">Alto Alerta</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      {check.prescriptionItem?.dose} — {check.prescriptionItem?.route} — {check.prescriptionItem?.frequency}
                    </p>
                  </div>
                  {isDone ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    </div>
                  ) : isSkipped ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20">
                      <XCircle className="h-5 w-5 text-orange-400" />
                    </div>
                  ) : (
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-xs h-8" onClick={() => handleOpenAdminister(check)}>
                      Checar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>{selectedCheck?.prescriptionItem?.medicationName ?? 'Medicamento'}</DialogTitle>
            <DialogDescription>
              {selectedCheck ? `${selectedCheck.prescriptionItem?.dose} — ${selectedCheck.prescriptionItem?.route} — Horario: ${new Date(selectedCheck.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </DialogDescription>
          </DialogHeader>
          {dialogMode === 'administer' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="check-lot">Lote {selectedCheck?.prescriptionItem?.isControlled && <span className="text-red-400">*</span>}</Label>
                <Input id="check-lot" placeholder="Numero do lote" value={lot} onChange={(e) => setLot(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-700" />
              </div>
              <div>
                <Label htmlFor="check-obs">Observacoes</Label>
                <Textarea id="check-obs" placeholder="Sem intercorrencias" value={observations} onChange={(e) => setObservations(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-700" rows={3} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="check-skip-reason">Motivo <span className="text-red-400">*</span></Label>
                <Textarea id="check-skip-reason" placeholder="Ex: Paciente recusou, vomitou, etc." value={skipReason} onChange={(e) => setSkipReason(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-700" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {dialogMode === 'administer' ? (
              <>
                <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10" onClick={() => setDialogMode('skip')}>
                  <XCircle className="mr-2 h-4 w-4" /> Nao Administrar
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={handleAdminister} disabled={administerMutation.isPending}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> {administerMutation.isPending ? 'Registrando...' : 'Administrar'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogMode('administer')}>Voltar</Button>
                <Button className="bg-orange-600 hover:bg-orange-500" onClick={handleSkip} disabled={skipMutation.isPending}>
                  <XCircle className="mr-2 h-4 w-4" /> {skipMutation.isPending ? 'Registrando...' : 'Confirmar'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function NursingPage() {
  const navigate = useNavigate();
  const [ward, setWard] = useState('all');
  const [tab, setTab] = useState('medications');

  const { data: allBeds = [], isLoading: bedsLoading, isError: bedsError, refetch: refetchBeds } = useBeds();

  const assignedPatients = useMemo(() =>
    allBeds
      .filter((b) => b.status === 'OCCUPIED' && b.currentPatient)
      .map((bed) => ({ bed, patient: bed.currentPatient! })),
    [allBeds],
  );

  if (bedsLoading) return <PageLoading cards={3} showTable />;
  if (bedsError) return <PageError onRetry={() => { refetchBeds(); }} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-900/40 flex items-center justify-center">
            <Activity className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Enfermagem</h1>
            <p className="text-sm text-zinc-400">Escalas, avaliacoes e checagens de enfermagem</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10" onClick={() => navigate('/enfermagem/aprazamento')}>
            <CalendarClock className="mr-2 h-4 w-4" /> Grade de Aprazamento
          </Button>
          <Select value={ward} onValueChange={setWard}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Ala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Alas</SelectItem>
              <SelectItem value="ward-uti">UTI</SelectItem>
              <SelectItem value="ward-enf">Enfermaria</SelectItem>
              <SelectItem value="ward-obs">Observacao</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-blue-400" />
              <p className="text-xs text-zinc-400">Pacientes</p>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{assignedPatients.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <p className="text-xs text-zinc-400">Quedas Risco Alto</p>
            </div>
            <p className="text-2xl font-bold text-yellow-400 mt-1">3</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-400" />
              <p className="text-xs text-zinc-400">LPP Risco Alto</p>
            </div>
            <p className="text-2xl font-bold text-red-400 mt-1">2</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-cyan-400" />
              <p className="text-xs text-zinc-400">Decubito Atrasado</p>
            </div>
            <p className="text-2xl font-bold text-orange-400 mt-1">1</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Cards */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Pacientes Atribuidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {assignedPatients.map(({ bed, patient }) => (
            <Card key={bed.id} className="border-zinc-800 bg-zinc-900 transition-colors hover:bg-zinc-800/80">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-zinc-800 text-xs">
                      {getInitials(patient.name ?? patient.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{patient.name ?? patient.fullName}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <BedDouble className="h-3 w-3" />
                      <span>{bed.bedNumber}</span>
                      <span>{calculateAge(patient.birthDate)} anos</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-zinc-800 border border-zinc-700 flex-wrap">
          <TabsTrigger value="medications" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <Pill className="h-3.5 w-3.5" /> Medicamentos
          </TabsTrigger>
          <TabsTrigger value="morse" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <AlertTriangle className="h-3.5 w-3.5" /> Morse (Queda)
          </TabsTrigger>
          <TabsTrigger value="braden" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <Shield className="h-3.5 w-3.5" /> Braden (LPP)
          </TabsTrigger>
          <TabsTrigger value="pain" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <Heart className="h-3.5 w-3.5" /> Dor
          </TabsTrigger>
          <TabsTrigger value="wounds" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <Eye className="h-3.5 w-3.5" /> Feridas
          </TabsTrigger>
          <TabsTrigger value="elimination" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <Droplets className="h-3.5 w-3.5" /> Eliminacoes
          </TabsTrigger>
          <TabsTrigger value="repositioning" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <RotateCcw className="h-3.5 w-3.5" /> Decubito
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <Target className="h-3.5 w-3.5" /> Dispositivos
          </TabsTrigger>
          <TabsTrigger value="fugulin" className="gap-1 text-xs data-[state=active]:bg-teal-600">
            <Users className="h-3.5 w-3.5" /> Fugulin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="medications" className="mt-4">
          <MedicationCheckSection />
          {/* Quick Vital Signs Entry */}
          <Card className="border-zinc-800 bg-zinc-900 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-400" />
                Registro Rapido de Sinais Vitais
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              <button className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-500/20 hover:bg-teal-500 transition-all animate-voice-pulse">
                <Mic className="h-6 w-6 text-white" />
              </button>
              <p className="mt-3 text-sm text-zinc-400">Dite os sinais vitais do paciente</p>
              <p className="mt-1 text-xs text-zinc-500">Ex: "Pressao 120 por 80, frequencia cardiaca 72, saturacao 98"</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="morse" className="mt-4"><MorseFallScale /></TabsContent>
        <TabsContent value="braden" className="mt-4"><BradenScale /></TabsContent>
        <TabsContent value="pain" className="mt-4"><PainAssessment /></TabsContent>
        <TabsContent value="wounds" className="mt-4"><WoundAssessment /></TabsContent>
        <TabsContent value="elimination" className="mt-4"><EliminationTracking /></TabsContent>
        <TabsContent value="repositioning" className="mt-4"><RepositioningSchedule /></TabsContent>
        <TabsContent value="devices" className="mt-4"><DeviceBundleTracking /></TabsContent>
        <TabsContent value="fugulin" className="mt-4"><FugulinClassification /></TabsContent>
      </Tabs>
    </div>
  );
}
