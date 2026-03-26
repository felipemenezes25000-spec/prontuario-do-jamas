import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  BarChart3,
  Search,
  Download,
  Plus,
  X,
  Filter,
  Play,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  useFilterMetadata,
  useRunSlicerQuery,
  useExportCsv,
  type AnalyticsFilter,
  type SlicerResult,
} from '@/services/self-service-analytics.service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

// ─── Bar Chart (CSS puro) ───────────────────────────────────────────────────

function SimpleBarChart({ data, labelKey, valueKey }: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
}) {
  const values = data.map((r) => Number(r[valueKey] ?? 0));
  const maxValue = Math.max(...values, 1);
  const barColors = [
    'bg-emerald-500',
    'bg-emerald-400',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-emerald-600',
  ];

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Nenhum dado para visualizar
      </div>
    );
  }

  return (
    <div className="space-y-2 py-4">
      {data.slice(0, 15).map((row, idx) => {
        const label = String(row[labelKey] ?? '—');
        const val = Number(row[valueKey] ?? 0);
        const pct = (val / maxValue) * 100;
        return (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-40 truncate text-sm text-muted-foreground text-right" title={label}>
              {label}
            </span>
            <div className="flex-1 h-7 bg-gray-800 rounded-md overflow-hidden relative">
              <div
                className={`h-full ${barColors[idx % barColors.length]} rounded-md transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-gray-200">
                {val.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

let nextFilterId = 1;

export default function SelfServiceAnalyticsPage() {
  const { data: metadata, isLoading: metaLoading, error: metaError, refetch: refetchMeta } = useFilterMetadata();
  const runQuery = useRunSlicerQuery();
  const exportCsv = useExportCsv();

  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState('diagnosis');
  const [result, setResult] = useState<SlicerResult | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const fieldOptions = useMemo(() => [
    { value: 'diagnosis', label: 'Diagnóstico' },
    { value: 'procedure', label: 'Procedimento' },
    { value: 'doctor', label: 'Médico' },
    { value: 'department', label: 'Setor' },
  ], []);

  const operatorOptions = useMemo(() => [
    { value: 'EQUALS', label: 'Igual a' },
    { value: 'NOT_EQUALS', label: 'Diferente de' },
    { value: 'CONTAINS', label: 'Contém' },
  ], []);

  const addFilter = useCallback(() => {
    setFilters((prev) => [
      ...prev,
      { id: String(nextFilterId++), field: 'diagnosis', operator: 'EQUALS', value: '' },
    ]);
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFilter = useCallback((id: string, key: keyof FilterRow, value: string) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  }, []);

  const buildQueryFilters = useCallback((): AnalyticsFilter[] => {
    return filters
      .filter((f) => f.value.trim().length > 0)
      .map((f) => ({
        field: f.field,
        operator: f.operator as AnalyticsFilter['operator'],
        value: f.value.trim(),
      }));
  }, [filters]);

  const handleRun = useCallback(() => {
    const queryFilters = buildQueryFilters();
    runQuery.mutate(
      {
        filters: queryFilters,
        groupBy,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 100,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`Query executada em ${data.queryTimeMs}ms — ${data.total} resultados`);
        },
        onError: () => toast.error('Erro ao executar query'),
      },
    );
  }, [buildQueryFilters, groupBy, dateFrom, dateTo, runQuery]);

  const handleExport = useCallback(() => {
    const queryFilters = buildQueryFilters();
    exportCsv.mutate(
      {
        filters: queryFilters,
        groupBy,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('CSV exportado com sucesso');
        },
        onError: () => toast.error('Erro ao exportar CSV'),
      },
    );
  }, [buildQueryFilters, groupBy, dateFrom, dateTo, exportCsv]);

  if (metaLoading) return <div className="p-6"><PageLoading cards={3} /></div>;
  if (metaError) return <div className="p-6"><PageError onRetry={() => refetchMeta()} /></div>;

  const columns = result?.columns ?? [];
  const rows = result?.rows ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Self-Service Analytics</h1>
          <p className="text-sm text-muted-foreground">
            SlicerDicer — consulte dados clínicos com filtros visuais
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addFilter}>
              <Plus className="h-3 w-3 mr-1" />
              Adicionar Filtro
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date range */}
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Agrupar por</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic filters */}
          {filters.map((f) => (
            <div key={f.id} className="flex gap-3 items-end flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs">Campo</Label>
                <Select value={f.field} onValueChange={(v) => updateFilter(f.id, 'field', v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operador</Label>
                <Select value={f.operator} onValueChange={(v) => updateFilter(f.id, 'operator', v)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operatorOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <Label className="text-xs">Valor</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={f.value}
                    onChange={(e) => updateFilter(f.id, 'value', e.target.value)}
                    placeholder="Digite o valor..."
                    className="pl-9"
                  />
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeFilter(f.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleRun} disabled={runQuery.isPending}>
              <Play className="h-4 w-4 mr-1" />
              {runQuery.isPending ? 'Executando...' : 'Executar Query'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exportCsv.isPending || !result}
            >
              <Download className="h-4 w-4 mr-1" />
              {exportCsv.isPending ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metadata summary */}
      {metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{metadata.diagnoses.length}</p>
              <p className="text-xs text-muted-foreground">Diagnósticos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{metadata.procedures.length}</p>
              <p className="text-xs text-muted-foreground">Procedimentos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{metadata.doctors.length}</p>
              <p className="text-xs text-muted-foreground">Médicos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{metadata.departments.length}</p>
              <p className="text-xs text-muted-foreground">Setores</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Resultados
                <Badge variant="secondary">{result.total} registros</Badge>
                <Badge variant="outline">{result.queryTimeMs}ms</Badge>
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('table')}
                >
                  Tabela
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'chart' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('chart')}
                >
                  Gráfico
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'table' ? (
              rows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col.key}>{col.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow key={idx}>
                          {columns.map((col) => (
                            <TableCell key={col.key} className="text-sm">
                              {col.type === 'NUMBER'
                                ? Number(row[col.key] ?? 0).toLocaleString('pt-BR')
                                : String(row[col.key] ?? '—')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              <SimpleBarChart
                data={rows}
                labelKey={columns[0]?.key ?? ''}
                valueKey={columns.length > 1 ? (columns[1]?.key ?? '') : (columns[0]?.key ?? '')}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
