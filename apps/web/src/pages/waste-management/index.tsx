import { useState } from 'react';
import {
  Trash2,
  Scale,
  Truck,
  BarChart3,
  FileText,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
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
import { Separator } from '@/components/ui/separator';
import { PageLoading } from '@/components/common/page-loading';
import {
  useWasteDashboard,
  usePendingDisposals,
  useRegisterWaste,
  useRecordWeighing,
  useRecordDisposal,
} from '@/services/waste-management.service';
import type { PendingDisposal } from '@/services/waste-management.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const WASTE_GROUPS = [
  { value: 'A1', label: 'A1 - Culturas e microrganismos' },
  { value: 'A2', label: 'A2 - Carcaças animais' },
  { value: 'A3', label: 'A3 - Peças anatômicas humanas' },
  { value: 'A4', label: 'A4 - Kits de linhas e filtros' },
  { value: 'A5', label: 'A5 - Órgãos com prions' },
  { value: 'B', label: 'B - Químicos' },
  { value: 'C', label: 'C - Radioativos' },
  { value: 'D', label: 'D - Comuns' },
  { value: 'E', label: 'E - Perfurocortantes' },
];

const DISPOSAL_METHODS = [
  { value: 'INCINERATION', label: 'Incineração' },
  { value: 'AUTOCLAVE', label: 'Autoclavagem' },
  { value: 'MICROWAVE', label: 'Micro-ondas' },
  { value: 'LANDFILL', label: 'Aterro sanitário' },
  { value: 'CHEMICAL', label: 'Tratamento químico' },
];

const GROUP_COLORS: Record<string, string> = {
  A1: 'bg-red-500/20 text-red-400 border-red-500',
  A2: 'bg-red-500/20 text-red-400 border-red-500',
  A3: 'bg-red-500/20 text-red-400 border-red-500',
  A4: 'bg-orange-500/20 text-orange-400 border-orange-500',
  A5: 'bg-red-700/20 text-red-500 border-red-700',
  B: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  C: 'bg-purple-500/20 text-purple-400 border-purple-500',
  D: 'bg-blue-500/20 text-blue-400 border-blue-500',
  E: 'bg-orange-500/20 text-orange-400 border-orange-500',
};

const CHART_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#f97316', '#ec4899', '#10b981', '#06b6d4', '#84cc16'];

// ─── Component ──────────────────────────────────────────────────────────────

export default function WasteManagementPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [weighingDialogOpen, setWeighingDialogOpen] = useState(false);
  const [disposalDialogOpen, setDisposalDialogOpen] = useState(false);

  const [wasteForm, setWasteForm] = useState({
    wasteGroup: '',
    source: '',
    weight: '',
    containerId: '',
    description: '',
  });

  const [weighingForm, setWeighingForm] = useState({
    containerId: '',
    grossWeight: '',
    netWeight: '',
    weighedBy: '',
  });

  const [disposalForm, setDisposalForm] = useState({
    manifestId: '',
    transportCompany: '',
    driverName: '',
    vehiclePlate: '',
    disposalMethod: '',
    certificateNumber: '',
  });

  const { data: dashboard, isLoading: dashboardLoading } = useWasteDashboard();
  const { data: pendingDisposals, isLoading: pendingLoading } = usePendingDisposals();
  const registerWaste = useRegisterWaste();
  const recordWeighing = useRecordWeighing();
  const recordDisposal = useRecordDisposal();

  const handleRegisterWaste = async () => {
    if (!wasteForm.wasteGroup || !wasteForm.source || !wasteForm.weight || !wasteForm.description) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await registerWaste.mutateAsync({
        wasteGroup: wasteForm.wasteGroup,
        source: wasteForm.source,
        weight: parseFloat(wasteForm.weight),
        containerId: wasteForm.containerId || undefined,
        description: wasteForm.description,
      });
      toast.success('Resíduo registrado com sucesso.');
      setRegisterDialogOpen(false);
      setWasteForm({ wasteGroup: '', source: '', weight: '', containerId: '', description: '' });
    } catch {
      toast.error('Erro ao registrar resíduo.');
    }
  };

  const handleRecordWeighing = async () => {
    if (!weighingForm.containerId || !weighingForm.grossWeight || !weighingForm.netWeight || !weighingForm.weighedBy) {
      toast.error('Preencha todos os campos.');
      return;
    }
    try {
      await recordWeighing.mutateAsync({
        containerId: weighingForm.containerId,
        grossWeight: parseFloat(weighingForm.grossWeight),
        netWeight: parseFloat(weighingForm.netWeight),
        weighedBy: weighingForm.weighedBy,
      });
      toast.success('Pesagem registrada com sucesso.');
      setWeighingDialogOpen(false);
      setWeighingForm({ containerId: '', grossWeight: '', netWeight: '', weighedBy: '' });
    } catch {
      toast.error('Erro ao registrar pesagem.');
    }
  };

  const handleRecordDisposal = async () => {
    if (!disposalForm.manifestId || !disposalForm.transportCompany || !disposalForm.driverName || !disposalForm.vehiclePlate || !disposalForm.disposalMethod) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await recordDisposal.mutateAsync({
        manifestId: disposalForm.manifestId,
        transportCompany: disposalForm.transportCompany,
        driverName: disposalForm.driverName,
        vehiclePlate: disposalForm.vehiclePlate,
        disposalMethod: disposalForm.disposalMethod,
        certificateNumber: disposalForm.certificateNumber || undefined,
      });
      toast.success('Descarte registrado com sucesso.');
      setDisposalDialogOpen(false);
      setDisposalForm({ manifestId: '', transportCompany: '', driverName: '', vehiclePlate: '', disposalMethod: '', certificateNumber: '' });
    } catch {
      toast.error('Erro ao registrar descarte.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-primary" />
          PGRSS - Gestão de Resíduos
        </h1>
        <p className="text-muted-foreground">
          Plano de Gerenciamento de Resíduos de Serviços de Saúde (RDC 222/2018)
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setRegisterDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Registrar Resíduo
        </Button>
        <Button variant="outline" onClick={() => setWeighingDialogOpen(true)} className="flex items-center gap-2">
          <Scale className="h-4 w-4" /> Pesagem
        </Button>
        <Button variant="outline" onClick={() => setDisposalDialogOpen(true)} className="flex items-center gap-2">
          <Truck className="h-4 w-4" /> Descarte
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Pendentes
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Relatório
          </TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashboardLoading ? (
            <PageLoading />
          ) : dashboard ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Registros este Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{dashboard.totalRecordsThisMonth}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Custo Estimado Mensal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-400">
                      R$ {dashboard.estimatedMonthlyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Descartes Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-400">{dashboard.pendingDisposals}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Grupos Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{dashboard.totalKgByGroup.length}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Kg por Grupo de Resíduo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard.totalKgByGroup}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="group" stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value} kg`, 'Peso']}
                          />
                          <Bar dataKey="kg" name="Kg" radius={[4, 4, 0, 0]}>
                            {dashboard.totalKgByGroup.map((entry, index) => (
                              <rect key={entry.group} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tendência Mensal (kg)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboard.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          />
                          <Line type="monotone" dataKey="kg" name="Kg" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Pending Disposals */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resíduos Aguardando Coleta ({pendingDisposals?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <PageLoading />
              ) : pendingDisposals && pendingDisposals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Container</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDisposals.map((item: PendingDisposal) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline" className={GROUP_COLORS[item.wasteGroup] ?? ''}>
                            {item.wasteGroup}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.source}</TableCell>
                        <TableCell className="font-medium">{item.weight} kg</TableCell>
                        <TableCell>{item.containerId ?? '—'}</TableCell>
                        <TableCell className="max-w-48 truncate">{item.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                            Pendente
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(item.registeredAt).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum resíduo pendente de coleta.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report placeholder */}
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório Mensal PGRSS</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Selecione o mês e ano para gerar o relatório detalhado de resíduos conforme RDC 222/2018.
              </p>
              <Separator className="my-4" />
              <div className="flex gap-4">
                <Input type="month" className="max-w-xs" />
                <Button variant="outline">Gerar Relatório</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Register Waste Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Resíduo</DialogTitle>
            <DialogDescription>Classificação conforme RDC 222/2018 ANVISA</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Grupo de Resíduo *</label>
              <Select value={wasteForm.wasteGroup} onValueChange={(v) => setWasteForm((p) => ({ ...p, wasteGroup: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                <SelectContent>
                  {WASTE_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Setor de Origem *</label>
              <Input placeholder="Ex: UTI, Centro Cirúrgico, Enfermaria" value={wasteForm.source} onChange={(e) => setWasteForm((p) => ({ ...p, source: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Peso (kg) *</label>
                <Input type="number" step="0.01" placeholder="0.00" value={wasteForm.weight} onChange={(e) => setWasteForm((p) => ({ ...p, weight: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">ID Container</label>
                <Input placeholder="Opcional" value={wasteForm.containerId} onChange={(e) => setWasteForm((p) => ({ ...p, containerId: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input placeholder="Descrição do resíduo" value={wasteForm.description} onChange={(e) => setWasteForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegisterWaste} disabled={registerWaste.isPending}>
              {registerWaste.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weighing Dialog */}
      <Dialog open={weighingDialogOpen} onOpenChange={setWeighingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pesagem</DialogTitle>
            <DialogDescription>Pesagem de container de resíduos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ID Container *</label>
              <Input placeholder="Identificador do container" value={weighingForm.containerId} onChange={(e) => setWeighingForm((p) => ({ ...p, containerId: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Peso Bruto (kg) *</label>
                <Input type="number" step="0.01" value={weighingForm.grossWeight} onChange={(e) => setWeighingForm((p) => ({ ...p, grossWeight: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Peso Líquido (kg) *</label>
                <Input type="number" step="0.01" value={weighingForm.netWeight} onChange={(e) => setWeighingForm((p) => ({ ...p, netWeight: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Pesado por *</label>
              <Input placeholder="Nome do responsável" value={weighingForm.weighedBy} onChange={(e) => setWeighingForm((p) => ({ ...p, weighedBy: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeighingDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRecordWeighing} disabled={recordWeighing.isPending}>
              {recordWeighing.isPending ? 'Salvando...' : 'Registrar Pesagem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disposal Dialog */}
      <Dialog open={disposalDialogOpen} onOpenChange={setDisposalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Descarte</DialogTitle>
            <DialogDescription>Manifesto de transporte de resíduos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nº Manifesto *</label>
              <Input placeholder="Número do manifesto" value={disposalForm.manifestId} onChange={(e) => setDisposalForm((p) => ({ ...p, manifestId: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Transportadora *</label>
              <Input placeholder="Nome da empresa" value={disposalForm.transportCompany} onChange={(e) => setDisposalForm((p) => ({ ...p, transportCompany: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Motorista *</label>
                <Input placeholder="Nome completo" value={disposalForm.driverName} onChange={(e) => setDisposalForm((p) => ({ ...p, driverName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Placa Veículo *</label>
                <Input placeholder="ABC-1D23" value={disposalForm.vehiclePlate} onChange={(e) => setDisposalForm((p) => ({ ...p, vehiclePlate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Método de Disposição *</label>
              <Select value={disposalForm.disposalMethod} onValueChange={(v) => setDisposalForm((p) => ({ ...p, disposalMethod: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o método" /></SelectTrigger>
                <SelectContent>
                  {DISPOSAL_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Nº Certificado</label>
              <Input placeholder="Opcional" value={disposalForm.certificateNumber} onChange={(e) => setDisposalForm((p) => ({ ...p, certificateNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRecordDisposal} disabled={recordDisposal.isPending}>
              {recordDisposal.isPending ? 'Salvando...' : 'Registrar Descarte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
