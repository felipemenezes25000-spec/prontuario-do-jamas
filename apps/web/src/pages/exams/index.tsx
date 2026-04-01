import { useState, useMemo } from 'react';
import {
  Search,
  FileX,
  TrendingUp,
  FlaskConical,
  Microscope,
  Activity,
  ClipboardCheck,
  Clock,
  AlertCircle,
  Eye,
  Filter,
  Beaker,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useExams } from '@/services/exams.service';
import { LabTrendChart } from '@/components/medical/lab-trend-chart';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';


const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  REQUESTED: { label: 'Solicitado', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
  SCHEDULED: { label: 'Agendado', color: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  COLLECTED: { label: 'Coletado', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  IN_PROGRESS: { label: 'Em Analise', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
  COMPLETED: { label: 'Concluido', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  CANCELLED: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
  REVIEWED: { label: 'Revisado', color: 'text-teal-400', bg: 'bg-teal-500/15', border: 'border-teal-500/30' },
};

const typeConfig: Record<string, { label: string; icon: typeof FlaskConical; color: string }> = {
  LABORATORY: { label: 'Laboratorial', icon: FlaskConical, color: 'text-emerald-400' },
  IMAGING: { label: 'Imagem', icon: Eye, color: 'text-blue-400' },
  FUNCTIONAL: { label: 'Funcional', icon: Activity, color: 'text-purple-400' },
  PATHOLOGY: { label: 'Patologia', icon: Microscope, color: 'text-rose-400' },
  GENETIC: { label: 'Genetico', icon: Beaker, color: 'text-cyan-400' },
  MICROBIOLOGICAL: { label: 'Microbiologico', icon: Microscope, color: 'text-amber-400' },
  OTHER: { label: 'Outro', icon: ClipboardCheck, color: 'text-zinc-400' },
};

// Lab results from the API may come as an array of analyte objects
interface LabResultItem {
  analyte: string;
  value: string;
  reference?: string;
  flag?: 'HIGH' | 'LOW' | 'CRITICAL';
}

function parseLabResults(labResults: unknown): LabResultItem[] {
  if (!labResults) return [];
  if (Array.isArray(labResults)) {
    return labResults.filter(
      (r): r is LabResultItem =>
        typeof r === 'object' && r !== null && 'analyte' in r && 'value' in r,
    );
  }
  return [];
}

const flagConfig = {
  HIGH: { label: 'Alto', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: TrendingUp },
  LOW: { label: 'Baixo', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', icon: TrendingUp },
  CRITICAL: { label: 'Critico', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', icon: AlertCircle },
};

export default function ExamsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [trendingAnalyte, setTrendingAnalyte] = useState<string | null>(null);
  const [trendingPatientId, setTrendingPatientId] = useState<string | null>(null);

  const { data: examsData, isLoading, isError, refetch } = useExams();
  const allExams = examsData?.data ?? [];

  const filtered = useMemo(() =>
    allExams.filter((e) => {
      if (
        search &&
        !(e.examName ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !(e.patientId ?? '').toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (typeFilter !== 'all' && e.examType !== typeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      return true;
    }),
    [allExams, search, typeFilter, statusFilter],
  );

  const examDetail = selectedExam ? allExams.find((e) => e.id === selectedExam) : null;
  const examDetailResults = examDetail ? parseLabResults(examDetail.labResults) : [];

  // KPIs
  const kpis = useMemo(() => {
    const total = allExams.length;
    const pending = allExams.filter((e) => ['REQUESTED', 'SCHEDULED', 'COLLECTED', 'IN_PROGRESS'].includes(e.status)).length;
    const completed = allExams.filter((e) => e.status === 'COMPLETED' || e.status === 'REVIEWED').length;
    const critical = allExams.filter((e) => {
      const results = parseLabResults(e.labResults);
      return results.some((r) => r.flag === 'CRITICAL');
    }).length;
    return { total, pending, completed, critical };
  }, [allExams]);

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-500/5 via-card to-card p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <FlaskConical className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Exames e Resultados</h1>
            <p className="text-sm text-muted-foreground">
              Solicitacoes, resultados laboratoriais e laudos de imagem
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total de Exames',
            value: kpis.total,
            icon: FlaskConical,
            color: 'text-blue-400',
            bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
            borderColor: 'border-blue-500/20 hover:border-blue-500/40',
          },
          {
            label: 'Em Andamento',
            value: kpis.pending,
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
            borderColor: 'border-amber-500/20 hover:border-amber-500/40',
          },
          {
            label: 'Concluidos',
            value: kpis.completed,
            icon: ClipboardCheck,
            color: 'text-emerald-400',
            bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
            borderColor: 'border-emerald-500/20 hover:border-emerald-500/40',
          },
          {
            label: 'Resultados Criticos',
            value: kpis.critical,
            icon: AlertCircle,
            color: 'text-red-400',
            bg: 'bg-gradient-to-br from-red-500/20 to-red-600/10',
            borderColor: 'border-red-500/20 hover:border-red-500/40',
            pulse: kpis.critical > 0,
          },
        ].map((kpi) => (
          <Card
            key={kpi.label}
            className={cn(
              'group relative overflow-hidden border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg',
              kpi.borderColor,
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight">
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                    kpi.bg,
                  )}
                >
                  <kpi.icon className={cn('h-6 w-6', kpi.color)} />
                </div>
              </div>
              {'pulse' in kpi && kpi.pulse && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  <span className="text-[10px] font-medium text-red-400">
                    Atencao imediata
                  </span>
                </div>
              )}
            </CardContent>
            <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100', kpi.bg)} />
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:hidden">
              <Filter className="h-3.5 w-3.5" />
              Filtros
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do exame ou paciente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-background/50 border-border">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(typeConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-background/50 border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {filtered.length === 0 ? (
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
              <FileX className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Nenhum exame encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
              Ajuste os filtros ou realize uma nova busca para encontrar exames.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exame</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((exam) => {
                  const dateStr = exam.requestedAt ?? exam.completedAt ?? '';
                  const examResults = parseLabResults(exam.labResults);
                  const hasCritical = examResults.some((r) => r.flag === 'CRITICAL');
                  const hasAbnormal = examResults.some((r) => r.flag === 'HIGH' || r.flag === 'LOW');
                  const TypeIcon = typeConfig[exam.examType]?.icon ?? ClipboardCheck;
                  const typeColor = typeConfig[exam.examType]?.color ?? 'text-zinc-400';
                  const sc = statusConfig[exam.status];

                  return (
                    <TableRow
                      key={exam.id}
                      onClick={() => setSelectedExam(exam.id)}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:bg-accent/30',
                        hasCritical && 'bg-red-500/5 hover:bg-red-500/10',
                      )}
                    >
                      <TableCell className="text-sm">
                        {dateStr ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{new Date(dateStr).toLocaleDateString('pt-BR')}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', `bg-${typeColor.replace('text-', '').split('-')[0]}-500/10`)}>
                            <TypeIcon className={cn('h-4 w-4', typeColor)} />
                          </div>
                          <div>
                            <span className="text-sm font-medium">{exam.examName}</span>
                            {exam.patientId && (
                              <p className="text-[10px] text-muted-foreground">
                                Pac. {exam.patientId.slice(-8)}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={cn('text-xs font-medium', typeColor)}>
                          {typeConfig[exam.examType]?.label ?? exam.examType}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sc && (
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] font-medium', sc.color, sc.bg, sc.border)}
                          >
                            {sc.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          {hasCritical && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-[9px] text-red-400 bg-red-500/15 border-red-500/30 gap-1">
                                    <AlertCircle className="h-2.5 w-2.5" />
                                    Critico
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Resultados com valores criticos</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {!hasCritical && hasAbnormal && (
                            <Badge variant="outline" className="text-[9px] text-amber-400 bg-amber-500/15 border-amber-500/30 gap-1">
                              <TrendingUp className="h-2.5 w-2.5" />
                              Alterado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Results count */}
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {filtered.length} exame{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              {(search || typeFilter !== 'all' || statusFilter !== 'all') && ` (de ${allExams.length} total)`}
            </p>
          </div>
        </Card>
      )}

      {/* Exam Detail Dialog */}
      <Dialog open={!!selectedExam} onOpenChange={() => setSelectedExam(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {examDetail && (
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  `bg-gradient-to-br from-${(typeConfig[examDetail.examType]?.color ?? 'text-zinc-400').replace('text-', '').split('-')[0]}-500/20 to-${(typeConfig[examDetail.examType]?.color ?? 'text-zinc-400').replace('text-', '').split('-')[0]}-600/10`,
                )}>
                  {(() => {
                    const DIcon = typeConfig[examDetail.examType]?.icon ?? ClipboardCheck;
                    return <DIcon className={cn('h-5 w-5', typeConfig[examDetail.examType]?.color ?? 'text-zinc-400')} />;
                  })()}
                </div>
              )}
              <div>
                <DialogTitle>{examDetail?.examName}</DialogTitle>
                {examDetail && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {typeConfig[examDetail.examType]?.label ?? examDetail.examType}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
          {examDetail && (
            <div className="space-y-4 mt-2">
              {/* Info grid */}
              <div className="grid gap-3 grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                  <div className="mt-1">
                    {(() => {
                      const sc = statusConfig[examDetail.status];
                      if (!sc) return null;
                      return (
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-medium', sc.color, sc.bg, sc.border)}
                        >
                          {sc.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                {examDetail.requestedAt && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Solicitado</span>
                    <p className="mt-1 text-sm font-medium">
                      {new Date(examDetail.requestedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                {examDetail.completedAt && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Concluido</span>
                    <p className="mt-1 text-sm font-medium">
                      {new Date(examDetail.completedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>

              {/* Radiologist report for imaging */}
              {examDetail.radiologistReport && (
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Laudo</span>
                  </div>
                  <p className="text-sm leading-relaxed">{examDetail.radiologistReport}</p>
                </div>
              )}

              {/* Lab results table */}
              {examDetailResults.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 border-b border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Resultados Laboratoriais
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Analito</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resultado</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Referencia</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examDetailResults.map((r, i) => {
                        const fc = r.flag ? flagConfig[r.flag] : null;
                        return (
                          <TableRow
                            key={i}
                            className={cn(
                              'transition-colors',
                              r.flag === 'CRITICAL' && 'bg-red-500/5',
                            )}
                          >
                            <TableCell className="text-sm font-medium">{r.analyte}</TableCell>
                            <TableCell>
                              <span className={cn('text-sm font-semibold', fc?.color)}>
                                {r.value}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.reference ?? '--'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {fc && (
                                  <Badge
                                    variant="outline"
                                    className={cn('text-[9px] font-medium gap-1', fc.color, fc.bg, fc.border)}
                                  >
                                    {r.flag === 'HIGH' ? 'Alto' : r.flag === 'LOW' ? 'Baixo' : 'Critico'}
                                  </Badge>
                                )}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (examDetail) {
                                            setTrendingPatientId(examDetail.patientId);
                                            setTrendingAnalyte(r.analyte);
                                          }
                                        }}
                                      >
                                        <TrendingUp className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ver tendencia historica</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* AI Interpretation */}
              {examDetail.aiInterpretation && (
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20">
                      <Activity className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                      Interpretacao IA
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-purple-100/80">{examDetail.aiInterpretation}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lab Trend Chart */}
      {trendingPatientId && trendingAnalyte && (
        <LabTrendChart
          open={!!trendingAnalyte}
          onOpenChange={(open) => {
            if (!open) {
              setTrendingAnalyte(null);
              setTrendingPatientId(null);
            }
          }}
          patientId={trendingPatientId}
          analyte={trendingAnalyte}
        />
      )}
    </div>
  );
}
