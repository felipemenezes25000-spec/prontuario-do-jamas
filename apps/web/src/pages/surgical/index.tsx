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
  BarChart2,
  Brain,
  ListChecks,
  BookOpen,
  CheckSquare,
  Zap,
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
import { toast } from 'sonner';
import {
  useSurgicalProcedures,
  useUpdateSurgicalProcedure,
  useRecordSurgicalTime,
  useCreateSpongeCount,
  useCreateApa,
  useUtilizationMetrics,
  usePreferenceCards,
  useCreatePreferenceCard,
  useCreateErasChecklist,
  useEstimateDuration,
  useSurgeryVideos,
  useStartVideoRecording,
  useStopVideoRecording,
  type SpongeCountItem,
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

      {/* New Feature Tabs */}
      <Tabs defaultValue="sponge" className="mt-2">
        <TabsList className="bg-card border border-border flex flex-wrap h-auto gap-1">
          <TabsTrigger value="sponge" className="gap-1 text-xs">
            <CheckSquare className="h-3.5 w-3.5" /> Compressas
          </TabsTrigger>
          <TabsTrigger value="apa" className="gap-1 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> APA
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1 text-xs">
            <BarChart2 className="h-3.5 w-3.5" /> Metricas CC
          </TabsTrigger>
          <TabsTrigger value="preference" className="gap-1 text-xs">
            <ListChecks className="h-3.5 w-3.5" /> Preference Cards
          </TabsTrigger>
          <TabsTrigger value="eras" className="gap-1 text-xs">
            <ClipboardCheck className="h-3.5 w-3.5" /> ERAS
          </TabsTrigger>
          <TabsTrigger value="ai-duration" className="gap-1 text-xs">
            <Zap className="h-3.5 w-3.5" /> Duracao IA
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-1 text-xs">
            <FileText className="h-3.5 w-3.5" /> Video Cirúrgico
          </TabsTrigger>
        </TabsList>

        {/* Contagem de Compressas */}
        <TabsContent value="sponge">
          <SpongeCountSection procedures={allProcedures} />
        </TabsContent>

        {/* APA */}
        <TabsContent value="apa">
          <ApaSection procedures={allProcedures} />
        </TabsContent>

        {/* Metricas CC */}
        <TabsContent value="metrics">
          <MetricsSection />
        </TabsContent>

        {/* Preference Cards */}
        <TabsContent value="preference">
          <PreferenceCardSection />
        </TabsContent>

        {/* ERAS */}
        <TabsContent value="eras">
          <ErasSection procedures={allProcedures} />
        </TabsContent>

        {/* Estimativa IA */}
        <TabsContent value="ai-duration">
          <AiDurationSection />
        </TabsContent>

        {/* Video Cirúrgico */}
        <TabsContent value="video">
          <VideoSection procedures={allProcedures} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Sponge Count Section
// ============================================================================

const DEFAULT_SPONGE_ITEMS: SpongeCountItem[] = [
  { name: 'Compressa Cirurgica Grande', expectedCount: 0, actualCount: 0 },
  { name: 'Compressa Pequena', expectedCount: 0, actualCount: 0 },
  { name: 'Gaze', expectedCount: 0, actualCount: 0 },
  { name: 'Bisturi', expectedCount: 0, actualCount: 0 },
  { name: 'Agulha', expectedCount: 0, actualCount: 0 },
  { name: 'Tesoura', expectedCount: 0, actualCount: 0 },
];

function SpongeCountSection({ procedures }: { procedures: SurgicalProcedure[] }) {
  const createCount = useCreateSpongeCount();
  const [procedureId, setProcedureId] = useState('');
  const [phase, setPhase] = useState<'BEFORE' | 'AFTER'>('BEFORE');
  const [items, setItems] = useState<SpongeCountItem[]>(DEFAULT_SPONGE_ITEMS.map((i) => ({ ...i })));
  const [observations, setObservations] = useState('');

  const updateItem = (index: number, field: keyof SpongeCountItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: field === 'name' ? value : Number(value) } : item)));
  };

  const hasDiscrepancy = items.some((i) => phase === 'AFTER' && i.expectedCount !== i.actualCount);

  const handleSave = () => {
    if (!procedureId) return;
    createCount.mutate(
      { procedureId, phase, items, observations: observations || undefined },
      { onSuccess: () => { setObservations(''); } },
    );
  };

  return (
    <Card className="border-border bg-card mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-emerald-500" />
          Contagem de Compressas e Instrumentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Procedimento</Label>
            <Select value={procedureId} onValueChange={setProcedureId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {procedures.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.procedureName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fase</Label>
            <Select value={phase} onValueChange={(v) => setPhase(v as 'BEFORE' | 'AFTER')}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BEFORE">Antes da Cirurgia</SelectItem>
                <SelectItem value="AFTER">Apos a Cirurgia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasDiscrepancy && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400 flex items-center gap-2">
            <Wrench className="h-4 w-4 shrink-0" />
            ATENCAO: Discrepancia detectada na contagem! Verifique antes de fechar a cirurgia.
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-xs text-center">Qtd Esperada</TableHead>
              <TableHead className="text-xs text-center">Qtd Real</TableHead>
              {phase === 'AFTER' && <TableHead className="text-xs text-center">Status</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i} className="border-border">
                <TableCell className="py-1.5">
                  <Input value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)} className="h-7 text-xs border-border bg-background" />
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  <Input type="number" min="0" value={item.expectedCount} onChange={(e) => updateItem(i, 'expectedCount', e.target.value)} className="h-7 w-16 text-xs text-center border-border bg-background mx-auto" />
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  <Input type="number" min="0" value={item.actualCount} onChange={(e) => updateItem(i, 'actualCount', e.target.value)} className="h-7 w-16 text-xs text-center border-border bg-background mx-auto" />
                </TableCell>
                {phase === 'AFTER' && (
                  <TableCell className="py-1.5 text-center">
                    {item.expectedCount === item.actualCount ? (
                      <span className="text-xs text-emerald-400">OK</span>
                    ) : (
                      <span className="text-xs text-red-400 font-bold">DIVERGE</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-1">
          <Label className="text-xs">Observacoes</Label>
          <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="text-xs border-border bg-background" rows={2} placeholder="Observacoes sobre a contagem..." />
        </div>

        <Button size="sm" disabled={!procedureId || createCount.isPending} onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {createCount.isPending ? 'Salvando...' : 'Registrar Contagem'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// APA Section
// ============================================================================

function ApaSection({ procedures }: { procedures: SurgicalProcedure[] }) {
  const createApa = useCreateApa();
  const [form, setForm] = useState({
    procedureId: '',
    patientId: '',
    asaClass: 'I' as 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI',
    asaEmergency: false,
    mallampati: 1 as 1 | 2 | 3 | 4,
    fastingHours: 6,
    fastingSolidsHours: 8,
    cardiacRisk: '',
    pulmonaryRisk: '',
    anesthesiaPlan: '',
    consentObtained: false,
    comorbidities: '',
    currentMedications: '',
    allergies: '',
    previousAnesthesiaComplications: '',
    observations: '',
  });

  const handleSave = () => {
    if (!form.procedureId || !form.patientId) return;
    createApa.mutate({
      procedureId: form.procedureId,
      patientId: form.patientId,
      comorbidities: form.comorbidities.split(',').map((s) => s.trim()).filter(Boolean),
      currentMedications: form.currentMedications.split(',').map((s) => s.trim()).filter(Boolean),
      allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
      previousAnesthesia: { complications: form.previousAnesthesiaComplications || undefined },
      airway: {
        mallampati: form.mallampati,
        mouthOpening: 'Normal',
        neckMobility: 'Normal',
        thyromental: '>6cm',
        dentition: 'Normal',
        beardOrObesity: false,
      },
      fastingHours: form.fastingHours,
      fastingSolidsHours: form.fastingSolidsHours,
      asaClass: form.asaClass,
      asaEmergency: form.asaEmergency,
      cardiacRisk: form.cardiacRisk,
      pulmonaryRisk: form.pulmonaryRisk,
      labResults: {},
      anesthesiaPlan: form.anesthesiaPlan,
      consentObtained: form.consentObtained,
      observations: form.observations || undefined,
    });
  };

  return (
    <Card className="border-border bg-card mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-400" />
          APA — Avaliacao Pre-Anestesica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Procedimento</Label>
            <Select value={form.procedureId} onValueChange={(v) => setForm({ ...form, procedureId: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {procedures.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.procedureName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ID do Paciente</Label>
            <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="h-8 text-xs border-border bg-background" />
          </div>
        </div>

        {/* ASA Classification */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-sm font-medium">Classificacao ASA</p>
          <div className="grid grid-cols-6 gap-2">
            {(['I', 'II', 'III', 'IV', 'V', 'VI'] as const).map((cls) => (
              <button
                key={cls}
                onClick={() => setForm({ ...form, asaClass: cls })}
                className={cn(
                  'rounded-lg border p-2 text-xs font-bold transition-colors',
                  form.asaClass === cls
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-border bg-background text-muted-foreground hover:border-muted-foreground',
                )}
              >
                ASA {cls}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={form.asaEmergency} onChange={(e) => setForm({ ...form, asaEmergency: e.target.checked })} className="rounded border-border" />
            Emergencia (sufixo E)
          </label>
        </div>

        {/* Mallampati */}
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-sm font-medium">Via Aerea — Mallampati</p>
          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as const).map((score) => (
              <button
                key={score}
                onClick={() => setForm({ ...form, mallampati: score })}
                className={cn(
                  'rounded-lg border p-2 text-center text-xs transition-colors',
                  form.mallampati === score
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-border bg-background text-muted-foreground hover:border-muted-foreground',
                )}
              >
                <span className="font-bold block">M{score}</span>
                <span className={score >= 3 ? 'text-red-400' : 'text-muted-foreground'}>
                  {score === 1 ? 'Facil' : score === 2 ? 'Normal' : score === 3 ? 'Dificil' : 'Muito dif.'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Jejum liquidos (h)</Label>
            <Input type="number" value={form.fastingHours} onChange={(e) => setForm({ ...form, fastingHours: Number(e.target.value) })} className="h-8 text-xs border-border bg-background" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jejum solidos (h)</Label>
            <Input type="number" value={form.fastingSolidsHours} onChange={(e) => setForm({ ...form, fastingSolidsHours: Number(e.target.value) })} className="h-8 text-xs border-border bg-background" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Comorbidades (separadas por virgula)</Label>
          <Input value={form.comorbidities} onChange={(e) => setForm({ ...form, comorbidities: e.target.value })} className="h-8 text-xs border-border bg-background" placeholder="HAS, DM2, DPOC..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Medicamentos em uso (separados por virgula)</Label>
          <Input value={form.currentMedications} onChange={(e) => setForm({ ...form, currentMedications: e.target.value })} className="h-8 text-xs border-border bg-background" placeholder="Metformina, Losartana..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Alergias</Label>
          <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="h-8 text-xs border-border bg-background" placeholder="Dipirona, Penicilina..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Plano anestesico</Label>
          <Textarea value={form.anesthesiaPlan} onChange={(e) => setForm({ ...form, anesthesiaPlan: e.target.value })} className="text-xs border-border bg-background" rows={2} placeholder="Anestesia geral balanceada, IOT..." />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={form.consentObtained} onChange={(e) => setForm({ ...form, consentObtained: e.target.checked })} className="rounded border-border" />
          Termo de consentimento obtido
        </label>

        <Button size="sm" disabled={!form.procedureId || !form.patientId || createApa.isPending} onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {createApa.isPending ? 'Salvando...' : 'Salvar APA'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Metrics Section
// ============================================================================

function MetricsSection() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = today.toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(monthEnd);
  const { data: metrics, isLoading, refetch } = useUtilizationMetrics(startDate, endDate);

  return (
    <Card className="border-border bg-card mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-purple-400" />
          Metricas de Utilizacao do CC
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data inicial</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs border-border bg-background" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data final</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs border-border bg-background" />
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>Atualizar</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
        ) : metrics ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-xs text-muted-foreground">Procedimentos</p>
                <p className="text-2xl font-bold text-gray-100">{metrics.totalProcedures}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-xs text-muted-foreground">Giro Medio (min)</p>
                <p className="text-2xl font-bold text-blue-400">{metrics.averageTurnoverMinutes}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-xs text-muted-foreground">Cancelamentos</p>
                <p className="text-2xl font-bold text-red-400">{(metrics.cancellationRate * 100).toFixed(1)}%</p>
              </div>
            </div>

            {metrics.utilizationByRoom?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Utilizacao por Sala</p>
                <div className="space-y-2">
                  {metrics.utilizationByRoom.map((room) => (
                    <div key={room.room} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-muted-foreground">{room.room}</span>
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${room.utilizationPercent}%` }} />
                      </div>
                      <span className="text-xs text-gray-300 w-10 text-right">{room.utilizationPercent}%</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{room.procedures} proc.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {metrics.cancellations?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Motivos de Cancelamento</p>
                <div className="space-y-1">
                  {metrics.cancellations.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{c.reason}</span>
                      <span className="text-gray-300 font-medium">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">Selecione um periodo e clique em Atualizar.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Preference Card Section
// ============================================================================

function PreferenceCardSection() {
  const createCard = useCreatePreferenceCard();
  const [surgeonId, setSurgeonId] = useState('');
  const [searchSurgeonId, setSearchSurgeonId] = useState('');
  const { data: cards = [], isLoading: cardsLoading } = usePreferenceCards(searchSurgeonId);
  const [form, setForm] = useState({
    procedureType: '',
    patientPosition: '',
    instruments: '',
    sutures: '',
    materials: '',
    equipment: '',
    specialRequirements: '',
    notes: '',
  });

  const handleSave = () => {
    if (!surgeonId || !form.procedureType) return;
    createCard.mutate({
      surgeonId,
      procedureType: form.procedureType,
      patientPosition: form.patientPosition,
      instruments: form.instruments.split(',').map((s) => s.trim()).filter(Boolean),
      sutures: form.sutures.split(',').map((s) => s.trim()).filter(Boolean),
      materials: form.materials.split(',').map((s) => s.trim()).filter(Boolean),
      equipment: form.equipment.split(',').map((s) => s.trim()).filter(Boolean),
      specialRequirements: form.specialRequirements || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Card className="border-border bg-card mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-yellow-400" />
          Preference Cards — Preferencias do Cirurgiao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search existing cards */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Consultar Cards Existentes</p>
          <div className="flex gap-2">
            <Input value={searchSurgeonId} onChange={(e) => setSearchSurgeonId(e.target.value)} className="h-8 text-xs border-border bg-background" placeholder="ID do cirurgiao..." />
          </div>
          {cardsLoading && searchSurgeonId && (
            <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
          )}
          {cards.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cards.map((card) => (
                <div key={card.id} className="rounded border border-border bg-background p-2 text-xs space-y-1">
                  <p className="font-medium text-gray-200">{card.procedureType}</p>
                  <p className="text-muted-foreground">Posicao: {card.patientPosition}</p>
                  {card.instruments.length > 0 && <p className="text-muted-foreground">Instrumentos: {card.instruments.join(', ')}</p>}
                  {card.specialRequirements && <p className="text-yellow-400">{card.specialRequirements}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create new card */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Novo Preference Card</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ID do Cirurgiao</Label>
              <Input value={surgeonId} onChange={(e) => setSurgeonId(e.target.value)} className="h-8 text-xs border-border bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Procedimento</Label>
              <Input value={form.procedureType} onChange={(e) => setForm({ ...form, procedureType: e.target.value })} className="h-8 text-xs border-border bg-background" placeholder="Colecistectomia laparoscopica..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Posicao do Paciente</Label>
            <Input value={form.patientPosition} onChange={(e) => setForm({ ...form, patientPosition: e.target.value })} className="h-8 text-xs border-border bg-background" placeholder="Decubito dorsal, Trendelenburg..." />
          </div>
          {[
            { field: 'instruments', label: 'Instrumentos (sep. por virgula)' },
            { field: 'sutures', label: 'Fios de sutura (sep. por virgula)' },
            { field: 'materials', label: 'Materiais (sep. por virgula)' },
            { field: 'equipment', label: 'Equipamentos (sep. por virgula)' },
          ].map(({ field, label }) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input value={form[field as keyof typeof form] as string} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="h-8 text-xs border-border bg-background" />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs">Requisitos especiais</Label>
            <Textarea value={form.specialRequirements} onChange={(e) => setForm({ ...form, specialRequirements: e.target.value })} className="text-xs border-border bg-background" rows={2} />
          </div>
          <Button size="sm" disabled={!surgeonId || !form.procedureType || createCard.isPending} onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {createCard.isPending ? 'Salvando...' : 'Salvar Preference Card'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ERAS Section
// ============================================================================

const ERAS_PRE_OP = [
  'Pré-habilitacao (fisioterapia, nutrição)',
  'Otimizacao de comorbidades',
  'Aconselhamento sobre o protocolo ERAS',
  'Medicacao pre-operatoria conforme protocolo',
  'Jejum reduzido (liquidos claros ate 2h antes)',
  'Carga de carboidratos (2-4h antes)',
  'Profilaxia antiemetica pre-operatoria',
];

const ERAS_INTRA_OP = [
  'Anestesia com opioides reduzidos',
  'Normotermia mantida',
  'Fluidoterapia guiada por objetivos',
  'Profilaxia antibiotica',
  'Drenos minimizados',
  'Sonda nasogastrica evitada',
];

const ERAS_POST_OP = [
  'Mobilizacao precoce (dentro de 6h)',
  'Analgesia multimodal',
  'Anti-eméticos profilaticos',
  'Dieta oral precoce',
  'Remocao precoce de cateteres',
  'Tromboprofilaxia',
  'Alta precoce conforme criterios',
];

function ErasSection({ procedures }: { procedures: SurgicalProcedure[] }) {
  const createEras = useCreateErasChecklist();
  const [procedureId, setProcedureId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [preOp, setPreOp] = useState<Record<string, boolean>>({});
  const [intraOp, setIntraOp] = useState<Record<string, boolean>>({});
  const [postOp, setPostOp] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState('');

  const toggle = (
    phase: 'pre' | 'intra' | 'post',
    item: string,
  ) => {
    if (phase === 'pre') setPreOp((prev) => ({ ...prev, [item]: !prev[item] }));
    else if (phase === 'intra') setIntraOp((prev) => ({ ...prev, [item]: !prev[item] }));
    else setPostOp((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const totalItems = ERAS_PRE_OP.length + ERAS_INTRA_OP.length + ERAS_POST_OP.length;
  const checkedCount = Object.values(preOp).filter(Boolean).length + Object.values(intraOp).filter(Boolean).length + Object.values(postOp).filter(Boolean).length;

  const handleSave = () => {
    if (!procedureId || !patientId) return;
    createEras.mutate({
      procedureId,
      patientId,
      preOp,
      intraOp,
      postOp,
      observations: observations || undefined,
    });
  };

  return (
    <Card className="border-border bg-card mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-cyan-400" />
            ERAS — Enhanced Recovery After Surgery
          </span>
          <span className="text-xs text-muted-foreground font-normal">{checkedCount}/{totalItems} itens</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Procedimento</Label>
            <Select value={procedureId} onValueChange={setProcedureId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {procedures.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.procedureName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ID do Paciente</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="h-8 text-xs border-border bg-background" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{Math.round(totalItems > 0 ? (checkedCount / totalItems) * 100 : 0)}%</span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: 'Pré-Operatório', phase: 'pre' as const, items: ERAS_PRE_OP, state: preOp, color: 'text-blue-400' },
            { label: 'Intra-Operatório', phase: 'intra' as const, items: ERAS_INTRA_OP, state: intraOp, color: 'text-yellow-400' },
            { label: 'Pós-Operatório', phase: 'post' as const, items: ERAS_POST_OP, state: postOp, color: 'text-emerald-400' },
          ].map(({ label, phase, items, state, color }) => (
            <div key={phase} className="rounded-lg border border-border p-3 space-y-2">
              <p className={`text-xs font-semibold ${color}`}>{label}</p>
              {items.map((item) => (
                <label key={item} className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={!!state[item]}
                    onCheckedChange={() => toggle(phase, item)}
                    className="mt-0.5 border-border shrink-0"
                  />
                  <span className={cn('text-xs flex-1', state[item] ? 'text-muted-foreground line-through' : 'text-gray-300')}>{item}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Observacoes</Label>
          <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="text-xs border-border bg-background" rows={2} />
        </div>

        <Button size="sm" disabled={!procedureId || !patientId || createEras.isPending} onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {createEras.isPending ? 'Salvando...' : 'Registrar ERAS'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// AI Duration Estimation Section
// ============================================================================

function AiDurationSection() {
  const estimate = useEstimateDuration();
  const [form, setForm] = useState({
    procedureName: '',
    surgeonId: '',
    patientComorbidities: '',
  });

  const handleEstimate = () => {
    if (!form.procedureName || !form.surgeonId) return;
    estimate.mutate({
      procedureName: form.procedureName,
      surgeonId: form.surgeonId,
      patientComorbidities: form.patientComorbidities ? Number(form.patientComorbidities) : undefined,
    });
  };

  return (
    <Card className="border-border bg-card mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-emerald-400" />
          Estimativa de Duracao — IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Baseado em dados historicos do cirurgiao, a IA estima a duracao prevista da cirurgia.</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome do Procedimento</Label>
            <Input value={form.procedureName} onChange={(e) => setForm({ ...form, procedureName: e.target.value })} className="h-8 text-xs border-border bg-background" placeholder="Colecistectomia laparoscopica..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ID do Cirurgiao</Label>
            <Input value={form.surgeonId} onChange={(e) => setForm({ ...form, surgeonId: e.target.value })} className="h-8 text-xs border-border bg-background" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Numero de comorbidades do paciente</Label>
            <Input type="number" min="0" value={form.patientComorbidities} onChange={(e) => setForm({ ...form, patientComorbidities: e.target.value })} className="h-8 text-xs border-border bg-background" placeholder="0" />
          </div>
        </div>

        <Button onClick={handleEstimate} disabled={!form.procedureName || !form.surgeonId || estimate.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
          <Zap className="mr-1 h-4 w-4" />
          {estimate.isPending ? 'Calculando...' : 'Estimar Duracao com IA'}
        </Button>

        {estimate.data && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Duracao Estimada</p>
              <p className="text-4xl font-bold text-emerald-400">{estimate.data.estimatedMinutes} min</p>
              <p className="text-xs text-muted-foreground">
                IC 95%: {estimate.data.confidenceInterval.min} — {estimate.data.confidenceInterval.max} min
              </p>
              <p className="text-xs text-muted-foreground mt-1">Baseado em {estimate.data.basedOnCases} cirurgias anteriores</p>
            </div>
            {estimate.data.factors?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Fatores considerados</p>
                {estimate.data.factors.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{f.factor}</span>
                    <Badge variant="outline" className="text-[10px] border-border">{f.impact}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Video Cirúrgico Section
// ============================================================================

function VideoSection({ procedures }: { procedures: SurgicalProcedure[] }) {
  const [selectedId, setSelectedId] = useState('');
  const { data: videos = [], isFetching } = useSurgeryVideos(selectedId);
  const startRecording = useStartVideoRecording();
  const stopRecording = useStopVideoRecording();

  const hasActiveRecording = videos.some((v) => v.status === 'RECORDING');

  function fmtDuration(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  return (
    <Card className="bg-card border-border mt-4">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-400" />
          Gravação de Vídeo Cirúrgico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="bg-background border-border text-foreground flex-1">
              <SelectValue placeholder="Selecione o procedimento..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {procedures.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.procedureName} — {p.patient?.fullName ?? ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedId && (
          <div className="flex gap-3">
            <Button
              className="bg-red-700 hover:bg-red-600 text-white"
              disabled={startRecording.isPending || hasActiveRecording}
              onClick={() => startRecording.mutate(selectedId, {
                onSuccess: (r) => toast.success(`Gravação iniciada: ${r.recordingId.slice(0, 8)}...`),
                onError: () => toast.error('Erro ao iniciar gravação.'),
              })}
            >
              <Timer className="h-4 w-4 mr-2" />
              {hasActiveRecording ? 'Gravando...' : 'Iniciar Gravação'}
            </Button>
            {hasActiveRecording && (
              <Button
                variant="outline"
                className="border-border text-foreground"
                disabled={stopRecording.isPending}
                onClick={() => stopRecording.mutate(selectedId, {
                  onSuccess: (r) => toast.success(`Gravação concluída: ${fmtDuration(r.durationSeconds)}`),
                  onError: () => toast.error('Erro ao parar gravação.'),
                })}
              >
                <Timer className="h-4 w-4 mr-2" />
                Parar Gravação
              </Button>
            )}
          </div>
        )}

        {isFetching && <p className="text-muted-foreground text-sm">Carregando gravações...</p>}

        {selectedId && !isFetching && videos.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-6">Nenhuma gravação para este procedimento.</p>
        )}

        {videos.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">ID</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Início</TableHead>
                <TableHead className="text-muted-foreground">Duração</TableHead>
                <TableHead className="text-muted-foreground">URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((v) => (
                <TableRow key={v.id} className="border-border">
                  <TableCell className="text-foreground font-mono text-xs">{v.recordingId?.slice(0, 12)}...</TableCell>
                  <TableCell>
                    <Badge className={v.status === 'RECORDING' ? 'bg-red-700 animate-pulse' : 'bg-emerald-800'}>
                      {v.status === 'RECORDING' ? 'Gravando' : 'Concluído'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(v.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="text-foreground">{fmtDuration(v.durationSeconds)}</TableCell>
                  <TableCell>
                    {v.url ? (
                      <a href={v.url} target="_blank" rel="noreferrer" className="text-emerald-400 text-xs hover:underline truncate block max-w-48">
                        Baixar
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <p className="text-muted-foreground text-xs">
          Vídeos armazenados em S3 com retenção de 20 anos conforme resolução CFM.
        </p>
      </CardContent>
    </Card>
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
