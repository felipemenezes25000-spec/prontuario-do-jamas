import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Database,
  Download,
  Play,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  useBulkExportJobs,
  useResourceTypes,
  useCreateExportJob,
  useCancelExportJob,
  type ExportJobStatus,
} from '@/services/bulk-fhir.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const RESOURCE_TYPE_LIST = [
  'Patient',
  'Encounter',
  'Observation',
  'Condition',
  'Procedure',
  'MedicationRequest',
  'DiagnosticReport',
  'AllergyIntolerance',
  'Immunization',
  'DocumentReference',
] as const;

const STATUS_CONFIG: Record<ExportJobStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: typeof Clock;
}> = {
  EM_FILA: { label: 'Em Fila', variant: 'outline', icon: Clock },
  PROCESSANDO: { label: 'Processando', variant: 'secondary', icon: Loader2 },
  CONCLUIDO: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
  ERRO: { label: 'Erro', variant: 'destructive', icon: AlertTriangle },
  CANCELADO: { label: 'Cancelado', variant: 'outline', icon: XCircle },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function BulkFhirPage() {
  const { data: jobs, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useBulkExportJobs();
  const { data: resourceTypes } = useResourceTypes();
  const createJob = useCreateExportJob();
  const cancelJob = useCancelExportJob();

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const toggleType = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTypes(new Set(RESOURCE_TYPE_LIST));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedTypes(new Set());
  }, []);

  const handleStartExport = useCallback(() => {
    if (selectedTypes.size === 0) {
      toast.warning('Selecione pelo menos um Resource Type');
      return;
    }
    createJob.mutate(
      { resourceTypes: Array.from(selectedTypes) },
      {
        onSuccess: () => {
          toast.success('Exportação iniciada com sucesso');
          setSelectedTypes(new Set());
        },
        onError: () => toast.error('Erro ao iniciar exportação'),
      },
    );
  }, [selectedTypes, createJob]);

  const handleCancel = useCallback((jobId: string) => {
    cancelJob.mutate(jobId, {
      onSuccess: () => toast.success('Job cancelado'),
      onError: () => toast.error('Erro ao cancelar job'),
    });
  }, [cancelJob]);

  const handleDownload = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  if (jobsLoading) return <div className="p-6"><PageLoading cards={2} /></div>;
  if (jobsError) return <div className="p-6"><PageError onRetry={() => refetchJobs()} /></div>;

  const jobsList = jobs ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Database className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Bulk FHIR Export</h1>
          <p className="text-sm text-muted-foreground">
            Exportação em massa de recursos FHIR para integração e análise
          </p>
        </div>
      </div>

      {/* New Export */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nova Exportação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Resource Types</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={selectAll}>
                  Selecionar Todos
                </Button>
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {RESOURCE_TYPE_LIST.map((type) => {
                const info = resourceTypes?.find((rt) => rt.type === type);
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                      selectedTypes.has(type)
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Checkbox
                      checked={selectedTypes.has(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">{type}</span>
                      {info && (
                        <span className="text-xs text-muted-foreground">
                          {info.count.toLocaleString('pt-BR')} registros
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <Button onClick={handleStartExport} disabled={createJob.isPending || selectedTypes.size === 0}>
            <Play className="h-4 w-4 mr-1" />
            {createJob.isPending ? 'Iniciando...' : 'Iniciar Exportação'}
          </Button>
        </CardContent>
      </Card>

      {/* Jobs list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Jobs de Exportação ({jobsList.length})
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => refetchJobs()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobsList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum job de exportação encontrado
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource Types</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Exportados</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Concluído em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsList.map((job) => {
                    const cfg = STATUS_CONFIG[job.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {job.resourceTypes.map((rt) => (
                              <Badge key={rt} variant="outline" className="text-xs">
                                {rt}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className={`h-3 w-3 ${job.status === 'PROCESSANDO' ? 'animate-spin' : ''}`} />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <div className="space-y-1">
                            <ProgressBar value={job.progress} />
                            <span className="text-xs text-muted-foreground">{job.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.exportedResources.toLocaleString('pt-BR')} / {job.totalResources.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(job.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(job.completedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {job.status === 'CONCLUIDO' && job.downloadUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(job.downloadUrl!)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            )}
                            {(job.status === 'EM_FILA' || job.status === 'PROCESSANDO') && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancel(job.id)}
                                disabled={cancelJob.isPending}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancelar
                              </Button>
                            )}
                            {job.status === 'ERRO' && job.errorMessage && (
                              <span className="text-xs text-destructive max-w-[200px] truncate" title={job.errorMessage}>
                                {job.errorMessage}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
