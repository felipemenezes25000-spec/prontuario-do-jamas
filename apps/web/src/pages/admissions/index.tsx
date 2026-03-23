import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  BedDouble,
  ArrowLeftRight,
  User,
  Clock,
  Wrench,
  Sparkles,
  Undo2,
  AlertTriangle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  FileText,
  Pill,
  ClipboardList,
  FileCheck,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { cn, calculateAge } from '@/lib/utils';
import { useBeds, useReverseDischarge, useDischargePatient } from '@/services/admissions.service';
import type { DischargePayload } from '@/services/admissions.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type { Bed, BedStatus, DischargeType } from '@/types';

// ============================================================================
// Discharge Types
// ============================================================================

const DISCHARGE_TYPE_LABELS: Record<DischargeType, string> = {
  MEDICAL_DISCHARGE: 'Alta Médica',
  TRANSFER: 'Transferência',
  EVASION: 'Evasão',
  DEATH: 'Óbito',
  ADMINISTRATIVE: 'Administrativa',
  AGAINST_MEDICAL_ADVICE: 'A Pedido / Contra Orientação Médica',
};

const DISCHARGE_CONDITIONS = [
  { value: 'STABLE', label: 'Estável' },
  { value: 'UNSTABLE', label: 'Instável' },
  { value: 'SEVERE', label: 'Grave' },
  { value: 'CRITICAL', label: 'Crítico' },
] as const;

const DISCHARGE_DOCUMENT_OPTIONS = [
  { value: 'SUMMARY', label: 'Sumário de Alta (PDF)', icon: FileText },
  { value: 'PRESCRIPTION', label: 'Receita de Alta', icon: Pill },
  { value: 'CERTIFICATE', label: 'Atestado', icon: FileCheck },
  { value: 'INSTRUCTIONS', label: 'Orientações ao Paciente', icon: ClipboardList },
] as const;

// ============================================================================
// Discharge Wizard
// ============================================================================

interface DischargeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bed: Bed;
  admissionId: string;
  onSuccess: () => void;
}

function DischargeWizard({ open, onOpenChange, bed, admissionId, onSuccess }: DischargeWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form state
  const [dischargeType, setDischargeType] = useState<DischargeType | ''>('');
  const [dischargeCondition, setDischargeCondition] = useState('');
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [medications, setMedications] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [alertSigns, setAlertSigns] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [followUpSpecialty, setFollowUpSpecialty] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const dischargePatient = useDischargePatient();

  const canAdvance = useMemo(() => {
    switch (step) {
      case 1: return !!dischargeType;
      case 2: return !!dischargeCondition;
      case 3: return true; // orientations are optional
      case 4: return true;
      default: return false;
    }
  }, [step, dischargeType, dischargeCondition]);

  const handleToggleDocument = useCallback((value: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }, []);

  const handleConfirmDischarge = useCallback(async () => {
    if (!dischargeType) return;

    const payload: DischargePayload = {
      admissionId,
      dischargeType: dischargeType as DischargeType,
      dischargeCondition,
      dischargeNotes: dischargeSummary || undefined,
      dischargePrescription: medications || undefined,
      restrictions: restrictions || undefined,
      alertSigns: alertSigns || undefined,
      followUpDate: returnDate || undefined,
      followUpSpecialty: followUpSpecialty || undefined,
      generateDocuments: selectedDocuments.length > 0 ? selectedDocuments : undefined,
    };

    try {
      await dischargePatient.mutateAsync(payload);
      toast.success('Alta hospitalar realizada com sucesso.');
      // Reset state
      setStep(1);
      setDischargeType('');
      setDischargeCondition('');
      setDischargeSummary('');
      setMedications('');
      setRestrictions('');
      setAlertSigns('');
      setReturnDate('');
      setFollowUpSpecialty('');
      setSelectedDocuments([]);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error('Erro ao realizar alta hospitalar.');
    }
  }, [
    admissionId, dischargeType, dischargeCondition, dischargeSummary,
    medications, restrictions, alertSigns, returnDate, followUpSpecialty,
    selectedDocuments, dischargePatient, onOpenChange, onSuccess,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-emerald-500" />
            Alta Hospitalar — Leito {bed.bedNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  s < step
                    ? 'bg-emerald-600 text-white'
                    : s === step
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < totalSteps && (
                <div className={cn('h-0.5 flex-1', s < step ? 'bg-emerald-600' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>

        {/* Patient info banner */}
        {bed.currentPatient && (
          <div className="rounded-lg border border-border bg-muted/30 p-2.5 mb-2">
            <p className="text-sm font-medium">{bed.currentPatient.fullName ?? bed.currentPatient.name}</p>
            <p className="text-xs text-muted-foreground">
              {calculateAge(bed.currentPatient.birthDate)} anos
            </p>
          </div>
        )}

        {/* Step 1: Discharge Type */}
        {step === 1 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Alta</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(DISCHARGE_TYPE_LABELS) as [DischargeType, string][]).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={dischargeType === key ? 'default' : 'outline'}
                  className={cn(
                    'h-auto py-3 px-3 text-xs justify-start',
                    dischargeType === key && 'bg-emerald-600 hover:bg-emerald-500 text-white',
                  )}
                  onClick={() => setDischargeType(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Condition */}
        {step === 2 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Condição do Paciente na Alta</Label>
            <div className="grid grid-cols-2 gap-2">
              {DISCHARGE_CONDITIONS.map((cond) => (
                <Button
                  key={cond.value}
                  type="button"
                  variant={dischargeCondition === cond.value ? 'default' : 'outline'}
                  className={cn(
                    'h-auto py-3 px-3 text-xs',
                    dischargeCondition === cond.value && 'bg-emerald-600 hover:bg-emerald-500 text-white',
                  )}
                  onClick={() => setDischargeCondition(cond.value)}
                >
                  {cond.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Discharge Instructions / Orientations */}
        {step === 3 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Orientações de Alta</Label>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Resumo / Sumário de Alta</Label>
              <Textarea
                rows={3}
                placeholder="Resumo da internação, diagnóstico, tratamento realizado..."
                value={dischargeSummary}
                onChange={(e) => setDischargeSummary(e.target.value)}
                className="bg-background border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Medicações para Casa</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Amoxicilina 500mg 8/8h por 7 dias..."
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                className="bg-background border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Restrições de Atividade</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Evitar esforço físico por 15 dias..."
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                className="bg-background border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sinais de Alerta para Retornar ao PS</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Febre > 38.5°C, dor torácica, falta de ar..."
                value={alertSigns}
                onChange={(e) => setAlertSigns(e.target.value)}
                className="bg-background border-border text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data de Retorno</Label>
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="bg-background border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Especialidade de Acompanhamento</Label>
                <Input
                  placeholder="Ex: Cardiologia"
                  value={followUpSpecialty}
                  onChange={(e) => setFollowUpSpecialty(e.target.value)}
                  className="bg-background border-border text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Generate Documents */}
        {step === 4 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Gerar Documentos</Label>
            <p className="text-xs text-muted-foreground">
              Selecione os documentos que deseja gerar com a alta.
            </p>
            <div className="space-y-2">
              {DISCHARGE_DOCUMENT_OPTIONS.map((doc) => (
                <div
                  key={doc.value}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    selectedDocuments.includes(doc.value)
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-border bg-card hover:bg-accent/30',
                  )}
                  onClick={() => handleToggleDocument(doc.value)}
                >
                  <Checkbox
                    checked={selectedDocuments.includes(doc.value)}
                    onCheckedChange={() => handleToggleDocument(doc.value)}
                  />
                  <doc.icon className={cn(
                    'h-4 w-4',
                    selectedDocuments.includes(doc.value) ? 'text-emerald-400' : 'text-muted-foreground',
                  )} />
                  <span className="text-sm">{doc.label}</span>
                </div>
              ))}
            </div>

            {/* Summary of choices */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 mt-3">
              <p className="text-xs font-medium text-muted-foreground">Resumo da Alta</p>
              <div className="flex flex-wrap gap-2">
                {dischargeType && (
                  <Badge variant="outline" className="text-xs">
                    {DISCHARGE_TYPE_LABELS[dischargeType as DischargeType]}
                  </Badge>
                )}
                {dischargeCondition && (
                  <Badge variant="outline" className="text-xs">
                    {DISCHARGE_CONDITIONS.find((c) => c.value === dischargeCondition)?.label}
                  </Badge>
                )}
                {returnDate && (
                  <Badge variant="outline" className="text-xs">
                    Retorno: {new Date(returnDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </Badge>
                )}
                {followUpSpecialty && (
                  <Badge variant="outline" className="text-xs">
                    {followUpSpecialty}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <DialogFooter className="flex items-center justify-between gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={step <= 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            {step < totalSteps ? (
              <Button
                size="sm"
                disabled={!canAdvance}
                onClick={() => setStep((s) => s + 1)}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={dischargePatient.isPending || !dischargeType}
                onClick={handleConfirmDischarge}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {dischargePatient.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirmar Alta
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const wards = [
  { id: 'ward-uti', name: 'UTI' },
  { id: 'ward-enf', name: 'Enfermaria' },
  { id: 'ward-obs', name: 'Observação' },
];

const statusConfig: Record<BedStatus, { label: string; color: string; borderColor: string; icon: typeof BedDouble }> = {
  AVAILABLE: { label: 'Disponível', color: 'bg-green-500', borderColor: 'border-green-500/40', icon: BedDouble },
  OCCUPIED: { label: 'Ocupado', color: 'bg-red-500', borderColor: 'border-red-500/40', icon: User },
  RESERVED: { label: 'Reservado', color: 'bg-blue-500', borderColor: 'border-blue-500/40', icon: Clock },
  CLEANING: { label: 'Limpeza', color: 'bg-yellow-500', borderColor: 'border-yellow-500/40', icon: Sparkles },
  MAINTENANCE: { label: 'Manutenção', color: 'bg-muted-foreground/80', borderColor: 'border-muted-foreground/40', icon: Wrench },
  BLOCKED: { label: 'Bloqueado', color: 'bg-zinc-600', borderColor: 'border-zinc-500/40', icon: Wrench },
};

export default function AdmissionsPage() {
  const [selectedWard, setSelectedWard] = useState('ward-enf');
  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reverseAdmissionId, setReverseAdmissionId] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [dischargeWizardBed, setDischargeWizardBed] = useState<Bed | null>(null);
  const [dischargeAdmissionId, setDischargeAdmissionId] = useState('');

  const { data: allBeds = [], isLoading, isError, refetch } = useBeds();
  const reverseDischarge = useReverseDischarge();

  const handleReverseDischarge = () => {
    if (!reverseAdmissionId || reverseReason.length < 10) return;
    reverseDischarge.mutate(
      { admissionId: reverseAdmissionId, reason: reverseReason },
      {
        onSuccess: () => {
          setShowReverseDialog(false);
          setReverseAdmissionId('');
          setReverseReason('');
          refetch();
        },
      },
    );
  };

  const wardBeds = allBeds.filter((b) => b.ward === selectedWard);
  const occupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
  const total = wardBeds.length;
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const bedDetail = selectedBed ? allBeds.find((b) => b.id === selectedBed) : null;

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Internações</h1>

      <Tabs defaultValue="mapa">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="mapa" className="text-xs data-[state=active]:bg-teal-600">Mapa de Leitos</TabsTrigger>
          <TabsTrigger value="internados" className="text-xs data-[state=active]:bg-teal-600">Internados</TabsTrigger>
          <TabsTrigger value="transferencias" className="text-xs data-[state=active]:bg-teal-600">Transferências</TabsTrigger>
        </TabsList>

        {/* Mapa de Leitos */}
        <TabsContent value="mapa" className="space-y-4 mt-4">
          {/* Ward Selector & Stats */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger className="w-full sm:w-52 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {wards.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Disponível ({total - occupied})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Ocupado ({occupied})</span>
              </div>
            </div>
          </div>

          {/* Occupancy Bar */}
          <Card className="border-border bg-card">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Ocupação</span>
                <span className={cn('text-sm font-bold', occupancyPct > 80 ? 'text-red-400' : occupancyPct > 60 ? 'text-amber-400' : 'text-teal-600 dark:text-teal-400')}>
                  {occupancyPct}%
                </span>
              </div>
              <Progress value={occupancyPct} className="h-2" />
            </CardContent>
          </Card>

          {/* Bed Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {wardBeds.map((bed) => {
              const config = statusConfig[bed.status];
              const patient = bed.currentPatient;
              return (
                <Card
                  key={bed.id}
                  onClick={() => setSelectedBed(bed.id)}
                  className={cn(
                    'cursor-pointer border-2 transition-all hover:scale-[1.02]',
                    config.borderColor,
                    'bg-card',
                    // 3D depth effect
                    'shadow-[0_2px_4px_rgba(0,0,0,0.2),0_4px_8px_rgba(0,0,0,0.1)]',
                    'hover:shadow-[0_4px_8px_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.15)]',
                    // Available beds pulse green
                    bed.status === 'AVAILABLE' && 'animate-green-pulse',
                    // Long stay amber glow (simulate >7 days)
                    bed.status === 'OCCUPIED' && bed.bedNumber.includes('1') && 'glow-amber',
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{bed.bedNumber}</span>
                      <div className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
                    </div>
                    {bed.status === 'OCCUPIED' && patient ? (
                      <div className="mt-2">
                        <p className="truncate text-xs font-medium">{patient.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {calculateAge(patient.birthDate)} anos
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Internados */}
        <TabsContent value="internados" className="mt-4">
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Leito</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Paciente</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Dias</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {allBeds
                    .filter((b) => b.status === 'OCCUPIED' && b.currentPatient)
                    .map((bed) => (
                      <tr key={bed.id} className="hover:bg-accent/30">
                        <td className="px-4 py-3">
                          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-teal-600 dark:text-teal-400">{bed.bedNumber}</code>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{bed.currentPatient?.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {Math.floor(Math.random() * 10) + 1}d
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">Em acompanhamento</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Transferências */}
        <TabsContent value="transferencias" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center py-12">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma transferência pendente</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bed Detail Dialog */}
      <Dialog open={!!selectedBed} onOpenChange={() => setSelectedBed(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Leito {bedDetail?.bedNumber}</DialogTitle>
          </DialogHeader>
          {bedDetail && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn('h-3 w-3 rounded-full', statusConfig[bedDetail.status].color)} />
                <span className="text-sm">{statusConfig[bedDetail.status].label}</span>
              </div>
              {bedDetail.currentPatient && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="font-medium">{bedDetail.currentPatient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {calculateAge(bedDetail.currentPatient.birthDate)} anos —{' '}
                    {bedDetail.currentPatient.gender === 'F' ? 'Feminino' : 'Masculino'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Convênio: {bedDetail.currentPatient.insuranceProvider ?? 'Particular'}
                  </p>
                </div>
              )}
              {/* Action buttons - only visible for occupied beds */}
              {bedDetail.status === 'OCCUPIED' && bedDetail.currentPatient && (
                <div className="pt-2 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => {
                        setDischargeWizardBed(bedDetail);
                        setSelectedBed(null);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Dar Alta
                    </Button>
                    {bedDetail.currentPatientId && (
                      <Button
                        variant="outline"
                        className="gap-2 border-border"
                        onClick={() => {
                          window.open(`/api/v1/patients/${bedDetail.currentPatientId}/wristband-pdf`, '_blank');
                        }}
                      >
                        <Printer className="h-4 w-4" />
                        Pulseira
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Discharge Admission ID Dialog (bridge to wizard) */}
      {dischargeWizardBed && !dischargeAdmissionId && (
        <Dialog open onOpenChange={() => setDischargeWizardBed(null)}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <LogOut className="h-4 w-4 text-emerald-500" />
                Alta — Leito {dischargeWizardBed.bedNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Informe o ID da internação para iniciar o processo de alta.
              </p>
              <Input
                placeholder="UUID da internação"
                value={dischargeAdmissionId}
                onChange={(e) => setDischargeAdmissionId(e.target.value)}
                className="bg-background border-border font-mono text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDischargeWizardBed(null)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!dischargeAdmissionId}
                  className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => {/* admissionId now set, wizard opens */}}
                >
                  Iniciar Alta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Discharge Wizard */}
      {dischargeWizardBed && dischargeAdmissionId && (
        <DischargeWizard
          open
          onOpenChange={(open) => {
            if (!open) {
              setDischargeWizardBed(null);
              setDischargeAdmissionId('');
            }
          }}
          bed={dischargeWizardBed}
          admissionId={dischargeAdmissionId}
          onSuccess={() => {
            setDischargeWizardBed(null);
            setDischargeAdmissionId('');
            refetch();
          }}
        />
      )}

      {/* Reverse Discharge Section */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Undo2 className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Reverter Alta</p>
                <p className="text-xs text-muted-foreground">
                  Permite reverter uma alta hospitalar realizada nas ultimas 2 horas
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              onClick={() => setShowReverseDialog(true)}
            >
              <Undo2 className="h-4 w-4" />
              Reverter Alta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reverse Discharge Dialog */}
      <Dialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reverter Alta Hospitalar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-500 font-medium">Atencao</p>
              <p className="text-xs text-muted-foreground mt-1">
                A reversao de alta so e permitida dentro de 2 horas apos a alta original.
                Apos esse periodo, sera necessario realizar uma nova internacao.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ID da Internacao *</Label>
              <Input
                placeholder="UUID da internacao"
                value={reverseAdmissionId}
                onChange={(e) => setReverseAdmissionId(e.target.value)}
                className="bg-background border-border font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Motivo da Reversao * (min. 10 caracteres)</Label>
              <Textarea
                placeholder="Descreva o motivo da reversao da alta..."
                rows={3}
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                className="bg-background border-border"
              />
              {reverseReason.length > 0 && reverseReason.length < 10 && (
                <p className="text-xs text-red-400">
                  Minimo 10 caracteres ({reverseReason.length}/10)
                </p>
              )}
            </div>

            {reverseDischarge.isError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400">
                  {(reverseDischarge.error as Error)?.message ??
                    'Erro ao reverter alta. Verifique se a janela de 2h nao expirou.'}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReverseDialog(false);
                  setReverseAdmissionId('');
                  setReverseReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReverseDischarge}
                disabled={
                  !reverseAdmissionId ||
                  reverseReason.length < 10 ||
                  reverseDischarge.isPending
                }
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {reverseDischarge.isPending ? 'Revertendo...' : 'Confirmar Reversao'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
