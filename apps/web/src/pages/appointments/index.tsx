import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Video,
  Stethoscope,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  UserX,
  Ban,
  Bell,
  Filter,
  MapPin,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAppointments } from '@/services/appointments.service';
import { useUsers } from '@/services/users.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

import type { Appointment, AppointmentType } from '@/types';

// ============================================================================
// Constants & Config
// ============================================================================

type ViewMode = 'day' | 'week' | 'month';

const typeConfig: Record<
  AppointmentType,
  { label: string; bg: string; border: string; text: string; dot: string; hex: string }
> = {
  FIRST_VISIT: {
    label: 'Consulta',
    bg: 'bg-blue-500/15 dark:bg-blue-500/20',
    border: 'border-l-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    hex: '#3b82f6',
  },
  RETURN: {
    label: 'Retorno',
    bg: 'bg-teal-500/15 dark:bg-teal-500/20',
    border: 'border-l-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    dot: 'bg-teal-500',
    hex: '#14b8a6',
  },
  FOLLOW_UP: {
    label: 'Acompanhamento',
    bg: 'bg-cyan-500/15 dark:bg-cyan-500/20',
    border: 'border-l-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    dot: 'bg-cyan-500',
    hex: '#06b6d4',
  },
  TELEMEDICINE: {
    label: 'Telemedicina',
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    border: 'border-l-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    hex: '#10b981',
  },
  PROCEDURE: {
    label: 'Procedimento',
    bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    border: 'border-l-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
  },
  EXAM: {
    label: 'Exame',
    bg: 'bg-purple-500/15 dark:bg-purple-500/20',
    border: 'border-l-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
    hex: '#a855f7',
  },
  HOME_VISIT: {
    label: 'Visita Domiciliar',
    bg: 'bg-orange-500/15 dark:bg-orange-500/20',
    border: 'border-l-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
    hex: '#f97316',
  },
  GROUP_SESSION: {
    label: 'Sessão em Grupo',
    bg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
    border: 'border-l-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    dot: 'bg-indigo-500',
    hex: '#6366f1',
  },
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  SCHEDULED: { label: 'Agendado', color: 'bg-slate-500', icon: Clock },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-600', icon: CheckCircle2 },
  WAITING: { label: 'Aguardando', color: 'bg-yellow-600', icon: Clock },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-teal-600', icon: Stethoscope },
  COMPLETED: { label: 'Concluído', color: 'bg-emerald-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-800', icon: Ban },
  NO_SHOW: { label: 'Faltou', color: 'bg-red-600', icon: UserX },
  RESCHEDULED: { label: 'Reagendado', color: 'bg-orange-600', icon: CalendarIcon },
};

const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i); // 07:00–20:00

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];
const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ============================================================================
// Date Utilities
// ============================================================================

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1)); // Monday start
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getMonthDates(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon start
  const weeks: (Date | null)[][] = [];
  let current: (Date | null)[] = [];

  for (let i = 0; i < startPad; i++) current.push(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    current.push(new Date(year, month, d));
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    while (current.length < 7) current.push(null);
    weeks.push(current);
  }
  return weeks;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatCardProps {
  icon: typeof Clock;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Current Time Indicator
// ============================================================================

function useCurrentTime(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ============================================================================
// Main Page
// ============================================================================

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedAppt, setSelectedAppt] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useCurrentTime();

  const {
    data: appointmentsData,
    isLoading: apptLoading,
    isError: apptError,
    refetch: refetchAppts,
  } = useAppointments();
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useUsers({ role: 'DOCTOR' });

  const allAppointments: Appointment[] = appointmentsData?.data ?? [];
  const doctors = usersData ?? [];

  // ── Derived dates ──
  const baseDate = useMemo(() => {
    const d = new Date(selectedDate);
    if (viewMode === 'week') d.setDate(d.getDate() + offset * 7);
    else if (viewMode === 'day') d.setDate(d.getDate() + offset);
    else {
      d.setDate(1);
      d.setMonth(d.getMonth() + offset);
    }
    return d;
  }, [selectedDate, offset, viewMode]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const monthWeeks = useMemo(
    () => getMonthDates(baseDate.getFullYear(), baseDate.getMonth()),
    [baseDate],
  );

  const todayStr = toDateStr(new Date());

  // ── Filtered appointments ──
  const filteredAppointments = useMemo(() => {
    let appts = allAppointments;
    if (selectedDoctor !== 'all') {
      appts = appts.filter((a) => a.doctorId === selectedDoctor);
    }
    return appts;
  }, [selectedDoctor, allAppointments]);

  // ── Stats (today only) ──
  const stats = useMemo(() => {
    const todayAppts = allAppointments.filter(
      (a) => toDateStr(new Date(a.scheduledAt)) === todayStr,
    );
    return {
      total: todayAppts.length,
      completed: todayAppts.filter((a) => a.status === 'COMPLETED').length,
      noShows: todayAppts.filter((a) => a.status === 'NO_SHOW').length,
      confirmed: todayAppts.filter(
        (a) => a.status === 'CONFIRMED' || a.status === 'SCHEDULED',
      ).length,
    };
  }, [allAppointments, todayStr]);

  // ── Helpers ──
  const getApptsByDateHour = useCallback(
    (dateStr: string, hour: number): Appointment[] =>
      filteredAppointments.filter((a) => {
        const d = new Date(a.scheduledAt);
        return toDateStr(d) === dateStr && d.getHours() === hour;
      }),
    [filteredAppointments],
  );

  const getApptsByDate = useCallback(
    (dateStr: string): Appointment[] =>
      filteredAppointments.filter((a) => toDateStr(new Date(a.scheduledAt)) === dateStr),
    [filteredAppointments],
  );

  const apptDetail = selectedAppt
    ? allAppointments.find((a) => a.id === selectedAppt) ?? null
    : null;

  // Navigate
  const navigate = useCallback(
    (dir: -1 | 1) => setOffset((o) => o + dir),
    [],
  );
  const goToday = useCallback(() => {
    setSelectedDate(new Date());
    setOffset(0);
  }, []);

  // Scroll to current hour on mount (week/day)
  useEffect(() => {
    if (viewMode !== 'month' && scrollRef.current) {
      const hourNow = new Date().getHours();
      const targetRow = Math.max(0, hourNow - 7) * 64; // approx row height
      scrollRef.current.scrollTop = targetRow;
    }
  }, [viewMode]);

  // ── Navigation label ──
  const navLabel = useMemo(() => {
    if (viewMode === 'day') {
      return `${WEEKDAY_FULL[baseDate.getDay()]}, ${baseDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    if (viewMode === 'week') {
      return `${weekDates[0]!.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} — ${weekDates[6]!.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return `${MONTH_LABELS[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
  }, [viewMode, baseDate, weekDates]);

  // ── Loading / Error ──
  if (apptLoading || usersLoading) return <PageLoading cards={4} showTable />;
  if (apptError || usersError)
    return (
      <PageError
        onRetry={() => {
          refetchAppts();
          refetchUsers();
        }}
      />
    );

  // ── Current time position (fraction of hour grid) ──
  const currentTimeTop =
    now.getHours() >= 7 && now.getHours() <= 20
      ? ((now.getHours() - 7) * 60 + now.getMinutes()) * (64 / 60) // 64px per hour row
      : null;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5 animate-fade-in">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {stats.total > 0 && (
                <span className="ml-2 text-foreground font-medium">
                  &middot; {stats.total} agendamento{stats.total !== 1 ? 's' : ''} hoje
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Doctor filter */}
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="w-52 bg-card border-border">
                <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Médico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os médicos</SelectItem>
                {doctors.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-muted">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      {u.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={CalendarIcon}
            label="Agendamentos hoje"
            value={stats.total}
            color="bg-blue-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Concluídos"
            value={stats.completed}
            color="bg-emerald-600"
          />
          <StatCard
            icon={UserX}
            label="Faltas"
            value={stats.noShows}
            color="bg-red-600"
          />
          <StatCard
            icon={Clock}
            label="Confirmados / Agendados"
            value={stats.confirmed}
            color="bg-violet-600"
          />
        </div>

        {/* ── View Controls + Navigation ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {(
              [
                { key: 'day', label: 'Dia' },
                { key: 'week', label: 'Semana' },
                { key: 'month', label: 'Mês' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setViewMode(key);
                  setOffset(0);
                }}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200',
                  viewMode === key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="text-xs"
            >
              Hoje
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[200px] text-center text-sm font-medium">
              {navLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Ban className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bloquear horário</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Bell className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar lembretes</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Type Legend ── */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <div className={cn('h-2.5 w-2.5 rounded-full', cfg.dot)} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>

        {/* ── Calendar Content ── */}
        <div className="flex gap-4">
          {/* Main calendar area */}
          <div className="flex-1 min-w-0">
            {viewMode === 'week' && (
              <WeekView
                weekDates={weekDates}
                todayStr={todayStr}
                getApptsByDateHour={getApptsByDateHour}
                onSelectAppt={setSelectedAppt}
                currentTimeTop={currentTimeTop}
                scrollRef={scrollRef}
              />
            )}
            {viewMode === 'day' && (
              <DayView
                date={baseDate}
                todayStr={todayStr}
                getApptsByDateHour={getApptsByDateHour}
                onSelectAppt={setSelectedAppt}
                currentTimeTop={currentTimeTop}
                now={now}
                scrollRef={scrollRef}
              />
            )}
            {viewMode === 'month' && (
              <MonthView
                weeks={monthWeeks}
                todayStr={todayStr}
                getApptsByDate={getApptsByDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setViewMode('day');
                  setOffset(0);
                }}
                baseDate={baseDate}
              />
            )}
          </div>

          {/* ── Side Panel (visible on lg+) ── */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <SidePanel
              date={viewMode === 'day' ? baseDate : new Date()}
              appointments={getApptsByDate(
                viewMode === 'day' ? toDateStr(baseDate) : todayStr,
              )}
              onSelectAppt={setSelectedAppt}
            />
          </div>
        </div>

        {/* ── Appointment Detail Dialog ── */}
        <Dialog open={!!selectedAppt} onOpenChange={() => setSelectedAppt(null)}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-emerald-500" />
                Detalhes do Agendamento
              </DialogTitle>
            </DialogHeader>
            {apptDetail && <AppointmentDetail appointment={apptDetail} />}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Week View
// ============================================================================

interface WeekViewProps {
  weekDates: Date[];
  todayStr: string;
  getApptsByDateHour: (dateStr: string, hour: number) => Appointment[];
  onSelectAppt: (id: string) => void;
  currentTimeTop: number | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function WeekView({
  weekDates,
  todayStr,
  getApptsByDateHour,
  onSelectAppt,
  currentTimeTop,
  scrollRef,
}: WeekViewProps) {
  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[750px]">
          {/* Header row */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 z-10 bg-card">
            <div className="p-2" />
            {weekDates.map((date, i) => {
              const dateStr = toDateStr(date);
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={i}
                  className={cn(
                    'border-l border-border p-2 text-center transition-colors',
                    isToday && 'bg-emerald-500/5',
                  )}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {WEEKDAY_LABELS[date.getDay()]}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                      isToday
                        ? 'bg-emerald-600 text-white'
                        : 'text-foreground',
                    )}
                  >
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div
            ref={scrollRef}
            className="relative max-h-[600px] overflow-y-auto"
          >
            {/* Current time line */}
            {currentTimeTop !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimeTop}px` }}
              >
                <div className="flex items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
                  <div className="flex-1 h-[2px] bg-red-500/70" />
                </div>
              </div>
            )}

            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 min-h-[64px]"
              >
                <div className="p-2 text-right">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
                {weekDates.map((date, dayIdx) => {
                  const dateStr = toDateStr(date);
                  const isToday = dateStr === todayStr;
                  const appts = getApptsByDateHour(dateStr, hour);
                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        'border-l border-border/40 p-0.5 transition-colors',
                        isToday && 'bg-emerald-500/[0.02]',
                      )}
                    >
                      {appts.map((appt) => (
                        <AppointmentBlock
                          key={appt.id}
                          appointment={appt}
                          compact
                          onClick={() => onSelectAppt(appt.id)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Day View
// ============================================================================

interface DayViewProps {
  date: Date;
  todayStr: string;
  getApptsByDateHour: (dateStr: string, hour: number) => Appointment[];
  onSelectAppt: (id: string) => void;
  currentTimeTop: number | null;
  now: Date;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function DayView({
  date,
  todayStr,
  getApptsByDateHour,
  onSelectAppt,
  currentTimeTop,
  now,
  scrollRef,
}: DayViewProps) {
  const dateStr = toDateStr(date);
  const isToday = dateStr === todayStr;

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div
        ref={scrollRef}
        className="relative max-h-[640px] overflow-y-auto"
      >
        {/* Current time line */}
        {isToday && currentTimeTop !== null && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${currentTimeTop}px` }}
          >
            <div className="flex items-center">
              <div className="w-16 text-right pr-2">
                <span className="text-[10px] font-bold text-red-500">
                  {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
              <div className="flex-1 h-[2px] bg-red-500/70" />
            </div>
          </div>
        )}

        {HOURS.map((hour) => {
          const appts = getApptsByDateHour(dateStr, hour);
          return (
            <div
              key={hour}
              className="flex border-b border-border/40 min-h-[72px]"
            >
              <div className="w-16 flex-shrink-0 p-2 text-right border-r border-border/40">
                <span className="text-xs text-muted-foreground font-medium">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
              <div className="flex-1 p-1 space-y-1">
                {appts.map((appt) => (
                  <AppointmentBlock
                    key={appt.id}
                    appointment={appt}
                    compact={false}
                    onClick={() => onSelectAppt(appt.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================================
// Month View
// ============================================================================

interface MonthViewProps {
  weeks: (Date | null)[][];
  todayStr: string;
  getApptsByDate: (dateStr: string) => Appointment[];
  onSelectDate: (d: Date) => void;
  baseDate: Date;
}

function MonthView({ weeks, todayStr, getApptsByDate, onSelectDate, baseDate }: MonthViewProps) {
  return (
    <Card className="border-border bg-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border/40">
          {week.map((date, di) => {
            if (!date) {
              return <div key={di} className="min-h-[90px] border-l border-border/30 bg-muted/20 p-1.5" />;
            }
            const dateStr = toDateStr(date);
            const isToday = dateStr === todayStr;
            const appts = getApptsByDate(dateStr);
            const isCurrentMonth = date.getMonth() === baseDate.getMonth();

            return (
              <button
                key={di}
                onClick={() => onSelectDate(date)}
                className={cn(
                  'min-h-[90px] border-l border-border/30 p-1.5 text-left transition-colors hover:bg-muted/30',
                  isToday && 'bg-emerald-500/5',
                  !isCurrentMonth && 'opacity-40',
                )}
              >
                <p
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday ? 'bg-emerald-600 text-white' : 'text-foreground',
                  )}
                >
                  {date.getDate()}
                </p>
                {/* Appointment dots */}
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {appts.slice(0, 5).map((appt) => (
                    <div
                      key={appt.id}
                      className={cn('h-1.5 w-1.5 rounded-full', typeConfig[appt.type].dot)}
                    />
                  ))}
                  {appts.length > 5 && (
                    <span className="text-[8px] text-muted-foreground ml-0.5">
                      +{appts.length - 5}
                    </span>
                  )}
                </div>
                {/* First few appointment labels */}
                <div className="mt-1 space-y-0.5">
                  {appts.slice(0, 2).map((appt) => (
                    <div
                      key={appt.id}
                      className={cn(
                        'truncate rounded px-1 py-0.5 text-[9px] font-medium',
                        typeConfig[appt.type].bg,
                        typeConfig[appt.type].text,
                      )}
                    >
                      {formatTime(appt.scheduledAt)} {appt.patient?.name?.split(' ')[0]}
                    </div>
                  ))}
                  {appts.length > 2 && (
                    <p className="text-[9px] text-muted-foreground pl-1">
                      +{appts.length - 2} mais
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

// ============================================================================
// Appointment Block (used in Week and Day views)
// ============================================================================

interface AppointmentBlockProps {
  appointment: Appointment;
  compact: boolean;
  onClick: () => void;
}

function AppointmentBlock({ appointment, compact, onClick }: AppointmentBlockProps) {
  const cfg = typeConfig[appointment.type];
  const status = statusConfig[appointment.status];

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'mb-0.5 w-full rounded-md border-l-[3px] px-1.5 py-1 text-left',
              'transition-all duration-150 hover:scale-[1.02] hover:shadow-md',
              cfg.bg,
              cfg.border,
            )}
          >
            <p className="truncate text-[10px] font-semibold text-foreground">
              {appointment.patient?.name?.split(' ').slice(0, 2).join(' ')}
            </p>
            <p className={cn('text-[9px] font-medium', cfg.text)}>
              {formatTime(appointment.scheduledAt)}
            </p>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px]">
          <p className="font-medium">{appointment.patient?.name}</p>
          <p className="text-xs text-muted-foreground">
            {cfg.label} &middot; {formatTime(appointment.scheduledAt)}
            {appointment.duration ? ` (${appointment.duration}min)` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Dr(a). {appointment.doctor?.name}
          </p>
          {status && (
            <Badge variant="secondary" className={cn('mt-1 text-[9px] text-white', status.color)}>
              {status.label}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded card (Day view)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border-l-[3px] p-3 text-left',
        'transition-all duration-150 hover:scale-[1.01] hover:shadow-lg',
        cfg.bg,
        cfg.border,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-foreground truncate">
            {appointment.patient?.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn('text-[10px] border-0', cfg.bg, cfg.text)}>
              {cfg.label}
            </Badge>
            {status && (
              <Badge variant="secondary" className={cn('text-[10px] text-white', status.color)}>
                {status.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-foreground">
            {formatTime(appointment.scheduledAt)}
          </p>
          {appointment.duration && (
            <p className="text-[10px] text-muted-foreground">{appointment.duration}min</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Stethoscope className="h-3 w-3" />
          Dr(a). {appointment.doctor?.name?.split(' ').slice(0, 2).join(' ')}
        </span>
        {appointment.room && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {appointment.room}
          </span>
        )}
        {appointment.isTelemedicine && (
          <span className="flex items-center gap-1 text-emerald-500">
            <Video className="h-3 w-3" />
            Online
          </span>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Side Panel
// ============================================================================

interface SidePanelProps {
  date: Date;
  appointments: Appointment[];
  onSelectAppt: (id: string) => void;
}

function SidePanel({ date, appointments, onSelectAppt }: SidePanelProps) {
  const sorted = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    [appointments],
  );

  const nextAppt = sorted.find(
    (a) =>
      new Date(a.scheduledAt) > new Date() &&
      (a.status === 'SCHEDULED' || a.status === 'CONFIRMED'),
  );

  return (
    <Card className="border-border bg-card h-fit sticky top-4">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">
          {date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sorted.length} agendamento{sorted.length !== 1 ? 's' : ''}
        </p>
      </div>

      {nextAppt && (
        <div className="p-4 border-b border-border bg-emerald-500/5">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-1.5">
            Proximo
          </p>
          <p className="text-sm font-medium">{nextAppt.patient?.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(nextAppt.scheduledAt)} &middot; Dr(a). {nextAppt.doctor?.name?.split(' ')[0]}
          </p>
        </div>
      )}

      <ScrollArea className="max-h-[420px]">
        <div className="p-2 space-y-1">
          {sorted.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhum agendamento
            </div>
          )}
          {sorted.map((appt) => {
            const cfg = typeConfig[appt.type];
            const status = statusConfig[appt.status];
            return (
              <button
                key={appt.id}
                onClick={() => onSelectAppt(appt.id)}
                className={cn(
                  'w-full rounded-lg p-2.5 text-left transition-colors hover:bg-muted/50',
                  'flex items-center gap-3',
                )}
              >
                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0',
                    cfg.bg,
                  )}
                >
                  {appt.isTelemedicine || appt.type === 'TELEMEDICINE' ? (
                    <Video className={cn('h-4 w-4', cfg.text)} />
                  ) : (
                    <Stethoscope className={cn('h-4 w-4', cfg.text)} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{appt.patient?.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatTime(appt.scheduledAt)}
                    {appt.duration ? ` (${appt.duration}min)` : ''} &middot;{' '}
                    {appt.doctor?.name?.split(' ')[0]}
                  </p>
                </div>
                {status && (
                  <div className={cn('h-2 w-2 rounded-full flex-shrink-0', status.color)} />
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}

// ============================================================================
// Appointment Detail (Dialog content)
// ============================================================================

interface AppointmentDetailProps {
  appointment: Appointment;
}

function AppointmentDetail({ appointment }: AppointmentDetailProps) {
  const cfg = typeConfig[appointment.type];
  const status = statusConfig[appointment.status];
  const StatusIcon = status?.icon ?? Clock;

  return (
    <div className="space-y-5">
      {/* Patient + Type header */}
      <div className="flex items-center gap-3">
        <div className={cn('h-12 w-12 rounded-full flex items-center justify-center', cfg.bg)}>
          {appointment.type === 'TELEMEDICINE' ? (
            <Video className={cn('h-6 w-6', cfg.text)} />
          ) : (
            <Stethoscope className={cn('h-6 w-6', cfg.text)} />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-base truncate">{appointment.patient?.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={cn('text-[10px] border-0', cfg.bg, cfg.text)}>
              {cfg.label}
            </Badge>
            {status && (
              <Badge variant="secondary" className={cn('text-[10px] text-white', status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Details grid */}
      <div className="grid gap-4 grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Data
          </p>
          <p className="text-sm mt-0.5">
            {new Date(appointment.scheduledAt).toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Horario
          </p>
          <p className="text-sm mt-0.5">
            {formatTime(appointment.scheduledAt)}
            {appointment.duration ? ` (${appointment.duration}min)` : ''}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Medico(a)
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[9px] bg-muted">
                {appointment.doctor?.name ? getInitials(appointment.doctor.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm">{appointment.doctor?.name}</p>
          </div>
        </div>
        {appointment.location && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Local
            </p>
            <p className="text-sm mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {appointment.location}
              {appointment.room && ` - ${appointment.room}`}
            </p>
          </div>
        )}
      </div>

      {appointment.notes && (
        <>
          <Separator />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Observacoes
            </p>
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              {appointment.notes}
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex gap-2">
        {appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && (
          <>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white flex-1">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Confirmar
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              Reagendar
            </Button>
            <Button size="sm" variant="outline" className="text-red-500 hover:text-red-400">
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {appointment.encounterId && (
          <Button size="sm" variant="outline" className="flex-1">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Ver Atendimento
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
