import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  BedDouble,
  AlertTriangle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboardStats } from '@/services/dashboard.service';
import { useAlerts } from '@/services/alerts.service';
import { encounterStatusLabels, triageLevelColors, encounterTypeLabels } from '@/lib/constants';
import { cn, getInitials } from '@/lib/utils';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

const TRIAGE_PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

/** Animated number that counts up from 0 to target */
function AnimatedNumber({ value }: { value: number | string }) {
  const numericVal = typeof value === 'string' ? parseInt(value) || 0 : value;
  const [display, setDisplay] = useState(0);
  const ref = useRef<ReturnType<typeof requestAnimationFrame>>(undefined);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * numericVal));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [numericVal]);

  return <>{display}</>;
}

/** Real-time clock */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span className="font-mono text-sm tabular-nums text-foreground">
        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();
  const { data: alertsResponse } = useAlerts({ isActive: true });
  const alerts = alertsResponse?.data ?? [];

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError || !stats) return <PageError onRetry={() => refetch()} />;

  const kpiCards = useMemo(
    () => [
      {
        label: 'Pacientes Hoje',
        value: stats.patientsToday,
        icon: Users,
        color: 'text-teal-600 dark:text-teal-400',
        bgColor: 'bg-teal-500/10',
        gradient: 'from-teal-500/10 via-teal-500/5 to-transparent',
        borderAccent: 'border-l-teal-500',
        trend: '+3 vs ontem',
      },
      {
        label: 'Atendimentos',
        value: stats.encountersToday,
        icon: Stethoscope,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-500/10',
        gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
        borderAccent: 'border-l-blue-500',
        trend: '+2 vs ontem',
      },
      {
        label: 'Leitos Ocupados',
        value: `${Math.round((stats.occupiedBeds / stats.totalBeds) * 100)}%`,
        subtitle: `${stats.occupiedBeds}/${stats.totalBeds}`,
        icon: BedDouble,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10',
        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
        borderAccent: 'border-l-amber-500',
        trend: '2 altas previstas',
      },
      {
        label: 'Alertas Ativos',
        value: stats.activeAlerts,
        icon: AlertTriangle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-500/10',
        gradient: 'from-red-500/10 via-red-500/5 to-transparent',
        borderAccent: 'border-l-red-500',
        trend: '1 crítico',
      },
    ],
    [stats],
  );

  const triagePieData = stats.triageDistribution.map((item) => ({
    name: triageLevelColors[item.level]?.label ?? item.level,
    value: item.count,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Doutor'}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{getFormattedDate()}</p>
        </div>
        <LiveClock />
      </div>

      {/* KPI Cards */}
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
                    {kpi.subtitle && (
                      <span className="text-sm text-muted-foreground">{kpi.subtitle}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {kpi.trend}
                  </div>
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', kpi.bgColor)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Bar chart: encounters by hour */}
        <Card className="border-border bg-card lg:col-span-3 card-medical">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Atendimentos por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.encountersByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)' }}
                    cursor={{ fill: 'rgba(13,148,136,0.05)' }}
                  />
                  <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} name="Atendimentos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart: triage distribution */}
        <Card className="border-border bg-card lg:col-span-2 card-medical">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Classificação de Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={triagePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {triagePieData.map((_, index) => (
                      <Cell key={index} fill={TRIAGE_PIE_COLORS[index % TRIAGE_PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {triagePieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TRIAGE_PIE_COLORS[i] }} />
                  <span className="text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent Encounters */}
        <Card className="border-border bg-card lg:col-span-3 card-medical">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Últimos Atendimentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {stats.recentEncounters.map((enc) => {
                const statusInfo = encounterStatusLabels[enc.status];
                return (
                  <button
                    key={enc.id}
                    onClick={() => navigate(`/atendimentos/${enc.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-all hover:bg-accent border-l-2 border-l-transparent hover:border-l-primary"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                        {enc.patient ? getInitials(enc.patient.name ?? enc.patient.fullName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{enc.patient?.name ?? enc.patient?.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{enc.chiefComplaint}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                        {statusInfo?.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {encounterTypeLabels[enc.type]}
                      </span>
                    </div>
                    {enc.triageLevel && (
                      <div className={cn('h-3 w-3 shrink-0 rounded-full', triageLevelColors[enc.triageLevel]?.bg)} />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="border-border bg-card lg:col-span-2 card-medical">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              <CardTitle className="text-base font-medium">Alertas Críticos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts
              .filter((a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY')
              .slice(0, 5)
              .map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    alert.severity === 'CRITICAL'
                      ? 'border-red-500/30 bg-red-500/5 clinical-alert-border-critical'
                      : 'border-amber-500/30 bg-amber-500/5 clinical-alert-border-warning',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        alert.severity === 'CRITICAL' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400',
                      )}
                    />
                    <div>
                      <p className="text-xs font-medium">{alert.message}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
