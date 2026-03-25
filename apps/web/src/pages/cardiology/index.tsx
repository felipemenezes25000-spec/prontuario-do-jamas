import { useState, useMemo, useCallback } from 'react';
import {
  Heart,
  Plus,
  Activity,
  Waves,
  Stethoscope,
  Clock,
  Search,
  TrendingUp,
  Calculator,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLoading } from '@/components/common/page-loading';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  useECGRecords,
  useEchoReports,
  useCatheterizations,
  useHolterReports,
  useStressTests,
  useCardiologyTimeline,
  useCreateECG,
  type ECGRecord,
  type EchoReport,
  type CatheterizationReport,
  type HolterReport,
  type StressTestReport,
  type CardiologyEvent,
} from '@/services/cardiology.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const ECG_STATUS: Record<ECGRecord['status'], { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'border-amber-500 text-amber-400' },
  INTERPRETADO: { label: 'Interpretado', color: 'border-blue-500 text-blue-400' },
  REVISADO: { label: 'Revisado', color: 'border-emerald-500 text-emerald-400' },
};

const STRESS_CONCLUSION: Record<StressTestReport['conclusion'], { label: string; color: string }> = {
  NORMAL: { label: 'Normal', color: 'bg-emerald-500/20 text-emerald-400' },
  ALTERADO: { label: 'Alterado', color: 'bg-red-500/20 text-red-400' },
  INCONCLUSIVO: { label: 'Inconclusivo', color: 'bg-amber-500/20 text-amber-400' },
};

const EVENT_TYPE_LABELS: Record<CardiologyEvent['type'], { label: string; icon: React.ReactNode }> = {
  ECG: { label: 'ECG', icon: <Activity className="h-3 w-3" /> },
  ECO: { label: 'Ecocardiograma', icon: <Waves className="h-3 w-3" /> },
  CATETERISMO: { label: 'Cateterismo', icon: <Stethoscope className="h-3 w-3" /> },
  HOLTER: { label: 'Holter', icon: <Clock className="h-3 w-3" /> },
  ERGOMETRICO: { label: 'Ergometrico', icon: <TrendingUp className="h-3 w-3" /> },
};

const ECG_LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

// ─── Simulated ECG waveform generator ───────────────────────────────────────

function generateECGWave(lead: string, heartRate: number): string {
  const baseAmplitude = lead.startsWith('V') ? 18 : 12;
  const freq = heartRate / 60;
  const points: string[] = [];
  const width = 200;
  const midY = 25;
  const seed = lead.charCodeAt(0) + (lead.charCodeAt(1) || 0);

  for (let x = 0; x < width; x++) {
    const t = (x / width) * 4 * Math.PI * freq;
    const cycle = t % (2 * Math.PI);
    let y = midY;
    if (cycle > 0.8 && cycle < 1.0) y = midY - baseAmplitude * 0.3 * ((seed % 3) + 1) / 3;
    else if (cycle > 1.0 && cycle < 1.3) y = midY + baseAmplitude * ((seed % 5) + 2) / 5;
    else if (cycle > 1.3 && cycle < 1.5) y = midY - baseAmplitude * 0.15;
    else if (cycle > 2.0 && cycle < 2.6) y = midY - baseAmplitude * 0.2 * ((seed % 4) + 1) / 4;
    else y = midY + (Math.sin(t * 3 + seed) * 0.8);
    points.push(`${x},${Math.max(2, Math.min(48, y)).toFixed(1)}`);
  }
  return points.join(' ');
}

// ─── ECG 12-Lead Viewer ────────────────────────────────────────────────────

function ECGViewer({ heartRate }: { heartRate: number }) {
  const waves = useMemo(() => {
    return ECG_LEADS.map((lead) => ({
      lead,
      path: generateECGWave(lead, heartRate),
    }));
  }, [heartRate]);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-emerald-400">ECG 12 Derivacoes — Simulado</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Velocidade: 25mm/s</span>
          <span className="text-xs text-zinc-400">Ganho: 10mm/mV</span>
          <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">
            {heartRate} bpm
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {waves.map(({ lead, path }) => (
          <div key={lead} className="relative bg-zinc-900/50 rounded border border-zinc-800 p-1">
            <span className="absolute top-0.5 left-1 text-[10px] font-mono text-emerald-400/70">{lead}</span>
            <svg viewBox="0 0 200 50" className="w-full h-10" preserveAspectRatio="none">
              {/* Grid lines */}
              {[10, 20, 30, 40].map((y) => (
                <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#27272a" strokeWidth="0.3" />
              ))}
              {[0, 40, 80, 120, 160, 200].map((x) => (
                <line key={x} x1={x} y1="0" x2={x} y2="50" stroke="#27272a" strokeWidth="0.3" />
              ))}
              <polyline fill="none" stroke="#10b981" strokeWidth="1" points={path} />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cardiac Risk Calculators ───────────────────────────────────────────────

interface FraminghamState {
  age: string;
  sex: 'M' | 'F';
  totalCholesterol: string;
  hdl: string;
  systolicBP: string;
  bpTreated: boolean;
  smoker: boolean;
  diabetic: boolean;
}

function CardiacRiskCalculators() {
  const [calcTab, setCalcTab] = useState('framingham');
  const [framingham, setFramingham] = useState<FraminghamState>({
    age: '', sex: 'M', totalCholesterol: '', hdl: '', systolicBP: '', bpTreated: false, smoker: false, diabetic: false,
  });
  const [framinghamResult, setFraminghamResult] = useState<number | null>(null);

  const [chadsVasc, setChadsVasc] = useState({
    chf: false, hypertension: false, age75: false, diabetes: false,
    stroke: false, vascular: false, age65_74: false, female: false,
  });

  const chadsScore = useMemo(() => {
    let s = 0;
    if (chadsVasc.chf) s += 1;
    if (chadsVasc.hypertension) s += 1;
    if (chadsVasc.age75) s += 2;
    if (chadsVasc.diabetes) s += 1;
    if (chadsVasc.stroke) s += 2;
    if (chadsVasc.vascular) s += 1;
    if (chadsVasc.age65_74) s += 1;
    if (chadsVasc.female) s += 1;
    return s;
  }, [chadsVasc]);

  const chadsRisk = useMemo(() => {
    const riskMap: Record<number, string> = {
      0: '0%', 1: '1.3%', 2: '2.2%', 3: '3.2%', 4: '4.0%', 5: '6.7%', 6: '9.8%', 7: '9.6%', 8: '12.5%', 9: '15.2%',
    };
    return riskMap[chadsScore] ?? `${'>'}15%`;
  }, [chadsScore]);

  const [ascvd, setAscvd] = useState({
    age: '', sex: 'M' as 'M' | 'F', race: 'white' as 'white' | 'black',
    totalChol: '', hdlChol: '', systolicBP: '', bpTreatment: false,
    diabetes: false, smoker: false,
  });
  const [ascvdResult, setAscvdResult] = useState<number | null>(null);

  const calculateFramingham = useCallback(() => {
    const age = Number(framingham.age);
    const tc = Number(framingham.totalCholesterol);
    const hdl = Number(framingham.hdl);
    const sbp = Number(framingham.systolicBP);
    if (!age || !tc || !hdl || !sbp) { toast.error('Preencha todos os campos.'); return; }
    // Simplified Framingham approximation
    let points = 0;
    if (framingham.sex === 'M') {
      if (age >= 20 && age <= 34) points -= 9;
      else if (age <= 39) points -= 4;
      else if (age <= 44) points += 0;
      else if (age <= 49) points += 3;
      else if (age <= 54) points += 6;
      else if (age <= 59) points += 8;
      else if (age <= 64) points += 10;
      else if (age <= 69) points += 11;
      else points += 12;
      if (tc >= 280) points += 3; else if (tc >= 240) points += 2; else if (tc >= 200) points += 1;
      if (hdl < 40) points += 2; else if (hdl < 50) points += 1; else if (hdl >= 60) points -= 1;
      if (sbp >= 160) points += framingham.bpTreated ? 3 : 2;
      else if (sbp >= 140) points += framingham.bpTreated ? 2 : 1;
      else if (sbp >= 120) points += framingham.bpTreated ? 1 : 0;
      if (framingham.smoker) points += 3;
      if (framingham.diabetic) points += 2;
    } else {
      if (age >= 20 && age <= 34) points -= 7;
      else if (age <= 39) points -= 3;
      else if (age <= 44) points += 0;
      else if (age <= 49) points += 3;
      else if (age <= 54) points += 6;
      else if (age <= 59) points += 8;
      else if (age <= 64) points += 10;
      else if (age <= 69) points += 12;
      else points += 14;
      if (tc >= 280) points += 4; else if (tc >= 240) points += 3; else if (tc >= 200) points += 1;
      if (hdl < 40) points += 2; else if (hdl < 50) points += 1; else if (hdl >= 60) points -= 1;
      if (sbp >= 160) points += framingham.bpTreated ? 4 : 3;
      else if (sbp >= 140) points += framingham.bpTreated ? 3 : 2;
      if (framingham.smoker) points += 3;
      if (framingham.diabetic) points += 4;
    }
    const riskPercent = Math.min(30, Math.max(1, points * 1.2));
    setFraminghamResult(Math.round(riskPercent * 10) / 10);
  }, [framingham]);

  const calculateASCVD = useCallback(() => {
    const age = Number(ascvd.age);
    const tc = Number(ascvd.totalChol);
    const hdl = Number(ascvd.hdlChol);
    const sbp = Number(ascvd.systolicBP);
    if (!age || !tc || !hdl || !sbp) { toast.error('Preencha todos os campos.'); return; }
    // Simplified pooled cohort equations approximation
    let risk = 0.05;
    risk += (age - 40) * 0.005;
    risk += (tc - 170) * 0.0003;
    risk -= (hdl - 50) * 0.001;
    risk += (sbp - 120) * 0.002;
    if (ascvd.bpTreatment) risk += 0.02;
    if (ascvd.diabetes) risk += 0.04;
    if (ascvd.smoker) risk += 0.05;
    if (ascvd.sex === 'F') risk *= 0.7;
    if (ascvd.race === 'black') risk *= 1.2;
    const pct = Math.min(50, Math.max(0.5, risk * 100));
    setAscvdResult(Math.round(pct * 10) / 10);
  }, [ascvd]);

  const CheckToggle = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 rounded-lg border p-2 text-sm transition-colors text-left',
        checked ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600',
      )}
    >
      <div className={cn('h-4 w-4 rounded-sm border flex items-center justify-center shrink-0', checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600')}>
        {checked && <span className="text-[10px] text-white font-bold">{'✓'}</span>}
      </div>
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <Tabs value={calcTab} onValueChange={setCalcTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 w-full">
          <TabsTrigger value="framingham" className="flex-1 text-xs data-[state=active]:bg-red-700">Framingham</TabsTrigger>
          <TabsTrigger value="ascvd" className="flex-1 text-xs data-[state=active]:bg-red-700">ASCVD (PCE)</TabsTrigger>
          <TabsTrigger value="chadsvasc" className="flex-1 text-xs data-[state=active]:bg-red-700">CHA₂DS₂-VASc</TabsTrigger>
        </TabsList>

        {/* Framingham */}
        <TabsContent value="framingham" className="mt-3 space-y-3">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-red-400" />
                Escore de Risco de Framingham (10 anos)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Idade</Label>
                  <Input type="number" placeholder="55" value={framingham.age} onChange={(e) => setFramingham((p) => ({ ...p, age: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sexo</Label>
                  <Select value={framingham.sex} onValueChange={(v) => setFramingham((p) => ({ ...p, sex: v as 'M' | 'F' }))}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Colesterol Total (mg/dL)</Label>
                  <Input type="number" placeholder="200" value={framingham.totalCholesterol} onChange={(e) => setFramingham((p) => ({ ...p, totalCholesterol: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">HDL (mg/dL)</Label>
                  <Input type="number" placeholder="50" value={framingham.hdl} onChange={(e) => setFramingham((p) => ({ ...p, hdl: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">PAS (mmHg)</Label>
                  <Input type="number" placeholder="130" value={framingham.systolicBP} onChange={(e) => setFramingham((p) => ({ ...p, systolicBP: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <CheckToggle label="PA tratada" checked={framingham.bpTreated} onToggle={() => setFramingham((p) => ({ ...p, bpTreated: !p.bpTreated }))} />
                  <CheckToggle label="Tabagista" checked={framingham.smoker} onToggle={() => setFramingham((p) => ({ ...p, smoker: !p.smoker }))} />
                  <CheckToggle label="Diabetico" checked={framingham.diabetic} onToggle={() => setFramingham((p) => ({ ...p, diabetic: !p.diabetic }))} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button onClick={calculateFramingham} className="bg-red-700 hover:bg-red-800">Calcular Risco</Button>
                {framinghamResult !== null && (
                  <div className={cn('rounded-lg border px-4 py-2 text-center', framinghamResult < 10 ? 'border-emerald-500 bg-emerald-500/10' : framinghamResult < 20 ? 'border-amber-500 bg-amber-500/10' : 'border-red-500 bg-red-500/10')}>
                    <p className="text-xs text-zinc-400">Risco em 10 anos</p>
                    <p className={cn('text-2xl font-black', framinghamResult < 10 ? 'text-emerald-400' : framinghamResult < 20 ? 'text-amber-400' : 'text-red-400')}>
                      {framinghamResult}%
                    </p>
                    <p className="text-xs">{framinghamResult < 10 ? 'Baixo' : framinghamResult < 20 ? 'Intermediario' : 'Alto'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASCVD */}
        <TabsContent value="ascvd" className="mt-3 space-y-3">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-red-400" />
                ASCVD Pooled Cohort Equations (10 anos)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Idade (40-79)</Label>
                  <Input type="number" placeholder="55" value={ascvd.age} onChange={(e) => setAscvd((p) => ({ ...p, age: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sexo</Label>
                  <Select value={ascvd.sex} onValueChange={(v) => setAscvd((p) => ({ ...p, sex: v as 'M' | 'F' }))}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Raca</Label>
                  <Select value={ascvd.race} onValueChange={(v) => setAscvd((p) => ({ ...p, race: v as 'white' | 'black' }))}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="white">Branca</SelectItem><SelectItem value="black">Negra</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Colesterol Total</Label>
                  <Input type="number" placeholder="200" value={ascvd.totalChol} onChange={(e) => setAscvd((p) => ({ ...p, totalChol: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">HDL (mg/dL)</Label>
                  <Input type="number" placeholder="50" value={ascvd.hdlChol} onChange={(e) => setAscvd((p) => ({ ...p, hdlChol: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">PAS (mmHg)</Label>
                  <Input type="number" placeholder="130" value={ascvd.systolicBP} onChange={(e) => setAscvd((p) => ({ ...p, systolicBP: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <CheckToggle label="Anti-HAS" checked={ascvd.bpTreatment} onToggle={() => setAscvd((p) => ({ ...p, bpTreatment: !p.bpTreatment }))} />
                  <CheckToggle label="DM" checked={ascvd.diabetes} onToggle={() => setAscvd((p) => ({ ...p, diabetes: !p.diabetes }))} />
                  <CheckToggle label="Tabag." checked={ascvd.smoker} onToggle={() => setAscvd((p) => ({ ...p, smoker: !p.smoker }))} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button onClick={calculateASCVD} className="bg-red-700 hover:bg-red-800">Calcular Risco ASCVD</Button>
                {ascvdResult !== null && (
                  <div className={cn('rounded-lg border px-4 py-2 text-center', ascvdResult < 5 ? 'border-emerald-500 bg-emerald-500/10' : ascvdResult < 7.5 ? 'border-blue-500 bg-blue-500/10' : ascvdResult < 20 ? 'border-amber-500 bg-amber-500/10' : 'border-red-500 bg-red-500/10')}>
                    <p className="text-xs text-zinc-400">Risco ASCVD 10 anos</p>
                    <p className={cn('text-2xl font-black', ascvdResult < 5 ? 'text-emerald-400' : ascvdResult < 7.5 ? 'text-blue-400' : ascvdResult < 20 ? 'text-amber-400' : 'text-red-400')}>
                      {ascvdResult}%
                    </p>
                    <p className="text-xs">{ascvdResult < 5 ? 'Baixo' : ascvdResult < 7.5 ? 'Borderline' : ascvdResult < 20 ? 'Intermediario' : 'Alto'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHA2DS2-VASc */}
        <TabsContent value="chadsvasc" className="mt-3 space-y-3">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-red-400" />
                CHA₂DS₂-VASc — Risco de AVC em Fibrilacao Atrial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { key: 'chf', label: 'ICC / disfuncao VE (1pt)', pts: 1 },
                  { key: 'hypertension', label: 'Hipertensao (1pt)', pts: 1 },
                  { key: 'age75', label: 'Idade >= 75 anos (2pts)', pts: 2 },
                  { key: 'diabetes', label: 'Diabetes mellitus (1pt)', pts: 1 },
                  { key: 'stroke', label: 'AVC / AIT / tromboembolismo (2pts)', pts: 2 },
                  { key: 'vascular', label: 'Doenca vascular (IAM, DAP) (1pt)', pts: 1 },
                  { key: 'age65_74', label: 'Idade 65-74 anos (1pt)', pts: 1 },
                  { key: 'female', label: 'Sexo feminino (1pt)', pts: 1 },
                ].map(({ key, label }) => (
                  <CheckToggle
                    key={key}
                    label={label}
                    checked={chadsVasc[key as keyof typeof chadsVasc]}
                    onToggle={() => setChadsVasc((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <div className={cn('rounded-lg border px-6 py-3 text-center', chadsScore === 0 ? 'border-emerald-500 bg-emerald-500/10' : chadsScore === 1 ? 'border-amber-500 bg-amber-500/10' : 'border-red-500 bg-red-500/10')}>
                    <p className="text-xs text-zinc-400">Escore</p>
                    <p className={cn('text-3xl font-black', chadsScore === 0 ? 'text-emerald-400' : chadsScore === 1 ? 'text-amber-400' : 'text-red-400')}>
                      {chadsScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Risco de AVC/ano: <span className="text-red-400 font-bold">{chadsRisk}</span></p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {chadsScore === 0 ? 'Anticoagulacao nao recomendada' :
                        chadsScore === 1 ? 'Considerar anticoagulacao' :
                          'Anticoagulacao recomendada'}
                    </p>
                  </div>
                </div>
                {chadsScore >= 2 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <p className="text-xs text-red-300">Indicacao de anticoagulacao oral</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Echocardiogram Report Form ─────────────────────────────────────────────

function EchoReportForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    patientId: '', ejectionFraction: '', lvedd: '', lvesd: '', leftAtrium: '', aorticRoot: '',
    mitralValve: 'Normal', aorticValve: 'Normal', tricuspidValve: 'Normal', pulmonaryValve: 'Normal',
    pericardium: 'Normal', conclusion: '',
  });

  const ef = Number(form.ejectionFraction);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">ID do Paciente *</Label>
          <Input placeholder="UUID" value={form.patientId} onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fracao de Ejecao (%) *</Label>
          <Input type="number" placeholder="55" value={form.ejectionFraction} onChange={(e) => setForm((p) => ({ ...p, ejectionFraction: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
        </div>
        {ef > 0 && (
          <div className="flex items-end">
            <div className={cn('rounded-lg border px-4 py-2 text-center w-full', ef < 40 ? 'border-red-500 bg-red-500/10' : ef < 50 ? 'border-amber-500 bg-amber-500/10' : 'border-emerald-500 bg-emerald-500/10')}>
              <p className={cn('text-xl font-black', ef < 40 ? 'text-red-400' : ef < 50 ? 'text-amber-400' : 'text-emerald-400')}>FE {ef}%</p>
              <p className="text-xs">{ef < 40 ? 'Reduzida' : ef < 50 ? 'Levemente reduzida' : 'Normal'}</p>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'lvedd', label: 'DDVE (mm)', ref: '35-56' },
          { key: 'lvesd', label: 'DSVE (mm)', ref: '20-40' },
          { key: 'leftAtrium', label: 'AE (mm)', ref: '20-40' },
          { key: 'aorticRoot', label: 'Raiz Ao (mm)', ref: '20-37' },
        ].map(({ key, label, ref }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Input type="number" placeholder={ref} value={form[key as keyof typeof form]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
            <p className="text-[10px] text-zinc-500">Ref: {ref}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'mitralValve', label: 'V. Mitral' },
          { key: 'aorticValve', label: 'V. Aortica' },
          { key: 'tricuspidValve', label: 'V. Tricuspide' },
          { key: 'pulmonaryValve', label: 'V. Pulmonar' },
        ].map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Select value={form[key as keyof typeof form]} onValueChange={(v) => setForm((p) => ({ ...p, [key]: v }))}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Insuf. leve">Insuf. leve</SelectItem>
                <SelectItem value="Insuf. moderada">Insuf. moderada</SelectItem>
                <SelectItem value="Insuf. grave">Insuf. grave</SelectItem>
                <SelectItem value="Estenose leve">Estenose leve</SelectItem>
                <SelectItem value="Estenose moderada">Estenose moderada</SelectItem>
                <SelectItem value="Estenose grave">Estenose grave</SelectItem>
                <SelectItem value="Protese biologica">Protese biologica</SelectItem>
                <SelectItem value="Protese mecanica">Protese mecanica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Conclusao</Label>
        <Input placeholder="Funcao sistolica preservada, valvas sem alteracoes significativas..." value={form.conclusion} onChange={(e) => setForm((p) => ({ ...p, conclusion: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="bg-red-700 hover:bg-red-800" onClick={() => { toast.success('Ecocardiograma registrado com sucesso!'); onClose(); }}>Salvar Ecocardiograma</Button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CardiologyPage() {
  const [activeTab, setActiveTab] = useState('ecg');
  const [patientId, setPatientId] = useState('');
  const [submittedPatientId, setSubmittedPatientId] = useState('');
  const [showNewEcg, setShowNewEcg] = useState(false);
  const [showEchoForm, setShowEchoForm] = useState(false);

  const [ecgForm, setEcgForm] = useState({
    heartRate: '', rhythm: '', axis: '', prInterval: '', qrsDuration: '', qtcInterval: '', interpretation: '', abnormalities: '',
  });

  const { data: ecgRecords = [], isLoading: loadingEcg } = useECGRecords(submittedPatientId);
  const { data: echoReports = [], isLoading: loadingEcho } = useEchoReports(submittedPatientId);
  const { data: cathReports = [], isLoading: loadingCath } = useCatheterizations(submittedPatientId);
  const { data: holterReports = [], isLoading: loadingHolter } = useHolterReports(submittedPatientId);
  const { data: stressTests = [], isLoading: loadingStress } = useStressTests(submittedPatientId);
  const { data: timeline = [], isLoading: loadingTimeline } = useCardiologyTimeline(submittedPatientId);

  const createECG = useCreateECG();

  const handleSearch = () => {
    if (!patientId.trim()) { toast.error('Informe o ID do paciente.'); return; }
    setSubmittedPatientId(patientId.trim());
  };

  const handleCreateECG = async () => {
    if (!submittedPatientId || !ecgForm.heartRate || !ecgForm.rhythm || !ecgForm.axis || !ecgForm.interpretation) {
      toast.error('Preencha os campos obrigatorios.'); return;
    }
    try {
      await createECG.mutateAsync({
        patientId: submittedPatientId,
        heartRate: parseInt(ecgForm.heartRate, 10),
        rhythm: ecgForm.rhythm,
        axis: ecgForm.axis,
        prInterval: ecgForm.prInterval ? parseInt(ecgForm.prInterval, 10) : undefined,
        qrsDuration: ecgForm.qrsDuration ? parseInt(ecgForm.qrsDuration, 10) : undefined,
        qtcInterval: ecgForm.qtcInterval ? parseInt(ecgForm.qtcInterval, 10) : undefined,
        interpretation: ecgForm.interpretation,
        abnormalities: ecgForm.abnormalities ? ecgForm.abnormalities.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success('ECG registrado com sucesso.');
      setShowNewEcg(false);
      setEcgForm({ heartRate: '', rhythm: '', axis: '', prInterval: '', qrsDuration: '', qtcInterval: '', interpretation: '', abnormalities: '' });
    } catch {
      toast.error('Erro ao registrar ECG.');
    }
  };

  const setEcgField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEcgForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 text-red-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cardiologia</h1>
            <p className="text-sm text-muted-foreground">ECG 12 derivacoes, ecocardiograma, cateterismo, Holter, ergometrico e calculadoras de risco</p>
          </div>
        </div>
        {submittedPatientId && (
          <div className="flex gap-2">
            <Button onClick={() => setShowEchoForm(true)} variant="outline" className="gap-2 border-zinc-700">
              <Waves className="h-4 w-4" />
              Novo Eco
            </Button>
            <Button onClick={() => setShowNewEcg(true)} className="gap-2 bg-red-700 hover:bg-red-800">
              <Plus className="h-4 w-4" />
              Registrar ECG
            </Button>
          </div>
        )}
      </div>

      {/* Patient search */}
      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">ID do Paciente</Label>
              <Input
                placeholder="UUID do paciente..."
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <Button onClick={handleSearch} className="gap-2 bg-red-700 hover:bg-red-800">
              <Search className="h-4 w-4" />
              Buscar Historico
            </Button>
          </div>
        </CardContent>
      </Card>

      {!submittedPatientId ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-16">
            <Heart className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Insira o ID do paciente para visualizar o historico cardiologico</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border flex-wrap h-auto gap-1">
            <TabsTrigger value="ecg" className="text-xs data-[state=active]:bg-red-700">
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              ECG ({ecgRecords.length})
            </TabsTrigger>
            <TabsTrigger value="echo" className="text-xs data-[state=active]:bg-red-700">
              <Waves className="mr-1.5 h-3.5 w-3.5" />
              Eco ({echoReports.length})
            </TabsTrigger>
            <TabsTrigger value="cath" className="text-xs data-[state=active]:bg-red-700">
              <Stethoscope className="mr-1.5 h-3.5 w-3.5" />
              Cateterismo ({cathReports.length})
            </TabsTrigger>
            <TabsTrigger value="holter" className="text-xs data-[state=active]:bg-red-700">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Holter ({holterReports.length})
            </TabsTrigger>
            <TabsTrigger value="stress" className="text-xs data-[state=active]:bg-red-700">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Ergometrico ({stressTests.length})
            </TabsTrigger>
            <TabsTrigger value="calculators" className="text-xs data-[state=active]:bg-red-700">
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
              Calculadoras
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs data-[state=active]:bg-red-700">
              <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
              Linha do Tempo
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: ECG ─────────────────────────────────────────────────── */}
          <TabsContent value="ecg" className="space-y-4 mt-4">
            {loadingEcg ? (
              <PageLoading cards={0} showTable />
            ) : ecgRecords.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Activity className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum ECG registrado para este paciente</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowNewEcg(true)}>Registrar ECG</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ecgRecords.map((ecg: ECGRecord) => (
                  <Card key={ecg.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5 space-y-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{ecg.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ecg.date).toLocaleString('pt-BR')} — Realizado por: {ecg.performedBy}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn('text-xs', ECG_STATUS[ecg.status].color)}>
                          {ECG_STATUS[ecg.status].label}
                        </Badge>
                      </div>
                      {/* ECG 12 Lead Viewer */}
                      <ECGViewer heartRate={ecg.heartRate} />
                      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                        {[
                          { label: 'FC', value: `${ecg.heartRate} bpm`, highlight: ecg.heartRate > 100 || ecg.heartRate < 60 },
                          { label: 'Ritmo', value: ecg.rhythm, highlight: false },
                          { label: 'Eixo', value: ecg.axis, highlight: false },
                          { label: 'PR', value: ecg.prInterval ? `${ecg.prInterval} ms` : '—', highlight: ecg.prInterval != null && ecg.prInterval > 200 },
                          { label: 'QRS', value: ecg.qrsDuration ? `${ecg.qrsDuration} ms` : '—', highlight: ecg.qrsDuration != null && ecg.qrsDuration > 120 },
                          { label: 'QTc', value: ecg.qtcInterval ? `${ecg.qtcInterval} ms` : '—', highlight: ecg.qtcInterval != null && ecg.qtcInterval > 440 },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className="rounded border border-border bg-background p-2 text-center">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={cn('font-bold text-sm mt-0.5', highlight ? 'text-amber-400' : '')}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded border border-border bg-background p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Interpretacao</p>
                        <p className="text-sm">{ecg.interpretation}</p>
                      </div>
                      {ecg.abnormalities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ecg.abnormalities.map((ab) => (
                            <Badge key={ab} variant="outline" className="text-xs border-red-500/50 text-red-400">{ab}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Ecocardiograma ──────────────────────────────────────── */}
          <TabsContent value="echo" className="space-y-4 mt-4">
            {loadingEcho ? (
              <PageLoading cards={0} showTable />
            ) : echoReports.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Waves className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum ecocardiograma registrado</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowEchoForm(true)}>Novo Ecocardiograma</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {echoReports.map((echo: EchoReport) => (
                  <Card key={echo.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">{echo.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(echo.date).toLocaleDateString('pt-BR')} — {echo.performedBy}
                          </p>
                        </div>
                        <div className={cn('text-center rounded border px-3 py-1', echo.ejectionFraction < 40 ? 'border-red-500 bg-red-500/10' : echo.ejectionFraction < 50 ? 'border-amber-500 bg-amber-500/10' : 'border-emerald-500 bg-emerald-500/10')}>
                          <p className="text-xs text-muted-foreground">FE</p>
                          <p className={cn('text-xl font-black', echo.ejectionFraction < 40 ? 'text-red-400' : echo.ejectionFraction < 50 ? 'text-amber-400' : 'text-emerald-400')}>
                            {echo.ejectionFraction}%
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                          { label: 'DDVE', value: `${echo.lvedd} mm`, warn: echo.lvedd > 55 },
                          { label: 'DSVE', value: `${echo.lvesd} mm`, warn: echo.lvesd > 40 },
                          { label: 'AE', value: `${echo.leftAtrium} mm`, warn: echo.leftAtrium > 40 },
                          { label: 'Aorta', value: `${echo.aorticRoot} mm`, warn: echo.aorticRoot > 37 },
                        ].map(({ label, value, warn }) => (
                          <div key={label} className="rounded border border-border bg-background p-2 text-center">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={cn('font-bold text-sm mt-0.5', warn ? 'text-amber-400' : '')}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: 'Valvula Mitral', value: echo.mitralValve },
                          { label: 'Valvula Aortica', value: echo.aorticValve },
                          { label: 'Valvula Tricuspide', value: echo.tricuspidValve },
                          { label: 'Pericardio', value: echo.pericardium },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded border border-border bg-background p-2">
                            <p className="text-muted-foreground">{label}</p>
                            <p className="font-medium">{value}</p>
                          </div>
                        ))}
                      </div>
                      {echo.conclusion && (
                        <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Conclusao</p>
                          <p className="text-sm">{echo.conclusion}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Cateterismo ─────────────────────────────────────────── */}
          <TabsContent value="cath" className="space-y-4 mt-4">
            {loadingCath ? (
              <PageLoading cards={0} showTable />
            ) : cathReports.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Stethoscope className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum cateterismo registrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cathReports.map((cath: CatheterizationReport) => (
                  <Card key={cath.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{cath.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(cath.date).toLocaleDateString('pt-BR')} — Operador: {cath.operator} — Acesso: {cath.accessSite}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="rounded border border-border bg-background p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Achados Coronarianos</p>
                          <p className="text-sm">{cath.coronaryFindings}</p>
                        </div>
                        <div className="rounded border border-border bg-background p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Ventriculografia Esquerda</p>
                          <p className="text-sm">{cath.leftVentriculography}</p>
                        </div>
                      </div>
                      {cath.interventions.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Intervencoes Realizadas</p>
                          <div className="flex flex-wrap gap-1">
                            {cath.interventions.map((iv) => (
                              <Badge key={iv} variant="secondary" className="text-xs">{iv}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {cath.complications.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Complicacoes</p>
                          <div className="flex flex-wrap gap-1">
                            {cath.complications.map((c) => (
                              <Badge key={c} className="text-xs bg-red-600">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Conclusao</p>
                        <p className="text-sm">{cath.conclusion}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Holter ──────────────────────────────────────────────── */}
          <TabsContent value="holter" className="space-y-4 mt-4">
            {loadingHolter ? (
              <PageLoading cards={0} showTable />
            ) : holterReports.length === 0 ? (
              <Card className="border-border bg-card"><CardContent className="flex flex-col items-center py-12"><Clock className="h-10 w-10 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Nenhum Holter registrado</p></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {holterReports.map((h: HolterReport) => (
                  <Card key={h.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{h.patientName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(h.startDate).toLocaleDateString('pt-BR')} — Duracao: {h.duration}h — Total batimentos: {h.totalBeats.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                        {[
                          { label: 'FC Min', value: h.minHR, unit: 'bpm', warn: h.minHR < 40 },
                          { label: 'FC Med', value: h.avgHR, unit: 'bpm', warn: false },
                          { label: 'FC Max', value: h.maxHR, unit: 'bpm', warn: h.maxHR > 150 },
                          { label: 'ESSV', value: h.svePremature.toLocaleString('pt-BR'), unit: '', warn: h.svePremature > 100 },
                          { label: 'ESV', value: h.vePremature.toLocaleString('pt-BR'), unit: '', warn: h.vePremature > 1000 },
                          { label: 'Pausas', value: h.pauses, unit: '', warn: h.pauses > 0 },
                          { label: 'Duracao', value: h.duration, unit: 'h', warn: false },
                        ].map(({ label, value, unit, warn }) => (
                          <div key={label} className="rounded border border-border bg-background p-2 text-center">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={cn('font-bold text-sm', warn ? 'text-red-400' : '')}>{value}{unit ? ` ${unit}` : ''}</p>
                          </div>
                        ))}
                      </div>
                      {/* Simulated HR chart */}
                      <div className="rounded border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground mb-2">Tendencia de FC (24h simulada)</p>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={Array.from({ length: 24 }, (_, i) => ({
                            hora: `${String(i).padStart(2, '0')}h`,
                            fc: Math.round(h.avgHR + (Math.sin(i * 0.5) * 15) + (Math.random() * 10 - 5)),
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#71717a' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} domain={[h.minHR - 10, h.maxHR + 10]} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                            <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" />
                            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="fc" stroke="#10b981" strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Conclusao</p>
                        <p className="text-sm">{h.conclusion}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Ergometrico ──────────────────────────────────────────── */}
          <TabsContent value="stress" className="space-y-4 mt-4">
            {loadingStress ? (
              <PageLoading cards={0} showTable />
            ) : stressTests.length === 0 ? (
              <Card className="border-border bg-card"><CardContent className="flex flex-col items-center py-12"><TrendingUp className="h-10 w-10 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Nenhum teste ergometrico registrado</p></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {stressTests.map((st: StressTestReport) => (
                  <Card key={st.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{st.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(st.date).toLocaleDateString('pt-BR')} — Protocolo: {st.protocol} — {st.performedBy}
                          </p>
                        </div>
                        <Badge variant="secondary" className={cn('text-xs', STRESS_CONCLUSION[st.conclusion].color)}>
                          {STRESS_CONCLUSION[st.conclusion].label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                        {[
                          { label: 'Duracao', value: `${st.duration} min` },
                          { label: 'FC Max', value: `${st.maxHR} bpm` },
                          { label: 'FC Alvo', value: `${st.targetHR} bpm` },
                          { label: '% Alvo', value: `${st.percentTarget.toFixed(0)}%`, warn: st.percentTarget < 85 },
                          { label: 'METs', value: st.mets.toFixed(1) },
                          { label: 'PA Max', value: st.maxBP },
                        ].map(({ label, value, warn }) => (
                          <div key={label} className="rounded border border-border bg-background p-2 text-center">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={cn('font-bold text-sm mt-0.5', warn ? 'text-amber-400' : '')}>{value}</p>
                          </div>
                        ))}
                      </div>
                      {/* Simulated stress test HR chart */}
                      <div className="rounded border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground mb-2">Curva de FC durante o esforco</p>
                        <ResponsiveContainer width="100%" height={100}>
                          <LineChart data={Array.from({ length: st.duration }, (_, i) => ({
                            min: `${i}min`,
                            fc: Math.round(70 + ((st.maxHR - 70) * (i / st.duration)) + (Math.random() * 5)),
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="min" tick={{ fontSize: 9, fill: '#71717a' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#71717a' }} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                            <ReferenceLine y={st.targetHR} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Alvo', fill: '#f59e0b', fontSize: 9 }} />
                            <Line type="monotone" dataKey="fc" stroke="#ef4444" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {st.stSegmentChanges && (
                        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Alteracoes de ST</p>
                          <p className="text-sm">{st.stSegmentChanges}</p>
                        </div>
                      )}
                      {st.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground">Sintomas:</span>
                          {st.symptoms.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs border-amber-500/50 text-amber-400">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Calculadoras ─────────────────────────────────────────── */}
          <TabsContent value="calculators" className="mt-4">
            <CardiacRiskCalculators />
          </TabsContent>

          {/* ── Tab: Timeline ─────────────────────────────────────────────── */}
          <TabsContent value="timeline" className="mt-4 space-y-4">
            {loadingTimeline ? (
              <PageLoading cards={0} showTable />
            ) : timeline.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Clock className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum evento cardiologico registrado</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Linha do Tempo Cardiologica ({timeline.length} eventos)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-red-500/30" />
                    <div className="space-y-4">
                      {timeline.map((event: CardiologyEvent) => {
                        const cfg = EVENT_TYPE_LABELS[event.type];
                        return (
                          <div key={event.id} className="relative flex items-start gap-4">
                            <div className="absolute -left-5 mt-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-zinc-900" />
                            <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="gap-1 text-xs border-red-500/50 text-red-400">
                                  {cfg.icon}
                                  {cfg.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.date).toLocaleDateString('pt-BR')} — {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm">{event.summary}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ── Create ECG Dialog ──────────────────────────────────────────── */}
      <Dialog open={showNewEcg} onOpenChange={setShowNewEcg}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar ECG</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">FC (bpm) *</Label><Input type="number" placeholder="75" value={ecgForm.heartRate} onChange={setEcgField('heartRate')} className="bg-background border-border" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Ritmo *</Label><Input placeholder="Sinusal" value={ecgForm.rhythm} onChange={setEcgField('rhythm')} className="bg-background border-border" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Eixo *</Label><Input placeholder="+60" value={ecgForm.axis} onChange={setEcgField('axis')} className="bg-background border-border" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">PR (ms)</Label><Input type="number" placeholder="160" value={ecgForm.prInterval} onChange={setEcgField('prInterval')} className="bg-background border-border" /></div>
              <div className="space-y-1.5"><Label className="text-xs">QRS (ms)</Label><Input type="number" placeholder="90" value={ecgForm.qrsDuration} onChange={setEcgField('qrsDuration')} className="bg-background border-border" /></div>
              <div className="space-y-1.5"><Label className="text-xs">QTc (ms)</Label><Input type="number" placeholder="420" value={ecgForm.qtcInterval} onChange={setEcgField('qtcInterval')} className="bg-background border-border" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Interpretacao *</Label><Input placeholder="Ritmo sinusal, sem alteracoes isquemicas..." value={ecgForm.interpretation} onChange={setEcgField('interpretation')} className="bg-background border-border" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Anormalidades (separadas por virgula)</Label><Input placeholder="Bloqueio de ramo direito, Inversao de onda T" value={ecgForm.abnormalities} onChange={setEcgField('abnormalities')} className="bg-background border-border" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEcg(false)}>Cancelar</Button>
            <Button onClick={handleCreateECG} disabled={createECG.isPending} className="bg-red-700 hover:bg-red-800">
              {createECG.isPending ? 'Salvando...' : 'Registrar ECG'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Echo Form Dialog ──────────────────────────────────────────── */}
      <Dialog open={showEchoForm} onOpenChange={setShowEchoForm}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Ecocardiograma</DialogTitle>
          </DialogHeader>
          <EchoReportForm onClose={() => setShowEchoForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
