import { useState } from 'react';
import {
  Webhook,
  Plus,
  Power,
  PowerOff,
  Play,
  Settings2,
  Activity,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { Separator } from '@/components/ui/separator';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  useCDSServices,
  useRegisterCDSService,
  useToggleCDSService,
  useEvaluateCDSService,
  type CDSService,
  type CDSCard,
  type HookType,
  type RegisterServicePayload,
} from '@/services/cds-hooks.service';

// ─── Constants ─────────────────────────────────────────────────────────────

const HOOK_TYPE_LABELS: Record<HookType, string> = {
  'patient-view': 'Visualização de Paciente',
  'order-select': 'Seleção de Pedido',
  'order-sign': 'Assinatura de Pedido',
  'medication-prescribe': 'Prescrição de Medicamento',
};

const INDICATOR_CONFIG: Record<string, { label: string; color: string }> = {
  info: { label: 'Info', color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  warning: { label: 'Alerta', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
  critical: { label: 'Crítico', color: 'border-red-500 bg-red-500/10 text-red-400' },
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function CDSHooksPage() {
  const [activeTab, setActiveTab] = useState('services');
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<CDSService | null>(null);
  const [testCards, setTestCards] = useState<CDSCard[]>([]);
  const [testDuration, setTestDuration] = useState<number>(0);

  const [registerForm, setRegisterForm] = useState<RegisterServicePayload>({
    name: '',
    hookType: 'patient-view',
    description: '',
    endpointUrl: '',
    vendor: '',
  });

  const { data: services, isLoading, error } = useCDSServices();
  const registerService = useRegisterCDSService();
  const toggleService = useToggleCDSService();
  const evaluateService = useEvaluateCDSService();

  const handleRegister = async () => {
    if (!registerForm.name || !registerForm.endpointUrl || !registerForm.vendor) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await registerService.mutateAsync(registerForm);
      toast.success('Serviço CDS registrado com sucesso.');
      setRegisterDialogOpen(false);
      setRegisterForm({ name: '', hookType: 'patient-view', description: '', endpointUrl: '', vendor: '' });
    } catch {
      toast.error('Erro ao registrar serviço CDS.');
    }
  };

  const handleToggle = async (service: CDSService) => {
    try {
      await toggleService.mutateAsync({ serviceId: service.id, enabled: !service.enabled });
      toast.success(service.enabled ? 'Serviço desabilitado.' : 'Serviço habilitado.');
    } catch {
      toast.error('Erro ao alterar status do serviço.');
    }
  };

  const handleTest = async (service: CDSService) => {
    setSelectedService(service);
    setTestCards([]);
    setTestDuration(0);
    setTestDialogOpen(true);
    try {
      const result = await evaluateService.mutateAsync({
        serviceId: service.id,
        context: { patientId: 'test', encounterId: 'test' },
      });
      setTestCards(result.cards);
      setTestDuration(result.durationMs);
    } catch {
      toast.error('Erro ao testar serviço CDS.');
    }
  };

  if (error) {
    return <PageError message="Erro ao carregar CDS Hooks." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Webhook className="h-6 w-6 text-emerald-400" />
            CDS Hooks
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de serviços de suporte à decisão clínica (HL7 CDS Hooks)
          </p>
        </div>
        <Button onClick={() => setRegisterDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Registrar Serviço
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-400">{services?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total de Serviços</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-400">
              {services?.filter((s) => s.enabled).length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Habilitados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">
              {services?.reduce((sum, s) => sum + s.totalCalls, 0) ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total de Chamadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-400">
              {services && services.length > 0
                ? Math.round(services.reduce((sum, s) => sum + s.avgResponseMs, 0) / services.length)
                : 0}ms
            </p>
            <p className="text-sm text-muted-foreground mt-1">Tempo Médio Resp.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Logs de Execução
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <PageLoading />
              ) : services && services.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Hook</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Chamadas</TableHead>
                      <TableHead>Latência</TableHead>
                      <TableHead>Último Trigger</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <Switch
                            checked={service.enabled}
                            onCheckedChange={() => handleToggle(service)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {HOOK_TYPE_LABELS[service.hookType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{service.vendor}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground max-w-48 truncate">
                          {service.endpointUrl}
                        </TableCell>
                        <TableCell className="text-sm">{service.totalCalls}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className={service.avgResponseMs > 500 ? 'border-red-500 text-red-400' : 'border-emerald-500 text-emerald-400'}>
                            {service.avgResponseMs}ms
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {service.lastTriggeredAt
                            ? new Date(service.lastTriggeredAt).toLocaleString('pt-BR')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(service)}
                            disabled={evaluateService.isPending}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Testar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Webhook className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum serviço CDS registrado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Execução Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {services && services.length > 0 ? (
                <div className="space-y-3">
                  {services
                    .filter((s) => s.lastTriggeredAt)
                    .sort((a, b) => new Date(b.lastTriggeredAt!).getTime() - new Date(a.lastTriggeredAt!).getTime())
                    .map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          {s.enabled ? (
                            <Power className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <PowerOff className="h-4 w-4 text-red-400" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {HOOK_TYPE_LABELS[s.hookType]} | {s.vendor}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{s.totalCalls} chamadas</Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(s.lastTriggeredAt!).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum log de execução disponível.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Register Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Serviço CDS</DialogTitle>
            <DialogDescription>Configure um novo serviço de suporte à decisão clínica.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                placeholder="Nome do serviço"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Hook *</label>
              <Select
                value={registerForm.hookType}
                onValueChange={(val) => setRegisterForm((prev) => ({ ...prev, hookType: val as HookType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(HOOK_TYPE_LABELS) as HookType[]).map((key) => (
                    <SelectItem key={key} value={key}>{HOOK_TYPE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">URL do Endpoint *</label>
              <Input
                placeholder="https://..."
                value={registerForm.endpointUrl}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, endpointUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Vendor *</label>
              <Input
                placeholder="Fornecedor"
                value={registerForm.vendor}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, vendor: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input
                placeholder="Descrição do serviço"
                value={registerForm.description}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegister} disabled={registerService.isPending}>
              {registerService.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Resultado do Teste — {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Cards retornados pelo serviço CDS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {evaluateService.isPending ? (
              <PageLoading />
            ) : testCards.length > 0 ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Tempo de resposta: {testDuration}ms
                </div>
                <Separator />
                {testCards.map((card, idx) => {
                  const indicatorKey = card.indicator in INDICATOR_CONFIG ? card.indicator : 'info';
                  const indicatorCfg = INDICATOR_CONFIG[indicatorKey] as { label: string; color: string };
                  return (
                    <Card key={idx}>
                      <CardContent className="pt-4 pb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={indicatorCfg.color}>
                              {indicatorCfg.label}
                            </Badge>
                            <span className="font-medium text-sm">{card.summary}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{card.detail}</p>
                          <p className="text-xs text-muted-foreground">
                            Fonte: {card.source.label}
                          </p>
                          {card.suggestions && card.suggestions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium">Sugestões:</p>
                              {card.suggestions.map((sug, sIdx) => (
                                <p key={sIdx} className="text-xs text-muted-foreground ml-2">
                                  - {sug.label}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-6">
                Nenhum card retornado pelo serviço.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
