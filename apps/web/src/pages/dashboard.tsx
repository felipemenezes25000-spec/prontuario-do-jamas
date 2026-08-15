import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Clock3,
  FilePlus2,
  HeartPulse,
  Loader2,
  Pill,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboardStats } from '@/services/dashboard.service';
import { useAlerts } from '@/services/alerts.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackgroundClassName: string;
  trend?: number;
  onClick?: () => void;
  urgent?: boolean;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
  iconBackgroundClassName,
  trend,
  onClick,
  urgent = false,
}: MetricCardProps) {
  const content = (
    <Card
      className={cn(
        'group relative h-full overflow-hidden border-border/60 bg-card/90 shadow-sm transition-[border-color,box-shadow,transform] duration-200',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg',
        urgent && 'border-red-500/25',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {value}
              </span>
              {trend !== undefined && trend !== 0 && (
                <span
                  className={cn(
                    'mb-1 inline-flex items-center gap-1 text-xs font-medium tabular-nums',
                    trend > 0 ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', iconBackgroundClassName)}>
            <Icon className={cn('h-5 w-5', iconClassName)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded-xl">
      {content}
    </button>
  );
}

function ProgressBlock({
  label,
  value,
  detail,
  progress,
  className,
}: {
  label: string;
  value: string;
  detail: string;
  progress: number;
  className: string;
}) {
  const clamped = Math.max(0, Math.min(progress, 100));
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <span className="text-[11px] text-muted-foreground">{detail}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', className)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const {
    data: stats,
    isLoading,
    isError,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useDashboardStats();
  const { data: alertsResponse } = useAlerts({ isActive: true, limit: 6 });

  const alerts = alertsResponse?.data ?? [];
  const criticalAlerts = useMemo(
    () => alerts.filter((alert) => alert.severity === 'CRITICAL' || alert.severity === 'EMERGENCY'),
    [alerts],
  );

  if (isLoading) return <DashboardLoading />;

  if (isError || !stats) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/[0.03] p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Não foi possível carregar o command center</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Os dados operacionais não estão disponíveis agora. Nenhum valor simulado será exibido no lugar deles.
        </p>
        <Button className="mt-5 gap-2 rounded-xl" onClick={() => void refetch()}>
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  const occupancy = Math.max(0, Math.min(stats.occupancyRate, 100));
  const appointmentsCompletion = stats.scheduledAppointments > 0
    ? (stats.completedAppointments / stats.scheduledAppointments) * 100
    : 0;
  const firstName = user?.name?.split(' ')[0] ?? 'Doutor';
  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'agora';

  const quickActions = [
    { label: 'Novo atendimento', detail: 'Abrir consulta', icon: Stethoscope, route: '/atendimentos/novo' },
    { label: 'Cadastrar paciente', detail: 'Novo prontuário', icon: UserPlus, route: '/pacientes/novo' },
    { label: 'Agenda', detail: 'Consultas de hoje', icon: CalendarDays, route: '/agenda' },
    { label: 'Prescrições', detail: 'Revisar pendências', icon: Pill, route: '/prescricoes' },
    { label: 'Mapa assistencial', detail: 'Internações e leitos', icon: BedDouble, route: '/internacoes' },
    { label: 'Busca global', detail: 'Localizar registro', icon: Search, route: '/busca' },
  ] as const;

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card px-5 py-6 shadow-sm sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 h-52 w-52 rounded-full bg-teal-500/[0.06] blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]">
                <Activity className="h-3 w-3 text-emerald-500" /> Operação ao vivo
              </Badge>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Dados do backend, sem preenchimento fictício
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {getGreeting()}, {firstName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Visão executiva do hospital: assistência, capacidade, agenda e riscos clínicos em um único lugar.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <div className="hidden text-right sm:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Atualizado</p>
              <p className="text-xs font-medium tabular-nums">{updatedAt}</p>
            </div>
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Indicadores principais" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pacientes"
          value={stats.totalPatients.toLocaleString('pt-BR')}
          description="Pacientes cadastrados na base clínica"
          icon={Users}
          iconClassName="text-cyan-500"
          iconBackgroundClassName="bg-cyan-500/10"
          trend={stats.totalPatientsChange}
          onClick={() => navigate('/pacientes')}
        />
        <MetricCard
          label="Atendimentos hoje"
          value={stats.encountersToday}
          description="Atendimentos registrados no dia"
          icon={Stethoscope}
          iconClassName="text-blue-500"
          iconBackgroundClassName="bg-blue-500/10"
          trend={stats.encountersTodayChange}
          onClick={() => navigate('/atendimentos')}
        />
        <MetricCard
          label="Ocupação hospitalar"
          value={`${stats.occupancyRate}%`}
          description={`${stats.occupiedBeds} de ${stats.totalBeds} leitos ocupados`}
          icon={BedDouble}
          iconClassName={occupancy >= 90 ? 'text-red-500' : occupancy >= 75 ? 'text-amber-500' : 'text-emerald-500'}
          iconBackgroundClassName={occupancy >= 90 ? 'bg-red-500/10' : occupancy >= 75 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}
          onClick={() => navigate('/internacoes')}
          urgent={occupancy >= 90}
        />
        <MetricCard
          label="Alertas ativos"
          value={stats.activeAlerts}
          description={stats.criticalAlerts > 0 ? `${stats.criticalAlerts} críticos exigem atenção` : 'Nenhum alerta crítico informado'}
          icon={AlertTriangle}
          iconClassName={stats.criticalAlerts > 0 ? 'text-red-500' : 'text-amber-500'}
          iconBackgroundClassName={stats.criticalAlerts > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'}
          onClick={() => navigate('/alertas')}
          urgent={stats.criticalAlerts > 0}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeartPulse className="h-4 w-4 text-emerald-500" /> Pulso operacional
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Capacidade e fluxo assistencial do momento</p>
              </div>
              <Badge variant="outline" className="rounded-full text-[10px]">Tempo real</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <ProgressBlock
              label="Leitos ocupados"
              value={`${stats.occupiedBeds}/${stats.totalBeds}`}
              detail={`${stats.occupancyRate}%`}
              progress={occupancy}
              className={occupancy >= 90 ? 'bg-red-500' : occupancy >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}
            />
            <ProgressBlock
              label="Agenda concluída"
              value={`${stats.completedAppointments}/${stats.scheduledAppointments}`}
              detail={`${Math.round(appointmentsCompletion)}%`}
              progress={appointmentsCompletion}
              className="bg-violet-500"
            />
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Aguardando triagem</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.waitingTriage}</p>
                </div>
                <Clock3 className="h-5 w-5 text-orange-500" />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Espera média informada: <span className="font-medium text-foreground">{stats.averageWaitTime} min</span>
              </p>
              <Button variant="ghost" size="sm" className="mt-2 h-8 gap-1 px-0 text-xs text-emerald-500" onClick={() => navigate('/triagem')}>
                Abrir triagem <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Produção mensal</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{formatCurrency(stats.revenueThisMonth)}</p>
                </div>
                <WalletCards className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Indicador financeiro consolidado do período</p>
              <Button variant="ghost" size="sm" className="mt-2 h-8 gap-1 px-0 text-xs text-emerald-500" onClick={() => navigate('/faturamento')}>
                Abrir faturamento <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> Alertas prioritários
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Riscos clínicos ativos mais recentes</p>
              </div>
              {criticalAlerts.length > 0 && <Badge className="rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/10">{criticalAlerts.length} críticos</Badge>}
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {alerts.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="mt-4 text-sm font-medium">Nenhum alerta ativo retornado</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">O painel permanece limpo até que a API informe um risco clínico.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {alerts.slice(0, 6).map((alert) => {
                  const critical = alert.severity === 'CRITICAL' || alert.severity === 'EMERGENCY';
                  return (
                    <button
                      key={alert.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                      onClick={() => navigate('/alertas')}
                    >
                      <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', critical ? 'bg-red-500' : 'bg-amber-500')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{alert.title ?? 'Alerta clínico'}</span>
                        <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-muted-foreground">{alert.message}</span>
                      </span>
                      <Badge variant="outline" className={cn('shrink-0 text-[9px]', critical && 'border-red-500/30 text-red-500')}>
                        {alert.severity}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
            <Button variant="ghost" className="mt-2 w-full gap-2 rounded-xl text-xs" onClick={() => navigate('/alertas')}>
              Ver central de alertas <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold">Ações rápidas</h2>
          </div>
          <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            <Sparkles className="h-3 w-3 text-emerald-500" /> atalhos operacionais
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {quickActions.map((action) => (
            <button
              key={action.route}
              type="button"
              onClick={() => navigate(action.route)}
              className="group flex min-h-28 flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-105">
                <action.icon className="h-4 w-4" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold">{action.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{action.detail}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={() => navigate('/agenda')} className="rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm transition-colors hover:border-violet-500/30">
          <CalendarDays className="h-5 w-5 text-violet-500" />
          <p className="mt-3 text-xs text-muted-foreground">Agenda de hoje</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.completedAppointments}<span className="text-sm font-normal text-muted-foreground">/{stats.scheduledAppointments}</span></p>
        </button>
        <button type="button" onClick={() => navigate('/prescricoes')} className="rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm transition-colors hover:border-emerald-500/30">
          <Pill className="h-5 w-5 text-emerald-500" />
          <p className="mt-3 text-xs text-muted-foreground">Prescrições pendentes</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.pendingPrescriptions}</p>
        </button>
        <button type="button" onClick={() => navigate('/atendimentos/novo')} className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5 text-left shadow-sm transition-colors hover:bg-emerald-500/[0.08]">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <FilePlus2 className="h-5 w-5 text-emerald-500" />
          <p className="mt-3 text-xs text-muted-foreground">Fluxo clínico</p>
          <p className="mt-1 text-sm font-semibold">Iniciar novo atendimento</p>
        </button>
      </section>
    </div>
  );
}
