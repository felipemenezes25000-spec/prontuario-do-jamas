import { useState, useMemo, useEffect } from 'react';
import {
  Flame, Plus, Clock, CheckCircle2, Circle, AlertTriangle, Activity,
  BarChart3, Timer, Droplets, TestTube2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import {
  useSepsisActiveCases,
  useSepsisBundles,
  useSepsisCompliance,
  useCreateSepsisScreening,
  useCompleteBundleItem,
} from '@/services/sepsis.service';
import type { SepsisCase } from '@/services/sepsis.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SCREENING: { label: 'Triagem', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  SUSPECTED: { label: 'Suspeita', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  CONFIRMED: { label: 'Confirmada', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  SEPTIC_SHOCK: { label: 'Choque Septico', className: 'bg-red-600/30 text-red-300 border-red-600/50' },
  RESOLVED: { label: 'Resolvida', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  RULED_OUT: { label: 'Descartada', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
};

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── SOFA Calculator ────────────────────────────────────────────────────────

function SOFACalculator() {
  const [sofa, setSofa] = useState({
    respiration: 0, coagulation: 0, liver: 0, cardiovascular: 0, cns: 0, renal: 0,
  });

  const totalSOFA = Object.values(sofa).reduce((a, b) => a + b, 0);

  const sofaCriteria = [
    {
      key: 'respiration', label: 'Respiracao (PaO2/FiO2)',
      options: [
        { v: 0, l: '> 400 (0)' }, { v: 1, l: '< 400 (1)' },
        { v: 2, l: '< 300 (2)' }, { v: 3, l: '< 200 + VM (3)' }, { v: 4, l: '< 100 + VM (4)' },
      ],
    },
    {
      key: 'coagulation', label: 'Coagulacao (Plaquetas x10³)',
      options: [
        { v: 0, l: '> 150 (0)' }, { v: 1, l: '< 150 (1)' },
        { v: 2, l: '< 100 (2)' }, { v: 3, l: '< 50 (3)' }, { v: 4, l: '< 20 (4)' },
      ],
    },
    {
      key: 'liver', label: 'Figado (Bilirrubina mg/dL)',
      options: [
        { v: 0, l: '< 1.2 (0)' }, { v: 1, l: '1.2-1.9 (1)' },
        { v: 2, l: '2.0-5.9 (2)' }, { v: 3, l: '6.0-11.9 (3)' }, { v: 4, l: '> 12 (4)' },
      ],
    },
    {
      key: 'cardiovascular', label: 'Cardiovascular (PAM / Vasopressores)',
      options: [
        { v: 0, l: 'PAM >= 70 (0)' }, { v: 1, l: 'PAM < 70 (1)' },
        { v: 2, l: 'Dopa < 5 (2)' }, { v: 3, l: 'Dopa > 5 / Nora (3)' }, { v: 4, l: 'Dopa > 15 / Nora > 0.1 (4)' },
      ],
    },
    {
      key: 'cns', label: 'SNC (Glasgow)',
      options: [
        { v: 0, l: '15 (0)' }, { v: 1, l: '13-14 (1)' },
        { v: 2, l: '10-12 (2)' }, { v: 3, l: '6-9 (3)' }, { v: 4, l: '< 6 (4)' },
      ],
    },
    {
      key: 'renal', label: 'Renal (Creatinina mg/dL)',
      options: [
        { v: 0, l: '< 1.2 (0)' }, { v: 1, l: '1.2-1.9 (1)' },
        { v: 2, l: '2.0-3.4 (2)' }, { v: 3, l: '3.5-4.9 (3)' }, { v: 4, l: '> 5 (4)' },
      ],
    },
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-orange-400" />
          Calculadora SOFA (Sequential Organ Failure Assessment)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sofaCriteria.map(({ key, label, options }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <div className="flex gap-1">
                {options.map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setSofa((p) => ({ ...p, [key]: opt.v }))}
                    className={cn(
                      'flex-1 rounded border p-1.5 text-[10px] transition-colors text-center leading-tight',
                      sofa[key as keyof typeof sofa] === opt.v
                        ? opt.v >= 3 ? 'bg-red-600 border-red-500 text-white' : opt.v >= 2 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                    )}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Score visualization */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">SOFA Score Total</p>
              <p className={cn('text-4xl font-black', totalSOFA >= 10 ? 'text-red-400' : totalSOFA >= 6 ? 'text-orange-400' : totalSOFA >= 2 ? 'text-yellow-400' : 'text-emerald-400')}>
                {totalSOFA}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {totalSOFA >= 10 ? 'Mortalidade estimada > 50%' : totalSOFA >= 6 ? 'Mortalidade estimada > 30%' : totalSOFA >= 2 ? 'Disfuncao organica — Sepse se aumento >= 2 pontos' : 'Sem disfuncao organica significativa'}
              </p>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {Object.entries(sofa).map(([key, val]) => (
                <div key={key} className={cn('rounded p-2 text-center min-w-[50px]', val >= 3 ? 'bg-red-500/20' : val >= 2 ? 'bg-orange-500/20' : val >= 1 ? 'bg-yellow-500/20' : 'bg-zinc-700/50')}>
                  <p className="text-[9px] text-zinc-400">{key.slice(0, 4).toUpperCase()}</p>
                  <p className="text-sm font-bold">{val}</p>
                </div>
              ))}
            </div>
          </div>
          {totalSOFA >= 2 && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">SOFA {'>'}= 2 — Se aumento agudo, considerar sepse e iniciar protocolo</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Lactate Trend Chart ────────────────────────────────────────────────────

function LactateTrendChart() {
  const [values, setValues] = useState<Array<{ time: string; lactate: number }>>([
    { time: '0h', lactate: 4.2 },
    { time: '1h', lactate: 3.8 },
    { time: '3h', lactate: 2.9 },
    { time: '6h', lactate: 2.1 },
  ]);
  const [newLactate, setNewLactate] = useState('');

  const addLactate = () => {
    if (!newLactate) return;
    const val = Number(newLactate);
    if (isNaN(val) || val < 0) return;
    setValues((prev) => [...prev, { time: `${prev.length * 2}h`, lactate: val }]);
    setNewLactate('');
  };

  const lastClearance = useMemo(() => {
    if (values.length < 2) return null;
    const first = values[0]?.lactate ?? 0;
    const last = values[values.length - 1]?.lactate ?? 0;
    const pct = ((first - last) / first) * 100;
    return Math.round(pct * 10) / 10;
  }, [values]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Droplets className="h-4 w-4 text-purple-400" />
          Tendencia de Lactato
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={values}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} domain={[0, 'auto']} label={{ value: 'mmol/L', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }} />
            <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
            <ReferenceLine y={2} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Normal', fill: '#10b981', fontSize: 9 }} />
            <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critico', fill: '#ef4444', fontSize: 9 }} />
            <Line type="monotone" dataKey="lactate" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 5, fill: '#a855f7' }} name="Lactato" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-3">
          <Input type="number" step="0.1" placeholder="Novo lactato (mmol/L)" value={newLactate} onChange={(e) => setNewLactate(e.target.value)} className="bg-zinc-950 border-zinc-700 max-w-xs" />
          <Button onClick={addLactate} variant="outline" className="border-zinc-700">Adicionar</Button>
          {lastClearance !== null && (
            <div className={cn('rounded-lg border px-3 py-1.5 text-center', lastClearance >= 10 ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10')}>
              <p className="text-xs text-zinc-400">Clearance</p>
              <p className={cn('text-lg font-bold', lastClearance >= 10 ? 'text-emerald-400' : 'text-red-400')}>{lastClearance}%</p>
            </div>
          )}
        </div>
        {lastClearance !== null && lastClearance < 10 && (
          <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-xs text-red-300">Clearance de lactato {'<'} 10% — Reavaliar ressuscitacao volemica e vasopressores</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Blood Culture Status Tracker ───────────────────────────────────────────

function BloodCultureTracker() {
  const [cultures] = useState([
    { id: '1', site: 'Periferico (aerobio)', collectedAt: '2026-03-25T08:00:00', status: 'PENDING' as const, organism: '' },
    { id: '2', site: 'Periferico (anaerobio)', collectedAt: '2026-03-25T08:00:00', status: 'PENDING' as const, organism: '' },
    { id: '3', site: 'Cateter central', collectedAt: '2026-03-25T08:05:00', status: 'POSITIVE' as const, organism: 'S. aureus MRSA' },
  ]);

  const statusConfig = {
    PENDING: { label: 'Pendente', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
    POSITIVE: { label: 'Positiva', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
    NEGATIVE: { label: 'Negativa', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
    CONTAMINATED: { label: 'Contaminada', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TestTube2 className="h-4 w-4 text-blue-400" />
          Hemoculturas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {cultures.map((c) => {
            const cfg = statusConfig[c.status];
            return (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-800/50">
                <div>
                  <p className="text-sm font-medium">{c.site}</p>
                  <p className="text-xs text-zinc-400">Coleta: {formatDate(c.collectedAt)}</p>
                  {c.organism && <p className="text-xs text-red-400 font-medium mt-0.5">{c.organism}</p>}
                </div>
                <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Antibiotic Timing Verification ─────────────────────────────────────────

function AntibioticTimingCard() {
  const [sepsisDiagnosisTime] = useState('2026-03-25T08:00:00');
  const [antibioticTime] = useState('2026-03-25T08:42:00');

  const diffMinutes = useMemo(() => {
    const diff = new Date(antibioticTime).getTime() - new Date(sepsisDiagnosisTime).getTime();
    return Math.round(diff / 60000);
  }, [sepsisDiagnosisTime, antibioticTime]);

  const isWithinTarget = diffMinutes <= 60;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="h-4 w-4 text-amber-400" />
          Verificacao de Tempo ate Antibiotico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-center">
            <p className="text-xs text-zinc-400">Diagnostico Sepse</p>
            <p className="text-sm font-mono font-bold">{new Date(sepsisDiagnosisTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-center">
            <p className="text-xs text-zinc-400">1o Antibiotico</p>
            <p className="text-sm font-mono font-bold">{new Date(antibioticTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className={cn('rounded-lg border p-3 text-center', isWithinTarget ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10')}>
            <p className="text-xs text-zinc-400">Tempo</p>
            <p className={cn('text-2xl font-black', isWithinTarget ? 'text-emerald-400' : 'text-red-400')}>{diffMinutes} min</p>
            <p className="text-[10px]">{isWithinTarget ? 'Dentro da meta (1h)' : 'Acima da meta (1h)'}</p>
          </div>
        </div>
        {/* Timeline bar */}
        <div className="relative h-8 rounded-full bg-zinc-800 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/20" style={{ width: '100%' }} />
          <div className={cn('absolute left-0 top-0 bottom-0', isWithinTarget ? 'bg-emerald-500/40' : 'bg-red-500/40')}
            style={{ width: `${Math.min(100, (diffMinutes / 60) * 100)}%` }} />
          <div className="absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center">
            <span className="text-xs font-medium">{diffMinutes}min / 60min alvo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Countdown Timer Component ──────────────────────────────────────────────

function CountdownTimer({ targetMinutes, elapsedMinutes }: { targetMinutes: number; elapsedMinutes: number }) {
  const [elapsed, setElapsed] = useState(elapsedMinutes);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const remaining = targetMinutes - elapsed;
  const pct = Math.min(100, (elapsed / targetMinutes) * 100);
  const isOverdue = remaining <= 0;

  return (
    <div className={cn('rounded-lg border p-2 text-center', isOverdue ? 'border-red-500 bg-red-500/10' : remaining <= 15 ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-800')}>
      <p className="text-[10px] text-zinc-400">{targetMinutes === 60 ? 'Bundle 1h' : 'Bundle 3h'}</p>
      <p className={cn('text-lg font-bold font-mono', isOverdue ? 'text-red-400' : remaining <= 15 ? 'text-amber-400' : 'text-emerald-400')}>
        {isOverdue ? `+${Math.abs(remaining)}min` : `${remaining}min`}
      </p>
      <div className="h-1 rounded-full bg-zinc-700 mt-1">
        <div className={cn('h-1 rounded-full transition-all', isOverdue ? 'bg-red-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Screening Dialog ────────────────────────────────────────────────────────

function ScreeningDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSepsisScreening();
  const [patientId, setPatientId] = useState('');
  const [qsofa, setQsofa] = useState({ qsofaAlteredMentation: false, qsofaSystolicBp: false, qsofaRespRate: false });
  const [sirs, setSirs] = useState({ sirsTemp: false, sirsHeartRate: false, sirsRespRate: false, sirsWbc: false });

  const qsofaScore = Object.values(qsofa).filter(Boolean).length;
  const sirsScore = Object.values(sirs).filter(Boolean).length;

  const handleSubmit = () => {
    if (!patientId) { toast.error('Informe o ID do paciente.'); return; }
    create.mutate({ patientId, ...qsofa, ...sirs }, {
      onSuccess: () => { toast.success('Triagem de sepse registrada!'); onClose(); setPatientId(''); setQsofa({ qsofaAlteredMentation: false, qsofaSystolicBp: false, qsofaRespRate: false }); setSirs({ sirsTemp: false, sirsHeartRate: false, sirsRespRate: false, sirsWbc: false }); },
      onError: () => toast.error('Erro ao registrar triagem.'),
    });
  };

  const CheckItem = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 w-full text-left transition-colors">
      {checked ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> : <Circle className="h-5 w-5 text-zinc-500 shrink-0" />}
      <span className={cn('text-sm', checked && 'text-emerald-300')}>{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Triagem de Sepse</DialogTitle>
          <DialogDescription>Criterios qSOFA e SIRS</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>ID do Paciente *</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="ID do paciente" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="rounded-lg border border-zinc-700 p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-yellow-400">Criterios qSOFA</p>
              <Badge variant="outline" className={cn('', qsofaScore >= 2 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50')}>
                {qsofaScore}/3
              </Badge>
            </div>
            <CheckItem label="Alteracao do nivel de consciencia" checked={qsofa.qsofaAlteredMentation} onToggle={() => setQsofa({ ...qsofa, qsofaAlteredMentation: !qsofa.qsofaAlteredMentation })} />
            <CheckItem label="PAS <= 100 mmHg" checked={qsofa.qsofaSystolicBp} onToggle={() => setQsofa({ ...qsofa, qsofaSystolicBp: !qsofa.qsofaSystolicBp })} />
            <CheckItem label="FR >= 22 irpm" checked={qsofa.qsofaRespRate} onToggle={() => setQsofa({ ...qsofa, qsofaRespRate: !qsofa.qsofaRespRate })} />
          </div>
          <div className="rounded-lg border border-zinc-700 p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-orange-400">Criterios SIRS</p>
              <Badge variant="outline" className={cn('', sirsScore >= 2 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50')}>
                {sirsScore}/4
              </Badge>
            </div>
            <CheckItem label="Temperatura {'>'} 38C ou {'<'} 36C" checked={sirs.sirsTemp} onToggle={() => setSirs({ ...sirs, sirsTemp: !sirs.sirsTemp })} />
            <CheckItem label="FC {'>'} 90 bpm" checked={sirs.sirsHeartRate} onToggle={() => setSirs({ ...sirs, sirsHeartRate: !sirs.sirsHeartRate })} />
            <CheckItem label="FR {'>'} 20 irpm ou PaCO2 {'<'} 32 mmHg" checked={sirs.sirsRespRate} onToggle={() => setSirs({ ...sirs, sirsRespRate: !sirs.sirsRespRate })} />
            <CheckItem label="Leucocitos {'>'} 12.000 ou {'<'} 4.000 ou {'>'} 10% bastoes" checked={sirs.sirsWbc} onToggle={() => setSirs({ ...sirs, sirsWbc: !sirs.sirsWbc })} />
          </div>
          {qsofaScore >= 2 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-300">qSOFA {'>'}= 2 — Iniciar avaliacao de sepse imediatamente!</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-red-600 hover:bg-red-700">
            {create.isPending ? 'Registrando...' : 'Registrar Triagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bundle Panel ────────────────────────────────────────────────────────────

function BundlePanel({ screeningId }: { screeningId: string }) {
  const { data: bundles = [] } = useSepsisBundles(screeningId);
  const completeItem = useCompleteBundleItem();

  const handleComplete = (bundleId: string, itemId: string) => {
    completeItem.mutate({ screeningId, bundleId, itemId }, {
      onSuccess: () => toast.success('Item do bundle concluido!'),
      onError: () => toast.error('Erro ao completar item.'),
    });
  };

  if (bundles.length === 0) return <p className="text-zinc-500 text-sm text-center py-4">Nenhum bundle disponivel</p>;

  return (
    <div className="space-y-4">
      {bundles.map((bundle) => (
        <div key={bundle.id} className="rounded-lg border border-zinc-700 p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm">{bundle.bundleType === 'HOUR_1' ? 'Bundle 1 hora' : 'Bundle 3 horas'}</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-zinc-700">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${bundle.compliance}%` }} />
              </div>
              <span className={cn('text-xs', bundle.compliance === 100 ? 'text-emerald-400' : 'text-zinc-400')}>{bundle.compliance}%</span>
            </div>
          </div>
          <div className="space-y-2">
            {bundle.items.map((item) => (
              <button key={item.id} onClick={() => !item.completed && handleComplete(bundle.id, item.id)} disabled={item.completed || completeItem.isPending}
                className="flex items-start gap-3 w-full text-left p-2 rounded hover:bg-zinc-800 transition-colors disabled:cursor-default">
                {item.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> : <Circle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={cn('text-sm', item.completed && 'line-through text-zinc-500')}>{item.description}</p>
                  {item.completedAt && <p className="text-xs text-zinc-500">{formatDate(item.completedAt)} — {item.completedBy}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Case Card ───────────────────────────────────────────────────────────────

function CaseCard({ c }: { c: SepsisCase }) {
  const [showBundles, setShowBundles] = useState(false);
  const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' };
  const isUrgent = c.elapsedMinutes >= 60;

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', isUrgent && 'border-red-500/40')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{c.patientName}</p>
            <p className="text-sm text-zinc-400">{c.mrn} — {c.bed ?? '—'} — {c.ward ?? '—'}</p>
          </div>
          <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">qSOFA</p>
            <p className={cn('font-bold', c.qsofaScore >= 2 ? 'text-red-400' : 'text-zinc-300')}>{c.qsofaScore}/3</p>
          </div>
          <div className="rounded bg-zinc-800 p-2">
            <p className="text-xs text-zinc-400">SOFA</p>
            <p className="font-bold">{c.sofaScore ?? '—'}</p>
          </div>
          <div className={cn('rounded p-2', isUrgent ? 'bg-red-500/20' : 'bg-zinc-800')}>
            <p className="text-xs text-zinc-400">Tempo</p>
            <p className={cn('font-bold', isUrgent ? 'text-red-400' : 'text-zinc-300')}>{formatElapsed(c.elapsedMinutes)}</p>
          </div>
          <CountdownTimer targetMinutes={60} elapsedMinutes={c.elapsedMinutes} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Bundle 1h</span>
            <span className={c.bundle1hCompliance === 100 ? 'text-emerald-400' : 'text-yellow-400'}>{c.bundle1hCompliance}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-700">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${c.bundle1hCompliance}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-2 mb-1">
            <span className="text-zinc-400">Bundle 3h</span>
            <span className={c.bundle3hCompliance === 100 ? 'text-emerald-400' : 'text-yellow-400'}>{c.bundle3hCompliance}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-700">
            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${c.bundle3hCompliance}%` }} />
          </div>
        </div>
        <Button size="sm" variant="outline" className="w-full border-zinc-700" onClick={() => setShowBundles(!showBundles)}>
          {showBundles ? 'Ocultar Bundles' : 'Ver Bundles'}
        </Button>
        {showBundles && <BundlePanel screeningId={c.id} />}
      </CardContent>
    </Card>
  );
}

// ─── Compliance Dashboard ───────────────────────────────────────────────────

function ComplianceDashboard({ compliance, cases }: { compliance: NonNullable<ReturnType<typeof useSepsisCompliance>['data']>; cases: SepsisCase[] }) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_CONFIG[status]?.label ?? status,
      value: count,
      color: status === 'SEPTIC_SHOCK' ? '#ef4444' : status === 'CONFIRMED' ? '#f97316' : status === 'SUSPECTED' ? '#eab308' : status === 'SCREENING' ? '#3b82f6' : '#10b981',
    }));
  }, [cases]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader><CardTitle className="text-base">Indicadores de Qualidade</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Compliance Bundle 1h', value: compliance.bundle1hCompliance, unit: '%', color: 'bg-emerald-500', target: 95 },
            { label: 'Compliance Bundle 3h', value: compliance.bundle3hCompliance, unit: '%', color: 'bg-blue-500', target: 90 },
          ].map(({ label, value, unit, color, target }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{value}{unit}</span>
                  <span className="text-xs text-zinc-500">meta: {target}%</span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-zinc-700 relative">
                <div className={cn('h-3 rounded-full transition-all', color)} style={{ width: `${value}%` }} />
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/30" style={{ left: `${target}%` }} />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Total de Casos', value: String(compliance.totalCases), color: '' },
              { label: 'Mortalidade', value: `${compliance.mortalityRate}%`, color: compliance.mortalityRate > 20 ? 'text-red-400' : 'text-emerald-400' },
              { label: 'Tempo medio ATB', value: `${compliance.avgTimeToAntibiotic}min`, color: compliance.avgTimeToAntibiotic > 60 ? 'text-red-400' : 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-zinc-800 p-3 text-center">
                <p className="text-xs text-zinc-400">{label}</p>
                <p className={cn('text-lg font-bold', color)}>{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {statusCounts.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-base">Distribuicao por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {statusCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SepsisPage() {
  const [screeningDialog, setScreeningDialog] = useState(false);

  const { data: cases = [], isLoading } = useSepsisActiveCases();
  const { data: compliance } = useSepsisCompliance();

  const shockCount = cases.filter((c) => c.status === 'SEPTIC_SHOCK').length;
  const criticalCount = cases.filter((c) => c.elapsedMinutes >= 60).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="h-7 w-7 text-orange-400" />
          <div>
            <h1 className="text-2xl font-bold">Protocolo Sepse</h1>
            <p className="text-sm text-muted-foreground">qSOFA/SOFA, bundles com countdown, lactato, hemoculturas e compliance</p>
          </div>
          <Badge variant="outline" className="text-orange-400 border-orange-500/50">Tempo real</Badge>
        </div>
        <Button onClick={() => setScreeningDialog(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> Nova Triagem
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4 flex items-center gap-3"><Activity className="h-5 w-5 text-orange-400" /><div><p className="text-xs text-zinc-400">Casos Ativos</p><p className="text-2xl font-bold">{cases.length}</p></div></CardContent></Card>
        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-400" /><div><p className="text-xs text-zinc-400">Choque Septico</p><p className="text-2xl font-bold text-red-400">{shockCount}</p></div></CardContent></Card>
        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-yellow-400" /><div><p className="text-xs text-zinc-400">Tempo Critico</p><p className="text-2xl font-bold text-yellow-400">{criticalCount}</p></div></CardContent></Card>
        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4 flex items-center gap-3"><BarChart3 className="h-5 w-5 text-emerald-400" /><div><p className="text-xs text-zinc-400">Bundle 1h</p><p className="text-2xl font-bold">{compliance?.bundle1hCompliance ?? 0}%</p></div></CardContent></Card>
        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4 flex items-center gap-3"><Timer className="h-5 w-5 text-blue-400" /><div><p className="text-xs text-zinc-400">Tempo Med. ATB</p><p className="text-2xl font-bold">{compliance?.avgTimeToAntibiotic ?? 0}min</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1">
          <TabsTrigger value="active" className="text-xs data-[state=active]:bg-orange-700">Casos Ativos</TabsTrigger>
          <TabsTrigger value="sofa" className="text-xs data-[state=active]:bg-orange-700">SOFA Calculator</TabsTrigger>
          <TabsTrigger value="lactate" className="text-xs data-[state=active]:bg-orange-700">Lactato</TabsTrigger>
          <TabsTrigger value="cultures" className="text-xs data-[state=active]:bg-orange-700">Hemoculturas</TabsTrigger>
          <TabsTrigger value="antibiotic" className="text-xs data-[state=active]:bg-orange-700">Tempo ATB</TabsTrigger>
          <TabsTrigger value="bundles" className="text-xs data-[state=active]:bg-orange-700">Bundles</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs data-[state=active]:bg-orange-700">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {cases.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-10 text-center text-zinc-500">Nenhum caso ativo de sepse</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cases.map((c) => <CaseCard key={c.id} c={c} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sofa" className="mt-4">
          <SOFACalculator />
        </TabsContent>

        <TabsContent value="lactate" className="mt-4">
          <LactateTrendChart />
        </TabsContent>

        <TabsContent value="cultures" className="mt-4">
          <BloodCultureTracker />
        </TabsContent>

        <TabsContent value="antibiotic" className="mt-4">
          <AntibioticTimingCard />
        </TabsContent>

        <TabsContent value="bundles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Bundle 1 hora', color: 'text-red-400', items: [
                'Medir lactato', 'Obter hemoculturas antes de antibioticos', 'Administrar antibioticos de amplo espectro',
                'Administrar 30 ml/kg de cristaloide para hipotensao ou lactato >= 4', 'Iniciar vasopressores se hipotensao persistir',
              ]},
              { title: 'Bundle 3 horas', color: 'text-orange-400', items: [
                'Reavaliacao do estado volemico e perfusao tecidual', 'Medir lactato novamente se inicial {'>'} 2 mmol/L',
                'Documentar reavaliacao clinica', 'Otimizar vasopressores — manter PAM >= 65 mmHg',
              ]},
            ].map(({ title, color, items }) => (
              <Card key={title} className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className={cn('text-base', color)}>{title}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item) => (
                    <div key={String(item)} className="flex items-start gap-2 p-2 rounded bg-zinc-800">
                      <Circle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-300">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          {compliance ? <ComplianceDashboard compliance={compliance} cases={cases} /> : (
            <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-10 text-center text-zinc-500">Carregando dados de compliance...</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <ScreeningDialog open={screeningDialog} onClose={() => setScreeningDialog(false)} />
    </div>
  );
}
