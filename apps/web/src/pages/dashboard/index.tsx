import { useMemo, useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboardStats } from '@/services/dashboard.service';
import { useAlerts } from '@/services/alerts.service';
import { cn } from '@/lib/utils';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();
  const { data: alertsResponse } = useAlerts({ isActive: true });
  const alerts = alertsResponse?.data ?? [];

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
              changeSuffix: 'vs mês anterior',
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
              label: 'Ocupação Leitos',
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
              subtitle: stats.criticalAlerts > 0 ? `${stats.criticalAlerts} críticos` : undefined,
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

      {/* Secondary Stats */}
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
              <p className="text-sm text-muted-foreground">Prescrições Pendentes</p>
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
              <p className="text-sm text-muted-foreground">Tempo Médio Espera</p>
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedNumber value={stats.averageWaitTime} />
                <span className="text-sm font-normal text-muted-foreground"> min</span>
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
              <p className="text-sm text-muted-foreground">Faturamento Mês</p>
              <p className="text-2xl font-bold tabular-nums">
                {stats.revenueThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Triage / Waiting */}
        <Card className="border-border card-medical">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-medium">Status Operacional</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <span className="text-sm">Atendimentos Hoje</span>
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
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="border-border card-medical">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              <CardTitle className="text-base font-medium">Alertas Críticos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum alerta ativo</p>
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
            {alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY').length === 0 && alerts.length > 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum alerta crítico</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
