import { useState } from 'react';
import {
  Shield,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Send,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  usePriorAuthRequests,
  useInsuranceProviders,
  useCreatePriorAuth,
  useSubmitPriorAuth,
  type PriorAuthRequest,
  type PriorAuthStatus,
  type CreatePriorAuthPayload,
} from '@/services/billing-prior-auth.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<PriorAuthStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Submetida',
  IN_REVIEW: 'Em Análise',
  APPROVED: 'Aprovada',
  DENIED: 'Negada',
  EXPIRED: 'Expirada',
};

const STATUS_CLASS: Record<PriorAuthStatus, string> = {
  DRAFT: 'bg-gray-800 text-gray-300 border-gray-600',
  SUBMITTED: 'bg-blue-900/40 text-blue-300 border-blue-700',
  IN_REVIEW: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  APPROVED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  DENIED: 'bg-red-900/40 text-red-300 border-red-700',
  EXPIRED: 'bg-orange-900/40 text-orange-300 border-orange-700',
};

const URGENCY_LABEL: Record<string, string> = {
  ROUTINE: 'Eletivo',
  URGENT: 'Urgente',
  EMERGENCY: 'Emergência',
};

// ─── Timeline ───────────────────────────────────────────────────────────────

function TimelinePanel({ req, onClose }: { req: PriorAuthRequest; onClose: () => void }) {
  const submit = useSubmitPriorAuth();

  return (
    <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
      <DialogHeader>
        <DialogTitle className="text-white">Autorização — {req.patientName}</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <span className="text-gray-400">Operadora:</span>{' '}
          <span className="text-white">{req.insuranceProvider}</span>
        </div>
        <div>
          <span className="text-gray-400">Procedimento:</span>{' '}
          <span className="text-white">{req.procedureCode}</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-400">Descrição:</span>{' '}
          <span className="text-white">{req.procedureDescription}</span>
        </div>
        {req.authorizationNumber && (
          <div className="col-span-2">
            <span className="text-gray-400">Nº Autorização:</span>{' '}
            <span className="text-emerald-400 font-mono">{req.authorizationNumber}</span>
          </div>
        )}
        {req.denialReason && (
          <div className="col-span-2 p-3 rounded bg-red-900/20 border border-red-800">
            <span className="text-red-400 font-medium">Motivo da Negativa: </span>
            <span className="text-red-300">{req.denialReason}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Histórico</h4>
        {req.timeline.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma movimentação registrada.</p>
        ) : (
          <ol className="relative border-l border-gray-700 space-y-4 pl-5">
            {req.timeline.map((entry) => (
              <li key={entry.id}>
                <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-gray-900" />
                <p className="text-white text-sm font-medium">{entry.description}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {new Date(entry.createdAt).toLocaleString('pt-BR')} · {entry.createdBy}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex justify-between mt-4">
        {req.status === 'DRAFT' && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() =>
              submit.mutate(req.id, {
                onSuccess: () => {
                  toast.success('Solicitação submetida à operadora');
                  onClose();
                },
              })
            }
            disabled={submit.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {submit.isPending ? 'Submetendo…' : 'Submeter à Operadora'}
          </Button>
        )}
        <Button
          variant="outline"
          className="border-gray-600 text-gray-300 ml-auto"
          onClick={onClose}
        >
          Fechar
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Create Dialog ───────────────────────────────────────────────────────────

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: insurers = [] } = useInsuranceProviders();
  const create = useCreatePriorAuth();

  const [form, setForm] = useState<CreatePriorAuthPayload>({
    patientId: '',
    insuranceProvider: '',
    procedureCode: '',
    procedureDescription: '',
    justification: '',
    urgency: 'ROUTINE',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(form, {
      onSuccess: () => {
        toast.success('Solicitação criada com sucesso');
        onClose();
        setForm({
          patientId: '',
          insuranceProvider: '',
          procedureCode: '',
          procedureDescription: '',
          justification: '',
          urgency: 'ROUTINE',
        });
      },
      onError: () => toast.error('Erro ao criar solicitação'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Nova Solicitação de Autorização</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">ID do Paciente</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.patientId}
              onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              placeholder="UUID do paciente"
            />
          </div>

          <div>
            <Label className="text-gray-300">Operadora</Label>
            <Select
              value={form.insuranceProvider}
              onValueChange={(v) => setForm((f) => ({ ...f, insuranceProvider: v }))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue placeholder="Selecione a operadora" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {insurers.map((ins) => (
                  <SelectItem key={ins} value={ins} className="text-white">
                    {ins}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300">Código do Procedimento</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.procedureCode}
                onChange={(e) => setForm((f) => ({ ...f, procedureCode: e.target.value }))}
                placeholder="Ex.: 31.009.01"
              />
            </div>
            <div>
              <Label className="text-gray-300">Urgência</Label>
              <Select
                value={form.urgency}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, urgency: v as CreatePriorAuthPayload['urgency'] }))
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {(['ROUTINE', 'URGENT', 'EMERGENCY'] as const).map((u) => (
                    <SelectItem key={u} value={u} className="text-white">
                      {URGENCY_LABEL[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Descrição do Procedimento</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.procedureDescription}
              onChange={(e) => setForm((f) => ({ ...f, procedureDescription: e.target.value }))}
            />
          </div>

          <div>
            <Label className="text-gray-300">Justificativa Clínica</Label>
            <Textarea
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              rows={3}
              value={form.justification}
              onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-gray-600 text-gray-300"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={create.isPending}
            >
              {create.isPending ? 'Criando…' : 'Criar Solicitação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Requests Table ───────────────────────────────────────────────────────────

function RequestsTable({ statuses }: { statuses: PriorAuthStatus[] }) {
  const [selected, setSelected] = useState<PriorAuthRequest | null>(null);

  const { data: requests = [], isLoading } = usePriorAuthRequests({
    status: statuses.length === 1 ? statuses[0] : undefined,
  });

  const filtered = requests.filter((r) => statuses.includes(r.status));

  return (
    <>
      {isLoading ? (
        <p className="text-center text-gray-400 py-8">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma solicitação neste status.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Paciente</TableHead>
              <TableHead className="text-gray-400">Operadora</TableHead>
              <TableHead className="text-gray-400">Procedimento</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((req) => (
              <TableRow key={req.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-medium">{req.patientName}</TableCell>
                <TableCell className="text-gray-300">{req.insuranceProvider}</TableCell>
                <TableCell className="text-gray-300 text-sm">
                  <span className="font-mono text-xs">{req.procedureCode}</span> —{' '}
                  {req.procedureDescription}
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', STATUS_CLASS[req.status])}>
                    {STATUS_LABEL[req.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-emerald-400 hover:bg-emerald-900/30"
                    onClick={() => setSelected(req)}
                  >
                    Detalhes <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && <TimelinePanel req={selected} onClose={() => setSelected(null)} />}
      </Dialog>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PriorAuthPage() {
  const [tab, setTab] = useState('requests');
  const [createOpen, setCreateOpen] = useState(false);

  const tabConfig: Record<string, PriorAuthStatus[]> = {
    requests: ['DRAFT', 'SUBMITTED'],
    review: ['IN_REVIEW'],
    approved: ['APPROVED'],
    denied: ['DENIED', 'EXPIRED'],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Autorização Prévia</h1>
            <p className="text-sm text-gray-400">Solicitações de autorização junto às operadoras</p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="requests" className="data-[state=active]:bg-gray-700 text-gray-300">
            <FileText className="w-4 h-4 mr-2" />
            Solicitações
          </TabsTrigger>
          <TabsTrigger value="review" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Clock className="w-4 h-4 mr-2" />
            Em Análise
          </TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:bg-gray-700 text-gray-300">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Aprovadas
          </TabsTrigger>
          <TabsTrigger value="denied" className="data-[state=active]:bg-gray-700 text-gray-300">
            <XCircle className="w-4 h-4 mr-2" />
            Negadas
          </TabsTrigger>
        </TabsList>

        {Object.entries(tabConfig).map(([key, statuses]) => (
          <TabsContent key={key} value={key}>
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">
                  {key === 'requests' && 'Solicitações Abertas'}
                  {key === 'review' && 'Em Análise pela Operadora'}
                  {key === 'approved' && 'Autorizações Aprovadas'}
                  {key === 'denied' && 'Negadas / Expiradas'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RequestsTable statuses={statuses} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
