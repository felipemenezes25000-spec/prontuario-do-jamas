import { useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart3,
  Database,
  FlaskConical,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Save,
  Play,
  Activity,
  Bed,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Target,
  Filter,
  CalendarDays,
  Building2,
  Stethoscope,
  HeartPulse,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useCohorts,
  useBenchmarks,
  useBuildCohort,
  type CohortCriteria,
} from '@/services/data-warehouse.service';
import {
  useDimensions,
  useMeasures,
  useSavedQueries,
  useRunQuery,
  useSaveQuery,
  type AnalyticsQuery,
  type AnalyticsResult,
} from '@/services/analytics-explorer.service';
import {
  useClinicalTrials,
  useCreateTrial,
  useEligiblePatients,
  useFindEligiblePatients,
  type TrialStatus,
  type ClinicalTrial,
} from '@/services/clinical-research.service';

// ============================================================================
// Mock data for Executive Dashboard
// ============================================================================

function generateMonthlyTrend(baseValue: number, variance: number, months: number = 12): { month: string; value: number }[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    return {
      month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      value: Math.round((baseValue + (Math.random() - 0.5) * variance) * 10) / 10,
    };
  });
}

const occupancyTrend = generateMonthlyTrend(78, 15);
const avgStayTrend = generateMonthlyTrend(5.2, 2);
const mortalityTrend = generateMonthlyTrend(2.1, 1.5);
const readmissionTrend = generateMonthlyTrend(8.5, 4);
const infectionTrend = generateMonthlyTrend(3.2, 2);

const departmentOccupancy = [
  { department: 'UTI Adulto', occupancy: 92, beds: 24, occupied: 22, target: 85 },
  { department: 'UTI Neonatal', occupancy: 88, beds: 16, occupied: 14, target: 85 },
  { department: 'Enfermaria Clinica', occupancy: 75, beds: 60, occupied: 45, target: 80 },
  { department: 'Enfermaria Cirurgica', occupancy: 68, beds: 40, occupied: 27, target: 75 },
  { department: 'Pronto Socorro', occupancy: 105, beds: 30, occupied: 32, target: 90 },
  { department: 'Centro Obstetrico', occupancy: 62, beds: 20, occupied: 12, target: 70 },
  { department: 'Pediatria', occupancy: 55, beds: 30, occupied: 17, target: 65 },
];

const qualityIndicators = [
  { name: 'Taxa de Infeccao Hospitalar', value: 3.2, target: 3.5, unit: '%', status: 'ok' as const },
  { name: 'Quedas com Lesao / 1000 pac-dia', value: 0.8, target: 1.0, unit: '', status: 'ok' as const },
  { name: 'Lesao por Pressao', value: 1.5, target: 1.2, unit: '%', status: 'alert' as const },
  { name: 'Identificacao Correta (auditoria)', value: 97.2, target: 98, unit: '%', status: 'warn' as const },
  { name: 'Higienizacao das Maos', value: 82, target: 80, unit: '%', status: 'ok' as const },
  { name: 'Profilaxia TEV em 24h', value: 91, target: 95, unit: '%', status: 'alert' as const },
  { name: 'Tempo Porta-Antibiotico (sepse)', value: 52, target: 60, unit: 'min', status: 'ok' as const },
  { name: 'Checklist Cirurgia Segura', value: 99.1, target: 100, unit: '%', status: 'warn' as const },
  { name: 'Reconciliacao Medicamentosa', value: 88, target: 90, unit: '%', status: 'warn' as const },
  { name: 'Notificacao de Eventos Adversos', value: 4.2, target: 5, unit: '/1000', status: 'ok' as const },
];

const admissionsBySpecialty = [
  { specialty: 'Clinica Medica', admissions: 420, color: '#10b981' },
  { specialty: 'Cirurgia Geral', admissions: 280, color: '#3b82f6' },
  { specialty: 'Ortopedia', admissions: 190, color: '#f59e0b' },
  { specialty: 'Cardiologia', admissions: 175, color: '#ef4444' },
  { specialty: 'Pediatria', admissions: 160, color: '#8b5cf6' },
  { specialty: 'Ginecologia', admissions: 140, color: '#ec4899' },
  { specialty: 'Neurologia', admissions: 95, color: '#14b8a6' },
  { specialty: 'Urologia', admissions: 85, color: '#f97316' },
];

const formatPercent = (v: number) => `${v.toFixed(1)}%`;

// ============================================================================
// Executive Dashboard Tab
// ============================================================================

function ExecutiveDashboardTab() {
  const [dateRange, setDateRange] = useState('12m');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedKpi, setSelectedKpi] = useState<'occupancy' | 'avgStay' | 'mortality' | 'readmission' | 'infection'>('occupancy');

  const kpiConfig = {
    occupancy: { label: 'Taxa de Ocupacao', data: occupancyTrend, unit: '%', target: 80, color: '#10b981', icon: Bed },
    avgStay: { label: 'Tempo Medio de Permanencia', data: avgStayTrend, unit: ' dias', target: 5, color: '#3b82f6', icon: Clock },
    mortality: { label: 'Taxa de Mortalidade', data: mortalityTrend, unit: '%', target: 2.5, color: '#ef4444', icon: AlertTriangle },
    readmission: { label: 'Reinternacao 30d', data: readmissionTrend, unit: '%', target: 10, color: '#f59e0b', icon: RefreshCw },
    infection: { label: 'Taxa de Infeccao', data: infectionTrend, unit: '%', target: 3.5, color: '#8b5cf6', icon: ShieldAlert },
  };

  const activeKpi = kpiConfig[selectedKpi];
  const latestValue = activeKpi.data[activeKpi.data.length - 1]?.value ?? 0;
  const prevValue = activeKpi.data[activeKpi.data.length - 2]?.value ?? latestValue;
  const change = latestValue - prevValue;
  const changePercent = prevValue !== 0 ? (change / prevValue) * 100 : 0;

  // KPI cards data
  const kpiCards = [
    {
      key: 'occupancy' as const,
      label: 'Taxa de Ocupacao',
      value: `${occupancyTrend[occupancyTrend.length - 1]?.value}%`,
      change: '+2.3%',
      trend: 'up' as const,
      icon: Bed,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      key: 'avgStay' as const,
      label: 'Permanencia Media',
      value: `${avgStayTrend[avgStayTrend.length - 1]?.value} dias`,
      change: '-0.3d',
      trend: 'down' as const,
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      key: 'mortality' as const,
      label: 'Mortalidade Geral',
      value: `${mortalityTrend[mortalityTrend.length - 1]?.value}%`,
      change: '-0.2%',
      trend: 'down' as const,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      key: 'readmission' as const,
      label: 'Reinternacao 30d',
      value: `${readmissionTrend[readmissionTrend.length - 1]?.value}%`,
      change: '+0.5%',
      trend: 'up' as const,
      icon: RefreshCw,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      key: 'infection' as const,
      label: 'Infeccao Hospitalar',
      value: `${infectionTrend[infectionTrend.length - 1]?.value}%`,
      change: '-0.1%',
      trend: 'down' as const,
      icon: ShieldAlert,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros</span>
            </div>
            <div className="w-36">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Periodo</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Ultimo Mes</SelectItem>
                  <SelectItem value="3m">Ultimos 3 Meses</SelectItem>
                  <SelectItem value="6m">Ultimos 6 Meses</SelectItem>
                  <SelectItem value="12m">Ultimos 12 Meses</SelectItem>
                  <SelectItem value="ytd">Ano Corrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Unidade</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Unidades</SelectItem>
                  <SelectItem value="UTI_ADULTO">UTI Adulto</SelectItem>
                  <SelectItem value="UTI_NEO">UTI Neonatal</SelectItem>
                  <SelectItem value="ENF_CLINICA">Enfermaria Clinica</SelectItem>
                  <SelectItem value="ENF_CIRURGICA">Enfermaria Cirurgica</SelectItem>
                  <SelectItem value="PS">Pronto Socorro</SelectItem>
                  <SelectItem value="CC">Centro Cirurgico</SelectItem>
                  <SelectItem value="CO">Centro Obstetrico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Label className="text-[10px] text-muted-foreground mb-1 block">Especialidade</Label>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="CLINICA">Clinica Medica</SelectItem>
                  <SelectItem value="CIRURGIA">Cirurgia Geral</SelectItem>
                  <SelectItem value="CARDIO">Cardiologia</SelectItem>
                  <SelectItem value="NEURO">Neurologia</SelectItem>
                  <SelectItem value="ORTOPEDIA">Ortopedia</SelectItem>
                  <SelectItem value="PEDIATRIA">Pediatria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs ml-auto">
              <CalendarDays className="h-3.5 w-3.5" />
              Personalizar Periodo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((kpi) => {
          const isSelected = selectedKpi === kpi.key;
          const isDesirable = kpi.key === 'mortality' || kpi.key === 'infection' || kpi.key === 'readmission';
          const trendGood = isDesirable ? kpi.trend === 'down' : kpi.trend === 'up';
          return (
            <Card
              key={kpi.key}
              className={cn(
                'border-border bg-card cursor-pointer transition-all hover:border-zinc-700',
                isSelected && 'border-emerald-500/50 ring-1 ring-emerald-500/20',
              )}
              onClick={() => setSelectedKpi(kpi.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                    <p className="mt-1 text-xl font-bold">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {trendGood ? (
                        <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-400" />
                      )}
                      <span className={cn('text-[10px] font-medium', trendGood ? 'text-emerald-400' : 'text-red-400')}>
                        {kpi.change}
                      </span>
                      <span className="text-[10px] text-muted-foreground">vs mes ant.</span>
                    </div>
                  </div>
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', kpi.bgColor)}>
                    <kpi.icon className={cn('h-4 w-4', kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main trend chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <activeKpi.icon className="h-4 w-4" style={{ color: activeKpi.color }} />
              {activeKpi.label} - Evolucao 12 Meses
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Atual: {latestValue}{activeKpi.unit}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px]',
                  change <= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                )}
              >
                {change > 0 ? '+' : ''}{changePercent.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={activeKpi.data}>
              <defs>
                <linearGradient id="kpiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeKpi.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={activeKpi.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(value: number) => [`${value}${activeKpi.unit}`, activeKpi.label]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={activeKpi.color}
                fill="url(#kpiGradient)"
                strokeWidth={2}
                dot={{ r: 3, fill: activeKpi.color }}
              />
              {activeKpi.target && (
                <Line
                  type="monotone"
                  dataKey={() => activeKpi.target}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Meta"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Department Occupancy + Quality Indicators */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Department occupancy heatmap */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              Ocupacao por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departmentOccupancy.map((dept) => {
                const isOverTarget = dept.occupancy > dept.target;
                const isCritical = dept.occupancy > 95;
                return (
                  <div key={dept.department} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{dept.department}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{dept.occupied}/{dept.beds} leitos</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] text-white',
                            isCritical ? 'bg-red-600' : isOverTarget ? 'bg-amber-600' : 'bg-emerald-600',
                          )}
                        >
                          {dept.occupancy}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2.5 relative overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isCritical ? 'bg-red-500' : isOverTarget ? 'bg-amber-500' : 'bg-emerald-500',
                        )}
                        style={{ width: `${Math.min(dept.occupancy, 100)}%` }}
                      />
                      {/* Target line */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white/30"
                        style={{ left: `${dept.target}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Normal</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Acima da meta</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Critico ({'>'}95%)</span>
                <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-white/30" />Meta</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality Indicators */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" />
              Indicadores de Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {qualityIndicators.map((indicator) => {
                const statusConfig = {
                  ok: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
                  warn: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle },
                  alert: { color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
                };
                const cfg = statusConfig[indicator.status];
                return (
                  <div key={indicator.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent/30">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded', cfg.bg)}>
                        <cfg.icon className={cn('h-3.5 w-3.5', cfg.color)} />
                      </div>
                      <span className="text-xs truncate">{indicator.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={cn('text-sm font-bold', cfg.color)}>
                          {indicator.value}{indicator.unit}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-16 text-right">
                        Meta: {indicator.target}{indicator.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admissions by Specialty + Mortality Trend */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-400" />
              Internacoes por Especialidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={admissionsBySpecialty} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="specialty" tick={{ fontSize: 9 }} width={120} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
                <Bar dataKey="admissions" name="Internacoes" radius={[0, 4, 4, 0]}>
                  {admissionsBySpecialty.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-red-400" />
              Comparativo: Mortalidade vs Reinternacao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mortalityTrend.map((m, i) => ({
                ...m,
                mortality: m.value,
                readmission: readmissionTrend[i]?.value ?? 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={formatPercent} />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                <Line type="monotone" dataKey="mortality" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Mortalidade" />
                <Line type="monotone" dataKey="readmission" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Reinternacao 30d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Data Warehouse Tab (original, enhanced)
// ============================================================================

function NewCohortDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [criteria, _setCriteria] = useState<CohortCriteria>({});
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [gender, setGender] = useState('');
  const buildCohort = useBuildCohort();

  const handleBuild = () => {
    const builtCriteria: CohortCriteria = { ...criteria };
    if (ageMin || ageMax) {
      builtCriteria.ageRange = { min: Number(ageMin) || 0, max: Number(ageMax) || 150 };
    }
    if (gender) builtCriteria.gender = gender;

    buildCohort.mutate(
      { name: name || undefined, criteria: builtCriteria },
      {
        onSuccess: (data) => {
          toast.success(`Coorte criada com ${data.patientCount} pacientes`);
          setOpen(false);
          setName('');
          setAgeMin('');
          setAgeMax('');
          setGender('');
        },
        onError: () => toast.error('Erro ao construir coorte'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Coorte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Construir Coorte de Pacientes</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Nome da Coorte (opcional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Diabeticos > 60 anos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Idade Minima</Label>
              <Input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Idade Maxima</Label>
              <Input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="150" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Genero</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={buildCohort.isPending}
            onClick={handleBuild}
          >
            {buildCohort.isPending ? 'Construindo...' : 'Construir Coorte'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DataWarehouseTab() {
  const { data: cohorts, isLoading: loadingCohorts } = useCohorts();
  const { data: benchmarks, isLoading: loadingBenchmarks } = useBenchmarks();

  const trendIcon = (trend: 'UP' | 'DOWN' | 'STABLE') => {
    if (trend === 'UP') return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (trend === 'DOWN') return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Coortes de Pacientes</h3>
          <NewCohortDialog />
        </div>
        {loadingCohorts ? (
          <div className="text-center py-8 text-muted-foreground">Carregando coortes...</div>
        ) : !cohorts?.data?.length ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma coorte definida</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cohorts.data.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{c.name ?? 'Coorte sem nome'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Criada em {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-400">{c.patientCount}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> pacientes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-3">Benchmarks Comparativos</h3>
        {loadingBenchmarks ? (
          <div className="text-center py-8 text-muted-foreground">Carregando benchmarks...</div>
        ) : !benchmarks?.length ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum benchmark disponivel</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metrica</TableHead>
                  <TableHead>Instituicao</TableHead>
                  <TableHead>Benchmark</TableHead>
                  <TableHead>Percentil</TableHead>
                  <TableHead>Tendencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks.map((b) => (
                  <TableRow key={b.metric}>
                    <TableCell className="font-medium text-sm">{b.metric}</TableCell>
                    <TableCell className="text-sm">{b.facilityValue} {b.unit}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.benchmarkValue} {b.unit}</TableCell>
                    <TableCell>
                      <Badge variant={b.percentile >= 75 ? 'default' : b.percentile >= 50 ? 'secondary' : 'destructive'}>
                        P{b.percentile}
                      </Badge>
                    </TableCell>
                    <TableCell>{trendIcon(b.trend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Analytics Explorer Tab (original, enhanced)
// ============================================================================

function ExplorerTab() {
  const { data: dimensions } = useDimensions();
  const { data: measures } = useMeasures();
  const { data: savedQueries } = useSavedQueries();
  const runQuery = useRunQuery();
  const saveQuery = useSaveQuery();

  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);
  const [queryResult, setQueryResult] = useState<AnalyticsResult | null>(null);
  const [queryName, setQueryName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);

  const handleRun = () => {
    if (!selectedDimensions.length && !selectedMeasures.length) {
      toast.error('Selecione pelo menos uma dimensao ou medida');
      return;
    }
    const query: AnalyticsQuery = { dimensions: selectedDimensions, measures: selectedMeasures };
    runQuery.mutate(query, {
      onSuccess: (data) => {
        setQueryResult(data);
        toast.success(`${data.total} resultados em ${data.queryTimeMs}ms`);
      },
      onError: () => toast.error('Erro ao executar consulta'),
    });
  };

  const handleSave = () => {
    if (!queryName) return;
    const query: AnalyticsQuery = { dimensions: selectedDimensions, measures: selectedMeasures };
    saveQuery.mutate(
      { name: queryName, query },
      {
        onSuccess: () => {
          toast.success('Consulta salva');
          setSaveOpen(false);
          setQueryName('');
        },
        onError: () => toast.error('Erro ao salvar consulta'),
      },
    );
  };

  const toggleDimension = (id: string) =>
    setSelectedDimensions((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);

  const toggleMeasure = (id: string) =>
    setSelectedMeasures((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dimensoes</CardTitle>
          </CardHeader>
          <CardContent>
            {!dimensions?.length ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {dimensions.map((d) => (
                  <Badge
                    key={d.id}
                    variant={selectedDimensions.includes(d.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleDimension(d.id)}
                  >
                    {d.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Medidas</CardTitle>
          </CardHeader>
          <CardContent>
            {!measures?.length ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {measures.map((m) => (
                  <Badge
                    key={m.id}
                    variant={selectedMeasures.includes(m.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleMeasure(m.id)}
                  >
                    {m.name} ({m.aggregation})
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={runQuery.isPending}
          onClick={handleRun}
        >
          <Play className="h-4 w-4 mr-2" />
          {runQuery.isPending ? 'Executando...' : 'Executar Consulta'}
        </Button>
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={!queryResult}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Consulta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Salvar Consulta</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>Nome da Consulta</Label>
                <Input value={queryName} onChange={(e) => setQueryName(e.target.value)} placeholder="Ex: Atendimentos por departamento" />
              </div>
              <Button className="w-full" disabled={!queryName || saveQuery.isPending} onClick={handleSave}>
                {saveQuery.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {queryResult && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {queryResult.total} resultados - {queryResult.queryTimeMs}ms
          </p>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {queryResult.columns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryResult.rows.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    {queryResult.columns.map((col) => (
                      <TableCell key={col.key} className="text-sm">
                        {String(row[col.key] ?? '\u2014')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {queryResult.rows.length > 20 && (
            <p className="text-xs text-muted-foreground">Exibindo 20 de {queryResult.total} linhas</p>
          )}
        </div>
      )}

      {(savedQueries?.data?.length ?? 0) > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-2">Consultas Salvas</h3>
          <div className="flex flex-wrap gap-2">
            {savedQueries!.data.map((q) => (
              <Badge
                key={q.id}
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  setSelectedDimensions(q.query.dimensions);
                  setSelectedMeasures(q.query.measures);
                  toast.info(`Consulta "${q.name}" carregada`);
                }}
              >
                {q.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Clinical Research Tab (original, enhanced)
// ============================================================================

function trialStatusBadge(status: TrialStatus) {
  const map: Record<TrialStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PLANNING: { label: 'Planejamento', variant: 'outline' },
    RECRUITING: { label: 'Recrutando', variant: 'secondary' },
    ACTIVE: { label: 'Ativo', variant: 'default' },
    COMPLETED: { label: 'Concluido', variant: 'outline' },
    SUSPENDED: { label: 'Suspenso', variant: 'destructive' },
    CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function NewTrialDialog() {
  const [open, setOpen] = useState(false);
  const createTrial = useCreateTrial();
  const [form, setForm] = useState({
    title: '',
    protocol: '',
    principalInvestigator: '',
    sponsor: '',
    status: 'PLANNING' as TrialStatus,
    startDate: '',
    targetEnrollment: '',
    description: '',
    eligibilityCriteria: '',
  });

  const handleCreate = () => {
    if (!form.title || !form.protocol || !form.principalInvestigator || !form.startDate || !form.description) return;
    createTrial.mutate(
      {
        ...form,
        targetEnrollment: Number(form.targetEnrollment) || 0,
        sponsor: form.sponsor || undefined,
        eligibilityCriteria: form.eligibilityCriteria || undefined,
        endDate: undefined,
      },
      {
        onSuccess: () => {
          toast.success('Ensaio clinico cadastrado');
          setOpen(false);
        },
        onError: () => toast.error('Erro ao cadastrar ensaio'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Ensaio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar Ensaio Clinico</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Titulo do Estudo</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Protocolo</Label>
              <Input value={form.protocol} onChange={(e) => setForm((f) => ({ ...f, protocol: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>N. Alvo de Pacientes</Label>
              <Input type="number" value={form.targetEnrollment} onChange={(e) => setForm((f) => ({ ...f, targetEnrollment: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Investigador Principal</Label>
            <Input value={form.principalInvestigator} onChange={(e) => setForm((f) => ({ ...f, principalInvestigator: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Patrocinador (opcional)</Label>
              <Input value={form.sponsor} onChange={(e) => setForm((f) => ({ ...f, sponsor: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data de Inicio</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descricao</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Criterios de Elegibilidade (opcional)</Label>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.eligibilityCriteria}
              onChange={(e) => setForm((f) => ({ ...f, eligibilityCriteria: e.target.value }))}
            />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={createTrial.isPending}
            onClick={handleCreate}
          >
            {createTrial.isPending ? 'Salvando...' : 'Cadastrar Ensaio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrialCard({ trial }: { trial: ClinicalTrial }) {
  const [selectedTrial, setSelectedTrial] = useState<string | null>(null);
  const { data: eligible } = useEligiblePatients(selectedTrial ?? '');
  const findEligible = useFindEligiblePatients();

  const progress = trial.targetEnrollment > 0
    ? Math.round((trial.currentEnrollment / trial.targetEnrollment) * 100)
    : 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm">{trial.title}</p>
              <p className="text-xs text-muted-foreground">{trial.protocol} - {trial.principalInvestigator}</p>
            </div>
            {trialStatusBadge(trial.status)}
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Recrutamento</span>
              <span>{trial.currentEnrollment}/{trial.targetEnrollment}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
          {trial.status === 'RECRUITING' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedTrial(trial.id);
                findEligible.mutate(trial.id, {
                  onSuccess: (data) => toast.success(`${data.total} pacientes elegiveis encontrados`),
                  onError: () => toast.error('Erro ao buscar elegiveis'),
                });
              }}
              disabled={findEligible.isPending}
            >
              <Search className="h-3 w-3 mr-1" />
              Buscar Elegiveis
            </Button>
          )}
          {selectedTrial === trial.id && eligible?.data && eligible.data.length > 0 && (
            <div className="space-y-1">
              {eligible.data.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{p.age}a</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {(p.matchScore * 100).toFixed(0)}% match
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ResearchTab() {
  const { data, isLoading } = useClinicalTrials();
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'ALL'>('ALL');
  const trials = (data?.data ?? []).filter((t) => statusFilter === 'ALL' || t.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Status</SelectItem>
            <SelectItem value="PLANNING">Planejamento</SelectItem>
            <SelectItem value="RECRUITING">Recrutando</SelectItem>
            <SelectItem value="ACTIVE">Ativo</SelectItem>
            <SelectItem value="COMPLETED">Concluido</SelectItem>
            <SelectItem value="SUSPENDED">Suspenso</SelectItem>
          </SelectContent>
        </Select>
        <NewTrialDialog />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando ensaios clinicos...</div>
      ) : trials.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum ensaio clinico cadastrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trials.map((t) => (
            <TrialCard key={t.id} trial={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Hub Page
// ============================================================================

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
          <BarChart3 className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Pesquisa</h1>
          <p className="text-sm text-muted-foreground">
            Dashboard executivo, data warehouse, explorador de dados e pesquisa clinica
          </p>
        </div>
      </div>

      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 bg-zinc-900/50 p-1">
          <TabsTrigger value="executive" className="flex items-center gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            Dashboard Executivo
          </TabsTrigger>
          <TabsTrigger value="warehouse" className="flex items-center gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" />
            Data Warehouse
          </TabsTrigger>
          <TabsTrigger value="explorer" className="flex items-center gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            Explorador de Dados
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-1.5 text-xs">
            <FlaskConical className="h-3.5 w-3.5" />
            Pesquisa Clinica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive"><ExecutiveDashboardTab /></TabsContent>
        <TabsContent value="warehouse"><DataWarehouseTab /></TabsContent>
        <TabsContent value="explorer"><ExplorerTab /></TabsContent>
        <TabsContent value="research"><ResearchTab /></TabsContent>
      </Tabs>
    </div>
  );
}
