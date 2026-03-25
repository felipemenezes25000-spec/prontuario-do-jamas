import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Stethoscope,
  BedDouble,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Pill,
  Activity,
  DollarSign,
  Timer,
  Siren,
  Scissors,
  ClipboardList,
  Zap,
  FileText,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Heart,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboardStats } from '@/services/dashboard.service';
import { useAlerts } from '@/services/alerts.service';
import { cn } from '@/lib/utils';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

// ============================================================================
// Animated Number
// ============================================================================

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number | string; prefix?: string; suffix?: string }) {
  const numericVal = typeof value === 'string' ? parseInt(value) || 0 : value;
  const [display, setDisplay] = useState(0);
  const ref = useRef<ReturnType<typeof requestAnimationFrame>>(undefined);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * numericVal));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [numericVal]);

  return <>{prefix}{display}{suffix}</>;
}

// ============================================================================
// Live Clock
// ============================================================================

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
      <Clock className="h-3.5 w-3.5 text-emerald-500" />
      <span className="font-mono text-sm tabular-nums text-foreground">
        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {time.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
      </span>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function TrendBadge({ value, suffix = 'vs ontem' }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <div className={cn('flex items-center gap-1 text-xs', isPositive ? 'text-emerald-500' : 'text-red-400')}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{value}% {suffix}
    </div>
  );
}

// ============================================================================
// Mock data for enriched dashboard
// ============================================================================

interface SurgeryItem {
  id: string;
  time: string;
  patient: string;
  procedure: string;
  surgeon: string;
  room: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
}

interface TaskItem {
  id: string;
  title: string;
  type: 'prescription' | 'result' | 'note' | 'alert';
  priority: 'high' | 'medium' | 'low';
  time: string;
}

interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  time: string;
  icon: 'encounter' | 'prescription' | 'alert' | 'lab';
}

interface TriageCount {
  classification: string;
  color: string;
  count: number;
  bgColor: string;
}

interface BedUnit {
  unit: string;
  occupied: number;
  total: number;
  percentage: number;
}

function useMockSurgeries(): SurgeryItem[] {
  return useMemo(() => [
    { id: '1', time: '07:30', patient: 'Maria S.', procedure: 'Colecistectomia VLP', surgeon: 'Dr. Silva', room: 'CC-01', status: 'COMPLETED' },
    { id: '2', time: '09:00', patient: 'Joao P.', procedure: 'Apendicectomia', surgeon: 'Dra. Santos', room: 'CC-02', status: 'IN_PROGRESS' },
    { id: '3', time: '11:00', patient: 'Ana L.', procedure: 'Histerectomia', surgeon: 'Dr. Oliveira', room: 'CC-01', status: 'SCHEDULED' },
    { id: '4', time: '13:30', patient: 'Carlos R.', procedure: 'Herniorrafia', surgeon: 'Dr. Silva', room: 'CC-03', status: 'SCHEDULED' },
    { id: '5', time: '15:00', patient: 'Lucia M.', procedure: 'Artroscopia Joelho', surgeon: 'Dra. Costa', room: 'CC-02', status: 'DELAYED' },
  ], []);
}

function useMockTasks(): TaskItem[] {
  return useMemo(() => [
    { id: '1', title: 'Assinar prescricao — Maria S.', type: 'prescription', priority: 'high', time: '5 min' },
    { id: '2', title: 'Revisar resultado de hemograma — Joao P.', type: 'result', priority: 'high', time: '12 min' },
    { id: '3', title: 'Evoluir prontuario — Carlos R.', type: 'note', priority: 'medium', time: '30 min' },
    { id: '4', title: 'Avaliar alerta de interacao medicamentosa', type: 'alert', priority: 'high', time: '8 min' },
    { id: '5', title: 'Solicitar parecer de cardiologia', type: 'note', priority: 'low', time: '1h' },
    { id: '6', title: 'Checar resultado cultura — Ana L.', type: 'result', priority: 'medium', time: '45 min' },
  ], []);
}

function useMockActivity(): ActivityItem[] {
  return useMemo(() => [
    { id: '1', action: 'Atendimento iniciado — Maria S. (Clinica Medica)', actor: 'Dr. Silva', time: '08:45', icon: 'encounter' },
    { id: '2', action: 'Prescricao assinada — Joao P.', actor: 'Dra. Santos', time: '08:30', icon: 'prescription' },
    { id: '3', action: 'Alerta critico: Potassio 6.2 mEq/L — Ana L.', actor: 'Sistema', time: '08:15', icon: 'alert' },
    { id: '4', action: 'Resultado hemograma disponivel — Carlos R.', actor: 'Laboratorio', time: '08:00', icon: 'lab' },
    { id: '5', action: 'Alta hospitalar — Pedro F.', actor: 'Dr. Oliveira', time: '07:50', icon: 'encounter' },
    { id: '6', action: 'Nova internacao — Lucia M. (UTI)', actor: 'Recepcao', time: '07:30', icon: 'encounter' },
  ], []);
}

function useMockTriageCounts(): TriageCount[] {
  return useMemo(() => [
    { classification: 'Emergencia', color: 'text-red-400', count: 2, bgColor: 'bg-red-500/10' },
    { classification: 'Muito Urgente', color: 'text-orange-400', count: 5, bgColor: 'bg-orange-500/10' },
    { classification: 'Urgente', color: 'text-yellow-400', count: 12, bgColor: 'bg-yellow-500/10' },
    { classification: 'Pouco Urgente', color: 'text-green-400', count: 8, bgColor: 'bg-green-500/10' },
    { classification: 'Nao Urgente', color: 'text-blue-400', count: 4, bgColor: 'bg-blue-500/10' },
  ], []);
}

function useMockBedUnits(): BedUnit[] {
  return useMemo(() => [
    { unit: 'UTI Adulto', occupied: 8, total: 10, percentage: 80 },
    { unit: 'UTI Pediatrica', occupied: 3, total: 5, percentage: 60 },
    { unit: 'Clinica Medica', occupied: 22, total: 30, percentage: 73 },
    { unit: 'Clinica Cirurgica', occupied: 18, total: 25, percentage: 72 },
    { unit: 'Maternidade', occupied: 6, total: 12, percentage: 50 },
    { unit: 'Pediatria', occupied: 10, total: 15, percentage: 67 },
  ], []);
}

function useMockOccupancyTrend(): Array<{ hour: string; occupancy: number }> {
  return useMemo(() => [
    { hour: '00h', occupancy: 68 },
    { hour: '02h', occupancy: 67 },
    { hour: '04h', occupancy: 66 },
    { hour: '06h', occupancy: 69 },
    { hour: '08h', occupancy: 72 },
    { hour: '10h', occupancy: 75 },
    { hour: '12h', occupancy: 74 },
    { hour: '14h', occupancy: 76 },
    { hour: '16h', occupancy: 73 },
    { hour: '18h', occupancy: 71 },
    { hour: '20h', occupancy: 70 },
    { hour: '22h', occupancy: 69 },
  ], []);
}

function useMockEncounterTrend(): Array<{ hour: string; atendimentos: number }> {
  return useMemo(() => [
    { hour: '06h', atendimentos: 2 },
    { hour: '07h', atendimentos: 5 },
    { hour: '08h', atendimentos: 12 },
    { hour: '09h', atendimentos: 18 },
    { hour: '10h', atendimentos: 22 },
    { hour: '11h', atendimentos: 15 },
    { hour: '12h', atendimentos: 8 },
    { hour: '13h', atendimentos: 10 },
    { hour: '14h', atendimentos: 16 },
    { hour: '15h', atendimentos: 14 },
    { hour: '16h', atendimentos: 9 },
    { hour: '17h', atendimentos: 4 },
  ], []);
}

// ============================================================================
// Surgery Status Badge
// ============================================================================

function SurgeryStatusBadge({ status }: { status: SurgeryItem['status'] }) {
  const config: Record<SurgeryItem['status'], { label: string; className: string }> = {
    SCHEDULED: { label: 'Agendada', className: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
    IN_PROGRESS: { label: 'Em andamento', className: 'bg-amber-600/20 text-amber-400 border-amber-600/30' },
    COMPLETED: { label: 'Concluida', className: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' },
    DELAYED: { label: 'Atrasada', className: 'bg-red-600/20 text-red-400 border-red-600/30' },
  };
  const c = config[status];
  return <Badge className={cn('text-[10px] border', c.className)}>{c.label}</Badge>;
}

// ============================================================================
// Task Priority
// ============================================================================

function TaskPriorityDot({ priority }: { priority: TaskItem['priority'] }) {
  const colors: Record<TaskItem['priority'], string> = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };
  return <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', colors[priority])} />;
}

// ============================================================================
// Activity Icon
// ============================================================================

function ActivityIcon({ type }: { type: ActivityItem['icon'] }) {
  const config: Record<ActivityItem['icon'], { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
    encounter: { icon: Stethoscope, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    prescription: { icon: Pill, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    lab: { icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  };
  const c = config[type];
  return (
    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full shrink-0', c.bg)}>
      <c.icon className={cn('h-4 w-4', c.color)} />
    </div>
  );
}

// ============================================================================
// Quick Action Button
// ============================================================================

function QuickAction({
  icon: Icon,
  label,
  color,
  bgColor,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="flex flex-col items-center gap-2 h-auto py-4 px-3 border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
      onClick={onClick}
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg transition-colors', bgColor)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </Button>
  );
}

// ============================================================================
// Occupancy Bar
// ============================================================================

function OccupancyBar({ unit, occupied, total, percentage }: BedUnit) {
  const getBarColor = useCallback((pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, []);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground">{unit}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{occupied}/{total}</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Dashboard Page
// ============================================================================

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();
  const { data: alertsResponse } = useAlerts({ isActive: true });
  const alerts = alertsResponse?.data ?? [];

  const surgeries = useMockSurgeries();
  const tasks = useMockTasks();
  const activityFeed = useMockActivity();
  const triageCounts = useMockTriageCounts();
  const bedUnits = useMockBedUnits();
  const occupancyTrend = useMockOccupancyTrend();
  const encounterTrend = useMockEncounterTrend();

  const [lastRefresh, setLastRefresh] = useState(new Date());
  const handleRefresh = useCallback(() => {
    refetch();
    setLastRefresh(new Date());
  }, [refetch]);

  const kpiCards = useMemo(
    () =>
      stats
        ? [
            {
              label: 'Total Pacientes',
              value: stats.totalPatients,
              icon: Users,
              color: 'text-teal-600 dark:text-teal-400',
              bgColor: 'bg-teal-500/10',
              gradient: 'from-teal-500/10 via-teal-500/5 to-transparent',
              borderAccent: 'border-l-teal-500',
              change: stats.totalPatientsChange,
              changeSuffix: 'vs mes anterior',
            },
            {
              label: 'Atendimentos Hoje',
              value: stats.encountersToday,
              icon: Stethoscope,
              color: 'text-blue-600 dark:text-blue-400',
              bgColor: 'bg-blue-500/10',
              gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
              borderAccent: 'border-l-blue-500',
              change: stats.encountersTodayChange,
              changeSuffix: 'vs ontem',
            },
            {
              label: 'Ocupacao Leitos',
              value: `${stats.occupancyRate}%`,
              subtitle: `${stats.occupiedBeds}/${stats.totalBeds}`,
              icon: BedDouble,
              color: 'text-amber-600 dark:text-amber-400',
              bgColor: 'bg-amber-500/10',
              gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
              borderAccent: 'border-l-amber-500',
            },
            {
              label: 'Alertas Ativos',
              value: stats.activeAlerts,
              subtitle: stats.criticalAlerts > 0 ? `${stats.criticalAlerts} criticos` : undefined,
              icon: AlertTriangle,
              color: 'text-red-600 dark:text-red-400',
              bgColor: 'bg-red-500/10',
              gradient: 'from-red-500/10 via-red-500/5 to-transparent',
              borderAccent: 'border-l-red-500',
            },
          ]
        : [],
    [stats],
  );

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError || !stats) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================================================================ */}
      {/* Header: Greeting + Clock + Refresh */}
      {/* ================================================================ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Doutor'}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{getFormattedDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
            onClick={handleRefresh}
            title={`Ultima atualizacao: ${lastRefresh.toLocaleTimeString('pt-BR')}`}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <LiveClock />
        </div>
      </div>

      {/* ================================================================ */}
      {/* Primary KPI Cards */}
      {/* ================================================================ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, i) => (
          <Card
            key={kpi.label}
            className={cn(
              'border-border border-l-2 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg card-medical',
              kpi.borderAccent,
            )}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <CardContent className={cn('relative p-5 bg-gradient-to-br', kpi.gradient)}>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums">
                      {typeof kpi.value === 'number' ? <AnimatedNumber value={kpi.value} /> : kpi.value}
                    </span>
                    {'subtitle' in kpi && kpi.subtitle && (
                      <span className="text-sm text-muted-foreground">{kpi.subtitle}</span>
                    )}
                  </div>
                  {'change' in kpi && kpi.change !== undefined && (
                    <TrendBadge value={kpi.change} suffix={'changeSuffix' in kpi ? kpi.changeSuffix : undefined} />
                  )}
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', kpi.bgColor)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ================================================================ */}
      {/* Secondary Stats Row */}
      {/* ================================================================ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border card-medical">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Calendar className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Agenda Hoje</p>
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedNumber value={stats.completedAppointments} />
                <span className="text-sm font-normal text-muted-foreground">/{stats.scheduledAppointments}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border card-medical">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Pill className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prescricoes Pendentes</p>
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedNumber value={stats.pendingPrescriptions} />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border card-medical">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Timer className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tempo Medio Espera</p>
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedNumber value={stats.averageWaitTime} suffix=" min" />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border card-medical">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento Mes</p>
              <p className="text-2xl font-bold tabular-nums">
                {stats.revenueThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* Quick Actions */}
      {/* ================================================================ */}
      <Card className="border-border card-medical">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-base font-medium">Acoes Rapidas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <QuickAction icon={Stethoscope} label="Novo Atendimento" color="text-blue-400" bgColor="bg-blue-500/10" />
            <QuickAction icon={Pill} label="Nova Prescricao" color="text-emerald-400" bgColor="bg-emerald-500/10" />
            <QuickAction icon={Calendar} label="Ver Agenda" color="text-violet-400" bgColor="bg-violet-500/10" />
            <QuickAction icon={FileText} label="Laudos Pendentes" color="text-amber-400" bgColor="bg-amber-500/10" />
            <QuickAction icon={BedDouble} label="Mapa de Leitos" color="text-cyan-400" bgColor="bg-cyan-500/10" />
            <QuickAction icon={Bell} label="Alertas" color="text-red-400" bgColor="bg-red-500/10" />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Charts Row: Occupancy Trend + Encounters Trend */}
      {/* ================================================================ */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border card-medical">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base font-medium">Taxa de Ocupacao (24h)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={occupancyTrend}>
                <defs>
                  <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Ocupacao']}
                />
                <Area type="monotone" dataKey="occupancy" stroke="#f59e0b" strokeWidth={2} fill="url(#occupancyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border card-medical">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-base font-medium">Atendimentos por Hora (Hoje)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={encounterTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
                <Bar dataKey="atendimentos" name="Atendimentos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* Census: Bed Occupancy by Unit + ED Triage Status */}
      {/* ================================================================ */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bed Census */}
        <Card className="border-border card-medical">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-base font-medium">Censo Hospitalar</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats.occupiedBeds}/{stats.totalBeds} leitos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {bedUnits.map((unit) => (
              <OccupancyBar key={unit.unit} {...unit} />
            ))}
          </CardContent>
        </Card>

        {/* Emergency Triage Status */}
        <Card className="border-border card-medical">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-red-500" />
                <CardTitle className="text-base font-medium">Pronto-Socorro — Triagem</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats.waitingTriage} aguardando
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triageCounts.map((t) => (
                <div key={t.classification} className="flex items-center gap-3">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', t.bgColor)}>
                    <span className={cn('text-sm font-bold tabular-nums', t.color)}>{t.count}</span>
                  </div>
                  <span className="text-sm flex-1">{t.classification}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', t.color.replace('text-', 'bg-'))}
                      style={{ width: `${Math.min((t.count / 31) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total no PS: {triageCounts.reduce((s, t) => s + t.count, 0)} pacientes</span>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300 gap-1">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* Surgeries Today + Pending Tasks */}
      {/* ================================================================ */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Surgeries */}
        <Card className="border-border card-medical">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-violet-500" />
                <CardTitle className="text-base font-medium">Cirurgias Hoje</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">{surgeries.length} procedimentos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {surgeries.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/30"
                >
                  <div className="flex flex-col items-center shrink-0 w-12">
                    <span className="text-sm font-bold tabular-nums text-foreground">{s.time}</span>
                    <span className="text-[10px] text-muted-foreground">{s.room}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.procedure}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.patient} — {s.surgeon}</p>
                  </div>
                  <SurgeryStatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="border-border card-medical">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base font-medium">Tarefas Pendentes</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {tasks.filter((t) => t.priority === 'high').length} urgentes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/30 cursor-pointer group"
                >
                  <TaskPriorityDot priority={task.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{task.title}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">ha {task.time}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-center">
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300 gap-1">
                Ver todas as tarefas <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* Critical Alerts + Recent Activity */}
      {/* ================================================================ */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Critical Alerts */}
        <Card className="border-border card-medical">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              <CardTitle className="text-base font-medium">Alertas Criticos</CardTitle>
              {alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY').length > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 && (
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta ativo</p>
              </div>
            )}
            {alerts
              .filter((a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY')
              .slice(0, 5)
              .map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    alert.severity === 'CRITICAL'
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-amber-500/30 bg-amber-500/5',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        alert.severity === 'CRITICAL' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{alert.message}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'text-[10px] shrink-0 border',
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-600/20 text-red-400 border-red-600/30'
                          : 'bg-amber-600/20 text-amber-400 border-amber-600/30',
                      )}
                    >
                      {alert.severity === 'CRITICAL' ? 'Critico' : 'Emergencia'}
                    </Badge>
                  </div>
                </div>
              ))}
            {alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY').length === 0 && alerts.length > 0 && (
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta critico</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="border-border card-medical">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-base font-medium">Atividade Recente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {activityFeed.map((item) => (
                  <div key={item.id} className="relative flex items-start gap-3 pl-0">
                    <ActivityIcon type={item.icon} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm leading-snug">{item.action}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{item.actor}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {item.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex justify-center">
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300 gap-1">
                Ver historico completo <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* Operational Summary */}
      {/* ================================================================ */}
      <Card className="border-border card-medical">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-base font-medium">Resumo Operacional</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </div>
                <span className="text-sm">Aguardando Triagem</span>
              </div>
              <span className="text-xl font-bold tabular-nums">{stats.waitingTriage}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10">
                  <Stethoscope className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-sm">Em Atendimento</span>
              </div>
              <span className="text-xl font-bold tabular-nums">{stats.encountersToday}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500/10">
                  <BedDouble className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm">Leitos Ocupados</span>
              </div>
              <span className="text-xl font-bold tabular-nums">{stats.occupiedBeds}/{stats.totalBeds}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-sm">Consultas Realizadas</span>
              </div>
              <span className="text-xl font-bold tabular-nums">{stats.completedAppointments}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
