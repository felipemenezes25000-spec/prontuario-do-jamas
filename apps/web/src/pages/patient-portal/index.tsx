import { useState } from 'react';
import {
  Heart,
  Stethoscope,
  TestTube,
  Pill,
  Calendar,
  Activity,
  FileText,
  Plus,
  Clock,
  Download,
  Search,
  User,
  BookHeart,
  Globe,
  MessageSquare,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Send,
  Droplets,
  Thermometer,
  Weight,
  Smile,
  Paperclip,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { encounterStatusLabels, encounterTypeLabels } from '@/lib/constants';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  usePortalEncounters,
  usePortalResults,
  usePortalPrescriptions,
  usePortalAppointments,
  usePortalDocuments,
  useRequestAppointment,
  type PortalExamResult,
  type PortalAppointment,
  type PortalDocument,
} from '@/services/patient-portal.service';
import { useSearchPatients } from '@/services/patients.service';
import {
  useDiaryEntries,
  useDiaryTrend,
  useAddDiaryEntry,
  useDeleteDiaryEntry,
} from '@/services/portal-health-diary.service';
import {
  useConversations,
  useSendMessage,
  useCareTeam,
  useUnreadCount,
  type Conversation,
} from '@/services/portal-messaging.service';
import {
  usePendingPayments,
  usePaymentHistory,
  usePaymentBalance,
  useProcessPayment,
  useDownloadReceipt,
  type PendingPayment,
  type PaymentRecord,
  type PaymentMethod,
} from '@/services/portal-payments.service';
import type { Encounter, Patient, Prescription, EncounterStatus } from '@/types';
import { toast } from 'sonner';

// ============================================================================
// i18n Language Selector (stub for future i18n)
// ============================================================================

type SupportedLocale = 'pt-BR' | 'en' | 'es';

const localeLabels: Record<SupportedLocale, { flag: string; label: string }> = {
  'pt-BR': { flag: 'BR', label: 'Portugues (BR)' },
  en: { flag: 'US', label: 'English' },
  es: { flag: 'ES', label: 'Espanol' },
};

function LanguageSelector() {
  const [locale, setLocale] = useState<SupportedLocale>('pt-BR');
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="border-border bg-card text-foreground gap-2"
        onClick={() => setOpen((o) => !o)}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{localeLabels[locale].flag} {localeLabels[locale].label}</span>
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-card shadow-lg">
          {(Object.entries(localeLabels) as Array<[SupportedLocale, { flag: string; label: string }]>).map(
            ([key, { flag, label }]) => (
              <button
                key={key}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent/50',
                  locale === key ? 'bg-emerald-500/10 text-emerald-400' : 'text-foreground',
                )}
                onClick={() => {
                  setLocale(key);
                  setOpen(false);
                  toast.info(`Idioma alterado para ${label} (stub)`);
                }}
              >
                <span>{flag}</span>
                <span>{label}</span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Label helpers
// ============================================================================

const examStatusLabels: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: 'Solicitado', color: 'bg-blue-600' },
  SCHEDULED: { label: 'Agendado', color: 'bg-yellow-600' },
  COLLECTED: { label: 'Coletado', color: 'bg-indigo-600' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-orange-600' },
  COMPLETED: { label: 'Concluido', color: 'bg-emerald-600' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-600' },
  REVIEWED: { label: 'Revisado', color: 'bg-teal-600' },
};

const examTypeLabels: Record<string, string> = {
  LABORATORY: 'Laboratorio',
  IMAGING: 'Imagem',
  FUNCTIONAL: 'Funcional',
  PATHOLOGY: 'Patologia',
  GENETIC: 'Genetico',
  MICROBIOLOGICAL: 'Microbiologico',
  OTHER: 'Outro',
};

const prescriptionStatusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-zinc-600' },
  ACTIVE: { label: 'Ativa', color: 'bg-emerald-600' },
  COMPLETED: { label: 'Concluida', color: 'bg-blue-600' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-600' },
  SUSPENDED: { label: 'Suspensa', color: 'bg-yellow-600' },
  EXPIRED: { label: 'Expirada', color: 'bg-zinc-500' },
};

const appointmentStatusLabels: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Agendado', color: 'bg-blue-600' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-emerald-600' },
  WAITING: { label: 'Aguardando', color: 'bg-yellow-600' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-orange-600' },
  COMPLETED: { label: 'Realizado', color: 'bg-teal-600' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-600' },
  NO_SHOW: { label: 'Faltou', color: 'bg-zinc-600' },
  RESCHEDULED: { label: 'Reagendado', color: 'bg-indigo-600' },
};

const documentTypeLabels: Record<string, string> = {
  ATESTADO: 'Atestado',
  RECEITA: 'Receita',
  ENCAMINHAMENTO: 'Encaminhamento',
  LAUDO: 'Laudo',
  DECLARACAO: 'Declaracao',
  CONSENTIMENTO: 'Consentimento',
  TERMO_RESPONSABILIDADE: 'Termo',
  RELATORIO: 'Relatorio',
  PRONTUARIO_RESUMO: 'Resumo',
  FICHA_INTERNACAO: 'Ficha Internacao',
  SUMARIO_ALTA: 'Sumario de Alta',
  BOLETIM_OCORRENCIA: 'B.O.',
  CERTIDAO_OBITO: 'Certidao de Obito',
  CUSTOM: 'Outro',
};

const documentStatusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-zinc-600' },
  FINAL: { label: 'Final', color: 'bg-blue-600' },
  SIGNED: { label: 'Assinado', color: 'bg-emerald-600' },
  VOIDED: { label: 'Anulado', color: 'bg-red-600' },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ============================================================================
// Empty state
// ============================================================================

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Agendamento (Calendar-like view with available slots)
// ============================================================================

function AppointmentsTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalAppointments(patientId ? { patientId } : undefined);
  const requestMutation = useRequestAppointment(patientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    preferredDate: '',
    specialty: '',
    reason: '',
  });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const appointments = data?.data ?? [];

  const handleSubmit = () => {
    requestMutation.mutate(
      {
        preferredDate: formData.preferredDate || undefined,
        specialty: formData.specialty || undefined,
        reason: formData.reason || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Solicitacao de agendamento enviada com sucesso!');
          setDialogOpen(false);
          setFormData({ preferredDate: '', specialty: '', reason: '' });
        },
      },
    );
  };

  // Calendar logic
  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
  const monthName = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Map appointments to dates
  const appointmentsByDay = new Map<number, typeof appointments>();
  for (const appt of appointments) {
    if (!appt.scheduledAt) continue;
    const d = new Date(appt.scheduledAt);
    if (d.getFullYear() === calendarMonth.year && d.getMonth() === calendarMonth.month) {
      const day = d.getDate();
      if (!appointmentsByDay.has(day)) appointmentsByDay.set(day, []);
      appointmentsByDay.get(day)?.push(appt);
    }
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === calendarMonth.year && today.getMonth() === calendarMonth.month;

  // Mock available slots for selected day
  const mockSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'];
  const selectedDayAppointments = selectedDay ? (appointmentsByDay.get(selectedDay) ?? []) : [];

  // Stats
  const upcomingCount = appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelledCount = appointments.filter((a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length;
  const nextAppt = appointments.find((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED');

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proximos</p>
              <p className="text-lg font-bold">{upcomingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Realizados</p>
              <p className="text-lg font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cancelados</p>
              <p className="text-lg font-bold">{cancelledCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proximo</p>
              <p className="text-sm font-medium truncate">
                {nextAppt ? formatDateTime(nextAppt.scheduledAt) : 'Nenhum'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm capitalize">{monthName}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCalendarMonth((prev) => {
                    const d = new Date(prev.year, prev.month - 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCalendarMonth((prev) => {
                    const d = new Date(prev.year, prev.month + 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-2">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayAppointments = appointmentsByDay.get(day) ?? [];
                const isToday = isCurrentMonth && today.getDate() === day;
                const isSelected = selectedDay === day;
                const hasAppointments = dayAppointments.length > 0;
                return (
                  <button
                    key={day}
                    className={cn(
                      'h-16 rounded-lg border border-transparent p-1 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800/50 relative',
                      isToday && 'border-emerald-500/30 bg-emerald-500/5',
                      isSelected && 'border-emerald-500 bg-emerald-500/10',
                    )}
                    onClick={() => setSelectedDay(day)}
                  >
                    <span className={cn(
                      'text-xs font-medium',
                      isToday && 'text-emerald-400',
                    )}>
                      {day}
                    </span>
                    {hasAppointments && (
                      <div className="mt-0.5 space-y-0.5">
                        {dayAppointments.slice(0, 2).map((a, idx) => {
                          const statusInfo = appointmentStatusLabels[a.status];
                          return (
                            <div
                              key={idx}
                              className={cn(
                                'rounded px-1 py-0.5 text-[8px] text-white truncate',
                                statusInfo?.color ?? 'bg-zinc-600',
                              )}
                            >
                              {formatTime(a.scheduledAt)}
                            </div>
                          );
                        })}
                        {dayAppointments.length > 2 && (
                          <span className="text-[8px] text-muted-foreground">
                            +{dayAppointments.length - 2} mais
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Side panel: selected day details or new appointment */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedDay
                  ? `${selectedDay}/${calendarMonth.month + 1}/${calendarMonth.year}`
                  : 'Selecione um dia'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDay ? (
                <div className="space-y-3">
                  {selectedDayAppointments.length > 0 ? (
                    selectedDayAppointments.map((appt: PortalAppointment) => {
                      const statusInfo = appointmentStatusLabels[appt.status];
                      return (
                        <div key={appt.id} className="rounded-lg border border-border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{formatTime(appt.scheduledAt)}</span>
                            <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                              {statusInfo?.label ?? appt.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{appt.type}</p>
                          {appt.doctor?.name && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" /> Dr(a). {appt.doctor.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {appt.duration}min
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground mb-3">Nenhum agendamento neste dia</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
                        Horarios disponiveis
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {mockSlots.map((slot) => (
                          <button
                            key={slot}
                            className="rounded-md border border-border bg-zinc-800/50 px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                            onClick={() => {
                              const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}T${slot}`;
                              setFormData((prev) => ({ ...prev, preferredDate: dateStr }));
                              setDialogOpen(true);
                            }}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Clique em um dia no calendario para ver detalhes ou agendar
                </p>
              )}
            </CardContent>
          </Card>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500">
                <Plus className="mr-2 h-4 w-4" />
                Solicitar Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Agendamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate">Data desejada</Label>
                  <Input
                    id="preferredDate"
                    type="datetime-local"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preferredDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Select value={formData.specialty} onValueChange={(v) => setFormData((prev) => ({ ...prev, specialty: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a especialidade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {['Cardiologia', 'Dermatologia', 'Endocrinologia', 'Gastroenterologia', 'Ginecologia', 'Neurologia', 'Oftalmologia', 'Ortopedia', 'Pediatria', 'Psiquiatria', 'Urologia', 'Clinica Geral'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo da consulta</Label>
                  <Textarea
                    id="reason"
                    placeholder="Descreva brevemente o motivo..."
                    value={formData.reason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={handleSubmit} disabled={requestMutation.isPending}>
                  {requestMutation.isPending ? 'Enviando...' : 'Solicitar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Upcoming appointments list */}
      {appointments.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Todos os Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {appointments.map((appt: PortalAppointment) => {
                const statusInfo = appointmentStatusLabels[appt.status];
                return (
                  <div key={appt.id} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                        <Calendar className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDateTime(appt.scheduledAt)}</p>
                        <p className="text-xs text-muted-foreground">{appt.type}{appt.doctor?.name ? ` - Dr(a). ${appt.doctor.name}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{appt.duration}min</Badge>
                      <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                        {statusInfo?.label ?? appt.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Tab: Resultados de Exames (with trend charts + reference ranges)
// ============================================================================

function ResultsTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalResults(patientId ? { patientId } : undefined);
  const [selectedExam, setSelectedExam] = useState<PortalExamResult | null>(null);
  const [filterType, setFilterType] = useState('ALL');

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const results = data?.data ?? [];
  const filteredResults = filterType === 'ALL' ? results : results.filter((r) => r.examType === filterType);

  if (results.length === 0) {
    return <EmptyState icon={TestTube} message="Nenhum resultado de exame encontrado" />;
  }

  // Mock trend data for selected exam
  const trendData = selectedExam
    ? Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const baseValue = 85 + Math.random() * 30;
        return {
          date: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          value: Math.round(baseValue * 10) / 10,
        };
      })
    : [];

  // Stats
  const completedCount = results.filter((r) => r.status === 'COMPLETED' || r.status === 'REVIEWED').length;
  const pendingCount = results.filter((r) => r.status === 'REQUESTED' || r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS').length;
  const abnormalCount = Math.floor(completedCount * 0.15);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponiveis</p>
              <p className="text-lg font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-lg font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fora da Faixa</p>
              <p className="text-lg font-bold">{abnormalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <TestTube className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Exames</p>
              <p className="text-lg font-bold">{results.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Trend Chart Area */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo de exame" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                {Object.entries(examTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Results list */}
          <div className="space-y-2">
            {filteredResults.map((exam: PortalExamResult) => {
              const statusInfo = examStatusLabels[exam.status];
              const isCompleted = exam.status === 'COMPLETED' || exam.status === 'REVIEWED';
              return (
                <Card
                  key={exam.id}
                  className={cn(
                    'border-border bg-card transition-all cursor-pointer hover:border-zinc-700',
                    selectedExam?.id === exam.id && 'border-emerald-500/50 bg-emerald-500/5',
                  )}
                  onClick={() => setSelectedExam(exam)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          isCompleted ? 'bg-emerald-500/10' : 'bg-blue-500/10',
                        )}>
                          <TestTube className={cn('h-5 w-5', isCompleted ? 'text-emerald-400' : 'text-blue-400')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{exam.examName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="bg-secondary text-[10px] text-foreground">
                              {examTypeLabels[exam.examType] ?? exam.examType}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{formatDate(exam.requestedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                          {statusInfo?.label ?? exam.status}
                        </Badge>
                        {isCompleted && (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-400 px-2">
                            <Download className="h-3 w-3 mr-1" />
                            PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Trend chart panel */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selectedExam ? `Tendencia: ${selectedExam.examName}` : 'Selecione um exame'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedExam ? (
              <div className="space-y-4">
                {/* Mock result summary */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ultimo resultado</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatDate(selectedExam.completedAt)}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {(85 + Math.random() * 30).toFixed(1)}
                  </p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Faixa referencia</span>
                    <span className="text-emerald-400">70 - 110</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 relative">
                    <div className="absolute left-[25%] right-[25%] top-0 h-full bg-emerald-500/20 rounded-full" />
                    <div
                      className="absolute h-3 w-1 bg-emerald-400 rounded-full top-1/2 -translate-y-1/2"
                      style={{ left: `${40 + Math.random() * 20}%` }}
                    />
                  </div>
                </div>

                {/* Trend chart */}
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '0.7rem',
                      }}
                    />
                    <ReferenceLine y={110} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#trendGradient)" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>

                <p className="text-[10px] text-muted-foreground text-center">
                  Linhas vermelhas indicam limites da faixa de referencia
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Clique em um exame para visualizar a tendencia
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Tab: Mensageria (Chat-like with bubbles)
// ============================================================================

function MessagingTab() {
  const { data: conversations, isLoading } = useConversations();
  const { data: careTeam } = useCareTeam();
  const { data: unreadCount } = useUnreadCount();
  const sendMessage = useSendMessage();

  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const convList: Conversation[] = Array.isArray(conversations) ? conversations : [];
  const teamList: { id: string; name: string; role: string; specialty: string | null; avatarUrl: string | null }[] =
    Array.isArray(careTeam) ? careTeam : [];

  function handleSend() {
    if (!recipientId || !content) return;
    sendMessage.mutate(
      { recipientId, subject: subject || undefined, content },
      {
        onSuccess: () => {
          toast.success('Mensagem enviada com sucesso!');
          setDialogOpen(false);
          setRecipientId('');
          setSubject('');
          setContent('');
        },
        onError: () => toast.error('Erro ao enviar mensagem'),
      },
    );
  }

  function handleReply() {
    if (!content || !activeConversation) return;
    sendMessage.mutate(
      { recipientId: activeConversation.id, content, subject: activeConversation.subject },
      {
        onSuccess: () => {
          toast.success('Resposta enviada!');
          setContent('');
        },
        onError: () => toast.error('Erro ao enviar resposta'),
      },
    );
  }

  if (isLoading) return <PageLoading cards={0} showTable />;

  // Mock messages for the active conversation
  const mockMessages = activeConversation
    ? [
        { id: '1', sender: 'doctor', name: activeConversation.participantName, content: 'Bom dia! Vi seus resultados de exames e esta tudo dentro da normalidade.', time: '09:30', date: 'Ontem' },
        { id: '2', sender: 'patient', name: 'Voce', content: 'Obrigado doutor! E sobre a medicacao, devo continuar?', time: '10:15', date: 'Ontem' },
        { id: '3', sender: 'doctor', name: activeConversation.participantName, content: 'Sim, mantenha a medicacao por mais 30 dias. Na proxima consulta reavaliamos.', time: '10:22', date: 'Ontem' },
        { id: '4', sender: 'patient', name: 'Voce', content: 'Entendido. Muito obrigado!', time: '10:25', date: 'Ontem' },
        { id: '5', sender: 'doctor', name: activeConversation.participantName, content: 'Qualquer duvida estou a disposicao. Cuide-se!', time: '10:30', date: 'Ontem' },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Header with unread count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-400" />
          <p className="text-sm font-medium">Mensagens</p>
          {(unreadCount ?? 0) > 0 && (
            <Badge className="bg-emerald-600 text-white text-xs">{unreadCount} nao lida{(unreadCount ?? 0) > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Mensagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>Destinatario</Label>
                {teamList.length > 0 ? (
                  <Select value={recipientId} onValueChange={setRecipientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamList.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} - {m.role}{m.specialty ? ` (${m.specialty})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="ID do destinatario"
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label>Assunto (opcional)</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto..." />
              </div>
              <div className="space-y-1">
                <Label>Mensagem</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escreva sua mensagem..." rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500"
                disabled={!recipientId || !content || sendMessage.isPending}
                onClick={handleSend}
              >
                {sendMessage.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Care team cards */}
      {teamList.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {teamList.map((member) => (
            <button
              key={member.id}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 min-w-[90px] transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
              onClick={() => {
                setRecipientId(member.id);
                setSubject('');
                setDialogOpen(true);
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <User className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-[10px] font-medium text-center truncate w-full">{member.name.split(' ')[0]}</p>
              <p className="text-[8px] text-muted-foreground truncate w-full text-center">{member.role}</p>
            </button>
          ))}
        </div>
      )}

      {/* Two-panel: conversation list + chat */}
      <div className="grid lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Conversation list */}
        <Card className="border-border bg-card lg:col-span-1 overflow-hidden">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Conversas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {convList.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Nenhuma conversa</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {convList.map((c) => (
                  <button
                    key={c.id}
                    className={cn(
                      'w-full text-left p-3 transition-colors hover:bg-accent/30',
                      activeConversation?.id === c.id && 'bg-emerald-500/10 border-l-2 border-l-emerald-500',
                    )}
                    onClick={() => setActiveConversation(c)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 mt-0.5">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium truncate">{c.participantName}</p>
                          <span className="text-[9px] text-muted-foreground shrink-0">{formatDate(c.lastMessageAt)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{c.participantRole}</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                      </div>
                      {c.unreadCount > 0 && (
                        <Badge className="bg-emerald-600 text-white text-[9px] h-4 min-w-[16px] shrink-0">
                          {c.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="border-border bg-card lg:col-span-2 flex flex-col overflow-hidden">
          {activeConversation ? (
            <>
              {/* Chat header */}
              <div className="border-b border-border px-4 py-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
                  <User className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{activeConversation.participantName}</p>
                  <p className="text-[10px] text-muted-foreground">{activeConversation.participantRole} - {activeConversation.subject}</p>
                </div>
                <Badge variant={activeConversation.status === 'OPEN' ? 'default' : 'secondary'} className="text-[10px] ml-auto">
                  {activeConversation.status === 'OPEN' ? 'Aberta' : 'Fechada'}
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {mockMessages.map((msg) => (
                  <div key={msg.id} className={cn('flex', msg.sender === 'patient' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5',
                      msg.sender === 'patient'
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-zinc-800 text-foreground rounded-bl-md',
                    )}>
                      <p className="text-xs font-medium mb-0.5 opacity-70">{msg.name}</p>
                      <p className="text-sm">{msg.content}</p>
                      <p className={cn(
                        'text-[9px] mt-1 text-right',
                        msg.sender === 'patient' ? 'text-emerald-200' : 'text-muted-foreground',
                      )}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply input */}
              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Textarea
                    className="min-h-[36px] max-h-[100px] resize-none text-sm"
                    placeholder="Digite sua mensagem..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={1}
                  />
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-500 h-9 w-9 shrink-0 p-0"
                    disabled={!content || sendMessage.isPending}
                    onClick={handleReply}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-3">Selecione uma conversa</p>
              <p className="text-xs text-muted-foreground mt-1">ou inicie uma nova mensagem</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Tab: Pagamentos (Payment history with outstanding balance)
// ============================================================================

function PaymentsTab() {
  const { data: balance } = usePaymentBalance();
  const { data: pending, isLoading: loadingPending } = usePendingPayments();
  const { data: history, isLoading: loadingHistory } = usePaymentHistory();
  const processPayment = useProcessPayment();
  const downloadReceipt = useDownloadReceipt();

  const [paymentId, setPaymentId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);

  const pendingList: PendingPayment[] = Array.isArray(pending) ? pending : [];
  const historyList: PaymentRecord[] = Array.isArray(history) ? history : [];

  const paymentStatusConfig: Record<string, { label: string; color: string; textColor: string }> = {
    PENDING: { label: 'Pendente', color: 'bg-yellow-600', textColor: 'text-yellow-400' },
    PROCESSING: { label: 'Processando', color: 'bg-blue-600', textColor: 'text-blue-400' },
    PAID: { label: 'Pago', color: 'bg-emerald-600', textColor: 'text-emerald-400' },
    OVERDUE: { label: 'Vencido', color: 'bg-red-600', textColor: 'text-red-400' },
    CANCELLED: { label: 'Cancelado', color: 'bg-zinc-600', textColor: 'text-zinc-400' },
    REFUNDED: { label: 'Estornado', color: 'bg-indigo-600', textColor: 'text-indigo-400' },
  };

  function handlePay() {
    if (!paymentId) return;
    processPayment.mutate(
      { paymentId, method },
      {
        onSuccess: () => {
          toast.success('Pagamento processado com sucesso!');
          setDialogOpen(false);
          setSelectedPayment(null);
          setPaymentId('');
        },
        onError: () => toast.error('Erro ao processar pagamento'),
      },
    );
  }

  function openPayDialog(p: PendingPayment) {
    setSelectedPayment(p);
    setPaymentId(p.id);
    setDialogOpen(true);
  }

  if (loadingPending || loadingHistory) return <PageLoading cards={3} showTable />;

  // Monthly spending mock for chart
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: d.toLocaleDateString('pt-BR', { month: 'short' }),
      value: 200 + Math.random() * 800,
    };
  });

  return (
    <div className="space-y-6">
      {/* Balance overview */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card border-l-4 border-l-yellow-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Em Aberto</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">{formatCurrency(balance.totalPending)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card border-l-4 border-l-red-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Vencido</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(balance.totalOverdue)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card border-l-4 border-l-emerald-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pago</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(balance.totalPaid)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Spending trend */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Gastos nos Ultimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `R$${v.toFixed(0)}`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.7rem',
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#spendGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pending payments */}
      {pendingList.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-yellow-400" />
            Cobrancas Pendentes ({pendingList.length})
          </p>
          <div className="space-y-2">
            {pendingList.map((p) => {
              const cfg = paymentStatusConfig[p.status];
              const isOverdue = p.status === 'OVERDUE';
              return (
                <Card key={p.id} className={cn('border-border bg-card', isOverdue && 'border-red-500/30')}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          isOverdue ? 'bg-red-500/10' : 'bg-yellow-500/10',
                        )}>
                          <CreditCard className={cn('h-5 w-5', isOverdue ? 'text-red-400' : 'text-yellow-400')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{p.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>Vencimento: {formatDate(p.dueDate)}</span>
                            {p.doctorName && <span>- Dr(a). {p.doctorName}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={cn('text-lg font-bold', cfg?.textColor)}>{formatCurrency(p.amount)}</p>
                          <Badge variant="secondary" className={cn('text-[10px] text-white', cfg?.color)}>
                            {cfg?.label ?? p.status}
                          </Badge>
                        </div>
                        {(p.status === 'PENDING' || p.status === 'OVERDUE') && (
                          <Button className="bg-emerald-600 hover:bg-emerald-500 h-9" onClick={() => openPayDialog(p)}>
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment history */}
      {historyList.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Historico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historyList.map((r: PaymentRecord) => {
                const cfg = paymentStatusConfig[r.status];
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.description}</p>
                        <p className="text-xs text-muted-foreground">{r.method} - {formatDate(r.paidAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(r.amount)}</p>
                        <Badge variant="secondary" className={cn('text-[10px] text-white', cfg?.color)}>
                          {cfg?.label ?? r.status}
                        </Badge>
                      </div>
                      {(r.receiptUrl || r.status === 'PAID') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Baixar recibo"
                          disabled={downloadReceipt.isPending}
                          onClick={() => downloadReceipt.mutate(r.id, { onError: () => toast.error('Erro ao baixar recibo') })}
                        >
                          <Download className="h-4 w-4 text-emerald-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingList.length === 0 && historyList.length === 0 && (
        <EmptyState icon={CreditCard} message="Nenhum pagamento encontrado" />
      )}

      {/* Pay dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Realizar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">{selectedPayment.description}</p>
                <p className="text-3xl font-bold text-emerald-400 mt-2">{formatCurrency(selectedPayment.amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">Vencimento: {formatDate(selectedPayment.dueDate)}</p>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'PIX' as PaymentMethod, label: 'PIX', desc: 'Instantaneo' },
                    { value: 'CREDIT_CARD' as PaymentMethod, label: 'Credito', desc: 'Ate 12x' },
                    { value: 'DEBIT_CARD' as PaymentMethod, label: 'Debito', desc: 'A vista' },
                    { value: 'BOLETO' as PaymentMethod, label: 'Boleto', desc: '3 dias uteis' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-colors',
                        method === opt.value
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-border bg-card hover:border-zinc-600',
                      )}
                      onClick={() => setMethod(opt.value)}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={processPayment.isPending}
              onClick={handlePay}
            >
              {processPayment.isPending ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Tab: Diario de Saude (with recharts tracking)
// ============================================================================

function HealthDiaryTab() {
  const { data: entries, isLoading } = useDiaryEntries({ page: 1 });
  const { data: bpTrend } = useDiaryTrend('BP', 'systolicBP');
  const { data: glucoseTrend } = useDiaryTrend('GLUCOSE', 'glucoseLevel');
  const addEntry = useAddDiaryEntry();
  const deleteEntry = useDeleteDiaryEntry();

  const [showForm, setShowForm] = useState(false);
  const [entryType, setEntryType] = useState('BP');
  const [entryValue, setEntryValue] = useState('');
  const [activeChart, setActiveChart] = useState<'BP' | 'GLUCOSE'>('BP');

  async function handleAdd() {
    if (!entryValue) return;
    try {
      await addEntry.mutateAsync({ entryType, notes: entryValue });
      toast.success('Entrada adicionada ao diario.');
      setEntryValue('');
      setShowForm(false);
    } catch {
      toast.error('Erro ao salvar entrada.');
    }
  }

  if (isLoading) return <PageLoading cards={4} showTable />;

  const items = entries?.data ?? [];

  // Build chart data from trends
  const bpChartData = bpTrend?.trend?.slice(0, 14).reverse().map((point) => ({
    date: formatDate(point.date),
    systolic: typeof point.value === 'number' ? point.value : 120 + Math.random() * 20,
    diastolic: typeof point.value === 'number' ? point.value * 0.65 : 75 + Math.random() * 15,
  })) ?? Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      systolic: 115 + Math.random() * 25,
      diastolic: 70 + Math.random() * 15,
    };
  });

  const glucoseChartData = glucoseTrend?.trend?.slice(0, 14).reverse().map((point) => ({
    date: formatDate(point.date),
    glucose: typeof point.value === 'number' ? point.value : 90 + Math.random() * 40,
  })) ?? Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      glucose: 85 + Math.random() * 45,
    };
  });

  const entryTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    BP: { label: 'Pressao Arterial', icon: Heart, color: 'text-red-400' },
    GLUCOSE: { label: 'Glicemia', icon: Droplets, color: 'text-blue-400' },
    WEIGHT: { label: 'Peso', icon: Weight, color: 'text-purple-400' },
    TEMPERATURE: { label: 'Temperatura', icon: Thermometer, color: 'text-amber-400' },
    PAIN: { label: 'Dor', icon: AlertCircle, color: 'text-red-400' },
    MOOD: { label: 'Humor', icon: Smile, color: 'text-yellow-400' },
    SYMPTOMS: { label: 'Sintomas', icon: Activity, color: 'text-orange-400' },
    EXERCISE: { label: 'Exercicio', icon: TrendingUp, color: 'text-emerald-400' },
  };

  // Stats for today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntries = items.filter((e) => e.date?.startsWith(todayStr));

  return (
    <div className="space-y-6">
      {/* Quick-add entry types */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookHeart className="h-5 w-5 text-emerald-400" />
          <p className="text-sm font-medium">Diario de Saude</p>
          <Badge variant="secondary" className="text-[10px]">{todayEntries.length} registro{todayEntries.length !== 1 ? 's' : ''} hoje</Badge>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Entrada
        </Button>
      </div>

      {/* Quick entry type buttons */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {Object.entries(entryTypeConfig).map(([key, cfg]) => (
          <button
            key={key}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5',
              entryType === key && showForm && 'border-emerald-500 bg-emerald-500/10',
            )}
            onClick={() => {
              setEntryType(key);
              setShowForm(true);
            }}
          >
            <cfg.icon className={cn('h-5 w-5', cfg.color)} />
            <p className="text-[9px] text-muted-foreground text-center">{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Entry form */}
      {showForm && (
        <Card className="border-border bg-card border-l-4 border-l-emerald-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-muted-foreground text-xs">
                  {entryTypeConfig[entryType]?.label ?? entryType}
                </Label>
                <Input
                  className="bg-zinc-900 border-border mt-1"
                  value={entryValue}
                  onChange={(e) => setEntryValue(e.target.value)}
                  placeholder={entryType === 'BP' ? 'Ex: 120/80' : entryType === 'GLUCOSE' ? 'Ex: 95 mg/dL' : entryType === 'WEIGHT' ? 'Ex: 72.5 kg' : 'Valor...'}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd} disabled={addEntry.isPending}>
                {addEntry.isPending ? 'Salvando...' : 'Registrar'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend charts */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={activeChart === 'BP' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveChart('BP')}
            className={activeChart === 'BP' ? 'bg-emerald-600' : ''}
          >
            <Heart className="h-3.5 w-3.5 mr-1.5" />
            Pressao Arterial
          </Button>
          <Button
            variant={activeChart === 'GLUCOSE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveChart('GLUCOSE')}
            className={activeChart === 'GLUCOSE' ? 'bg-emerald-600' : ''}
          >
            <Droplets className="h-3.5 w-3.5 mr-1.5" />
            Glicemia
          </Button>
        </div>

        {activeChart === 'BP' && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Pressao Arterial - Ultimos 14 dias</CardTitle>
                <div className="flex gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Sistolica</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Diastolica</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={bpChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" domain={[50, 180]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.7rem',
                    }}
                  />
                  <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Hipertensao', fontSize: 9, fill: '#ef4444' }} />
                  <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Sistolica" />
                  <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="Diastolica" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {activeChart === 'GLUCOSE' && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Glicemia - Ultimos 14 dias</CardTitle>
                <span className="text-[10px] text-muted-foreground">Referencia: 70 - 100 mg/dL</span>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={glucoseChartData}>
                  <defs>
                    <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" domain={[50, 200]} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(0)} mg/dL`, 'Glicemia']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.7rem',
                    }}
                  />
                  <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="glucose" stroke="#8b5cf6" fill="url(#glucoseGrad)" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent entries table */}
      {items.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Entradas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((entry) => {
                const cfg = entryTypeConfig[entry.entryType];
                const IconComponent = cfg?.icon ?? Activity;
                return (
                  <div key={entry.entryId} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                        <IconComponent className={cn('h-4 w-4', cfg?.color ?? 'text-muted-foreground')} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{cfg?.label ?? entry.entryType}</p>
                          <Badge variant="secondary" className="text-[10px]">{formatDate(entry.date)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.notes ?? JSON.stringify(entry.data)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 h-7 text-xs"
                      onClick={() => deleteEntry.mutate(entry.entryId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && !showForm && (
        <EmptyState icon={BookHeart} message="Comece registrando sua pressao arterial ou glicemia" />
      )}
    </div>
  );
}

// ============================================================================
// Tab: Meus Atendimentos
// ============================================================================

function EncountersTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalEncounters(patientId ? { patientId } : undefined);

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const encounters = data?.data ?? [];

  if (encounters.length === 0) {
    return <EmptyState icon={Stethoscope} message="Nenhum atendimento encontrado" />;
  }

  return (
    <div className="space-y-2">
      {encounters.map((enc: Encounter) => {
        const statusInfo = encounterStatusLabels[enc.status as EncounterStatus];
        return (
          <Card key={enc.id} className="border-border bg-card transition-colors hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                    <Stethoscope className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{formatDate(enc.createdAt)}</p>
                      <Badge variant="secondary" className="bg-secondary text-[10px] text-foreground">
                        {encounterTypeLabels[enc.type] ?? enc.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {enc.primaryDoctor?.name && <span>Dr(a). {enc.primaryDoctor.name}</span>}
                      {enc.chiefComplaint && <span className="truncate">- {enc.chiefComplaint}</span>}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className={cn('text-[10px] text-white shrink-0', statusInfo?.color)}>
                  {statusInfo?.label ?? enc.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// Tab: Prescricoes
// ============================================================================

function PrescriptionsTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalPrescriptions(patientId ? { patientId } : undefined);

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const prescriptions = data?.data ?? [];

  if (prescriptions.length === 0) {
    return <EmptyState icon={Pill} message="Nenhuma prescricao encontrada" />;
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((rx: Prescription) => {
        const statusInfo = prescriptionStatusLabels[rx.status];
        return (
          <Card key={rx.id} className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Prescricao de {formatDate(rx.createdAt)}
                </CardTitle>
                <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                  {statusInfo?.label ?? rx.status}
                </Badge>
              </div>
              {(rx as unknown as { doctor?: { name: string } }).doctor && (
                <p className="text-xs text-muted-foreground">
                  Dr(a). {(rx as unknown as { doctor: { name: string } }).doctor.name}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {rx.items && rx.items.length > 0 ? (
                <ul className="space-y-2">
                  {rx.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <Pill className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <div>
                        <span className="font-medium">{item.medicationName}</span>
                        <span className="text-muted-foreground">
                          {' '}{item.dose} &mdash; {item.route} &mdash; {item.frequency}
                          {item.duration ? ` (${item.duration})` : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sem itens nesta prescricao</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// Tab: Documentos
// ============================================================================

function DocumentsTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalDocuments(patientId ? { patientId } : undefined);

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const documents = data?.data ?? [];

  if (documents.length === 0) {
    return <EmptyState icon={FileText} message="Nenhum documento clinico encontrado" />;
  }

  return (
    <div className="space-y-2">
      {documents.map((doc: PortalDocument) => {
        const statusInfo = documentStatusLabels[doc.status];
        return (
          <Card key={doc.id} className="border-border bg-card transition-colors hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="bg-secondary text-[10px] text-foreground">
                        {documentTypeLabels[doc.type] ?? doc.type}
                      </Badge>
                      <span>{formatDate(doc.createdAt)}</span>
                      {doc.author?.name && <span>- {doc.author.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                    {statusInfo?.label ?? doc.status}
                  </Badge>
                  {(doc.status === 'SIGNED' || doc.status === 'FINAL') && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar documento">
                      <Download className="h-4 w-4 text-emerald-500" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// Patient Search Selector
// ============================================================================

function PatientSelector({
  selectedPatient,
  onSelect,
}: {
  selectedPatient: { id: string; name: string } | null;
  onSelect: (patient: { id: string; name: string } | null) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: searchResults, isLoading } = useSearchPatients(searchTerm);

  const patients = searchResults?.data ?? [];

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1 relative">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Selecione o paciente para visualizar o portal
            </Label>
            {selectedPatient ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  {selectedPatient.name}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    onSelect(null);
                    setSearchTerm('');
                  }}
                >
                  Trocar paciente
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou prontuario..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                  }}
                  onFocus={() => setIsOpen(true)}
                  className="pl-9"
                />
                {isOpen && searchTerm.length >= 2 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">Buscando...</div>
                    ) : patients.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">Nenhum paciente encontrado</div>
                    ) : (
                      patients.map((p: Patient) => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center gap-2"
                          onClick={() => {
                            onSelect({ id: p.id, name: p.fullName || p.name || 'Paciente' });
                            setSearchTerm('');
                            setIsOpen(false);
                          }}
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">{p.fullName || p.name}</span>
                          {p.cpf && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              CPF: {p.cpf}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Portal Page
// ============================================================================

export default function PatientPortalPage() {
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const patientId = selectedPatient?.id;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
            <Heart className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portal do Paciente</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie consultas, exames, mensagens e pagamentos
            </p>
          </div>
        </div>
        <LanguageSelector />
      </div>

      {/* Patient selector */}
      <PatientSelector selectedPatient={selectedPatient} onSelect={setSelectedPatient} />

      {/* Tabs */}
      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 bg-zinc-900/50 p-1">
          <TabsTrigger value="appointments" className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            Agendamento
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1.5 text-xs">
            <TestTube className="h-3.5 w-3.5" />
            Resultados
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1.5 text-xs">
            <CreditCard className="h-3.5 w-3.5" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="diary" className="flex items-center gap-1.5 text-xs">
            <BookHeart className="h-3.5 w-3.5" />
            Diario de Saude
          </TabsTrigger>
          <TabsTrigger value="encounters" className="flex items-center gap-1.5 text-xs">
            <Stethoscope className="h-3.5 w-3.5" />
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-1.5 text-xs">
            <Pill className="h-3.5 w-3.5" />
            Prescricoes
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments"><AppointmentsTab patientId={patientId} /></TabsContent>
        <TabsContent value="results"><ResultsTab patientId={patientId} /></TabsContent>
        <TabsContent value="messaging"><MessagingTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="diary"><HealthDiaryTab /></TabsContent>
        <TabsContent value="encounters"><EncountersTab patientId={patientId} /></TabsContent>
        <TabsContent value="prescriptions"><PrescriptionsTab patientId={patientId} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab patientId={patientId} /></TabsContent>
      </Tabs>
    </div>
  );
}
