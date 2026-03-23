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
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { encounterStatusLabels, encounterTypeLabels } from '@/lib/constants';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  usePortalEncounters,
  usePortalResults,
  usePortalPrescriptions,
  usePortalAppointments,
  usePortalVitals,
  usePortalDocuments,
  useRequestAppointment,
  type PortalExamResult,
  type PortalAppointment,
  type PortalDocument,
} from '@/services/patient-portal.service';
import type { Encounter, Prescription, VitalSigns, EncounterStatus } from '@/types';
import { toast } from 'sonner';

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

// ============================================================================
// Empty state
// ============================================================================

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Icon className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Meus Atendimentos
// ============================================================================

function EncountersTab() {
  const { data, isLoading, isError, refetch } = usePortalEncounters();

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const encounters = data?.data ?? [];

  if (encounters.length === 0) {
    return <EmptyState icon={Stethoscope} message="Nenhum atendimento encontrado" />;
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Medico</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Queixa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {encounters.map((enc: Encounter) => {
              const statusInfo = encounterStatusLabels[enc.status as EncounterStatus];
              return (
                <tr key={enc.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3 text-sm">{formatDate(enc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-secondary text-xs text-foreground">
                      {encounterTypeLabels[enc.type] ?? enc.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                      {statusInfo?.label ?? enc.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                    {enc.primaryDoctor?.name ?? '--'}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {enc.chiefComplaint ?? '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============================================================================
// Tab: Resultados de Exames
// ============================================================================

function ResultsTab() {
  const { data, isLoading, isError, refetch } = usePortalResults();

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const results = data?.data ?? [];

  if (results.length === 0) {
    return <EmptyState icon={TestTube} message="Nenhum resultado de exame encontrado" />;
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Exame</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Solicitado em</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Concluido em</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground lg:table-cell">Solicitante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {results.map((exam: PortalExamResult) => {
              const statusInfo = examStatusLabels[exam.status];
              return (
                <tr key={exam.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3 text-sm font-medium">{exam.examName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-secondary text-xs text-foreground">
                      {examTypeLabels[exam.examType] ?? exam.examType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                      {statusInfo?.label ?? exam.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                    {formatDate(exam.requestedAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {formatDate(exam.completedAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                    {exam.requestedBy?.name ?? '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============================================================================
// Tab: Prescricoes
// ============================================================================

function PrescriptionsTab() {
  const { data, isLoading, isError, refetch } = usePortalPrescriptions();

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
// Tab: Agenda
// ============================================================================

function AppointmentsTab() {
  const { data, isLoading, isError, refetch } = usePortalAppointments();
  const requestMutation = useRequestAppointment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    preferredDate: '',
    specialty: '',
    reason: '',
  });

  if (isLoading) return <PageLoading cards={0} showTable />;
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500">
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
                <Input
                  id="specialty"
                  placeholder="Ex: Cardiologia, Ortopedia..."
                  value={formData.specialty}
                  onChange={(e) => setFormData((prev) => ({ ...prev, specialty: e.target.value }))}
                />
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={handleSubmit}
                disabled={requestMutation.isPending}
              >
                {requestMutation.isPending ? 'Enviando...' : 'Solicitar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {appointments.length === 0 ? (
        <EmptyState icon={Calendar} message="Nenhum agendamento encontrado" />
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data/Hora</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Medico</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Duracao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {appointments.map((appt: PortalAppointment) => {
                  const statusInfo = appointmentStatusLabels[appt.status];
                  return (
                    <tr key={appt.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-4 py-3 text-sm">{formatDateTime(appt.scheduledAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="bg-secondary text-xs text-foreground">
                          {appt.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                          {statusInfo?.label ?? appt.status}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                        {appt.doctor?.name ?? '--'}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {appt.duration}min
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Tab: Sinais Vitais
// ============================================================================

function VitalsTab() {
  const { data, isLoading, isError, refetch } = usePortalVitals();

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const vitals = data?.data ?? [];

  if (vitals.length === 0) {
    return <EmptyState icon={Activity} message="Nenhum registro de sinais vitais encontrado" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary cards for latest reading */}
      {(() => {
        const latest = vitals[0];
        if (!latest) return null;
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <VitalCard
              label="Pressao Arterial"
              value={
                latest.systolicBP && latest.diastolicBP
                  ? `${latest.systolicBP}/${latest.diastolicBP} mmHg`
                  : '--'
              }
              icon={Activity}
            />
            <VitalCard
              label="Freq. Cardiaca"
              value={latest.heartRate ? `${latest.heartRate} bpm` : '--'}
              icon={Heart}
            />
            <VitalCard
              label="Temperatura"
              value={latest.temperature ? `${latest.temperature} C` : '--'}
              icon={Activity}
            />
            <VitalCard
              label="Saturacao O2"
              value={latest.oxygenSaturation ? `${latest.oxygenSaturation}%` : '--'}
              icon={Activity}
            />
          </div>
        );
      })()}

      {/* History table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">PA</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">FC</th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Temp</th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">SpO2</th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">FR</th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Glicemia</th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground lg:table-cell">Dor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {vitals.map((v: VitalSigns) => (
                <tr key={v.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3 text-sm">{formatDateTime(v.recordedAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm">{v.heartRate ?? '--'}</td>
                  <td className="hidden px-4 py-3 text-sm sm:table-cell">
                    {v.temperature ? `${v.temperature}` : '--'}
                  </td>
                  <td className="hidden px-4 py-3 text-sm sm:table-cell">
                    {v.oxygenSaturation ? `${v.oxygenSaturation}%` : '--'}
                  </td>
                  <td className="hidden px-4 py-3 text-sm md:table-cell">{v.respiratoryRate ?? '--'}</td>
                  <td className="hidden px-4 py-3 text-sm md:table-cell">
                    {v.glucoseLevel ? `${v.glucoseLevel} mg/dL` : '--'}
                  </td>
                  <td className="hidden px-4 py-3 text-sm lg:table-cell">{v.painScale ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function VitalCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
          <Icon className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Documentos
// ============================================================================

function DocumentsTab() {
  const { data, isLoading, isError, refetch } = usePortalDocuments();

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const documents = data?.data ?? [];

  if (documents.length === 0) {
    return <EmptyState icon={FileText} message="Nenhum documento clinico encontrado" />;
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Titulo</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Data</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Autor</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {documents.map((doc: PortalDocument) => {
              const statusInfo = documentStatusLabels[doc.status];
              return (
                <tr key={doc.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3 text-sm font-medium">{doc.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-secondary text-xs text-foreground">
                      {documentTypeLabels[doc.type] ?? doc.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                      {statusInfo?.label ?? doc.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {doc.author?.name ?? '--'}
                  </td>
                  <td className="px-4 py-3">
                    {doc.status === 'SIGNED' || doc.status === 'FINAL' ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar documento">
                        <Download className="h-4 w-4 text-emerald-500" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function PatientPortalPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Heart className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portal do Paciente</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe seus atendimentos, exames, prescricoes e documentos
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="encounters" className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="encounters" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Stethoscope className="mr-1.5 h-3.5 w-3.5" />
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <TestTube className="mr-1.5 h-3.5 w-3.5" />
            Exames
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Pill className="mr-1.5 h-3.5 w-3.5" />
            Prescricoes
          </TabsTrigger>
          <TabsTrigger value="appointments" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="vitals" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Sinais Vitais
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="encounters">
          <EncountersTab />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab />
        </TabsContent>
        <TabsContent value="prescriptions">
          <PrescriptionsTab />
        </TabsContent>
        <TabsContent value="appointments">
          <AppointmentsTab />
        </TabsContent>
        <TabsContent value="vitals">
          <VitalsTab />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
