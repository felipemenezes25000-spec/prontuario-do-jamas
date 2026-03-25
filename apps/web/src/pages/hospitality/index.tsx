import { useState } from 'react';
import {
  Hotel,
  Brush,
  Package,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useHousekeepingTasks,
  useLaundryOrders,
  useCompanions,
  useHospitalityStats,
  useUpdateCleaningStatus,
  useCreateLaundryOrder,
  useRegisterCompanion,
  type CleaningStatus,
  type LaundryStatus,
  type HousekeepingTask,
} from '@/services/hospitality.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const CLEANING_STATUS_LABEL: Record<CleaningStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Progresso',
  COMPLETED: 'Concluída',
  INSPECTED: 'Inspecionada',
};

const CLEANING_STATUS_CLASS: Record<CleaningStatus, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  IN_PROGRESS: 'bg-blue-900/40 text-blue-300 border-blue-700',
  COMPLETED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  INSPECTED: 'bg-purple-900/40 text-purple-300 border-purple-700',
};

const LAUNDRY_STATUS_LABEL: Record<LaundryStatus, string> = {
  REQUESTED: 'Solicitada',
  COLLECTED: 'Coletada',
  WASHING: 'Em Lavagem',
  READY: 'Pronta',
  DELIVERED: 'Entregue',
};

const LAUNDRY_STATUS_CLASS: Record<LaundryStatus, string> = {
  REQUESTED: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  COLLECTED: 'bg-blue-900/40 text-blue-300 border-blue-700',
  WASHING: 'bg-purple-900/40 text-purple-300 border-purple-700',
  READY: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  DELIVERED: 'bg-gray-800 text-gray-300 border-gray-600',
};

const PRIORITY_CLASS: Record<HousekeepingTask['priority'], string> = {
  LOW: 'bg-gray-800 text-gray-300 border-gray-600',
  NORMAL: 'bg-blue-900/40 text-blue-300 border-blue-700',
  HIGH: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  URGENT: 'bg-red-900/40 text-red-300 border-red-700',
};

const PRIORITY_LABEL: Record<HousekeepingTask['priority'], string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const TASK_TYPE_LABEL: Record<HousekeepingTask['type'], string> = {
  TERMINAL: 'Limpeza Terminal',
  CONCURRENT: 'Limpeza Concorrente',
  CHECKOUT: 'Checkout',
};

// ─── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats } = useHospitalityStats();
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {[
        { label: 'Limpezas Pendentes', value: stats.pendingCleaning, icon: AlertTriangle, color: 'text-yellow-400' },
        { label: 'Em Progresso', value: stats.inProgressCleaning, icon: Clock, color: 'text-blue-400' },
        { label: 'Concluídas Hoje', value: stats.completedToday, icon: CheckCircle2, color: 'text-emerald-400' },
        { label: 'Lavanderia Pendente', value: stats.pendingLaundry, icon: Package, color: 'text-purple-400' },
        { label: 'Acompanhantes Ativos', value: stats.activeCompanions, icon: Users, color: 'text-blue-400' },
      ].map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-3">
            <Icon className={cn('w-5 h-5 mb-1', color)} />
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Housekeeping Tab ─────────────────────────────────────────────────────────

function HousekeepingTab() {
  const { data, isLoading } = useHousekeepingTasks();
  const updateStatus = useUpdateCleaningStatus();
  const tasks = data?.data ?? [];

  const nextStatus: Partial<Record<CleaningStatus, CleaningStatus>> = {
    PENDING: 'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
    COMPLETED: 'INSPECTED',
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <Brush className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma tarefa de higienização.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Quarto</TableHead>
              <TableHead className="text-gray-400">Andar</TableHead>
              <TableHead className="text-gray-400">Tipo</TableHead>
              <TableHead className="text-gray-400">Prioridade</TableHead>
              <TableHead className="text-gray-400">Responsável</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Avançar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const next = nextStatus[task.status];
              return (
                <TableRow key={task.id} className="border-gray-700 hover:bg-gray-800/50">
                  <TableCell className="text-white font-medium">{task.roomNumber}</TableCell>
                  <TableCell className="text-gray-300">{task.floor}</TableCell>
                  <TableCell className="text-gray-300 text-sm">{TASK_TYPE_LABEL[task.type]}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border', PRIORITY_CLASS[task.priority])}>
                      {PRIORITY_LABEL[task.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">{task.assignedTo ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs border', CLEANING_STATUS_CLASS[task.status])}>
                      {CLEANING_STATUS_LABEL[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {next && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 text-xs"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate(
                            { id: task.id, status: next },
                            { onSuccess: () => toast.success(`Quarto ${task.roomNumber}: ${CLEANING_STATUS_LABEL[next]}`) },
                          )
                        }
                      >
                        → {CLEANING_STATUS_LABEL[next]}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Laundry Tab ─────────────────────────────────────────────────────────────

function LaundryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateLaundryOrder();
  const [dept, setDept] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [items, setItems] = useState([{ name: '', quantity: 1 }]);

  function addItem() { setItems((prev) => [...prev, { name: '', quantity: 1 }]); }
  function updateItem(i: number, field: 'name' | 'quantity', value: string | number) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { department: dept, items: items.filter((i) => i.name), requestedBy: requestedBy || undefined, deliveredAt: undefined },
      { onSuccess: () => { toast.success('Pedido de lavanderia criado'); onClose(); setDept(''); setItems([{ name: '', quantity: 1 }]); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader><DialogTitle className="text-white">Novo Pedido de Lavanderia</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300">Setor</Label>
              <Input required className="bg-gray-800 border-gray-700 text-white mt-1" value={dept} onChange={(e) => setDept(e.target.value)} />
            </div>
            <div>
              <Label className="text-gray-300">Solicitado por</Label>
              <Input className="bg-gray-800 border-gray-700 text-white mt-1" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Itens</Label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Descrição"
                  className="bg-gray-800 border-gray-700 text-white flex-1"
                  value={item.name}
                  onChange={(e) => updateItem(i, 'name', e.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  className="bg-gray-800 border-gray-700 text-white w-20"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="border-gray-600 text-gray-300" onClick={addItem}>
              <Plus className="w-3 h-3 mr-1" /> Adicionar Item
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={create.isPending}>
              {create.isPending ? 'Criando…' : 'Criar Pedido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LaundryTab() {
  const { data, isLoading } = useLaundryOrders();
  const [dialogOpen, setDialogOpen] = useState(false);
  const orders = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Pedido
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum pedido de lavanderia.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Setor</TableHead>
              <TableHead className="text-gray-400">Itens</TableHead>
              <TableHead className="text-gray-400">Solicitado por</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-medium">{order.department}</TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{order.requestedBy ?? '—'}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', LAUNDRY_STATUS_CLASS[order.status])}>
                    {LAUNDRY_STATUS_LABEL[order.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(order.requestedAt).toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <LaundryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// ─── Companions Tab ───────────────────────────────────────────────────────────

function CompanionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const register = useRegisterCompanion();
  const [form, setForm] = useState({ name: '', cpf: '', patientId: '', patientName: '', roomNumber: '', relationship: '', badgeNumber: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate(
      { ...form, checkedOutAt: undefined },
      { onSuccess: () => { toast.success('Acompanhante registrado'); onClose(); setForm({ name: '', cpf: '', patientId: '', patientName: '', roomNumber: '', relationship: '', badgeNumber: '' }); } },
    );
  }

  const fields: { key: keyof typeof form; label: string; placeholder?: string }[] = [
    { key: 'name', label: 'Nome do Acompanhante' },
    { key: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
    { key: 'patientId', label: 'ID do Paciente' },
    { key: 'patientName', label: 'Nome do Paciente' },
    { key: 'roomNumber', label: 'Quarto' },
    { key: 'relationship', label: 'Parentesco', placeholder: 'Cônjuge, filho(a), etc.' },
    { key: 'badgeNumber', label: 'Nº Crachá' },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader><DialogTitle className="text-white">Registrar Acompanhante</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key} className={key === 'name' || key === 'patientName' ? 'col-span-2' : ''}>
                <Label className="text-gray-300">{label}</Label>
                <Input
                  required={['name', 'cpf', 'patientId', 'roomNumber', 'relationship'].includes(key)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={register.isPending}>
              {register.isPending ? 'Registrando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompanionsTab() {
  const { data, isLoading } = useCompanions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const companions = data?.data ?? [];
  const active = companions.filter((c) => !c.checkedOutAt);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Registrar Acompanhante
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : active.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum acompanhante ativo.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Nome</TableHead>
              <TableHead className="text-gray-400">CPF</TableHead>
              <TableHead className="text-gray-400">Paciente</TableHead>
              <TableHead className="text-gray-400">Quarto</TableHead>
              <TableHead className="text-gray-400">Parentesco</TableHead>
              <TableHead className="text-gray-400">Crachá</TableHead>
              <TableHead className="text-gray-400">Check-in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((c) => (
              <TableRow key={c.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-medium">{c.name}</TableCell>
                <TableCell className="text-gray-300 font-mono text-xs">{c.cpf}</TableCell>
                <TableCell className="text-gray-300 text-sm">{c.patientName}</TableCell>
                <TableCell className="text-gray-300">{c.roomNumber}</TableCell>
                <TableCell className="text-gray-300 text-sm">{c.relationship}</TableCell>
                <TableCell className="text-gray-300 font-mono text-xs">{c.badgeNumber ?? '—'}</TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(c.checkedInAt).toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CompanionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HospitalityPage() {
  const [tab, setTab] = useState('housekeeping');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-900/40 flex items-center justify-center">
          <Hotel className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Hotelaria Hospitalar</h1>
          <p className="text-sm text-gray-400">Higienização, lavanderia e controle de acompanhantes</p>
        </div>
      </div>

      <StatsBar />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="housekeeping" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Brush className="w-4 h-4 mr-2" /> Higienização
          </TabsTrigger>
          <TabsTrigger value="laundry" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Package className="w-4 h-4 mr-2" /> Lavanderia
          </TabsTrigger>
          <TabsTrigger value="companions" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Users className="w-4 h-4 mr-2" /> Acompanhantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="housekeeping">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Tarefas de Higienização</CardTitle>
            </CardHeader>
            <CardContent><HousekeepingTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="laundry">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Pedidos de Lavanderia</CardTitle>
            </CardHeader>
            <CardContent><LaundryTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companions">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Acompanhantes Registrados</CardTitle>
            </CardHeader>
            <CardContent><CompanionsTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
