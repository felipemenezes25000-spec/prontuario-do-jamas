import { useState, useCallback, useEffect } from 'react';
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
  Maximize2,
  Minimize2,
  Volume2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function calculateWaitMinutes(issuedAt: string): number {
  return Math.round((Date.now() - new Date(issuedAt).getTime()) / 60000);
}

function formatWait(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

// ─── Issue Ticket Dialog ──────────────────────────────────────────────────

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
          <DialogDescription className="text-gray-400">
            Gere uma nova senha para atendimento.
          </DialogDescription>
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
          <DialogFooter>
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={issue.isPending}>
              {issue.isPending ? 'Emitindo...' : 'Emitir Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── TV Panel (Full-screen) ────────────────────────────────────────────────

function TVPanel() {
  const { data: display, isLoading } = useQueueDisplay();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.error('Não foi possível entrar em tela cheia.');
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="border-gray-600 text-gray-300"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
          {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
        </Button>
      </div>

      <Card className="bg-gray-950 border-emerald-800">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-8">
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-3">Senha Atual</p>
            {isLoading ? (
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-emerald-400" />
            ) : display?.currentTicket ? (
              <>
                <p className="text-emerald-400 text-8xl font-black font-mono tracking-wider animate-pulse">
                  {display.currentTicket.ticketNumber}
                </p>
                <p className="text-gray-300 text-xl mt-3">
                  {display.currentTicket.counter ?? 'Guichê'}
                </p>
                {display.currentTicket.patientName && (
                  <p className="text-gray-500 text-lg mt-1">{display.currentTicket.patientName}</p>
                )}
              </>
            ) : (
              <p className="text-gray-600 text-6xl font-bold">SEM CHAMADA</p>
            )}
          </div>

          {display?.nextTickets && display.nextTickets.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide text-center mb-4">Próximas Senhas</p>
              <div className="flex justify-center gap-6">
                {display.nextTickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="text-center">
                    <p className="text-gray-300 font-mono font-bold text-2xl">{t.ticketNumber}</p>
                    <Badge className={cn('text-xs border mt-1', CATEGORY_CLASS[t.category])}>
                      {CATEGORY_LABEL[t.category]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {display?.counters && display.counters.length > 0 && (
            <div className="flex justify-center gap-8 mt-8 pt-6 border-t border-gray-800">
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
    </div>
  );
}

// ─── Queue List Tab ────────────────────────────────────────────────────────

function QueueListTab() {
  const { data: ticketsData, isLoading } = useQueueTickets();
  const callNext = useCallNext();
  const complete = useCompleteTicket();
  const [issueOpen, setIssueOpen] = useState(false);
  const [counter, setCounter] = useState('Guichê 1');

  const tickets = ticketsData?.data ?? [];
  const waiting = tickets.filter((t) => t.status === 'WAITING');
  const serving = tickets.filter((t) => t.status === 'IN_SERVICE');
  const completed = tickets.filter((t) => t.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Controls */}
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
          {callNext.isPending ? 'Chamando...' : 'Chamar Próximo'}
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIssueOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Emitir Senha
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-yellow-400 mb-1" />
            <p className="text-2xl font-bold text-white">{waiting.length}</p>
            <p className="text-xs text-gray-400">Aguardando</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Volume2 className="w-6 h-6 mx-auto text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-white">{serving.length}</p>
            <p className="text-xs text-gray-400">Em Atendimento</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold text-white">{completed.length}</p>
            <p className="text-xs text-gray-400">Atendidos</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-6 h-6 mx-auto text-purple-400 mb-1" />
            <p className="text-2xl font-bold text-white">{tickets.length}</p>
            <p className="text-xs text-gray-400">Total Hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Waiting Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-yellow-400" />
            Fila de Espera
            <Badge className="bg-yellow-900/40 text-yellow-300 border border-yellow-700 text-xs ml-2">
              {waiting.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
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
                  <TableHead className="text-gray-400">Tempo de Espera</TableHead>
                  <TableHead className="text-gray-400">Emitida</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waiting.map((t) => {
                  const waitMin = calculateWaitMinutes(t.issuedAt);
                  return (
                    <TableRow key={t.id} className="border-gray-800">
                      <TableCell className="font-mono font-bold text-white text-lg">
                        {t.ticketNumber}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border text-xs', CATEGORY_CLASS[t.category])}>
                          {CATEGORY_LABEL[t.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{t.patientName ?? '—'}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'text-sm font-medium',
                          waitMin >= 30 ? 'text-red-400' : waitMin >= 15 ? 'text-yellow-400' : 'text-gray-300',
                        )}>
                          {formatWait(waitMin)}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatTime(t.issuedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          disabled={callNext.isPending}
                          onClick={() =>
                            callNext.mutate(
                              { counter, category: t.category },
                              { onSuccess: () => toast.success(`Chamando: ${t.ticketNumber}`) },
                            )
                          }
                        >
                          <Bell className="w-3 h-3 mr-1" />
                          Chamar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Serving */}
      {serving.length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Volume2 className="w-5 h-5 text-blue-400" />
              Em Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Senha</TableHead>
                  <TableHead className="text-gray-400">Paciente</TableHead>
                  <TableHead className="text-gray-400">Guichê</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serving.map((t) => (
                  <TableRow key={t.id} className="border-gray-800">
                    <TableCell className="font-mono font-bold text-emerald-400 text-lg">
                      {t.ticketNumber}
                    </TableCell>
                    <TableCell className="text-gray-300">{t.patientName ?? '—'}</TableCell>
                    <TableCell className="text-gray-400">{t.counter ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        disabled={complete.isPending}
                        onClick={() =>
                          complete.mutate(t.id, {
                            onSuccess: () => toast.success(`${t.ticketNumber} finalizada.`),
                          })
                        }
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Finalizar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <IssueDialog open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  );
}

// ─── Statistics Tab ────────────────────────────────────────────────────────

function StatsTab() {
  const { data: metrics, isLoading } = useQueueMetrics();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  const avgWait = metrics?.averageWaitMinutes ?? 0;
  const totalServed = metrics?.totalServedToday ?? 0;
  const totalWaiting = metrics?.totalWaiting ?? 0;
  const noShowCount = metrics?.noShowCount ?? 0;
  const waitTimeByCategory = metrics?.waitTimeByCategory ?? {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold text-white">{totalServed}</p>
            <p className="text-xs text-gray-400">Atendidos Hoje</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-white">{totalWaiting}</p>
            <p className="text-xs text-gray-400">Aguardando</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-yellow-400 mb-1" />
            <p className="text-2xl font-bold text-white">{formatWait(avgWait)}</p>
            <p className="text-xs text-gray-400">Espera Média</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <BarChart3 className="w-6 h-6 mx-auto text-purple-400 mb-1" />
            <p className="text-2xl font-bold text-white">{noShowCount}</p>
            <p className="text-xs text-gray-400">Não Compareceram</p>
          </CardContent>
        </Card>
      </div>

      {/* Wait Time by Category */}
      {Object.keys(waitTimeByCategory).length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Tempo Médio de Espera por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(waitTimeByCategory).map(([cat, minutes]) => {
                const catKey = cat as TicketCategory;
                const maxWait = Math.max(...Object.values(waitTimeByCategory), 1);
                const pct = Math.round(((minutes as number) / maxWait) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={cn('border text-xs', CATEGORY_CLASS[catKey] ?? CATEGORY_CLASS.GENERAL)}>
                        {CATEGORY_LABEL[catKey] ?? cat}
                      </Badge>
                      <span className="text-sm text-gray-300">{formatWait(minutes as number)}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function QueuesPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Ticket className="w-7 h-7 text-emerald-400" />
          Gestão de Filas
        </h1>
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="queue" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Fila
          </TabsTrigger>
          <TabsTrigger value="tv" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Monitor className="w-4 h-4 mr-2" />
            Painel TV
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <QueueListTab />
        </TabsContent>
        <TabsContent value="tv">
          <TVPanel />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
