import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  BrainCircuit,
  Activity,
  Heart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Bed,
  Users,
  BarChart3,
  RefreshCw,
  Shield,
  Thermometer,
  Zap,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Settings,
  Bell,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Stethoscope,
  Building2,
  ArrowRightLeft,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,

} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useSepsisPrediction,
  useCardiacArrestPrediction,
  useReadmissionPrediction,
  useLOSPrediction,
  useMortalityPrediction,
  useDemandForecast,
  useBedOptimization,
  type SepsisRiskPatient,
  type CardiacArrestRisk,
  type BedOptimizationSuggestion,
  type SHAPFeature,
  type RiskFactor,
} from '@/services/ai-predictive.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_COLORS = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50',
};

const READMISSION_RISK_COLORS = {
  VERY_HIGH: 'bg-red-600/30 text-red-300 border-red-600/50',
  HIGH: 'bg-red-500/20 text-red-400 border-red-500/50',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  LOW: 'bg-green-500/20 text-green-400 border-green-500/50',
};

const READMISSION_RISK_LABELS: Record<string, string> = {
  VERY_HIGH: 'Muito Alto',
  HIGH: 'Alto',
  MODERATE: 'Moderado',
  LOW: 'Baixo',
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baixa',
};

const INTERVENTION_TYPE_LABELS: Record<string, string> = {
  follow_up: 'Consulta Retorno',
  home_care: 'Home Care',
  education: 'Educacao',
  medication: 'Medicacao',
  telehealth: 'Telemedicina',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' });
}

function TrendIcon({ trend }: { trend: 'rising' | 'stable' | 'falling' }) {
  if (trend === 'rising') return <ArrowUpRight className="h-4 w-4 text-red-400" />;
  if (trend === 'falling') return <ArrowDownRight className="h-4 w-4 text-green-400" />;
  return <Minus className="h-4 w-4 text-yellow-400" />;
}

function RiskGauge({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const percent = Math.round(value * 100);
  const color = percent >= 70 ? 'text-red-400' : percent >= 40 ? 'text-yellow-400' : 'text-green-400';
  const bgColor = percent >= 70 ? 'bg-red-500' : percent >= 40 ? 'bg-yellow-500' : 'bg-emerald-500';
  const sizeClasses = { sm: 'h-2', md: 'h-3', lg: 'h-4' };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex-1 rounded-full bg-zinc-800', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', bgColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={cn('font-mono text-sm font-bold', color)}>{percent}%</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = RISK_COLORS[severity as keyof typeof RISK_COLORS] ?? RISK_COLORS.low;
  const labels: Record<string, string> = { critical: 'Critico', high: 'Alto', medium: 'Medio', low: 'Baixo' };
  return (
    <Badge variant="outline" className={cfg}>
      {labels[severity] ?? severity}
    </Badge>
  );
}

// ─── SHAP Chart ─────────────────────────────────────────────────────────────

function SHAPChart({ features }: { features: SHAPFeature[] }) {
  const sorted = useMemo(
    () => [...features].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    [features]
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 mb-3">Importancia SHAP — Fatores que mais influenciam a predicao</p>
      {sorted.map((f) => {
        const pct = Math.abs(f.impact) * 100;
        const isPositive = f.direction === 'positive';
        return (
          <div key={f.name} className="flex items-center gap-2">
            <span className="w-24 text-xs text-zinc-400 truncate text-right">{f.name}</span>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-5 bg-zinc-800 rounded relative overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded transition-all duration-700',
                    isPositive ? 'bg-red-500/60' : 'bg-blue-500/60'
                  )}
                  style={{ width: `${Math.min(pct * 2.5, 100)}%` }}
                />
              </div>
              <span className="w-12 text-xs text-zinc-400 text-right">
                {isPositive ? '+' : '-'}{(f.impact * 100).toFixed(1)}
              </span>
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
        <span className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-blue-500/60" /> Reduz risco
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-red-500/60" /> Aumenta risco
        </span>
      </div>
    </div>
  );
}

// ─── Risk Factor List ───────────────────────────────────────────────────────

function RiskFactorList({ factors }: { factors: RiskFactor[] }) {
  return (
    <div className="space-y-2">
      {factors.map((f, i) => (
        <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-zinc-800/50">
          <div className="mt-0.5">
            <SeverityBadge severity={f.severity} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200">{f.name}</p>
            <p className="text-xs text-zinc-400">{f.description}</p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">{(f.weight * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tab 1: Sepsis ──────────────────────────────────────────────────────────

function SepsisTab() {
  const { data: patients, isLoading, refetch } = useSepsisPrediction();
  const [selectedPatient, setSelectedPatient] = useState<SepsisRiskPatient | null>(null);
  const [alertThreshold, setAlertThreshold] = useState(0.6);

  const criticalCount = useMemo(
    () => (patients ?? []).filter((p) => p.riskScore >= 0.7).length,
    [patients]
  );

  const handleTriggerAlert = useCallback((patient: SepsisRiskPatient) => {
    toast.success(`Alerta de sepse disparado para ${patient.patientName}`);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{criticalCount}</p>
                <p className="text-xs text-zinc-400">Risco Critico</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20"><Activity className="h-5 w-5 text-yellow-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{(patients ?? []).length}</p>
                <p className="text-xs text-zinc-400">Pacientes Monitorados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20"><Clock className="h-5 w-5 text-emerald-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">4-6h</p>
                <p className="text-xs text-zinc-400">Janela Preditiva</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><Shield className="h-5 w-5 text-blue-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{Math.round(alertThreshold * 100)}%</p>
                <p className="text-xs text-zinc-400">Limiar de Alerta</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert threshold config */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuracao de Alerta
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-zinc-700">
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Limiar:</span>
            <div className="flex gap-2">
              {[0.4, 0.5, 0.6, 0.7, 0.8].map((t) => (
                <Button
                  key={t}
                  variant={alertThreshold === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAlertThreshold(t)}
                  className={cn(
                    alertThreshold === t
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'border-zinc-700 text-zinc-300'
                  )}
                >
                  {Math.round(t * 100)}%
                </Button>
              ))}
            </div>
            <span className="text-xs text-zinc-500 ml-2">
              Alertas disparam quando risco {'>'} {Math.round(alertThreshold * 100)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-red-400" />
            Pacientes UTI — Risco de Sepse em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Paciente</TableHead>
                <TableHead className="text-zinc-400">Leito</TableHead>
                <TableHead className="text-zinc-400">Risco</TableHead>
                <TableHead className="text-zinc-400">Tendencia</TableHead>
                <TableHead className="text-zinc-400">Onset Previsto</TableHead>
                <TableHead className="text-zinc-400">SOFA</TableHead>
                <TableHead className="text-zinc-400">qSOFA</TableHead>
                <TableHead className="text-zinc-400">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(patients ?? []).map((p) => (
                <TableRow
                  key={p.id}
                  className={cn(
                    'border-zinc-800 cursor-pointer hover:bg-zinc-800/50',
                    p.riskScore >= alertThreshold && 'bg-red-500/5'
                  )}
                  onClick={() => setSelectedPatient(p)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-zinc-200">{p.patientName}</p>
                      <p className="text-xs text-zinc-500">{p.mrn}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">{p.bed}</TableCell>
                  <TableCell>
                    <RiskGauge value={p.riskScore} size="sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={p.trend} />
                      <span className="text-xs text-zinc-400 capitalize">{p.trend === 'rising' ? 'Subindo' : p.trend === 'falling' ? 'Caindo' : 'Estavel'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-mono">{p.predictedOnset}</TableCell>
                  <TableCell>
                    <span className={cn('font-mono font-bold', p.sofa >= 6 ? 'text-red-400' : 'text-zinc-300')}>
                      {p.sofa}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('font-mono font-bold', p.qsofa >= 2 ? 'text-red-400' : 'text-zinc-300')}>
                      {p.qsofa}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.alertTriggered ? (
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
                          <Bell className="h-3 w-3 mr-1" /> Alerta Ativo
                        </Badge>
                      ) : p.riskScore >= alertThreshold ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          onClick={(e) => { e.stopPropagation(); handleTriggerAlert(p); }}
                        >
                          <Zap className="h-3 w-3 mr-1" /> Alertar
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Selected patient detail dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPatient && (
            <>
              <DialogHeader>
                <DialogTitle className="text-zinc-100 flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-emerald-400" />
                  {selectedPatient.patientName} — Analise de Sepse
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-zinc-800/60">
                    <p className="text-xs text-zinc-400">Risco Atual</p>
                    <RiskGauge value={selectedPatient.riskScore} />
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/60">
                    <p className="text-xs text-zinc-400">Onset Previsto</p>
                    <p className="text-xl font-bold text-zinc-100">{selectedPatient.predictedOnset}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-800/60">
                  <p className="text-sm font-medium text-zinc-200 mb-2">Sinais Vitais</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">Temperatura</p>
                      <p className="text-sm font-mono text-zinc-200">{selectedPatient.lastVitals.temperature} C</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">FC</p>
                      <p className="text-sm font-mono text-zinc-200">{selectedPatient.lastVitals.heartRate} bpm</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">FR</p>
                      <p className="text-sm font-mono text-zinc-200">{selectedPatient.lastVitals.respiratoryRate} irpm</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">PAS</p>
                      <p className="text-sm font-mono text-zinc-200">{selectedPatient.lastVitals.systolicBP} mmHg</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Leucocitos</p>
                      <p className="text-sm font-mono text-zinc-200">{selectedPatient.lastVitals.wbc.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Lactato</p>
                      <p className="text-sm font-mono text-zinc-200">{selectedPatient.lastVitals.lactate} mmol/L</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-800/60">
                  <p className="text-sm font-medium text-zinc-200 mb-3">SHAP — Importancia dos Fatores</p>
                  <SHAPChart features={selectedPatient.topFeatures} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 2: Cardiac Arrest ──────────────────────────────────────────────────

function CardiacArrestTab() {
  const { data: patients, isLoading } = useCardiacArrestPrediction();

  const handleTriggerRapidResponse = useCallback((patient: CardiacArrestRisk) => {
    toast.success(`Time de Resposta Rapida acionado para ${patient.patientName}`);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20"><Heart className="h-5 w-5 text-red-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {(patients ?? []).filter((p) => p.riskScore >= 0.6).length}
                </p>
                <p className="text-xs text-zinc-400">Alto Risco PCR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20"><Clock className="h-5 w-5 text-emerald-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">4-12h</p>
                <p className="text-xs text-zinc-400">Janela Preditiva</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20"><Zap className="h-5 w-5 text-orange-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {(patients ?? []).filter((p) => p.rapidResponseTriggered).length}
                </p>
                <p className="text-xs text-zinc-400">Resp. Rapida Ativadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(patients ?? []).map((p) => (
        <Card key={p.id} className={cn('bg-zinc-900 border-zinc-800', p.riskScore >= 0.7 && 'border-red-500/30')}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-zinc-100">{p.patientName}</h3>
                  <TrendIcon trend={p.trend} />
                  {p.rapidResponseTriggered && (
                    <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
                      <Bell className="h-3 w-3 mr-1" /> Resp. Rapida Ativa
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-zinc-400">{p.mrn} | {p.bed} - {p.ward}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">NEWS Score</p>
                <p className={cn('text-2xl font-bold', p.newsScore >= 7 ? 'text-red-400' : p.newsScore >= 5 ? 'text-orange-400' : 'text-yellow-400')}>
                  {p.newsScore}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-2">Risco de PCR em {p.hoursAhead}h</p>
                <RiskGauge value={p.riskScore} size="lg" />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="p-2 rounded bg-zinc-800/60">
                    <p className="text-[10px] text-zinc-500">FC</p>
                    <p className="text-sm font-mono text-zinc-200">{p.lastVitals.heartRate}</p>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/60">
                    <p className="text-[10px] text-zinc-500">PAS</p>
                    <p className="text-sm font-mono text-zinc-200">{p.lastVitals.systolicBP}</p>
                  </div>
                  <div className="p-2 rounded bg-zinc-800/60">
                    <p className="text-[10px] text-zinc-500">SpO2</p>
                    <p className="text-sm font-mono text-zinc-200">{p.lastVitals.spo2}%</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-2">Fatores de Risco</p>
                <RiskFactorList factors={p.riskFactors} />
              </div>
            </div>

            {!p.rapidResponseTriggered && p.riskScore >= 0.5 && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  onClick={() => handleTriggerRapidResponse(p)}
                >
                  <Zap className="h-4 w-4 mr-2" /> Acionar Time de Resposta Rapida
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab 3: Readmission ─────────────────────────────────────────────────────

function ReadmissionTab() {
  const { data: predictions, isLoading } = useReadmissionPrediction();

  const handleApplyIntervention = useCallback((patientName: string, desc: string) => {
    toast.success(`Intervencao aplicada: ${desc} para ${patientName}`);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20"><TrendingUp className="h-5 w-5 text-red-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {(predictions ?? []).filter((p) => p.riskLevel === 'HIGH' || p.riskLevel === 'VERY_HIGH').length}
                </p>
                <p className="text-xs text-zinc-400">Alto Risco Readmissao</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20"><CalendarDays className="h-5 w-5 text-emerald-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">30 dias</p>
                <p className="text-xs text-zinc-400">Janela de Predicao</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><Users className="h-5 w-5 text-blue-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{(predictions ?? []).length}</p>
                <p className="text-xs text-zinc-400">Pacientes Monitorados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(predictions ?? []).map((p) => (
        <Card key={p.id} className={cn('bg-zinc-900 border-zinc-800', p.riskLevel === 'HIGH' && 'border-red-500/30', p.riskLevel === 'VERY_HIGH' && 'border-red-600/40')}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-zinc-100">{p.patientName}</h3>
                  <Badge
                    variant="outline"
                    className={READMISSION_RISK_COLORS[p.riskLevel as keyof typeof READMISSION_RISK_COLORS]}
                  >
                    {READMISSION_RISK_LABELS[p.riskLevel]}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">{p.mrn} | Alta: {formatDateShort(p.dischargeDate)} | {p.diagnosis}</p>
                <p className="text-xs text-zinc-500">{p.daysPostDischarge} dias pos-alta</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Probabilidade</p>
                <p className={cn('text-3xl font-bold', p.readmissionProbability >= 60 ? 'text-red-400' : p.readmissionProbability >= 40 ? 'text-yellow-400' : 'text-green-400')}>
                  {p.readmissionProbability}%
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-2">Fatores de Risco</p>
                <RiskFactorList factors={p.riskFactors} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-2">Intervencoes Sugeridas</p>
                <div className="space-y-2">
                  {p.interventions.map((int) => (
                    <div key={int.id} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50">
                      {int.applied ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-zinc-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200">{int.description}</p>
                        <p className="text-[10px] text-zinc-500">{INTERVENTION_TYPE_LABELS[int.type]}</p>
                      </div>
                      {!int.applied && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                          onClick={() => handleApplyIntervention(p.patientName, int.description)}
                        >
                          Aplicar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab 4: Length of Stay ──────────────────────────────────────────────────

function LOSTab() {
  const { data: predictions, isLoading } = useLOSPrediction();

  const chartData = useMemo(
    () =>
      (predictions ?? []).map((p) => ({
        name: p.patientName.split(' ')[0],
        predicted: p.predictedLOS,
        drgAvg: p.drgAverageLOS,
        current: p.currentDay,
      })),
    [predictions]
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20"><Clock className="h-5 w-5 text-emerald-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {((predictions ?? []).reduce((sum, p) => sum + p.predictedLOS, 0) / Math.max((predictions ?? []).length, 1)).toFixed(1)}d
                </p>
                <p className="text-xs text-zinc-400">Media LOS Predito</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><BarChart3 className="h-5 w-5 text-blue-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {((predictions ?? []).reduce((sum, p) => sum + p.drgAverageLOS, 0) / Math.max((predictions ?? []).length, 1)).toFixed(1)}d
                </p>
                <p className="text-xs text-zinc-400">Media DRG</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20"><TrendingUp className="h-5 w-5 text-yellow-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {(predictions ?? []).filter((p) => p.predictedLOS > p.drgAverageLOS).length}
                </p>
                <p className="text-xs text-zinc-400">Acima Media DRG</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100">LOS Predito vs Media DRG</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} unit="d" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#e4e4e7' }}
                />
                <Bar dataKey="predicted" name="LOS Predito" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="drgAvg" name="Media DRG" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current" name="Dia Atual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detail Cards */}
      {(predictions ?? []).map((p) => (
        <Card key={p.id} className={cn('bg-zinc-900 border-zinc-800', p.predictedLOS > p.drgAverageLOS * 1.3 && 'border-yellow-500/30')}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">{p.patientName}</h3>
                <p className="text-sm text-zinc-400">{p.mrn} | {p.bed} - {p.ward}</p>
                <p className="text-xs text-zinc-500">DRG {p.drgCode}: {p.drgDescription}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Confianca</p>
                <p className="text-sm font-mono text-emerald-400">{(p.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-zinc-800/60 text-center">
                <p className="text-xs text-zinc-500">Dia Atual</p>
                <p className="text-2xl font-bold text-zinc-100">D{p.currentDay}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/60 text-center">
                <p className="text-xs text-zinc-500">LOS Predito</p>
                <p className="text-2xl font-bold text-emerald-400">{p.predictedLOS}d</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/60 text-center">
                <p className="text-xs text-zinc-500">Media DRG</p>
                <p className="text-2xl font-bold text-blue-400">{p.drgAverageLOS}d</p>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Progresso da Internacao</span>
                <span>D{p.currentDay} de {p.predictedLOS}d</span>
              </div>
              <Progress value={(p.currentDay / p.predictedLOS) * 100} className="h-2 bg-zinc-800" />
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-300 mb-2">Fatores que Impactam LOS</p>
              <div className="space-y-2">
                {p.factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-zinc-800/50">
                    {f.direction === 'longer' ? (
                      <ArrowUpRight className="h-4 w-4 text-red-400 shrink-0" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-green-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-zinc-200">{f.name}</p>
                      <p className="text-xs text-zinc-500">{f.description}</p>
                    </div>
                    <span className={cn('text-sm font-mono', f.direction === 'longer' ? 'text-red-400' : 'text-green-400')}>
                      {f.direction === 'longer' ? '+' : ''}{f.impact}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab 5: Mortality ───────────────────────────────────────────────────────

function MortalityTab() {
  const { data: predictions, isLoading } = useMortalityPrediction();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }

  const calibrationData = (predictions ?? [])[0]?.calibration ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20"><ShieldAlert className="h-5 w-5 text-red-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {(predictions ?? []).filter((p) => p.riskScore >= 0.5).length}
                </p>
                <p className="text-xs text-zinc-400">Risco Elevado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20"><Stethoscope className="h-5 w-5 text-purple-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {(predictions ?? []).filter((p) => p.palliativeCareReferred).length}
                </p>
                <p className="text-xs text-zinc-400">Ref. Paliativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><Activity className="h-5 w-5 text-blue-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">Continuo</p>
                <p className="text-xs text-zinc-400">Atualizacao do Modelo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calibration Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100">Calibracao do Modelo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calibrationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="predicted" stroke="#71717a" fontSize={12} unit="%" label={{ value: 'Predito', position: 'bottom', fill: '#71717a', fontSize: 11 }} />
                <YAxis stroke="#71717a" fontSize={12} unit="%" label={{ value: 'Observado', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#e4e4e7' }}
                />
                <ReferenceLine stroke="#3f3f46" strokeDasharray="5 5" segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} />
                <Line type="monotone" dataKey="observed" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 5 }} name="Observado" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-center">
            Linha tracejada = calibracao perfeita. Pontos proximos indicam boa calibracao do modelo.
          </p>
        </CardContent>
      </Card>

      {/* Patient cards */}
      {(predictions ?? []).map((p) => (
        <Card key={p.id} className={cn('bg-zinc-900 border-zinc-800', p.riskScore >= 0.6 && 'border-red-500/30')}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-zinc-100">{p.patientName}</h3>
                  <TrendIcon trend={p.trend} />
                  {p.palliativeCareReferred && (
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                      Paliativos Referido
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-zinc-400">{p.mrn} | {p.bed} - {p.ward}</p>
              </div>
              <div className="text-right space-y-1">
                <div>
                  <p className="text-[10px] text-zinc-500">APACHE II</p>
                  <p className="text-sm font-mono font-bold text-zinc-200">{p.apache2Score}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">SAPS</p>
                  <p className="text-sm font-mono font-bold text-zinc-200">{p.sapsScore}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-zinc-400 mb-1">Risco de Mortalidade</p>
              <RiskGauge value={p.riskScore} size="lg" />
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-300 mb-2">Fatores de Risco</p>
              <RiskFactorList factors={p.riskFactors} />
            </div>

            {!p.palliativeCareReferred && p.riskScore >= 0.5 && (
              <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-purple-400" />
                  <p className="text-sm text-purple-300">Considerar discussao de cuidados paliativos</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                  onClick={() => toast.success(`Referencia para paliativos criada para ${p.patientName}`)}
                >
                  Referenciar Cuidados Paliativos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab 6: Demand Forecast ─────────────────────────────────────────────────

function DemandForecastTab() {
  const { data: forecast, isLoading } = useDemandForecast();
  const [metric, setMetric] = useState<'edVisits' | 'admissions' | 'surgeries' | 'icuBeds'>('edVisits');

  if (isLoading || !forecast) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }

  const metricConfig = {
    edVisits: { label: 'Visitas PS', color: '#10b981', low: 'edVisitsLow', high: 'edVisitsHigh' },
    admissions: { label: 'Internacoes', color: '#3b82f6', low: 'admissionsLow', high: 'admissionsHigh' },
    surgeries: { label: 'Cirurgias', color: '#f59e0b', low: 'surgeriesLow', high: 'surgeriesHigh' },
    icuBeds: { label: 'Leitos UTI', color: '#ef4444', low: 'icuBedsLow', high: 'icuBedsHigh' },
  };

  const cfg = metricConfig[metric];

  const chartData = forecast.days.map((d) => ({
    date: `${getWeekday(d.date)} ${formatDateShort(d.date)}`,
    value: d[metric],
    low: d[cfg.low as keyof typeof d] as number,
    high: d[cfg.high as keyof typeof d] as number,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20"><BarChart3 className="h-5 w-5 text-emerald-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{forecast.modelAccuracy.toFixed(1)}%</p>
                <p className="text-xs text-zinc-400">Acuracia do Modelo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><CalendarDays className="h-5 w-5 text-blue-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">7 dias</p>
                <p className="text-xs text-zinc-400">Horizonte de Previsao</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20"><TrendingUp className="h-5 w-5 text-yellow-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{forecast.historicalComparison.mape.toFixed(1)}%</p>
                <p className="text-xs text-zinc-400">MAPE</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20"><Activity className="h-5 w-5 text-purple-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {forecast.historicalComparison.lastWeekActual}
                </p>
                <p className="text-xs text-zinc-400">Real Semana Ant.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric selector */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-zinc-100">Previsao de Demanda — Proximos 7 Dias</CardTitle>
            <div className="flex gap-2">
              {(Object.entries(metricConfig) as Array<[typeof metric, typeof cfg]>).map(([key, val]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={metric === key ? 'default' : 'outline'}
                  onClick={() => setMetric(key)}
                  className={cn(
                    metric === key
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'border-zinc-700 text-zinc-300'
                  )}
                >
                  {val.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#e4e4e7' }}
                />
                <Area type="monotone" dataKey="high" stroke="none" fill={cfg.color} fillOpacity={0.1} name="Limite Superior" />
                <Area type="monotone" dataKey="low" stroke="none" fill={cfg.color} fillOpacity={0.05} name="Limite Inferior" />
                <Line type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={2} dot={{ fill: cfg.color, r: 4 }} name={cfg.label} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily detail table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100">Detalhamento Diario</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Dia</TableHead>
                <TableHead className="text-zinc-400">Visitas PS</TableHead>
                <TableHead className="text-zinc-400">Internacoes</TableHead>
                <TableHead className="text-zinc-400">Cirurgias</TableHead>
                <TableHead className="text-zinc-400">Leitos UTI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecast.days.map((d) => (
                <TableRow key={d.date} className="border-zinc-800">
                  <TableCell className="font-medium text-zinc-200">
                    {getWeekday(d.date)} {formatDateShort(d.date)}
                  </TableCell>
                  <TableCell>
                    <span className="text-zinc-200 font-mono">{d.edVisits}</span>
                    <span className="text-[10px] text-zinc-500 ml-1">({d.edVisitsLow}-{d.edVisitsHigh})</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-zinc-200 font-mono">{d.admissions}</span>
                    <span className="text-[10px] text-zinc-500 ml-1">({d.admissionsLow}-{d.admissionsHigh})</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-zinc-200 font-mono">{d.surgeries}</span>
                    <span className="text-[10px] text-zinc-500 ml-1">({d.surgeriesLow}-{d.surgeriesHigh})</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-zinc-200 font-mono">{d.icuBeds}</span>
                    <span className="text-[10px] text-zinc-500 ml-1">({d.icuBedsLow}-{d.icuBedsHigh})</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 7: Bed Optimization ────────────────────────────────────────────────

function BedOptimizationTab() {
  const { data: summary, isLoading } = useBedOptimization();

  const handleAccept = useCallback((suggestion: BedOptimizationSuggestion) => {
    toast.success(`Sugestao aceita: ${suggestion.patientName} para ${suggestion.suggestedBed}`);
  }, []);

  const handleReject = useCallback((suggestion: BedOptimizationSuggestion) => {
    toast.info(`Sugestao rejeitada: ${suggestion.patientName}`);
  }, []);

  if (isLoading || !summary) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }

  const occupancyRate = ((summary.occupiedBeds / summary.totalBeds) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20"><Bed className="h-5 w-5 text-emerald-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{occupancyRate}%</p>
                <p className="text-xs text-zinc-400">Taxa Ocupacao</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><Building2 className="h-5 w-5 text-blue-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{summary.totalBeds - summary.occupiedBeds}</p>
                <p className="text-xs text-zinc-400">Leitos Disponiveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20"><TrendingDown className="h-5 w-5 text-green-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{summary.predictedDischarges24h}</p>
                <p className="text-xs text-zinc-400">Altas Previstas 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20"><TrendingUp className="h-5 w-5 text-orange-400" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{summary.predictedAdmissions24h}</p>
                <p className="text-xs text-zinc-400">Admissoes Previstas 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy forecast chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100">Previsao de Ocupacao — Proximas 24h</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.occupancyForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="hour" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={12} unit="%" domain={[70, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#e4e4e7' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Ocupacao']}
                />
                <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Alerta 90%', fill: '#ef4444', fontSize: 11, position: 'right' }} />
                <Area type="monotone" dataKey="occupancy" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-emerald-400" />
            Sugestoes de Alocacao de Leitos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.suggestions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'p-4 rounded-lg border',
                  s.priority === 'urgent' ? 'bg-red-500/5 border-red-500/30' :
                  s.priority === 'high' ? 'bg-orange-500/5 border-orange-500/30' :
                  'bg-zinc-800/50 border-zinc-700'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-zinc-100">{s.patientName}</h4>
                      <Badge variant="outline" className={PRIORITY_COLORS[s.priority]}>
                        {PRIORITY_LABELS[s.priority]}
                      </Badge>
                      {s.isolationRequired && (
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                          <ShieldAlert className="h-3 w-3 mr-1" /> Isolamento
                        </Badge>
                      )}
                      {s.nursingProximity && (
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                          <Eye className="h-3 w-3 mr-1" /> Prox. Enfermagem
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{s.mrn}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-zinc-400">
                    <span className="font-mono">Score: {s.score}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3 p-2 rounded bg-zinc-800/60">
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500">Atual</p>
                    <p className="text-sm font-mono text-zinc-300">{s.currentBed ?? 'Sem leito'}</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-emerald-400" />
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500">Sugerido</p>
                    <p className="text-sm font-mono text-emerald-400">{s.suggestedBed}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                  <div>
                    <p className="text-[10px] text-zinc-500">Ala</p>
                    <p className="text-sm text-zinc-300">{s.suggestedWard}</p>
                  </div>
                </div>

                <p className="text-sm text-zinc-300 mb-3">{s.reason}</p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-zinc-500">
                    {s.predictedDischargeDate && (
                      <span>Alta prevista: {formatDateShort(s.predictedDischargeDate)}</span>
                    )}
                    <span>Complexidade: {s.complexity === 'high' ? 'Alta' : s.complexity === 'medium' ? 'Media' : 'Baixa'}</span>
                  </div>
                  {s.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        onClick={() => handleReject(s)}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleAccept(s)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Aceitar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AIPredictivePage() {
  const [activeTab, setActiveTab] = useState('sepsis');

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <BrainCircuit className="h-7 w-7 text-emerald-400" />
            IA Preditiva
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Modelos de machine learning para predicao clinica e operacional em tempo real
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-xs">
          <Activity className="h-3 w-3 mr-1" /> Modelos Ativos
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="sepsis" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Thermometer className="h-3.5 w-3.5 mr-1" /> Sepse
          </TabsTrigger>
          <TabsTrigger value="cardiac" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Heart className="h-3.5 w-3.5 mr-1" /> PCR
          </TabsTrigger>
          <TabsTrigger value="readmission" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Readmissao
          </TabsTrigger>
          <TabsTrigger value="los" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Clock className="h-3.5 w-3.5 mr-1" /> Tempo Internacao
          </TabsTrigger>
          <TabsTrigger value="mortality" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Mortalidade
          </TabsTrigger>
          <TabsTrigger value="demand" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Demanda
          </TabsTrigger>
          <TabsTrigger value="beds" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Bed className="h-3.5 w-3.5 mr-1" /> Otimizacao Leitos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sepsis" className="mt-6">
          <SepsisTab />
        </TabsContent>
        <TabsContent value="cardiac" className="mt-6">
          <CardiacArrestTab />
        </TabsContent>
        <TabsContent value="readmission" className="mt-6">
          <ReadmissionTab />
        </TabsContent>
        <TabsContent value="los" className="mt-6">
          <LOSTab />
        </TabsContent>
        <TabsContent value="mortality" className="mt-6">
          <MortalityTab />
        </TabsContent>
        <TabsContent value="demand" className="mt-6">
          <DemandForecastTab />
        </TabsContent>
        <TabsContent value="beds" className="mt-6">
          <BedOptimizationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
