import { useState } from 'react';
import {
  ShoppingCart,
  BarChart3,
  Plus,
  FileCheck,
  Package,
  Clock,
  CheckCircle2,
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { PageLoading } from '@/components/common/page-loading';
import {
  useRequisitions,
  useProcurementDashboard,
  useCreateRequisition,
} from '@/services/procurement.service';
import type { Requisition } from '@/services/procurement.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_QUOTATION: 'Aguardando Cotação',
  QUOTING: 'Em Cotação',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  APPROVED: 'Aprovada',
  ORDERED: 'Pedido Emitido',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'border-gray-500 bg-gray-500/10 text-gray-400',
  PENDING_QUOTATION: 'border-blue-500 bg-blue-500/10 text-blue-400',
  QUOTING: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
  PENDING_APPROVAL: 'border-orange-500 bg-orange-500/10 text-orange-400',
  APPROVED: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
  ORDERED: 'border-purple-500 bg-purple-500/10 text-purple-400',
  DELIVERED: 'border-emerald-600 bg-emerald-600/10 text-emerald-300',
  CANCELLED: 'border-red-500 bg-red-500/10 text-red-400',
};

const URGENCY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const URGENCY_COLORS: Record<string, string> = {
  LOW: 'text-blue-400',
  MEDIUM: 'text-yellow-400',
  HIGH: 'text-orange-400',
  CRITICAL: 'text-red-400',
};

interface ItemForm {
  itemName: string;
  quantity: string;
  unit: string;
  specification: string;
  urgency: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState('requisitions');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const emptyItem: ItemForm = { itemName: '', quantity: '', unit: '', specification: '', urgency: 'MEDIUM' };

  const [reqForm, setReqForm] = useState({
    requestedBy: '',
    department: '',
    justification: '',
    items: [{ ...emptyItem }] as ItemForm[],
  });

  const { data: reqData, isLoading: reqLoading } = useRequisitions({
    status: statusFilter || undefined,
  });
  const { data: dashboard, isLoading: dashLoading } = useProcurementDashboard();
  const createRequisition = useCreateRequisition();

  const addItem = () => {
    setReqForm((p) => ({ ...p, items: [...p.items, { ...emptyItem }] }));
  };

  const removeItem = (index: number) => {
    setReqForm((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    setReqForm((p) => ({
      ...p,
      items: p.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleCreateRequisition = async () => {
    if (!reqForm.requestedBy || !reqForm.department || !reqForm.justification) {
      toast.error('Preencha solicitante, setor e justificativa.');
      return;
    }
    const validItems = reqForm.items.filter((i) => i.itemName && i.quantity && i.unit);
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item.');
      return;
    }
    try {
      await createRequisition.mutateAsync({
        requestedBy: reqForm.requestedBy,
        department: reqForm.department,
        justification: reqForm.justification,
        items: validItems.map((i) => ({
          itemName: i.itemName,
          quantity: parseInt(i.quantity, 10),
          unit: i.unit,
          specification: i.specification,
          urgency: i.urgency,
        })),
      });
      toast.success('Requisição de compra criada com sucesso.');
      setCreateDialogOpen(false);
      setReqForm({ requestedBy: '', department: '', justification: '', items: [{ ...emptyItem }] });
    } catch {
      toast.error('Erro ao criar requisição.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Compras e Cotações
          </h1>
          <p className="text-muted-foreground">
            Requisições, cotações, aprovações e pedidos de compra
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nova Requisição
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requisitions" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" /> Requisições
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Requisitions */}
        <TabsContent value="requisitions" className="space-y-4">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {reqData?.total ?? 0} requisições
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-6">
              {reqLoading ? (
                <PageLoading />
              ) : reqData?.data && reqData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Urgência</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reqData.data.map((req: Requisition) => {
                      const maxUrgency = req.items.reduce((max, item) => {
                        const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
                        return order.indexOf(item.urgency) > order.indexOf(max) ? item.urgency : max;
                      }, 'LOW');
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-mono text-sm">{req.requisitionNumber}</TableCell>
                          <TableCell>{req.department}</TableCell>
                          <TableCell>{req.requestedBy}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{req.items.length} {req.items.length === 1 ? 'item' : 'itens'}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={URGENCY_COLORS[maxUrgency] ?? ''}>
                              {URGENCY_LABELS[maxUrgency] ?? maxUrgency}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[req.status] ?? ''}>
                              {STATUS_LABELS[req.status] ?? req.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(req.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma requisição encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashLoading ? (
            <PageLoading />
          ) : dashboard ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Requisições Abertas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-400" />
                    <p className="text-2xl font-bold">{dashboard.openRequisitions}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Aprovação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    <p className="text-2xl font-bold text-yellow-400">{dashboard.pendingApprovals}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gastos no Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-emerald-400" />
                    <p className="text-2xl font-bold">
                      R$ {dashboard.totalSpendThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Economia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <p className="text-2xl font-bold text-emerald-400">
                      R$ {dashboard.savingsThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Create Requisition Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Requisição de Compra</DialogTitle>
            <DialogDescription>Preencha os dados e adicione os itens desejados</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Solicitante *</label>
                <Input placeholder="Nome do solicitante" value={reqForm.requestedBy} onChange={(e) => setReqForm((p) => ({ ...p, requestedBy: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Setor *</label>
                <Input placeholder="Setor/Departamento" value={reqForm.department} onChange={(e) => setReqForm((p) => ({ ...p, department: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Justificativa *</label>
              <Textarea placeholder="Justificativa da compra" rows={2} value={reqForm.justification} onChange={(e) => setReqForm((p) => ({ ...p, justification: e.target.value }))} />
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Itens</label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar Item
              </Button>
            </div>

            {reqForm.items.map((item, index) => (
              <div key={index} className="rounded border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Item {index + 1}</span>
                  {reqForm.items.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-6 text-red-400" onClick={() => removeItem(index)}>Remover</Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Nome do item" value={item.itemName} onChange={(e) => updateItem(index, 'itemName', e.target.value)} />
                  <Input type="number" placeholder="Qtd" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                  <Input placeholder="Unidade (cx, un, kg)" value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Especificação" value={item.specification} onChange={(e) => updateItem(index, 'specification', e.target.value)} />
                  <Select value={item.urgency} onValueChange={(v) => updateItem(index, 'urgency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(URGENCY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateRequisition} disabled={createRequisition.isPending}>
              {createRequisition.isPending ? 'Criando...' : 'Criar Requisição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
