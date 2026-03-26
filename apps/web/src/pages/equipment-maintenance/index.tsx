import { useState } from 'react';
import {
  Wrench,
  Cpu,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  CalendarCheck,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useEquipmentMaintenanceList,
  useWorkOrders,
  usePreventiveSchedule,
  useEquipmentIndicators,
  useCreateWorkOrder,
  useUpdateWorkOrderStatus,
  type EquipmentStatus,
  type WorkOrderStatus,
  type MaintenanceType,
} from '@/services/equipment-maintenance.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const EQ_STATUS_LABEL: Record<EquipmentStatus, string> = {
  OPERATIONAL: 'Operacional',
  MAINTENANCE: 'Em Manutenção',
  CALIBRATION: 'Calibração',
  OUT_OF_SERVICE: 'Fora de Serviço',
};

const EQ_STATUS_CLASS: Record<EquipmentStatus, string> = {
  OPERATIONAL: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  MAINTENANCE: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  CALIBRATION: 'bg-blue-900/40 text-blue-300 border-blue-700',
  OUT_OF_SERVICE: 'bg-red-900/40 text-red-300 border-red-700',
};

const WO_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const WO_STATUS_CLASS: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-blue-900/40 text-blue-300 border-blue-700',
  IN_PROGRESS: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  COMPLETED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  CANCELLED: 'bg-gray-800 text-gray-400 border-gray-600',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const PRIORITY_CLASS: Record<string, string> = {
  LOW: 'bg-gray-800 text-gray-300 border-gray-600',
  MEDIUM: 'bg-blue-900/40 text-blue-300 border-blue-700',
  HIGH: 'bg-orange-900/40 text-orange-300 border-orange-700',
  CRITICAL: 'bg-red-900/40 text-red-300 border-red-700',
};

const MAINT_TYPE_LABEL: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
  CALIBRATION: 'Calibração',
};

// ─── New Work Order Dialog ──────────────────────────────────────────────────

function NewWorkOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: eqData } = useEquipmentMaintenanceList();
  const create = useCreateWorkOrder();

  const [form, setForm] = useState({
    equipmentId: '',
    type: 'CORRECTIVE' as MaintenanceType,
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    assignedTo: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { ...form, assignedTo: form.assignedTo || undefined },
      {
        onSuccess: () => {
          toast.success('Ordem de serviço criada.');
          onClose();
          setForm({ equipmentId: '', type: 'CORRECTIVE', description: '', priority: 'MEDIUM', assignedTo: '' });
        },
        onError: () => toast.error('Erro ao criar ordem de serviço.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Equipamento</Label>
            <Select value={form.equipmentId} onValueChange={(v) => setForm((f) => ({ ...f, equipmentId: v }))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue placeholder="Selecionar equipamento" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {eqData?.data.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id} className="text-white">
                    {eq.name} — {eq.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as MaintenanceType }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {(Object.keys(MAINT_TYPE_LABEL) as MaintenanceType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-white">{MAINT_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as typeof form.priority }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {(Object.keys(PRIORITY_LABEL)).map((p) => (
                    <SelectItem key={p} value={p} className="text-white">{PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Responsável</Label>
            <Input
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.assignedTo}
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
              placeholder="Nome do técnico (opcional)"
            />
          </div>

          <div>
            <Label className="text-gray-300">Descrição</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descreva o problema ou serviço"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={create.isPending}>
              {create.isPending ? 'Criando…' : 'Criar OS'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Indicators Tab ─────────────────────────────────────────────────────────

function IndicatorsTab() {
  const { data: indicators, isLoading } = useEquipmentIndicators();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando indicadores…</p>;
  if (!indicators) return <p className="text-gray-400 text-center py-8">Sem dados de indicadores.</p>;

  const cards = [
    { label: 'Total de Equipamentos', value: indicators.totalEquipment, icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-900/40' },
    { label: 'Operacionais', value: indicators.operational, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/40' },
    { label: 'Em Manutenção', value: indicators.inMaintenance, icon: Wrench, color: 'text-yellow-400', bg: 'bg-yellow-900/40' },
    { label: 'Fora de Serviço', value: indicators.outOfService, icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/40' },
    { label: 'MTBF Médio (h)', value: indicators.avgMtbfHours.toLocaleString('pt-BR'), icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-900/40' },
    { label: 'Disponibilidade', value: `${indicators.availabilityPercent.toFixed(1)}%`, icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-900/40' },
    { label: 'OS Abertas', value: indicators.openWorkOrders, icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-900/40' },
    { label: 'Manutenções Atrasadas', value: indicators.overdueMaintenances, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/40' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.bg)}>
                <c.icon className={cn('w-5 h-5', c.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{c.value}</p>
                <p className="text-xs text-gray-400">{c.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Equipment List Tab ─────────────────────────────────────────────────────

function EquipmentListTab() {
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | undefined>();
  const { data, isLoading } = useEquipmentMaintenanceList({ status: statusFilter });
  const equipment = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter ?? 'ALL'}
          onValueChange={(v) => setStatusFilter(v === 'ALL' ? undefined : (v as EquipmentStatus))}
        >
          <SelectTrigger className="w-52 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="ALL" className="text-white">Todos os status</SelectItem>
            {(Object.keys(EQ_STATUS_LABEL) as EquipmentStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-white">{EQ_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-gray-400 text-sm">{data?.total ?? 0} equipamentos</span>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : equipment.length === 0 ? (
        <div className="text-center py-12">
          <Cpu className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum equipamento encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Nome / Modelo</TableHead>
              <TableHead className="text-gray-400">Fabricante</TableHead>
              <TableHead className="text-gray-400">Setor</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Próx. Manutenção</TableHead>
              <TableHead className="text-gray-400">Próx. Calibração</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((eq) => (
              <TableRow key={eq.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell>
                  <p className="text-white font-medium">{eq.name}</p>
                  <p className="text-gray-400 text-xs">{eq.model} · {eq.serialNumber}</p>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{eq.manufacturer}</TableCell>
                <TableCell className="text-gray-300 text-sm">{eq.department}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', EQ_STATUS_CLASS[eq.status])}>
                    {EQ_STATUS_LABEL[eq.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {eq.nextMaintenanceAt ? new Date(eq.nextMaintenanceAt).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {eq.nextCalibrationAt ? new Date(eq.nextCalibrationAt).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Work Orders Tab ────────────────────────────────────────────────────────

function WorkOrdersTab({ onNew }: { onNew: () => void }) {
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | undefined>();
  const { data, isLoading } = useWorkOrders({ status: statusFilter });
  const updateStatus = useUpdateWorkOrderStatus();
  const orders = data?.data ?? [];

  function handleStatusChange(id: string, status: WorkOrderStatus) {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => toast.success('Status atualizado.'),
        onError: () => toast.error('Erro ao atualizar status.'),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          value={statusFilter ?? 'ALL'}
          onValueChange={(v) => setStatusFilter(v === 'ALL' ? undefined : (v as WorkOrderStatus))}
        >
          <SelectTrigger className="w-52 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="ALL" className="text-white">Todas</SelectItem>
            {(Object.keys(WO_STATUS_LABEL) as WorkOrderStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-white">{WO_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onNew}>
          <Plus className="w-4 h-4 mr-2" /> Nova OS
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma ordem de serviço encontrada.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Equipamento</TableHead>
              <TableHead className="text-gray-400">Tipo</TableHead>
              <TableHead className="text-gray-400">Descrição</TableHead>
              <TableHead className="text-gray-400">Prioridade</TableHead>
              <TableHead className="text-gray-400">Responsável</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((wo) => (
              <TableRow key={wo.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-medium">{wo.equipmentName}</TableCell>
                <TableCell>
                  <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                    {MAINT_TYPE_LABEL[wo.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm max-w-[200px] truncate">{wo.description}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', PRIORITY_CLASS[wo.priority])}>
                    {PRIORITY_LABEL[wo.priority]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{wo.assignedTo ?? '—'}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', WO_STATUS_CLASS[wo.status])}>
                    {WO_STATUS_LABEL[wo.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {wo.status === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-700 text-yellow-300 hover:bg-yellow-900/30 text-xs"
                      onClick={() => handleStatusChange(wo.id, 'IN_PROGRESS')}
                    >
                      Iniciar
                    </Button>
                  )}
                  {wo.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/30 text-xs"
                      onClick={() => handleStatusChange(wo.id, 'COMPLETED')}
                    >
                      Concluir
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Preventive Schedule Tab ────────────────────────────────────────────────

function ScheduleTab() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: schedule = [], isLoading } = usePreventiveSchedule(currentMonth);

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Calendário de manutenções preventivas — {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
      </p>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : schedule.length === 0 ? (
        <div className="text-center py-12">
          <CalendarCheck className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma manutenção preventiva agendada para este mês.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {schedule.map((item) => (
            <Card key={item.id} className="bg-gray-900 border-gray-700">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{item.equipmentName}</p>
                  <p className="text-gray-400 text-sm">
                    {MAINT_TYPE_LABEL[item.type]} — {new Date(item.scheduledDate).toLocaleDateString('pt-BR')}
                  </p>
                  {item.technicianName && (
                    <p className="text-gray-500 text-xs mt-1">Técnico: {item.technicianName}</p>
                  )}
                </div>
                <Badge className={cn('text-xs border', WO_STATUS_CLASS[item.status])}>
                  {WO_STATUS_LABEL[item.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EquipmentMaintenancePage() {
  const [tab, setTab] = useState('indicators');
  const [woDialogOpen, setWoDialogOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-900/40 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Manutenção de Equipamentos</h1>
          <p className="text-sm text-gray-400">Gestão de equipamentos, ordens de serviço e indicadores</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="indicators" className="data-[state=active]:bg-gray-700 text-gray-300">
            <BarChart3 className="w-4 h-4 mr-2" /> Indicadores
          </TabsTrigger>
          <TabsTrigger value="equipment" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Cpu className="w-4 h-4 mr-2" /> Equipamentos
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Wrench className="w-4 h-4 mr-2" /> Ordens de Serviço
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-gray-700 text-gray-300">
            <CalendarCheck className="w-4 h-4 mr-2" /> Preventivas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicators">
          <IndicatorsTab />
        </TabsContent>

        <TabsContent value="equipment">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Lista de Equipamentos</CardTitle>
            </CardHeader>
            <CardContent><EquipmentListTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-orders">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Ordens de Serviço</CardTitle>
            </CardHeader>
            <CardContent><WorkOrdersTab onNew={() => setWoDialogOpen(true)} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Manutenções Preventivas</CardTitle>
            </CardHeader>
            <CardContent><ScheduleTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewWorkOrderDialog open={woDialogOpen} onClose={() => setWoDialogOpen(false)} />
    </div>
  );
}
