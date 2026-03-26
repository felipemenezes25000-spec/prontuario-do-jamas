import { useState, useCallback } from 'react';
import {
  ScrollText,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  useAuditLogs,
  type AuditFilters,
  type AuditLog,
} from '@/services/audit.service';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';

// ─── Constants ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Criação', color: 'bg-emerald-500/20 text-emerald-400' },
  UPDATE: { label: 'Atualização', color: 'bg-blue-500/20 text-blue-400' },
  DELETE: { label: 'Exclusão', color: 'bg-red-500/20 text-red-400' },
  READ: { label: 'Leitura', color: 'bg-gray-500/20 text-gray-400' },
  LOGIN: { label: 'Login', color: 'bg-purple-500/20 text-purple-400' },
  LOGOUT: { label: 'Logout', color: 'bg-purple-500/20 text-purple-400' },
  SIGN: { label: 'Assinatura', color: 'bg-yellow-500/20 text-yellow-400' },
  EXPORT: { label: 'Exportação', color: 'bg-orange-500/20 text-orange-400' },
};

// ─── Diff Viewer ───────────────────────────────────────────────────────────

function DiffViewer({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) {
    return <p className="text-sm text-muted-foreground">Sem detalhes de alteração.</p>;
  }

  const allKeys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  const changedKeys = Array.from(allKeys).filter((key) => {
    const bVal = before ? JSON.stringify(before[key]) : undefined;
    const aVal = after ? JSON.stringify(after[key]) : undefined;
    return bVal !== aVal;
  });

  if (changedKeys.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma diferença detectada.</p>;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2 text-left font-medium">Campo</th>
            <th className="px-3 py-2 text-left font-medium text-red-400">Antes</th>
            <th className="px-3 py-2 text-left font-medium text-emerald-400">Depois</th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map((key) => (
            <tr key={key} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-mono text-xs">{key}</td>
              <td className="px-3 py-2 text-red-400/80 text-xs font-mono max-w-xs truncate">
                {before?.[key] !== undefined ? String(before[key]) : '—'}
              </td>
              <td className="px-3 py-2 text-emerald-400/80 text-xs font-mono max-w-xs truncate">
                {after?.[key] !== undefined ? String(after[key]) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const debouncedUser = useDebounce(userSearch, 300);
  const debouncedPatient = useDebounce(patientSearch, 300);

  const filters: AuditFilters = {
    ...(actionFilter !== 'ALL' ? { action: actionFilter } : {}),
    ...(debouncedUser ? { userId: debouncedUser } : {}),
    ...(debouncedPatient ? { patientId: debouncedPatient } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    page,
    limit: 25,
  };

  const { data, isLoading, error } = useAuditLogs(filters);

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const response = await api.get('/audit/export', {
        params: filters,
        responseType: 'blob',
      });
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exportação CSV concluída.');
    } catch {
      toast.error('Erro ao exportar CSV.');
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (error) {
    return <PageError message="Erro ao carregar logs de auditoria." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-emerald-400" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground">
            Registro completo de todas as ações realizadas no sistema
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={exporting}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Ações</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar por usuário..."
                className="pl-10 w-48"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar por paciente..."
                className="pl-10 w-48"
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-40"
              />
              <span className="text-muted-foreground text-sm">até</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Logs de Auditoria
            {data?.total !== undefined && (
              <Badge variant="outline" className="ml-2">{data.total} registros</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoading />
          ) : data?.data && data.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log: AuditLog) => {
                    const actionCfg = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-500/20 text-gray-400' };
                    const isExpanded = expandedId === log.id;
                    return (
                      <>
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(log.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={actionCfg.color}>{actionCfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                          <TableCell className="text-sm">
                            <span className="font-mono text-xs">{log.resource}</span>
                            {log.resourceId && (
                              <span className="text-muted-foreground text-xs ml-1">({log.resourceId.slice(0, 8)}...)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.patientName ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {log.ipAddress}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${log.id}-detail`}>
                            <TableCell colSpan={7} className="bg-muted/20 px-8 py-4">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Detalhes da Alteração</p>
                                {log.userAgent && (
                                  <p className="text-xs text-muted-foreground">
                                    User-Agent: {log.userAgent}
                                  </p>
                                )}
                                <DiffViewer before={log.before} after={log.after} />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.total > 25 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {Math.ceil(data.total / 25)}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / 25)} onClick={() => setPage((p) => p + 1)}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum registro de auditoria encontrado com os filtros selecionados.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
