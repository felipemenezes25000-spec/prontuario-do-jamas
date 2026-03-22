import { useState, useMemo } from 'react';
import {
  Mic,
  CheckCircle2,
  Pill,
  Activity,
  BedDouble,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, getInitials, calculateAge } from '@/lib/utils';
import { useBeds } from '@/services/admissions.service';
import { useMedicationChecks } from '@/services/nursing.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

export default function NursingPage() {
  const [ward, setWard] = useState('all');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const { data: allBeds = [], isLoading: bedsLoading, isError: bedsError, refetch: refetchBeds } = useBeds();
  const { data: allMedicationChecks = [], isLoading: checksLoading, isError: checksError, refetch: refetchChecks } = useMedicationChecks({ status: 'SCHEDULED' });

  const assignedPatients = useMemo(() =>
    allBeds
      .filter((b) => b.status === 'OCCUPIED' && b.currentPatient)
      .map((bed) => {
        return { bed, patient: bed.currentPatient!, pendingChecks: 0 };
      }),
    [allBeds],
  );

  const pendingChecks = useMemo(() =>
    allMedicationChecks
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [allMedicationChecks],
  );

  const handleCheck = (id: string) => {
    setCheckedIds((prev) => new Set(prev).add(id));
  };

  if (bedsLoading || checksLoading) return <PageLoading cards={3} showTable />;
  if (bedsError || checksError) return <PageError onRetry={() => { refetchBeds(); refetchChecks(); }} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Enfermagem</h1>
        <div className="flex gap-2">
          <Select value={ward} onValueChange={setWard}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue placeholder="Ala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Alas</SelectItem>
              <SelectItem value="ward-uti">UTI</SelectItem>
              <SelectItem value="ward-enf">Enfermaria</SelectItem>
              <SelectItem value="ward-obs">Observação</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="morning">
            <SelectTrigger className="w-36 bg-card border-border">
              <SelectValue placeholder="Turno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Manhã (07-13h)</SelectItem>
              <SelectItem value="afternoon">Tarde (13-19h)</SelectItem>
              <SelectItem value="night">Noite (19-07h)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Patient Cards */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Pacientes Atribuídos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assignedPatients.map(({ bed, patient, pendingChecks: pending }) => (
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
                  {pending > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                      {pending} pendente{pending > 1 ? 's' : ''}
                    </Badge>
                  )}
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
          {pendingChecks.map((check) => {
            const isChecked = checkedIds.has(check.id);
            return (
              <Card
                key={check.id}
                className={cn(
                  'border transition-all',
                  isChecked
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border bg-card',
                )}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="text-center">
                    <p className="text-sm font-bold">
                      {new Date(check.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(check.scheduledAt).getTime() < Date.now() ? 'Atrasado' : 'Agendado'}
                    </p>
                  </div>

                  <div className="h-8 w-px bg-secondary" />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {check.prescriptionItem?.medicationName ?? 'Medicamento'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {check.prescriptionItem?.dose} — {check.prescriptionItem?.route} — {check.prescriptionItem?.frequency}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-medium">Checagem #{check.id.slice(-6)}</p>
                  </div>

                  {isChecked ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-500 text-xs h-8"
                      onClick={() => handleCheck(check.id)}
                    >
                      Checar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Vital Signs Entry */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-blue-400" />
            Registro Rápido de Sinais Vitais
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
            Ex: "Pressão 120 por 80, frequência cardíaca 72, saturação 98"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
