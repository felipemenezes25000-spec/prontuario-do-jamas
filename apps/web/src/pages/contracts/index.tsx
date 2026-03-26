import { useState } from 'react';
import {
  FileSignature,
  BarChart3,
  Plus,
  AlertTriangle,
  RefreshCw,
  Calendar,
  DollarSign,
  Building2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { PageLoading } from '@/components/common/page-loading';
import {
  useContracts,
  useContractsDashboard,
  useExpiringContracts,
  useCreateContract,
  useRenewContract,
} from '@/services/contracts.service';
import type { Contract, ExpiringContract } from '@/services/contracts.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  SUPPLIER: 'Fornecedor',
  INSURANCE: 'Convênio',
  SERVICE: 'Serviço',
  MAINTENANCE: 'Manutenção',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  EXPIRING_SOON: 'Vencendo',
  EXPIRED: 'Expirado',
  RENEWED: 'Renovado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'border-gray-500 bg-gray-500/10 text-gray-400',
  ACTIVE: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
  EXPIRING_SOON: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
  EXPIRED: 'border-red-500 bg-red-500/10 text-red-400',
  RENEWED: 'border-blue-500 bg-blue-500/10 text-blue-400',
  CANCELLED: 'border-gray-600 bg-gray-600/10 text-gray-500',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState('contracts');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [contractForm, setContractForm] = useState({
    type: '',
    counterparty: '',
    description: '',
    startDate: '',
    endDate: '',
    value: '',
    autoRenew: false,
    slaTerms: '',
    paymentTerms: '',
  });

  const [renewForm, setRenewForm] = useState({
    newEndDate: '',
    adjustmentPct: '',
  });

  const { data: contractsData, isLoading: contractsLoading } = useContracts({
    type: typeFilter || undefined,
  });
  const { data: dashboard, isLoading: dashLoading } = useContractsDashboard();
  const { data: expiringContracts, isLoading: expiringLoading } = useExpiringContracts(90);
  const createContract = useCreateContract();
  const renewContract = useRenewContract();

  const handleCreateContract = async () => {
    if (!contractForm.type || !contractForm.counterparty || !contractForm.startDate || !contractForm.endDate || !contractForm.value || !contractForm.paymentTerms) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createContract.mutateAsync({
        type: contractForm.type,
        counterparty: contractForm.counterparty,
        description: contractForm.description,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        value: parseFloat(contractForm.value),
        autoRenew: contractForm.autoRenew,
        slaTerms: contractForm.slaTerms || undefined,
        paymentTerms: contractForm.paymentTerms,
      });
      toast.success('Contrato criado com sucesso.');
      setCreateDialogOpen(false);
      setContractForm({ type: '', counterparty: '', description: '', startDate: '', endDate: '', value: '', autoRenew: false, slaTerms: '', paymentTerms: '' });
    } catch {
      toast.error('Erro ao criar contrato.');
    }
  };

  const handleRenewContract = async () => {
    if (!renewForm.newEndDate) {
      toast.error('Informe a nova data de vencimento.');
      return;
    }
    try {
      await renewContract.mutateAsync({
        id: selectedContractId,
        newEndDate: renewForm.newEndDate,
        adjustmentPct: renewForm.adjustmentPct ? parseFloat(renewForm.adjustmentPct) : undefined,
      });
      toast.success('Contrato renovado com sucesso.');
      setRenewDialogOpen(false);
      setSelectedContractId('');
      setRenewForm({ newEndDate: '', adjustmentPct: '' });
    } catch {
      toast.error('Erro ao renovar contrato.');
    }
  };

  const openRenewDialog = (contractId: string) => {
    setSelectedContractId(contractId);
    setRenewForm({ newEndDate: '', adjustmentPct: '' });
    setRenewDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" />
            Gestão de Contratos
          </h1>
          <p className="text-muted-foreground">
            Contratos com fornecedores, convênios, serviços e manutenção
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" /> Contratos
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Vencendo
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Contracts List */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {contractsData?.total ?? 0} contratos
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-6">
              {contractsLoading ? (
                <PageLoading />
              ) : contractsData?.data && contractsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Contraparte</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vigência</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auto-Renovação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractsData.data.map((contract: Contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-mono text-sm">{contract.contractNumber}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{TYPE_LABELS[contract.type] ?? contract.type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{contract.counterparty}</TableCell>
                        <TableCell>
                          R$ {contract.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(contract.startDate).toLocaleDateString('pt-BR')} — {new Date(contract.endDate).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[contract.status] ?? ''}>
                            {STATUS_LABELS[contract.status] ?? contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contract.autoRenew ? (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-400">Sim</Badge>
                          ) : (
                            <span className="text-muted-foreground">Não</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(contract.status === 'ACTIVE' || contract.status === 'RENEWED') && (
                            <Button variant="outline" size="sm" onClick={() => openRenewDialog(contract.id)}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Renovar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum contrato encontrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiring Contracts */}
        <TabsContent value="expiring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Contratos Vencendo nos Próximos 90 Dias ({expiringContracts?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringLoading ? (
                <PageLoading />
              ) : expiringContracts && expiringContracts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Contraparte</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Dias Restantes</TableHead>
                      <TableHead>Auto-Renovação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringContracts.map((contract: ExpiringContract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-mono text-sm">{contract.contractNumber}</TableCell>
                        <TableCell className="font-medium">{contract.counterparty}</TableCell>
                        <TableCell>{TYPE_LABELS[contract.type] ?? contract.type}</TableCell>
                        <TableCell>
                          R$ {contract.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{new Date(contract.endDate).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              contract.daysRemaining <= 30
                                ? 'border-red-500 text-red-400'
                                : contract.daysRemaining <= 60
                                  ? 'border-yellow-500 text-yellow-400'
                                  : 'border-blue-500 text-blue-400'
                            }
                          >
                            {contract.daysRemaining} dias
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contract.autoRenew ? (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-400">Sim</Badge>
                          ) : (
                            <span className="text-muted-foreground">Não</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openRenewDialog(contract.id)}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Renovar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum contrato vencendo nos próximos 90 dias.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashLoading ? (
            <PageLoading />
          ) : dashboard ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-emerald-400" />
                      <p className="text-2xl font-bold">{dashboard.activeContracts}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Comprometido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-yellow-400" />
                      <p className="text-2xl font-bold">
                        R$ {dashboard.totalCommittedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Vencendo em 30 dias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <p className="text-2xl font-bold text-red-400">{dashboard.expiringSoon30}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Vencendo em 90 dias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-yellow-400" />
                      <p className="text-2xl font-bold text-yellow-400">{dashboard.expiringSoon90}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {dashboard.byType.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Valor por Tipo de Contrato</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard.byType.map((t) => ({ ...t, typeName: TYPE_LABELS[t.type] ?? t.type }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="typeName" stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                          />
                          <Bar dataKey="totalValue" name="Valor Total" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Create Contract Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>Cadastrar contrato com numeração automática</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <label className="text-sm font-medium">Tipo *</label>
              <Select value={contractForm.type} onValueChange={(v) => setContractForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Contraparte *</label>
              <Input placeholder="Nome do fornecedor/convênio/prestador" value={contractForm.counterparty} onChange={(e) => setContractForm((p) => ({ ...p, counterparty: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea placeholder="Descrição do contrato" rows={2} value={contractForm.description} onChange={(e) => setContractForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data Início *</label>
                <Input type="date" value={contractForm.startDate} onChange={(e) => setContractForm((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Data Fim *</label>
                <Input type="date" value={contractForm.endDate} onChange={(e) => setContractForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Valor (R$) *</label>
              <Input type="number" step="0.01" placeholder="0,00" value={contractForm.value} onChange={(e) => setContractForm((p) => ({ ...p, value: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Condições de Pagamento *</label>
              <Input placeholder="Ex: 30/60/90 dias" value={contractForm.paymentTerms} onChange={(e) => setContractForm((p) => ({ ...p, paymentTerms: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Termos de SLA</label>
              <Textarea placeholder="Termos de SLA (opcional)" rows={2} value={contractForm.slaTerms} onChange={(e) => setContractForm((p) => ({ ...p, slaTerms: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={contractForm.autoRenew} onCheckedChange={(v) => setContractForm((p) => ({ ...p, autoRenew: v }))} />
              <label className="text-sm">Renovação automática</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateContract} disabled={createContract.isPending}>
              {createContract.isPending ? 'Criando...' : 'Criar Contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Contract Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar Contrato</DialogTitle>
            <DialogDescription>Defina a nova data de vencimento e reajuste</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nova Data de Vencimento *</label>
              <Input type="date" value={renewForm.newEndDate} onChange={(e) => setRenewForm((p) => ({ ...p, newEndDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Reajuste (%)</label>
              <Input type="number" step="0.1" placeholder="Ex: 5.5" value={renewForm.adjustmentPct} onChange={(e) => setRenewForm((p) => ({ ...p, adjustmentPct: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Deixe vazio para manter o valor atual</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRenewContract} disabled={renewContract.isPending}>
              {renewContract.isPending ? 'Renovando...' : 'Renovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
