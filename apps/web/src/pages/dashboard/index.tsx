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
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Heart,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboardStats } from '@/services/dashboard.service';
import { useAlerts } from '@/services/alerts.service';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_DURATION = 900;
const STAGGER_DELAY = 80;

// ============================================================================
// Animated Number (count-up with easing)
// ============================================================================

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number | string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const numericVal = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const [display, setDisplay] = useState(0);
  const ref = useRef<ReturnType<typeof requestAnimationFrame>>(undefined);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * numericVal);
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [numericVal]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  );
}

// ============================================================================
// Live Clock with date
// ============================================================================

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-2 shadow-sm">
      <div className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </div>
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <div className="h-4 w-px bg-border" />
      <span className="text-xs text-muted-foreground">
        {time.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
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

// ============================================================================
// Staggered Fade-in Wrapper
// ============================================================================

function StaggerItem({
  index,
  children,
  className,
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * STAGGER_DELAY);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      ref={elRef}
      className={cn(
        'transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Trend Badge
// ============================================================================

function TrendBadge({ value, suffix = 'vs ontem' }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        isPositive
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-red-500/10 text-red-400',
      )}
    >
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}
      {value}% {suffix}
    </div>
  );
}

// ============================================================================
// Sparkline Mini Chart
// ============================================================================

function Sparkline({
  data,
  color,
  height = 32,
}: {
  data: readonly number[];
  color: string;
  height?: number;
}) {
  const chartData = data.map((value, i) => ({ i, v: value }));
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
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

interface DepartmentData {
  name: string;
  value: number;
  color: string;
}

function useMockSurgeries(): SurgeryItem[] {
  return useMemo(
    () => [
      { id: '1', time: '07:30', patient: 'Maria S.', procedure: 'Colecistectomia VLP', surgeon: 'Dr. Silva', room: 'CC-01', status: 'COMPLETED' },
      { id: '2', time: '09:00', patient: 'Joao P.', procedure: 'Apendicectomia', surgeon: 'Dra. Santos', room: 'CC-02', status: 'IN_PROGRESS' },
      { id: '3', time: '11:00', patient: 'Ana L.', procedure: 'Histerectomia', surgeon: 'Dr. Oliveira', room: 'CC-01', status: 'SCHEDULED' },
      { id: '4', time: '13:30', patient: 'Carlos R.', procedure: 'Herniorrafia', surgeon: 'Dr. Silva', room: 'CC-03', status: 'SCHEDULED' },
      { id: '5', time: '15:00', patient: 'Lucia M.', procedure: 'Artroscopia Joelho', surgeon: 'Dra. Costa', room: 'CC-02', status: 'DELAYED' },
    ],
    [],
  );
}

function useMockTasks(): TaskItem[] {
  return useMemo(
    () => [
      { id: '1', title: 'Assinar prescricao — Maria S.', type: 'prescription', priority: 'high', time: '5 min' },
      { id: '2', title: 'Revisar resultado de hemograma — Joao P.', type: 'result', priority: 'high', time: '12 min' },
      { id: '3', title: 'Evoluir prontuario — Carlos R.', type: 'note', priority: 'medium', time: '30 min' },
      { id: '4', title: 'Avaliar alerta de interacao medicamentosa', type: 'alert', priority: 'high', time: '8 min' },
      { id: '5', title: 'Solicitar parecer de cardiologia', type: 'note', priority: 'low', time: '1h' },
      { id: '6', title: 'Checar resultado cultura — Ana L.', type: 'result', priority: 'medium', time: '45 min' },
    ],
    [],
  );
}

function useMockActivity(): ActivityItem[] {
  return useMemo(
    () => [
      { id: '1', action: 'Atendimento iniciado — Maria S. (Clinica Medica)', actor: 'Dr. Silva', time: '08:45', icon: 'encounter' },
      { id: '2', action: 'Prescricao assinada — Joao P.', actor: 'Dra. Santos', time: '08:30', icon: 'prescription' },
      { id: '3', action: 'Alerta critico: Potassio 6.2 mEq/L — Ana L.', actor: 'Sistema', time: '08:15', icon: 'alert' },
      { id: '4', action: 'Resultado hemograma disponivel — Carlos R.', actor: 'Laboratorio', time: '08:00', icon: 'lab' },
      { id: '5', action: 'Alta hospitalar — Pedro F.', actor: 'Dr. Oliveira', time: '07:50', icon: 'encounter' },
      { id: '6', action: 'Nova internacao — Lucia M. (UTI)', actor: 'Recepcao', time: '07:30', icon: 'encounter' },
    ],
    [],
  );
}

function useMockTriageCounts(): TriageCount[] {
  return useMemo(
    () => [
      { classification: 'Emergencia', color: 'text-red-400', count: 2, bgColor: 'bg-red-500/10' },
      { classification: 'Muito Urgente', color: 'text-orange-400', count: 5, bgColor: 'bg-orange-500/10' },
      { classification: 'Urgente', color: 'text-yellow-400', count: 12, bgColor: 'bg-yellow-500/10' },
      { classification: 'Pouco Urgente', color: 'text-green-400', count: 8, bgColor: 'bg-green-500/10' },
      { classification: 'Nao Urgente', color: 'text-blue-400', count: 4, bgColor: 'bg-blue-500/10' },
    ],
    [],
  );
}

function useMockBedUnits(): BedUnit[] {
  return useMemo(
    () => [
      { unit: 'UTI Adulto', occupied: 8, total: 10, percentage: 80 },
      { unit: 'UTI Pediatrica', occupied: 3, total: 5, percentage: 60 },
      { unit: 'Clinica Medica', occupied: 22, total: 30, percentage: 73 },
      { unit: 'Clinica Cirurgica', occupied: 18, total: 25, percentage: 72 },
      { unit: 'Maternidade', occupied: 6, total: 12, percentage: 50 },
      { unit: 'Pediatria', occupied: 10, total: 15, percentage: 67 },
    ],
    [],
  );
}

function useMockDepartments(): DepartmentData[] {
  return useMemo(
    () => [
      { name: 'Clinica Medica', value: 35, color: '#3b82f6' },
      { name: 'Emergencia', value: 22, color: '#ef4444' },
      { name: 'Cirurgia', value: 18, color: '#8b5cf6' },
      { name: 'Pediatria', value: 12, color: '#f59e0b' },
      { name: 'Obstetrica', value: 8, color: '#ec4899' },
      { name: 'Outros', value: 5, color: '#6b7280' },
    ],
    [],
  );
}

function useMockOccupancyTrend(): Array<{ hour: string; occupancy: number }> {
  return useMemo(
    () => [
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
    ],
    [],
  );
}

function useMockEncounterTrend(): Array<{ hour: string; atendimentos: number }> {
  return useMemo(
    () => [
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
    ],
    [],
  );
}

// Sparkline mock data for each KPI card
const SPARKLINE_DATA = {
  patients: [120, 132, 125, 140, 138, 142, 155],
  encounters: [18, 22, 20, 25, 19, 24, 28],
  occupancy: [68, 70, 72, 74, 73, 75, 76],
  alerts: [8, 6, 10, 5, 7, 3, 4],
  appointments: [30, 28, 35, 32, 38, 36, 40],
  prescriptions: [12, 15, 10, 14, 11, 8, 9],
} as const satisfies Record<string, readonly number[]>;

// ============================================================================
// Surgery Status Badge
// ============================================================================

function SurgeryStatusBadge({ status }: { status: SurgeryItem['status'] }) {
  const config: Record<SurgeryItem['status'], { label: string; className: string }> = {
    SCHEDULED: { label: 'Agendada', className: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
    IN_PROGRESS: { label: 'Em andamento', className: 'bg-amber-600/20 text-amber-400 border-amber-600/30 animate-pulse' },
    COMPLETED: { label: 'Concluida', className: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' },
    DELAYED: { label: 'Atrasada', className: 'bg-red-600/20 text-red-400 border-red-600/30' },
  };
  const c = config[status];
  return <Badge className={cn('text-[10px] border', c.className)}>{c.label}</Badge>;
}

// ============================================================================
// Task Priority Dot
// ============================================================================

function TaskPriorityDot({ priority }: { priority: TaskItem['priority'] }) {
  const colors: Record<TaskItem['priority'], string> = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full shrink-0',
        colors[priority],
        priority === 'high' && 'animate-pulse',
      )}
    />
  );
}

// ============================================================================
// Activity Icon
// ============================================================================

function ActivityIcon({ type }: { type: ActivityItem['icon'] }) {
  const config: Record<
    ActivityItem['icon'],
    { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
  > = {
    encounter: { icon: Stethoscope, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    prescription: { icon: Pill, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    lab: { icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  };
  const c = config[type];
  return (
    <div className={cn('flex h-9 w-9 items-center justify-center rounded-full shrink-0 ring-4 ring-background', c.bg)}>
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
  gradient,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  gradient: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-4',
        'transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/5',
        'hover:border-emerald-500/30 cursor-pointer',
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110',
          gradient,
        )}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// Occupancy Bar (enhanced)
// ============================================================================

function OccupancyBar({ unit, occupied, total, percentage }: BedUnit) {
  const getBarColor = useCallback((pct: number) => {
    if (pct >= 90) return 'from-red-500 to-red-600';
    if (pct >= 75) return 'from-amber-400 to-amber-500';
    return 'from-emerald-400 to-emerald-500';
  }, []);

  const getTextColor = useCallback((pct: number) => {
    if (pct >= 90) return 'text-red-400';
    if (pct >= 75) return 'text-amber-400';
    return 'text-emerald-400';
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{unit}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {occupied}/{total}
          </span>
          <span className={cn('text-xs font-semibold tabular-nums', getTextColor(percentage))}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out', getBarColor(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Donut Center Label
// ============================================================================

function DonutCenterLabel({ total }: { total: number }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-6" className="fill-foreground text-2xl font-bold">
        {total}
      </tspan>
      <tspan x="50%" dy="18" className="fill-muted-foreground text-[10px]">
        atendimentos
      </tspan>
    </text>
  );
}

// ============================================================================
// Custom Recharts Tooltip
// ============================================================================

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      {label && <p className="text-[10px] text-muted-foreground mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-semibold text-foreground">
          {formatter ? formatter(entry.value) : entry.value} {entry.name}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Loading State
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-1">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-80 rounded-lg" />
          <Skeleton className="h-5 w-56 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>

      {/* Summary bar skeleton */}
      <Skeleton className="h-14 w-full rounded-xl" />

      {/* KPI cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-full rounded" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      </div>

      {/* Bottom sections skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Erro ao carregar o painel</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Nao foi possivel carregar os dados do dashboard. Tente novamente.
      </p>
      <Button onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
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
  const departments = useMockDepartments();
  const occupancyTrend = useMockOccupancyTrend();
  const encounterTrend = useMockEncounterTrend();

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = useCallback(() => {
    refetch();
    setLastRefresh(new Date());
  }, [refetch]);

  const handleDismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  }, []);

  const criticalAlerts = useMemo(
    () =>
      alerts.filter(
        (a) =>
          (a.severity === 'CRITICAL' || a.severity === 'EMERGENCY') &&
          !dismissedAlerts.has(a.id),
      ),
    [alerts, dismissedAlerts],
  );

  const departmentTotal = useMemo(() => departments.reduce((s, d) => s + d.value, 0), [departments]);

  // KPI card definitions
  const kpiCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'Total Pacientes',
        value: stats.totalPatients,
        icon: Users,
        gradient: 'from-teal-500 to-cyan-500',
        sparkColor: '#14b8a6',
        sparkData: SPARKLINE_DATA.patients,
        change: stats.totalPatientsChange,
        changeSuffix: 'vs mes anterior',
      },
      {
        label: 'Atendimentos Hoje',
        value: stats.encountersToday,
        icon: Stethoscope,
        gradient: 'from-blue-500 to-indigo-500',
        sparkColor: '#3b82f6',
        sparkData: SPARKLINE_DATA.encounters,
        change: stats.encountersTodayChange,
        changeSuffix: 'vs ontem',
      },
      {
        label: 'Ocupacao Leitos',
        value: stats.occupancyRate,
        suffix: '%',
        subtitle: `${stats.occupiedBeds}/${stats.totalBeds}`,
        icon: BedDouble,
        gradient: 'from-amber-500 to-orange-500',
        sparkColor: '#f59e0b',
        sparkData: SPARKLINE_DATA.occupancy,
      },
      {
        label: 'Alertas Ativos',
        value: stats.activeAlerts,
        subtitle: stats.criticalAlerts > 0 ? `${stats.criticalAlerts} criticos` : undefined,
        icon: AlertTriangle,
        gradient: 'from-red-500 to-rose-500',
        sparkColor: '#ef4444',
        sparkData: SPARKLINE_DATA.alerts,
      },
      {
        label: 'Agenda Hoje',
        value: stats.completedAppointments,
        suffix: `/${stats.scheduledAppointments}`,
        icon: Calendar,
        gradient: 'from-violet-500 to-purple-500',
        sparkColor: '#8b5cf6',
        sparkData: SPARKLINE_DATA.appointments,
      },
      {
        label: 'Prescricoes Pendentes',
        value: stats.pendingPrescriptions,
        icon: Pill,
        gradient: 'from-emerald-500 to-green-500',
        sparkColor: '#10b981',
        sparkData: SPARKLINE_DATA.prescriptions,
      },
    ];
  }, [stats]);

  // ========================================================================
  // Loading / Error states
  // ========================================================================
  if (isLoading) return <DashboardSkeleton />;
  if (isError || !stats) return <DashboardError onRetry={() => refetch()} />;

  const summaryLine = `${stats.encountersToday} atendimentos hoje, ${stats.criticalAlerts} alertas criticos, ${stats.occupancyRate}% ocupacao`;

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* Welcome Header */}
      {/* ================================================================ */}
      <StaggerItem index={0}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {getGreeting()},{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                {user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Doutor'}
              </span>
            </h1>
            <p className="text-sm capitalize text-muted-foreground">{getFormattedDate()}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{summaryLine}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
              onClick={handleRefresh}
              title={`Ultima atualizacao: ${lastRefresh.toLocaleTimeString('pt-BR')}`}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <LiveClock />
          </div>
        </div>
      </StaggerItem>

      {/* ================================================================ */}
      {/* Critical Alerts Banner (pulse animation for urgent) */}
      {/* ================================================================ */}
      {criticalAlerts.length > 0 && (
        <StaggerItem index={1}>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl border p-3 pr-10',
                  alert.severity === 'EMERGENCY'
                    ? 'border-red-500/40 bg-red-500/5 shadow-red-500/10 shadow-lg'
                    : 'border-amber-500/30 bg-amber-500/5',
                )}
              >
                {alert.severity === 'EMERGENCY' && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-red-500 animate-pulse" />
                )}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                    alert.severity === 'EMERGENCY' ? 'bg-red-500/20' : 'bg-amber-500/20',
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4',
                      alert.severity === 'EMERGENCY' ? 'text-red-400 animate-pulse' : 'text-amber-400',
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge
                  className={cn(
                    'text-[10px] border shrink-0',
                    alert.severity === 'EMERGENCY'
                      ? 'bg-red-600/20 text-red-400 border-red-600/30'
                      : 'bg-amber-600/20 text-amber-400 border-amber-600/30',
                  )}
                >
                  {alert.severity === 'EMERGENCY' ? 'Emergencia' : 'Critico'}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleDismissAlert(alert.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </StaggerItem>
      )}

      {/* ================================================================ */}
      {/* KPI Cards with sparklines */}
      {/* ================================================================ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi, i) => (
          <StaggerItem key={kpi.label} index={i + 2}>
            <Card
              className={cn(
                'group relative overflow-hidden border-border/50 transition-all duration-300',
                'hover:scale-[1.02] hover:shadow-xl hover:shadow-black/5 hover:border-border',
              )}
            >
              <CardContent className="p-5 pb-2">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground leading-tight">{kpi.label}</p>
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm',
                      'transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md',
                      kpi.gradient,
                    )}
                  >
                    <kpi.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums tracking-tight">
                    {typeof kpi.value === 'number' ? (
                      <AnimatedNumber value={kpi.value} />
                    ) : (
                      kpi.value
                    )}
                  </span>
                  {'suffix' in kpi && kpi.suffix && (
                    <span className="text-sm font-medium text-muted-foreground">{kpi.suffix}</span>
                  )}
                </div>
                {'subtitle' in kpi && kpi.subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.subtitle}</p>
                )}
                {'change' in kpi && kpi.change !== undefined && (
                  <div className="mt-1">
                    <TrendBadge value={kpi.change} suffix={'changeSuffix' in kpi ? kpi.changeSuffix : undefined} />
                  </div>
                )}
              </CardContent>
              {/* Sparkline */}
              <div className="px-2 pb-2">
                <Sparkline data={kpi.sparkData} color={kpi.sparkColor} />
              </div>
            </Card>
          </StaggerItem>
        ))}
      </div>

      {/* ================================================================ */}
      {/* Charts: Area Chart + Donut Chart */}
      {/* ================================================================ */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Encounters per hour - Area Chart (3 cols) */}
        <StaggerItem index={9} className="lg:col-span-3">
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                    <Stethoscope className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Atendimentos por Hora</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Fluxo de atendimentos hoje</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Hoje
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={encounterTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="encounterGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="atendimentos"
                    name="Atendimentos"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#encounterGrad)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, fill: '#3b82f6', stroke: 'hsl(var(--background))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Department Distribution - Donut Chart (2 cols) */}
        <StaggerItem index={10} className="lg:col-span-2">
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Distribuicao por Departamento</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Atendimentos ativos</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={departments}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      animationDuration={1000}
                    >
                      {departments.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <DonutCenterLabel total={departmentTotal} />
                    <Tooltip
                      content={({ active, payload }) => {
                        const item = payload?.[0];
                        if (!active || !item) return null;
                        return (
                          <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-xl">
                            <p className="text-sm font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{String(item.value)} atendimentos</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1 w-full">
                  {departments.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-[11px] text-muted-foreground truncate">{d.name}</span>
                      <span className="text-[11px] font-medium tabular-nums ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </div>

      {/* ================================================================ */}
      {/* Quick Actions */}
      {/* ================================================================ */}
      <StaggerItem index={11}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Acoes Rapidas</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <QuickAction icon={Stethoscope} label="Novo Atendimento" gradient="from-blue-500 to-indigo-600" />
            <QuickAction icon={UserPlus} label="Cadastrar Paciente" gradient="from-teal-500 to-cyan-600" />
            <QuickAction icon={Calendar} label="Ver Agenda" gradient="from-violet-500 to-purple-600" />
            <QuickAction icon={Pill} label="Nova Prescricao" gradient="from-emerald-500 to-green-600" />
            <QuickAction icon={FileText} label="Laudos Pendentes" gradient="from-amber-500 to-orange-600" />
            <QuickAction icon={BedDouble} label="Mapa de Leitos" gradient="from-cyan-500 to-blue-600" />
          </div>
        </div>
      </StaggerItem>

      {/* ================================================================ */}
      {/* Bed Occupancy + Occupancy Trend + ED Triage */}
      {/* ================================================================ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bed Census */}
        <StaggerItem index={12}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                    <BedDouble className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Censo Hospitalar</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Ocupacao por unidade</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {stats.occupiedBeds}/{stats.totalBeds}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {bedUnits.map((unit) => (
                <OccupancyBar key={unit.unit} {...unit} />
              ))}
              {/* Overall occupancy progress */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Ocupacao Geral</span>
                  <span className="text-sm font-bold tabular-nums text-amber-400">{stats.occupancyRate}%</span>
                </div>
                <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-700"
                    style={{ width: `${stats.occupancyRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Occupancy Trend 24h */}
        <StaggerItem index={13}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Taxa de Ocupacao (24h)</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Tendencia nas ultimas 24 horas</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={occupancyTrend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="occupancyLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[50, 100]}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    content={<CustomTooltip formatter={(v: number) => `${v}%`} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="occupancy"
                    name="Ocupacao"
                    stroke="url(#occupancyLine)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#06b6d4', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Emergency Triage Status */}
        <StaggerItem index={14}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-500">
                    <Siren className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Pronto-Socorro</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Classificacao de risco</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stats.waitingTriage} aguardando
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {triageCounts.map((t) => (
                  <div key={t.classification} className="flex items-center gap-3">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', t.bgColor)}>
                      <span className={cn('text-sm font-bold tabular-nums', t.color)}>{t.count}</span>
                    </div>
                    <span className="text-xs font-medium flex-1">{t.classification}</span>
                    <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', t.color.replace('text-', 'bg-'))}
                        style={{ width: `${Math.min((t.count / 31) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Total: {triageCounts.reduce((s, t) => s + t.count, 0)} pacientes
                </span>
                <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300 gap-1 h-7">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </div>

      {/* ================================================================ */}
      {/* Surgeries + Tasks + Activity Feed */}
      {/* ================================================================ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Surgeries Today */}
        <StaggerItem index={15}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
                    <Scissors className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Cirurgias Hoje</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">{surgeries.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {surgeries.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-accent/30 hover:border-border cursor-pointer"
                  >
                    <div className="flex flex-col items-center shrink-0 w-12">
                      <span className="text-sm font-bold tabular-nums text-foreground">{s.time}</span>
                      <span className="text-[10px] text-muted-foreground">{s.room}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{s.procedure}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {s.patient} — {s.surgeon}
                      </p>
                    </div>
                    <SurgeryStatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Pending Tasks */}
        <StaggerItem index={16}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500">
                    <ClipboardList className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Tarefas Pendentes</CardTitle>
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
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-all hover:bg-accent/30 hover:border-border cursor-pointer group"
                  >
                    <TaskPriorityDot priority={task.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{task.title}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">ha {task.time}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex justify-center">
                <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300 gap-1 h-7">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Activity Feed */}
        <StaggerItem index={17}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold">Atividade Recente</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[17px] top-4 bottom-4 w-px bg-gradient-to-b from-border via-border to-transparent" />

                <div className="space-y-4">
                  {activityFeed.map((item) => (
                    <div key={item.id} className="relative flex items-start gap-3">
                      <ActivityIcon type={item.icon} />
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-xs leading-snug">{item.action}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium text-muted-foreground">{item.actor}</span>
                          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {item.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex justify-center">
                <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300 gap-1 h-7">
                  Ver historico <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </div>

      {/* ================================================================ */}
      {/* Operational Summary Footer */}
      {/* ================================================================ */}
      <StaggerItem index={18}>
        <Card className="border-border/50 bg-gradient-to-br from-card via-card to-emerald-500/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold">Resumo Operacional</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Timer, label: 'Tempo Medio Espera', value: `${stats.averageWaitTime} min`, gradient: 'from-cyan-500 to-blue-500' },
                { icon: DollarSign, label: 'Faturamento Mes', value: stats.revenueThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }), gradient: 'from-emerald-500 to-green-500' },
                { icon: Stethoscope, label: 'Em Atendimento', value: String(stats.encountersToday), gradient: 'from-blue-500 to-indigo-500' },
                { icon: CheckCircle2, label: 'Consultas Realizadas', value: String(stats.completedAppointments), gradient: 'from-violet-500 to-purple-500' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-border/50 p-3 transition-all hover:border-border hover:bg-accent/20"
                >
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br shrink-0', item.gradient)}>
                    <item.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-bold tabular-nums truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </StaggerItem>
    </div>
  );
}
