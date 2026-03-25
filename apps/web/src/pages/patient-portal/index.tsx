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
  Upload,
  Bell,
  Bot,
  Globe,
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
  useActivePrescriptions,
  useRenewalRequests,
  useRequestRenewal,
  type ActivePrescription,
  type RenewalRequest,
} from '@/services/portal-prescription-renewal.service';
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
import {
  useMyDependents,
  useGrantProxy,
  useRevokeProxy,
  type ProxiedPatient,
  type RelationshipType,
} from '@/services/portal-proxy.service';
import {
  useEducationContents,
  useEducationCategories,
  type EducationContent,
  type EducationCategory,
} from '@/services/portal-education.service';
import {
  useSurveys,
  useSubmitSurvey,
  type Survey,
} from '@/services/portal-surveys.service';
import type { Encounter, Patient, Prescription, VitalSigns, EncounterStatus } from '@/types';
import { toast } from 'sonner';

// ============================================================================
// i18n Language Selector (stub for future i18n)
// ============================================================================

type SupportedLocale = 'pt-BR' | 'en' | 'es';

const localeLabels: Record<SupportedLocale, { flag: string; label: string }> = {
  'pt-BR': { flag: '🇧🇷', label: 'Português (BR)' },
  en: { flag: '🇺🇸', label: 'English' },
  es: { flag: '🇪🇸', label: 'Español' },
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
                  toast.info(`Idioma alterado para ${label} (stub — i18n em desenvolvimento)`);
                }}
              >
                <span>{flag}</span>
                <span>{label}</span>
                {locale === key && <span className="ml-auto text-emerald-500">✓</span>}
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

function EncountersTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalEncounters(patientId ? { patientId } : undefined);

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

function ResultsTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalResults(patientId ? { patientId } : undefined);

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
// Tab: Agenda
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

function VitalsTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalVitals(patientId ? { patientId } : undefined);

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

function DocumentsTab({ patientId }: { patientId?: string }) {
  const { data, isLoading, isError, refetch } = usePortalDocuments(patientId ? { patientId } : undefined);

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

// ============================================================================
// Patient Search Selector (for staff users)
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
// Tab: Diario de Saude
// ============================================================================

function HealthDiaryTab() {
  const { data: entries, isLoading } = useDiaryEntries({ page: 1 });
  const { data: bpTrend } = useDiaryTrend('BP', 'systolicBP');
  const addEntry = useAddDiaryEntry();
  const deleteEntry = useDeleteDiaryEntry();

  const [showForm, setShowForm] = useState(false);
  const [entryType, setEntryType] = useState('BP');
  const [entryValue, setEntryValue] = useState('');

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

  if (isLoading) return <PageLoading cards={0} showTable />;

  const items = entries?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Entrada
        </Button>
      </div>
      {showForm && (
        <Card className="border-border bg-card">
          <CardContent className="pt-6 space-y-3">
            <div className="flex gap-3">
              <div>
                <Label className="text-muted-foreground">Tipo</Label>
                <select
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                >
                  <option value="BP">Pressao Arterial</option>
                  <option value="GLUCOSE">Glicemia</option>
                  <option value="WEIGHT">Peso</option>
                  <option value="TEMPERATURE">Temperatura</option>
                  <option value="PAIN">Dor</option>
                  <option value="MOOD">Humor</option>
                  <option value="SYMPTOMS">Sintomas</option>
                  <option value="EXERCISE">Exercicio</option>
                </select>
              </div>
              <div className="flex-1">
                <Label className="text-muted-foreground">Valor</Label>
                <Input
                  className="bg-card border-border"
                  value={entryValue}
                  onChange={(e) => setEntryValue(e.target.value)}
                  placeholder="Ex: 120/80"
                />
              </div>
              <div className="flex items-end">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd}>
                  Salvar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {bpTrend && bpTrend.trend.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Tendencia — Pressao Arterial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto">
              {bpTrend.trend.slice(0, 10).map((point, i) => (
                <Badge key={i} variant="secondary" className="whitespace-nowrap">
                  {formatDate(point.date)}: {point.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {items.length === 0 ? (
        <EmptyState icon={BookHeart} message="Nenhuma entrada no diario de saude" />
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {items.map((entry) => (
                  <tr key={entry.entryId} className="transition-colors hover:bg-accent/30">
                    <td className="px-4 py-3 text-sm">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">{entry.entryType}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.notes ?? JSON.stringify(entry.data)}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => deleteEntry.mutate(entry.entryId)}
                      >
                        Excluir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Tab: Uploads de Documentos
// ============================================================================

function DocumentUploadTab() {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Upload className="h-5 w-5 text-emerald-500" />
          Upload de Documentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm mb-4">
          Envie exames externos, laudos, imagens e outros documentos para o prontuario.
        </p>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, JPG, PNG, DICOM — max 50 MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Lembretes
// ============================================================================

function RemindersTab() {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-500" />
          Lembretes Automaticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm mb-4">
          Lembretes de medicamentos, consultas, exames e vacinas configurados automaticamente.
        </p>
        <EmptyState icon={Bell} message="Nenhum lembrete ativo no momento" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab: Mensageria
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

  if (isLoading) return <PageLoading cards={0} showTable />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Caixa de mensagens</p>
          {(unreadCount ?? 0) > 0 && (
            <Badge className="bg-emerald-600 text-white text-xs">{unreadCount} não lidas</Badge>
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
                <Label>Destinatário</Label>
                {teamList.length > 0 ? (
                  <select
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {teamList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="ID do destinatário"
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

      {convList.length === 0 ? (
        <EmptyState icon={FileText} message="Nenhuma conversa encontrada" />
      ) : (
        <div className="space-y-2">
          {convList.map((c) => (
            <Card key={c.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.subject}</p>
                      {c.unreadCount > 0 && (
                        <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">{c.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.participantName} · {c.participantRole}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={c.status === 'OPEN' ? 'default' : 'secondary'} className="text-[10px]">
                      {c.status === 'OPEN' ? 'Aberta' : 'Fechada'}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground">{formatDate(c.lastMessageAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab: Renovação de Receita
// ============================================================================

function PrescriptionRenewalTab() {
  const { data: activePrescriptions, isLoading: loadingActive } = useActivePrescriptions();
  const { data: renewalRequests, isLoading: loadingRequests } = useRenewalRequests();
  const requestRenewal = useRequestRenewal();

  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const active: ActivePrescription[] = Array.isArray(activePrescriptions) ? activePrescriptions : [];
  const requests: RenewalRequest[] = Array.isArray(renewalRequests) ? renewalRequests : [];

  const renewalStatusColor: Record<string, string> = {
    REQUESTED: 'bg-blue-600',
    IN_REVIEW: 'bg-yellow-600',
    APPROVED: 'bg-emerald-600',
    DENIED: 'bg-red-600',
  };

  function handleRequest() {
    if (!selectedPrescriptionId) return;
    requestRenewal.mutate(
      { prescriptionId: selectedPrescriptionId, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success('Solicitação de renovação enviada!');
          setDialogOpen(false);
          setSelectedPrescriptionId('');
          setNotes('');
        },
        onError: () => toast.error('Erro ao solicitar renovação'),
      },
    );
  }

  if (loadingActive || loadingRequests) return <PageLoading cards={0} showTable />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500" disabled={active.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Solicitar Renovação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Renovação de Receita</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>Medicamento</Label>
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                  value={selectedPrescriptionId}
                  onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {active.filter((p) => p.renewalEligible).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.medicationName} — {p.dosage} ({p.frequency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Observações (opcional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma observação para o médico..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500"
                disabled={!selectedPrescriptionId || requestRenewal.isPending}
                onClick={handleRequest}
              >
                {requestRenewal.isPending ? 'Enviando...' : 'Solicitar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {active.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Medicamentos Ativos</p>
          <div className="space-y-2">
            {active.map((p) => (
              <Card key={p.id} className="border-border bg-card">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.medicationName}</p>
                    <p className="text-xs text-muted-foreground">{p.dosage} · {p.frequency} · Dr(a). {p.prescribedBy}</p>
                    <p className="text-xs text-muted-foreground">Início: {formatDate(p.startDate)}{p.endDate ? ` · Fim: ${formatDate(p.endDate)}` : ''}</p>
                  </div>
                  <Badge variant={p.renewalEligible ? 'default' : 'secondary'} className={cn('text-[10px] shrink-0', p.renewalEligible ? 'bg-emerald-600 text-white' : '')}>
                    {p.renewalEligible ? 'Renovável' : 'Não renovável'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Solicitações de Renovação</p>
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Medicamento</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Solicitado em</th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Revisado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {requests.map((r: RenewalRequest) => (
                    <tr key={r.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-4 py-3 text-sm font-medium">{r.medicationName} — {r.dosage}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn('text-[10px] text-white', renewalStatusColor[r.status])}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">{formatDate(r.requestedAt)}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">{r.reviewedBy ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {active.length === 0 && requests.length === 0 && (
        <EmptyState icon={Pill} message="Nenhuma medicação ativa ou solicitação de renovação" />
      )}
    </div>
  );
}

// ============================================================================
// Tab: Pagamento Online
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

  const paymentStatusColor: Record<string, string> = {
    PENDING: 'bg-yellow-600',
    PROCESSING: 'bg-blue-600',
    PAID: 'bg-emerald-600',
    OVERDUE: 'bg-red-600',
    CANCELLED: 'bg-zinc-600',
    REFUNDED: 'bg-indigo-600',
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

  if (loadingPending || loadingHistory) return <PageLoading cards={0} showTable />;

  return (
    <div className="space-y-4">
      {balance && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-yellow-400">R$ {balance.totalPending.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pendente</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-red-400">R$ {balance.totalOverdue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Vencido</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-emerald-400">R$ {balance.totalPaid.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pago</p>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingList.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Cobranças Pendentes</p>
          <div className="space-y-2">
            {pendingList.map((p) => (
              <Card key={p.id} className="border-border bg-card">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {formatDate(p.dueDate)}
                      {p.doctorName ? ` · Dr(a). ${p.doctorName}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold">R$ {p.amount.toFixed(2)}</span>
                    <Badge variant="secondary" className={cn('text-[10px] text-white', paymentStatusColor[p.status])}>
                      {p.status}
                    </Badge>
                    {(p.status === 'PENDING' || p.status === 'OVERDUE') && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs" onClick={() => openPayDialog(p)}>
                        Pagar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {historyList.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Histórico de Pagamentos</p>
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Valor</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Método</th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Pago em</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {historyList.map((r: PaymentRecord) => (
                    <tr key={r.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-4 py-3 text-sm">{r.description}</td>
                      <td className="px-4 py-3 text-sm font-medium">R$ {r.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn('text-[10px] text-white', paymentStatusColor[r.status])}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">{r.method}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">{formatDate(r.paidAt)}</td>
                      <td className="px-4 py-3">
                        {r.receiptUrl || r.status === 'PAID' ? (
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
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {pendingList.length === 0 && historyList.length === 0 && (
        <EmptyState icon={FileText} message="Nenhum pagamento encontrado" />
      )}

      {/* Pay dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Realizar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">{selectedPayment.description}</p>
              <p className="text-2xl font-bold">R$ {selectedPayment.amount.toFixed(2)}</p>
              <div className="space-y-1">
                <Label>Forma de Pagamento</Label>
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                >
                  <option value="PIX">PIX</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="DEBIT_CARD">Cartão de Débito</option>
                  <option value="BOLETO">Boleto</option>
                </select>
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
// Tab: Acesso Familiar (Proxy)
// ============================================================================

function ProxyAccessTab() {
  const { data: dependents, isLoading } = useMyDependents();
  const grantProxy = useGrantProxy();
  const revokeProxy = useRevokeProxy();

  const [patientId, setPatientId] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('CHILD');
  const [expiresAt, setExpiresAt] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const depList: ProxiedPatient[] = Array.isArray(dependents) ? dependents : [];

  const relationshipLabels: Record<RelationshipType, string> = {
    PARENT: 'Pai/Mãe',
    CHILD: 'Filho(a)',
    SPOUSE: 'Cônjuge',
    GUARDIAN: 'Responsável Legal',
    CAREGIVER: 'Cuidador',
    OTHER: 'Outro',
  };

  function handleGrant() {
    if (!patientId) return;
    grantProxy.mutate(
      { patientId, relationship, expiresAt: expiresAt || undefined },
      {
        onSuccess: () => {
          toast.success('Acesso concedido com sucesso!');
          setDialogOpen(false);
          setPatientId('');
          setExpiresAt('');
        },
        onError: () => toast.error('Erro ao conceder acesso'),
      },
    );
  }

  if (isLoading) return <PageLoading cards={0} showTable />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Familiar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conceder Acesso Familiar</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>ID do Paciente Familiar</Label>
                <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="UUID do paciente..." />
              </div>
              <div className="space-y-1">
                <Label>Relação</Label>
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as RelationshipType)}
                >
                  {(Object.keys(relationshipLabels) as RelationshipType[]).map((r) => (
                    <option key={r} value={r}>{relationshipLabels[r]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Expira em (opcional)</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500"
                disabled={!patientId || grantProxy.isPending}
                onClick={handleGrant}
              >
                {grantProxy.isPending ? 'Concedendo...' : 'Conceder Acesso'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {depList.length === 0 ? (
        <EmptyState icon={User} message="Nenhum familiar com acesso ao portal" />
      ) : (
        <div className="space-y-2">
          {depList.map((d) => (
            <Card key={d.id} className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-sm font-medium">{d.patientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {relationshipLabels[d.relationship]} · Concedido em {formatDate(d.grantedAt)}
                    {d.expiresAt ? ` · Expira: ${formatDate(d.expiresAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={d.active ? 'default' : 'secondary'} className={cn('text-[10px]', d.active ? 'bg-emerald-600 text-white' : '')}>
                    {d.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {d.active && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      disabled={revokeProxy.isPending}
                      onClick={() =>
                        revokeProxy.mutate(d.id, {
                          onSuccess: () => toast.success('Acesso revogado'),
                          onError: () => toast.error('Erro ao revogar acesso'),
                        })
                      }
                    >
                      Revogar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab: Educação do Paciente
// ============================================================================

function EducationTab() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { data: contents, isLoading } = useEducationContents(
    search || selectedCategory ? { search: search || undefined, category: selectedCategory || undefined } : { recommended: true },
  );
  const { data: categories } = useEducationCategories();
  const [expanded, setExpanded] = useState<string | null>(null);

  const contentList: EducationContent[] = Array.isArray(contents) ? contents : [];
  const catList: EducationCategory[] = Array.isArray(categories) ? categories : [];

  if (isLoading) return <PageLoading cards={0} showTable />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar artigos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {catList.length > 0 && (
          <select
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {catList.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
            ))}
          </select>
        )}
      </div>

      {contentList.length === 0 ? (
        <EmptyState icon={BookHeart} message="Nenhum conteúdo educacional encontrado" />
      ) : (
        <div className="space-y-3">
          {contentList.map((article) => (
            <Card key={article.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{article.title}</p>
                      {article.recommended && (
                        <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 text-[10px]">
                          Recomendado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{article.summary}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{article.author}</span>
                      <span>·</span>
                      <span>{article.readTimeMinutes} min de leitura</span>
                      <span>·</span>
                      <span>{formatDate(article.publishedAt)}</span>
                    </div>
                    {expanded === article.id && (
                      <div className="mt-2 text-sm text-gray-300 border-t border-border pt-2 whitespace-pre-wrap">
                        {article.content}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs text-emerald-400"
                    onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                  >
                    {expanded === article.id ? 'Fechar' : 'Ler'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab: Pesquisas / NPS / PROMs
// ============================================================================

function SurveysTab() {
  const { data: surveys, isLoading } = useSurveys({ status: 'PENDING' });
  const submitSurvey = useSubmitSurvey();
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});

  const surveyList: Survey[] = Array.isArray(surveys) ? surveys : [];

  const surveyTypeColor: Record<string, string> = {
    PREM: 'bg-blue-600',
    PROM: 'bg-purple-600',
    NPS: 'bg-emerald-600',
    GENERAL: 'bg-zinc-600',
  };

  function handleSubmit() {
    if (!activeSurvey) return;
    const answerList = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
    submitSurvey.mutate(
      { surveyId: activeSurvey.id, answers: answerList },
      {
        onSuccess: () => {
          toast.success('Pesquisa enviada! Obrigado pelo feedback.');
          setActiveSurvey(null);
          setAnswers({});
        },
        onError: () => toast.error('Erro ao enviar pesquisa'),
      },
    );
  }

  if (isLoading) return <PageLoading cards={0} showTable />;

  if (activeSurvey) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setActiveSurvey(null); setAnswers({}); }}>
            ← Voltar
          </Button>
          <div>
            <p className="text-sm font-medium">{activeSurvey.title}</p>
            <p className="text-xs text-muted-foreground">{activeSurvey.description}</p>
          </div>
        </div>
        <div className="space-y-4">
          {activeSurvey.questions.map((q, i) => (
            <Card key={q.id} className="border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium">{i + 1}. {q.text}{q.required && <span className="text-red-400 ml-1">*</span>}</p>
                {q.type === 'SCALE' || q.type === 'NPS' ? (
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: (q.maxScale ?? 10) - (q.minScale ?? 0) + 1 }, (_, idx) => (q.minScale ?? 0) + idx).map((n) => (
                      <button
                        key={n}
                        className={cn(
                          'w-9 h-9 rounded-md border text-sm font-medium transition-colors',
                          answers[q.id] === n
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-border bg-card text-foreground hover:bg-accent/50',
                        )}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: n }))}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : q.type === 'YES_NO' ? (
                  <div className="flex gap-2">
                    {['Sim', 'Não'].map((opt) => (
                      <button
                        key={opt}
                        className={cn(
                          'px-4 py-2 rounded-md border text-sm font-medium transition-colors',
                          answers[q.id] === opt
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-border bg-card text-foreground hover:bg-accent/50',
                        )}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.type === 'MULTIPLE_CHOICE' && q.options ? (
                  <div className="flex gap-2 flex-wrap">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        className={cn(
                          'px-3 py-1.5 rounded-md border text-sm transition-colors',
                          answers[q.id] === opt
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-border bg-card text-foreground hover:bg-accent/50',
                        )}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    placeholder="Sua resposta..."
                    value={(answers[q.id] as string) ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    rows={3}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-500"
          disabled={submitSurvey.isPending}
          onClick={handleSubmit}
        >
          {submitSurvey.isPending ? 'Enviando...' : 'Enviar Pesquisa'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {surveyList.length === 0 ? (
        <EmptyState icon={FileText} message="Nenhuma pesquisa pendente no momento" />
      ) : (
        <div className="space-y-3">
          {surveyList.map((s) => (
            <Card key={s.id} className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{s.title}</p>
                    <Badge variant="secondary" className={cn('text-[10px] text-white shrink-0', surveyTypeColor[s.type])}>
                      {s.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.questionCount} pergunta{s.questionCount !== 1 ? 's' : ''}
                    {s.dueDate ? ` · Prazo: ${formatDate(s.dueDate)}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 shrink-0"
                  onClick={() => {
                    setActiveSurvey(s);
                    setAnswers({});
                  }}
                >
                  Responder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab: IA (Triagem, Resumo, Health Coach)
// ============================================================================

function AiFeaturesTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-6 text-center">
            <Bot className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-foreground font-medium mt-3">Triagem por IA</p>
            <p className="text-xs text-muted-foreground mt-1">
              Chatbot que avalia sintomas e orienta sobre urgencia
            </p>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" size="sm">
              Iniciar Triagem
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6 text-center">
            <FileText className="h-10 w-10 text-blue-500 mx-auto" />
            <p className="text-foreground font-medium mt-3">Resumo para Paciente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Traduz termos medicos em linguagem acessivel
            </p>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700" size="sm">
              Gerar Resumo
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6 text-center">
            <Heart className="h-10 w-10 text-pink-500 mx-auto" />
            <p className="text-foreground font-medium mt-3">Health Coach</p>
            <p className="text-xs text-muted-foreground mt-1">
              Plano personalizado de saude com metas e acompanhamento
            </p>
            <Button className="mt-4 bg-pink-600 hover:bg-pink-700" size="sm">
              Meu Plano
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function PatientPortalPage() {
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Heart className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Portal do Paciente</h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe atendimentos, exames, prescricoes e documentos
              </p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Patient Selector */}
      <PatientSelector
        selectedPatient={selectedPatient}
        onSelect={setSelectedPatient}
      />

      {/* Tabs — only shown when a patient is selected */}
      {selectedPatient ? (
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
            <TabsTrigger value="diary" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <BookHeart className="mr-1.5 h-3.5 w-3.5" />
              Diario de Saude
            </TabsTrigger>
            <TabsTrigger value="uploads" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Uploads
            </TabsTrigger>
            <TabsTrigger value="reminders" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              Lembretes
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Bot className="mr-1.5 h-3.5 w-3.5" />
              IA
            </TabsTrigger>
            <TabsTrigger value="messaging" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              Mensageria
            </TabsTrigger>
            <TabsTrigger value="renewal" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Pill className="mr-1.5 h-3.5 w-3.5" />
              Renovação de Receita
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Pagamento Online
            </TabsTrigger>
            <TabsTrigger value="proxy" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <User className="mr-1.5 h-3.5 w-3.5" />
              Acesso Familiar
            </TabsTrigger>
            <TabsTrigger value="education" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <BookHeart className="mr-1.5 h-3.5 w-3.5" />
              Educação
            </TabsTrigger>
            <TabsTrigger value="surveys" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Pesquisas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="encounters">
            <EncountersTab patientId={selectedPatient.id} />
          </TabsContent>
          <TabsContent value="results">
            <ResultsTab patientId={selectedPatient.id} />
          </TabsContent>
          <TabsContent value="prescriptions">
            <PrescriptionsTab patientId={selectedPatient.id} />
          </TabsContent>
          <TabsContent value="appointments">
            <AppointmentsTab patientId={selectedPatient.id} />
          </TabsContent>
          <TabsContent value="vitals">
            <VitalsTab patientId={selectedPatient.id} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab patientId={selectedPatient.id} />
          </TabsContent>
          <TabsContent value="diary">
            <HealthDiaryTab />
          </TabsContent>
          <TabsContent value="uploads">
            <DocumentUploadTab />
          </TabsContent>
          <TabsContent value="reminders">
            <RemindersTab />
          </TabsContent>
          <TabsContent value="ai">
            <AiFeaturesTab />
          </TabsContent>
          <TabsContent value="messaging">
            <MessagingTab />
          </TabsContent>
          <TabsContent value="renewal">
            <PrescriptionRenewalTab />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>
          <TabsContent value="proxy">
            <ProxyAccessTab />
          </TabsContent>
          <TabsContent value="education">
            <EducationTab />
          </TabsContent>
          <TabsContent value="surveys">
            <SurveysTab />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Busque e selecione um paciente acima para visualizar o portal
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
