import { useState, useMemo } from 'react';
import { Baby, ClipboardList, Activity, Scan, Plus, Calculator, AlertTriangle, Calendar } from 'lucide-react';
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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Bar,
} from 'recharts';
import {
  useObstetricPatients,
  useCreatePrenatalCard,
  usePartogram,
  useCreatePartogramEntry,
  useUltrasounds,
  useCreateUltrasound,
  type RiskClassification,
  type PrenatalCard,
  type PrenatalConsultation,
  type PartogramEntry,
  type UltrasoundRecord,
} from '@/services/obstetrics.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskClassification, string> = {
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  HIGH: 'bg-red-500/20 text-red-400 border-red-500',
};

const RISK_LABELS: Record<RiskClassification, string> = {
  LOW: 'Baixo Risco',
  MEDIUM: 'Risco Medio',
  HIGH: 'Alto Risco',
};

function gestationalAge(weeks: number, days: number) {
  return `${weeks}s${days > 0 ? `+${days}d` : ''}`;
}

function dppFromDum(dum: string): string {
  const d = new Date(dum);
  d.setFullYear(d.getFullYear() + 1);
  d.setMonth(d.getMonth() - 3);
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('pt-BR');
}

function igFromDum(dum: string): { weeks: number; days: number } {
  const dumDate = new Date(dum);
  const today = new Date();
  const diffMs = today.getTime() - dumDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { weeks: Math.floor(diffDays / 7), days: diffDays % 7 };
}

// ─── DUM/DPP Calculator ─────────────────────────────────────────────────────

function DumDppCalculator() {
  const [dum, setDum] = useState('');
  const [dpp, setDpp] = useState('');

  const result = useMemo(() => {
    if (!dum) return null;
    const ig = igFromDum(dum);
    const dppCalc = dppFromDum(dum);
    const trimester = ig.weeks < 14 ? '1o Trimestre' : ig.weeks < 28 ? '2o Trimestre' : '3o Trimestre';
    const trimesterColor = ig.weeks < 14 ? 'text-blue-400' : ig.weeks < 28 ? 'text-emerald-400' : 'text-amber-400';
    return { ig, dpp: dppCalc, trimester, trimesterColor };
  }, [dum]);

  const reverseResult = useMemo(() => {
    if (!dpp) return null;
    // DPP -> DUM: reverse Naegele
    const parts = dpp.split('-');
    if (parts.length !== 3) return null;
    const dppDate = new Date(dpp);
    const dumDate = new Date(dppDate);
    dumDate.setDate(dumDate.getDate() - 7);
    dumDate.setMonth(dumDate.getMonth() + 3);
    dumDate.setFullYear(dumDate.getFullYear() - 1);
    return { dum: dumDate.toLocaleDateString('pt-BR') };
  }, [dpp]);

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4 text-purple-400" />
          Calculadora DUM / DPP / IG
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-xs font-medium text-purple-400">DUM {'>'} DPP + IG</p>
            <div className="space-y-1">
              <Label className="text-xs">Data da Ultima Menstruacao (DUM)</Label>
              <Input type="date" value={dum} onChange={(e) => setDum(e.target.value)} className="bg-zinc-950 border-zinc-700" />
            </div>
            {result && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xs text-zinc-400">IG Atual</p>
                    <p className="text-xl font-black text-purple-400">{result.ig.weeks}s{result.ig.days}d</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-400">DPP (Naegele)</p>
                    <p className="text-lg font-bold text-emerald-400">{result.dpp}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-400">Trimestre</p>
                    <p className={cn('text-lg font-bold', result.trimesterColor)}>{result.trimester}</p>
                  </div>
                </div>
                {result.ig.weeks >= 37 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                    <Baby className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-emerald-300">Gestacao a termo</span>
                  </div>
                )}
                {result.ig.weeks >= 41 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-red-300">Pos-datismo — considerar inducao</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-purple-400">DPP {'>'} DUM (reverso)</p>
            <div className="space-y-1">
              <Label className="text-xs">Data Provavel do Parto (DPP)</Label>
              <Input type="date" value={dpp} onChange={(e) => setDpp(e.target.value)} className="bg-zinc-950 border-zinc-700" />
            </div>
            {reverseResult && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 text-center">
                <p className="text-xs text-zinc-400">DUM estimada</p>
                <p className="text-lg font-bold text-purple-400">{reverseResult.dum}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Gestational Risk Classification ────────────────────────────────────────

function RiskClassificationPanel() {
  const [factors, setFactors] = useState({
    age35: false, chronicHypertension: false, preeclampsia: false, diabetes: false,
    gestationalDiabetes: false, previousCesarean: false, multiplePregnancy: false,
    placentaPrevia: false, oligohydramnios: false, rh: false, previousStillbirth: false,
    anemia: false, ist: false, obesity: false,
  });

  const highRiskFactors = ['preeclampsia', 'placentaPrevia', 'multiplePregnancy', 'previousStillbirth', 'chronicHypertension'];
  const mediumRiskFactors = ['age35', 'gestationalDiabetes', 'previousCesarean', 'rh', 'oligohydramnios', 'diabetes'];

  const classification = useMemo((): RiskClassification => {
    const hasHigh = highRiskFactors.some((f) => factors[f as keyof typeof factors]);
    if (hasHigh) return 'HIGH';
    const medCount = mediumRiskFactors.filter((f) => factors[f as keyof typeof factors]).length;
    if (medCount >= 2) return 'HIGH';
    if (medCount >= 1) return 'MEDIUM';
    const anyFactor = Object.values(factors).some(Boolean);
    return anyFactor ? 'MEDIUM' : 'LOW';
  }, [factors]);

  const factorList = [
    { key: 'age35', label: 'Idade >= 35 anos' },
    { key: 'chronicHypertension', label: 'Hipertensao cronica' },
    { key: 'preeclampsia', label: 'Pre-eclampsia / HELLP' },
    { key: 'diabetes', label: 'Diabetes pre-gestacional' },
    { key: 'gestationalDiabetes', label: 'Diabetes gestacional' },
    { key: 'previousCesarean', label: 'Cesarea previa' },
    { key: 'multiplePregnancy', label: 'Gestacao multipla' },
    { key: 'placentaPrevia', label: 'Placenta previa' },
    { key: 'oligohydramnios', label: 'Oligoidramnio' },
    { key: 'rh', label: 'Incompatibilidade Rh' },
    { key: 'previousStillbirth', label: 'Obito fetal anterior' },
    { key: 'anemia', label: 'Anemia (Hb menos 11)' },
    { key: 'ist', label: 'IST ativa' },
    { key: 'obesity', label: 'Obesidade (IMC mais 30)' },
  ];

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Classificacao de Risco Gestacional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {factorList.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFactors((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors text-left',
                factors[key as keyof typeof factors]
                  ? highRiskFactors.includes(key) ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
              )}
            >
              <div className={cn(
                'h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0',
                factors[key as keyof typeof factors] ? (highRiskFactors.includes(key) ? 'bg-red-500 border-red-500' : 'bg-amber-500 border-amber-500') : 'border-zinc-600',
              )}>
                {factors[key as keyof typeof factors] && <span className="text-[9px] text-white font-bold">{'✓'}</span>}
              </div>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className={cn('rounded-lg border px-6 py-3 text-center', RISK_COLORS[classification])}>
            <p className="text-xs opacity-70">Classificacao</p>
            <p className="text-2xl font-black">{RISK_LABELS[classification]}</p>
          </div>
          <div className="text-sm space-y-1">
            <p className="text-zinc-400">{Object.values(factors).filter(Boolean).length} fator(es) de risco selecionado(s)</p>
            {classification === 'HIGH' && <p className="text-red-400 font-medium">Encaminhar para pre-natal de alto risco</p>}
            {classification === 'MEDIUM' && <p className="text-amber-400">Acompanhamento diferenciado recomendado</p>}
            {classification === 'LOW' && <p className="text-emerald-400">Pre-natal de rotina na UBS</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Partogram Chart + Panel ────────────────────────────────────────────────

function PartogramPanel() {
  const [encounterId, setEncounterId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [form, setForm] = useState({
    encounterId: '', dilation: '', descent: '', contractionFrequency: '', contractionDuration: '',
    fetalHeartRate: '', amnioticFluid: '', oxytocin: '', notes: '',
  });

  const { data: entries, isLoading } = usePartogram(searchId);
  const createEntry = useCreatePartogramEntry();

  const handleCreate = async () => {
    if (!form.encounterId || !form.dilation || !form.fetalHeartRate) {
      toast.error('Preencha todos os campos obrigatorios.'); return;
    }
    try {
      await createEntry.mutateAsync({
        encounterId: form.encounterId,
        dilation: Number(form.dilation),
        descent: Number(form.descent),
        contractionFrequency: Number(form.contractionFrequency),
        contractionDuration: Number(form.contractionDuration),
        fetalHeartRate: Number(form.fetalHeartRate),
        amnioticFluid: form.amnioticFluid,
        oxytocin: form.oxytocin ? Number(form.oxytocin) : undefined,
        notes: form.notes,
      });
      toast.success('Registro no partograma adicionado.');
      setEntryOpen(false);
      setForm({ encounterId: '', dilation: '', descent: '', contractionFrequency: '', contractionDuration: '', fetalHeartRate: '', amnioticFluid: '', oxytocin: '', notes: '' });
    } catch {
      toast.error('Erro ao registrar no partograma.');
    }
  };

  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    return entries.map((e: PartogramEntry, i: number) => ({
      time: new Date(e.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dilation: e.dilation,
      descent: e.descent,
      fhr: e.fetalHeartRate,
      contractions: e.contractionFrequency,
      index: i,
    }));
  }, [entries]);

  // Friedman alert/action line data (simplified)
  const alertLine = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.map((_, i) => ({
      time: chartData[i]?.time ?? '',
      alert: Math.min(10, 4 + i * 1.0),
      action: Math.min(10, 4 + (i - 1) * 1.0),
    }));
  }, [chartData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="ID do atendimento (encounterId)" value={encounterId}
          onChange={(e) => setEncounterId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearchId(encounterId.trim())}
          className="max-w-sm bg-zinc-950 border-zinc-700" />
        <Button variant="outline" onClick={() => setSearchId(encounterId.trim())} className="border-zinc-700">Buscar</Button>
        <Button onClick={() => setEntryOpen(true)} className="flex items-center gap-2 ml-auto bg-purple-700 hover:bg-purple-800">
          <Plus className="h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      {/* Partogram Chart */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-400">Dilatacao Cervical + Descida Fetal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} />
                  <YAxis yAxisId="dil" domain={[0, 10]} tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'cm', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }} />
                  <YAxis yAxisId="desc" orientation="right" domain={[-5, 5]} tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'De Lee', angle: 90, position: 'insideRight', fontSize: 10, fill: '#71717a' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                  {/* Alert line (Friedman) */}
                  {alertLine.length > 0 && (
                    <Line yAxisId="dil" type="monotone" data={alertLine} dataKey="alert" stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Linha de Alerta" />
                  )}
                  <Line yAxisId="dil" type="monotone" dataKey="dilation" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4, fill: '#a855f7' }} name="Dilatacao (cm)" />
                  <Line yAxisId="desc" type="monotone" dataKey="descent" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="Descida (De Lee)" />
                  <ReferenceLine yAxisId="dil" y={10} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Completa', fill: '#10b981', fontSize: 9 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center text-xs">
                <span className="text-purple-400">--- Dilatacao</span>
                <span className="text-blue-400">--- Descida</span>
                <span className="text-amber-400">--- Alerta (Friedman)</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-400">BCF + Contracoes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} />
                  <YAxis yAxisId="fhr" domain={[100, 180]} tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'bpm', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }} />
                  <YAxis yAxisId="ctx" orientation="right" domain={[0, 8]} tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: '/10min', angle: 90, position: 'insideRight', fontSize: 10, fill: '#71717a' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine yAxisId="fhr" y={110} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine yAxisId="fhr" y={160} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line yAxisId="fhr" type="monotone" dataKey="fhr" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="BCF (bpm)" />
                  <Bar yAxisId="ctx" dataKey="contractions" fill="#a855f7" fillOpacity={0.4} name="Contracoes (/10min)" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center text-xs">
                <span className="text-emerald-400">--- BCF</span>
                <span className="text-purple-400">--- Contracoes</span>
                <span className="text-red-400">--- Limites BCF (110-160)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Partogram Table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader><CardTitle className="text-base">Partograma — Evolucao do Trabalho de Parto</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <PageLoading /> : entries && entries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead>Horario</TableHead>
                  <TableHead>Dilatacao</TableHead>
                  <TableHead>Descida</TableHead>
                  <TableHead>Contracoes</TableHead>
                  <TableHead>BCF</TableHead>
                  <TableHead>LA</TableHead>
                  <TableHead>Ocitocina</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e: PartogramEntry) => (
                  <TableRow key={e.id} className="border-zinc-800">
                    <TableCell className="text-sm">{new Date(e.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>
                      <span className={cn('font-semibold', e.dilation >= 10 ? 'text-emerald-400' : e.dilation >= 6 ? 'text-yellow-400' : 'text-muted-foreground')}>
                        {e.dilation} cm
                      </span>
                    </TableCell>
                    <TableCell>{e.descent}</TableCell>
                    <TableCell className="text-sm">{e.contractionFrequency}/10min — {e.contractionDuration}s</TableCell>
                    <TableCell>
                      <span className={cn('font-semibold text-sm', (e.fetalHeartRate < 110 || e.fetalHeartRate > 160) ? 'text-red-400' : 'text-emerald-400')}>
                        {e.fetalHeartRate}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{e.amnioticFluid}</TableCell>
                    <TableCell className="text-sm">{e.oxytocin ? `${e.oxytocin} mU/min` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              {searchId ? 'Nenhum registro de partograma para este atendimento.' : 'Informe o ID do atendimento para visualizar o partograma.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog: New entry */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Novo Registro no Partograma</DialogTitle>
            <DialogDescription>Registre a evolucao do trabalho de parto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>ID do Atendimento *</Label>
              <Input placeholder="UUID do atendimento" value={form.encounterId}
                onChange={(e) => setForm((p) => ({ ...p, encounterId: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Dilatacao (cm) *</Label><Input type="number" min="0" max="10" placeholder="0-10" value={form.dilation} onChange={(e) => setForm((p) => ({ ...p, dilation: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Descida (De Lee)</Label><Input type="number" placeholder="-5 a +5" value={form.descent} onChange={(e) => setForm((p) => ({ ...p, descent: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Contracoes (freq/10min)</Label><Input type="number" placeholder="3" value={form.contractionFrequency} onChange={(e) => setForm((p) => ({ ...p, contractionFrequency: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Duracao (seg)</Label><Input type="number" placeholder="40" value={form.contractionDuration} onChange={(e) => setForm((p) => ({ ...p, contractionDuration: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>BCF (bpm) *</Label><Input type="number" placeholder="140" value={form.fetalHeartRate} onChange={(e) => setForm((p) => ({ ...p, fetalHeartRate: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1">
                <Label>Liquido Amniotico</Label>
                <Select value={form.amnioticFluid} onValueChange={(v) => setForm((p) => ({ ...p, amnioticFluid: v }))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLEAR">Claro</SelectItem>
                    <SelectItem value="MECONIUM_I">Meconio I</SelectItem>
                    <SelectItem value="MECONIUM_II">Meconio II</SelectItem>
                    <SelectItem value="MECONIUM_III">Meconio III</SelectItem>
                    <SelectItem value="BLOODY">Sanguinolento</SelectItem>
                    <SelectItem value="ABSENT">Ausente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Ocitocina (mU/min)</Label><Input type="number" placeholder="0" value={form.oxytocin} onChange={(e) => setForm((p) => ({ ...p, oxytocin: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleCreate} disabled={createEntry.isPending} className="bg-purple-700 hover:bg-purple-800">
              {createEntry.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Ultrasound Panel ───────────────────────────────────────────────────────

function UltrasoundPanel() {
  const [patientId, setPatientId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [usgOpen, setUsgOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '', gestationalWeeks: '', estimatedWeight: '', amnioticFluidIndex: '',
    placentaPosition: '', fetalPresentation: '', observations: '',
  });

  const { data: ultrasounds, isLoading } = useUltrasounds(searchId);
  const createUltrasound = useCreateUltrasound();

  const handleCreate = async () => {
    if (!form.patientId || !form.gestationalWeeks || !form.fetalPresentation) {
      toast.error('Preencha todos os campos obrigatorios.'); return;
    }
    try {
      await createUltrasound.mutateAsync({
        patientId: form.patientId,
        gestationalWeeks: Number(form.gestationalWeeks),
        estimatedWeight: Number(form.estimatedWeight),
        amnioticFluidIndex: Number(form.amnioticFluidIndex),
        placentaPosition: form.placentaPosition,
        fetalPresentation: form.fetalPresentation,
        observations: form.observations,
      });
      toast.success('Ultrassonografia registrada.');
      setUsgOpen(false);
      setForm({ patientId: '', gestationalWeeks: '', estimatedWeight: '', amnioticFluidIndex: '', placentaPosition: '', fetalPresentation: '', observations: '' });
    } catch {
      toast.error('Erro ao registrar ultrassonografia.');
    }
  };

  // Weight growth chart
  const weightChartData = useMemo(() => {
    if (!ultrasounds || ultrasounds.length === 0) return [];
    return ultrasounds.map((u: UltrasoundRecord) => ({
      ig: `${u.gestationalWeeks}s`,
      peso: u.estimatedWeight,
      ila: u.amnioticFluidIndex,
    }));
  }, [ultrasounds]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="ID do paciente para buscar USGs" value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearchId(patientId.trim())}
          className="max-w-sm bg-zinc-950 border-zinc-700" />
        <Button variant="outline" onClick={() => setSearchId(patientId.trim())} className="border-zinc-700">Buscar</Button>
        <Button onClick={() => setUsgOpen(true)} className="flex items-center gap-2 ml-auto bg-purple-700 hover:bg-purple-800">
          <Plus className="h-4 w-4" />
          Nova USG
        </Button>
      </div>

      {/* Weight growth chart */}
      {weightChartData.length > 1 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-400">Evolucao do Peso Fetal Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="ig" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'g', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="peso" stroke="#a855f7" strokeWidth={2} dot={{ r: 4, fill: '#a855f7' }} name="Peso (g)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader><CardTitle className="text-base">Ultrassonografias Obstetricas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <PageLoading /> : ultrasounds && ultrasounds.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead>Data</TableHead>
                  <TableHead>IG (USG)</TableHead>
                  <TableHead>Peso Estimado</TableHead>
                  <TableHead>ILA</TableHead>
                  <TableHead>Placenta</TableHead>
                  <TableHead>Apresentacao</TableHead>
                  <TableHead>Observacoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultrasounds.map((u: UltrasoundRecord) => (
                  <TableRow key={u.id} className="border-zinc-800">
                    <TableCell>{new Date(u.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-semibold">{u.gestationalWeeks}s</TableCell>
                    <TableCell>{u.estimatedWeight}g</TableCell>
                    <TableCell>
                      <span className={cn('font-semibold', u.amnioticFluidIndex < 5 ? 'text-red-400' : u.amnioticFluidIndex > 25 ? 'text-orange-400' : 'text-emerald-400')}>
                        {u.amnioticFluidIndex} cm
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{u.placentaPosition}</TableCell>
                    <TableCell className="text-sm">{u.fetalPresentation}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground">{u.observations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              {searchId ? 'Nenhuma USG encontrada.' : 'Informe o ID do paciente para buscar.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={usgOpen} onOpenChange={setUsgOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Nova Ultrassonografia Obstetrica</DialogTitle>
            <DialogDescription>Registre os dados da ultrassonografia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>ID do Paciente *</Label><Input placeholder="UUID" value={form.patientId} onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>IG pela USG (semanas) *</Label><Input type="number" placeholder="28" value={form.gestationalWeeks} onChange={(e) => setForm((p) => ({ ...p, gestationalWeeks: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Peso Estimado (g)</Label><Input type="number" placeholder="1200" value={form.estimatedWeight} onChange={(e) => setForm((p) => ({ ...p, estimatedWeight: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Indice de LA (cm)</Label><Input type="number" step="0.1" placeholder="12.5" value={form.amnioticFluidIndex} onChange={(e) => setForm((p) => ({ ...p, amnioticFluidIndex: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Posicao da Placenta</Label><Input placeholder="Fundica, Anterior, Previa" value={form.placentaPosition} onChange={(e) => setForm((p) => ({ ...p, placentaPosition: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1">
                <Label>Apresentacao Fetal *</Label>
                <Select value={form.fetalPresentation} onValueChange={(v) => setForm((p) => ({ ...p, fetalPresentation: v }))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cefalica">Cefalica</SelectItem>
                    <SelectItem value="Pelvica">Pelvica</SelectItem>
                    <SelectItem value="Cormica">Cormica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Observacoes</Label><Input placeholder="Achados relevantes" value={form.observations} onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsgOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleCreate} disabled={createUltrasound.isPending} className="bg-purple-700 hover:bg-purple-800">
              {createUltrasound.isPending ? 'Salvando...' : 'Registrar USG'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Prenatal Visit Detail ──────────────────────────────────────────────────

function PrenatalVisitDetail({ card }: { card: PrenatalCard }) {
  if (card.consultations.length === 0) {
    return <p className="text-center text-zinc-500 py-6">Nenhuma consulta pre-natal registrada.</p>;
  }

  const chartData = card.consultations.map((c: PrenatalConsultation) => ({
    data: new Date(c.date).toLocaleDateString('pt-BR'),
    ig: `${c.gestationalWeeks}s`,
    pas: c.bloodPressureSystolic,
    pad: c.bloodPressureDiastolic,
    au: c.uterineHeight,
    bcf: c.fetalHeartRate,
    peso: c.weight,
  }));

  return (
    <div className="space-y-4">
      {/* BP + Weight chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-400">Pressao Arterial por Consulta</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="ig" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} domain={[60, 160]} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="pas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="PAS" />
                <Line type="monotone" dataKey="pad" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="PAD" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400">Altura Uterina + BCF</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="ig" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis yAxisId="au" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'cm', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }} />
                <YAxis yAxisId="bcf" orientation="right" domain={[100, 180]} tick={{ fontSize: 10, fill: '#71717a' }} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                <Line yAxisId="au" type="monotone" dataKey="au" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="AU (cm)" />
                <Line yAxisId="bcf" type="monotone" dataKey="bcf" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="BCF (bpm)" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Visits table */}
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800">
            <TableHead>Data</TableHead>
            <TableHead>IG</TableHead>
            <TableHead>Peso</TableHead>
            <TableHead>PA</TableHead>
            <TableHead>AU</TableHead>
            <TableHead>BCF</TableHead>
            <TableHead>Apresentacao</TableHead>
            <TableHead>Medico</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {card.consultations.map((c: PrenatalConsultation) => (
            <TableRow key={c.id} className="border-zinc-800">
              <TableCell className="text-sm">{new Date(c.date).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell className="font-semibold">{c.gestationalWeeks}s</TableCell>
              <TableCell>{c.weight} kg</TableCell>
              <TableCell>
                <span className={cn(c.bloodPressureSystolic >= 140 ? 'text-red-400 font-bold' : '')}>
                  {c.bloodPressureSystolic}/{c.bloodPressureDiastolic}
                </span>
              </TableCell>
              <TableCell>{c.uterineHeight} cm</TableCell>
              <TableCell>
                <span className={cn((c.fetalHeartRate < 110 || c.fetalHeartRate > 160) ? 'text-red-400' : 'text-emerald-400', 'font-semibold')}>
                  {c.fetalHeartRate}
                </span>
              </TableCell>
              <TableCell className="text-sm">{c.presentation}</TableCell>
              <TableCell className="text-sm text-zinc-400">{c.doctor}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ObstetricsPage() {
  const [activeTab, setActiveTab] = useState('prenatal');
  const [riskFilter, setRiskFilter] = useState<RiskClassification | undefined>(undefined);
  const [selectedCard, setSelectedCard] = useState<PrenatalCard | null>(null);

  const [prenatalOpen, setPrenatalOpen] = useState(false);
  const [prenatalForm, setPrenatalForm] = useState({
    patientId: '', dum: '', bloodType: '', rh: '',
    previousPregnancies: '', previousDeliveries: '', previousCesareans: '', previousAbortions: '',
  });

  const { data: patientsData, isLoading: patientsLoading } = useObstetricPatients(
    riskFilter ? { risk: riskFilter } : undefined,
  );
  const createPrenatalCard = useCreatePrenatalCard();

  const handleCreateCard = async () => {
    if (!prenatalForm.patientId || !prenatalForm.dum || !prenatalForm.bloodType) {
      toast.error('Preencha todos os campos obrigatorios.'); return;
    }
    try {
      await createPrenatalCard.mutateAsync({
        patientId: prenatalForm.patientId,
        dum: prenatalForm.dum,
        bloodType: prenatalForm.bloodType,
        rh: prenatalForm.rh,
        previousPregnancies: Number(prenatalForm.previousPregnancies) || 0,
        previousDeliveries: Number(prenatalForm.previousDeliveries) || 0,
        previousCesareans: Number(prenatalForm.previousCesareans) || 0,
        previousAbortions: Number(prenatalForm.previousAbortions) || 0,
      });
      toast.success('Cartao pre-natal aberto com sucesso.');
      setPrenatalOpen(false);
      setPrenatalForm({ patientId: '', dum: '', bloodType: '', rh: '', previousPregnancies: '', previousDeliveries: '', previousCesareans: '', previousAbortions: '' });
    } catch {
      toast.error('Erro ao abrir cartao pre-natal.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Baby className="h-6 w-6 text-purple-400" />
          Obstetricia
        </h1>
        <p className="text-muted-foreground">
          Cartao pre-natal digital, partograma com graficos, calculadora DUM/DPP, classificacao de risco e ultrassonografias
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['LOW', 'MEDIUM', 'HIGH'] as RiskClassification[]).map((r) => {
          const count = patientsData?.data?.filter((p: PrenatalCard) => p.riskClassification === r).length ?? 0;
          return (
            <Card key={r} className={cn('bg-zinc-900 border-zinc-800 cursor-pointer transition-colors', riskFilter === r && 'border-purple-500')} onClick={() => setRiskFilter(riskFilter === r ? undefined : r)}>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-400">{RISK_LABELS[r]}</p>
                <p className={cn('text-2xl font-bold', r === 'LOW' ? 'text-emerald-400' : r === 'MEDIUM' ? 'text-amber-400' : 'text-red-400')}>{count}</p>
              </CardContent>
            </Card>
          );
        })}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400">Total Gestantes</p>
            <p className="text-2xl font-bold">{patientsData?.total ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1">
          <TabsTrigger value="prenatal" className="text-xs data-[state=active]:bg-purple-700">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Pre-Natal
          </TabsTrigger>
          <TabsTrigger value="partogram" className="text-xs data-[state=active]:bg-purple-700">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Partograma
          </TabsTrigger>
          <TabsTrigger value="ultrasound" className="text-xs data-[state=active]:bg-purple-700">
            <Scan className="mr-1.5 h-3.5 w-3.5" />
            Ultrassonografias
          </TabsTrigger>
          <TabsTrigger value="calculator" className="text-xs data-[state=active]:bg-purple-700">
            <Calculator className="mr-1.5 h-3.5 w-3.5" />
            DUM/DPP
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs data-[state=active]:bg-purple-700">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Classificacao de Risco
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pre-Natal */}
        <TabsContent value="prenatal" className="space-y-4 mt-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => setPrenatalOpen(true)} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800">
              <Plus className="h-4 w-4" />
              Abrir Cartao Pre-Natal
            </Button>
          </div>

          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader><CardTitle className="text-base">Gestantes em Acompanhamento ({patientsData?.total ?? 0})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {patientsLoading ? <PageLoading /> : patientsData?.data && patientsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Paciente</TableHead>
                      <TableHead>DUM</TableHead>
                      <TableHead>DPP</TableHead>
                      <TableHead>IG Atual</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Tipo / Rh</TableHead>
                      <TableHead>G/P/C/A</TableHead>
                      <TableHead>Consultas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsData.data.map((p: PrenatalCard) => (
                      <TableRow key={p.id} className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50" onClick={() => setSelectedCard(selectedCard?.id === p.id ? null : p)}>
                        <TableCell className="font-medium">{p.patientName}</TableCell>
                        <TableCell className="text-sm">{new Date(p.dum).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-sm font-medium text-purple-400">{dppFromDum(p.dum)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{gestationalAge(p.gestationalWeeks, p.gestationalDays)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', RISK_COLORS[p.riskClassification])}>
                            {RISK_LABELS[p.riskClassification]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{p.bloodType} {p.rh}</TableCell>
                        <TableCell className="text-sm">
                          {p.previousPregnancies}G/{p.previousDeliveries}P/{p.previousCesareans}C/{p.previousAbortions}A
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{p.consultations.length}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma gestante em acompanhamento.</p>
              )}
            </CardContent>
          </Card>

          {selectedCard && (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  Cartao Pre-Natal Digital — {selectedCard.patientName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PrenatalVisitDetail card={selectedCard} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Partograma */}
        <TabsContent value="partogram" className="mt-4">
          <PartogramPanel />
        </TabsContent>

        {/* Tab 3: Ultrassonografias */}
        <TabsContent value="ultrasound" className="mt-4">
          <UltrasoundPanel />
        </TabsContent>

        {/* Tab 4: DUM/DPP Calculator */}
        <TabsContent value="calculator" className="mt-4">
          <DumDppCalculator />
        </TabsContent>

        {/* Tab 5: Risk Classification */}
        <TabsContent value="risk" className="mt-4">
          <RiskClassificationPanel />
        </TabsContent>
      </Tabs>

      {/* Dialog: Abrir Cartao Pre-Natal */}
      <Dialog open={prenatalOpen} onOpenChange={setPrenatalOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Abrir Cartao Pre-Natal</DialogTitle>
            <DialogDescription>Inicie o acompanhamento pre-natal da gestante.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>ID do Paciente *</Label><Input placeholder="UUID" value={prenatalForm.patientId} onChange={(e) => setPrenatalForm((p) => ({ ...p, patientId: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>DUM *</Label><Input type="date" value={prenatalForm.dum} onChange={(e) => setPrenatalForm((p) => ({ ...p, dum: e.target.value }))} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            {prenatalForm.dum && (
              <div className="rounded-md bg-purple-500/10 border border-purple-500/30 p-3 text-sm">
                DPP (Naegele): <span className="font-bold text-purple-400">{dppFromDum(prenatalForm.dum)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo Sanguineo *</Label>
                <Select value={prenatalForm.bloodType} onValueChange={(v) => setPrenatalForm((p) => ({ ...p, bloodType: v }))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{['A', 'B', 'AB', 'O'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fator Rh</Label>
                <Select value={prenatalForm.rh} onValueChange={(v) => setPrenatalForm((p) => ({ ...p, rh: v }))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Rh" /></SelectTrigger>
                  <SelectContent><SelectItem value="+">Positivo (+)</SelectItem><SelectItem value="-">Negativo (-)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'previousPregnancies', label: 'Gestacoes (G)' },
                { key: 'previousDeliveries', label: 'Partos (P)' },
                { key: 'previousCesareans', label: 'Cesareas (C)' },
                { key: 'previousAbortions', label: 'Abortos (A)' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" min="0" placeholder="0" value={prenatalForm[key as keyof typeof prenatalForm]} onChange={(e) => setPrenatalForm((p) => ({ ...p, [key]: e.target.value }))} className="bg-zinc-950 border-zinc-700" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrenatalOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleCreateCard} disabled={createPrenatalCard.isPending} className="bg-purple-700 hover:bg-purple-800">
              {createPrenatalCard.isPending ? 'Abrindo...' : 'Abrir Cartao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
