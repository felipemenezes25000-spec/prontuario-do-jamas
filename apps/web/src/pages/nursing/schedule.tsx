import { useState, useMemo, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Pill,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useMedicationSchedule,
  useAdministerMedication,
  useSkipMedication,
  type ScheduleRow,
  type ScheduleSlot,
} from '@/services/nursing.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { useSearchParams } from 'react-router-dom';

// ============================================================================
// Constants
// ============================================================================

const HOURS_24 = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

type ShiftKey = 'all' | 'morning' | 'afternoon' | 'night';

const SHIFT_RANGES: Record<ShiftKey, { start: number; end: number; label: string }> = {
  all: { start: 0, end: 24, label: 'Todos' },
  morning: { start: 7, end: 13, label: 'Manha (07-13h)' },
  afternoon: { start: 13, end: 19, label: 'Tarde (13-19h)' },
  night: { start: 19, end: 31, label: 'Noite (19-07h)' }, // wraps around
};

function isInShift(hour: number, shift: ShiftKey): boolean {
  if (shift === 'all') return true;
  const range = SHIFT_RANGES[shift];
  if (shift === 'night') {
    return hour >= 19 || hour < 7;
  }
  return hour >= range.start && hour < range.end;
}

function getSlotForHour(
  schedule: ScheduleSlot[],
  hour: number,
): ScheduleSlot | null {
  return (
    schedule.find((s) => {
      const slotHour = new Date(s.scheduledAt).getHours();
      return slotHour === hour;
    }) ?? null
  );
}

function isDueNow(scheduledAt: string): boolean {
  const diff = Math.abs(Date.now() - new Date(scheduledAt).getTime());
  return diff <= 15 * 60 * 1000; // within 15 minutes
}

// ============================================================================
// Cell color and content
// ============================================================================

interface CellStyle {
  bg: string;
  text: string;
  icon: React.ReactNode | null;
  animate: boolean;
}

function getCellStyle(slot: ScheduleSlot | null, status?: ScheduleSlot['status']): CellStyle {
  if (!slot) {
    return { bg: 'bg-zinc-800/50', text: '', icon: null, animate: false };
  }

  const s = status ?? slot.status;

  if (s === 'DONE') {
    const time = slot.checkedAt
      ? new Date(slot.checkedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';
    return {
      bg: 'bg-emerald-500/80 hover:bg-emerald-500',
      text: time,
      icon: <CheckCircle2 className="h-3 w-3" />,
      animate: false,
    };
  }

  if (s === 'LATE') {
    return {
      bg: 'bg-red-500/80 hover:bg-red-500',
      text: 'Atrasado',
      icon: <AlertTriangle className="h-3 w-3" />,
      animate: false,
    };
  }

  if (s === 'SKIPPED') {
    return {
      bg: 'bg-orange-500/80 hover:bg-orange-500',
      text: 'Pulado',
      icon: <XCircle className="h-3 w-3" />,
      animate: false,
    };
  }

  if (s === 'SUSPENDED') {
    return {
      bg: 'bg-zinc-600 line-through',
      text: 'Suspenso',
      icon: <Ban className="h-3 w-3" />,
      animate: false,
    };
  }

  // PENDING
  if (isDueNow(slot.scheduledAt)) {
    return {
      bg: 'bg-yellow-500 hover:bg-yellow-400 animate-pulse',
      text: 'AGORA',
      icon: <Clock className="h-3 w-3" />,
      animate: true,
    };
  }

  return {
    bg: 'bg-blue-500/70 hover:bg-blue-500',
    text: new Date(slot.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    icon: null,
    animate: false,
  };
}

// ============================================================================
// Component
// ============================================================================

export default function NursingSchedulePage() {
  const [searchParams] = useSearchParams();
  const encounterId = searchParams.get('encounterId') ?? '';

  const [shift, setShift] = useState<ShiftKey>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    row: ScheduleRow;
    slot: ScheduleSlot;
  } | null>(null);
  const [lot, setLot] = useState('');
  const [observations, setObservations] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [dialogMode, setDialogMode] = useState<'administer' | 'skip'>('administer');

  const {
    data: scheduleData,
    isLoading,
    isError,
    refetch,
  } = useMedicationSchedule(encounterId);

  const administerMutation = useAdministerMedication();
  const skipMutation = useSkipMedication();

  const filteredHours = useMemo(
    () => HOURS_24.filter((h) => isInShift(h, shift)),
    [shift],
  );

  const schedule = scheduleData ?? [];

  // Counters
  const counters = useMemo(() => {
    let pending = 0;
    let late = 0;
    let done = 0;
    let suspended = 0;

    for (const row of schedule) {
      for (const slot of row.schedule) {
        if (slot.status === 'PENDING') pending++;
        else if (slot.status === 'LATE') late++;
        else if (slot.status === 'DONE') done++;
        else if (slot.status === 'SUSPENDED') suspended++;
      }
    }
    return { pending, late, done, suspended };
  }, [schedule]);

  const handleCellClick = useCallback(
    (row: ScheduleRow, slot: ScheduleSlot) => {
      if (slot.status === 'DONE' || slot.status === 'SUSPENDED') return;
      setSelectedSlot({ row, slot });
      setLot('');
      setObservations('');
      setSkipReason('');
      setDialogMode('administer');
      setDialogOpen(true);
    },
    [],
  );

  const handleAdminister = useCallback(async () => {
    if (!selectedSlot) return;
    const { row, slot } = selectedSlot;

    if (row.prescriptionItem.isControlled && !lot.trim()) {
      toast.error('Lote obrigatorio para medicamentos controlados');
      return;
    }

    try {
      await administerMutation.mutateAsync({
        prescriptionItemId: row.prescriptionItem.id,
        encounterId,
        scheduledAt: slot.scheduledAt,
        lot: lot.trim() || undefined,
        observations: observations.trim() || undefined,
      });
      toast.success('Medicamento administrado com sucesso');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao registrar administracao');
    }
  }, [selectedSlot, lot, observations, encounterId, administerMutation]);

  const handleSkip = useCallback(async () => {
    if (!selectedSlot) return;
    if (!skipReason.trim()) {
      toast.error('Informe o motivo');
      return;
    }

    const { row, slot } = selectedSlot;
    try {
      await skipMutation.mutateAsync({
        prescriptionItemId: row.prescriptionItem.id,
        encounterId,
        scheduledAt: slot.scheduledAt,
        observations: skipReason.trim(),
      });
      toast.success('Medicamento marcado como nao administrado');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao registrar');
    }
  }, [selectedSlot, skipReason, encounterId, skipMutation]);

  if (!encounterId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Pill className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Grade de Aprazamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione um atendimento para visualizar a grade de medicamentos.
        </p>
      </div>
    );
  }

  if (isLoading) return <PageLoading cards={2} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grade de Aprazamento</h1>
          <p className="text-sm text-muted-foreground">
            Controle de administracao de medicamentos por horario
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={shift} onValueChange={(v) => setShift(v as ShiftKey)}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue placeholder="Turno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Horarios</SelectItem>
              <SelectItem value="morning">Manha (07-13h)</SelectItem>
              <SelectItem value="afternoon">Tarde (13-19h)</SelectItem>
              <SelectItem value="night">Noite (19-07h)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counters.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counters.late}</p>
              <p className="text-xs text-muted-foreground">Atrasados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counters.done}</p>
              <p className="text-xs text-muted-foreground">Administrados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-500/20">
              <Ban className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counters.suspended}</p>
              <p className="text-xs text-muted-foreground">Suspensos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Grid */}
      {schedule.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-16">
            <Pill className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum medicamento prescrito para este atendimento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground min-w-[200px]">
                      Medicamento
                    </th>
                    {filteredHours.map((hour) => (
                      <th
                        key={hour}
                        className="px-1 py-3 text-center text-xs font-medium text-muted-foreground min-w-[60px]"
                      >
                        {String(hour).padStart(2, '0')}:00
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {schedule.map((row) => (
                    <tr
                      key={row.prescriptionItem.id}
                      className={cn(
                        'transition-colors hover:bg-accent/10',
                        row.prescriptionItem.isHighAlert && 'ring-1 ring-inset ring-red-500/40',
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-card px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Pill
                            className={cn(
                              'h-4 w-4 shrink-0',
                              row.prescriptionItem.isHighAlert
                                ? 'text-red-400'
                                : 'text-muted-foreground',
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {row.prescriptionItem.name}
                              {row.prescriptionItem.isHighAlert && (
                                <Badge className="ml-2 bg-red-500/20 text-[9px] text-red-400">
                                  ALTO ALERTA
                                </Badge>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {row.prescriptionItem.dose} — {row.prescriptionItem.route} — {row.prescriptionItem.frequency}
                            </p>
                          </div>
                        </div>
                      </td>
                      {filteredHours.map((hour) => {
                        const slot = getSlotForHour(row.schedule, hour);
                        const style = getCellStyle(slot);
                        const isClickable =
                          slot !== null &&
                          slot.status !== 'DONE' &&
                          slot.status !== 'SUSPENDED';

                        return (
                          <td key={hour} className="px-1 py-1 text-center">
                            <button
                              type="button"
                              disabled={!isClickable}
                              onClick={() => {
                                if (slot && isClickable) handleCellClick(row, slot);
                              }}
                              className={cn(
                                'flex h-10 w-full items-center justify-center gap-1 rounded-md text-[10px] font-medium text-white transition-all',
                                style.bg,
                                isClickable && 'cursor-pointer',
                                !isClickable && !slot && 'cursor-default',
                                !isClickable && slot && 'cursor-not-allowed',
                              )}
                              title={
                                slot
                                  ? `${row.prescriptionItem.name} — ${slot.status}${slot.administeredBy ? ` (${slot.administeredBy.name})` : ''}`
                                  : ''
                              }
                            >
                              {style.icon}
                              {style.text && (
                                <span className="hidden sm:inline">{style.text}</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-blue-500/70" />
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-yellow-500 animate-pulse" />
          <span>Agora</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span>Administrado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span>Atrasado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-orange-500" />
          <span>Pulado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-zinc-600 line-through" />
          <span>Suspenso</span>
        </div>
      </div>

      {/* Administration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedSlot?.row.prescriptionItem.name}
            </DialogTitle>
            <DialogDescription>
              {selectedSlot
                ? `${selectedSlot.row.prescriptionItem.dose} — ${selectedSlot.row.prescriptionItem.route} — Horario: ${new Date(selectedSlot.slot.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === 'administer' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="lot">
                  Lote
                  {selectedSlot?.row.prescriptionItem.isControlled && (
                    <span className="ml-1 text-red-400">*</span>
                  )}
                </Label>
                <Input
                  id="lot"
                  placeholder="Numero do lote"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="obs">Observacoes</Label>
                <Textarea
                  id="obs"
                  placeholder="Sem intercorrencias"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="skip-reason">
                  Motivo <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="skip-reason"
                  placeholder="Ex: Paciente recusou, vomitou, etc."
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {dialogMode === 'administer' ? (
              <>
                <Button
                  variant="outline"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  onClick={() => setDialogMode('skip')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Nao Administrar
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={handleAdminister}
                  disabled={administerMutation.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {administerMutation.isPending ? 'Registrando...' : 'Administrar'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDialogMode('administer')}
                >
                  Voltar
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-500"
                  onClick={handleSkip}
                  disabled={skipMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {skipMutation.isPending ? 'Registrando...' : 'Confirmar'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
