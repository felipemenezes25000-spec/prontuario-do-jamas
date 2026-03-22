import { useState, useMemo } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Video,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { useAppointments } from '@/services/appointments.service';
import { useUsers } from '@/services/users.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

import type { AppointmentType } from '@/types';

const typeConfig: Record<AppointmentType, { label: string; color: string; textColor: string }> = {
  FIRST_VISIT: { label: 'Primeira Consulta', color: 'bg-blue-500', textColor: 'text-blue-400' },
  RETURN: { label: 'Retorno', color: 'bg-teal-500', textColor: 'text-teal-600 dark:text-teal-400' },
  FOLLOW_UP: { label: 'Acompanhamento', color: 'bg-cyan-500', textColor: 'text-cyan-400' },
  TELEMEDICINE: { label: 'Teleconsulta', color: 'bg-purple-500', textColor: 'text-purple-400' },
  PROCEDURE: { label: 'Procedimento', color: 'bg-amber-500', textColor: 'text-amber-400' },
  EXAM: { label: 'Exame', color: 'bg-pink-500', textColor: 'text-pink-400' },
  HOME_VISIT: { label: 'Visita Domiciliar', color: 'bg-orange-500', textColor: 'text-orange-400' },
  GROUP_SESSION: { label: 'Sessão em Grupo', color: 'bg-indigo-500', textColor: 'text-indigo-400' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Agendado', color: 'bg-muted-foreground' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-600' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-teal-600' },
  COMPLETED: { label: 'Concluído', color: 'bg-muted-foreground/80' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-800' },
  NO_SHOW: { label: 'Faltou', color: 'bg-red-600' },
};

const hours = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function AppointmentsPage() {
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedAppt, setSelectedAppt] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: appointmentsData, isLoading: apptLoading, isError: apptError, refetch: refetchAppts } = useAppointments();
  const { data: usersData, isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useUsers({ role: 'DOCTOR' });

  const allAppointments = appointmentsData?.data ?? [];
  const doctors = usersData ?? [];

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const today = new Date().toISOString().slice(0, 10);

  const filteredAppointments = useMemo(() => {
    if (selectedDoctor === 'all') return allAppointments;
    return allAppointments.filter((a) => a.doctorId === selectedDoctor);
  }, [selectedDoctor, allAppointments]);

  const apptDetail = selectedAppt ? allAppointments.find((a) => a.id === selectedAppt) : null;

  if (apptLoading || usersLoading) return <PageLoading cards={0} showTable />;
  if (apptError || usersError) return <PageError onRetry={() => { refetchAppts(); refetchUsers(); }} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <div className="flex gap-2">
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-52 bg-card border-border">
              <SelectValue placeholder="Médico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os médicos</SelectItem>
              {doctors.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="bg-teal-600 hover:bg-teal-500">
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium">
          {weekDates[0]!.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} — {weekDates[6]!.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Type legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(typeConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <div className={cn('h-2.5 w-2.5 rounded-full', cfg.color)} />
            <span className="text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header row with days */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-2 text-center text-xs text-muted-foreground" />
              {weekDates.map((date, i) => {
                const dateStr = date.toISOString().slice(0, 10);
                const isToday = dateStr === today;
                return (
                  <div key={i} className={cn('border-l border-border p-2 text-center', isToday && 'bg-teal-500/5')}>
                    <p className="text-[10px] text-muted-foreground">{weekDays[date.getDay()]}</p>
                    <p className={cn('text-sm font-medium', isToday && 'text-teal-600 dark:text-teal-400')}>
                      {date.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time slots */}
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border/50">
                <div className="p-2 text-right text-[10px] text-muted-foreground">{hour}</div>
                {weekDates.map((date, dayIdx) => {
                  const dateStr = date.toISOString().slice(0, 10);
                  const isToday = dateStr === today;
                  const hourAppts = filteredAppointments.filter((a) => {
                    const d = new Date(a.scheduledAt);
                    return d.toISOString().slice(0, 10) === dateStr &&
                      d.getHours().toString().padStart(2, '0') === hour.slice(0, 2);
                  });
                  return (
                    <div key={dayIdx} className={cn('min-h-[52px] border-l border-border/50 p-0.5', isToday && 'bg-teal-500/[0.02]')}>
                      {hourAppts.map((appt) => {
                        const cfg = typeConfig[appt.type];
                        return (
                          <button
                            key={appt.id}
                            onClick={() => setSelectedAppt(appt.id)}
                            className={cn(
                              'mb-0.5 w-full rounded-md border-l-2 px-1.5 py-1 text-left transition-colors hover:opacity-80',
                              `border-l-${cfg.color.replace('bg-', '')}`,
                              'bg-secondary/50',
                            )}
                            style={{ borderLeftColor: cfg.color.replace('bg-', '').includes('teal') ? '#0D9488' : cfg.color.replace('bg-', '').includes('blue') ? '#3b82f6' : cfg.color.replace('bg-', '').includes('purple') ? '#a855f7' : '#f59e0b' }}
                          >
                            <p className="truncate text-[10px] font-medium">{appt.patient?.name}</p>
                            <p className="text-[9px] text-muted-foreground">
                              {new Date(appt.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Appointment Detail Dialog */}
      <Dialog open={!!selectedAppt} onOpenChange={() => setSelectedAppt(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {apptDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', typeConfig[apptDetail.type].color + '/20')}>
                  {apptDetail.type === 'TELEMEDICINE' ? (
                    <Video className={cn('h-5 w-5', typeConfig[apptDetail.type].textColor)} />
                  ) : (
                    <Stethoscope className={cn('h-5 w-5', typeConfig[apptDetail.type].textColor)} />
                  )}
                </div>
                <div>
                  <p className="font-medium">{apptDetail.patient?.name}</p>
                  <p className="text-sm text-muted-foreground">{typeConfig[apptDetail.type].label}</p>
                </div>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm">{new Date(apptDetail.scheduledAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="text-sm">
                    {new Date(apptDetail.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {apptDetail.duration ? ` (${apptDetail.duration}min)` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Médico</p>
                  <p className="text-sm">{apptDetail.doctor?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={cn('text-[10px] text-white', statusLabels[apptDetail.status]?.color)}>
                    {statusLabels[apptDetail.status]?.label}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
