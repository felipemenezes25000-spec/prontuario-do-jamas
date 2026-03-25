import { useState, useMemo } from 'react';
import { Baby, TrendingUp, Syringe, Star, Calculator, Plus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import {
  usePediatricPatients,
  useGrowthData,
  useCreateGrowthMeasurement,
  useVaccinations,
  useAdministerVaccine,
  useMilestones,
  useCalculateDose,
  type PediatricPatient,
  type GrowthMeasurement,
  type Vaccination,
  type DevelopmentalMilestone,
} from '@/services/pediatrics.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const VACCINE_STATUS_COLORS: Record<Vaccination['status'], string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  ADMINISTERED: 'bg-emerald-500/20 text-emerald-400',
  DELAYED: 'bg-yellow-500/20 text-yellow-400',
  CONTRAINDICATED: 'bg-red-500/20 text-red-400',
};

const VACCINE_STATUS_LABELS: Record<Vaccination['status'], string> = {
  SCHEDULED: 'Agendada',
  ADMINISTERED: 'Aplicada',
  DELAYED: 'Atrasada',
  CONTRAINDICATED: 'Contraindicada',
};

const MILESTONE_CATEGORY_LABELS: Record<DevelopmentalMilestone['category'], string> = {
  MOTOR: 'Motor',
  LANGUAGE: 'Linguagem',
  SOCIAL: 'Social',
  COGNITIVE: 'Cognitivo',
};

const MILESTONE_STATUS_LABELS: Record<DevelopmentalMilestone['status'], { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-blue-500/20 text-blue-400' },
  ACHIEVED: { label: 'Atingido', color: 'bg-emerald-500/20 text-emerald-400' },
  DELAYED: { label: 'Atrasado', color: 'bg-red-500/20 text-red-400' },
  NOT_ASSESSED: { label: 'Nao avaliado', color: 'bg-zinc-500/20 text-zinc-400' },
};

// WHO growth percentile reference curves (simplified)
const WHO_WEIGHT_BOYS = [
  { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { month: 3, p3: 5.0, p15: 5.6, p50: 6.4, p85: 7.2, p97: 7.9 },
  { month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.5 },
  { month: 9, p3: 7.2, p15: 8.0, p50: 8.9, p85: 9.9, p97: 10.7 },
  { month: 12, p3: 7.8, p15: 8.6, p50: 9.6, p85: 10.8, p97: 11.8 },
  { month: 18, p3: 8.8, p15: 9.7, p50: 10.9, p85: 12.2, p97: 13.4 },
  { month: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.0 },
  { month: 36, p3: 11.3, p15: 12.5, p50: 14.3, p85: 16.2, p97: 18.0 },
  { month: 48, p3: 12.7, p15: 14.1, p50: 16.3, p85: 18.6, p97: 20.9 },
  { month: 60, p3: 14.1, p15: 15.7, p50: 18.3, p85: 21.2, p97: 24.2 },
];

const WHO_HEIGHT_BOYS = [
  { month: 0, p3: 46.1, p15: 47.5, p50: 49.9, p85: 52.0, p97: 53.7 },
  { month: 3, p3: 57.3, p15: 58.8, p50: 61.4, p85: 63.5, p97: 65.0 },
  { month: 6, p3: 63.3, p15: 65.0, p50: 67.6, p85: 69.9, p97: 71.6 },
  { month: 9, p3: 67.5, p15: 69.2, p50: 72.0, p85: 74.4, p97: 76.2 },
  { month: 12, p3: 71.0, p15: 72.8, p50: 75.7, p85: 78.3, p97: 80.2 },
  { month: 18, p3: 76.9, p15: 78.9, p50: 82.3, p85: 85.1, p97: 87.2 },
  { month: 24, p3: 81.7, p15: 84.0, p50: 87.8, p85: 91.0, p97: 93.3 },
  { month: 36, p3: 89.5, p15: 92.0, p50: 96.1, p85: 99.8, p97: 102.3 },
  { month: 48, p3: 95.8, p15: 98.5, p50: 103.3, p85: 107.5, p97: 110.3 },
  { month: 60, p3: 101.2, p15: 104.2, p50: 110.0, p85: 114.5, p97: 117.5 },
];

// PNI (Programa Nacional de Imunizacoes) Brazil vaccine schedule
const PNI_SCHEDULE = [
  { age: 'Ao nascer', vaccines: ['BCG', 'Hepatite B (1a dose)'] },
  { age: '2 meses', vaccines: ['Pentavalente (1a dose)', 'VIP (1a dose)', 'Pneumo 10 (1a dose)', 'Rotavirus (1a dose)'] },
  { age: '3 meses', vaccines: ['Meningococica C (1a dose)'] },
  { age: '4 meses', vaccines: ['Pentavalente (2a dose)', 'VIP (2a dose)', 'Pneumo 10 (2a dose)', 'Rotavirus (2a dose)'] },
  { age: '5 meses', vaccines: ['Meningococica C (2a dose)'] },
  { age: '6 meses', vaccines: ['Pentavalente (3a dose)', 'VIP (3a dose)', 'Influenza (1a dose)'] },
  { age: '9 meses', vaccines: ['Febre Amarela (1a dose)'] },
  { age: '12 meses', vaccines: ['Triplice viral (1a dose)', 'Pneumo 10 (reforco)', 'Meningococica C (reforco)'] },
  { age: '15 meses', vaccines: ['DTP (1o reforco)', 'VOP (1o reforco)', 'Hepatite A', 'Tetraviral'] },
  { age: '4 anos', vaccines: ['DTP (2o reforco)', 'VOP (2o reforco)', 'Febre Amarela (reforco)', 'Varicela (2a dose)'] },
];

// Denver II developmental milestones reference
const DENVER_MILESTONES = [
  { category: 'MOTOR' as const, milestone: 'Sustenta a cabeca', expectedAge: 3 },
  { category: 'MOTOR' as const, milestone: 'Rola', expectedAge: 5 },
  { category: 'MOTOR' as const, milestone: 'Senta sem apoio', expectedAge: 7 },
  { category: 'MOTOR' as const, milestone: 'Engatinha', expectedAge: 9 },
  { category: 'MOTOR' as const, milestone: 'Anda com apoio', expectedAge: 11 },
  { category: 'MOTOR' as const, milestone: 'Anda sozinho', expectedAge: 13 },
  { category: 'MOTOR' as const, milestone: 'Corre', expectedAge: 18 },
  { category: 'LANGUAGE' as const, milestone: 'Balbucia', expectedAge: 4 },
  { category: 'LANGUAGE' as const, milestone: 'Primeiras palavras', expectedAge: 12 },
  { category: 'LANGUAGE' as const, milestone: 'Frases de 2 palavras', expectedAge: 24 },
  { category: 'LANGUAGE' as const, milestone: 'Conta historias simples', expectedAge: 48 },
  { category: 'SOCIAL' as const, milestone: 'Sorriso social', expectedAge: 2 },
  { category: 'SOCIAL' as const, milestone: 'Estranha desconhecidos', expectedAge: 8 },
  { category: 'SOCIAL' as const, milestone: 'Brinca de faz-de-conta', expectedAge: 24 },
  { category: 'SOCIAL' as const, milestone: 'Brinca cooperativamente', expectedAge: 48 },
  { category: 'COGNITIVE' as const, milestone: 'Segue objetos com os olhos', expectedAge: 2 },
  { category: 'COGNITIVE' as const, milestone: 'Pega objetos voluntariamente', expectedAge: 5 },
  { category: 'COGNITIVE' as const, milestone: 'Permanencia do objeto', expectedAge: 9 },
  { category: 'COGNITIVE' as const, milestone: 'Empilha cubos', expectedAge: 15 },
  { category: 'COGNITIVE' as const, milestone: 'Nomeia cores', expectedAge: 36 },
];

// ─── Growth Chart Component ─────────────────────────────────────────────────

function GrowthChart({ measurements, type }: { measurements: GrowthMeasurement[]; type: 'weight' | 'height' }) {
  const reference = type === 'weight' ? WHO_WEIGHT_BOYS : WHO_HEIGHT_BOYS;
  const label = type === 'weight' ? 'Peso (kg)' : 'Estatura (cm)';

  const chartData = useMemo(() => {
    const refData = reference.map((r) => ({
      month: r.month,
      p3: r.p3,
      p15: r.p15,
      p50: r.p50,
      p85: r.p85,
      p97: r.p97,
      actual: undefined as number | undefined,
    }));

    measurements.forEach((m) => {
      const val = type === 'weight' ? m.weight : m.height;
      const closest = refData.reduce((prev, curr) =>
        Math.abs(curr.month - m.ageMonths) < Math.abs(prev.month - m.ageMonths) ? curr : prev,
      );
      closest.actual = val;
    });

    return refData;
  }, [measurements, reference, type]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm font-semibold mb-3 text-emerald-400">{label} — Curva OMS (Masculino)</p>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Meses', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#71717a' }} />
          <YAxis tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: label, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }} />
          <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="p97" stackId="0" stroke="none" fill="#ef4444" fillOpacity={0.05} />
          <Area type="monotone" dataKey="p85" stackId="0" stroke="none" fill="#f59e0b" fillOpacity={0.05} />
          <Line type="monotone" dataKey="p3" stroke="#71717a" strokeWidth={1} strokeDasharray="4 4" dot={false} name="P3" />
          <Line type="monotone" dataKey="p15" stroke="#a1a1aa" strokeWidth={1} strokeDasharray="2 2" dot={false} name="P15" />
          <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} dot={false} name="P50" />
          <Line type="monotone" dataKey="p85" stroke="#a1a1aa" strokeWidth={1} strokeDasharray="2 2" dot={false} name="P85" />
          <Line type="monotone" dataKey="p97" stroke="#71717a" strokeWidth={1} strokeDasharray="4 4" dot={false} name="P97" />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} name="Paciente" connectNulls />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <span className="text-xs text-zinc-500">--- P3/P97</span>
        <span className="text-xs text-emerald-400">--- P50</span>
        <span className="text-xs text-blue-400 font-semibold">--- Paciente</span>
      </div>
    </div>
  );
}

// ─── Apgar Score Form ───────────────────────────────────────────────────────

function ApgarScoreForm() {
  const [apgar1, setApgar1] = useState({ heartRate: 0, respiration: 0, muscleTone: 0, reflex: 0, color: 0 });
  const [apgar5, setApgar5] = useState({ heartRate: 0, respiration: 0, muscleTone: 0, reflex: 0, color: 0 });

  const total1 = Object.values(apgar1).reduce((a, b) => a + b, 0);
  const total5 = Object.values(apgar5).reduce((a, b) => a + b, 0);

  const criteria = [
    { key: 'heartRate', label: 'Frequencia Cardiaca', options: ['Ausente (0)', 'Menos 100 bpm (1)', 'Mais 100 bpm (2)'] },
    { key: 'respiration', label: 'Esforco Respiratorio', options: ['Ausente (0)', 'Irregular (1)', 'Choro forte (2)'] },
    { key: 'muscleTone', label: 'Tonus Muscular', options: ['Flacido (0)', 'Alguma flexao (1)', 'Movimentos ativos (2)'] },
    { key: 'reflex', label: 'Irritabilidade Reflexa', options: ['Sem resposta (0)', 'Careta (1)', 'Choro/tosse (2)'] },
    { key: 'color', label: 'Cor', options: ['Cianose/palidez (0)', 'Acrocianose (1)', 'Rosado (2)'] },
  ];

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Baby className="h-4 w-4 text-pink-400" />
          Escore de Apgar — Recem-Nascido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: '1 Minuto', state: apgar1, setter: setApgar1, total: total1 },
            { label: '5 Minutos', state: apgar5, setter: setApgar5, total: total5 },
          ].map(({ label, state, setter, total }) => (
            <div key={label} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{label}</p>
                <div className={cn(
                  'rounded-lg border px-3 py-1 text-center min-w-[60px]',
                  total >= 7 ? 'border-emerald-500 bg-emerald-500/10' : total >= 4 ? 'border-amber-500 bg-amber-500/10' : 'border-red-500 bg-red-500/10',
                )}>
                  <p className={cn('text-xl font-black', total >= 7 ? 'text-emerald-400' : total >= 4 ? 'text-amber-400' : 'text-red-400')}>
                    {total}
                  </p>
                </div>
              </div>
              {criteria.map(({ key, label: cLabel, options }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{cLabel}</Label>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((v) => (
                      <button
                        key={v}
                        onClick={() => setter((p) => ({ ...p, [key]: v }))}
                        className={cn(
                          'flex-1 rounded border p-1.5 text-xs transition-colors',
                          state[key as keyof typeof state] === v
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                        )}
                      >
                        {options[v]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <p className="text-xs text-zinc-400 mb-1">Interpretacao</p>
          <div className="flex gap-4 text-sm">
            <span>1 min: <strong className={total1 >= 7 ? 'text-emerald-400' : total1 >= 4 ? 'text-amber-400' : 'text-red-400'}>
              {total1}/10 — {total1 >= 7 ? 'Normal' : total1 >= 4 ? 'Depressao moderada' : 'Depressao grave'}
            </strong></span>
            <span>5 min: <strong className={total5 >= 7 ? 'text-emerald-400' : total5 >= 4 ? 'text-amber-400' : 'text-red-400'}>
              {total5}/10 — {total5 >= 7 ? 'Normal' : total5 >= 4 ? 'Depressao moderada' : 'Depressao grave'}
            </strong></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Denver II Milestones Checklist ─────────────────────────────────────────

function DenverMilestoneChecklist({ ageMonths, milestones }: { ageMonths: number; milestones: DevelopmentalMilestone[] }) {
  const [checkedLocal, setCheckedLocal] = useState<Set<string>>(new Set());

  const categories = (['MOTOR', 'LANGUAGE', 'SOCIAL', 'COGNITIVE'] as const);

  const getMilestoneStatus = (m: typeof DENVER_MILESTONES[0]) => {
    const found = milestones.find((dm) => dm.milestone === m.milestone);
    if (found) return found.status;
    if (checkedLocal.has(m.milestone)) return 'ACHIEVED' as const;
    if (m.expectedAge < ageMonths - 3) return 'DELAYED' as const;
    return 'PENDING' as const;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map((cat) => {
        const catMilestones = DENVER_MILESTONES.filter((m) => m.category === cat);
        return (
          <Card key={cat} className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{MILESTONE_CATEGORY_LABELS[cat]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {catMilestones.map((m) => {
                const status = getMilestoneStatus(m);
                const cfg = MILESTONE_STATUS_LABELS[status];
                return (
                  <button
                    key={m.milestone}
                    onClick={() => {
                      setCheckedLocal((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.milestone)) next.delete(m.milestone);
                        else next.add(m.milestone);
                        return next;
                      });
                    }}
                    className={cn(
                      'flex items-center justify-between w-full rounded p-2 text-left text-sm transition-colors',
                      status === 'ACHIEVED' ? 'bg-emerald-500/5' : status === 'DELAYED' ? 'bg-red-500/5' : 'hover:bg-zinc-800',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn('h-3 w-3 rounded-full', status === 'ACHIEVED' ? 'bg-emerald-500' : status === 'DELAYED' ? 'bg-red-500' : 'bg-zinc-600')} />
                      <span className={status === 'ACHIEVED' ? 'line-through text-zinc-500' : ''}>{m.milestone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{m.expectedAge}m</span>
                      <Badge className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Pediatric Dose Calculator (Enhanced) ───────────────────────────────────

const COMMON_PEDIATRIC_MEDS = [
  { name: 'Amoxicilina', dosePerKg: 50, unit: 'mg', frequency: '8/8h', maxDose: 3000, concentration: '250mg/5mL' },
  { name: 'Ibuprofeno', dosePerKg: 10, unit: 'mg', frequency: '8/8h', maxDose: 400, concentration: '100mg/5mL' },
  { name: 'Dipirona', dosePerKg: 15, unit: 'mg', frequency: '6/6h', maxDose: 1000, concentration: '500mg/mL' },
  { name: 'Paracetamol', dosePerKg: 15, unit: 'mg', frequency: '6/6h', maxDose: 750, concentration: '200mg/mL' },
  { name: 'Amoxicilina+Clavulanato', dosePerKg: 45, unit: 'mg', frequency: '12/12h', maxDose: 2625, concentration: '400mg/5mL' },
  { name: 'Azitromicina', dosePerKg: 10, unit: 'mg', frequency: '24/24h', maxDose: 500, concentration: '200mg/5mL' },
  { name: 'Cefalexina', dosePerKg: 50, unit: 'mg', frequency: '6/6h', maxDose: 4000, concentration: '250mg/5mL' },
  { name: 'Prednisolona', dosePerKg: 1, unit: 'mg', frequency: '24/24h', maxDose: 60, concentration: '3mg/mL' },
];

function PediatricDoseCalc() {
  const [selectedMed, setSelectedMed] = useState('');
  const [weight, setWeight] = useState('');
  useCalculateDose();

  const med = COMMON_PEDIATRIC_MEDS.find((m) => m.name === selectedMed);
  const w = Number(weight);

  const localResult = useMemo(() => {
    if (!med || !w || w <= 0) return null;
    const dose = Math.min(med.dosePerKg * w, med.maxDose);
    return { dose: Math.round(dose * 100) / 100, unit: med.unit, frequency: med.frequency, maxDose: med.maxDose, concentration: med.concentration };
  }, [med, w]);

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4 text-emerald-400" />
          Calculadora de Dose Pediatrica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Medicamento</Label>
            <Select value={selectedMed} onValueChange={setSelectedMed}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {COMMON_PEDIATRIC_MEDS.map((m) => (
                  <SelectItem key={m.name} value={m.name}>{m.name} ({m.dosePerKg} {m.unit}/kg)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Peso (kg)</Label>
            <Input type="number" step="0.1" placeholder="12.5" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-zinc-950 border-zinc-700" />
          </div>
        </div>
        {localResult && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-400">Dose Calculada</p>
              <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">{selectedMed}</Badge>
            </div>
            <p className="text-3xl font-black text-emerald-400">{localResult.dose} {localResult.unit}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded bg-zinc-800 p-2">
                <p className="text-zinc-400">Frequencia</p>
                <p className="font-semibold">{localResult.frequency}</p>
              </div>
              <div className="rounded bg-zinc-800 p-2">
                <p className="text-zinc-400">Dose maxima</p>
                <p className="font-semibold">{localResult.maxDose} {localResult.unit}</p>
              </div>
              <div className="rounded bg-zinc-800 p-2">
                <p className="text-zinc-400">Apresentacao</p>
                <p className="font-semibold">{localResult.concentration}</p>
              </div>
            </div>
            {localResult.dose >= localResult.maxDose && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                <span className="text-xs text-amber-400 font-medium">Atencao: dose calculada atingiu o limite maximo</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Vaccination Schedule (PNI Brazil) ──────────────────────────────────────

function PNISchedulePanel({ vaccinations }: { vaccinations: Vaccination[] }) {
  const getVaccineStatus = (vaccineName: string) => {
    const found = vaccinations.find((v) => v.vaccineName === vaccineName);
    if (found) return found.status;
    return null;
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Syringe className="h-4 w-4 text-blue-400" />
          Calendario Nacional de Vacinacao (PNI)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {PNI_SCHEDULE.map((group) => (
            <div key={group.age} className="rounded-lg border border-zinc-800 p-3">
              <p className="text-sm font-semibold text-blue-400 mb-2">{group.age}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {group.vaccines.map((vac) => {
                  const status = getVaccineStatus(vac);
                  return (
                    <div key={vac} className={cn(
                      'flex items-center justify-between rounded p-2 text-sm',
                      status === 'ADMINISTERED' ? 'bg-emerald-500/5' : status === 'DELAYED' ? 'bg-red-500/5' : 'bg-zinc-800/50',
                    )}>
                      <span className={status === 'ADMINISTERED' ? 'text-emerald-400' : ''}>{vac}</span>
                      {status && (
                        <Badge className={cn('text-[10px]', VACCINE_STATUS_COLORS[status])}>
                          {VACCINE_STATUS_LABELS[status]}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Patient Detail Panel ───────────────────────────────────────────────────

function PatientDetailPanel({ patient }: { patient: PediatricPatient }) {
  const { data: growth = [] } = useGrowthData(patient.patientId);
  const { data: vaccinations = [] } = useVaccinations(patient.patientId);
  const { data: milestones = [] } = useMilestones(patient.patientId);
  const administerVaccine = useAdministerVaccine();

  const handleAdminister = async (v: Vaccination) => {
    try {
      await administerVaccine.mutateAsync({
        vaccinationId: v.id,
        administeredDate: new Date().toISOString().slice(0, 10),
        lot: 'A/V',
        site: 'Deltoide D',
      });
      toast.success(`Vacina ${v.vaccineName} registrada.`);
    } catch {
      toast.error('Erro ao registrar vacina.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Growth Charts */}
      {growth.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GrowthChart measurements={growth} type="weight" />
          <GrowthChart measurements={growth} type="height" />
        </div>
      )}

      {/* Pending vaccines */}
      {vaccinations.filter((v) => v.status !== 'ADMINISTERED').length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vacinas Pendentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vaccinations.filter((v) => v.status !== 'ADMINISTERED').map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50">
                  <div>
                    <p className="text-sm font-medium">{v.vaccineName} — {v.dose}</p>
                    <p className="text-xs text-muted-foreground">
                      Prevista: {new Date(v.scheduledDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', VACCINE_STATUS_COLORS[v.status])}>
                      {VACCINE_STATUS_LABELS[v.status]}
                    </Badge>
                    {v.status === 'SCHEDULED' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700"
                        onClick={() => handleAdminister(v)}
                        disabled={administerVaccine.isPending}>
                        Aplicar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Denver II Milestones */}
      <DenverMilestoneChecklist ageMonths={patient.ageMonths} milestones={milestones} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PediatricsPage() {
  const [activeTab, setActiveTab] = useState('growth');
  const [selectedPatient, setSelectedPatient] = useState<PediatricPatient | null>(null);

  const [growthOpen, setGrowthOpen] = useState(false);
  const [growthForm, setGrowthForm] = useState({
    patientId: '', date: new Date().toISOString().slice(0, 10), weight: '', height: '', headCircumference: '',
  });

  const { data: patientsData, isLoading: patientsLoading } = usePediatricPatients();
  const createGrowth = useCreateGrowthMeasurement();

  const handleCreateGrowth = async () => {
    if (!growthForm.patientId || !growthForm.weight || !growthForm.height) {
      toast.error('Preencha os campos obrigatorios.'); return;
    }
    try {
      await createGrowth.mutateAsync({
        patientId: growthForm.patientId,
        date: growthForm.date,
        weight: Number(growthForm.weight),
        height: Number(growthForm.height),
        headCircumference: growthForm.headCircumference ? Number(growthForm.headCircumference) : undefined,
      });
      toast.success('Medicao registrada com sucesso.');
      setGrowthOpen(false);
      setGrowthForm({ patientId: '', date: new Date().toISOString().slice(0, 10), weight: '', height: '', headCircumference: '' });
    } catch {
      toast.error('Erro ao registrar medicao.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Baby className="h-6 w-6 text-pink-400" />
          Pediatria
        </h1>
        <p className="text-muted-foreground">
          Curvas de crescimento OMS, calendario vacinal PNI, marcos Denver II, Apgar e calculadora de doses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Baby className="h-5 w-5 text-pink-400" />
            <div><p className="text-xs text-zinc-400">Pacientes</p><p className="text-2xl font-bold">{patientsData?.total ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Syringe className="h-5 w-5 text-amber-400" />
            <div><p className="text-xs text-zinc-400">Vacinas Atrasadas</p><p className="text-2xl font-bold text-amber-400">{patientsData?.data?.reduce((sum: number, p: PediatricPatient) => sum + p.vaccinesPending, 0) ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <div><p className="text-xs text-zinc-400">Com Medicoes</p><p className="text-2xl font-bold">{patientsData?.data?.length ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-blue-400" />
            <div><p className="text-xs text-zinc-400">Marcos Avaliados</p><p className="text-2xl font-bold">{DENVER_MILESTONES.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1">
          <TabsTrigger value="growth" className="text-xs data-[state=active]:bg-pink-700">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Curvas de Crescimento
          </TabsTrigger>
          <TabsTrigger value="vaccination" className="text-xs data-[state=active]:bg-pink-700">
            <Syringe className="mr-1.5 h-3.5 w-3.5" />
            Vacinacao PNI
          </TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs data-[state=active]:bg-pink-700">
            <Star className="mr-1.5 h-3.5 w-3.5" />
            Denver II
          </TabsTrigger>
          <TabsTrigger value="apgar" className="text-xs data-[state=active]:bg-pink-700">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Apgar
          </TabsTrigger>
          <TabsTrigger value="dose" className="text-xs data-[state=active]:bg-pink-700">
            <Calculator className="mr-1.5 h-3.5 w-3.5" />
            Dose Pediatrica
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Curvas de Crescimento ──────────────────────────────── */}
        <TabsContent value="growth" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{patientsData?.total ?? 0} pacientes pediatricos</p>
            <Button onClick={() => setGrowthOpen(true)} className="flex items-center gap-2 bg-pink-700 hover:bg-pink-800">
              <Plus className="h-4 w-4" />
              Registrar Medicao
            </Button>
          </div>

          {patientsLoading ? <PageLoading /> : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {patientsData?.data && patientsData.data.length > 0 ? patientsData.data.map((p: PediatricPatient) => {
                  const ageYears = Math.floor(p.ageMonths / 12);
                  const ageMonthsRem = p.ageMonths % 12;
                  return (
                    <Card key={p.id}
                      className={cn('cursor-pointer transition-colors hover:border-pink-500/50 bg-zinc-900 border-zinc-800', selectedPatient?.id === p.id && 'border-pink-500')}
                      onClick={() => setSelectedPatient(selectedPatient?.id === p.id ? null : p)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/20">
                            <Baby className="h-5 w-5 text-pink-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{p.patientName}</p>
                            <p className="text-xs text-zinc-400">
                              {ageYears > 0 ? `${ageYears}a ` : ''}{ageMonthsRem}m — {p.weight} kg — {p.height} cm
                            </p>
                          </div>
                          {p.vaccinesPending > 0 && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                              {p.vaccinesPending} pend.
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                }) : (
                  <div className="col-span-3 text-center text-muted-foreground py-10">Nenhum paciente pediatrico cadastrado.</div>
                )}
              </div>
              {selectedPatient && <PatientDetailPanel patient={selectedPatient} />}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Vacinacao PNI ──────────────────────────────────────── */}
        <TabsContent value="vaccination" className="space-y-4 mt-4">
          {patientsLoading ? <PageLoading /> : (
            <>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-base">Cartao de Vacinas — Resumo</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {patientsData?.data && patientsData.data.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800">
                          <TableHead>Paciente</TableHead>
                          <TableHead>Idade</TableHead>
                          <TableHead>Vacinas Pendentes</TableHead>
                          <TableHead>Proxima Consulta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientsData.data.map((p: PediatricPatient) => (
                          <TableRow key={p.id} className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50" onClick={() => setSelectedPatient(p)}>
                            <TableCell className="font-medium">{p.patientName}</TableCell>
                            <TableCell className="text-sm">
                              {Math.floor(p.ageMonths / 12) > 0 ? `${Math.floor(p.ageMonths / 12)}a ` : ''}
                              {p.ageMonths % 12}m
                            </TableCell>
                            <TableCell>
                              {p.vaccinesPending > 0 ? (
                                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                                  {p.vaccinesPending} pendente(s)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-400">Em dia</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.nextAppointment ? new Date(p.nextAppointment).toLocaleDateString('pt-BR') : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-10">Nenhum paciente cadastrado.</p>
                  )}
                </CardContent>
              </Card>
              <PNISchedulePanel vaccinations={selectedPatient ? [] : []} />
            </>
          )}
        </TabsContent>

        {/* ── Tab 3: Denver II ──────────────────────────────────────────── */}
        <TabsContent value="milestones" className="space-y-4 mt-4">
          {selectedPatient ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <Baby className="h-5 w-5 text-pink-400" />
                <div>
                  <p className="font-semibold">{selectedPatient.patientName}</p>
                  <p className="text-xs text-zinc-400">{selectedPatient.ageMonths} meses</p>
                </div>
              </div>
              <DenverMilestoneChecklist ageMonths={selectedPatient.ageMonths} milestones={[]} />
            </>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-12 text-center">
                <Star className="h-10 w-10 text-zinc-500 mx-auto" />
                <p className="text-zinc-400 mt-3">Selecione um paciente na aba Curvas de Crescimento para avaliar marcos do desenvolvimento</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 4: Apgar ──────────────────────────────────────────────── */}
        <TabsContent value="apgar" className="mt-4">
          <ApgarScoreForm />
        </TabsContent>

        {/* ── Tab 5: Dose Pediatrica ─────────────────────────────────────── */}
        <TabsContent value="dose" className="mt-4">
          <PediatricDoseCalc />
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Registrar Medicao ──────────────────────────────────── */}
      <Dialog open={growthOpen} onOpenChange={setGrowthOpen}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Registrar Medicao Antropometrica</DialogTitle>
            <DialogDescription>Registre peso, estatura e perimetro cefalico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={growthForm.patientId}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, patientId: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
              </div>
              <div className="space-y-1">
                <Label>Data da Medicao</Label>
                <Input type="date" value={growthForm.date}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, date: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Peso (kg) *</Label>
                <Input type="number" step="0.1" placeholder="10.5" value={growthForm.weight}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, weight: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
              </div>
              <div className="space-y-1">
                <Label>Estatura (cm) *</Label>
                <Input type="number" step="0.1" placeholder="75" value={growthForm.height}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, height: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
              </div>
              <div className="space-y-1">
                <Label>Per. Cefalico (cm)</Label>
                <Input type="number" step="0.1" placeholder="46" value={growthForm.headCircumference}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, headCircumference: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrowthOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleCreateGrowth} disabled={createGrowth.isPending} className="bg-pink-700 hover:bg-pink-800">
              {createGrowth.isPending ? 'Salvando...' : 'Registrar Medicao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
