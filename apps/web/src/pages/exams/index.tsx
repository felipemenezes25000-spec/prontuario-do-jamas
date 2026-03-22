import { useState, useMemo } from 'react';
import {
  Search,
  FileX,
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
import { cn } from '@/lib/utils';
import { useExams } from '@/services/exams.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';


const statusConfig: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: 'Solicitado', color: 'bg-yellow-600' },
  SCHEDULED: { label: 'Agendado', color: 'bg-blue-400' },
  COLLECTED: { label: 'Coletado', color: 'bg-blue-600' },
  IN_PROGRESS: { label: 'Em Análise', color: 'bg-purple-600' },
  COMPLETED: { label: 'Concluído', color: 'bg-green-600' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-600' },
  REVIEWED: { label: 'Revisado', color: 'bg-teal-600' },
};

const typeLabels: Record<string, string> = {
  LABORATORY: 'Laboratorial',
  IMAGING: 'Imagem',
  FUNCTIONAL: 'Funcional',
  PATHOLOGY: 'Patologia',
  GENETIC: 'Genético',
  MICROBIOLOGICAL: 'Microbiológico',
  OTHER: 'Outro',
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
  HIGH: { label: '↑ Alto', color: 'text-amber-400' },
  LOW: { label: '↓ Baixo', color: 'text-blue-400' },
  CRITICAL: { label: '⚠ Crítico', color: 'text-red-400' },
};

export default function ExamsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedExam, setSelectedExam] = useState<string | null>(null);

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

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Exames</h1>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por exame..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-card border-border">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="LABORATORY">Laboratorial</SelectItem>
            <SelectItem value="IMAGING">Imagem</SelectItem>
            <SelectItem value="FUNCTIONAL">Funcional</SelectItem>
            <SelectItem value="PATHOLOGY">Patologia</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="REQUESTED">Solicitado</SelectItem>
            <SelectItem value="COLLECTED">Coletado</SelectItem>
            <SelectItem value="IN_PROGRESS">Em Análise</SelectItem>
            <SelectItem value="COMPLETED">Concluído</SelectItem>
            <SelectItem value="REVIEWED">Revisado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-16">
            <FileX className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhum exame encontrado</h3>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Exame</th>
                  <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((exam) => {
                  const dateStr = exam.requestedAt ?? exam.completedAt ?? '';
                  return (
                    <tr
                      key={exam.id}
                      onClick={() => setSelectedExam(exam.id)}
                      className="cursor-pointer transition-colors hover:bg-accent/30"
                    >
                      <td className="px-4 py-3 text-sm">
                        {dateStr ? (
                          <>
                            {new Date(dateStr).toLocaleDateString('pt-BR')}{' '}
                            <span className="text-muted-foreground">
                              {new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{exam.examName}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                        {typeLabels[exam.examType] ?? exam.examType}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn('text-[10px] text-white', statusConfig[exam.status]?.color)}>
                          {statusConfig[exam.status]?.label ?? exam.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Exam Detail Dialog */}
      <Dialog open={!!selectedExam} onOpenChange={() => setSelectedExam(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>{examDetail?.examName}</DialogTitle>
          </DialogHeader>
          {examDetail && (
            <div className="space-y-4">
              <div className="grid gap-2 grid-cols-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Tipo:</span>{' '}
                  {typeLabels[examDetail.examType] ?? examDetail.examType}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Status: </span>
                  <Badge variant="secondary" className={cn('text-[10px] text-white', statusConfig[examDetail.status]?.color)}>
                    {statusConfig[examDetail.status]?.label ?? examDetail.status}
                  </Badge>
                </div>
                {examDetail.requestedAt && (
                  <div>
                    <span className="text-xs text-muted-foreground">Solicitado:</span>{' '}
                    {new Date(examDetail.requestedAt).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {examDetail.completedAt && (
                  <div>
                    <span className="text-xs text-muted-foreground">Concluído:</span>{' '}
                    {new Date(examDetail.completedAt).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>

              {/* Radiologist report for imaging */}
              {examDetail.radiologistReport && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Laudo</p>
                  <p className="text-sm rounded-lg border border-border p-3">{examDetail.radiologistReport}</p>
                </div>
              )}

              {/* Lab results table */}
              {examDetailResults.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-accent/30">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Analito</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Resultado</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Referência</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {examDetailResults.map((r, i) => (
                        <tr key={i} className={r.flag === 'CRITICAL' ? 'bg-red-500/5' : ''}>
                          <td className="px-3 py-2 text-sm">{r.analyte}</td>
                          <td className={cn('px-3 py-2 text-sm font-medium', r.flag ? flagConfig[r.flag].color : '')}>
                            {r.value}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted-foreground">{r.reference ?? '—'}</td>
                          <td className="px-3 py-2">
                            {r.flag && (
                              <span className={cn('text-[10px] font-medium', flagConfig[r.flag].color)}>
                                {flagConfig[r.flag].label}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AI Interpretation */}
              {examDetail.aiInterpretation && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Interpretação IA</p>
                  <p className="text-sm rounded-lg border border-border p-3 bg-secondary/20">{examDetail.aiInterpretation}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
