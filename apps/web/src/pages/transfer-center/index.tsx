import { useState } from 'react';
import {
  ArrowRightLeft,
  Plus,
  BedDouble,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Ambulance,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  useTransferRequests,
  useAvailableBeds,
  useTransferStats,
  useCreateTransferRequest,
  useRespondTransfer,
  type TransferStatus,
  type TransferRequest,
  type AvailableBed,
} from '@/services/transfer-center.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TransferStatus, string> = {
  REQUESTED: 'Solicitada',
  ACCEPTED: 'Aceita',
  REJECTED: 'Recusada',
  IN_TRANSIT: 'Em Trânsito',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_CLASS: Record<TransferStatus, string> = {
  REQUESTED: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  ACCEPTED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  REJECTED: 'bg-red-900/40 text-red-300 border-red-700',
  IN_TRANSIT: 'bg-blue-900/40 text-blue-300 border-blue-700',
  COMPLETED: 'bg-gray-800 text-gray-300 border-gray-600',
  CANCELLED: 'bg-gray-800 text-gray-400 border-gray-600',
};

const URGENCY_LABEL: Record<TransferRequest['urgency'], string> = {
  ELECTIVE: 'Eletivo',
  URGENT: 'Urgente',
  EMERGENCY: 'Emergência',
};

const URGENCY_CLASS: Record<TransferRequest['urgency'], string> = {
  ELECTIVE: 'bg-gray-800 text-gray-300 border-gray-600',
  URGENT: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  EMERGENCY: 'bg-red-900/40 text-red-300 border-red-700',
};

const BED_TYPE_LABEL: Record<AvailableBed['bedType'], string> = {
  WARD: 'Enfermaria',
  ICU: 'UTI',
  SEMI_ICU: 'Semi-UTI',
  ISOLATION: 'Isolamento',
  PEDIATRIC: 'Pediátrico',
};

// ─── Create Transfer Dialog ───────────────────────────────────────────────────

function CreateTransferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateTransferRequest();
  const [form, setForm] = useState({
    patientId: '',
    originFacility: '',
    originUnit: '',
    destinationFacility: '',
    destinationUnit: '',
    clinicalJustification: '',
    urgency: 'ELECTIVE' as TransferRequest['urgency'],
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        patientId: form.patientId,
        originFacility: form.originFacility,
        originUnit: form.originUnit || undefined,
        destinationFacility: form.destinationFacility,
        destinationUnit: form.destinationUnit || undefined,
        clinicalJustification: form.clinicalJustification,
        urgency: form.urgency,
      },
      {
        onSuccess: () => {
          toast.success('Solicitação de transferência criada');
          onClose();
          setForm({ patientId: '', originFacility: '', originUnit: '', destinationFacility: '', destinationUnit: '', clinicalJustification: '', urgency: 'ELECTIVE' });
        },
        onError: () => toast.error('Erro ao criar solicitação'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Nova Solicitação de Transferência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300">ID do Paciente</Label>
              <Input required className="bg-gray-800 border-gray-700 text-white mt-1" value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))} />
            </div>
            <div>
              <Label className="text-gray-300">Urgência</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v as TransferRequest['urgency'] }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {(['ELECTIVE', 'URGENT', 'EMERGENCY'] as const).map((u) => (
                    <SelectItem key={u} value={u} className="text-white">{URGENCY_LABEL[u]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300">Unidade de Origem</Label>
              <Input required className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="Hospital / Clínica" value={form.originFacility} onChange={(e) => setForm((f) => ({ ...f, originFacility: e.target.value }))} />
            </div>
            <div>
              <Label className="text-gray-300">Setor de Origem</Label>
              <Input className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="UTI, Enfermaria…" value={form.originUnit} onChange={(e) => setForm((f) => ({ ...f, originUnit: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300">Destino</Label>
              <Input required className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="Hospital de destino" value={form.destinationFacility} onChange={(e) => setForm((f) => ({ ...f, destinationFacility: e.target.value }))} />
            </div>
            <div>
              <Label className="text-gray-300">Setor de Destino</Label>
              <Input className="bg-gray-800 border-gray-700 text-white mt-1" placeholder="UTI, Cirurgia…" value={form.destinationUnit} onChange={(e) => setForm((f) => ({ ...f, destinationUnit: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Justificativa Clínica</Label>
            <Textarea required className="bg-gray-800 border-gray-700 text-white mt-1" rows={3} value={form.clinicalJustification} onChange={(e) => setForm((f) => ({ ...f, clinicalJustification: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={create.isPending}>
              {create.isPending ? 'Criando…' : 'Criar Solicitação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Respond Dialog ───────────────────────────────────────────────────────────

function RespondDialog({
  request,
  action,
  onClose,
}: {
  request: TransferRequest;
  action: 'ACCEPT' | 'REJECT';
  onClose: () => void;
}) {
  const respond = useRespondTransfer();
  const [reason, setReason] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    respond.mutate(
      { id: request.id, action, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success(action === 'ACCEPT' ? 'Transferência aceita' : 'Transferência recusada');
          onClose();
        },
      },
    );
  }

  return (
    <DialogContent className="max-w-md bg-gray-900 border-gray-700">
      <DialogHeader>
        <DialogTitle className="text-white">
          {action === 'ACCEPT' ? 'Aceitar' : 'Recusar'} Transferência — {request.patientName}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded bg-gray-800 text-sm text-gray-300">
          <p><span className="text-gray-400">Origem:</span> {request.originFacility}{request.originUnit ? ` / ${request.originUnit}` : ''}</p>
          <p><span className="text-gray-400">Destino:</span> {request.destinationFacility}{request.destinationUnit ? ` / ${request.destinationUnit}` : ''}</p>
          <p className="mt-2 text-gray-300">{request.clinicalJustification}</p>
        </div>

        {action === 'REJECT' && (
          <div>
            <Label className="text-gray-300">Motivo da Recusa</Label>
            <Textarea required className="bg-gray-800 border-gray-700 text-white mt-1" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            className={cn(action === 'ACCEPT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700', 'text-white')}
            disabled={respond.isPending}
          >
            {respond.isPending ? 'Processando…' : action === 'ACCEPT' ? 'Confirmar Aceite' : 'Confirmar Recusa'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────

function RequestsTab({ statuses, onNew }: { statuses?: TransferStatus[]; onNew?: () => void }) {
  const { data, isLoading } = useTransferRequests();
  const [selected, setSelected] = useState<{ req: TransferRequest; action: 'ACCEPT' | 'REJECT' } | null>(null);

  const requests = (data?.data ?? []).filter((r) =>
    statuses ? statuses.includes(r.status) : true,
  );

  return (
    <>
      {onNew && (
        <div className="flex justify-end mb-4">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onNew}>
            <Plus className="w-4 h-4 mr-2" /> Nova Solicitação
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <ArrowRightLeft className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma transferência neste status.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Paciente</TableHead>
              <TableHead className="text-gray-400">Origem → Destino</TableHead>
              <TableHead className="text-gray-400">Urgência</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-medium">{req.patientName}</TableCell>
                <TableCell className="text-gray-300 text-sm">
                  <span>{req.originFacility}</span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span>{req.destinationFacility}</span>
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', URGENCY_CLASS[req.urgency])}>
                    {URGENCY_LABEL[req.urgency]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', STATUS_CLASS[req.status])}>
                    {STATUS_LABEL[req.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(req.requestedAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  {req.status === 'REQUESTED' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-400 hover:bg-emerald-900/30 h-7 px-2"
                        onClick={() => setSelected({ req, action: 'ACCEPT' })}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-900/30 h-7 px-2"
                        onClick={() => setSelected({ req, action: 'REJECT' })}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <RespondDialog
            request={selected.req}
            action={selected.action}
            onClose={() => setSelected(null)}
          />
        )}
      </Dialog>
    </>
  );
}

// ─── Beds Tab ─────────────────────────────────────────────────────────────────

function BedsTab() {
  const { data: beds = [], isLoading } = useAvailableBeds();
  const available = beds.filter((b) => b.isAvailable);

  const bedTypeClass: Record<AvailableBed['bedType'], string> = {
    WARD: 'bg-gray-800 text-gray-300 border-gray-600',
    ICU: 'bg-red-900/40 text-red-300 border-red-700',
    SEMI_ICU: 'bg-orange-900/40 text-orange-300 border-orange-700',
    ISOLATION: 'bg-purple-900/40 text-purple-300 border-purple-700',
    PEDIATRIC: 'bg-blue-900/40 text-blue-300 border-blue-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BedDouble className="w-5 h-5 text-emerald-400" />
        <span className="text-white font-medium">{available.length} leito(s) disponível(is)</span>
        <span className="text-gray-500 text-sm">de {beds.length} total</span>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : available.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-3" />
          <p className="text-gray-400">Nenhum leito disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {available.map((bed, i) => (
            <Card key={i} className="bg-gray-900 border-gray-700">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold">Leito {bed.bedNumber}</p>
                    <p className="text-gray-400 text-sm">{bed.unit}</p>
                  </div>
                  <Badge className={cn('text-xs border', bedTypeClass[bed.bedType])}>
                    {BED_TYPE_LABEL[bed.bedType]}
                  </Badge>
                </div>
                <p className="text-gray-500 text-xs">{bed.facilityName}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab() {
  const { data: stats, isLoading } = useTransferStats();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando estatísticas…</p>;
  if (!stats) return <p className="text-gray-400 text-center py-8">Sem dados disponíveis.</p>;

  const cards = [
    { label: 'Total Hoje', value: stats.todayTotal, icon: ArrowRightLeft, color: 'text-blue-400' },
    { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
    { label: 'Concluídas', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Recusadas', value: stats.rejected, icon: XCircle, color: 'text-red-400' },
    { label: 'Em Trânsito', value: stats.inTransit, icon: Ambulance, color: 'text-purple-400' },
    { label: 'Tempo Médio de Resposta', value: `${stats.avgResponseTimeMinutes.toFixed(0)} min`, icon: BarChart3, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-3">
            <Icon className={cn('w-5 h-5 mb-1', color)} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TransferCenterPage() {
  const [tab, setTab] = useState('requests');
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Central de Transferências</h1>
            <p className="text-sm text-gray-400">Solicitações, leitos disponíveis e estatísticas</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Transferência
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="requests" className="data-[state=active]:bg-gray-700 text-gray-300">
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Solicitações
          </TabsTrigger>
          <TabsTrigger value="beds" className="data-[state=active]:bg-gray-700 text-gray-300">
            <BedDouble className="w-4 h-4 mr-2" /> Leitos Disponíveis
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-gray-700 text-gray-300">
            <BarChart3 className="w-4 h-4 mr-2" /> Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Todas as Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beds">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-emerald-400" />
                Leitos Disponíveis para Recepção
              </CardTitle>
            </CardHeader>
            <CardContent><BedsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Estatísticas do Dia</CardTitle>
            </CardHeader>
            <CardContent><StatsTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateTransferDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
