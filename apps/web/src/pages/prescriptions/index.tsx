import { useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Eye,
  PenLine,
  Download,
  Ban,
  PauseCircle,
  CheckCircle2,
  Pill,
  Clock,
  Trash2,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  Droplets,
  Calculator,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { PageEmpty } from '@/components/ui/page-empty';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  usePrescriptions,
  usePrescription,
  useCreatePrescription,
  useSignPrescription,
  useSuspendPrescription,
  useCancelPrescription,
  useAddPrescriptionItem,
  useDownloadPrescriptionPdf,
  useDuplicatePrescription,
  type PrescriptionFilters,
} from '@/services/prescriptions.service';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSearchPatients } from '@/services/patients.service';
import { useEncounters } from '@/services/encounters.service';
import type {
  Prescription,
  PrescriptionItem,
  PrescriptionStatus,
  PrescriptionType,
  MedicationRoute,
  Patient,
} from '@/types';

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<
  PrescriptionStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'destructive' | 'secondary' | 'outline' }
> = {
  DRAFT: { label: 'Rascunho', variant: 'secondary' },
  ACTIVE: { label: 'Ativa', variant: 'success' },
  SUSPENDED: { label: 'Suspensa', variant: 'warning' },
  COMPLETED: { label: 'Concluída', variant: 'info' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
  EXPIRED: { label: 'Expirada', variant: 'outline' },
};

const TYPE_LABELS: Record<PrescriptionType, string> = {
  MEDICATION: 'Medicamento',
  EXAM: 'Exame',
  PROCEDURE: 'Procedimento',
  DIET: 'Dieta',
  NURSING: 'Enfermagem',
  SPECIAL_CONTROL: 'Controle Especial',
  ANTIMICROBIAL: 'Antimicrobiano',
};

const ROUTE_LABELS: Record<MedicationRoute, string> = {
  ORAL: 'Via Oral',
  SUBLINGUAL: 'Sublingual',
  RECTAL: 'Retal',
  TOPICAL: 'Tópico',
  TRANSDERMAL: 'Transdérmico',
  INHALATION: 'Inalatório',
  NASAL: 'Nasal',
  OPHTHALMIC: 'Oftálmico',
  OTIC: 'Otológico',
  VAGINAL: 'Vaginal',
  IV: 'Intravenoso (IV)',
  IM: 'Intramuscular (IM)',
  SC: 'Subcutâneo (SC)',
  ID: 'Intradérmico (ID)',
  EPIDURAL: 'Epidural',
  INTRATHECAL: 'Intratecal',
  INTRA_ARTICULAR: 'Intra-articular',
  NEBULIZATION: 'Nebulização',
  ENTERAL: 'Enteral',
  PARENTERAL: 'Parenteral',
  OTHER: 'Outro',
};

const PAGE_SIZE = 15;

// ============================================================================
// B9 — Schedule Preview Helper
// ============================================================================

const NAMED_FREQUENCIES: Record<string, Array<[number, number]>> = {
  '6/6h': [[0, 0], [6, 0], [12, 0], [18, 0]],
  '8/8h': [[6, 0], [14, 0], [22, 0]],
  '12/12h': [[6, 0], [18, 0]],
  '1x/dia': [[6, 0]],
  '2x/dia': [[6, 0], [18, 0]],
  '3x/dia': [[6, 0], [14, 0], [22, 0]],
  '4x/dia': [[6, 0], [12, 0], [18, 0], [0, 0]],
};

function getSchedulePreview(frequency: string): string[] {
  const trimmed = frequency.trim().toLowerCase();
  if (!trimmed || trimmed === 'sos' || trimmed === 'acm' || trimmed === 'se necessário') {
    return [];
  }

  const named = NAMED_FREQUENCIES[trimmed];
  if (named) {
    return named.map(([h, m]) =>
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    );
  }

  // Pattern: N/Nh
  const intervalMatch = trimmed.match(/^(\d+)\/\d+\s*h$/);
  if (intervalMatch?.[1]) {
    const hours = parseInt(intervalMatch[1], 10);
    if (hours > 0 && hours <= 24) {
      const times: string[] = [];
      const startH = hours <= 6 ? 0 : 6;
      for (let h = startH; h < startH + 24; h += hours) {
        const hh = h % 24;
        times.push(`${String(hh).padStart(2, '0')}:00`);
      }
      return times;
    }
  }

  // Pattern: Nx/dia
  const timesPerDayMatch = trimmed.match(/^(\d+)\s*x\s*\/?\s*dia$/);
  if (timesPerDayMatch?.[1]) {
    const count = parseInt(timesPerDayMatch[1], 10);
    const schedules: Record<number, Array<[number, number]>> = {
      1: [[6, 0]],
      2: [[6, 0], [18, 0]],
      3: [[6, 0], [14, 0], [22, 0]],
      4: [[6, 0], [12, 0], [18, 0], [0, 0]],
      5: [[6, 0], [10, 0], [14, 0], [18, 0], [22, 0]],
      6: [[0, 0], [4, 0], [8, 0], [12, 0], [16, 0], [20, 0]],
    };
    const sched = schedules[count];
    if (sched) {
      return sched.map(([h, m]) =>
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      );
    }
  }

  return [];
}

// ============================================================================
// Zod Schemas
// ============================================================================

const prescriptionItemSchema = z.object({
  medicationName: z.string().min(1, 'Nome do medicamento é obrigatório'),
  dose: z.string().min(1, 'Dose é obrigatória'),
  route: z.string().min(1, 'Via é obrigatória'),
  frequency: z.string().min(1, 'Frequência é obrigatória'),
  duration: z.string().optional(),
  specialInstructions: z.string().optional(),
  dilutionSolution: z.string().optional(),
  dilutionVolume: z.string().optional(),
  infusionRate: z.string().optional(),
  infusionRateUnit: z.string().optional(),
});

// ============================================================================
// IV / Infusion Constants & Calculator
// ============================================================================

const DILUENT_OPTIONS = [
  { value: 'SF 0.9%', label: 'SF 0,9% (Soro Fisiológico)' },
  { value: 'SG 5%', label: 'SG 5% (Soro Glicosado)' },
  { value: 'Ringer Lactato', label: 'Ringer Lactato' },
  { value: 'Água destilada', label: 'Água destilada' },
] as const;

const IV_ROUTES: readonly string[] = ['IV', 'IM', 'PARENTERAL'] as const;

function isIVRoute(route: string): boolean {
  return IV_ROUTES.includes(route);
}

/**
 * Calculates drip rate in drops/min
 * Formula: drops/min = (Volume_mL * dropFactor) / (time_min)
 * Macro drip set factor = 20, Micro drip set factor = 60
 */
function calculateDripRate(
  volumeMl: number,
  timeMinutes: number,
  equipType: 'macro' | 'micro',
): number {
  if (timeMinutes <= 0) return 0;
  const factor = equipType === 'macro' ? 20 : 60;
  return Math.round((volumeMl * factor) / timeMinutes);
}

const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, 'Paciente é obrigatório'),
  encounterId: z.string().min(1, 'Atendimento é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'Adicione pelo menos um item'),
});

type CreatePrescriptionFormData = z.infer<typeof createPrescriptionSchema>;

// ============================================================================
// Sub-components
// ============================================================================

function StatusBadge({ status }: { status: PrescriptionStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: 'secondary' as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function SignedIcon({ signedAt }: { signedAt?: string }) {
  if (signedAt) {
    return (
      <span title={`Assinada em ${new Date(signedAt).toLocaleString('pt-BR')}`}>
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      </span>
    );
  }
  return (
    <span title="Não assinada">
      <Clock className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}

interface PatientSearchSelectProps {
  value: string;
  onChange: (patientId: string) => void;
}

function PatientSearchSelect({ value, onChange }: PatientSearchSelectProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: patientsData } = useSearchPatients(debouncedSearch);
  const patients: Patient[] = patientsData?.data ?? [];

  const selectedPatient = patients.find((p) => p.id === value);

  return (
    <div className="space-y-2">
      <Input
        placeholder="Buscar paciente por nome ou CPF..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-card border-border"
      />
      {debouncedSearch.length >= 2 && patients.length > 0 && !value && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-popover">
          {patients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onChange(patient.id);
                setSearch(patient.fullName);
              }}
            >
              <span className="font-medium">{patient.fullName}</span>
              {patient.cpf && (
                <span className="text-xs text-muted-foreground">
                  CPF: ***{patient.cpf.slice(-5)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {value && selectedPatient && (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
          <span>{selectedPatient.fullName}</span>
          <button
            type="button"
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={() => {
              onChange('');
              setSearch('');
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Detail Sheet
// ============================================================================

interface PrescriptionDetailSheetProps {
  prescriptionId: string | null;
  onClose: () => void;
}

function PrescriptionDetailSheet({
  prescriptionId,
  onClose,
}: PrescriptionDetailSheetProps) {
  const { data: prescription, isLoading } = usePrescription(
    prescriptionId ?? '',
  );

  return (
    <Sheet open={!!prescriptionId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Detalhes da Prescrição</SheetTitle>
          <SheetDescription>
            {prescription
              ? `#${prescription.id.slice(-8).toUpperCase()}`
              : 'Carregando...'}
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {prescription && (
          <div className="mt-6 space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Paciente</p>
                <p className="font-medium">
                  {prescription.patient?.fullName ??
                    prescription.patientId.slice(-8)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Médico</p>
                <p className="font-medium">
                  {prescription.doctor?.name ??
                    prescription.doctorId.slice(-8)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {TYPE_LABELS[prescription.type] ?? prescription.type}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <StatusBadge status={prescription.status} />
              </div>
              <div>
                <p className="text-muted-foreground">Criada em</p>
                <p className="font-medium">
                  {new Date(prescription.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Assinada</p>
                <div className="flex items-center gap-1.5">
                  <SignedIcon signedAt={prescription.signedAt} />
                  <span className="text-xs">
                    {prescription.signedAt
                      ? new Date(prescription.signedAt).toLocaleString('pt-BR')
                      : 'Pendente'}
                  </span>
                </div>
              </div>
              {prescription.validFrom && (
                <div>
                  <p className="text-muted-foreground">Válida de</p>
                  <p className="font-medium">
                    {new Date(prescription.validFrom).toLocaleDateString(
                      'pt-BR',
                    )}
                  </p>
                </div>
              )}
              {prescription.validUntil && (
                <div>
                  <p className="text-muted-foreground">Válida até</p>
                  <p className="font-medium">
                    {new Date(prescription.validUntil).toLocaleDateString(
                      'pt-BR',
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* AI notice */}
            {prescription.wasGeneratedByAI && (
              <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <p className="text-xs text-purple-300">
                  Esta prescrição foi gerada por Inteligência Artificial e
                  revisada pelo médico.
                </p>
              </div>
            )}

            <Separator />

            {/* Items */}
            <div>
              <h4 className="mb-3 text-sm font-semibold">
                Itens ({prescription.items.length})
              </h4>
              <div className="space-y-3">
                {prescription.items.map((item) => (
                  <PrescriptionItemCard key={item.id} item={item} />
                ))}
                {prescription.items.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum item na prescrição.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PrescriptionItemCard({ item }: { item: PrescriptionItem }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border p-3 space-y-1',
        item.isHighAlert && 'border-red-500/50 bg-red-500/5',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill
            className={cn(
              'h-4 w-4',
              item.isHighAlert ? 'text-red-400' : 'text-emerald-500',
            )}
          />
          <span className="text-sm font-medium">
            {item.medicationName ??
              item.examName ??
              item.procedureName ??
              'Item'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {item.isHighAlert && (
            <Badge variant="destructive" className="text-[10px]">
              Alto Alerta
            </Badge>
          )}
          {item.isControlled && (
            <Badge variant="warning" className="text-[10px]">
              Controlado
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {item.dose && (
          <span>
            Dose: {item.dose} {item.doseUnit ?? ''}
          </span>
        )}
        {item.route && (
          <span>Via: {ROUTE_LABELS[item.route] ?? item.route}</span>
        )}
        {item.frequency && <span>Freq: {item.frequency}</span>}
        {item.duration && <span>Duração: {item.duration}</span>}
      </div>
      {/* IV / Infusion details */}
      {item.route && isIVRoute(item.route) && (item.dilutionSolution || item.infusionRate) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-400">
          <Droplets className="h-3 w-3" />
          {item.dilutionSolution && <span>Diluente: {item.dilutionSolution}</span>}
          {item.dilutionVolume && <span>Volume: {item.dilutionVolume} mL</span>}
          {item.infusionRate && (
            <span>Infusão: {item.infusionRate} {item.infusionRateUnit ?? 'mL/h'}</span>
          )}
        </div>
      )}
      {item.specialInstructions && (
        <p className="text-xs italic text-muted-foreground">
          {item.specialInstructions}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Create Prescription Dialog
// ============================================================================

interface CreatePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreatePrescriptionDialog({
  open,
  onOpenChange,
}: CreatePrescriptionDialogProps) {
  const createPrescription = useCreatePrescription();
  const addPrescriptionItem = useAddPrescriptionItem();
  const [equipType, setEquipType] = useState<'macro' | 'micro'>('macro');
  const [infusionTimeMin, setInfusionTimeMin] = useState<Record<number, string>>({});

  const form = useForm<CreatePrescriptionFormData>({
    resolver: zodResolver(createPrescriptionSchema),
    defaultValues: {
      patientId: '',
      encounterId: '',
      type: 'MEDICATION',
      validFrom: '',
      validUntil: '',
      items: [
        {
          medicationName: '',
          dose: '',
          route: '',
          frequency: '',
          duration: '',
          specialInstructions: '',
          dilutionSolution: '',
          dilutionVolume: '',
          infusionRate: '',
          infusionRateUnit: 'mL/h',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const selectedPatientId = form.watch('patientId');

  // Fetch encounters for the selected patient
  const { data: encountersData } = useEncounters(
    selectedPatientId
      ? { patientId: selectedPatientId, limit: 50 }
      : undefined,
  );
  const encounters = encountersData?.data ?? [];

  const handleSubmit = useCallback(
    async (data: CreatePrescriptionFormData) => {
      try {
        const result = await createPrescription.mutateAsync({
          encounterId: data.encounterId,
          patientId: data.patientId,
          type: data.type as PrescriptionType,
          validFrom: data.validFrom || undefined,
          validUntil: data.validUntil || undefined,
          items: data.items.map((item) => ({
            medicationName: item.medicationName,
            dose: item.dose,
            route: item.route as MedicationRoute,
            frequency: item.frequency,
            duration: item.duration || undefined,
            specialInstructions: item.specialInstructions || undefined,
            dilutionSolution: item.dilutionSolution || undefined,
            dilutionVolume: item.dilutionVolume || undefined,
            infusionRate: item.infusionRate || undefined,
            infusionRateUnit: item.infusionRateUnit || undefined,
          })),
        });

        // If items were not created with the prescription, add them individually
        if (!result.items?.length && data.items.length > 0) {
          for (const item of data.items) {
            await addPrescriptionItem.mutateAsync({
              prescriptionId: result.id,
              item: {
                medicationName: item.medicationName,
                dose: item.dose,
                route: item.route as MedicationRoute,
                frequency: item.frequency,
                duration: item.duration || undefined,
                specialInstructions: item.specialInstructions || undefined,
                dilutionSolution: item.dilutionSolution || undefined,
                dilutionVolume: item.dilutionVolume || undefined,
                infusionRate: item.infusionRate || undefined,
                infusionRateUnit: item.infusionRateUnit || undefined,
              },
            });
          }
        }

        toast.success('Prescrição criada com sucesso.');
        form.reset();
        onOpenChange(false);
      } catch {
        toast.error('Erro ao criar prescrição.');
      }
    },
    [createPrescription, addPrescriptionItem, form, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Prescrição</DialogTitle>
          <DialogDescription>
            Preencha os dados da prescrição e adicione os itens.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Patient select */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
                  <FormControl>
                    <PatientSearchSelect
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Encounter select */}
            <FormField
              control={form.control}
              name="encounterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atendimento</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedPatientId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedPatientId
                              ? 'Selecione o atendimento'
                              : 'Selecione um paciente primeiro'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {encounters.map((enc) => (
                        <SelectItem key={enc.id} value={enc.id}>
                          {enc.type} -{' '}
                          {new Date(
                            enc.startedAt ?? enc.scheduledAt ?? '',
                          ).toLocaleDateString('pt-BR')}
                          {enc.status !== 'COMPLETED'
                            ? ` (${enc.status})`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Validity dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válida a partir de</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-card border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válida até</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-card border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Itens da Prescrição</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      medicationName: '',
                      dose: '',
                      route: '',
                      frequency: '',
                      duration: '',
                      specialInstructions: '',
                      dilutionSolution: '',
                      dilutionVolume: '',
                      infusionRate: '',
                      infusionRateUnit: 'mL/h',
                    })
                  }
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Adicionar Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="border-border bg-card/50">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Item {index + 1}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.medicationName`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Medicamento
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Dipirona 500mg"
                              {...f}
                              className="bg-card border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.dose`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Dose</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: 1 comprimido"
                                {...f}
                                className="bg-card border-border"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.route`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Via</FormLabel>
                            <Select
                              value={f.value}
                              onValueChange={f.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(ROUTE_LABELS).map(
                                  ([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* IV / Infusion Conditional Fields */}
                    {isIVRoute(form.watch(`items.${index}.route`)) && (
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
                          <Droplets className="h-3.5 w-3.5" />
                          Parâmetros de Infusão IV
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.dilutionSolution`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Diluente</FormLabel>
                                <Select value={f.value ?? ''} onValueChange={f.onChange}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione diluente" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {DILUENT_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.dilutionVolume`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Volume diluente (mL)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ex: 250"
                                    {...f}
                                    className="bg-card border-border"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.infusionRate`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Velocidade infusão</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ex: 80"
                                    {...f}
                                    className="bg-card border-border"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.infusionRateUnit`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Unidade</FormLabel>
                                <Select value={f.value ?? 'mL/h'} onValueChange={f.onChange}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="mL/h">mL/h</SelectItem>
                                    <SelectItem value="gotas/min">gotas/min</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Drip Rate Calculator */}
                        <div className="rounded-md border border-border bg-card/50 p-2.5 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Calculator className="h-3 w-3" />
                            Calculadora de Gotejamento
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Equipo:</Label>
                              <div className="flex items-center gap-1.5">
                                <span className={cn('text-xs', equipType === 'macro' ? 'text-blue-400 font-medium' : 'text-muted-foreground')}>Macro</span>
                                <Switch
                                  checked={equipType === 'micro'}
                                  onCheckedChange={(checked) => setEquipType(checked ? 'micro' : 'macro')}
                                />
                                <span className={cn('text-xs', equipType === 'micro' ? 'text-blue-400 font-medium' : 'text-muted-foreground')}>Micro</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs whitespace-nowrap">Tempo (min):</Label>
                              <Input
                                type="number"
                                placeholder="60"
                                value={infusionTimeMin[index] ?? ''}
                                onChange={(e) => setInfusionTimeMin((prev) => ({ ...prev, [index]: e.target.value }))}
                                className="h-7 w-20 bg-card border-border text-xs"
                              />
                            </div>
                          </div>
                          {(() => {
                            const vol = parseFloat(form.watch(`items.${index}.dilutionVolume`) ?? '0');
                            const time = parseFloat(infusionTimeMin[index] ?? '0');
                            if (vol > 0 && time > 0) {
                              const dripRate = calculateDripRate(vol, time, equipType);
                              const mlPerHour = Math.round((vol / time) * 60);
                              return (
                                <div className="flex gap-4 text-xs">
                                  <span className="text-emerald-400 font-medium">{dripRate} gotas/min</span>
                                  <span className="text-muted-foreground">({mlPerHour} mL/h)</span>
                                  <span className="text-muted-foreground">Equipo {equipType === 'macro' ? 'macro (20 gts/mL)' : 'micro (60 gts/mL)'}</span>
                                </div>
                              );
                            }
                            return (
                              <p className="text-[10px] text-muted-foreground">
                                Preencha volume e tempo para calcular o gotejamento.
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.frequency`}
                        render={({ field: f }) => {
                          const scheduleTimes = getSchedulePreview(f.value ?? '');
                          return (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Frequência
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: 8/8h"
                                  {...f}
                                  className="bg-card border-border"
                                />
                              </FormControl>
                              {scheduleTimes.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  <span className="text-[10px] text-muted-foreground mr-1">Horários:</span>
                                  {scheduleTimes.map((time) => (
                                    <Badge
                                      key={time}
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-5 border-primary/40 text-primary cursor-default"
                                    >
                                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                                      {time}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {(f.value?.toLowerCase() === 'sos' || f.value?.toLowerCase() === 'acm') && (
                                <p className="text-[10px] text-muted-foreground">
                                  {f.value.toLowerCase() === 'sos' ? 'Se necessário — sem horários fixos' : 'A critério médico — sem horários fixos'}
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.duration`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Duração</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: 7 dias"
                                {...f}
                                className="bg-card border-border"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.specialInstructions`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Instruções especiais
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Tomar após refeição"
                              {...f}
                              className="bg-card border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}

              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createPrescription.isPending}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {createPrescription.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Criar Prescrição
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Table Row
// ============================================================================

interface PrescriptionRowProps {
  prescription: Prescription;
  onView: () => void;
  onSign: () => void;
  onSuspend: () => void;
  onCancel: () => void;
  onDownloadPdf: () => void;
  isDownloading: boolean;
}

function PrescriptionRow({
  prescription,
  onView,
  onSign,
  onSuspend,
  onCancel,
  onDownloadPdf,
  isDownloading,
}: PrescriptionRowProps) {
  const patientName =
    prescription.patient?.fullName ??
    `Pac. ${prescription.patientId.slice(-6)}`;
  const doctorName =
    prescription.doctor?.name ?? `Dr. ${prescription.doctorId.slice(-6)}`;
  const itemCount = prescription.items?.length ?? 0;
  const canSign =
    !prescription.signedAt &&
    prescription.status !== 'CANCELLED' &&
    prescription.status !== 'COMPLETED';
  const canSuspend = prescription.status === 'ACTIVE';
  const canCancel =
    prescription.status !== 'CANCELLED' &&
    prescription.status !== 'COMPLETED' &&
    prescription.status !== 'EXPIRED';

  return (
    <TableRow>
      <TableCell>
        <div>
          <span className="font-medium">{patientName}</span>
          {prescription.wasGeneratedByAI && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-purple-400">
              <Sparkles className="h-3 w-3" /> IA
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{doctorName}</span>
      </TableCell>
      <TableCell>
        <StatusBadge status={prescription.status} />
      </TableCell>
      <TableCell className="text-center">
        <span className="text-sm">{itemCount}</span>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <SignedIcon signedAt={prescription.signedAt} />
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ver detalhes"
            onClick={onView}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canSign && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400"
              title="Assinar"
              onClick={onSign}
            >
              <PenLine className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Baixar PDF"
            onClick={onDownloadPdf}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          {canSuspend && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-amber-500 hover:text-amber-400"
              title="Suspender"
              onClick={onSuspend}
            >
              <PauseCircle className="h-4 w-4" />
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
              title="Cancelar"
              onClick={onCancel}
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function PrescriptionsPage() {
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Dialog / Sheet state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailSheetId, setDetailSheetId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'sign' | 'suspend' | 'cancel';
    prescriptionId: string;
  } | null>(null);

  // Mutations
  const signPrescription = useSignPrescription();
  const suspendPrescription = useSuspendPrescription();
  const cancelPrescription = useCancelPrescription();
  const downloadPdf = useDownloadPrescriptionPdf();
  const duplicatePrescription = useDuplicatePrescription();

  // Build filters
  const filters = useMemo<PrescriptionFilters>(() => {
    const f: PrescriptionFilters = { page, limit: PAGE_SIZE };
    if (statusFilter !== 'all') f.status = statusFilter;
    if (debouncedSearch) f.patientId = debouncedSearch;
    return f;
  }, [page, statusFilter, debouncedSearch]);

  const { data: prescriptionsData, isLoading, isError, refetch } =
    usePrescriptions(filters);

  const prescriptions = useMemo(() => prescriptionsData?.data ?? [], [prescriptionsData]);
  const totalPages = prescriptionsData?.totalPages ?? 1;
  const total = prescriptionsData?.total ?? 0;

  // KPI calculations
  const kpiValues = useMemo(() => {
    return {
      total,
      active: prescriptions.filter((p) => p.status === 'ACTIVE').length,
      pendingSign: prescriptions.filter(
        (p) => !p.signedAt && p.status !== 'CANCELLED',
      ).length,
      items: prescriptions.reduce(
        (sum, p) => sum + (p.items?.length ?? 0),
        0,
      ),
    };
  }, [prescriptions, total]);

  // Action handlers
  const handleSign = useCallback(async () => {
    if (!confirmAction || confirmAction.type !== 'sign') return;
    try {
      await signPrescription.mutateAsync(confirmAction.prescriptionId);
      toast.success('Prescrição assinada com sucesso.');
    } catch {
      toast.error('Erro ao assinar prescrição.');
    } finally {
      setConfirmAction(null);
    }
  }, [confirmAction, signPrescription]);

  const handleSuspend = useCallback(async () => {
    if (!confirmAction || confirmAction.type !== 'suspend') return;
    try {
      await suspendPrescription.mutateAsync({
        id: confirmAction.prescriptionId,
      });
      toast.success('Prescrição suspensa.');
    } catch {
      toast.error('Erro ao suspender prescrição.');
    } finally {
      setConfirmAction(null);
    }
  }, [confirmAction, suspendPrescription]);

  const handleCancel = useCallback(async () => {
    if (!confirmAction || confirmAction.type !== 'cancel') return;
    try {
      await cancelPrescription.mutateAsync({
        id: confirmAction.prescriptionId,
      });
      toast.success('Prescrição cancelada.');
    } catch {
      toast.error('Erro ao cancelar prescrição.');
    } finally {
      setConfirmAction(null);
    }
  }, [confirmAction, cancelPrescription]);

  const handleDownloadPdf = useCallback(
    async (id: string) => {
      try {
        const blob = await downloadPdf.mutateAsync(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescricao-${id.slice(-8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        toast.error('Erro ao baixar PDF.');
      }
    },
    [downloadPdf],
  );

  const handleDuplicateLast = useCallback(async () => {
    // Find the last ACTIVE or most recent prescription to duplicate
    const lastPrescription = prescriptions.find(
      (p) => p.status === 'ACTIVE',
    ) ?? prescriptions[0];

    if (!lastPrescription) {
      toast.error('Nenhuma prescrição encontrada para copiar.');
      return;
    }

    try {
      const duplicated = await duplicatePrescription.mutateAsync(lastPrescription.id);
      toast.success('Prescrição copiada como rascunho.');
      setDetailSheetId(duplicated.id);
    } catch {
      toast.error('Erro ao copiar prescrição.');
    }
  }, [prescriptions, duplicatePrescription]);

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case 'sign':
        handleSign();
        break;
      case 'suspend':
        handleSuspend();
        break;
      case 'cancel':
        handleCancel();
        break;
    }
  }, [confirmAction, handleSign, handleSuspend, handleCancel]);

  const confirmDialogConfig = useMemo(() => {
    if (!confirmAction)
      return { title: '', description: '', variant: 'default' as const };
    switch (confirmAction.type) {
      case 'sign':
        return {
          title: 'Assinar Prescrição',
          description:
            'Tem certeza que deseja assinar esta prescrição? Esta ação não pode ser desfeita.',
          variant: 'default' as const,
        };
      case 'suspend':
        return {
          title: 'Suspender Prescrição',
          description:
            'Tem certeza que deseja suspender esta prescrição?',
          variant: 'destructive' as const,
        };
      case 'cancel':
        return {
          title: 'Cancelar Prescrição',
          description:
            'Tem certeza que deseja cancelar esta prescrição? Esta ação não pode ser desfeita.',
          variant: 'destructive' as const,
        };
    }
  }, [confirmAction]);

  // Loading / Error states
  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Prescrições</h1>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleDuplicateLast}
                  disabled={duplicatePrescription.isPending || prescriptions.length === 0}
                  className="gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  {duplicatePrescription.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copiar Última
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Duplica a última prescrição ativa como rascunho para edição</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Prescrição
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total',
            value: kpiValues.total,
            icon: FileText,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Ativas',
            value: kpiValues.active,
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Assinatura Pendente',
            value: kpiValues.pendingSign,
            icon: PenLine,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
          },
          {
            label: 'Itens na Página',
            value: kpiValues.items,
            icon: Pill,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    kpi.bg,
                  )}
                >
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID do paciente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48 bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {prescriptions.length === 0 ? (
        <PageEmpty
          icon={FileText}
          title="Nenhuma prescrição encontrada"
          description="Crie uma nova prescrição para começar."
          actionLabel="Nova Prescrição"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : (
        <Card className="border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-center">Assinada</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((prescription) => (
                  <PrescriptionRow
                    key={prescription.id}
                    prescription={prescription}
                    onView={() => setDetailSheetId(prescription.id)}
                    onSign={() =>
                      setConfirmAction({
                        type: 'sign',
                        prescriptionId: prescription.id,
                      })
                    }
                    onSuspend={() =>
                      setConfirmAction({
                        type: 'suspend',
                        prescriptionId: prescription.id,
                      })
                    }
                    onCancel={() =>
                      setConfirmAction({
                        type: 'cancel',
                        prescriptionId: prescription.id,
                      })
                    }
                    onDownloadPdf={() => handleDownloadPdf(prescription.id)}
                    isDownloading={downloadPdf.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({total} prescrições)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Detail Sheet */}
      <PrescriptionDetailSheet
        prescriptionId={detailSheetId}
        onClose={() => setDetailSheetId(null)}
      />

      {/* Create Dialog */}
      <CreatePrescriptionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmDialogConfig.title}
        description={confirmDialogConfig.description}
        variant={confirmDialogConfig.variant}
        confirmLabel={
          confirmAction?.type === 'sign'
            ? 'Assinar'
            : confirmAction?.type === 'suspend'
              ? 'Suspender'
              : 'Cancelar Prescrição'
        }
        onConfirm={handleConfirmAction}
        loading={
          signPrescription.isPending ||
          suspendPrescription.isPending ||
          cancelPrescription.isPending
        }
      />
    </div>
  );
}
