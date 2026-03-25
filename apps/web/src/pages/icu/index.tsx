import { useState, useEffect, useMemo } from 'react';
import {
  HeartPulse,
  Activity,
  Syringe,
  Wind,
  Droplets,
  Shield,
  Target,
  Utensils,
  Calculator,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Thermometer,
  Flame,
  Brain,
  Sparkles,
  ListChecks,
  RotateCcw,
  Timer,
  TrendingDown,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useIcuFlowsheet,
  useIcuScores,
  useIcuDevices,
  useIcuBundles,
  useCalculateVasoactive,
  useCreateHypothermiaSession,
  useDetectSepsis,
  useAssessExtubation,
  useOptimizeVasopressors,
  useCreateDailyGoals,
  useCreateProneSession,
} from '@/services/icu.service';
import type {
  IcuDevice,
  VasoactiveCalculation,
  HypothermiaSession,
  SepsisDetectionResult,
  ExtubationReadinessResult,
  VasopressorOptimizationResult,
} from '@/services/icu.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function rassColor(rass: number): string {
  if (rass <= -3) return 'text-blue-400';
  if (rass <= -1) return 'text-cyan-400';
  if (rass === 0) return 'text-emerald-400';
  if (rass <= 2) return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Vasoactive Calculator Dialog ─────────────────────────────────────────

function VasoactiveCalculatorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const calculate = useCalculateVasoactive();
  const [drug, setDrug] = useState('norepinephrine');
  const [weight, setWeight] = useState('');
  const [dose, setDose] = useState('');
  const [concentration, setConcentration] = useState('');
  const [result, setResult] = useState<VasoactiveCalculation | null>(null);

  const handleCalculate = () => {
    if (!weight || !dose || !concentration) { toast.error('Preencha todos os campos.'); return; }
    calculate.mutate(
      { drug, weightKg: parseFloat(weight), targetDoseMcgKgMin: parseFloat(dose), concentrationMgMl: parseFloat(concentration) },
      { onSuccess: (data) => setResult(data), onError: () => toast.error('Erro no calculo.') },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Calculadora de Drogas Vasoativas</DialogTitle>
          <DialogDescription>Calcule a taxa de infusao da bomba</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Droga</Label>
            <Select value={drug} onValueChange={setDrug}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="norepinephrine">Norepinefrina</SelectItem>
                <SelectItem value="dobutamine">Dobutamina</SelectItem>
                <SelectItem value="dopamine">Dopamina</SelectItem>
                <SelectItem value="epinephrine">Epinefrina</SelectItem>
                <SelectItem value="vasopressin">Vasopressina</SelectItem>
                <SelectItem value="milrinone">Milrinona</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Peso (kg)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="space-y-1">
              <Label>Dose (mcg/kg/min)</Label>
              <Input type="number" value={dose} onChange={(e) => setDose(e.target.value)} className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="space-y-1">
              <Label>Conc. (mg/mL)</Label>
              <Input type="number" value={concentration} onChange={(e) => setConcentration(e.target.value)} className="bg-zinc-950 border-zinc-700" />
            </div>
          </div>
          {result && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-400">Resultado:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-zinc-400">Dose/min:</span> <span className="font-bold">{result.dosePerMinuteMcg} mcg/min</span></div>
                <div><span className="text-zinc-400">Dose/h:</span> <span className="font-bold">{result.dosePerHourMcg} mcg/h</span></div>
                <div className="col-span-2 text-center mt-2">
                  <p className="text-zinc-400">Taxa da Bomba</p>
                  <p className="text-3xl font-bold text-emerald-400">{result.pumpRateMlH} mL/h</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Fechar</Button>
          <Button onClick={handleCalculate} disabled={calculate.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {calculate.isPending ? 'Calculando...' : 'Calcular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Device Card ──────────────────────────────────────────────────────────

function DeviceCard({ device }: { device: IcuDevice }) {
  const isHighRisk = device.daysInserted >= 7;
  const typeLabels: Record<string, string> = {
    CVC: 'Cateter Venoso Central',
    PICC: 'PICC',
    ARTERIAL_LINE: 'Linha Arterial',
    SVD: 'Sonda Vesical de Demora',
    TOT: 'Tubo Orotraqueal',
    TQT: 'Traqueostomia',
    CHEST_DRAIN: 'Dreno de Torax',
    ABDOMINAL_DRAIN: 'Dreno Abdominal',
    EVD: 'Derivacao Ventricular Externa',
    NGT: 'Sonda Nasogastrica',
    SWAN_GANZ: 'Swan-Ganz',
  };

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', isHighRisk && 'border-yellow-500/40')}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{typeLabels[device.deviceType] ?? device.deviceType}</p>
            <p className="text-xs text-zinc-400">{device.site}</p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className={cn(isHighRisk ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50')}>
              {device.daysInserted}d
            </Badge>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Inserido: {formatDate(device.insertedAt)}</p>
      </CardContent>
    </Card>
  );
}

// ─── Score Card ───────────────────────────────────────────────────────────

function ScoreCard({ label, score, subtext, color }: { label: string; score: string | number; subtext?: string; color?: string }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4 text-center">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className={cn('text-2xl font-bold', color ?? 'text-zinc-100')}>{score}</p>
        {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Bundle Checklist ─────────────────────────────────────────────────────

function BundleChecklistCard({ title, items, compliance }: { title: string; items: Record<string, boolean>; compliance: number }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="outline" className={cn(
            compliance === 100 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
          )}>
            {compliance}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {Object.entries(items).map(([key, done]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            {done ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Circle className="h-4 w-4 text-zinc-500 shrink-0" />}
            <span className={cn(done && 'text-zinc-500 line-through')}>{key.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function IcuPage() {
  const [patientId, setPatientId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [vasoactiveDialog, setVasoactiveDialog] = useState(false);

  // Hypothermia state
  const createHypothermia = useCreateHypothermiaSession();
  const [hypothermiaForm, setHypothermiaForm] = useState({ targetTemp: '33', indication: '', method: 'INTRAVASCULAR' });
  const [hypothermiaResult, setHypothermiaResult] = useState<HypothermiaSession | null>(null);

  // AI Sepsis state
  const detectSepsis = useDetectSepsis();
  const [sepsisForm, setSepsisForm] = useState({ heartRate: '', respiratoryRate: '', systolicBP: '', temperature: '', wbc: '', lactate: '', gcs: '', creatinine: '', bilirubin: '', platelets: '', pao2fio2: '' });
  const [sepsisResult, setSepsisResult] = useState<SepsisDetectionResult | null>(null);

  // AI Extubation state
  const assessExtubation = useAssessExtubation();
  const [extubationForm, setExtubationForm] = useState({ fio2: '', peep: '', pao2: '', rsbi: '', gcs: '', coughStrength: '', secretions: '', hemodynamicStable: 'true' });
  const [extubationResult, setExtubationResult] = useState<ExtubationReadinessResult | null>(null);

  // AI Vasopressor Optimization state
  const optimizeVaso = useOptimizeVasopressors();
  const [vasoOptForm, setVasoOptForm] = useState({ currentMap: '', targetMapMin: '65', targetMapMax: '80', drugName: 'norepinephrine', drugDose: '', lactate: '', urinOutput: '', fluidBalanceMl: '' });
  const [vasoOptResult, setVasoOptResult] = useState<VasopressorOptimizationResult | null>(null);

  const { data: flowsheet, isLoading } = useIcuFlowsheet(searchId);
  const { data: devices = [] } = useIcuDevices(searchId);
  const { data: scores = [] } = useIcuScores(searchId);
  const { data: bundles = [] } = useIcuBundles(searchId);

  const handleSearch = () => {
    if (!patientId.trim()) { toast.error('Informe o ID do paciente.'); return; }
    setSearchId(patientId.trim());
  };

  const latestSofa = scores.find((s) => s.scoreType === 'SOFA');
  const latestApache = scores.find((s) => s.scoreType === 'APACHE_II');
  const highRiskDevices = devices.filter((d) => d.daysInserted >= 7);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">UTI - Terapia Intensiva</h1>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/50">Monitoramento</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setVasoactiveDialog(true)} className="border-zinc-700">
            <Calculator className="h-4 w-4 mr-2" /> Calculadora DVA
          </Button>
        </div>
      </div>

      {/* Patient Search */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="ID do Paciente"
                className="bg-zinc-950 border-zinc-700"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700">
              <Monitor className="h-4 w-4 mr-2" /> Carregar Flowsheet
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && searchId && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      )}

      {searchId && !isLoading && (
        <Tabs defaultValue="flowsheet">
          <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1">
            <TabsTrigger value="flowsheet" className="gap-1 text-xs"><Activity className="h-3.5 w-3.5" /> Flowsheet</TabsTrigger>
            <TabsTrigger value="daily-goals" className="gap-1 text-xs"><ListChecks className="h-3.5 w-3.5" /> Metas Diarias</TabsTrigger>
            <TabsTrigger value="scores" className="gap-1 text-xs"><Target className="h-3.5 w-3.5" /> Escores</TabsTrigger>
            <TabsTrigger value="ventilation" className="gap-1 text-xs"><Wind className="h-3.5 w-3.5" /> Ventilacao</TabsTrigger>
            <TabsTrigger value="weaning" className="gap-1 text-xs"><TrendingDown className="h-3.5 w-3.5" /> Desmame</TabsTrigger>
            <TabsTrigger value="prone" className="gap-1 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Prone</TabsTrigger>
            <TabsTrigger value="sedation" className="gap-1 text-xs"><Syringe className="h-3.5 w-3.5" /> Sedacao</TabsTrigger>
            <TabsTrigger value="devices" className="gap-1 text-xs"><Shield className="h-3.5 w-3.5" /> Dispositivos</TabsTrigger>
            <TabsTrigger value="bundles" className="gap-1 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Bundles</TabsTrigger>
            <TabsTrigger value="nutrition" className="gap-1 text-xs"><Utensils className="h-3.5 w-3.5" /> Nutricao</TabsTrigger>
            <TabsTrigger value="dialysis" className="gap-1 text-xs"><Droplets className="h-3.5 w-3.5" /> Dialise</TabsTrigger>
            <TabsTrigger value="hypothermia" className="gap-1 text-xs"><Thermometer className="h-3.5 w-3.5" /> Hipotermia</TabsTrigger>
            <TabsTrigger value="ai-sepsis" className="gap-1 text-xs"><Flame className="h-3.5 w-3.5" /> IA Sepse</TabsTrigger>
            <TabsTrigger value="ai-extubation" className="gap-1 text-xs"><Wind className="h-3.5 w-3.5" /> IA Extubacao</TabsTrigger>
            <TabsTrigger value="ai-vasopressor" className="gap-1 text-xs"><Sparkles className="h-3.5 w-3.5" /> IA Vasopressor</TabsTrigger>
          </TabsList>

          {/* Flowsheet Tab */}
          <TabsContent value="flowsheet" className="mt-4">
            <div className="space-y-4">
              {/* Score Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <ScoreCard label="SOFA" score={latestSofa?.totalScore ?? '—'} color={latestSofa && latestSofa.totalScore >= 6 ? 'text-red-400' : undefined} />
                <ScoreCard label="APACHE II" score={latestApache?.totalScore ?? '—'} subtext={latestApache?.estimatedMortality ? `Mort. ${latestApache.estimatedMortality}%` : undefined} />
                <ScoreCard label="Dispositivos" score={devices.length} subtext={highRiskDevices.length > 0 ? `${highRiskDevices.length} alto risco` : undefined} color={highRiskDevices.length > 0 ? 'text-yellow-400' : undefined} />
                <ScoreCard label="Bundles Hoje" score={bundles.length} />
                <ScoreCard label="Sinais Vitais" score={flowsheet?.vitals?.length ?? 0} subtext="registros" />
                <ScoreCard label="Ventilacao" score={flowsheet?.ventilation?.length ?? 0} subtext="registros" />
              </div>

              {/* Vitals Chart */}
              {flowsheet?.vitals && flowsheet.vitals.length > 1 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-base">Tendencia de Sinais Vitais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={flowsheet.vitals.slice(0, 24).reverse().map((v) => ({
                          time: new Date(v.recordedAt as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                          FC: v.heartRate as number,
                          PAS: v.systolicBP as number,
                          PAD: v.diastolicBP as number,
                          SpO2: v.oxygenSaturation as number,
                          FR: v.respiratoryRate as number,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                          <Legend formatter={(value: string) => <span className="text-[10px] text-zinc-400">{value}</span>} />
                          <Line type="monotone" dataKey="FC" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} name="FC (bpm)" />
                          <Line type="monotone" dataKey="PAS" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="PAS (mmHg)" />
                          <Line type="monotone" dataKey="SpO2" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="SpO2 (%)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vitals Table */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base">Sinais Vitais - Ultimas 24h</CardTitle>
                </CardHeader>
                <CardContent>
                  {!flowsheet?.vitals?.length ? (
                    <p className="text-zinc-500 text-sm text-center py-4">Sem registros de sinais vitais</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-700 text-left">
                            <th className="py-2 px-2 text-zinc-400">Hora</th>
                            <th className="py-2 px-2 text-zinc-400">PA</th>
                            <th className="py-2 px-2 text-zinc-400">FC</th>
                            <th className="py-2 px-2 text-zinc-400">FR</th>
                            <th className="py-2 px-2 text-zinc-400">T</th>
                            <th className="py-2 px-2 text-zinc-400">SpO2</th>
                            <th className="py-2 px-2 text-zinc-400">GCS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flowsheet.vitals.slice(0, 24).map((v, i) => (
                            <tr key={i} className="border-b border-zinc-800">
                              <td className="py-1.5 px-2 text-zinc-400">{formatDate(v.recordedAt as string)}</td>
                              <td className="py-1.5 px-2">{String(v.systolicBP ?? '—')}/{String(v.diastolicBP ?? '—')}</td>
                              <td className="py-1.5 px-2">{String(v.heartRate ?? '—')}</td>
                              <td className="py-1.5 px-2">{String(v.respiratoryRate ?? '—')}</td>
                              <td className="py-1.5 px-2">{String(v.temperature ?? '—')}</td>
                              <td className="py-1.5 px-2">{String(v.oxygenSaturation ?? '—')}%</td>
                              <td className="py-1.5 px-2">{String(v.gcs ?? '—')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Devices */}
              {devices.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Dispositivos Invasivos Ativos</CardTitle>
                      {highRiskDevices.length > 0 && (
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                          <AlertTriangle className="h-3 w-3 mr-1" /> {highRiskDevices.length} com &ge; 7 dias
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {devices.map((d) => <DeviceCard key={d.id} device={d} />)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Daily Goals Tab */}
          <TabsContent value="daily-goals" className="mt-4">
            <DailyGoalsSection patientId={searchId} />
          </TabsContent>

          {/* Weaning Protocol Tab */}
          <TabsContent value="weaning" className="mt-4">
            <WeaningProtocolSection ventilation={flowsheet?.ventilation ?? []} />
          </TabsContent>

          {/* Prone Positioning Tab */}
          <TabsContent value="prone" className="mt-4">
            <PronePositioningSection patientId={searchId} />
          </TabsContent>

          {/* Scores Tab */}
          <TabsContent value="scores" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { type: 'APACHE_II', label: 'APACHE II', desc: 'Gravidade na admissao da UTI', icon: Target },
                  { type: 'SOFA', label: 'SOFA', desc: 'Disfuncao organica sequencial', icon: Activity },
                  { type: 'SAPS_3', label: 'SAPS 3', desc: 'Escore simplificado de fisiologia aguda', icon: HeartPulse },
                  { type: 'TISS_28', label: 'TISS-28', desc: 'Intervencoes terapeuticas', icon: Syringe },
                ].map(({ type, label, desc, icon: Icon }) => {
                  const history = scores.filter((s) => s.scoreType === type);
                  const latest = history[0];
                  return (
                    <Card key={type} className="bg-zinc-900 border-zinc-800">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-emerald-400" />
                          <div>
                            <CardTitle className="text-base">{label}</CardTitle>
                            <p className="text-xs text-zinc-400">{desc}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {latest ? (
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <p className="text-3xl font-bold">{latest.totalScore}</p>
                              {latest.estimatedMortality !== undefined && (
                                <p className="text-sm text-zinc-400">Mortalidade est.: {latest.estimatedMortality}%</p>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500">Ultimo: {formatDate(latest.createdAt)}</p>
                            {history.length > 1 && (
                              <div className="space-y-1 mt-2">
                                <p className="text-xs text-zinc-400">Historico ({history.length} registros):</p>
                                {history.slice(0, 5).map((s) => (
                                  <div key={s.id} className="flex justify-between text-xs">
                                    <span className="text-zinc-500">{formatDate(s.createdAt)}</span>
                                    <span className="font-bold">{s.totalScore}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-zinc-500 text-sm">Nenhum registro</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Ventilation Tab */}
          <TabsContent value="ventilation" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Parametros de Ventilacao Mecanica</CardTitle>
              </CardHeader>
              <CardContent>
                {!flowsheet?.ventilation?.length ? (
                  <p className="text-zinc-500 text-sm text-center py-6">Sem registros de ventilacao mecanica</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-700 text-left">
                          <th className="py-2 px-2 text-zinc-400">Hora</th>
                          <th className="py-2 px-2 text-zinc-400">Modo</th>
                          <th className="py-2 px-2 text-zinc-400">VT</th>
                          <th className="py-2 px-2 text-zinc-400">FR</th>
                          <th className="py-2 px-2 text-zinc-400">FiO2</th>
                          <th className="py-2 px-2 text-zinc-400">PEEP</th>
                          <th className="py-2 px-2 text-zinc-400">Pplat</th>
                          <th className="py-2 px-2 text-zinc-400">DP</th>
                          <th className="py-2 px-2 text-zinc-400">P/F</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flowsheet.ventilation.map((v, i) => (
                          <tr key={i} className="border-b border-zinc-800">
                            <td className="py-1.5 px-2 text-zinc-400">{formatDate(v.recordedAt as string)}</td>
                            <td className="py-1.5 px-2"><Badge variant="outline" className="text-xs">{v.mode as string}</Badge></td>
                            <td className="py-1.5 px-2">{(v.tidalVolume as number) ?? '—'}</td>
                            <td className="py-1.5 px-2">{(v.respiratoryRate as number) ?? '—'}</td>
                            <td className="py-1.5 px-2">{(v.fio2 as number) ?? '—'}%</td>
                            <td className="py-1.5 px-2">{(v.peep as number) ?? '—'}</td>
                            <td className="py-1.5 px-2">{(v.plateauPressure as number) ?? '—'}</td>
                            <td className="py-1.5 px-2 font-bold">{(v.drivingPressure as number) ?? '—'}</td>
                            <td className="py-1.5 px-2">
                              {v.pfRatio ? (
                                <span className={cn('font-bold', (v.pfRatio as number) < 200 ? 'text-red-400' : (v.pfRatio as number) < 300 ? 'text-yellow-400' : 'text-emerald-400')}>
                                  {v.pfRatio as number}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sedation Tab */}
          <TabsContent value="sedation" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader><CardTitle className="text-base">Escala RASS</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {[
                      { val: 4, label: '+4 Combativo' },
                      { val: 3, label: '+3 Muito agitado' },
                      { val: 2, label: '+2 Agitado' },
                      { val: 1, label: '+1 Inquieto' },
                      { val: 0, label: '0 Alerta e calmo' },
                      { val: -1, label: '-1 Sonolento' },
                      { val: -2, label: '-2 Sedacao leve' },
                      { val: -3, label: '-3 Sedacao moderada' },
                      { val: -4, label: '-4 Sedacao profunda' },
                      { val: -5, label: '-5 Irresponsivo' },
                    ].map(({ val, label }) => (
                      <div key={val} className={cn('text-xs px-2 py-1 rounded', rassColor(val))}>
                        {label}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 col-span-2">
                  <CardHeader><CardTitle className="text-base">Registros de Sedacao</CardTitle></CardHeader>
                  <CardContent>
                    {!flowsheet?.sedation?.length ? (
                      <p className="text-zinc-500 text-sm text-center py-4">Sem registros</p>
                    ) : (
                      <div className="space-y-2">
                        {flowsheet.sedation.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded bg-zinc-800">
                            <span className={cn('text-lg font-bold', rassColor(s.rass as number))}>{s.rass as number}</span>
                            <div className="flex-1">
                              <p className="text-sm">{s.rassDescription as string}</p>
                              <p className="text-xs text-zinc-400">
                                Alvo: {s.rassTarget as number} | {(s.onTarget as boolean) ? 'No alvo' : 'Fora do alvo'}
                                {s.bps ? ` | BPS: ${String(s.bps)}` : null}
                                {s.satPerformed ? ' | SAT realizado' : null}
                              </p>
                            </div>
                            <span className="text-xs text-zinc-500">{formatDate(s.assessedAt as string)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="mt-4">
            <div className="space-y-4">
              {devices.length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-10 text-center text-zinc-500">Nenhum dispositivo invasivo registrado</CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices.map((d) => <DeviceCard key={d.id} device={d} />)}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Bundles Tab */}
          <TabsContent value="bundles" className="mt-4">
            <div className="space-y-4">
              {bundles.length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-10 text-center text-zinc-500">Nenhum bundle registrado</CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bundles.map((b) => (
                    <BundleChecklistCard
                      key={b.id}
                      title={b.bundleType.replace(/_/g, ' ')}
                      items={b.items as unknown as Record<string, boolean>}
                      compliance={b.compliance}
                    />
                  ))}
                </div>
              )}

              {/* Bundle reference cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Bundle CVC', color: 'text-blue-400', items: [
                      'Higiene das maos', 'Barreira maxima esteril', 'Antissepsia com clorexidina',
                      'Selecao otima do sitio', 'Revisao diaria da necessidade', 'Curativo transparente integro',
                    ],
                  },
                  {
                    title: 'Bundle PAV', color: 'text-orange-400', items: [
                      'Cabeceira elevada 30-45 graus', 'Higiene oral com clorexidina', 'Despertar diario (SAT)',
                      'Teste de respiracao espontanea (SBT)', 'Profilaxia TVP', 'Profilaxia ulcera',
                    ],
                  },
                  {
                    title: 'Bundle ITU-AC', color: 'text-purple-400', items: [
                      'Insercao com tecnica assetica', 'Manutencao do sistema fechado', 'Fixacao adequada',
                      'Revisao diaria da necessidade', 'Bolsa coletora abaixo da bexiga', 'Higiene perineal',
                    ],
                  },
                ].map(({ title, color, items }) => (
                  <Card key={title} className="bg-zinc-900 border-zinc-800">
                    <CardHeader><CardTitle className={cn('text-sm', color)}>{title}</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {items.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                          <Shield className="h-3 w-3 mt-1 shrink-0 text-zinc-500" />
                          {item}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Nutricao Enteral</CardTitle></CardHeader>
              <CardContent>
                {!flowsheet?.nutrition?.length ? (
                  <p className="text-zinc-500 text-sm text-center py-6">Sem registros de nutricao enteral</p>
                ) : (
                  <div className="space-y-3">
                    {flowsheet.nutrition.map((n, i) => (
                      <div key={i} className="p-3 rounded-lg bg-zinc-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{n.formula as string}</p>
                          <Badge variant="outline" className={cn((n.paused as boolean) ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400')}>
                            {(n.paused as boolean) ? 'Pausada' : 'Em curso'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div><span className="text-zinc-400">Taxa:</span> {n.rateMlH as number} mL/h</div>
                          <div><span className="text-zinc-400">Alvo 24h:</span> {n.targetVolume24h as number} mL</div>
                          <div><span className="text-zinc-400">Res. gastrico:</span> {(n.gastricResidual as number) ?? '—'} mL</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dialysis Tab */}
          <TabsContent value="dialysis" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Dialise / CRRT</CardTitle></CardHeader>
              <CardContent>
                {!flowsheet?.ecmo?.length && (
                  <p className="text-zinc-500 text-sm text-center py-6">Sem registros de dialise no periodo</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hypothermia Tab */}
          <TabsContent value="hypothermia" className="mt-4">
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Protocolo de hipotermia terapeutica (TTM) — controle de temperatura apos parada cardiaca ou lesao neurologica.
              </p>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-base">Iniciar Sessao de Hipotermia</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Temperatura Alvo (C)</Label>
                      <Select value={hypothermiaForm.targetTemp} onValueChange={(v) => setHypothermiaForm((f) => ({ ...f, targetTemp: v }))}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="32">32 C</SelectItem>
                          <SelectItem value="33">33 C</SelectItem>
                          <SelectItem value="34">34 C</SelectItem>
                          <SelectItem value="36">36 C (normotermia controlada)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Metodo</Label>
                      <Select value={hypothermiaForm.method} onValueChange={(v) => setHypothermiaForm((f) => ({ ...f, method: v }))}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INTRAVASCULAR">Intravascular (Arctic Sun)</SelectItem>
                          <SelectItem value="SURFACE">Superficie (manta termica)</SelectItem>
                          <SelectItem value="COLD_SALINE">Salina gelada IV</SelectItem>
                          <SelectItem value="COMBINED">Combinado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Indicacao</Label>
                      <Input
                        value={hypothermiaForm.indication}
                        onChange={(e) => setHypothermiaForm((f) => ({ ...f, indication: e.target.value }))}
                        placeholder="PCR recuperada, TCE..."
                        className="bg-zinc-950 border-zinc-700"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={createHypothermia.isPending || !searchId || !hypothermiaForm.indication}
                    onClick={() => {
                      createHypothermia.mutate(
                        { patientId: searchId, targetTemp: parseFloat(hypothermiaForm.targetTemp), indication: hypothermiaForm.indication, method: hypothermiaForm.method },
                        {
                          onSuccess: (data) => { setHypothermiaResult(data); toast.success('Sessao de hipotermia iniciada'); },
                          onError: () => toast.error('Erro ao iniciar hipotermia'),
                        },
                      );
                    }}
                  >
                    <Thermometer className="h-4 w-4 mr-2" />
                    {createHypothermia.isPending ? 'Iniciando...' : 'Iniciar Protocolo TTM'}
                  </Button>
                </CardContent>
              </Card>
              {hypothermiaResult && (
                <Card className="bg-blue-950/30 border-blue-700/50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-blue-400" />
                      <span className="font-semibold text-blue-300">Sessao de Hipotermia Ativa</span>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">{hypothermiaResult.phase}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-zinc-400">Alvo:</span> <span className="font-bold">{hypothermiaResult.targetTemp} C</span></div>
                      <div><span className="text-zinc-400">Atual:</span> <span className="font-bold">{hypothermiaResult.currentTemp} C</span></div>
                      <div><span className="text-zinc-400">Inicio:</span> {formatDate(hypothermiaResult.startedAt)}</div>
                    </div>
                    {hypothermiaResult.complications.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-blue-800">
                        <p className="text-sm font-medium text-yellow-400">Complicacoes:</p>
                        {hypothermiaResult.complications.map((c, i) => (
                          <p key={i} className="text-sm text-yellow-300 flex items-start gap-2"><AlertTriangle className="h-3 w-3 mt-1 shrink-0" />{c}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-3 text-zinc-300">Fases do Protocolo TTM</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-md bg-blue-500/10">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm text-blue-400 font-medium">Inducao</span>
                      <span className="text-xs text-zinc-400 ml-auto">Resfriar ate alvo (1-4h)</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md bg-cyan-500/10">
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                      <span className="text-sm text-cyan-400 font-medium">Manutencao</span>
                      <span className="text-xs text-zinc-400 ml-auto">Manter temperatura (24h)</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md bg-yellow-500/10">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm text-yellow-400 font-medium">Reaquecimento</span>
                      <span className="text-xs text-zinc-400 ml-auto">0.25 C/h ate 37 C</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md bg-emerald-500/10">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm text-emerald-400 font-medium">Normotermia</span>
                      <span className="text-xs text-zinc-400 ml-auto">Evitar febre por 72h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Sepsis Early Detection Tab */}
          <TabsContent value="ai-sepsis" className="mt-4">
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Deteccao precoce de sepse com IA — analisa sinais vitais e laboratorio para calcular risco e qSOFA/SOFA estimado.
              </p>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-base">Parametros do Paciente</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>FC (bpm)</Label>
                      <Input type="number" value={sepsisForm.heartRate} onChange={(e) => setSepsisForm((f) => ({ ...f, heartRate: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="90" />
                    </div>
                    <div className="space-y-1">
                      <Label>FR (irpm)</Label>
                      <Input type="number" value={sepsisForm.respiratoryRate} onChange={(e) => setSepsisForm((f) => ({ ...f, respiratoryRate: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="22" />
                    </div>
                    <div className="space-y-1">
                      <Label>PAS (mmHg)</Label>
                      <Input type="number" value={sepsisForm.systolicBP} onChange={(e) => setSepsisForm((f) => ({ ...f, systolicBP: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Temperatura (C)</Label>
                      <Input type="number" value={sepsisForm.temperature} onChange={(e) => setSepsisForm((f) => ({ ...f, temperature: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="38.5" />
                    </div>
                    <div className="space-y-1">
                      <Label>Leucocitos (mil/mm3)</Label>
                      <Input type="number" value={sepsisForm.wbc} onChange={(e) => setSepsisForm((f) => ({ ...f, wbc: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="15" />
                    </div>
                    <div className="space-y-1">
                      <Label>Lactato (mmol/L)</Label>
                      <Input type="number" value={sepsisForm.lactate} onChange={(e) => setSepsisForm((f) => ({ ...f, lactate: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="2.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label>Glasgow</Label>
                      <Input type="number" value={sepsisForm.gcs} onChange={(e) => setSepsisForm((f) => ({ ...f, gcs: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="15" />
                    </div>
                    <div className="space-y-1">
                      <Label>Creatinina</Label>
                      <Input type="number" value={sepsisForm.creatinine} onChange={(e) => setSepsisForm((f) => ({ ...f, creatinine: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="1.2" />
                    </div>
                    <div className="space-y-1">
                      <Label>Bilirrubina</Label>
                      <Input type="number" value={sepsisForm.bilirubin} onChange={(e) => setSepsisForm((f) => ({ ...f, bilirubin: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="1.0" />
                    </div>
                    <div className="space-y-1">
                      <Label>Plaquetas (mil)</Label>
                      <Input type="number" value={sepsisForm.platelets} onChange={(e) => setSepsisForm((f) => ({ ...f, platelets: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="200" />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    disabled={detectSepsis.isPending || !searchId}
                    onClick={() => {
                      const s = sepsisForm;
                      detectSepsis.mutate(
                        {
                          patientId: searchId,
                          heartRate: s.heartRate ? parseFloat(s.heartRate) : undefined,
                          respiratoryRate: s.respiratoryRate ? parseFloat(s.respiratoryRate) : undefined,
                          systolicBP: s.systolicBP ? parseFloat(s.systolicBP) : undefined,
                          temperature: s.temperature ? parseFloat(s.temperature) : undefined,
                          wbc: s.wbc ? parseFloat(s.wbc) : undefined,
                          lactate: s.lactate ? parseFloat(s.lactate) : undefined,
                          gcs: s.gcs ? parseFloat(s.gcs) : undefined,
                          creatinine: s.creatinine ? parseFloat(s.creatinine) : undefined,
                          bilirubin: s.bilirubin ? parseFloat(s.bilirubin) : undefined,
                          platelets: s.platelets ? parseFloat(s.platelets) : undefined,
                          pao2fio2: s.pao2fio2 ? parseFloat(s.pao2fio2) : undefined,
                        },
                        {
                          onSuccess: (data) => {
                            setSepsisResult(data);
                            const lvl = data.riskLevel;
                            toast[lvl === 'CRITICAL' || lvl === 'HIGH' ? 'error' : lvl === 'MODERATE' ? 'warning' : 'success'](`Risco de sepse: ${lvl} (${data.riskScore}%)`);
                          },
                          onError: () => toast.error('Erro na deteccao de sepse'),
                        },
                      );
                    }}
                  >
                    <Flame className="h-4 w-4 mr-2" />
                    {detectSepsis.isPending ? 'Analisando...' : 'Analisar Risco de Sepse'}
                  </Button>
                </CardContent>
              </Card>
              {sepsisResult && (
                <Card className={cn('border', {
                  'bg-emerald-950/30 border-emerald-700/50': sepsisResult.riskLevel === 'LOW',
                  'bg-yellow-950/30 border-yellow-700/50': sepsisResult.riskLevel === 'MODERATE',
                  'bg-orange-950/30 border-orange-700/50': sepsisResult.riskLevel === 'HIGH',
                  'bg-red-950/30 border-red-700/50': sepsisResult.riskLevel === 'CRITICAL',
                })}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className={cn('h-6 w-6', {
                          'text-emerald-400': sepsisResult.riskLevel === 'LOW',
                          'text-yellow-400': sepsisResult.riskLevel === 'MODERATE',
                          'text-orange-400': sepsisResult.riskLevel === 'HIGH',
                          'text-red-400': sepsisResult.riskLevel === 'CRITICAL',
                        })} />
                        <div>
                          <p className="text-sm font-medium text-zinc-300">Score de Risco</p>
                          <p className="text-3xl font-bold">{sepsisResult.riskScore}%</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant="outline" className={cn('text-sm', {
                          'bg-emerald-500/20 text-emerald-400 border-emerald-500/50': sepsisResult.riskLevel === 'LOW',
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/50': sepsisResult.riskLevel === 'MODERATE',
                          'bg-orange-500/20 text-orange-400 border-orange-500/50': sepsisResult.riskLevel === 'HIGH',
                          'bg-red-500/20 text-red-400 border-red-500/50': sepsisResult.riskLevel === 'CRITICAL',
                        })}>
                          {sepsisResult.riskLevel}
                        </Badge>
                        <p className="text-xs text-zinc-400">qSOFA: {sepsisResult.qSofaScore}</p>
                        {sepsisResult.sofaEstimate !== null && <p className="text-xs text-zinc-400">SOFA est.: {sepsisResult.sofaEstimate}</p>}
                      </div>
                    </div>
                    {sepsisResult.contributingFactors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-300">Fatores contribuintes:</p>
                        {sepsisResult.contributingFactors.map((f, i) => (
                          <p key={i} className="text-sm text-yellow-300 flex items-start gap-2"><AlertTriangle className="h-3 w-3 mt-1 shrink-0" />{f}</p>
                        ))}
                      </div>
                    )}
                    {sepsisResult.recommendedActions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-300">Acoes recomendadas:</p>
                        {sepsisResult.recommendedActions.map((a, i) => (
                          <p key={i} className="text-sm text-emerald-300 flex items-start gap-2"><CheckCircle2 className="h-3 w-3 mt-1 shrink-0" />{a}</p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 italic">{sepsisResult.disclaimer}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* AI Extubation Readiness Tab */}
          <TabsContent value="ai-extubation" className="mt-4">
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Avaliacao de prontidao para extubacao com IA — analisa criterios ventilatorios e clinicos.
              </p>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-base">Parametros Ventilatorios</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label>FiO2 (%)</Label>
                      <Input type="number" value={extubationForm.fio2} onChange={(e) => setExtubationForm((f) => ({ ...f, fio2: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="40" />
                    </div>
                    <div className="space-y-1">
                      <Label>PEEP (cmH2O)</Label>
                      <Input type="number" value={extubationForm.peep} onChange={(e) => setExtubationForm((f) => ({ ...f, peep: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="5" />
                    </div>
                    <div className="space-y-1">
                      <Label>PaO2 (mmHg)</Label>
                      <Input type="number" value={extubationForm.pao2} onChange={(e) => setExtubationForm((f) => ({ ...f, pao2: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="80" />
                    </div>
                    <div className="space-y-1">
                      <Label>RSBI (f/Vt)</Label>
                      <Input type="number" value={extubationForm.rsbi} onChange={(e) => setExtubationForm((f) => ({ ...f, rsbi: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="60" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Glasgow</Label>
                      <Input type="number" value={extubationForm.gcs} onChange={(e) => setExtubationForm((f) => ({ ...f, gcs: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="11" />
                    </div>
                    <div className="space-y-1">
                      <Label>Forca da Tosse</Label>
                      <Select value={extubationForm.coughStrength} onValueChange={(v) => setExtubationForm((f) => ({ ...f, coughStrength: v }))}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STRONG">Forte</SelectItem>
                          <SelectItem value="MODERATE">Moderada</SelectItem>
                          <SelectItem value="WEAK">Fraca</SelectItem>
                          <SelectItem value="ABSENT">Ausente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Secrecoes</Label>
                      <Select value={extubationForm.secretions} onValueChange={(v) => setExtubationForm((f) => ({ ...f, secretions: v }))}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MINIMAL">Minima</SelectItem>
                          <SelectItem value="MODERATE">Moderada</SelectItem>
                          <SelectItem value="COPIOUS">Abundante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Estabilidade Hemodinamica</Label>
                    <Select value={extubationForm.hemodynamicStable} onValueChange={(v) => setExtubationForm((f) => ({ ...f, hemodynamicStable: v }))}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sim — estavel, sem DVA ou dose baixa</SelectItem>
                        <SelectItem value="false">Nao — instavel ou em DVA alta dose</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={assessExtubation.isPending || !searchId}
                    onClick={() => {
                      const e = extubationForm;
                      assessExtubation.mutate(
                        {
                          patientId: searchId,
                          fio2: e.fio2 ? parseFloat(e.fio2) : undefined,
                          peep: e.peep ? parseFloat(e.peep) : undefined,
                          pao2: e.pao2 ? parseFloat(e.pao2) : undefined,
                          rsbi: e.rsbi ? parseFloat(e.rsbi) : undefined,
                          gcs: e.gcs ? parseFloat(e.gcs) : undefined,
                          coughStrength: e.coughStrength || undefined,
                          secretions: e.secretions || undefined,
                          hemodynamicStable: e.hemodynamicStable === 'true',
                        },
                        {
                          onSuccess: (data) => {
                            setExtubationResult(data);
                            toast[data.readyForExtubation ? 'success' : 'warning'](data.recommendation);
                          },
                          onError: () => toast.error('Erro na avaliacao de extubacao'),
                        },
                      );
                    }}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {assessExtubation.isPending ? 'Avaliando...' : 'Avaliar Prontidao para Extubacao'}
                  </Button>
                </CardContent>
              </Card>
              {extubationResult && (
                <Card className={extubationResult.readyForExtubation ? 'bg-emerald-950/30 border-emerald-700/50' : 'bg-yellow-950/30 border-yellow-700/50'}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {extubationResult.readyForExtubation ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <AlertTriangle className="h-6 w-6 text-yellow-400" />}
                        <div>
                          <p className="font-semibold">{extubationResult.readyForExtubation ? 'PRONTO PARA EXTUBACAO' : 'NAO PRONTO PARA EXTUBACAO'}</p>
                          <p className="text-sm text-muted-foreground">Score de prontidao: {extubationResult.readinessScore}%</p>
                        </div>
                      </div>
                      {extubationResult.sbtRecommended && (
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">SBT Recomendado</Badge>
                      )}
                    </div>
                    {extubationResult.factors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-300">Criterios avaliados:</p>
                        {extubationResult.factors.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {f.status === 'MET' ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : f.status === 'BORDERLINE' ? <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" /> : <Circle className="h-4 w-4 text-red-400 shrink-0" />}
                            <span>{f.factor}</span>
                            {f.value && <span className="text-zinc-400 ml-auto font-mono">{f.value}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm font-medium">{extubationResult.recommendation}</p>
                    <p className="text-xs text-zinc-500 italic">{extubationResult.disclaimer}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* AI Vasopressor Optimization Tab */}
          <TabsContent value="ai-vasopressor" className="mt-4">
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Otimizacao de vasopressores com IA — sugere ajustes de dose baseado em MAP, lactato e debito urinario.
              </p>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-base">Parametros Hemodinamicos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>MAP Atual (mmHg)</Label>
                      <Input type="number" value={vasoOptForm.currentMap} onChange={(e) => setVasoOptForm((f) => ({ ...f, currentMap: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="60" />
                    </div>
                    <div className="space-y-1">
                      <Label>MAP Alvo Min</Label>
                      <Input type="number" value={vasoOptForm.targetMapMin} onChange={(e) => setVasoOptForm((f) => ({ ...f, targetMapMin: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="65" />
                    </div>
                    <div className="space-y-1">
                      <Label>MAP Alvo Max</Label>
                      <Input type="number" value={vasoOptForm.targetMapMax} onChange={(e) => setVasoOptForm((f) => ({ ...f, targetMapMax: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="80" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Droga Atual</Label>
                      <Select value={vasoOptForm.drugName} onValueChange={(v) => setVasoOptForm((f) => ({ ...f, drugName: v }))}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="norepinephrine">Norepinefrina</SelectItem>
                          <SelectItem value="vasopressin">Vasopressina</SelectItem>
                          <SelectItem value="epinephrine">Epinefrina</SelectItem>
                          <SelectItem value="dopamine">Dopamina</SelectItem>
                          <SelectItem value="dobutamine">Dobutamina</SelectItem>
                          <SelectItem value="phenylephrine">Fenilefrina</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Dose Atual (mcg/kg/min)</Label>
                      <Input type="number" value={vasoOptForm.drugDose} onChange={(e) => setVasoOptForm((f) => ({ ...f, drugDose: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="0.1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Lactato (mmol/L)</Label>
                      <Input type="number" value={vasoOptForm.lactate} onChange={(e) => setVasoOptForm((f) => ({ ...f, lactate: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="2.0" />
                    </div>
                    <div className="space-y-1">
                      <Label>Debito Urinario (mL/kg/h)</Label>
                      <Input type="number" value={vasoOptForm.urinOutput} onChange={(e) => setVasoOptForm((f) => ({ ...f, urinOutput: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="0.5" />
                    </div>
                    <div className="space-y-1">
                      <Label>Balanco Hidrico (mL)</Label>
                      <Input type="number" value={vasoOptForm.fluidBalanceMl} onChange={(e) => setVasoOptForm((f) => ({ ...f, fluidBalanceMl: e.target.value }))} className="bg-zinc-950 border-zinc-700" placeholder="1500" />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={optimizeVaso.isPending || !searchId || !vasoOptForm.currentMap}
                    onClick={() => {
                      const v = vasoOptForm;
                      optimizeVaso.mutate(
                        {
                          patientId: searchId,
                          currentMap: parseFloat(v.currentMap),
                          targetMapMin: v.targetMapMin ? parseFloat(v.targetMapMin) : undefined,
                          targetMapMax: v.targetMapMax ? parseFloat(v.targetMapMax) : undefined,
                          currentDrugs: v.drugDose ? [{ drug: v.drugName, doseMcgKgMin: parseFloat(v.drugDose) }] : [],
                          lactate: v.lactate ? parseFloat(v.lactate) : undefined,
                          urinOutput: v.urinOutput ? parseFloat(v.urinOutput) : undefined,
                          fluidBalanceMl: v.fluidBalanceMl ? parseFloat(v.fluidBalanceMl) : undefined,
                        },
                        {
                          onSuccess: (data) => { setVasoOptResult(data); toast.success('Otimizacao calculada'); },
                          onError: () => toast.error('Erro na otimizacao de vasopressores'),
                        },
                      );
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {optimizeVaso.isPending ? 'Calculando...' : 'Otimizar Vasopressores'}
                  </Button>
                </CardContent>
              </Card>
              {vasoOptResult && (
                <Card className="bg-purple-950/30 border-purple-700/50">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        <span className="font-semibold text-purple-300">Recomendacao de Otimizacao</span>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-zinc-400">MAP: <span className="text-white font-bold">{vasoOptResult.currentMap} mmHg</span></p>
                        <p className="text-zinc-400">Alvo: {vasoOptResult.mapTarget.min}-{vasoOptResult.mapTarget.max} mmHg</p>
                      </div>
                    </div>
                    {vasoOptResult.fluidResponsive !== null && (
                      <p className="text-sm">
                        Responsivo a fluido: {vasoOptResult.fluidResponsive
                          ? <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">Sim</Badge>
                          : <Badge variant="outline" className="bg-zinc-500/20 text-zinc-400 border-zinc-500/50">Nao</Badge>}
                      </p>
                    )}
                    {vasoOptResult.suggestedChanges.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-300">Ajustes sugeridos:</p>
                        {vasoOptResult.suggestedChanges.map((change, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-md bg-zinc-800/50">
                            <Badge variant="outline" className={cn('text-xs', {
                              'bg-red-500/20 text-red-400 border-red-500/50': change.action === 'INCREASE',
                              'bg-emerald-500/20 text-emerald-400 border-emerald-500/50': change.action === 'DECREASE',
                              'bg-blue-500/20 text-blue-400 border-blue-500/50': change.action === 'ADD',
                              'bg-zinc-500/20 text-zinc-400 border-zinc-500/50': change.action === 'REMOVE',
                            })}>
                              {change.action}
                            </Badge>
                            <span className="font-medium">{change.drug}</span>
                            {change.suggestedDose && <span className="text-zinc-400">→ {change.suggestedDose}</span>}
                            <span className="text-zinc-500 ml-auto text-xs">{change.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm font-medium">{vasoOptResult.recommendation}</p>
                    <p className="text-xs text-zinc-500 italic">{vasoOptResult.disclaimer}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <VasoactiveCalculatorDialog open={vasoactiveDialog} onClose={() => setVasoactiveDialog(false)} />
    </div>
  );
}

// ============================================================================
// Daily Goals Checklist Section
// ============================================================================

const DAILY_GOALS_CATEGORIES = [
  {
    category: 'Neurologico',
    icon: Brain,
    color: 'text-purple-400',
    items: [
      { key: 'sedation_vacation', label: 'Despertar diario (SAT) realizado' },
      { key: 'rass_target', label: 'RASS no alvo' },
      { key: 'delirium_screening', label: 'Triagem de delirium (CAM-ICU)' },
      { key: 'pain_assessment', label: 'Avaliacao de dor (BPS/CPOT)' },
    ],
  },
  {
    category: 'Respiratorio',
    icon: Wind,
    color: 'text-blue-400',
    items: [
      { key: 'sbt_trial', label: 'Teste de respiracao espontanea (SBT)' },
      { key: 'head_elevation', label: 'Cabeceira elevada 30-45 graus' },
      { key: 'oral_hygiene', label: 'Higiene oral com clorexidina' },
      { key: 'lung_protective', label: 'Ventilacao protetora (VT 6mL/kg, DP<15)' },
    ],
  },
  {
    category: 'Cardiovascular',
    icon: HeartPulse,
    color: 'text-red-400',
    items: [
      { key: 'map_target', label: 'MAP no alvo (>=65 mmHg)' },
      { key: 'vasopressor_weaning', label: 'Avaliar desmame de DVA' },
      { key: 'fluid_balance', label: 'Balanco hidrico revisado' },
      { key: 'dvt_prophylaxis', label: 'Profilaxia TVP' },
    ],
  },
  {
    category: 'Renal / Metabolico',
    icon: Droplets,
    color: 'text-cyan-400',
    items: [
      { key: 'urine_output', label: 'Debito urinario monitorado' },
      { key: 'electrolytes', label: 'Eletrolitos corrigidos' },
      { key: 'glycemic_control', label: 'Controle glicemico (140-180 mg/dL)' },
      { key: 'catheter_review', label: 'Revisao de necessidade de SVD' },
    ],
  },
  {
    category: 'Infeccioso',
    icon: Shield,
    color: 'text-orange-400',
    items: [
      { key: 'antibiotic_review', label: 'Antibioticos revisados (descalonamento)' },
      { key: 'cultures_pending', label: 'Culturas pendentes verificadas' },
      { key: 'line_review', label: 'Necessidade de acesso central revisada' },
      { key: 'temp_monitoring', label: 'Curva termica monitorada' },
    ],
  },
  {
    category: 'Nutricao / Mobilidade',
    icon: Utensils,
    color: 'text-emerald-400',
    items: [
      { key: 'nutrition_started', label: 'Nutricao enteral precoce (ate 48h)' },
      { key: 'caloric_target', label: 'Alvo calorico atingido' },
      { key: 'early_mobilization', label: 'Mobilizacao precoce realizada' },
      { key: 'ulcer_prophylaxis', label: 'Profilaxia ulcera de estresse' },
    ],
  },
];

function DailyGoalsSection({ patientId }: { patientId: string }) {
  const createGoals = useCreateDailyGoals();
  const [goals, setGoals] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  const totalItems = DAILY_GOALS_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedCount = Object.values(goals).filter(Boolean).length;
  const completionPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const toggleGoal = (key: string) => {
    setGoals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    createGoals.mutate(
      { patientId, goals, notes: notes || undefined, date: new Date().toISOString().slice(0, 10) },
      {
        onSuccess: () => toast.success('Metas diarias salvas'),
        onError: () => toast.error('Erro ao salvar metas'),
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold">Metas Diarias — {new Date().toLocaleDateString('pt-BR')}</h3>
            </div>
            <Badge variant="outline" className={cn(
              completionPercent === 100 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
              completionPercent >= 70 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
              'bg-red-500/20 text-red-400 border-red-500/50',
            )}>
              {checkedCount}/{totalItems} ({completionPercent}%)
            </Badge>
          </div>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500',
                completionPercent === 100 ? 'bg-emerald-500' : completionPercent >= 70 ? 'bg-yellow-500' : 'bg-red-500',
              )}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Goal Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAILY_GOALS_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const catChecked = cat.items.filter((i) => goals[i.key]).length;
          return (
            <Card key={cat.category} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className={cn('text-sm flex items-center gap-2', cat.color)}>
                    <Icon className="h-4 w-4" />
                    {cat.category}
                  </CardTitle>
                  <span className="text-xs text-zinc-500">{catChecked}/{cat.items.length}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {cat.items.map((item) => (
                  <label key={item.key} className="flex items-start gap-2 cursor-pointer group">
                    <button
                      onClick={() => toggleGoal(item.key)}
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        goals[item.key]
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-600 group-hover:border-zinc-400',
                      )}
                    >
                      {goals[item.key] && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </button>
                    <span className={cn('text-xs flex-1', goals[item.key] ? 'text-zinc-500 line-through' : 'text-zinc-300')}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes + Save */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4 space-y-3">
          <Label className="text-xs">Observacoes do round</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observacoes adicionais do round multidisciplinar..."
            className="bg-zinc-950 border-zinc-700"
          />
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
            disabled={createGoals.isPending}
          >
            {createGoals.isPending ? 'Salvando...' : 'Salvar Metas Diarias'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Prone Positioning Section
// ============================================================================

interface ProneSession {
  id: string;
  startTime: Date;
  targetHours: number;
  position: 'PRONE' | 'SUPINE';
}

function PronePositioningSection({ patientId }: { patientId: string }) {
  const createProne = useCreateProneSession();
  const [sessions, setSessions] = useState<ProneSession[]>([]);
  const [activeSession, setActiveSession] = useState<ProneSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [targetHours, setTargetHours] = useState('16');
  const [indication, setIndication] = useState('');

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const elapsedHours = elapsed / 3600;
  const targetSecs = (activeSession?.targetHours ?? 16) * 3600;
  const progressPercent = activeSession ? Math.min((elapsed / targetSecs) * 100, 100) : 0;
  const isComplete = elapsed >= targetSecs;

  const handleStartProne = () => {
    const session: ProneSession = {
      id: `prone-${Date.now()}`,
      startTime: new Date(),
      targetHours: parseInt(targetHours, 10) || 16,
      position: 'PRONE',
    };
    setActiveSession(session);
    setElapsed(0);
    createProne.mutate(
      { patientId, targetHours: session.targetHours, indication },
      {
        onSuccess: () => toast.success('Sessao de prona iniciada'),
        onError: () => toast.error('Erro ao registrar prona'),
      },
    );
  };

  const handleEndProne = () => {
    if (activeSession) {
      setSessions((prev) => [...prev, activeSession]);
      setActiveSession(null);
      setElapsed(0);
      toast.success('Sessao de prona finalizada');
    }
  };

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Active Session */}
      {activeSession ? (
        <Card className={cn('border-2', isComplete ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-blue-950/20 border-blue-500/50')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-full',
                  isComplete ? 'bg-emerald-500/20' : 'bg-blue-500/20',
                )}>
                  <RotateCcw className={cn('h-6 w-6', isComplete ? 'text-emerald-400' : 'text-blue-400 animate-spin')} style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Paciente em Prona</h3>
                  <p className="text-xs text-zinc-400">Iniciado: {activeSession.startTime.toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn('font-mono text-3xl font-bold tabular-nums', isComplete ? 'text-emerald-400' : 'text-blue-400')}>
                  {formatElapsed(elapsed)}
                </p>
                <p className="text-xs text-zinc-500">Alvo: {activeSession.targetHours}h</p>
              </div>
            </div>

            <div className="h-4 rounded-full bg-zinc-800 overflow-hidden mb-3">
              <div
                className={cn('h-full rounded-full transition-all duration-1000',
                  isComplete ? 'bg-emerald-500' : 'bg-blue-500',
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-xs text-zinc-400">
                <span>Tempo decorrido: {elapsedHours.toFixed(1)}h</span>
                <span>Restante: {Math.max(0, (activeSession.targetHours - elapsedHours)).toFixed(1)}h</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                onClick={handleEndProne}
              >
                <Timer className="h-4 w-4 mr-1" />
                Finalizar Prona
              </Button>
            </div>

            {isComplete && (
              <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 inline mr-2" />
                Tempo alvo atingido! Avalie se deve retornar ao supino ou manter pronacao.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-400" />
              Iniciar Sessao de Prona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-zinc-400">
              Protocolo de pronacao para SDRA (PaO2/FiO2 {'<'} 150). Alvo: 16h em prona.
              Monitorar pontos de pressao a cada 2h.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Duracao alvo (horas)</Label>
                <Select value={targetHours} onValueChange={setTargetHours}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 horas</SelectItem>
                    <SelectItem value="16">16 horas (recomendado)</SelectItem>
                    <SelectItem value="20">20 horas</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Indicacao</Label>
                <Input value={indication} onChange={(e) => setIndication(e.target.value)} placeholder="SDRA grave, P/F < 150..." className="bg-zinc-950 border-zinc-700" />
              </div>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleStartProne}
              disabled={createProne.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {createProne.isPending ? 'Iniciando...' : 'Iniciar Pronacao'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Checklist during prone */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Checklist de Pronacao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            'Verificar fixacao do TOT e posicao',
            'Proteger olhos (pomada e oclusao)',
            'Proteger pontos de pressao (face, torax, pelve, joelhos)',
            'Posicionar bracos em "nadador" — alternar a cada 2h',
            'Monitorar PA, FC, SpO2 continuamente',
            'Verificar acessos venosos e drenos',
            'Aspirar secrecoes antes de pronar',
            'Manter sedacao adequada durante procedimento',
            'Equipe minima de 5 pessoas para virar',
            'Documentar horario e equipe envolvida',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
              <Circle className="h-3 w-3 mt-0.5 shrink-0 text-zinc-600" />
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Session History */}
      {sessions.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Historico de Sessoes ({sessions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800 text-sm">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-blue-400" />
                  <span>{s.startTime.toLocaleString('pt-BR')}</span>
                </div>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                  {s.targetHours}h
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Ventilation Weaning Protocol Section
// ============================================================================

const WEANING_CRITERIA = [
  { key: 'cause_resolved', label: 'Causa da intubacao resolvida ou em melhora', critical: true },
  { key: 'fio2_40', label: 'FiO2 <= 40%', critical: true },
  { key: 'peep_8', label: 'PEEP <= 8 cmH2O', critical: true },
  { key: 'hemodynamic', label: 'Estavel hemodinamicamente (sem DVA alta dose)', critical: true },
  { key: 'neuro', label: 'Glasgow >= 8T ou obedece comandos', critical: true },
  { key: 'temp', label: 'Temperatura < 38.5 C', critical: false },
  { key: 'hb', label: 'Hemoglobina >= 7 g/dL', critical: false },
  { key: 'ph', label: 'pH 7.30 - 7.50', critical: false },
  { key: 'cough', label: 'Reflexo de tosse presente', critical: false },
  { key: 'secretions', label: 'Secrecoes moderadas ou minimas', critical: false },
];

const SBT_STEPS = [
  { step: 1, label: 'Triagem de prontidao', desc: 'Verificar todos os criterios acima', duration: '5 min' },
  { step: 2, label: 'Despertar diario (SAT)', desc: 'Pausar sedacao e avaliar RASS', duration: '30-60 min' },
  { step: 3, label: 'Teste de respiracao espontanea', desc: 'PSV 5-7 cmH2O + PEEP 5 ou Tubo-T por 30-120 min', duration: '30-120 min' },
  { step: 4, label: 'Avaliacao durante SBT', desc: 'Monitorar FR, SpO2, FC, PA, uso de musculatura acessoria', duration: 'Continuo' },
  { step: 5, label: 'Decisao de extubacao', desc: 'Passou no SBT? Cuff-leak positivo? Preparar extubacao', duration: '5 min' },
];

function WeaningProtocolSection({ ventilation }: { ventilation: Array<Record<string, unknown>> }) {
  const [criteria, setCriteria] = useState<Record<string, boolean>>({});
  const [sbtStep, setSbtStep] = useState(0);
  const [sbtTimer, setSbtTimer] = useState(0);
  const [sbtActive, setSbtActive] = useState(false);

  useEffect(() => {
    if (!sbtActive) return;
    const interval = setInterval(() => setSbtTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [sbtActive]);

  const criticalMet = WEANING_CRITERIA.filter((c) => c.critical).every((c) => criteria[c.key]);
  const totalMet = WEANING_CRITERIA.filter((c) => criteria[c.key]).length;
  const readinessPercent = Math.round((totalMet / WEANING_CRITERIA.length) * 100);

  // Build P/F ratio trend from ventilation data
  const pfTrend = useMemo(() => {
    if (!ventilation || ventilation.length === 0) return [];
    return ventilation.slice(0, 20).reverse().map((v) => ({
      time: new Date(v.recordedAt as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      pf: (v.pfRatio as number) ?? null,
      fio2: (v.fio2 as number) ?? null,
      peep: (v.peep as number) ?? null,
    })).filter((d) => d.pf !== null);
  }, [ventilation]);

  const formatSbtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* P/F Trend Chart */}
      {pfTrend.length > 1 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendencia P/F Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pfTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 10 }} domain={[0, 500]} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="pf" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} name="P/F Ratio" />
                  {/* Reference lines for SDRA classification */}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><div className="h-2 w-6 bg-red-500/30 rounded" /> SDRA Grave ({'<'} 100)</span>
              <span className="flex items-center gap-1"><div className="h-2 w-6 bg-orange-500/30 rounded" /> SDRA Moderada (100-200)</span>
              <span className="flex items-center gap-1"><div className="h-2 w-6 bg-yellow-500/30 rounded" /> SDRA Leve (200-300)</span>
              <span className="flex items-center gap-1"><div className="h-2 w-6 bg-emerald-500/30 rounded" /> Normal ({'>'} 300)</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Readiness Criteria */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-emerald-400" />
                Criterios de Prontidao para Desmame
              </CardTitle>
              <Badge variant="outline" className={cn(
                readinessPercent === 100 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                readinessPercent >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                'bg-red-500/20 text-red-400 border-red-500/50',
              )}>
                {totalMet}/{WEANING_CRITERIA.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {WEANING_CRITERIA.map((c) => (
              <label key={c.key} className="flex items-start gap-2 cursor-pointer group">
                <button
                  onClick={() => setCriteria((prev) => ({ ...prev, [c.key]: !prev[c.key] }))}
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    criteria[c.key]
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-zinc-600 group-hover:border-zinc-400',
                  )}
                >
                  {criteria[c.key] && <CheckCircle2 className="h-3 w-3 text-white" />}
                </button>
                <span className={cn('text-xs flex-1', criteria[c.key] ? 'text-zinc-500 line-through' : 'text-zinc-300')}>
                  {c.label}
                  {c.critical && <span className="text-red-400 ml-1">*</span>}
                </span>
              </label>
            ))}
            <p className="text-[10px] text-zinc-600 mt-2">* Criterios obrigatorios para iniciar SBT</p>

            {criticalMet && (
              <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                Criterios criticos atendidos — elegivel para SBT!
              </div>
            )}
          </CardContent>
        </Card>

        {/* SBT Protocol Steps */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wind className="h-5 w-5 text-blue-400" />
              Protocolo SBT (Teste de Respiracao Espontanea)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SBT_STEPS.map((step) => (
              <div
                key={step.step}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                  sbtStep >= step.step
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : sbtStep === step.step - 1
                      ? 'bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10'
                      : 'bg-zinc-800/50 border-zinc-700/50',
                )}
                onClick={() => setSbtStep(step.step)}
              >
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  sbtStep >= step.step ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400',
                )}>
                  {sbtStep >= step.step ? <CheckCircle2 className="h-4 w-4" /> : step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', sbtStep >= step.step ? 'text-emerald-400' : 'text-zinc-300')}>
                    {step.label}
                  </p>
                  <p className="text-xs text-zinc-500">{step.desc}</p>
                </div>
                <span className="text-[10px] text-zinc-600 shrink-0">{step.duration}</span>
              </div>
            ))}

            {/* SBT Timer */}
            {sbtStep >= 3 && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-center">
                <p className="text-xs text-zinc-400 mb-2">Cronometro SBT</p>
                <p className="font-mono text-3xl font-bold text-blue-400 tabular-nums">
                  {formatSbtTime(sbtTimer)}
                </p>
                <div className="flex gap-2 justify-center mt-3">
                  {!sbtActive ? (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setSbtActive(true)}>
                      <Clock className="h-3 w-3 mr-1" /> Iniciar SBT
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-red-500/50 text-red-400" onClick={() => { setSbtActive(false); setSbtTimer(0); }}>
                      Parar
                    </Button>
                  )}
                </div>
                {sbtTimer >= 1800 && (
                  <p className="text-xs text-emerald-400 mt-2">
                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                    30 minutos atingidos — avaliar paciente
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
