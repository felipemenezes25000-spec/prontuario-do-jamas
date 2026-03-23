import { useState, useMemo, useCallback } from 'react';
import {
  Scissors,
  Clock,
  Circle,
  Wrench,
  ClipboardCheck,
  Stethoscope,
  FileText,
  Package,
  Timer,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useSurgicalProcedures,
  useUpdateSurgicalProcedure,
  useRecordSurgicalTime,
} from '@/services/surgical.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type {
  SurgicalProcedure,
  AnesthesiaDrug,
  IntraopVitalRecord,
  FluidBalanceEntry,
  FluidBalanceData,
  OpmeItem,
  AnesthesiaData,
  IntubationData,
  VenousAccessData,
} from '@/types';

// ============================================================================
// Constants
// ============================================================================

interface SurgicalRoom {
  id: string;
  name: string;
  status: 'FREE' | 'IN_USE' | 'CLEANING' | 'MAINTENANCE';
  currentProcedure?: string;
  patient?: string;
  team?: string;
  elapsedMinutes?: number;
}

const roomStatusConfig = {
  FREE: { label: 'Livre', color: 'border-green-500/40', bg: 'bg-green-500', icon: Circle },
  IN_USE: { label: 'Em Uso', color: 'border-red-500/40', bg: 'bg-red-500', icon: Scissors },
  CLEANING: { label: 'Limpeza', color: 'border-yellow-500/40', bg: 'bg-yellow-500', icon: Circle },
  MAINTENANCE: { label: 'Manutencao', color: 'border-muted-foreground/40', bg: 'bg-muted-foreground/80', icon: Wrench },
};

const checklistPhases = [
  {
    name: 'Sign In',
    subtitle: 'Antes da inducao anestesica',
    field: 'safetyChecklistBefore' as const,
    items: [
      'Identidade do paciente confirmada',
      'Procedimento e local marcados',
      'Consentimento assinado',
      'Oximetro funcionando',
      'Alergias conhecidas verificadas',
      'Risco de via aerea dificil avaliado',
      'Risco de perda sanguinea avaliado',
    ],
  },
  {
    name: 'Time Out',
    subtitle: 'Antes da incisao',
    field: 'safetyChecklistDuring' as const,
    items: [
      'Equipe apresentada com nomes e funcoes',
      'Cirurgiao confirma: paciente, procedimento, incisao',
      'Profilaxia antibiotica (ultimos 60min)',
      'Imagens disponiveis',
      'Eventos criticos antecipados',
    ],
  },
  {
    name: 'Sign Out',
    subtitle: 'Antes do paciente sair da sala',
    field: 'safetyChecklistAfter' as const,
    items: [
      'Procedimento registrado',
      'Contagem de instrumentos/compressas correta',
      'Pecas identificadas e rotuladas',
      'Problemas com equipamentos relatados',
      'Cuidados pos-operatorios definidos',
    ],
  },
];

const ANESTHESIA_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'Geral',
  SPINAL: 'Raquidiana',
  EPIDURAL: 'Peridural',
  LOCAL: 'Local',
  REGIONAL_BLOCK: 'Bloqueio Regional',
  SEDATION: 'Sedacao',
  COMBINED: 'Combinada',
  TOPICAL: 'Topica',
  NONE: 'Nenhuma',
};

const SURGICAL_TIME_FIELDS = [
  { field: 'patientInAt' as const, label: 'Entrada na Sala' },
  { field: 'anesthesiaStartAt' as const, label: 'Inicio Anestesia' },
  { field: 'incisionAt' as const, label: 'Incisao' },
  { field: 'sutureAt' as const, label: 'Fechamento' },
  { field: 'anesthesiaEndAt' as const, label: 'Fim Anestesia' },
  { field: 'patientOutAt' as const, label: 'Saida da Sala' },
];

// ============================================================================
// Helpers
// ============================================================================

function deriveSurgicalRooms(procedures: SurgicalProcedure[]): SurgicalRoom[] {
  const roomNames = ['Sala 01', 'Sala 02', 'Sala 03', 'Sala 04', 'Sala 05', 'Sala 06'];
  const inProgress = procedures.filter((p) => p.status === 'IN_PROGRESS');
  return roomNames.map((name, i) => {
    const proc = inProgress[i];
    if (proc) {
      const elapsed = proc.incisionAt
        ? Math.floor((Date.now() - new Date(proc.incisionAt).getTime()) / 60000)
        : proc.patientInAt
          ? Math.floor((Date.now() - new Date(proc.patientInAt).getTime()) / 60000)
          : 0;
      return {
        id: `sr-${String(i + 1).padStart(2, '0')}`,
        name,
        status: 'IN_USE' as const,
        currentProcedure: proc.procedureName,
        patient: proc.patient?.name ?? `Paciente ${proc.patientId.slice(-6)}`,
        team: proc.surgeon?.name ?? 'Equipe cirurgica',
        elapsedMinutes: elapsed,
      };
    }
    return {
      id: `sr-${String(i + 1).padStart(2, '0')}`,
      name,
      status: (i === 3 ? 'CLEANING' : i === 4 ? 'MAINTENANCE' : 'FREE') as SurgicalRoom['status'],
    };
  });
}

function formatTime(date: string | undefined): string {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// Main Page
// ============================================================================

export default function SurgicalPage() {
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<
    'checklist' | 'anesthesia' | 'operative' | 'opme' | 'times' | null
  >(null);

  const { data: proceduresData, isLoading, isError, refetch } = useSurgicalProcedures();
  const allProcedures = proceduresData?.data ?? [];

  const surgicalRooms = useMemo(() => deriveSurgicalRooms(allProcedures), [allProcedures]);

  const todayProcedures = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return allProcedures.filter((p) => {
      const schedDate = p.scheduledAt ? p.scheduledAt.slice(0, 10) : '';
      return schedDate === today || p.status === 'IN_PROGRESS';
    });
  }, [allProcedures]);

  const procedure = selectedProcedure ? allProcedures.find((p) => p.id === selectedProcedure) : null;

  const openDialog = useCallback((procId: string, dialog: typeof activeDialog) => {
    setSelectedProcedure(procId);
    setActiveDialog(dialog);
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
    setSelectedProcedure(null);
  }, []);

  if (isLoading) return <PageLoading cards={6} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Centro Cirurgico</h1>

      {/* Room Map */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Mapa de Salas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {surgicalRooms.map((room) => {
            const config = roomStatusConfig[room.status];
            return (
              <Card key={room.id} className={cn('border-2', config.color, 'bg-card')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{room.name}</span>
                    <div className={cn('h-2.5 w-2.5 rounded-full', config.bg)} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{config.label}</p>
                  {room.status === 'IN_USE' && (
                    <div className="mt-2 space-y-1">
                      <p className="truncate text-xs font-medium">{room.currentProcedure}</p>
                      <p className="text-[10px] text-muted-foreground">{room.patient}</p>
                      <div className="flex items-center gap-1 text-[10px] text-amber-400">
                        <Clock className="h-3 w-3" />
                        {room.elapsedMinutes}min
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Daily Schedule */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Programacao do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {todayProcedures.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Scissors className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Nenhum procedimento agendado para hoje</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayProcedures.map((proc) => {
                const time = proc.scheduledAt
                  ? new Date(proc.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '--';
                return (
                  <div
                    key={proc.id}
                    className="rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center w-12">
                        <p className="text-sm font-bold">{time}</p>
                      </div>
                      <div className="h-8 w-px bg-secondary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{proc.procedureName}</p>
                        <p className="text-xs text-muted-foreground">
                          {proc.patient?.name ?? `Paciente ${proc.patientId.slice(-6)}`} — {proc.surgeon?.name ?? 'Cirurgiao'}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] text-white',
                          proc.status === 'IN_PROGRESS' ? 'bg-teal-600' : proc.status === 'COMPLETED' ? 'bg-muted-foreground/80' : 'bg-muted-foreground',
                        )}
                      >
                        {proc.status === 'IN_PROGRESS' ? 'Em Andamento' : proc.status === 'COMPLETED' ? 'Concluido' : 'Agendado'}
                      </Badge>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-2 flex flex-wrap gap-1.5 ml-[60px]">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => openDialog(proc.id, 'checklist')}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Checklist
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => openDialog(proc.id, 'anesthesia')}
                      >
                        <Stethoscope className="h-3.5 w-3.5" />
                        Anestesia
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => openDialog(proc.id, 'operative')}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Nota Operatoria
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => openDialog(proc.id, 'opme')}
                      >
                        <Package className="h-3.5 w-3.5" />
                        OPME
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => openDialog(proc.id, 'times')}
                      >
                        <Timer className="h-3.5 w-3.5" />
                        Tempos
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {procedure && activeDialog === 'checklist' && (
        <ChecklistDialog procedure={procedure} onClose={closeDialog} />
      )}
      {procedure && activeDialog === 'anesthesia' && (
        <AnesthesiaRecordDialog procedure={procedure} onClose={closeDialog} />
      )}
      {procedure && activeDialog === 'operative' && (
        <OperativeNoteDialog procedure={procedure} onClose={closeDialog} />
      )}
      {procedure && activeDialog === 'opme' && (
        <OpmeDialog procedure={procedure} onClose={closeDialog} />
      )}
      {procedure && activeDialog === 'times' && (
        <SurgicalTimesDialog procedure={procedure} onClose={closeDialog} />
      )}
    </div>
  );
}

// ============================================================================
// Checklist Dialog (OMS Safety Checklist)
// ============================================================================

function ChecklistDialog({
  procedure,
  onClose,
}: {
  procedure: SurgicalProcedure;
  onClose: () => void;
}) {
  const updateProcedure = useUpdateSurgicalProcedure();

  // Initialize checked items from procedure data
  const [checkedItems, setCheckedItems] = useState<Record<string, { checked: boolean; timestamp?: string }>>(() => {
    const initial: Record<string, { checked: boolean; timestamp?: string }> = {};
    for (const phase of checklistPhases) {
      const saved = procedure[phase.field] as
        | { items?: Array<{ item: string; checked: boolean; timestamp?: string }> }
        | undefined;
      const savedItems = saved?.items ?? [];
      for (const item of phase.items) {
        const key = `${phase.name}-${item}`;
        const found = savedItems.find((s) => s.item === item);
        initial[key] = { checked: found?.checked ?? false, timestamp: found?.timestamp };
      }
    }
    return initial;
  });

  const toggleCheck = (phaseKey: string, item: string) => {
    const key = `${phaseKey}-${item}`;
    setCheckedItems((prev) => ({
      ...prev,
      [key]: {
        checked: !prev[key]?.checked,
        timestamp: !prev[key]?.checked ? new Date().toISOString() : undefined,
      },
    }));
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {};
    for (const phase of checklistPhases) {
      const items = phase.items.map((item) => {
        const key = `${phase.name}-${item}`;
        return {
          item,
          checked: checkedItems[key]?.checked ?? false,
          timestamp: checkedItems[key]?.timestamp,
        };
      });
      const allChecked = items.every((i) => i.checked);
      payload[phase.field] = {
        items,
        completedAt: allChecked ? new Date().toISOString() : undefined,
      };
    }
    updateProcedure.mutate({ id: procedure.id, ...payload } as Partial<SurgicalProcedure> & { id: string });
    onClose();
  };

  const totalItems = checklistPhases.reduce((sum, p) => sum + p.items.length, 0);
  const checkedCount = Object.values(checkedItems).filter((v) => v.checked).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-500" />
            Checklist de Seguranca Cirurgica — OMS
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{procedure.procedureName}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{checkedCount}/{totalItems}</span>
          </div>
        </div>

        <div className="space-y-4">
          {checklistPhases.map((phase) => (
            <div key={phase.name} className="rounded-lg border border-border p-3">
              <h4 className="text-sm font-medium">{phase.name}</h4>
              <p className="text-[10px] text-muted-foreground mb-2">{phase.subtitle}</p>
              <div className="space-y-2">
                {phase.items.map((item) => {
                  const key = `${phase.name}-${item}`;
                  const entry = checkedItems[key];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={entry?.checked ?? false}
                        onCheckedChange={() => toggleCheck(phase.name, item)}
                        className="border-border"
                      />
                      <span className={cn('text-xs flex-1', entry?.checked ? 'text-muted-foreground line-through' : '')}>
                        {item}
                      </span>
                      {entry?.checked && entry.timestamp && (
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateProcedure.isPending}>
            {updateProcedure.isPending ? 'Salvando...' : 'Salvar Checklist'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Anesthesia Record Dialog (Ficha Anestesica + Balanco Hidrico + Vitais)
// ============================================================================

function AnesthesiaRecordDialog({
  procedure,
  onClose,
}: {
  procedure: SurgicalProcedure;
  onClose: () => void;
}) {
  const updateProcedure = useUpdateSurgicalProcedure();

  // Anesthesia drugs
  const [drugs, setDrugs] = useState<AnesthesiaDrug[]>(
    procedure.anesthesiaData?.drugs ?? [],
  );

  // Intubation
  const [intubation, setIntubation] = useState<IntubationData>(
    procedure.anesthesiaData?.intubation ?? { tubeType: '', tubeNumber: '', fixation: '' },
  );

  // Venous access
  const [venousAccess, setVenousAccess] = useState<VenousAccessData>(
    procedure.anesthesiaData?.venousAccess ?? { type: '', gauge: '', site: '' },
  );

  // Patient position
  const [patientPosition, setPatientPosition] = useState(
    procedure.anesthesiaData?.patientPosition ?? '',
  );

  // Intraop vitals
  const [vitals, setVitals] = useState<IntraopVitalRecord[]>(
    procedure.intraopVitals ?? [],
  );

  // Fluid balance
  const [fluidInputs, setFluidInputs] = useState<FluidBalanceEntry[]>(
    procedure.fluidBalance?.inputs ?? [],
  );
  const [fluidOutputs, setFluidOutputs] = useState<FluidBalanceEntry[]>(
    procedure.fluidBalance?.outputs ?? [],
  );

  const addDrug = () => setDrugs((prev) => [...prev, { name: '', dose: '', route: 'IV', time: '' }]);
  const removeDrug = (index: number) => setDrugs((prev) => prev.filter((_, i) => i !== index));
  const updateDrug = (index: number, field: keyof AnesthesiaDrug, value: string) => {
    setDrugs((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const addVital = () => {
    setVitals((prev) => [
      ...prev,
      { time: new Date().toISOString(), systolicBp: 120, diastolicBp: 80, heartRate: 72, spo2: 98, etco2: 35 },
    ]);
  };
  const removeVital = (index: number) => setVitals((prev) => prev.filter((_, i) => i !== index));

  const addFluidInput = () => setFluidInputs((prev) => [...prev, { type: 'Cristaloide', volume: 0 }]);
  const addFluidOutput = () => setFluidOutputs((prev) => [...prev, { type: 'Diurese', volume: 0 }]);
  const removeFluidInput = (index: number) => setFluidInputs((prev) => prev.filter((_, i) => i !== index));
  const removeFluidOutput = (index: number) => setFluidOutputs((prev) => prev.filter((_, i) => i !== index));

  const totalInputs = fluidInputs.reduce((s, e) => s + e.volume, 0);
  const totalOutputs = fluidOutputs.reduce((s, e) => s + e.volume, 0);
  const netBalance = totalInputs - totalOutputs;

  const handleSave = () => {
    const anesthesiaData: AnesthesiaData = {
      drugs,
      intubation: intubation.tubeType ? intubation : undefined,
      venousAccess: venousAccess.type ? venousAccess : undefined,
      patientPosition: patientPosition || undefined,
    };
    const fluidBalance: FluidBalanceData = { inputs: fluidInputs, outputs: fluidOutputs };
    updateProcedure.mutate({
      id: procedure.id,
      anesthesiaData,
      intraopVitals: vitals,
      fluidBalance,
    } as Partial<SurgicalProcedure> & { id: string });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-500" />
            Ficha Anestesica — {procedure.procedureName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="drugs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="drugs">Drogas</TabsTrigger>
            <TabsTrigger value="vitals">Sinais Vitais</TabsTrigger>
            <TabsTrigger value="fluids">Balanco Hidrico</TabsTrigger>
            <TabsTrigger value="access">Acesso/Posicao</TabsTrigger>
          </TabsList>

          {/* Drugs Tab */}
          <TabsContent value="drugs" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Drogas Anestesicas</p>
              {procedure.anesthesiaType && (
                <Badge variant="secondary" className="text-xs">
                  {ANESTHESIA_TYPE_LABELS[procedure.anesthesiaType] ?? procedure.anesthesiaType}
                </Badge>
              )}
            </div>
            {drugs.map((drug, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end">
                <div>
                  <Label className="text-[10px]">Droga</Label>
                  <Input
                    value={drug.name}
                    onChange={(e) => updateDrug(i, 'name', e.target.value)}
                    placeholder="Propofol"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Dose</Label>
                  <Input
                    value={drug.dose}
                    onChange={(e) => updateDrug(i, 'dose', e.target.value)}
                    placeholder="200mg"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Via</Label>
                  <Select value={drug.route} onValueChange={(v) => updateDrug(i, 'route', v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IV">IV</SelectItem>
                      <SelectItem value="IM">IM</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="VO">VO</SelectItem>
                      <SelectItem value="Inalatoria">Inalatoria</SelectItem>
                      <SelectItem value="Peridural">Peridural</SelectItem>
                      <SelectItem value="Subaracnoidea">Subaracnoidea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Horario</Label>
                  <Input
                    type="time"
                    value={drug.time}
                    onChange={(e) => updateDrug(i, 'time', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeDrug(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addDrug} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar Droga
            </Button>
          </TabsContent>

          {/* Vitals Tab */}
          <TabsContent value="vitals" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Sinais Vitais Intraoperatorios</p>
              <Button variant="outline" size="sm" onClick={addVital} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Registrar
              </Button>
            </div>

            {vitals.length > 0 && (
              <Card className="border-border bg-card p-3">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={vitals.map((v) => ({
                    ...v,
                    label: new Date(v.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                    <Line type="monotone" dataKey="systolicBp" stroke="#ef4444" name="PAS" dot={{ r: 2 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="diastolicBp" stroke="#f97316" name="PAD" dot={{ r: 2 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="heartRate" stroke="#10b981" name="FC" dot={{ r: 2 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="spo2" stroke="#3b82f6" name="SpO2" dot={{ r: 2 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="etco2" stroke="#8b5cf6" name="EtCO2" dot={{ r: 2 }} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {vitals.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Hora</TableHead>
                      <TableHead className="text-[10px]">PAS</TableHead>
                      <TableHead className="text-[10px]">PAD</TableHead>
                      <TableHead className="text-[10px]">FC</TableHead>
                      <TableHead className="text-[10px]">SpO2</TableHead>
                      <TableHead className="text-[10px]">EtCO2</TableHead>
                      <TableHead className="text-[10px]">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vitals.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {new Date(v.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs"
                            value={v.systolicBp ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              setVitals((prev) => prev.map((vi, idx) => idx === i ? { ...vi, systolicBp: val } : vi));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs"
                            value={v.diastolicBp ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              setVitals((prev) => prev.map((vi, idx) => idx === i ? { ...vi, diastolicBp: val } : vi));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs"
                            value={v.heartRate ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              setVitals((prev) => prev.map((vi, idx) => idx === i ? { ...vi, heartRate: val } : vi));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs"
                            value={v.spo2 ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              setVitals((prev) => prev.map((vi, idx) => idx === i ? { ...vi, spo2: val } : vi));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs"
                            value={v.etco2 ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              setVitals((prev) => prev.map((vi, idx) => idx === i ? { ...vi, etco2: val } : vi));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeVital(i)}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Fluids Tab */}
          <TabsContent value="fluids" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Entradas</p>
                <p className="text-lg font-bold text-blue-400">{totalInputs} mL</p>
              </Card>
              <Card className="border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Saidas</p>
                <p className="text-lg font-bold text-red-400">{totalOutputs} mL</p>
              </Card>
              <Card className="border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Balanco</p>
                <p className={cn('text-lg font-bold', netBalance >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {netBalance >= 0 ? '+' : ''}{netBalance} mL
                </p>
              </Card>
            </div>

            {/* Inputs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-400">Entradas</p>
                <Button variant="outline" size="sm" onClick={addFluidInput} className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
              {fluidInputs.map((entry, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                  <div>
                    <Label className="text-[10px]">Tipo</Label>
                    <Select
                      value={entry.type}
                      onValueChange={(v) =>
                        setFluidInputs((prev) => prev.map((e, idx) => idx === i ? { ...e, type: v } : e))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cristaloide">Cristaloide</SelectItem>
                        <SelectItem value="Coloide">Coloide</SelectItem>
                        <SelectItem value="Concentrado Hemacias">Conc. Hemacias</SelectItem>
                        <SelectItem value="Plasma Fresco">Plasma Fresco</SelectItem>
                        <SelectItem value="Plaquetas">Plaquetas</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Volume (mL)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={entry.volume || ''}
                      onChange={(e) =>
                        setFluidInputs((prev) => prev.map((en, idx) => idx === i ? { ...en, volume: Number(e.target.value) || 0 } : en))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Descricao</Label>
                    <Input
                      className="h-8 text-xs"
                      value={entry.description ?? ''}
                      onChange={(e) =>
                        setFluidInputs((prev) => prev.map((en, idx) => idx === i ? { ...en, description: e.target.value } : en))
                      }
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeFluidInput(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Outputs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-400">Saidas</p>
                <Button variant="outline" size="sm" onClick={addFluidOutput} className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
              {fluidOutputs.map((entry, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                  <div>
                    <Label className="text-[10px]">Tipo</Label>
                    <Select
                      value={entry.type}
                      onValueChange={(v) =>
                        setFluidOutputs((prev) => prev.map((e, idx) => idx === i ? { ...e, type: v } : e))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diurese">Diurese</SelectItem>
                        <SelectItem value="Sangramento">Sangramento</SelectItem>
                        <SelectItem value="Aspiracao">Aspiracao</SelectItem>
                        <SelectItem value="Dreno">Dreno</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Volume (mL)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={entry.volume || ''}
                      onChange={(e) =>
                        setFluidOutputs((prev) => prev.map((en, idx) => idx === i ? { ...en, volume: Number(e.target.value) || 0 } : en))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Descricao</Label>
                    <Input
                      className="h-8 text-xs"
                      value={entry.description ?? ''}
                      onChange={(e) =>
                        setFluidOutputs((prev) => prev.map((en, idx) => idx === i ? { ...en, description: e.target.value } : en))
                      }
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeFluidOutput(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Access / Position Tab */}
          <TabsContent value="access" className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Intubacao</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px]">Tipo de Tubo</Label>
                  <Input
                    className="h-8 text-xs"
                    value={intubation.tubeType}
                    onChange={(e) => setIntubation((p) => ({ ...p, tubeType: e.target.value }))}
                    placeholder="Orotraqueal"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Numero</Label>
                  <Input
                    className="h-8 text-xs"
                    value={intubation.tubeNumber}
                    onChange={(e) => setIntubation((p) => ({ ...p, tubeNumber: e.target.value }))}
                    placeholder="7.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Fixacao</Label>
                  <Input
                    className="h-8 text-xs"
                    value={intubation.fixation}
                    onChange={(e) => setIntubation((p) => ({ ...p, fixation: e.target.value }))}
                    placeholder="22cm"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Acesso Venoso</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px]">Tipo</Label>
                  <Input
                    className="h-8 text-xs"
                    value={venousAccess.type}
                    onChange={(e) => setVenousAccess((p) => ({ ...p, type: e.target.value }))}
                    placeholder="Periferico"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Calibre</Label>
                  <Input
                    className="h-8 text-xs"
                    value={venousAccess.gauge}
                    onChange={(e) => setVenousAccess((p) => ({ ...p, gauge: e.target.value }))}
                    placeholder="18G"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Local</Label>
                  <Input
                    className="h-8 text-xs"
                    value={venousAccess.site}
                    onChange={(e) => setVenousAccess((p) => ({ ...p, site: e.target.value }))}
                    placeholder="MSE"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Posicao do Paciente</p>
              <Select value={patientPosition} onValueChange={setPatientPosition}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar posicao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supina">Supina (DDH)</SelectItem>
                  <SelectItem value="Prona">Prona (DV)</SelectItem>
                  <SelectItem value="Lateral Esquerda">Lateral Esquerda</SelectItem>
                  <SelectItem value="Lateral Direita">Lateral Direita</SelectItem>
                  <SelectItem value="Litotomia">Litotomia</SelectItem>
                  <SelectItem value="Trendelenburg">Trendelenburg</SelectItem>
                  <SelectItem value="Trendelenburg Reverso">Trendelenburg Reverso</SelectItem>
                  <SelectItem value="Sentada">Sentada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateProcedure.isPending}>
            {updateProcedure.isPending ? 'Salvando...' : 'Salvar Ficha'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Operative Note Dialog (Nota Operatoria)
// ============================================================================

function OperativeNoteDialog({
  procedure,
  onClose,
}: {
  procedure: SurgicalProcedure;
  onClose: () => void;
}) {
  const updateProcedure = useUpdateSurgicalProcedure();

  const [description, setDescription] = useState(procedure.surgicalDescription ?? '');
  const [complications, setComplications] = useState(procedure.complications ?? '');
  const [bloodLoss, setBloodLoss] = useState<string>(
    procedure.bloodLoss != null ? String(procedure.bloodLoss) : '',
  );

  const handleSave = () => {
    updateProcedure.mutate({
      id: procedure.id,
      surgicalDescription: description,
      complications: complications || undefined,
      bloodLoss: bloodLoss ? Number(bloodLoss) : undefined,
    } as Partial<SurgicalProcedure> & { id: string });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            Nota Operatoria — {procedure.procedureName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="surg-desc">Descricao Cirurgica</Label>
            <Textarea
              id="surg-desc"
              rows={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`PROCEDIMENTO REALIZADO: ${procedure.procedureName}\n\nTECNICA:\n1. Antissepsia e colocacao de campos estereis\n2. \n\nACHADOS:\n\nINTERCORRENCIAS:\n\nDRENOS:\n\nIMPLANTES:`}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="complications">Intercorrencias / Complicacoes</Label>
              <Textarea
                id="complications"
                rows={3}
                value={complications}
                onChange={(e) => setComplications(e.target.value)}
                placeholder="Descreva intercorrencias, se houver..."
                className="text-xs"
              />
            </div>
            <div>
              <Label htmlFor="blood-loss">Sangramento Estimado (mL)</Label>
              <Input
                id="blood-loss"
                type="number"
                min="0"
                value={bloodLoss}
                onChange={(e) => setBloodLoss(e.target.value)}
                placeholder="0"
                className="h-10"
              />
              {Number(bloodLoss) > 1000 && (
                <p className="text-xs text-red-400 mt-1">Sangramento significativo (&gt; 1000mL)</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateProcedure.isPending}>
            {updateProcedure.isPending ? 'Salvando...' : 'Salvar Nota'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// OPME Dialog (Orteses, Proteses e Materiais Especiais)
// ============================================================================

function OpmeDialog({
  procedure,
  onClose,
}: {
  procedure: SurgicalProcedure;
  onClose: () => void;
}) {
  const updateProcedure = useUpdateSurgicalProcedure();
  const [items, setItems] = useState<OpmeItem[]>(procedure.opmeData ?? []);

  const addItem = () =>
    setItems((prev) => [...prev, { name: '', anvisaCode: '', lot: '', expiry: '', supplier: '', quantity: 1 }]);

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof OpmeItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSave = () => {
    updateProcedure.mutate({
      id: procedure.id,
      opmeData: items,
    } as Partial<SurgicalProcedure> & { id: string });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-500" />
            OPME — Materiais Especiais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {items.map((item, i) => (
            <Card key={i} className="border-border p-3">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="col-span-2">
                  <Label className="text-[10px]">Nome do Material</Label>
                  <Input
                    className="h-8 text-xs"
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                    placeholder="Protese de quadril cimentada"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 text-xs"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', Number(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px]">Codigo ANVISA</Label>
                  <Input
                    className="h-8 text-xs"
                    value={item.anvisaCode ?? ''}
                    onChange={(e) => updateItem(i, 'anvisaCode', e.target.value)}
                    placeholder="80000000000"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Lote</Label>
                  <Input
                    className="h-8 text-xs"
                    value={item.lot ?? ''}
                    onChange={(e) => updateItem(i, 'lot', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Validade</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={item.expiry ?? ''}
                    onChange={(e) => updateItem(i, 'expiry', e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-1">
                  <div className="flex-1">
                    <Label className="text-[10px]">Fornecedor</Label>
                    <Input
                      className="h-8 text-xs"
                      value={item.supplier ?? ''}
                      onChange={(e) => updateItem(i, 'supplier', e.target.value)}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => removeItem(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Adicionar Material
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateProcedure.isPending}>
            {updateProcedure.isPending ? 'Salvando...' : 'Salvar OPME'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Surgical Times Dialog (Registros de Tempo)
// ============================================================================

function SurgicalTimesDialog({
  procedure,
  onClose,
}: {
  procedure: SurgicalProcedure;
  onClose: () => void;
}) {
  const recordTime = useRecordSurgicalTime();

  const handleRecordTime = (field: (typeof SURGICAL_TIME_FIELDS)[number]['field']) => {
    recordTime.mutate({
      id: procedure.id,
      field,
      timestamp: new Date().toISOString(),
    });
  };

  // Build timeline data
  const timelineEntries = SURGICAL_TIME_FIELDS.map((tf) => ({
    ...tf,
    value: procedure[tf.field] as string | undefined,
  }));

  // Calculate durations between sequential steps
  const getDuration = (start: string | undefined, end: string | undefined): string | null => {
    if (!start || !end) return null;
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (diff < 0) return null;
    return `${diff}min`;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-emerald-500" />
            Tempos Cirurgicos — {procedure.procedureName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {timelineEntries.map((entry, i) => {
            const prevEntry = i > 0 ? timelineEntries[i - 1] : null;
            const duration = prevEntry ? getDuration(prevEntry.value, entry.value) : null;
            return (
              <div key={entry.field}>
                {duration && (
                  <div className="flex items-center ml-4 py-0.5">
                    <div className="w-px h-4 bg-border" />
                    <span className="text-[9px] text-muted-foreground ml-2">{duration}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                  <div className={cn(
                    'h-3 w-3 rounded-full shrink-0',
                    entry.value ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{entry.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.value ? formatTime(entry.value) : 'Nao registrado'}
                    </p>
                  </div>
                  {!entry.value && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleRecordTime(entry.field)}
                      disabled={recordTime.isPending}
                    >
                      Registrar Agora
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total surgery time */}
        {procedure.patientInAt && procedure.patientOutAt && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 mt-2">
            <span className="text-xs text-muted-foreground">Tempo Total</span>
            <span className="text-sm font-bold text-emerald-400">
              {getDuration(procedure.patientInAt, procedure.patientOutAt) ?? '--'}
            </span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
