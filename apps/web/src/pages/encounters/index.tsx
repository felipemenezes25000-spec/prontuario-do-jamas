import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  BarChart3,
  Timer,
  ArrowRight,
  Heart,
  Building2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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

const DEPARTMENT_COLORS: Record<string, string> = {
  'Clínica Médica': 'bg-blue-400',
  'Cardiologia': 'bg-red-400',
  'Ortopedia': 'bg-amber-400',
  'Neurologia': 'bg-purple-400',
  'Pediatria': 'bg-pink-400',
  'Ginecologia': 'bg-rose-400',
  'Oncologia': 'bg-violet-400',
  'Pneumologia': 'bg-sky-400',
  'Gastroenterologia': 'bg-orange-400',
  'Nefrologia': 'bg-teal-400',
  'Urologia': 'bg-cyan-400',
  'Endocrinologia': 'bg-lime-400',
  'Reumatologia': 'bg-indigo-400',
  'Dermatologia': 'bg-fuchsia-400',
  'Psiquiatria': 'bg-emerald-400',
  'Geriatria': 'bg-yellow-400',
  'Pronto-Socorro': 'bg-red-500',
  'UTI': 'bg-red-600',
  'Cirurgia Geral': 'bg-zinc-400',
  'Cirurgia Vascular': 'bg-blue-500',
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string; ring: string }> = {
  LOW: { label: 'Baixa', color: 'text-zinc-400', dot: 'bg-zinc-400', ring: 'ring-zinc-400/30' },
  NORMAL: { label: 'Normal', color: 'text-blue-400', dot: 'bg-blue-400', ring: 'ring-blue-400/30' },
  HIGH: { label: 'Alta', color: 'text-orange-400', dot: 'bg-orange-400', ring: 'ring-orange-400/30' },
  URGENT: { label: 'Urgente', color: 'text-red-400', dot: 'bg-red-400', ring: 'ring-red-400/30' },
  EMERGENCY: { label: 'Emergência', color: 'text-red-300', dot: 'bg-red-300 animate-pulse', ring: 'ring-red-300/40' },
};

const STATUS_ICONS: Record<EncounterStatus, React.ElementType> = {
  SCHEDULED: CalendarDays,
  WAITING: Clock,
  IN_TRIAGE: AlertTriangle,
  IN_PROGRESS: Activity,
  ON_HOLD: Timer,
  COMPLETED: CheckCircle2,
  CANCELLED: X,
  NO_SHOW: UserRound,
  TRANSFERRED: ArrowRight,
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

function computeAverageTime(encounters: Array<{ startedAt?: string | null; endedAt?: string | null }>): string {
  const completed = encounters.filter((e) => e.startedAt && e.endedAt);
  if (completed.length === 0) return '--';
  const totalMs = completed.reduce((sum, e) => {
    return sum + (new Date(e.endedAt!).getTime() - new Date(e.startedAt!).getTime());
  }, 0);
  const avgMins = Math.round(totalMs / completed.length / 60000);
  if (avgMins < 60) return `${avgMins}min`;
  return `${Math.floor(avgMins / 60)}h${avgMins % 60 > 0 ? ` ${avgMins % 60}min` : ''}`;
}

// ============================================================================
// Animated Number
// ============================================================================

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) {
      setDisplayed(to);
      return;
    }
    const duration = 500;
    const start = performance.now();
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{displayed}</span>;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function EncountersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl bg-zinc-800" />
            <Skeleton className="h-8 w-48 bg-zinc-800" />
            <Skeleton className="h-6 w-12 rounded-full bg-zinc-800" />
          </div>
          <Skeleton className="h-4 w-80 bg-zinc-800" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg bg-zinc-800" />
          <Skeleton className="h-9 w-40 rounded-lg bg-zinc-800" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20 bg-zinc-800" />
                <Skeleton className="h-9 w-14 bg-zinc-800" />
                <Skeleton className="h-3 w-28 bg-zinc-800" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Search bar skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg bg-zinc-800" />
        <Skeleton className="h-10 w-24 rounded-lg bg-zinc-800" />
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full max-w-2xl rounded-lg bg-zinc-800" />

      {/* Table skeleton */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-800 px-4 py-3">
          <div className="grid grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 bg-zinc-800" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-zinc-800/50 px-4 py-3.5"
            style={{ opacity: 1 - i * 0.1 }}
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32 bg-zinc-800" />
                <Skeleton className="h-3 w-20 bg-zinc-800" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
              <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
              <Skeleton className="hidden h-4 w-40 bg-zinc-800 md:block" />
              <Skeleton className="hidden h-4 w-24 bg-zinc-800 lg:block" />
              <Skeleton className="h-4 w-16 bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Stat Card
// ============================================================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderAccent?: string;
  delta?: { value: string; positive: boolean };
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, iconColor, bgColor, borderAccent, delta, subtitle }: StatCardProps) {
  return (
    <Card className={cn(
      'group relative overflow-hidden border-zinc-800 bg-zinc-900 transition-all duration-300 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20',
      borderAccent,
    )}>
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:from-white/[0.02] group-hover:to-transparent" />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
            <div className="mt-1.5 text-3xl font-bold tabular-nums text-zinc-50">
              <AnimatedNumber value={value} />
            </div>
            {subtitle && (
              <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
            )}
            {delta && (
              <div className={cn(
                'mt-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                delta.positive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400',
              )}>
                {delta.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta.value}
              </div>
            )}
          </div>
          <div className={cn(
            'rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110',
            bgColor,
          )}>
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
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-2">
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
                className="border-zinc-700 bg-zinc-900 pl-9 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
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
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/40">
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
                            className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-zinc-800"
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
                                {p.birthDate && ` \u2022 ${calculateAge(p.birthDate)} anos`}
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
                  \u2022 Prontuário {selectedPatient.mrn}
                  {selectedPatient.birthDate && ` \u2022 ${calculateAge(selectedPatient.birthDate)} anos`}
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
                      <span className="flex items-center gap-2">
                        <span className={cn('inline-block h-2 w-2 rounded-full', DEPARTMENT_COLORS[d] ?? 'bg-zinc-500')} />
                        {d}
                      </span>
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
                className="absolute right-2.5 top-2.5 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
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
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-900/40 disabled:opacity-50"
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
// Encounter Detail Sheet
// ============================================================================

interface EncounterDetailSheetProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  encounter: Record<string, any> | null;
  open: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onStatusChange: (id: string, status: EncounterStatus) => void;
}

function EncounterDetailSheet({ encounter, open, onClose, onNavigate, onStatusChange }: EncounterDetailSheetProps) {
  if (!encounter) return null;

  const statusInfo = encounterStatusLabels[encounter.status as EncounterStatus];
  const priorityInfo = PRIORITY_CONFIG[encounter.priority as Priority];
  const triageInfo = encounter.triageLevel ? triageLevelColors[encounter.triageLevel as keyof typeof triageLevelColors] : null;
  const patientName = encounter.patient?.fullName ?? encounter.patient?.name ?? 'Paciente desconhecido';
  const StatusIcon = STATUS_ICONS[encounter.status as EncounterStatus] ?? Activity;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full border-zinc-800 bg-zinc-950 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="text-zinc-100">Detalhes do Atendimento</SheetTitle>
            <Badge className={cn('text-[11px] text-white', statusInfo?.color)}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusInfo?.label}
            </Badge>
          </div>
          <SheetDescription className="text-xs text-zinc-500">
            Criado em {formatDate(encounter.createdAt)} às {formatTime(encounter.createdAt)}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="space-y-6 p-6">
            {/* Patient info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-emerald-500/20">
                <AvatarFallback className="bg-emerald-500/10 text-sm font-bold text-emerald-400">
                  {getInitials(patientName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-zinc-100">{patientName}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  {encounter.patient?.mrn && (
                    <span>Prontuário #{encounter.patient.mrn}</span>
                  )}
                  {encounter.patient?.birthDate && (
                    <span>\u2022 {calculateAge(encounter.patient.birthDate)} anos</span>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Key info grid */}
            <div className="grid grid-cols-2 gap-4">
              <DetailItem
                label="Tipo"
                value={encounterTypeLabels[encounter.type as EncounterType]}
                icon={Stethoscope}
              />
              <DetailItem
                label="Prioridade"
                value={
                  <span className={cn('flex items-center gap-1.5', priorityInfo?.color)}>
                    <span className={cn('h-2 w-2 rounded-full', priorityInfo?.dot)} />
                    {priorityInfo?.label}
                  </span>
                }
                icon={Shield}
              />
              <DetailItem
                label="Departamento"
                value={
                  encounter.location ? (
                    <span className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', DEPARTMENT_COLORS[encounter.location as string] ?? 'bg-zinc-500')} />
                      {encounter.location}
                    </span>
                  ) : '--'
                }
                icon={Building2}
              />
              <DetailItem
                label="Sala / Leito"
                value={encounter.room ?? '--'}
                icon={MapPin}
              />
              {triageInfo && (
                <DetailItem
                  label="Classificação de Risco"
                  value={
                    <span className={cn('flex items-center gap-1.5', triageInfo.text)}>
                      <span className={cn('h-2.5 w-2.5 rounded-full', triageInfo.bg)} />
                      {triageInfo.label}
                    </span>
                  }
                  icon={Heart}
                />
              )}
              <DetailItem
                label="Duração"
                value={encounter.startedAt ? timeSince(encounter.startedAt) : '--'}
                icon={Timer}
              />
            </div>

            {/* Doctor */}
            {encounter.primaryDoctor && (
              <>
                <Separator className="bg-zinc-800" />
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Médico Responsável</p>
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-blue-500/10 text-xs text-blue-400">
                        {getInitials(encounter.primaryDoctor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{encounter.primaryDoctor.name}</p>
                      {encounter.primaryDoctor.specialty && (
                        <p className="text-xs text-zinc-500">{encounter.primaryDoctor.specialty}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Chief complaint */}
            {encounter.chiefComplaint && (
              <>
                <Separator className="bg-zinc-800" />
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Queixa Principal</p>
                  <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm leading-relaxed text-zinc-300">
                    {encounter.chiefComplaint}
                  </p>
                </div>
              </>
            )}

            {/* Date info */}
            <Separator className="bg-zinc-800" />
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Cronologia</p>
              <div className="space-y-2">
                {encounter.scheduledAt && (
                  <TimelineItem label="Agendado" dateStr={encounter.scheduledAt} />
                )}
                {encounter.startedAt && (
                  <TimelineItem label="Iniciado" dateStr={encounter.startedAt} active />
                )}
                {encounter.endedAt && (
                  <TimelineItem label="Finalizado" dateStr={encounter.endedAt} />
                )}
                {!encounter.scheduledAt && !encounter.startedAt && (
                  <TimelineItem label="Criado" dateStr={encounter.createdAt} />
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="border-t border-zinc-800 px-6 py-3 flex items-center gap-2">
          <Button
            onClick={() => { onNavigate(encounter.id); onClose(); }}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-emerald-400"
          >
            <Eye className="mr-2 h-4 w-4" />
            Abrir Prontuário
          </Button>
          {encounter.status !== 'COMPLETED' && encounter.status !== 'CANCELLED' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-zinc-700 bg-zinc-900">
                {encounter.status !== 'IN_PROGRESS' && (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-xs text-emerald-400 focus:bg-zinc-800"
                    onClick={() => onStatusChange(encounter.id, 'IN_PROGRESS')}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Iniciar atendimento
                  </DropdownMenuItem>
                )}
                {['IN_PROGRESS', 'IN_TRIAGE', 'ON_HOLD'].includes(encounter.status) && (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-xs text-blue-400 focus:bg-zinc-800"
                    onClick={() => onStatusChange(encounter.id, 'COMPLETED')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Concluir atendimento
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailItem({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm text-zinc-300">{value}</div>
    </div>
  );
}

function TimelineItem({ label, dateStr, active }: { label: string; dateStr: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={cn(
        'h-2 w-2 rounded-full',
        active ? 'bg-emerald-400 ring-4 ring-emerald-400/20' : 'bg-zinc-600',
      )} />
      <span className="w-20 text-xs text-zinc-500">{label}</span>
      <span className="text-zinc-300">{formatDate(dateStr)}</span>
      <span className="text-zinc-500">{formatTime(dateStr)}</span>
    </div>
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
  const hasAnyFilter = Object.values(filters).some(Boolean);

  return (
    <Card className="border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Department / Location */}
          <div className="min-w-[180px] flex-1 space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Departamento</Label>
            <Select
              value={(filters as Record<string, string | undefined>).location ?? 'ALL'}
              onValueChange={(v) => onChange({ location: v === 'ALL' ? undefined : v } as Partial<EncounterFilters>)}
            >
              <SelectTrigger className="h-9 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200 focus:border-emerald-500/50">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900">
                <SelectItem value="ALL" className="text-xs text-zinc-200">Todos os departamentos</SelectItem>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs text-zinc-200">
                    <span className="flex items-center gap-2">
                      <span className={cn('inline-block h-2 w-2 rounded-full', DEPARTMENT_COLORS[d] ?? 'bg-zinc-500')} />
                      {d}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Tipo</Label>
            <Select
              value={filters.type ?? 'ALL'}
              onValueChange={(v) => onChange({ type: v === 'ALL' ? undefined : v as EncounterType })}
            >
              <SelectTrigger className="h-9 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200 focus:border-emerald-500/50">
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
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Status</Label>
            <Select
              value={filters.status ?? 'ALL'}
              onValueChange={(v) => onChange({ status: v === 'ALL' ? undefined : v as EncounterStatus })}
            >
              <SelectTrigger className="h-9 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200 focus:border-emerald-500/50">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900">
                <SelectItem value="ALL" className="text-xs text-zinc-200">Todos os status</SelectItem>
                {(Object.entries(encounterStatusLabels) as [EncounterStatus, { label: string; color: string }][]).map(
                  ([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs text-zinc-200">
                      <span className="flex items-center gap-2">
                        <span className={cn('inline-block h-2 w-2 rounded-full', v.color)} />
                        {v.label}
                      </span>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="min-w-[140px] flex-1 space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Prioridade</Label>
            <Select
              value={(filters as Record<string, string | undefined>).priority ?? 'ALL'}
              onValueChange={(v) => onChange({ priority: v === 'ALL' ? undefined : v } as Partial<EncounterFilters>)}
            >
              <SelectTrigger className="h-9 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200 focus:border-emerald-500/50">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900">
                <SelectItem value="ALL" className="text-xs text-zinc-200">Todas as prioridades</SelectItem>
                {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs text-zinc-200">
                    <span className="flex items-center gap-2">
                      <span className={cn('inline-block h-2 w-2 rounded-full', v.dot)} />
                      {v.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date from */}
          <div className="min-w-[150px] flex-1 space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Data inicial</Label>
            <Input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(e) => onChange({ startDate: e.target.value || undefined })}
              className="h-9 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200 focus:border-emerald-500/50 [color-scheme:dark]"
            />
          </div>

          {/* Date to */}
          <div className="min-w-[150px] flex-1 space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Data final</Label>
            <Input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(e) => onChange({ endDate: e.target.value || undefined })}
              className="h-9 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200 focus:border-emerald-500/50 [color-scheme:dark]"
            />
          </div>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!hasAnyFilter}
            className={cn(
              'h-9 border text-xs transition-all',
              hasAnyFilter
                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300'
                : 'border-zinc-700 text-zinc-600',
            )}
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
// Empty State
// ============================================================================

function EmptyState({ searchQuery, hasFilters, onClear }: { searchQuery: string; hasFilters: boolean; onClear: () => void }) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="flex flex-col items-center justify-center py-24">
        <div className="relative">
          <div className="rounded-2xl bg-zinc-800/50 p-5">
            <FileX className="h-10 w-10 text-zinc-600" />
          </div>
          <div className="absolute -right-1 -top-1 rounded-full bg-zinc-800 p-1">
            <Search className="h-4 w-4 text-zinc-600" />
          </div>
        </div>
        <h3 className="mt-5 text-lg font-semibold text-zinc-300">
          Nenhum atendimento encontrado
        </h3>
        <p className="mt-1.5 max-w-sm text-center text-sm text-zinc-600">
          {searchQuery
            ? `Nenhum resultado para "${searchQuery}". Tente termos diferentes ou limpe os filtros.`
            : 'Não há atendimentos com os filtros selecionados. Ajuste os filtros ou crie um novo atendimento.'}
        </p>
        {(searchQuery || hasFilters) && (
          <Button
            variant="outline"
            size="sm"
            className="mt-5 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            onClick={onClear}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpar busca e filtros
          </Button>
        )}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedEncounter, setSelectedEncounter] = useState<Record<string, any> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
    const avgTime = computeAverageTime(todayAll);
    return {
      todayTotal: todayAll.length,
      inProgress: inProgress.length,
      scheduled: scheduled.length,
      completed: completed.length,
      waiting: waiting.length,
      avgTime,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleRowClick(enc: Record<string, any>) {
    setSelectedEncounter(enc);
    setDetailOpen(true);
  }

  if (isLoading) return <EncountersLoadingSkeleton />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-2.5">
                <Stethoscope className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
                  Atendimentos
                </h1>
                <Badge
                  variant="secondary"
                  className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-emerald-400"
                >
                  {allData?.total ?? tabCounts.all}
                </Badge>
                {isFetching && (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400/60" />
                )}
              </div>
            </div>
            <p className="mt-1.5 text-sm text-zinc-500">
              Gerencie todos os atendimentos clínicos — consultas, emergências, internações e mais.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="h-9 w-9 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-zinc-800 text-xs text-zinc-200">
                Atualizar lista
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-900/40"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Atendimento
            </Button>
          </div>
        </div>

        {/* ── Stats Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Total Hoje"
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
            borderAccent={stats.inProgress > 0 ? 'border-l-2 border-l-blue-500/50' : undefined}
            subtitle={`+ ${stats.waiting} aguardando`}
          />
          <StatCard
            title="Finalizados"
            value={stats.completed}
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            bgColor="bg-emerald-500/8"
            subtitle="concluídos hoje"
          />
          <StatCard
            title="Tempo Médio"
            value={0}
            icon={Timer}
            iconColor="text-amber-400"
            bgColor="bg-amber-500/10"
            subtitle={stats.avgTime !== '--' ? stats.avgTime : 'sem dados suficientes'}
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
              className="border-zinc-700 bg-zinc-900 pl-9 pr-9 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'h-9 border-zinc-700 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200',
              showFilters && 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400',
            )}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge className="ml-1.5 h-5 min-w-[20px] rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className={cn('ml-1 h-3.5 w-3.5 transition-transform duration-200', showFilters && 'rotate-180')} />
          </Button>
        </div>

        {/* ── Advanced Filters (collapsible) ─────────────────────────── */}
        <div
          className={cn(
            'grid transition-all duration-300 ease-in-out',
            showFilters ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <FiltersPanel filters={advFilters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <Tabs value={tabFilter} onValueChange={handleTabChange}>
          <TabsList className="w-full border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sm:w-auto">
            <TabsTrigger value="all" className="gap-1.5 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
              <Users className="h-3.5 w-3.5" />
              Todos
              <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] tabular-nums data-[state=active]:bg-zinc-600">
                {tabCounts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Activity className="h-3.5 w-3.5" />
              Em Andamento
              {tabCounts.active > 0 && (
                <span className="rounded-full bg-emerald-700/60 px-1.5 py-0.5 text-[10px] tabular-nums data-[state=active]:bg-emerald-500">
                  {tabCounts.active}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="waiting" className="gap-1.5 text-xs data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
              <Clock className="h-3.5 w-3.5" />
              Aguardando
              {tabCounts.waiting > 0 && (
                <span className="rounded-full bg-yellow-700/60 px-1.5 py-0.5 text-[10px] tabular-nums data-[state=active]:bg-yellow-500">
                  {tabCounts.waiting}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-1.5 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
              <CalendarDays className="h-3.5 w-3.5" />
              Agendados
              <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] tabular-nums data-[state=active]:bg-zinc-600">
                {tabCounts.scheduled}
              </span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Concluídos
              <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] tabular-nums data-[state=active]:bg-zinc-600">
                {tabCounts.completed}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── Main Table ─────────────────────────────────────────────── */}
        {encounters.length === 0 ? (
          <EmptyState
            searchQuery={searchQuery}
            hasFilters={activeFilterCount > 0}
            onClear={() => { setSearchQuery(''); handleFilterReset(); }}
          />
        ) : (
          <Card className="overflow-hidden border-zinc-800 bg-zinc-900">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="w-[200px] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Paciente</TableHead>
                    <TableHead className="w-[110px] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Departamento</TableHead>
                    <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Status</TableHead>
                    <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-zinc-500 md:table-cell">Queixa Principal</TableHead>
                    <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-zinc-500 lg:table-cell">Médico</TableHead>
                    <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:table-cell">Triagem</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Horário</TableHead>
                    <TableHead className="w-10 text-[11px] font-semibold uppercase tracking-wider text-zinc-500" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {encounters.map((enc, index) => {
                    const statusInfo = encounterStatusLabels[enc.status];
                    const triageInfo = enc.triageLevel ? triageLevelColors[enc.triageLevel] : null;
                    const priorityInfo = PRIORITY_CONFIG[enc.priority];
                    const patientName = enc.patient?.fullName ?? enc.patient?.name ?? 'Paciente desconhecido';
                    const dateStr = enc.startedAt ?? enc.scheduledAt ?? enc.createdAt;
                    const StatusIcon = STATUS_ICONS[enc.status] ?? Activity;
                    const isEmergency = enc.priority === 'EMERGENCY' || enc.priority === 'URGENT';

                    return (
                      <TableRow
                        key={enc.id}
                        className={cn(
                          'group cursor-pointer border-zinc-800/60 transition-all duration-200 hover:bg-zinc-800/40',
                          isEmergency && 'bg-red-950/10 hover:bg-red-950/20',
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                        onClick={() => handleRowClick(enc)}
                      >
                        {/* Patient */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-9 w-9 shrink-0 transition-transform duration-200 group-hover:scale-105">
                                <AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                                  {getInitials(patientName)}
                                </AvatarFallback>
                              </Avatar>
                              {/* Priority indicator dot */}
                              {enc.priority !== 'NORMAL' && enc.priority !== 'LOW' && (
                                <span className={cn(
                                  'absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-900',
                                  priorityInfo.dot,
                                )} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-emerald-300">
                                {patientName}
                              </p>
                              <div className="flex items-center gap-1.5">
                                {enc.patient?.mrn && (
                                  <span className="text-[11px] text-zinc-500">#{enc.patient.mrn}</span>
                                )}
                                {enc.patient?.birthDate && (
                                  <span className="text-[11px] text-zinc-600">
                                    \u2022 {calculateAge(enc.patient.birthDate)}a
                                  </span>
                                )}
                                {enc.priority !== 'NORMAL' && enc.priority !== 'LOW' && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'ml-0.5 h-4 border-0 px-1 text-[9px] font-bold uppercase',
                                      priorityInfo.color,
                                      'bg-current/10',
                                    )}
                                  >
                                    {priorityInfo.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Department */}
                        <TableCell className="py-3">
                          {enc.location ? (
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                'h-2 w-2 shrink-0 rounded-full',
                                DEPARTMENT_COLORS[enc.location as string] ?? 'bg-zinc-500',
                              )} />
                              <span className="truncate text-xs text-zinc-400">{enc.location}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700">\u2014</span>
                          )}
                          {enc.room && (
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-600">
                              <MapPin className="h-2.5 w-2.5" />
                              {enc.room}
                            </div>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3">
                          <Badge
                            className={cn(
                              'gap-1 text-[11px] font-medium text-white',
                              statusInfo?.color,
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo?.label}
                          </Badge>
                        </TableCell>

                        {/* Chief complaint */}
                        <TableCell className="hidden max-w-[220px] py-3 md:table-cell">
                          {enc.chiefComplaint ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="truncate text-sm text-zinc-400 transition-colors group-hover:text-zinc-300">
                                  {enc.chiefComplaint}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs bg-zinc-800 text-xs text-zinc-200">
                                {enc.chiefComplaint}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-zinc-700">\u2014</span>
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
                                <p className="truncate text-xs text-zinc-300">{enc.primaryDoctor.name}</p>
                                {enc.primaryDoctor.specialty && (
                                  <p className="truncate text-[10px] text-zinc-600">{enc.primaryDoctor.specialty}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs italic text-zinc-700">Não atribuído</span>
                          )}
                        </TableCell>

                        {/* Triage */}
                        <TableCell className="hidden py-3 sm:table-cell">
                          {triageInfo ? (
                            <div className="flex items-center gap-1.5">
                              <div className={cn('h-2.5 w-2.5 rounded-full ring-2 ring-current/20', triageInfo.bg)} />
                              <span className={cn('text-xs font-medium', triageInfo.text)}>{triageInfo.label}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700">\u2014</span>
                          )}
                        </TableCell>

                        {/* Date/Time */}
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-xs tabular-nums text-zinc-300">{formatTime(dateStr)}</span>
                            <span className="text-[10px] text-zinc-600">
                              {isToday(dateStr) ? 'Hoje' : formatDate(dateStr)}
                              {enc.startedAt && (
                                <span className="ml-1 font-medium text-zinc-500">\u2022 {timeSince(enc.startedAt)}</span>
                              )}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell
                          className="py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                                  onClick={() => navigate(`/atendimentos/${enc.id}`)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="bg-zinc-800 text-xs text-zinc-200">
                                Abrir prontuário
                              </TooltipContent>
                            </Tooltip>

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
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ── Pagination ────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
              <p className="text-xs tabular-nums text-zinc-500">
                {encountersData?.total
                  ? `${((page - 1) * PAGE_SIZE) + 1}\u2013${Math.min(page * PAGE_SIZE, encountersData.total)} de ${encountersData.total} atendimentos`
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
                          'h-7 min-w-[28px] border-zinc-700 px-2 text-xs tabular-nums',
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
          <Card className="group border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-500/10 p-2.5 transition-transform duration-300 group-hover:scale-110">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Triagens Pendentes</p>
                  <p className="text-lg font-bold tabular-nums text-zinc-100">
                    <AnimatedNumber value={(allData?.data ?? []).filter((e) => e.status === 'IN_TRIAGE').length} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-500/10 p-2.5 transition-transform duration-300 group-hover:scale-110">
                  <ClipboardList className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Prontuários sem Nota</p>
                  <p className="text-lg font-bold tabular-nums text-zinc-100">
                    <AnimatedNumber value={(allData?.data ?? []).filter((e) => e.status === 'IN_PROGRESS' && !e.clinicalNotes?.length).length} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2.5 transition-transform duration-300 group-hover:scale-110">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Taxa de Conclusão Hoje</p>
                  <p className="text-lg font-bold tabular-nums text-zinc-100">
                    {stats.todayTotal > 0
                      ? `${Math.round((stats.completed / Math.max(stats.todayTotal, 1)) * 100)}%`
                      : '\u2014'}
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

        {/* ── Detail Sheet ─────────────────────────────────────────── */}
        <EncounterDetailSheet
          encounter={selectedEncounter}
          open={detailOpen}
          onClose={() => { setDetailOpen(false); setSelectedEncounter(null); }}
          onNavigate={(id) => navigate(`/atendimentos/${id}`)}
          onStatusChange={handleQuickStatus}
        />
      </div>
    </TooltipProvider>
  );
}
