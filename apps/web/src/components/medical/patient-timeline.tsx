import { useState, useMemo, memo, Fragment } from 'react';
import {
  FileText,
  Pill,
  TestTube,
  Activity,
  AlertTriangle,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  usePatientTimeline,
  type TimelineEntry,
  type TimelineFilters,
} from '@/services/nursing.service';

// ============================================================================
// Type config
// ============================================================================

interface TypeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeClass: string;
}

const TYPE_CONFIG: Record<TimelineEntry['type'], TypeConfig> = {
  clinical_note: {
    label: 'Evolucao',
    icon: FileText,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-400',
  },
  prescription: {
    label: 'Prescricao',
    icon: Pill,
    color: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-400',
  },
  exam: {
    label: 'Exame',
    icon: TestTube,
    color: 'text-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-400',
  },
  vital_signs: {
    label: 'Sinais Vitais',
    icon: Activity,
    color: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-400',
  },
  triage: {
    label: 'Triagem',
    icon: AlertTriangle,
    color: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-400',
  },
  document: {
    label: 'Documento',
    icon: FileCheck,
    color: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/20 text-cyan-400',
  },
};

// ============================================================================
// Component
// ============================================================================

interface PatientTimelineProps {
  patientId: string;
}

export const PatientTimeline = memo(function PatientTimeline({ patientId }: PatientTimelineProps) {
  const [filters, setFilters] = useState<TimelineFilters>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = usePatientTimeline(patientId, filters);

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleTypeFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      type: value === 'all' ? undefined : value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center py-12">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm text-muted-foreground">Erro ao carregar historico</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={filters.type ?? 'all'}
          onValueChange={handleTypeFilter}
        >
          <SelectTrigger className="w-44 bg-card border-border">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="clinical_note">Evolucoes</SelectItem>
            <SelectItem value="prescription">Prescricoes</SelectItem>
            <SelectItem value="exam">Exames</SelectItem>
            <SelectItem value="vital_signs">Sinais Vitais</SelectItem>
            <SelectItem value="triage">Triagem</SelectItem>
            <SelectItem value="document">Documentos</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          placeholder="Data inicio"
          className="w-40 bg-card border-border"
          value={filters.startDate ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              startDate: e.target.value || undefined,
            }))
          }
        />
        <Input
          type="date"
          placeholder="Data fim"
          className="w-40 bg-card border-border"
          value={filters.endDate ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              endDate: e.target.value || undefined,
            }))
          }
        />
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum evento encontrado no historico.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-0">
          {entries.map((entry, idx) => {
            const config = TYPE_CONFIG[entry.type];
            const Icon = config.icon;
            const isExpanded = expandedIds.has(entry.id);
            const isLast = idx === entries.length - 1;

            return (
              <Fragment key={entry.id}>
                <div
                  className="flex gap-3 animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}
                >
                  {/* Timeline rail */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background',
                        config.badgeClass,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 min-h-[16px] bg-gradient-to-b from-zinc-700 to-zinc-800/50" />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      'mb-3 flex-1 cursor-pointer rounded-lg border border-border p-3 transition-all hover:bg-secondary/50 hover:border-teal-500/20',
                      isExpanded && 'bg-secondary/30 border-teal-500/20',
                    )}
                    onClick={() => toggleExpand(entry.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px]', config.badgeClass)}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}{' '}
                            {new Date(entry.date).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {entry.professional && (
                            <span className="text-xs text-muted-foreground">
                              {entry.professional.name}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-foreground line-clamp-2">
                          {entry.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(entry.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <TimelineDetails entry={entry} />
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="border-border"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar mais'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Detail renderers
// ============================================================================

function TimelineDetails({ entry }: { entry: TimelineEntry }) {
  const details = entry.details as Record<string, string | undefined>;

  if (entry.type === 'clinical_note') {
    return (
      <div className="space-y-2 text-sm">
        {details.subjective && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Subjetivo</p>
            <p className="text-foreground">{String(details.subjective)}</p>
          </div>
        )}
        {details.objective && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Objetivo</p>
            <p className="text-foreground">{String(details.objective)}</p>
          </div>
        )}
        {details.assessment && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avaliacao</p>
            <p className="text-foreground">{String(details.assessment)}</p>
          </div>
        )}
        {details.plan && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Plano</p>
            <p className="text-foreground">{String(details.plan)}</p>
          </div>
        )}
        {details.freeText && !details.subjective && (
          <p className="text-foreground">{String(details.freeText)}</p>
        )}
      </div>
    );
  }

  if (entry.type === 'prescription') {
    const items = details.items as Array<{
      name: string | null;
      dose: string | null;
      route: string | null;
      frequency: string | null;
    }> | undefined;
    return (
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {String(details.prescriptionType)}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {String(details.status)}
          </Badge>
        </div>
        {items?.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <Pill className="h-3 w-3 text-muted-foreground" />
            <span>{item.name}</span>
            <span className="text-muted-foreground">
              {item.dose} — {item.route} — {item.frequency}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (entry.type === 'vital_signs') {
    return (
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {details.systolicBP != null && (
          <div>
            <p className="text-xs text-muted-foreground">PA</p>
            <p className="font-medium">{String(details.systolicBP)}/{String(details.diastolicBP)}</p>
          </div>
        )}
        {details.heartRate != null && (
          <div>
            <p className="text-xs text-muted-foreground">FC</p>
            <p className="font-medium">{String(details.heartRate)} bpm</p>
          </div>
        )}
        {details.respiratoryRate != null && (
          <div>
            <p className="text-xs text-muted-foreground">FR</p>
            <p className="font-medium">{String(details.respiratoryRate)} irpm</p>
          </div>
        )}
        {details.temperature != null && (
          <div>
            <p className="text-xs text-muted-foreground">Temp</p>
            <p className="font-medium">{String(details.temperature)} C</p>
          </div>
        )}
        {details.oxygenSaturation != null && (
          <div>
            <p className="text-xs text-muted-foreground">SpO2</p>
            <p className="font-medium">{String(details.oxygenSaturation)}%</p>
          </div>
        )}
        {details.painScale != null && (
          <div>
            <p className="text-xs text-muted-foreground">Dor</p>
            <p className="font-medium">{String(details.painScale)}/10</p>
          </div>
        )}
      </div>
    );
  }

  if (entry.type === 'exam') {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {String(details.examType)}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {String(details.status)}
          </Badge>
        </div>
        {details.aiInterpretation && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Interpretacao IA</p>
            <p className="text-foreground">{String(details.aiInterpretation)}</p>
          </div>
        )}
      </div>
    );
  }

  if (entry.type === 'triage') {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {String(details.protocol)}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            Nivel: {String(details.level)}
          </Badge>
        </div>
        <p className="text-foreground">{String(details.chiefComplaint)}</p>
      </div>
    );
  }

  if (entry.type === 'document') {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {String(details.documentType)}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {String(details.status)}
          </Badge>
        </div>
        {details.content && (
          <p className="text-foreground text-xs">{String(details.content)}</p>
        )}
      </div>
    );
  }

  return null;
}
