import { useState, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  History,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  useAlerts,
  useAcknowledgeAlert,
  useResolveAlert,
  type AlertFilters,
} from '@/services/alerts.service';
import type { ClinicalAlert, AlertSeverity, AlertType } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';

// ─── Constants ─────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; icon: typeof AlertTriangle; color: string; badgeClass: string }> = {
  EMERGENCY: { label: 'Emergência', icon: AlertCircle, color: 'text-red-500', badgeClass: 'border-red-500 bg-red-500/10 text-red-400' },
  CRITICAL: { label: 'Crítico', icon: AlertTriangle, color: 'text-orange-500', badgeClass: 'border-orange-500 bg-orange-500/10 text-orange-400' },
  WARNING: { label: 'Alerta', icon: AlertTriangle, color: 'text-yellow-500', badgeClass: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
  INFO: { label: 'Informação', icon: Info, color: 'text-blue-500', badgeClass: 'border-blue-500 bg-blue-500/10 text-blue-400' },
};

const TYPE_LABELS: Record<AlertType, string> = {
  ALLERGY: 'Alergia',
  DRUG_INTERACTION: 'Interação Medicamentosa',
  LAB_CRITICAL: 'Resultado Crítico Lab',
  VITAL_SIGN: 'Sinal Vital',
  FALL_RISK: 'Risco de Queda',
  DETERIORATION: 'Deterioração Clínica',
  MEDICATION_DUE: 'Medicação Pendente',
  DUPLICATE_ORDER: 'Pedido Duplicado',
  DOSE_RANGE: 'Faixa de Dose',
  AI_PREDICTION: 'Predição IA',
  SEPSIS_RISK: 'Risco de Sepse',
  READMISSION_RISK: 'Risco de Reinternação',
  PROTOCOL_DEVIATION: 'Desvio de Protocolo',
  SYSTEM: 'Sistema',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<AlertType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  // Acknowledge dialog
  const [ackDialogOpen, setAckDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<ClinicalAlert | null>(null);
  const [actionTaken, setActionTaken] = useState('');

  const isActive = activeTab === 'active';

  const filters: AlertFilters = {
    isActive,
    ...(severityFilter !== 'ALL' ? { severity: severityFilter } : {}),
    ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}),
    page,
    limit: 25,
  };

  const { data, isLoading, error } = useAlerts(filters);
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  const filteredAlerts = useMemo(() => {
    if (!data?.data) return [];
    if (!debouncedSearch) return data.data;
    const q = debouncedSearch.toLowerCase();
    return data.data.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q),
    );
  }, [data?.data, debouncedSearch]);

  const activeCount = useMemo(() => {
    if (!data?.data || !isActive) return 0;
    return data.total ?? data.data.length;
  }, [data, isActive]);

  const criticalCount = useMemo(() => {
    if (!data?.data || !isActive) return 0;
    return data.data.filter((a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY').length;
  }, [data, isActive]);

  const openAckDialog = (alert: ClinicalAlert) => {
    setSelectedAlert(alert);
    setActionTaken('');
    setAckDialogOpen(true);
  };

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;
    try {
      await acknowledgeAlert.mutateAsync({ id: selectedAlert.id, actionTaken: actionTaken || undefined });
      toast.success('Alerta reconhecido com sucesso.');
      setAckDialogOpen(false);
      setSelectedAlert(null);
    } catch {
      toast.error('Erro ao reconhecer alerta.');
    }
  };

  const handleResolve = async (alert: ClinicalAlert) => {
    try {
      await resolveAlert.mutateAsync({ id: alert.id });
      toast.success('Alerta resolvido com sucesso.');
    } catch {
      toast.error('Erro ao resolver alerta.');
    }
  };

  if (error) {
    return <PageError message="Erro ao carregar alertas clínicos." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-emerald-400" />
            Central de Alertas Clínicos
          </h1>
          <p className="text-muted-foreground">
            Monitoramento de alertas ativos, valores críticos e scores de deterioração
          </p>
        </div>
        {isActive && (
          <div className="flex gap-3">
            <Card className="px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Críticos</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas Ativos
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar alertas..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v as AlertSeverity | 'ALL'); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="EMERGENCY">Emergência</SelectItem>
                  <SelectItem value="CRITICAL">Crítico</SelectItem>
                  <SelectItem value="WARNING">Alerta</SelectItem>
                  <SelectItem value="INFO">Informação</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as AlertType | 'ALL'); setPage(1); }}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Tipos</SelectItem>
                  {(Object.keys(TYPE_LABELS) as AlertType[]).map((key) => (
                    <SelectItem key={key} value={key}>{TYPE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isActive ? 'Alertas Ativos' : 'Alertas Resolvidos'}
                {data?.total !== undefined && (
                  <Badge variant="outline" className="ml-2">{data.total}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <PageLoading />
              ) : filteredAlerts.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severidade</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Status</TableHead>
                        {isActive && <TableHead>Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlerts.map((alert) => {
                        const sevConfig = SEVERITY_CONFIG[alert.severity];
                        const SevIcon = sevConfig.icon;
                        return (
                          <TableRow key={alert.id}>
                            <TableCell>
                              <Badge variant="outline" className={sevConfig.badgeClass}>
                                <SevIcon className="h-3 w-3 mr-1" />
                                {sevConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {TYPE_LABELS[alert.type] ?? alert.type}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{alert.title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {alert.message}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(alert.triggeredAt).toLocaleString('pt-BR')}
                              </div>
                            </TableCell>
                            <TableCell>
                              {alert.acknowledgedAt ? (
                                <Badge className="bg-yellow-500/20 text-yellow-400">
                                  Reconhecido
                                </Badge>
                              ) : alert.resolvedAt ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400">
                                  Resolvido
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Pendente</Badge>
                              )}
                            </TableCell>
                            {isActive && (
                              <TableCell>
                                <div className="flex gap-2">
                                  {!alert.acknowledgedAt && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openAckDialog(alert)}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Reconhecer
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-emerald-400 hover:text-emerald-300"
                                    onClick={() => handleResolve(alert)}
                                    disabled={resolveAlert.isPending}
                                  >
                                    Resolver
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {data && data.total > 25 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Página {page} de {Math.ceil(data.total / 25)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= Math.ceil(data.total / 25)}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{isActive ? 'Nenhum alerta ativo no momento.' : 'Nenhum alerta resolvido encontrado.'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Acknowledge Dialog */}
      <Dialog open={ackDialogOpen} onOpenChange={setAckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconhecer Alerta</DialogTitle>
            <DialogDescription>
              {selectedAlert?.title} — {selectedAlert?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ação tomada (opcional)</label>
              <Input
                placeholder="Descreva a ação tomada..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAcknowledge} disabled={acknowledgeAlert.isPending}>
              {acknowledgeAlert.isPending ? 'Salvando...' : 'Reconhecer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
