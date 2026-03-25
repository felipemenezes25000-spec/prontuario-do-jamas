import { useState } from 'react';
import {
  Cpu,
  Wrench,
  AlertTriangle,
  CalendarCheck,
  Plus,
  CheckCircle2,
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
  useEquipmentList,
  useMaintenanceEvents,
  useMaintenanceCalendar,
  useOverdueAlerts,
  useCreateMaintenanceEvent,
  type EquipmentStatus,
  type MaintenanceType,
  type MaintenanceEvent,
} from '@/services/equipment.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const EQ_STATUS_LABEL: Record<EquipmentStatus, string> = {
  ACTIVE: 'Ativo',
  MAINTENANCE: 'Em Manutenção',
  CALIBRATION_EXPIRED: 'Calibração Vencida',
  DECOMMISSIONED: 'Desativado',
};

const EQ_STATUS_CLASS: Record<EquipmentStatus, string> = {
  ACTIVE: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  MAINTENANCE: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  CALIBRATION_EXPIRED: 'bg-orange-900/40 text-orange-300 border-orange-700',
  DECOMMISSIONED: 'bg-gray-800 text-gray-400 border-gray-600',
};

const MAINT_STATUS_CLASS: Record<MaintenanceEvent['status'], string> = {
  SCHEDULED: 'bg-blue-900/40 text-blue-300 border-blue-700',
  IN_PROGRESS: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  COMPLETED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  OVERDUE: 'bg-red-900/40 text-red-300 border-red-700',
};

const MAINT_STATUS_LABEL: Record<MaintenanceEvent['status'], string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  OVERDUE: 'Atrasada',
};

const MAINT_TYPE_LABEL: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
  CALIBRATION: 'Calibração',
};

// ─── Schedule Maintenance Dialog ─────────────────────────────────────────────

function ScheduleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: eqData } = useEquipmentList();
  const create = useCreateMaintenanceEvent();

  const [form, setForm] = useState({
    equipmentId: '',
    type: 'PREVENTIVE' as MaintenanceType,
    description: '',
    scheduledDate: '',
    technicianName: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { ...form, equipmentName: eqData?.data.find((eq) => eq.id === form.equipmentId)?.name },
      {
        onSuccess: () => {
          toast.success('Manutenção agendada');
          onClose();
          setForm({ equipmentId: '', type: 'PREVENTIVE', description: '', scheduledDate: '', technicianName: '' });
        },
        onError: () => toast.error('Erro ao agendar manutenção'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Agendar Manutenção</DialogTitle>
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
              <Label className="text-gray-300">Data Agendada</Label>
              <Input
                type="date"
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.scheduledDate}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Técnico Responsável</Label>
            <Input
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.technicianName}
              onChange={(e) => setForm((f) => ({ ...f, technicianName: e.target.value }))}
            />
          </div>

          <div>
            <Label className="text-gray-300">Descrição</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={create.isPending}>
              {create.isPending ? 'Agendando…' : 'Agendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab() {
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | undefined>();
  const { data, isLoading } = useEquipmentList({ status: statusFilter });
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

// ─── Maintenance Tab ─────────────────────────────────────────────────────────

function MaintenanceTab({ onSchedule }: { onSchedule: () => void }) {
  const { data, isLoading } = useMaintenanceEvents();
  const events = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onSchedule}>
          <Plus className="w-4 h-4 mr-2" /> Agendar Manutenção
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma manutenção agendada.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Equipamento</TableHead>
              <TableHead className="text-gray-400">Tipo</TableHead>
              <TableHead className="text-gray-400">Descrição</TableHead>
              <TableHead className="text-gray-400">Técnico</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((ev) => (
              <TableRow key={ev.id} className="border-gray-700">
                <TableCell className="text-white">{ev.equipmentName ?? ev.equipmentId}</TableCell>
                <TableCell>
                  <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                    {MAINT_TYPE_LABEL[ev.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{ev.description}</TableCell>
                <TableCell className="text-gray-300 text-sm">{ev.technicianName ?? '—'}</TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(ev.scheduledDate).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', MAINT_STATUS_CLASS[ev.status])}>
                    {MAINT_STATUS_LABEL[ev.status]}
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

// ─── Calibration Tab ─────────────────────────────────────────────────────────

function CalibrationTab() {
  const today = new Date().toISOString().slice(0, 7);
  const { data: calendar = [], isLoading } = useMaintenanceCalendar(today);
  const calibrations = calendar.filter((e) => e.type === 'CALIBRATION');

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : calibrations.length === 0 ? (
        <div className="text-center py-12">
          <CalendarCheck className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma calibração agendada para este mês.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {calibrations.map((cal) => (
            <Card key={cal.id} className="bg-gray-900 border-gray-700">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{cal.equipmentName}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(cal.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Badge className={cn('text-xs border', MAINT_STATUS_CLASS[cal.status])}>
                  {MAINT_STATUS_LABEL[cal.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Alerts Tab ──────────────────────────────────────────────────────────────

function AlertsTab() {
  const { data, isLoading } = useOverdueAlerts();
  const alerts = data?.data ?? [];

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="text-gray-400">Nenhum alerta de atraso. Tudo em dia!</p>
        </div>
      ) : (
        alerts.map((alert) => (
          <Card key={alert.id} className="bg-red-950/20 border-red-800">
            <CardContent className="pt-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-medium">{alert.equipmentName}</p>
                <p className="text-gray-300 text-sm">{alert.description}</p>
                <p className="text-red-400 text-xs mt-1">
                  Venceu em: {new Date(alert.scheduledDate).toLocaleDateString('pt-BR')}
                  {alert.technicianName && ` · Técnico: ${alert.technicianName}`}
                </p>
              </div>
              <Badge className="text-xs border bg-red-900/40 text-red-300 border-red-700">
                {MAINT_TYPE_LABEL[alert.type]}
              </Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EquipmentPage() {
  const [tab, setTab] = useState('inventory');
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Equipamentos</h1>
          <p className="text-sm text-gray-400">Inventário, manutenção preventiva e calibração</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="inventory" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Cpu className="w-4 h-4 mr-2" /> Inventário
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Wrench className="w-4 h-4 mr-2" /> Manutenção Preventiva
          </TabsTrigger>
          <TabsTrigger value="calibration" className="data-[state=active]:bg-gray-700 text-gray-300">
            <CalendarCheck className="w-4 h-4 mr-2" /> Calibração
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-gray-700 text-gray-300">
            <AlertTriangle className="w-4 h-4 mr-2" /> Alertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Inventário de Equipamentos</CardTitle>
            </CardHeader>
            <CardContent><InventoryTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Manutenções Preventivas</CardTitle>
            </CardHeader>
            <CardContent><MaintenanceTab onSchedule={() => setScheduleOpen(true)} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calibration">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Calendário de Calibração — {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle>
            </CardHeader>
            <CardContent><CalibrationTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Alertas de Manutenção Atrasada
              </CardTitle>
            </CardHeader>
            <CardContent><AlertsTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}
