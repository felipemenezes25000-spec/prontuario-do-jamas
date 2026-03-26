import { useState } from 'react';
import {
  Cable,
  Plus,
  Wifi,
  WifiOff,
  AlertTriangle,
  Settings,
  Play,
  Trash2,
  Clock,
  ArrowDownUp,
  Activity,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  useIntegrations,
  useIntegrationLogs,
  useCreateIntegration,
  useTestIntegration,
  useDeleteIntegration,
  type Integration,
  type IntegrationProtocol,
  type IntegrationStatus,
  type CreateIntegrationDto,
} from '@/services/integrations.service';

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; icon: typeof Wifi; color: string }> = {
  CONNECTED: { label: 'Conectado', icon: Wifi, color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
  DISCONNECTED: { label: 'Desconectado', icon: WifiOff, color: 'border-gray-500 bg-gray-500/10 text-gray-400' },
  ERROR: { label: 'Erro', icon: AlertTriangle, color: 'border-red-500 bg-red-500/10 text-red-400' },
  CONFIGURING: { label: 'Configurando', icon: Settings, color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
};

const PROTOCOL_LABELS: Record<IntegrationProtocol, string> = {
  FHIR: 'FHIR R4',
  HL7V2: 'HL7 v2.x',
  DICOM: 'DICOM',
  LIS: 'LIS',
  PACS: 'PACS',
  REST: 'REST API',
  SOAP: 'SOAP/XML',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);

  const [createForm, setCreateForm] = useState<CreateIntegrationDto>({
    name: '',
    protocol: 'FHIR',
    endpointUrl: '',
    description: '',
  });

  const { data: integrations, isLoading, error } = useIntegrations();
  const createIntegration = useCreateIntegration();
  const testIntegration = useTestIntegration();
  const deleteIntegration = useDeleteIntegration();

  // Logs for selected integration
  const { data: logs, isLoading: logsLoading } = useIntegrationLogs(selectedIntegration?.id ?? '');

  const handleCreate = async () => {
    if (!createForm.name || !createForm.endpointUrl) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    try {
      await createIntegration.mutateAsync(createForm);
      toast.success('Integração criada com sucesso.');
      setCreateDialogOpen(false);
      setCreateForm({ name: '', protocol: 'FHIR', endpointUrl: '', description: '' });
    } catch {
      toast.error('Erro ao criar integração.');
    }
  };

  const handleTest = async (integration: Integration) => {
    try {
      const result = await testIntegration.mutateAsync(integration.id);
      if (result.success) {
        toast.success(`Conexão OK — latência: ${result.latencyMs}ms`);
      } else {
        toast.error(`Falha na conexão: ${result.error ?? 'erro desconhecido'}`);
      }
    } catch {
      toast.error('Erro ao testar integração.');
    }
  };

  const handleDelete = async (integration: Integration) => {
    try {
      await deleteIntegration.mutateAsync(integration.id);
      toast.success('Integração removida.');
    } catch {
      toast.error('Erro ao remover integração.');
    }
  };

  const openLogs = (integration: Integration) => {
    setSelectedIntegration(integration);
    setLogsDialogOpen(true);
  };

  if (error) {
    return <PageError message="Erro ao carregar integrações." />;
  }

  const connectedCount = integrations?.filter((i) => i.status === 'CONNECTED').length ?? 0;
  const errorCount = integrations?.filter((i) => i.status === 'ERROR').length ?? 0;
  const totalMessages = integrations?.reduce((sum, i) => sum + i.messagesProcessed, 0) ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cable className="h-6 w-6 text-emerald-400" />
            Integrações
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de integrações com sistemas externos (FHIR, HL7, LIS, PACS)
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Integração
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{integrations?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-400">{connectedCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Conectadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-red-400">{errorCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Com Erro</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-400">{totalMessages}</p>
            <p className="text-sm text-muted-foreground mt-1">Mensagens Trocadas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Cable className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <PageLoading />
          ) : integrations && integrations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {integrations.map((integration) => {
                const statusCfg = STATUS_CONFIG[integration.status];
                const StatusIcon = statusCfg.icon;
                return (
                  <Card key={integration.id} className="hover:border-emerald-500/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <Badge variant="outline" className={statusCfg.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Protocolo</span>
                        <Badge variant="outline">{PROTOCOL_LABELS[integration.protocol]}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Mensagens</span>
                        <span className="font-mono">{integration.messagesProcessed}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Endpoint: </span>
                        <span className="font-mono text-xs text-muted-foreground truncate block">
                          {integration.endpointUrl}
                        </span>
                      </div>
                      {integration.lastSyncAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Última sync: {new Date(integration.lastSyncAt).toLocaleString('pt-BR')}
                        </div>
                      )}
                      {integration.errorMessage && (
                        <p className="text-xs text-red-400 truncate">{integration.errorMessage}</p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleTest(integration)} disabled={testIntegration.isPending}>
                          <Play className="h-3 w-3 mr-1" />
                          Testar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openLogs(integration)}>
                          <Activity className="h-3 w-3 mr-1" />
                          Logs
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-400" onClick={() => handleDelete(integration)} disabled={deleteIntegration.isPending}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Cable className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma integração configurada.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Integrações</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <PageLoading />
              ) : integrations && integrations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Mensagens</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.map((integration) => {
                      const statusCfg = STATUS_CONFIG[integration.status];
                      const StatusIcon = statusCfg.icon;
                      return (
                        <TableRow key={integration.id}>
                          <TableCell>
                            <Badge variant="outline" className={statusCfg.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{integration.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{PROTOCOL_LABELS[integration.protocol]}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-48 truncate">
                            {integration.endpointUrl}
                          </TableCell>
                          <TableCell className="text-sm">{integration.messagesProcessed}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(integration.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleTest(integration)} disabled={testIntegration.isPending}>
                                <Play className="h-3 w-3 mr-1" />
                                Testar
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-400" onClick={() => handleDelete(integration)} disabled={deleteIntegration.isPending}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Cable className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma integração configurada.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Integration Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Integração</DialogTitle>
            <DialogDescription>Configure uma nova integração com sistema externo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                placeholder="Nome da integração"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Protocolo</label>
              <Select
                value={createForm.protocol}
                onValueChange={(val) => setCreateForm((prev) => ({ ...prev, protocol: val as IntegrationProtocol }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROTOCOL_LABELS) as IntegrationProtocol[]).map((key) => (
                    <SelectItem key={key} value={key}>{PROTOCOL_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">URL do Endpoint *</label>
              <Input
                placeholder="https://..."
                value={createForm.endpointUrl}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, endpointUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input
                placeholder="Descrição da integração"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createIntegration.isPending}>
              {createIntegration.isPending ? 'Criando...' : 'Criar Integração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Logs — {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>Histórico de comunicação da integração.</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {logsLoading ? (
              <PageLoading />
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <ArrowDownUp className={`h-4 w-4 mt-0.5 ${log.direction === 'INBOUND' ? 'text-blue-400' : 'text-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.direction === 'INBOUND' ? 'Entrada' : 'Saída'}
                      </Badge>
                      <Badge className={log.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                        {log.status === 'SUCCESS' ? 'Sucesso' : 'Erro'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{log.message}</p>
                    {log.payload && (
                      <pre className="text-xs text-muted-foreground mt-1 font-mono truncate">{log.payload}</pre>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">Nenhum log disponível.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
