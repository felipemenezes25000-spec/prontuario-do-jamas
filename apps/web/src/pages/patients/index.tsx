import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Mic,
  Eye,
  Stethoscope,
  LayoutGrid,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Users,
  Activity,
  AlertTriangle,
  UserCheck,
  X,
  CalendarDays,
  ShieldAlert,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, getInitials, calculateAge, formatCPF } from '@/lib/utils';
import type { RiskLevel, Patient } from '@/types';
import { usePatients } from '@/services/patients.service';
import { useDebounce } from '@/hooks/use-debounce';
import { PageError } from '@/components/common/page-error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskLevelFromScore(score?: number): RiskLevel | undefined {
  if (score == null) return undefined;
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

const RISK_BADGE_STYLES: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  HIGH: 'bg-red-500/15 text-red-400 border-red-500/30',
  CRITICAL: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  LOW: 'Baixo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
  CRITICAL: 'Critico',
};

const TAG_COLORS: Record<string, string> = {
  'diabetico': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'hipertenso': 'bg-red-500/15 text-red-400 border-red-500/20',
  'cardiopata': 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  'asmatico': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'gestante': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'idoso': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'pediatrico': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'oncologico': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
] as const;

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

/** Deterministic gradient based on patient name */
function avatarGradient(name: string): string {
  const gradients = [
    'from-emerald-600 to-teal-700',
    'from-blue-600 to-indigo-700',
    'from-violet-600 to-purple-700',
    'from-rose-600 to-pink-700',
    'from-amber-600 to-orange-700',
    'from-cyan-600 to-sky-700',
    'from-fuchsia-600 to-purple-700',
    'from-lime-600 to-green-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % gradients.length;
  return gradients[idx] as string;
}

function maskCPF(cpf: string): string {
  const formatted = formatCPF(cpf);
  return `***.${formatted.slice(4, 7)}.${formatted.slice(8, 11)}-**`;
}

function formatDateBR(dateStr: string | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type ViewMode = 'grid' | 'table';

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card/50 p-4">
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

function PatientCardSkeleton() {
  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </td>
      <td className="hidden px-4 py-3 md:table-cell"><Skeleton className="h-4 w-28" /></td>
      <td className="hidden px-4 py-3 sm:table-cell"><Skeleton className="h-4 w-16" /></td>
      <td className="hidden px-4 py-3 lg:table-cell"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
    </tr>
  );
}

function LoadingState({ view }: { view: ViewMode }) {
  return (
    <>
      <StatsBarSkeleton />
      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PatientCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <table className="w-full">
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value.toLocaleString('pt-BR')}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <Card className="border-border bg-card/50 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-20">
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
            <Users className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-card border-2 border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Nenhum paciente encontrado</h3>
        <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
          {hasFilters
            ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar sua busca.'
            : 'Comece cadastrando o primeiro paciente no sistema.'}
        </p>
        {hasFilters && (
          <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Patient card (grid view)
// ---------------------------------------------------------------------------

function PatientCard({
  patient,
  index,
  onView,
  onNewEncounter,
}: {
  patient: Patient;
  index: number;
  onView: () => void;
  onNewEncounter: () => void;
}) {
  const displayName = patient.name ?? patient.fullName;
  const riskLevel = riskLevelFromScore(patient.riskScore);
  const age = calculateAge(patient.birthDate);
  const allergyCount = patient.allergies?.length ?? 0;

  return (
    <Card
      className={cn(
        'group cursor-pointer border-border bg-card/60 backdrop-blur-sm transition-all duration-300',
        'hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5',
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 ring-2 ring-border transition-all group-hover:ring-primary/30">
            <AvatarImage src={patient.photo} alt={displayName} />
            <AvatarFallback
              className={cn(
                'bg-gradient-to-br text-sm font-semibold text-white',
                avatarGradient(displayName),
              )}
            >
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold leading-tight">
                {displayName}
              </h3>
              {!patient.isActive && (
                <Badge variant="secondary" className="shrink-0 bg-zinc-500/20 text-[10px] text-zinc-400">
                  Inativo
                </Badge>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="font-mono">
                {patient.cpf ? maskCPF(patient.cpf) : '--'}
              </span>
              <span className="hidden sm:inline">&middot;</span>
              <span className="hidden sm:inline">{age} anos</span>
            </div>

            {/* Tags + Risk */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {riskLevel && (
                <Badge
                  variant="outline"
                  className={cn('text-[10px] font-semibold border', RISK_BADGE_STYLES[riskLevel])}
                >
                  <ShieldAlert className="mr-1 h-3 w-3" />
                  {RISK_LABEL[riskLevel]}
                </Badge>
              )}
              {allergyCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-orange-500/30 bg-orange-500/10 text-[10px] text-orange-400"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {allergyCount} alergia{allergyCount > 1 ? 's' : ''}
                </Badge>
              )}
              {(patient.tags ?? []).slice(0, 2).map((tag) => {
                const colorClass =
                  TAG_COLORS[tag.toLowerCase()] ?? 'bg-muted/50 text-muted-foreground border-border';
                return (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn('text-[10px] border', colorClass)}
                  >
                    {tag}
                  </Badge>
                );
              })}
              {(patient.tags ?? []).length > 2 && (
                <Badge variant="secondary" className="bg-secondary text-[10px] text-muted-foreground">
                  +{(patient.tags ?? []).length - 2}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>
              {patient.lastVisitAt
                ? `Ultima visita: ${formatDateBR(patient.lastVisitAt)}`
                : 'Sem visitas anteriores'}
            </span>
          </div>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView();
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ver prontuario</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewEncounter();
                    }}
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Novo atendimento</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Patient row (table view)
// ---------------------------------------------------------------------------

function PatientRow({
  patient,
  onView,
  onNewEncounter,
}: {
  patient: Patient;
  onView: () => void;
  onNewEncounter: () => void;
}) {
  const displayName = patient.name ?? patient.fullName;
  const riskLevel = riskLevelFromScore(patient.riskScore);
  const age = calculateAge(patient.birthDate);

  return (
    <tr
      onClick={onView}
      className="group cursor-pointer border-l-2 border-l-transparent transition-all hover:border-l-primary hover:bg-accent/30"
    >
      <td className="px-4 py-3">
        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-teal-600 dark:text-teal-400">
          {patient.mrn}
        </code>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={patient.photo} alt={displayName} />
            <AvatarFallback
              className={cn(
                'bg-gradient-to-br text-xs font-semibold text-white',
                avatarGradient(displayName),
              )}
            >
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="text-sm font-medium">{displayName}</span>
            {!patient.isActive && (
              <Badge
                variant="secondary"
                className="ml-2 bg-zinc-500/20 text-[10px] text-zinc-400"
              >
                Inativo
              </Badge>
            )}
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <span className="font-mono text-xs text-muted-foreground">
          {patient.cpf ? maskCPF(patient.cpf) : '--'}
        </span>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <span className="text-sm">{age} anos</span>
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        <span className="text-sm text-muted-foreground">
          {patient.insuranceProvider ?? 'Particular'}
        </span>
      </td>
      <td className="hidden px-4 py-3 xl:table-cell">
        <div className="flex flex-wrap gap-1">
          {(patient.tags ?? []).slice(0, 2).map((tag) => {
            const colorClass =
              TAG_COLORS[tag.toLowerCase()] ?? 'bg-muted/50 text-muted-foreground border-border';
            return (
              <Badge
                key={tag}
                variant="secondary"
                className={cn('text-[10px] border', colorClass)}
              >
                {tag}
              </Badge>
            );
          })}
          {(patient.tags ?? []).length > 2 && (
            <Badge variant="secondary" className="bg-secondary text-[10px] text-muted-foreground">
              +{(patient.tags ?? []).length - 2}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {riskLevel && (
          <Badge
            variant="outline"
            className={cn('text-[10px] font-semibold border', RISK_BADGE_STYLES[riskLevel])}
          >
            {RISK_LABEL[riskLevel]}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver prontuario</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewEncounter();
                  }}
                >
                  <Stethoscope className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novo atendimento</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (p: number) => void;
  onItemsPerPageChange: (n: number) => void;
}) {
  const pages = useMemo(() => {
    const result: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (page > 3) result.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        result.push(i);
      }
      if (page < totalPages - 2) result.push('ellipsis');
      result.push(totalPages);
    }
    return result;
  }, [page, totalPages]);

  const start = (page - 1) * itemsPerPage + 1;
  const end = Math.min(page * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          Mostrando <span className="font-medium text-foreground">{start}</span>-
          <span className="font-medium text-foreground">{end}</span> de{' '}
          <span className="font-medium text-foreground">{totalItems.toLocaleString('pt-BR')}</span>
        </p>
        <Select
          value={String(itemsPerPage)}
          onValueChange={(v) => onItemsPerPageChange(Number(v))}
        >
          <SelectTrigger className="h-8 w-[70px] text-xs border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEMS_PER_PAGE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8 text-xs border-border',
                p === page && 'bg-primary text-primary-foreground',
              )}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PatientsListPage() {
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [view, setView] = useState<ViewMode>('grid');

  const debouncedSearch = useDebounce(search, 300);

  const isActiveFilter = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;

  const {
    data: patientsData,
    isLoading,
    isError,
    refetch,
  } = usePatients({
    search: debouncedSearch || undefined,
    riskLevel: riskFilter !== 'all' ? riskFilter : undefined,
    isActive: isActiveFilter,
    page,
    limit: itemsPerPage,
  });

  const patients = patientsData?.data ?? [];
  const totalPatients = patientsData?.total ?? 0;
  const totalPages = patientsData?.totalPages ?? 1;

  // Compute stats from current data
  const stats = useMemo(() => {
    const activeToday = patients.filter((p) => {
      if (!p.lastVisitAt) return false;
      const visitDate = new Date(p.lastVisitAt);
      const today = new Date();
      return (
        visitDate.getFullYear() === today.getFullYear() &&
        visitDate.getMonth() === today.getMonth() &&
        visitDate.getDate() === today.getDate()
      );
    }).length;

    const criticalCount = patients.filter((p) => {
      const rl = riskLevelFromScore(p.riskScore);
      return rl === 'CRITICAL' || rl === 'HIGH';
    }).length;

    const activeCount = patients.filter((p) => p.isActive).length;

    return { activeToday, criticalCount, activeCount };
  }, [patients]);

  const hasActiveFilters =
    debouncedSearch.length > 0 || riskFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSearch('');
    setRiskFilter('all');
    setStatusFilter('all');
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  const handleItemsPerPageChange = useCallback((n: number) => {
    setItemsPerPage(n);
    setPage(1);
  }, []);

  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary text-xs font-semibold tabular-nums"
              >
                {totalPatients.toLocaleString('pt-BR')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Gerencie o cadastro e prontuario dos pacientes
            </p>
          </div>
        </div>

        <Button
          onClick={() => navigate('/pacientes/novo')}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats bar                                                         */}
      {/* ----------------------------------------------------------------- */}
      {isLoading ? (
        <StatsBarSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total de pacientes"
            value={totalPatients}
            accent="bg-primary/10 text-primary"
          />
          <StatCard
            icon={UserCheck}
            label="Ativos na pagina"
            value={stats.activeCount}
            accent="bg-emerald-500/10 text-emerald-400"
          />
          <StatCard
            icon={Activity}
            label="Atendidos hoje"
            value={stats.activeToday}
            accent="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            icon={Heart}
            label="Alto risco / Criticos"
            value={stats.criticalCount}
            accent="bg-red-500/10 text-red-400"
          />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Search & Filters                                                  */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search input */}
          <div className="group relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Buscar por nome, CPF ou prontuario..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={cn(
                'pl-10 pr-10 h-10 bg-card/50 backdrop-blur-sm border-border transition-all',
                'focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:bg-card',
              )}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Voice search */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 border-border hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Busca por voz</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Risk filter */}
          <Select
            value={riskFilter}
            onValueChange={(v) => {
              setRiskFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44 h-10 bg-card/50 border-border">
              <SelectValue placeholder="Nivel de Risco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os riscos</SelectItem>
              <SelectItem value="LOW">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Baixo
                </span>
              </SelectItem>
              <SelectItem value="MEDIUM">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Medio
                </span>
              </SelectItem>
              <SelectItem value="HIGH">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Alto
                </span>
              </SelectItem>
              <SelectItem value="CRITICAL">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                  Critico
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-36 h-10 bg-card/50 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="hidden sm:flex items-center rounded-lg border border-border bg-card/50 p-0.5">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={view === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setView('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualizacao em cartoes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={view === 'table' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setView('table')}
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualizacao em tabela</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtros ativos:</span>
            {debouncedSearch && (
              <Badge
                variant="secondary"
                className="gap-1 bg-primary/10 text-primary text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                Busca: &quot;{debouncedSearch}&quot;
                <X className="h-3 w-3" />
              </Badge>
            )}
            {riskFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="gap-1 bg-primary/10 text-primary text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => {
                  setRiskFilter('all');
                  setPage(1);
                }}
              >
                Risco: {RISK_LABEL[riskFilter as RiskLevel] ?? riskFilter}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="gap-1 bg-primary/10 text-primary text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => {
                  setStatusFilter('all');
                  setPage(1);
                }}
              >
                Status: {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter}
                <X className="h-3 w-3" />
              </Badge>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Content                                                           */}
      {/* ----------------------------------------------------------------- */}
      {isLoading ? (
        <LoadingState view={view} />
      ) : patients.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
      ) : view === 'grid' ? (
        /* ---- Grid view ---- */
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {patients.map((patient, i) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                index={i}
                onView={() => navigate(`/pacientes/${patient.id}`)}
                onNewEncounter={() => navigate(`/atendimentos/novo?paciente=${patient.id}`)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <Card className="border-border bg-card overflow-hidden">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalPatients}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </Card>
          )}
        </>
      ) : (
        /* ---- Table view ---- */
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Prontuario
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Paciente
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">
                    CPF
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">
                    Idade
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground lg:table-cell">
                    Convenio
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground xl:table-cell">
                    Tags
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Risco</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {patients.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    onView={() => navigate(`/pacientes/${patient.id}`)}
                    onNewEncounter={() =>
                      navigate(`/atendimentos/novo?paciente=${patient.id}`)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalPatients}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </Card>
      )}
    </div>
  );
}
