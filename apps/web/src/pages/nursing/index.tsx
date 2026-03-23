import { useState, useMemo, useCallback } from 'react';
import {
  Mic,
  CheckCircle2,
  Pill,
  Activity,
  BedDouble,
  XCircle,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { cn, getInitials, calculateAge } from '@/lib/utils';
import { useBeds } from '@/services/admissions.service';
import {
  useMedicationChecks,
  useAdministerMedication,
  useSkipMedication,
} from '@/services/nursing.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type { MedicationCheck } from '@/types';

export default function NursingPage() {
  const navigate = useNavigate();
  const [ward, setWard] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<MedicationCheck | null>(null);
  const [dialogMode, setDialogMode] = useState<'administer' | 'skip'>('administer');
  const [lot, setLot] = useState('');
  const [observations, setObservations] = useState('');
  const [skipReason, setSkipReason] = useState('');

  const { data: allBeds = [], isLoading: bedsLoading, isError: bedsError, refetch: refetchBeds } = useBeds();
  const { data: allMedicationChecks = [], isLoading: checksLoading, isError: checksError, refetch: refetchChecks } = useMedicationChecks({ status: 'SCHEDULED' });

  const administerMutation = useAdministerMedication();
  const skipMutation = useSkipMedication();

  const assignedPatients = useMemo(() =>
    allBeds
      .filter((b) => b.status === 'OCCUPIED' && b.currentPatient)
      .map((bed) => {
        return { bed, patient: bed.currentPatient! };
      }),
    [allBeds],
  );

  const pendingChecks = useMemo(() =>
    allMedicationChecks
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [allMedicationChecks],
  );

  const handleOpenAdminister = useCallback((check: MedicationCheck) => {
    setSelectedCheck(check);
    setLot('');
    setObservations('');
    setSkipReason('');
    setDialogMode('administer');
    setDialogOpen(true);
  }, []);

  const handleAdminister = useCallback(async () => {
    if (!selectedCheck) return;

    const isControlled = selectedCheck.prescriptionItem?.isControlled;
    if (isControlled && !lot.trim()) {
      toast.error('Lote obrigatorio para medicamentos controlados');
      return;
    }

    try {
      await administerMutation.mutateAsync({
        prescriptionItemId: selectedCheck.prescriptionItemId,
        encounterId: '', // The backend will use the check's existing context
        scheduledAt: selectedCheck.scheduledAt,
        lot: lot.trim() || undefined,
        observations: observations.trim() || undefined,
      });
      toast.success('Medicamento administrado com sucesso');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao registrar administracao');
    }
  }, [selectedCheck, lot, observations, administerMutation]);

  const handleSkip = useCallback(async () => {
    if (!selectedCheck) return;
    if (!skipReason.trim()) {
      toast.error('Informe o motivo');
      return;
    }

    try {
      await skipMutation.mutateAsync({
        prescriptionItemId: selectedCheck.prescriptionItemId,
        encounterId: '',
        scheduledAt: selectedCheck.scheduledAt,
        observations: skipReason.trim(),
      });
      toast.success('Medicamento marcado como nao administrado');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao registrar');
    }
  }, [selectedCheck, skipReason, skipMutation]);

  if (bedsLoading || checksLoading) return <PageLoading cards={3} showTable />;
  if (bedsError || checksError) return <PageError onRetry={() => { refetchBeds(); refetchChecks(); }} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Enfermagem</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
            onClick={() => navigate('/enfermagem/aprazamento')}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Grade de Aprazamento
          </Button>
          <Select value={ward} onValueChange={setWard}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue placeholder="Ala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Alas</SelectItem>
              <SelectItem value="ward-uti">UTI</SelectItem>
              <SelectItem value="ward-enf">Enfermaria</SelectItem>
              <SelectItem value="ward-obs">Observacao</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="morning">
            <SelectTrigger className="w-36 bg-card border-border">
              <SelectValue placeholder="Turno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Manha (07-13h)</SelectItem>
              <SelectItem value="afternoon">Tarde (13-19h)</SelectItem>
              <SelectItem value="night">Noite (19-07h)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Patient Cards */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Pacientes Atribuidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assignedPatients.map(({ bed, patient }) => (
            <Card key={bed.id} className="border-border bg-card transition-colors hover:bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInitials(patient.name ?? patient.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{patient.name ?? patient.fullName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BedDouble className="h-3 w-3" />
                      <span>{bed.bedNumber}</span>
                      <span>{calculateAge(patient.birthDate)} anos</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Medication Check Timeline */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Pill className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          Checagem de Medicamentos
        </h2>
        <div className="space-y-2">
          {pendingChecks.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-10">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma checagem pendente no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingChecks.map((check) => {
              const isLate = new Date(check.scheduledAt).getTime() < Date.now();
              const isDone = check.status === 'ADMINISTERED';
              const isSkipped = check.status === 'REFUSED' || check.status === 'HELD';

              return (
                <Card
                  key={check.id}
                  className={cn(
                    'border transition-all',
                    isDone
                      ? 'border-green-500/30 bg-green-500/5'
                      : isSkipped
                        ? 'border-orange-500/30 bg-orange-500/5'
                        : isLate
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-border bg-card',
                  )}
                >
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="text-center min-w-[50px]">
                      <p className="text-sm font-bold">
                        {new Date(check.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className={cn(
                        'text-[10px]',
                        isLate ? 'text-red-400 font-medium' : 'text-muted-foreground',
                      )}>
                        {isDone ? 'Feito' : isSkipped ? 'Pulado' : isLate ? 'Atrasado' : 'Agendado'}
                      </p>
                    </div>

                    <div className="h-8 w-px bg-secondary" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {check.prescriptionItem?.medicationName ?? 'Medicamento'}
                        </p>
                        {check.prescriptionItem?.isHighAlert && (
                          <Badge className="bg-red-500/20 text-[9px] text-red-400">
                            Alto Alerta
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {check.prescriptionItem?.dose} — {check.prescriptionItem?.route} — {check.prescriptionItem?.frequency}
                      </p>
                      {isDone && check.checkedAt && (
                        <p className="mt-1 text-[11px] text-emerald-400">
                          Administrado as {new Date(check.checkedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {check.lotNumber && ` | Lote: ${check.lotNumber}`}
                        </p>
                      )}
                    </div>

                    {isDone ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      </div>
                    ) : isSkipped ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20">
                        <XCircle className="h-5 w-5 text-orange-400" />
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-500 text-xs h-8"
                        onClick={() => handleOpenAdminister(check)}
                      >
                        Checar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Vital Signs Entry */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-blue-400" />
            Registro Rapido de Sinais Vitais
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
          <button className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-500/20 hover:bg-teal-500 transition-all animate-voice-pulse">
            <Mic className="h-6 w-6 text-white" />
          </button>
          <p className="mt-3 text-sm text-muted-foreground">
            Dite os sinais vitais do paciente
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ex: "Pressao 120 por 80, frequencia cardiaca 72, saturacao 98"
          </p>
        </CardContent>
      </Card>

      {/* Administration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCheck?.prescriptionItem?.medicationName ?? 'Medicamento'}
            </DialogTitle>
            <DialogDescription>
              {selectedCheck
                ? `${selectedCheck.prescriptionItem?.dose} — ${selectedCheck.prescriptionItem?.route} — Horario: ${new Date(selectedCheck.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === 'administer' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="check-lot">
                  Lote
                  {selectedCheck?.prescriptionItem?.isControlled && (
                    <span className="ml-1 text-red-400">*</span>
                  )}
                </Label>
                <Input
                  id="check-lot"
                  placeholder="Numero do lote"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="check-obs">Observacoes</Label>
                <Textarea
                  id="check-obs"
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
                <Label htmlFor="check-skip-reason">
                  Motivo <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="check-skip-reason"
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
