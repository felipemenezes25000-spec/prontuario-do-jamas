import { useState } from 'react';
import {
  Ticket,
  Monitor,
  BarChart3,
  Plus,
  Bell,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Settings,
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
  useQueueTickets,
  useQueueDisplay,
  useQueueMetrics,
  useIssueTicket,
  useCallNext,
  useCompleteTicket,
  type TicketCategory,
  type QueueTicket,
} from '@/services/queue-management.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  GENERAL: 'Geral',
  PRIORITY: 'Prioritário',
  EMERGENCY: 'Emergência',
  RETURN: 'Retorno',
  EXAM: 'Exame',
};

const CATEGORY_CLASS: Record<TicketCategory, string> = {
  GENERAL: 'bg-gray-800 text-gray-300 border-gray-600',
  PRIORITY: 'bg-blue-900/40 text-blue-300 border-blue-700',
  EMERGENCY: 'bg-red-900/40 text-red-300 border-red-700',
  RETURN: 'bg-purple-900/40 text-purple-300 border-purple-700',
  EXAM: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
};

// ─── Issue Ticket Dialog ──────────────────────────────────────────────────────

function IssueDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const issue = useIssueTicket();
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [patientName, setPatientName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    issue.mutate(
      { category, patientName: patientName || undefined },
      {
        onSuccess: (ticket: QueueTicket) => {
          toast.success(`Senha emitida: ${ticket.ticketNumber}`);
          onClose();
          setPatientName('');
          setCategory('GENERAL');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Emitir Senha</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                  <SelectItem key={c} value={c} className="text-white">
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300">Nome do Paciente (opcional)</Label>
            <Input
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Para identificação"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={issue.isPending}>
              {issue.isPending ? 'Emitindo…' : 'Emitir Senha'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Panel Tab (Painel de Senhas) ─────────────────────────────────────────────

function PanelTab() {
  const { data: display, isLoading: loadingDisplay } = useQueueDisplay();
  const { data: ticketsData, isLoading: loadingTickets } = useQueueTickets();
  const callNext = useCallNext();
  const complete = useCompleteTicket();
  const [issueOpen, setIssueOpen] = useState(false);
  const [counter, setCounter] = useState('Guichê 1');

  const tickets = ticketsData?.data ?? [];
  const waiting = tickets.filter((t) => t.status === 'WAITING');

  return (
    <div className="space-y-6">
      {/* TV Display Simulation */}
      <Card className="bg-gray-950 border-emerald-800">
        <CardContent className="pt-6 pb-6">
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Senha Atual</p>
            {loadingDisplay ? (
              <p className="text-gray-500 text-6xl font-bold">—</p>
            ) : display?.currentTicket ? (
              <>
                <p className="text-emerald-400 text-7xl font-black font-mono tracking-wider">
                  {display.currentTicket.ticketNumber}
                </p>
                <p className="text-gray-300 text-lg mt-2">
                  {display.currentTicket.counter ?? 'Guichê'}
                </p>
              </>
            ) : (
              <p className="text-gray-600 text-5xl font-bold">SEM CHAMADA</p>
            )}
          </div>

          {display?.nextTickets && display.nextTickets.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide text-center mb-3">Próximas Senhas</p>
              <div className="flex justify-center gap-4">
                {display.nextTickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="text-center">
                    <p className="text-gray-300 font-mono font-bold text-xl">{t.ticketNumber}</p>
                    <Badge className={cn('text-xs border mt-1', CATEGORY_CLASS[t.category])}>
                      {CATEGORY_LABEL[t.category]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Counters status */}
          {display?.counters && display.counters.length > 0 && (
            <div className="flex justify-center gap-6 mt-6 pt-6 border-t border-gray-800">
              {display.counters.map((c) => (
                <div key={c.name} className="text-center">
                  <p className="text-gray-400 text-xs mb-1">{c.name}</p>
                  <Badge
                    className={cn(
                      'text-xs border',
                      c.status === 'OPEN'
                        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                        : c.status === 'BREAK'
                          ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700'
                          : 'bg-gray-800 text-gray-400 border-gray-600',
                    )}
                  >
                    {c.status === 'OPEN' ? 'Aberto' : c.status === 'BREAK' ? 'Intervalo' : 'Fechado'}
                  </Badge>
                  {c.currentTicket && (
                    <p className="text-white font-mono text-sm mt-1">{c.currentTicket}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operator controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-gray-300 shrink-0">Guichê:</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white w-32"
            value={counter}
            onChange={(e) => setCounter(e.target.value)}
          />
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={callNext.isPending}
          onClick={() =>
            callNext.mutate(
              { counter },
              { onSuccess: (t: QueueTicket) => toast.success(`Chamando: ${t.ticketNumber}`) },
            )
          }
        >
          <Bell className="w-4 h-4 mr-2" />
          {callNext.isPending ? 'Chamando…' : 'Chamar Próximo'}
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setIssueOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Emitir Senha
        </Button>
      </div>

      {/* Waiting list */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Fila de Espera
            <Badge className="bg-yellow-900/40 text-yellow-300 border border-yellow-700 text-xs ml-2">
              {waiting.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <p className="text-gray-400 text-center py-6">Carregando…</p>
          ) : waiting.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
              <p className="text-gray-400">Fila vazia — sem senhas aguardando.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Senha</TableHead>
                  <TableHead className="text-gray-400">Categoria</TableHead>
                  <TableHead className="text-gray-400">Paciente</TableHead>
                  <TableHead className="text-gray-400">Espera Est.</TableHead>
                  <TableHead className="text-gray-400">Emitida às</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waiting.map((t) => (
                  <TableRow key={t.id} className="border-gray-700">
                    <TableCell className="text-white font-mono font-bold text-lg">{t.ticketNumber}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border', CATEGORY_CLASS[t.category])}>
                        {CATEGORY_LABEL[t.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">{t.patientName ?? '—'}</TableCell>
                    <TableCell className="text-gray-300">
                      {t.estimatedWaitMinutes != null ? `${t.estimatedWaitMinutes} min` : '—'}
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">
                      {new Date(t.issuedAt).toLocaleTimeString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-400 hover:bg-emerald-900/30"
                        disabled={complete.isPending}
                        onClick={() =>
                          complete.mutate(t.id, { onSuccess: () => toast.success(`Senha ${t.ticketNumber} concluída`) })
                        }
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Concluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <IssueDialog open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  );
}

// ─── Metrics Tab ─────────────────────────────────────────────────────────────

function MetricsTab() {
  const { data: metrics, isLoading } = useQueueMetrics();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando métricas…</p>;
  if (!metrics) return <p className="text-gray-400 text-center py-8">Sem dados de métricas.</p>;

  const cards = [
    { label: 'Espera Média', value: `${metrics.averageWaitMinutes.toFixed(0)} min`, icon: Clock, color: 'text-yellow-400' },
    { label: 'Atendimentos/hora', value: metrics.servicesPerHour.toFixed(1), icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Aguardando Agora', value: metrics.totalWaiting, icon: Users, color: 'text-blue-400' },
    { label: 'Atendidos Hoje', value: metrics.totalServedToday, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Não Compareceu', value: metrics.noShowCount, icon: BarChart3, color: 'text-red-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Espera Média por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(metrics.waitTimeByCategory).length === 0 ? (
            <p className="text-gray-400 text-center py-6">Sem dados por categoria.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics.waitTimeByCategory).map(([cat, minutes]) => (
                <div key={cat} className="flex items-center gap-3">
                  <Badge className={cn('text-xs border w-28 justify-center', CATEGORY_CLASS[cat as TicketCategory])}>
                    {CATEGORY_LABEL[cat as TicketCategory] ?? cat}
                  </Badge>
                  <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min((minutes / 60) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-300 text-sm w-16 text-right">{minutes.toFixed(0)} min</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Config Tab ───────────────────────────────────────────────────────────────

function ConfigTab() {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Configuração de Guichês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 text-sm text-center py-8">
          Configurações avançadas de guichês, horários e regras de prioridade disponíveis em breve.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QueueManagementPage() {
  const [tab, setTab] = useState('panel');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-900/40 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Filas</h1>
          <p className="text-sm text-gray-400">Painel de senhas, métricas de espera e configuração</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="panel" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Monitor className="w-4 h-4 mr-2" /> Painel de Senhas
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-gray-700 text-gray-300">
            <BarChart3 className="w-4 h-4 mr-2" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Settings className="w-4 h-4 mr-2" /> Configuração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="panel"><PanelTab /></TabsContent>
        <TabsContent value="metrics"><MetricsTab /></TabsContent>
        <TabsContent value="config"><ConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}
