import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Clock,
  FileX,
  Search,
  RefreshCw,
  Activity,
  CalendarDays,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  UserRound,
  AlertTriangle,
  Mic,
  X,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Users,
  Zap,
  Eye,
  MoreHorizontal,
  MapPin,
  SlidersHorizontal,
  BadgeCheck,
  ChevronDown,
  CalendarClock,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, getInitials, calculateAge } from '@/lib/utils';
import {
  encounterStatusLabels,
  encounterTypeLabels,
  triageLevelColors,
} from '@/lib/constants';
import {
  useEncounters,
  useCreateEncounter,
  useUpdateEncounterStatus,
  type EncounterFilters,
} from '@/services/encounters.service';
import { usePatients } from '@/services/patients.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { toast } from 'sonner';
import type { EncounterType, EncounterStatus, Priority } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 15;

const DEPARTMENTS = [
  'Clínica Médica',
  'Cardiologia',
  'Ortopedia',
  'Neurologia',
  'Pediatria',
  'Ginecologia',
  'Oncologia',
  'Pneumologia',
  'Gastroenterologia',
  'Nefrologia',
  'Urologia',
  'Endocrinologia',
  'Reumatologia',
  'Dermatologia',
  'Psiquiatria',
  'Geriatria',
  'Pronto-Socorro',
  'UTI',
  'Cirurgia Geral',
  'Cirurgia Vascular',
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  LOW: { label: 'Baixa', color: 'text-zinc-400', dot: 'bg-zinc-400' },
  NORMAL: { label: 'Normal', color: 'text-blue-400', dot: 'bg-blue-400' },
  HIGH: { label: 'Alta', color: 'text-orange-400', dot: 'bg-orange-400' },
  URGENT: { label: 'Urgente', color: 'text-red-400', dot: 'bg-red-400' },
  EMERGENCY: { label: 'Emergência', color: 'text-red-300', dot: 'bg-red-300' },
};

// ============================================================================
// Helpers
// ============================================================================

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}min`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  delta?: { value: string; positive: boolean };
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, iconColor, bgColor, delta, subtitle }: StatCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{title}</p>
            <p className="mt-1 text-3xl font-bold text-zinc-50">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
            {delta && (
              <div className={cn('mt-1.5 flex items-center gap-1 text-xs', delta.positive ? 'text-emerald-400' : 'text-red-400')}>
                {delta.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta.value}
              </div>
            )}
          </div>
          <div className={cn('rounded-xl p-2.5', bgColor)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Create Encounter Dialog
// ============================================================================

interface CreateEncounterDialogProps {
  open: boolean;
  onClose: () => void;
}

function CreateEncounterDialog({ open, onClose }: CreateEncounterDialogProps) {
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [type, setType] = useState<EncounterType>('CONSULTATION');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [location, setLocation] = useState('');
  const [room, setRoom] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const { data: patientsData, isLoading: loadingPatients } = usePatients({
    search: patientSearch,
    limit: 8,
  });

  const createEncounter = useCreateEncounter();

  const selectedPatient = useMemo(
    () => patientsData?.data?.find((p) => p.id === selectedPatientId),
    [patientsData, selectedPatientId],
  );

  function handleSelectPatient(id: string, name: string) {
    setSelectedPatientId(id);
    setPatientSearch(name);
    setShowPatientDropdown(false);
  }

  function handleReset() {
    setPatientSearch('');
    setSelectedPatientId('');
    setType('CONSULTATION');
    setPriority('NORMAL');
    setChiefComplaint('');
    setLocation('');
    setRoom('');
    setScheduledAt('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error('Selecione um paciente');
      return;
    }
    try {
      await createEncounter.mutateAsync({
        patientId: selectedPatientId,
        type,
        priority,
        chiefComplaint: chiefComplaint || undefined,
        location: location || undefined,
        room: room || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      toast.success('Atendimento criado com sucesso');
      handleReset();
      onClose();
    } catch {
      toast.error('Erro ao criar atendimento');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950 text-zinc-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="rounded-lg bg-emerald-500/10 p-1.5">
              <Plus className="h-4 w-4 text-emerald-400" />
            </div>
            Novo Atendimento
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Preencha os dados para registrar um novo atendimento no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Patient selector */}
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">
              Paciente <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Buscar por nome ou prontuário..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setSelectedPatientId('');
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                className="border-zinc-700 bg-zinc-900 pl-9 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50"
              />
              {selectedPatientId && (
                <button
                  type="button"
                  onClick={() => { setSelectedPatientId(''); setPatientSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {showPatientDropdown && patientSearch.length >= 2 && !selectedPatientId && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                  {loadingPatients ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-sm text-zinc-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Buscando pacientes...
                    </div>
                  ) : patientsData?.data?.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-zinc-500">Nenhum paciente encontrado</p>
                  ) : (
                    <ul className="max-h-52 overflow-y-auto py-1">
                      {patientsData?.data?.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800"
                            onClick={() => handleSelectPatient(p.id, p.fullName)}
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-emerald-500/10 text-[10px] text-emerald-400">
                                {getInitials(p.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-100">{p.fullName}</p>
                              <p className="text-xs text-zinc-500">
                                Prontuário: {p.mrn}
                                {p.birthDate && ` • ${calculateAge(p.birthDate)} anos`}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {selectedPatient && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm text-emerald-300">
                  {selectedPatient.fullName}
                </span>
                <span className="text-xs text-zinc-500">
                  • Prontuário {selectedPatient.mrn}
                  {selectedPatient.birthDate && ` • ${calculateAge(selectedPatient.birthDate)} anos`}
                </span>
              </div>
            )}
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Tipo de Atendimento</Label>
              <Select value={type} onValueChange={(v) => setType(v as EncounterType)}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-emerald-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  {(Object.entries(encounterTypeLabels) as [EncounterType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-zinc-200 focus:bg-zinc-800">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-emerald-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-zinc-200 focus:bg-zinc-800">
                      <span className="flex items-center gap-2">
                        <span className={cn('inline-block h-2 w-2 rounded-full', v.dot)} />
                        {v.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location + Room */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Departamento / Local</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-emerald-500/50">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d} className="text-zinc-200 focus:bg-zinc-800">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Sala / Leito</Label>
              <Input
                placeholder="Ex: Sala 3, Leito 12A..."
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Scheduled date */}
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Data/Hora de Agendamento (opcional)</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-emerald-500/50 [color-scheme:dark]"
            />
          </div>

          {/* Chief complaint */}
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300">Queixa Principal</Label>
            <div className="relative">
              <Textarea
                placeholder="Descreva a queixa principal do paciente..."
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                rows={3}
                className="resize-none border-zinc-700 bg-zinc-900 pr-10 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
                title="Usar voz"
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { handleReset(); onClose(); }}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createEncounter.isPending || !selectedPatientId}
              className="bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {createEncounter.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Atendimento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Advanced Filters Panel
// ============================================================================

interface FiltersPanelProps {
  filters: EncounterFilters;
  onChange: (f: Partial<EncounterFilters>) => void;
  onReset: () => void;
}

function FiltersPanel({ filters, onChange, onReset }: FiltersPanelProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Type */}
          <div className="min-w-[180px] flex-1 space-y-1">
            <Label className="text-xs text-zinc-400">Tipo</Label>
            <Select
              value={filters.type ?? 'ALL'}
              onValueChange={(v) => onChange({ type: v === 'ALL' ? undefined : v as EncounterType })}
            >
              <SelectTrigger className="h-8 border-zinc-700 bg-zinc-800 text-xs text-zinc-200">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900">
                <SelectItem value="ALL" className="text-xs text-zinc-200">Todos os tipos</SelectItem>
                {(Object.entries(encounterTypeLabels) as [EncounterType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs text-zinc-200">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label className="text-xs text-zinc-400">Status</Label>
            <Select
              value={filters.status ?? 'ALL'}
              onValueChange={(v) => onChange({ status: v === 'ALL' ? undefined : v as EncounterStatus })}
            >
              <SelectTrigger className="h-8 border-zinc-700 bg-zinc-800 text-xs text-zinc-200">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900">
                <SelectItem value="ALL" className="text-xs text-zinc-200">Todos os status</SelectItem>
                {(Object.entries(encounterStatusLabels) as [EncounterStatus, { label: string; color: string }][]).map(
                  ([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs text-zinc-200">
                      {v.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date from */}
          <div className="min-w-[150px] flex-1 space-y-1">
            <Label className="text-xs text-zinc-400">Data inicial</Label>
            <Input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(e) => onChange({ startDate: e.target.value || undefined })}
              className="h-8 border-zinc-700 bg-zinc-800 text-xs text-zinc-200 [color-scheme:dark]"
            />
          </div>

          {/* Date to */}
          <div className="min-w-[150px] flex-1 space-y-1">
            <Label className="text-xs text-zinc-400">Data final</Label>
            <Input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(e) => onChange({ endDate: e.target.value || undefined })}
              className="h-8 border-zinc-700 bg-zinc-800 text-xs text-zinc-200 [color-scheme:dark]"
            />
          </div>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="mr-1.5 h-3 w-3" />
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function EncountersListPage() {
  const navigate = useNavigate();

  // UI State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'waiting' | 'scheduled' | 'completed'>('all');
  const [page, setPage] = useState(1);

  // Filter state
  const [advFilters, setAdvFilters] = useState<EncounterFilters>({});

  const updateEncounterStatus = useUpdateEncounterStatus();

  // Build query filters
  const queryFilters = useMemo<EncounterFilters>(() => {
    const f: EncounterFilters = { page, limit: PAGE_SIZE, ...advFilters };
    if (tabFilter === 'active') f.status = 'IN_PROGRESS';
    else if (tabFilter === 'waiting') f.status = 'WAITING';
    else if (tabFilter === 'scheduled') f.status = 'SCHEDULED';
    else if (tabFilter === 'completed') f.status = 'COMPLETED';
    return f;
  }, [page, advFilters, tabFilter]);

  const { data: encountersData, isLoading, isError, refetch, isFetching } = useEncounters(queryFilters);

  // Fetch all encounters for stats (no pagination, no filter)
  const { data: allData } = useEncounters({ limit: 500 });

  // Client-side search filter (on top of server filter)
  const encounters = useMemo(() => {
    const list = encountersData?.data ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (e) =>
        (e.patient?.fullName ?? e.patient?.name ?? '').toLowerCase().includes(q) ||
        (e.patient?.mrn ?? '').toLowerCase().includes(q) ||
        (e.chiefComplaint ?? '').toLowerCase().includes(q) ||
        (e.primaryDoctor?.name ?? '').toLowerCase().includes(q),
    );
  }, [encountersData, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const all = allData?.data ?? [];
    const todayAll = all.filter((e) => e.startedAt && isToday(e.startedAt));
    const inProgress = all.filter((e) => ['IN_PROGRESS', 'IN_TRIAGE', 'ON_HOLD'].includes(e.status));
    const scheduled = all.filter((e) => e.status === 'SCHEDULED');
    const completed = all.filter((e) => e.status === 'COMPLETED');
    const waiting = all.filter((e) => e.status === 'WAITING');
    return {
      todayTotal: todayAll.length,
      inProgress: inProgress.length,
      scheduled: scheduled.length,
      completed: completed.length,
      waiting: waiting.length,
    };
  }, [allData]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const all = allData?.data ?? [];
    return {
      all: all.length,
      active: all.filter((e) => ['IN_PROGRESS', 'IN_TRIAGE', 'ON_HOLD'].includes(e.status)).length,
      waiting: all.filter((e) => e.status === 'WAITING').length,
      scheduled: all.filter((e) => e.status === 'SCHEDULED').length,
      completed: all.filter((e) => ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'TRANSFERRED'].includes(e.status)).length,
    };
  }, [allData]);

  const totalPages = encountersData?.totalPages ?? 1;

  const handleTabChange = useCallback((v: string) => {
    setTabFilter(v as typeof tabFilter);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((partial: Partial<EncounterFilters>) => {
    setAdvFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
  }, []);

  const handleFilterReset = useCallback(() => {
    setAdvFilters({});
    setPage(1);
  }, []);

  const activeFilterCount = Object.values(advFilters).filter(Boolean).length;

  // Quick status change
  async function handleQuickStatus(encounterId: string, status: EncounterStatus) {
    try {
      await updateEncounterStatus.mutateAsync({ id: encounterId, status });
      toast.success(`Status atualizado para "${encounterStatusLabels[status].label}"`);
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-zinc-50">
            <div className="rounded-lg bg-emerald-500/10 p-1.5">
              <Stethoscope className="h-5 w-5 text-emerald-400" />
            </div>
            Atendimentos
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gerencie todos os atendimentos clínicos — consultas, emergências, internações e mais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Hoje"
          value={stats.todayTotal}
          icon={CalendarDays}
          iconColor="text-emerald-400"
          bgColor="bg-emerald-500/10"
          subtitle="atendimentos iniciados"
          delta={{ value: 'vs. ontem', positive: true }}
        />
        <StatCard
          title="Em Andamento"
          value={stats.inProgress}
          icon={Activity}
          iconColor="text-blue-400"
          bgColor="bg-blue-500/10"
          subtitle={`+ ${stats.waiting} aguardando`}
        />
        <StatCard
          title="Agendados"
          value={stats.scheduled}
          icon={CalendarClock}
          iconColor="text-orange-400"
          bgColor="bg-orange-500/10"
          subtitle="próximos atendimentos"
        />
        <StatCard
          title="Concluídos"
          value={stats.completed}
          icon={CheckCircle2}
          iconColor="text-zinc-400"
          bgColor="bg-zinc-700/40"
          subtitle="total de hoje"
        />
      </div>

      {/* ── Search + Filter toolbar ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar por paciente, prontuário, queixa ou médico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-zinc-700 bg-zinc-900 pl-9 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
            showFilters && 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400',
          )}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge className="ml-1.5 h-4 min-w-[16px] rounded-full bg-emerald-500 px-1 text-[10px] text-white">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown className={cn('ml-1 h-3.5 w-3.5 transition-transform', showFilters && 'rotate-180')} />
        </Button>
      </div>

      {/* ── Advanced Filters (collapsible) ─────────────────────────── */}
      {showFilters && (
        <FiltersPanel filters={advFilters} onChange={handleFilterChange} onReset={handleFilterReset} />
      )}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <Tabs value={tabFilter} onValueChange={handleTabChange}>
        <TabsList className="w-full border border-zinc-800 bg-zinc-900 sm:w-auto">
          <TabsTrigger value="all" className="gap-1.5 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
            <Users className="h-3.5 w-3.5" />
            Todos
            <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-zinc-600">{tabCounts.all}</span>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Activity className="h-3.5 w-3.5" />
            Em Andamento
            {tabCounts.active > 0 && (
              <span className="rounded-full bg-emerald-700/60 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-emerald-500">{tabCounts.active}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="waiting" className="gap-1.5 text-xs data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
            <Clock className="h-3.5 w-3.5" />
            Aguardando
            {tabCounts.waiting > 0 && (
              <span className="rounded-full bg-yellow-700/60 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-yellow-500">{tabCounts.waiting}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
            <CalendarDays className="h-3.5 w-3.5" />
            Agendados
            <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-zinc-600">{tabCounts.scheduled}</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Concluídos
            <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] data-[state=active]:bg-zinc-600">{tabCounts.completed}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Main Table ─────────────────────────────────────────────── */}
      {encounters.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-zinc-800 p-4">
              <FileX className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-300">Nenhum atendimento encontrado</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {searchQuery
                ? `Sem resultados para "${searchQuery}"`
                : 'Não há atendimentos com os filtros selecionados.'}
            </p>
            {(searchQuery || activeFilterCount > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                onClick={() => { setSearchQuery(''); handleFilterReset(); }}
              >
                Limpar busca e filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-zinc-800 bg-zinc-900">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="w-[180px] text-xs font-medium text-zinc-500">Paciente</TableHead>
                  <TableHead className="w-[120px] text-xs font-medium text-zinc-500">Tipo</TableHead>
                  <TableHead className="w-[120px] text-xs font-medium text-zinc-500">Status</TableHead>
                  <TableHead className="hidden text-xs font-medium text-zinc-500 md:table-cell">Queixa Principal</TableHead>
                  <TableHead className="hidden text-xs font-medium text-zinc-500 lg:table-cell">Médico Responsável</TableHead>
                  <TableHead className="hidden text-xs font-medium text-zinc-500 xl:table-cell">Setor / Sala</TableHead>
                  <TableHead className="hidden text-xs font-medium text-zinc-500 sm:table-cell">Triagem</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Data / Hora</TableHead>
                  <TableHead className="w-10 text-xs font-medium text-zinc-500" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {encounters.map((enc) => {
                  const statusInfo = encounterStatusLabels[enc.status];
                  const triageInfo = enc.triageLevel ? triageLevelColors[enc.triageLevel] : null;
                  const priorityInfo = PRIORITY_CONFIG[enc.priority];
                  const patientName = enc.patient?.fullName ?? enc.patient?.name ?? 'Paciente desconhecido';
                  const dateStr = enc.startedAt ?? enc.scheduledAt ?? enc.createdAt;

                  return (
                    <TableRow
                      key={enc.id}
                      className="cursor-pointer border-zinc-800 transition-colors hover:bg-zinc-800/60"
                      onClick={() => navigate(`/atendimentos/${enc.id}`)}
                    >
                      {/* Patient */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                              {getInitials(patientName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-100">{patientName}</p>
                            <div className="flex items-center gap-1.5">
                              {enc.patient?.mrn && (
                                <span className="text-[11px] text-zinc-500">#{enc.patient.mrn}</span>
                              )}
                              {enc.patient?.birthDate && (
                                <span className="text-[11px] text-zinc-600">
                                  • {calculateAge(enc.patient.birthDate)}a
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <Badge
                            variant="secondary"
                            className="w-fit border-zinc-700 bg-zinc-800 text-[11px] text-zinc-300"
                          >
                            {encounterTypeLabels[enc.type]}
                          </Badge>
                          {priorityInfo && enc.priority !== 'NORMAL' && (
                            <span className={cn('flex items-center gap-1 text-[10px]', priorityInfo.color)}>
                              <span className={cn('inline-block h-1.5 w-1.5 rounded-full', priorityInfo.dot)} />
                              {priorityInfo.label}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        <Badge
                          className={cn(
                            'text-[11px] text-white',
                            statusInfo?.color,
                          )}
                        >
                          {statusInfo?.label}
                        </Badge>
                      </TableCell>

                      {/* Chief complaint */}
                      <TableCell className="hidden max-w-[200px] py-3 md:table-cell">
                        {enc.chiefComplaint ? (
                          <p className="truncate text-sm text-zinc-400" title={enc.chiefComplaint}>
                            {enc.chiefComplaint}
                          </p>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </TableCell>

                      {/* Doctor */}
                      <TableCell className="hidden py-3 lg:table-cell">
                        {enc.primaryDoctor ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-zinc-700 text-[10px] text-zinc-300">
                                {getInitials(enc.primaryDoctor.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-zinc-300">{enc.primaryDoctor.name}</p>
                              {enc.primaryDoctor.specialty && (
                                <p className="truncate text-[10px] text-zinc-600">{enc.primaryDoctor.specialty}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600">Não atribuído</span>
                        )}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="hidden py-3 xl:table-cell">
                        {(enc.location ?? enc.room) ? (
                          <div className="flex items-center gap-1 text-xs text-zinc-500">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {[enc.location, enc.room].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-700">—</span>
                        )}
                      </TableCell>

                      {/* Triage */}
                      <TableCell className="hidden py-3 sm:table-cell">
                        {triageInfo ? (
                          <div className="flex items-center gap-1.5">
                            <div className={cn('h-2.5 w-2.5 rounded-full', triageInfo.bg)} />
                            <span className={cn('text-xs', triageInfo.text)}>{triageInfo.label}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-700">—</span>
                        )}
                      </TableCell>

                      {/* Date/Time */}
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-zinc-300">{formatDate(dateStr)}</span>
                          <span className="text-[11px] text-zinc-500">
                            {formatTime(dateStr)}
                            {enc.startedAt && (
                              <span className="ml-1 text-zinc-600">• {timeSince(enc.startedAt)}</span>
                            )}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell
                        className="py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 border-zinc-700 bg-zinc-900"
                          >
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-xs text-zinc-200 focus:bg-zinc-800"
                              onClick={() => navigate(`/atendimentos/${enc.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5 text-zinc-400" />
                              Abrir prontuário
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            {enc.status !== 'IN_PROGRESS' && (
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-xs text-emerald-400 focus:bg-zinc-800"
                                onClick={() => handleQuickStatus(enc.id, 'IN_PROGRESS')}
                              >
                                <Zap className="h-3.5 w-3.5" />
                                Iniciar atendimento
                              </DropdownMenuItem>
                            )}
                            {enc.status === 'WAITING' && (
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-xs text-orange-400 focus:bg-zinc-800"
                                onClick={() => handleQuickStatus(enc.id, 'IN_TRIAGE')}
                              >
                                <Activity className="h-3.5 w-3.5" />
                                Iniciar triagem
                              </DropdownMenuItem>
                            )}
                            {['IN_PROGRESS', 'IN_TRIAGE', 'ON_HOLD'].includes(enc.status) && (
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-xs text-blue-400 focus:bg-zinc-800"
                                onClick={() => handleQuickStatus(enc.id, 'COMPLETED')}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Concluir atendimento
                              </DropdownMenuItem>
                            )}
                            {enc.status === 'IN_PROGRESS' && (
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-xs text-yellow-400 focus:bg-zinc-800"
                                onClick={() => handleQuickStatus(enc.id, 'ON_HOLD')}
                              >
                                <Clock className="h-3.5 w-3.5" />
                                Colocar em espera
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-xs text-zinc-500 focus:bg-zinc-800"
                              onClick={() => enc.patient && navigate(`/pacientes/${enc.patient.id}`)}
                            >
                              <UserRound className="h-3.5 w-3.5" />
                              Ver ficha do paciente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ────────────────────────────────── */}
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-500">
              {encountersData?.total
                ? `${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, encountersData.total)} de ${encountersData.total} atendimentos`
                : `${encounters.length} atendimentos`}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-7 min-w-[28px] border-zinc-700 px-2 text-xs',
                        pageNum === page
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'text-zinc-400 hover:bg-zinc-800',
                      )}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Quick Info Strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Triagens Pendentes</p>
                <p className="text-lg font-bold text-zinc-100">
                  {(allData?.data ?? []).filter((e) => e.status === 'IN_TRIAGE').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <ClipboardList className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Prontuários sem Nota</p>
                <p className="text-lg font-bold text-zinc-100">
                  {(allData?.data ?? []).filter((e) => e.status === 'IN_PROGRESS' && !e.clinicalNotes?.length).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Taxa de Conclusão Hoje</p>
                <p className="text-lg font-bold text-zinc-100">
                  {stats.todayTotal > 0
                    ? `${Math.round((stats.completed / Math.max(stats.todayTotal, 1)) * 100)}%`
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Create Dialog ────────────────────────────────────────── */}
      <CreateEncounterDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}
