import { useState } from 'react';
import {
  Package,
  Utensils,
  Wind,
  Trash2,
  ShoppingCart,
  FileText,
  MessageSquare,
  Archive,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useSupplies,
  useCreateSupply,
  useDiets,
  useLaundryRecords,
  useCreateLaundryRecord,
  useWasteRecords,
  useCreateWasteRecord,
  useProcurements,
  useContracts,
  useTickets,
  useCreateTicket,
  useMedicalRecords,
  useCreateMedicalRecord,
  type Supply,
  type ProcurementOrder,
  type Contract,
  type OmbudsmanTicket,
  type MedicalRecord,
  type WasteRecord,
} from '@/services/hospital-management.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function MetricCard({ label, value, sub, icon: Icon, highlight }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={`bg-zinc-900 border-zinc-800 ${highlight ? 'border-yellow-500/40' : ''}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className={`text-xl font-bold ${highlight ? 'text-yellow-400' : 'text-zinc-100'}`}>{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Supplies Tab ─────────────────────────────────────────────────────────────

function SuppliesTab() {
  const { data, isLoading } = useSupplies();
  const createSupply = useCreateSupply();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [minimumStock, setMinimumStock] = useState('0');

  const supplies: Supply[] = data ?? [];
  const lowStockCount = supplies.filter((s) => s.currentStock <= s.minimumStock).length;

  const handleSave = () => {
    if (!name.trim() || !code.trim() || !category.trim() || !unit.trim()) {
      toast.error('Preencha todos os campos obrigatórios.'); return;
    }
    createSupply.mutate(
      { name, code, category, unit, currentStock: Number(currentStock), minimumStock: Number(minimumStock), maximumStock: Number(minimumStock) * 5 },
      {
        onSuccess: () => { toast.success('Item cadastrado.'); setDialogOpen(false); setName(''); setCode(''); setCategory(''); setUnit(''); },
        onError: () => toast.error('Erro ao cadastrar item.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total de Itens" value={supplies.length} icon={Package} />
        <MetricCard label="Estoque Baixo" value={lowStockCount} icon={AlertTriangle} highlight={lowStockCount > 0} />
        <MetricCard label="Categorias" value={new Set(supplies.map((s) => s.category)).size} icon={Archive} />
        <MetricCard label="Inativos" value={supplies.filter((s) => !s.active).length} icon={TrendingDown} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Novo Item
        </Button>
      </div>
      {isLoading ? <p className="text-center text-zinc-400 py-8">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque Atual</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplies.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhum item cadastrado.</TableCell></TableRow>
            ) : supplies.map((s) => (
              <TableRow key={s.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="font-mono text-xs">{s.code}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.category}</TableCell>
                <TableCell className={s.currentStock <= s.minimumStock ? 'text-yellow-400 font-bold' : ''}>{s.currentStock} {s.unit}</TableCell>
                <TableCell>{s.minimumStock} {s.unit}</TableCell>
                <TableCell>
                  <Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Ativo' : 'Inativo'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Item de Almoxarifado</DialogTitle>
            <DialogDescription>Cadastre um novo item no estoque hospitalar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Código *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Categoria *</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Unidade *</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: un, cx, kg" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Estoque Atual</Label><Input type="number" min={0} value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Estoque Mínimo</Label><Input type="number" min={0} value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={createSupply.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createSupply.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── SND / Nutrition Tab ──────────────────────────────────────────────────────

function NutritionTab() {
  const { data, isLoading } = useDiets();
  const diets = data ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total de Dietas" value={diets.length} icon={Utensils} />
        <MetricCard label="Ativas" value={diets.filter((d) => d.status === 'ACTIVE').length} icon={CheckCircle2} />
        <MetricCard label="Suspensas" value={diets.filter((d) => d.status === 'SUSPENDED').length} icon={AlertTriangle} highlight={diets.filter((d) => d.status === 'SUSPENDED').length > 0} />
      </div>
      {isLoading ? <p className="text-center text-zinc-400 py-8">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Paciente</TableHead>
              <TableHead>Tipo de Dieta</TableHead>
              <TableHead>Textura</TableHead>
              <TableHead>Kcal Alvo</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {diets.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhuma dieta prescrita.</TableCell></TableRow>
            ) : diets.map((d) => (
              <TableRow key={d.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="text-xs font-mono">{d.patientId}</TableCell>
                <TableCell className="font-medium">{d.dietType}</TableCell>
                <TableCell>{d.texture ?? '—'}</TableCell>
                <TableCell>{d.caloricTarget ? `${d.caloricTarget} kcal` : '—'}</TableCell>
                <TableCell>{formatDate(d.startDate)}</TableCell>
                <TableCell>
                  <Badge variant={d.status === 'ACTIVE' ? 'default' : d.status === 'SUSPENDED' ? 'destructive' : 'secondary'}>
                    {d.status === 'ACTIVE' ? 'Ativa' : d.status === 'SUSPENDED' ? 'Suspensa' : 'Concluída'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Laundry Tab ──────────────────────────────────────────────────────────────

function LaundryTab() {
  const { data, isLoading } = useLaundryRecords();
  const createRecord = useCreateLaundryRecord();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemType, setItemType] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [sourceUnit, setSourceUnit] = useState('');

  const records = data ?? [];

  const handleSave = () => {
    if (!itemType.trim() || !sourceUnit.trim()) { toast.error('Preencha tipo e unidade de origem.'); return; }
    createRecord.mutate(
      { itemType, quantity: Number(quantity), unit, sourceUnit },
      {
        onSuccess: () => { toast.success('Envio registrado.'); setDialogOpen(false); setItemType(''); setSourceUnit(''); },
        onError: () => toast.error('Erro ao registrar envio.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total Enviado" value={records.filter((r) => r.status === 'SENT').length} icon={Wind} />
        <MetricCard label="Em Processamento" value={records.filter((r) => r.status === 'PROCESSING').length} icon={Clock} />
        <MetricCard label="Devolvido" value={records.filter((r) => r.status === 'RETURNED').length} icon={CheckCircle2} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Registrar Envio
        </Button>
      </div>
      {isLoading ? <p className="text-center text-zinc-400 py-8">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Item</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Unidade Origem</TableHead>
              <TableHead>Enviado em</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">Nenhum registro de lavanderia.</TableCell></TableRow>
            ) : records.map((r) => (
              <TableRow key={r.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="font-medium">{r.itemType}</TableCell>
                <TableCell>{r.quantity} {r.unit}</TableCell>
                <TableCell>{r.sourceUnit}</TableCell>
                <TableCell>{formatDate(r.sentAt)}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'RETURNED' ? 'default' : r.status === 'LOST' ? 'destructive' : 'secondary'}>
                    {r.status === 'SENT' ? 'Enviado' : r.status === 'PROCESSING' ? 'Processando' : r.status === 'RETURNED' ? 'Devolvido' : 'Perdido'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle>Envio para Lavanderia</DialogTitle>
            <DialogDescription>Registre itens enviados para processamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Tipo de Item *</Label><Input value={itemType} onChange={(e) => setItemType(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Lençol, Toalha" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Unidade</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="space-y-1"><Label>Unidade de Origem *</Label><Input value={sourceUnit} onChange={(e) => setSourceUnit(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: UTI Adulto" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={createRecord.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createRecord.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Waste Management Tab ─────────────────────────────────────────────────────

const WASTE_LABELS: Record<WasteRecord['wasteType'], string> = {
  INFECTIOUS: 'Infectante',
  CHEMICAL: 'Químico',
  RADIOACTIVE: 'Radioativo',
  COMMON: 'Comum',
  RECYCLABLE: 'Reciclável',
  SHARPS: 'Perfurocortante',
};

function WasteTab() {
  const { data, isLoading } = useWasteRecords();
  const createWaste = useCreateWasteRecord();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wasteType, setWasteType] = useState<WasteRecord['wasteType']>('COMMON');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('kg');
  const [collectionPoint, setCollectionPoint] = useState('');
  const [disposalDate, setDisposalDate] = useState('');

  const records = data ?? [];

  const handleSave = () => {
    if (!collectionPoint.trim() || !disposalDate) { toast.error('Preencha ponto de coleta e data.'); return; }
    createWaste.mutate(
      { wasteType, quantity: Number(quantity), unit, collectionPoint, disposalDate },
      {
        onSuccess: () => { toast.success('Resíduo registrado.'); setDialogOpen(false); setCollectionPoint(''); setDisposalDate(''); },
        onError: () => toast.error('Erro ao registrar resíduo.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total de Registros" value={records.length} icon={Trash2} />
        <MetricCard label="Coletados" value={records.filter((r) => r.status === 'COLLECTED').length} icon={CheckCircle2} />
        <MetricCard label="Em Trânsito" value={records.filter((r) => r.status === 'IN_TRANSIT').length} icon={Clock} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Registrar
        </Button>
      </div>
      {isLoading ? <p className="text-center text-zinc-400 py-8">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Tipo</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Ponto de Coleta</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Manifesto</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhum resíduo registrado.</TableCell></TableRow>
            ) : records.map((r) => (
              <TableRow key={r.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell><Badge variant="outline">{WASTE_LABELS[r.wasteType]}</Badge></TableCell>
                <TableCell>{r.quantity} {r.unit}</TableCell>
                <TableCell>{r.collectionPoint}</TableCell>
                <TableCell>{formatDate(r.disposalDate)}</TableCell>
                <TableCell className="font-mono text-xs">{r.manifestNumber ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'DISPOSED' ? 'default' : 'secondary'}>
                    {r.status === 'COLLECTED' ? 'Coletado' : r.status === 'IN_TRANSIT' ? 'Em Trânsito' : 'Descartado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Resíduo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Tipo de Resíduo</Label>
              <Select value={wasteType} onValueChange={(v) => setWasteType(v as WasteRecord['wasteType'])}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(WASTE_LABELS) as WasteRecord['wasteType'][]).map((k) => (
                    <SelectItem key={k} value={k}>{WASTE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Unidade</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="space-y-1"><Label>Ponto de Coleta *</Label><Input value={collectionPoint} onChange={(e) => setCollectionPoint(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            <div className="space-y-1"><Label>Data de Descarte *</Label><Input type="date" value={disposalDate} onChange={(e) => setDisposalDate(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={createWaste.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createWaste.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Procurement Tab ──────────────────────────────────────────────────────────

const PROCUREMENT_STATUS_LABEL: Record<ProcurementOrder['status'], string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  APPROVED: 'Aprovado',
  ORDERED: 'Pedido Emitido',
  PARTIALLY_RECEIVED: 'Recebido Parcial',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

function ProcurementTab() {
  const { data, isLoading } = useProcurements();
  const orders: ProcurementOrder[] = data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total de Pedidos" value={orders.length} icon={ShoppingCart} />
        <MetricCard label="Aguardando Aprovação" value={orders.filter((o) => o.status === 'PENDING_APPROVAL').length} icon={Clock} highlight={orders.filter((o) => o.status === 'PENDING_APPROVAL').length > 0} />
        <MetricCard label="Recebidos" value={orders.filter((o) => o.status === 'RECEIVED').length} icon={CheckCircle2} />
      </div>
      {isLoading ? <p className="text-center text-zinc-400 py-8">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Nº Solicitação</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Justificativa</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Valor Est.</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhum pedido de compra.</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="font-mono text-xs">{o.requestNumber}</TableCell>
                <TableCell>{o.items.length} {o.items.length === 1 ? 'item' : 'itens'}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">{o.justification}</TableCell>
                <TableCell>
                  <Badge variant={o.priority === 'URGENT' ? 'destructive' : o.priority === 'HIGH' ? 'default' : 'secondary'}>
                    {o.priority === 'URGENT' ? 'Urgente' : o.priority === 'HIGH' ? 'Alta' : o.priority === 'NORMAL' ? 'Normal' : 'Baixa'}
                  </Badge>
                </TableCell>
                <TableCell>{o.totalEstimatedCost ? formatCurrency(o.totalEstimatedCost) : '—'}</TableCell>
                <TableCell className="text-xs">{PROCUREMENT_STATUS_LABEL[o.status]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Contracts Tab ────────────────────────────────────────────────────────────

function ContractsTab() {
  const { data, isLoading } = useContracts();
  const contracts: Contract[] = data ?? [];
  const expiringSoon = contracts.filter((c) => {
    const days = (new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 30 && c.status === 'ACTIVE';
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Contratos Ativos" value={contracts.filter((c) => c.status === 'ACTIVE').length} icon={FileText} />
        <MetricCard label="Vencendo em 30 dias" value={expiringSoon.length} icon={AlertTriangle} highlight={expiringSoon.length > 0} />
        <MetricCard label="Vencidos" value={contracts.filter((c) => c.status === 'EXPIRED').length} icon={TrendingDown} />
      </div>
      {isLoading ? <p className="text-center text-zinc-400 py-8">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Nº Contrato</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhum contrato cadastrado.</TableCell></TableRow>
            ) : contracts.map((c) => (
              <TableRow key={c.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="font-mono text-xs">{c.contractNumber}</TableCell>
                <TableCell className="font-medium">{c.vendor}</TableCell>
                <TableCell>{c.type}</TableCell>
                <TableCell>{formatCurrency(c.value)}</TableCell>
                <TableCell className="text-xs">{formatDate(c.startDate)} – {formatDate(c.endDate)}</TableCell>
                <TableCell>
                  <Badge variant={c.status === 'ACTIVE' ? 'default' : c.status === 'EXPIRED' ? 'destructive' : 'secondary'}>
                    {c.status === 'ACTIVE' ? 'Ativo' : c.status === 'EXPIRED' ? 'Vencido' : c.status === 'CANCELLED' ? 'Cancelado' : 'Pendente'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Ombudsman Tab ────────────────────────────────────────────────────────────

function OmbudsmanTab() {
  const { data, isLoading } = useTickets();
  const createTicket = useCreateTicket();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState<OmbudsmanTicket['type']>('COMPLAINT');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const tickets: OmbudsmanTicket[] = data ?? [];

  const handleSave = () => {
    if (!category.trim() || !description.trim()) { toast.error('Preencha categoria e descrição.'); return; }
    createTicket.mutate(
      { type, category, description, anonymous },
      {
        onSuccess: () => { toast.success('Manifestação registrada.'); setDialogOpen(false); setCategory(''); setDescription(''); },
        onError: () => toast.error('Erro ao registrar manifestação.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Em Aberto" value={tickets.filter((t) => t.status === 'OPEN').length} icon={MessageSquare} highlight={tickets.filter((t) => t.status === 'OPEN').length > 0} />
        <MetricCard label="Em Andamento" value={tickets.filter((t) => t.status === 'IN_PROGRESS').length} icon={Clock} />
        <MetricCard label="Resolvidos" value={tickets.filter((t) => t.status === 'RESOLVED').length} icon={CheckCircle2} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nova Manifestação
        </Button>
      </div>
      {isLoading ? <p className="text-center text-zinc-400 py-8">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Protocolo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhuma manifestação registrada.</TableCell></TableRow>
            ) : tickets.map((t) => (
              <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="font-mono text-xs">{t.protocolNumber}</TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell>
                  <Badge variant={t.priority === 'URGENT' ? 'destructive' : t.priority === 'HIGH' ? 'default' : 'secondary'}>
                    {t.priority === 'URGENT' ? 'Urgente' : t.priority === 'HIGH' ? 'Alta' : t.priority === 'NORMAL' ? 'Normal' : 'Baixa'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(t.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant={t.status === 'OPEN' ? 'destructive' : t.status === 'RESOLVED' ? 'default' : 'secondary'}>
                    {t.status === 'OPEN' ? 'Aberto' : t.status === 'IN_PROGRESS' ? 'Em Andamento' : t.status === 'RESOLVED' ? 'Resolvido' : 'Fechado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Manifestação</DialogTitle>
            <DialogDescription>Registre uma reclamação, sugestão, elogio ou solicitação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as OmbudsmanTicket['type'])}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPLAINT">Reclamação</SelectItem>
                    <SelectItem value="COMPLIMENT">Elogio</SelectItem>
                    <SelectItem value="SUGGESTION">Sugestão</SelectItem>
                    <SelectItem value="REQUEST">Solicitação</SelectItem>
                    <SelectItem value="DENUNCIATION">Denúncia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Categoria *</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="anon-check" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-emerald-500" />
              <label htmlFor="anon-check" className="text-sm">Manifestação anônima</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={createTicket.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createTicket.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Medical Records (SAME) Tab ───────────────────────────────────────────────

function MedicalRecordsTab() {
  const { data, isLoading } = useMedicalRecords();
  const createRecord = useCreateMedicalRecord();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [recordNumber, setRecordNumber] = useState('');
  const [type, setType] = useState<MedicalRecord['type']>('DIGITAL');

  const records: MedicalRecord[] = data ?? [];

  const handleSave = () => {
    if (!patientId.trim() || !recordNumber.trim()) { toast.error('Preencha paciente e número do prontuário.'); return; }
    createRecord.mutate(
      { patientId, recordNumber, type },
      {
        onSuccess: () => { toast.success('Prontuário registrado.'); setDialogOpen(false); setPatientId(''); setRecordNumber(''); },
        onError: () => toast.error('Erro ao registrar prontuário.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total" value={records.length} icon={Archive} />
        <MetricCard label="Retirados" value={records.filter((r) => r.status === 'CHECKED_OUT').length} icon={Clock} />
        <MetricCard label="Perdidos" value={records.filter((r) => r.status === 'LOST').length} icon={AlertTriangle} highlight={records.filter((r) => r.status === 'LOST').length > 0} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Novo Prontuário
        </Button>
      </div>
      {isLoading ? <p className="text-center text-zinc-400 py-8">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Nº Prontuário</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">Nenhum prontuário físico/híbrido registrado.</TableCell></TableRow>
            ) : records.map((r) => (
              <TableRow key={r.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="font-mono">{r.recordNumber}</TableCell>
                <TableCell className="font-mono text-xs">{r.patientId}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>{r.location ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'ACTIVE' ? 'default' : r.status === 'LOST' ? 'destructive' : 'secondary'}>
                    {r.status === 'ACTIVE' ? 'Ativo' : r.status === 'ARCHIVED' ? 'Arquivado' : r.status === 'CHECKED_OUT' ? 'Retirado' : r.status === 'LOST' ? 'Perdido' : 'Solicitado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Prontuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>ID do Paciente *</Label><Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            <div className="space-y-1"><Label>Nº do Prontuário *</Label><Input value={recordNumber} onChange={(e) => setRecordNumber(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as MedicalRecord['type'])}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICAL">Físico</SelectItem>
                  <SelectItem value="DIGITAL">Digital</SelectItem>
                  <SelectItem value="HYBRID">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={createRecord.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createRecord.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HospitalManagementPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão Hospitalar</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Suprimentos, nutrição, lavanderia, resíduos, compras, contratos, ouvidoria e arquivo médico.</p>
      </div>

      <Tabs defaultValue="supplies">
        <TabsList className="bg-zinc-900 border border-zinc-800 h-auto flex-wrap gap-0.5 p-1">
          <TabsTrigger value="supplies" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Package className="h-3.5 w-3.5 mr-1" /> Suprimentos
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Utensils className="h-3.5 w-3.5 mr-1" /> SND / Nutrição
          </TabsTrigger>
          <TabsTrigger value="laundry" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Wind className="h-3.5 w-3.5 mr-1" /> Lavanderia
          </TabsTrigger>
          <TabsTrigger value="waste" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Resíduos
          </TabsTrigger>
          <TabsTrigger value="procurement" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Compras
          </TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" /> Contratos
          </TabsTrigger>
          <TabsTrigger value="ombudsman" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Ouvidoria
          </TabsTrigger>
          <TabsTrigger value="same" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Archive className="h-3.5 w-3.5 mr-1" /> SAME
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supplies" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-emerald-400" /> Almoxarifado</CardTitle></CardHeader>
            <CardContent><SuppliesTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutrition" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Utensils className="h-4 w-4 text-emerald-400" /> Serviço de Nutrição e Dietética</CardTitle></CardHeader>
            <CardContent><NutritionTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="laundry" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wind className="h-4 w-4 text-emerald-400" /> Lavanderia Hospitalar</CardTitle></CardHeader>
            <CardContent><LaundryTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waste" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Trash2 className="h-4 w-4 text-emerald-400" /> Gerenciamento de Resíduos</CardTitle></CardHeader>
            <CardContent><WasteTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-400" /> Compras e Suprimentos</CardTitle></CardHeader>
            <CardContent><ProcurementTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-400" /> Contratos</CardTitle></CardHeader>
            <CardContent><ContractsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ombudsman" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-emerald-400" /> Ouvidoria</CardTitle></CardHeader>
            <CardContent><OmbudsmanTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="same" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4 text-emerald-400" /> SAME — Arquivo Médico</CardTitle></CardHeader>
            <CardContent><MedicalRecordsTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
