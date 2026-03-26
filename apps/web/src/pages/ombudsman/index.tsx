import { useState } from 'react';
import {
  MessageSquareWarning,
  BarChart3,
  Plus,
  MessageCircle,
  ThumbsUp,
  Lightbulb,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
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
import { Switch } from '@/components/ui/switch';
import { PageLoading } from '@/components/common/page-loading';
import {
  useOmbudsmanTickets,
  useOmbudsmanDashboard,
  useCreateTicket,
  useRespondTicket,
} from '@/services/ombudsman.service';
import type { OmbudsmanTicket } from '@/services/ombudsman.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  COMPLAINT: 'Reclamação',
  PRAISE: 'Elogio',
  SUGGESTION: 'Sugestão',
  QUESTION: 'Dúvida',
};

const TYPE_ICONS: Record<string, typeof MessageCircle> = {
  COMPLAINT: MessageCircle,
  PRAISE: ThumbsUp,
  SUGGESTION: Lightbulb,
  QUESTION: HelpCircle,
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  FORWARDED: 'Encaminhado',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'border-blue-500 bg-blue-500/10 text-blue-400',
  IN_PROGRESS: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
  FORWARDED: 'border-purple-500 bg-purple-500/10 text-purple-400',
  RESOLVED: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
  CLOSED: 'border-gray-500 bg-gray-500/10 text-gray-400',
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const DEPARTMENTS = [
  'Pronto-Socorro',
  'UTI',
  'Centro Cirúrgico',
  'Internação',
  'Ambulatório',
  'Farmácia',
  'Laboratório',
  'Recepção',
  'Nutrição',
  'Administração',
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function OmbudsmanPage() {
  const [activeTab, setActiveTab] = useState('tickets');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<OmbudsmanTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [ticketForm, setTicketForm] = useState({
    type: '',
    subject: '',
    description: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    department: '',
    isAnonymous: false,
  });

  const [respondForm, setRespondForm] = useState({
    response: '',
    status: '',
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useOmbudsmanTickets({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });
  const { data: dashboard, isLoading: dashboardLoading } = useOmbudsmanDashboard();
  const createTicket = useCreateTicket();
  const respondTicket = useRespondTicket();

  const handleCreateTicket = async () => {
    if (!ticketForm.type || !ticketForm.subject || !ticketForm.description) {
      toast.error('Preencha tipo, assunto e descrição.');
      return;
    }
    try {
      await createTicket.mutateAsync({
        type: ticketForm.type,
        subject: ticketForm.subject,
        description: ticketForm.description,
        contactName: ticketForm.contactName || undefined,
        contactPhone: ticketForm.contactPhone || undefined,
        contactEmail: ticketForm.contactEmail || undefined,
        department: ticketForm.department || undefined,
        isAnonymous: ticketForm.isAnonymous,
      });
      toast.success('Manifestação registrada com sucesso.');
      setCreateDialogOpen(false);
      setTicketForm({ type: '', subject: '', description: '', contactName: '', contactPhone: '', contactEmail: '', department: '', isAnonymous: false });
    } catch {
      toast.error('Erro ao registrar manifestação.');
    }
  };

  const handleRespondTicket = async () => {
    if (!selectedTicket || !respondForm.response || !respondForm.status) {
      toast.error('Preencha resposta e status.');
      return;
    }
    try {
      await respondTicket.mutateAsync({
        id: selectedTicket.id,
        response: respondForm.response,
        status: respondForm.status,
      });
      toast.success('Resposta registrada com sucesso.');
      setRespondDialogOpen(false);
      setSelectedTicket(null);
      setRespondForm({ response: '', status: '' });
    } catch {
      toast.error('Erro ao responder manifestação.');
    }
  };

  const openRespondDialog = (ticket: OmbudsmanTicket) => {
    setSelectedTicket(ticket);
    setRespondForm({ response: '', status: '' });
    setRespondDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6 text-primary" />
            Ouvidoria / SAC
          </h1>
          <p className="text-muted-foreground">
            Gestão de reclamações, elogios, sugestões e dúvidas
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nova Manifestação
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Manifestações
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Tickets List */}
        <TabsContent value="tickets" className="space-y-4">
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {ticketsData?.total ?? 0} manifestações
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-6">
              {ticketsLoading ? (
                <PageLoading />
              ) : ticketsData?.data && ticketsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketsData.data.map((ticket: OmbudsmanTicket) => {
                      const TypeIcon = TYPE_ICONS[ticket.type] ?? MessageCircle;
                      const slaDate = new Date(ticket.slaDeadline);
                      const isOverdue = slaDate < new Date() && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
                      return (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-mono text-sm">{ticket.ticketNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TypeIcon className="h-4 w-4" />
                              {TYPE_LABELS[ticket.type] ?? ticket.type}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-48 truncate font-medium">{ticket.subject}</TableCell>
                          <TableCell>{ticket.department ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[ticket.status] ?? ''}>
                              {STATUS_LABELS[ticket.status] ?? ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <Badge variant="destructive" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" /> Vencido
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {slaDate.toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            {ticket.status !== 'CLOSED' && (
                              <Button variant="outline" size="sm" onClick={() => openRespondDialog(ticket)}>
                                <ArrowRight className="h-3 w-3 mr-1" /> Responder
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma manifestação encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashboardLoading ? (
            <PageLoading />
          ) : dashboard ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total (6 meses)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{dashboard.totalTickets}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Em Aberto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-400">{dashboard.openTickets}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">SLA Cumprido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-emerald-400">{dashboard.slaCompliancePct}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio Resolução</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{dashboard.avgResolutionDays} dias</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Por Tipo</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboard.byType.map((t) => ({ ...t, name: TYPE_LABELS[t.type] ?? t.type }))}
                            cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="name"
                            label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                            labelLine={false}
                          >
                            {dashboard.byType.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Tendência Mensal</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboard.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="count" name="Manifestações" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {dashboard.byDepartment.length > 0 && (
                  <Card className="md:col-span-2">
                    <CardHeader><CardTitle>Por Setor</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboard.byDepartment} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" stroke="#9ca3af" />
                            <YAxis dataKey="department" type="category" stroke="#9ca3af" fontSize={12} width={120} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                            <Bar dataKey="count" name="Manifestações" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Manifestação</DialogTitle>
            <DialogDescription>Registrar reclamação, elogio, sugestão ou dúvida</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <label className="text-sm font-medium">Tipo *</label>
              <Select value={ticketForm.type} onValueChange={(v) => setTicketForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Assunto *</label>
              <Input placeholder="Assunto da manifestação" value={ticketForm.subject} onChange={(e) => setTicketForm((p) => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Textarea placeholder="Descreva em detalhes..." rows={4} value={ticketForm.description} onChange={(e) => setTicketForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Setor</label>
              <Select value={ticketForm.department} onValueChange={(v) => setTicketForm((p) => ({ ...p, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ticketForm.isAnonymous} onCheckedChange={(v) => setTicketForm((p) => ({ ...p, isAnonymous: v }))} />
              <label className="text-sm">Manifestação anônima</label>
            </div>
            {!ticketForm.isAnonymous && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium">Nome do contato</label>
                  <Input placeholder="Nome completo" value={ticketForm.contactName} onChange={(e) => setTicketForm((p) => ({ ...p, contactName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Telefone</label>
                    <Input placeholder="(00) 00000-0000" value={ticketForm.contactPhone} onChange={(e) => setTicketForm((p) => ({ ...p, contactPhone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">E-mail</label>
                    <Input type="email" placeholder="email@exemplo.com" value={ticketForm.contactEmail} onChange={(e) => setTicketForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTicket} disabled={createTicket.isPending}>
              {createTicket.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respond Ticket Dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Manifestação</DialogTitle>
            <DialogDescription>{selectedTicket?.ticketNumber} - {selectedTicket?.subject}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTicket?.responses && selectedTicket.responses.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Respostas anteriores:</label>
                {selectedTicket.responses.map((r, i) => (
                  <div key={i} className="rounded border border-border p-2 text-sm">
                    <p>{r.response}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.respondedAt).toLocaleDateString('pt-BR')} - Status: {STATUS_LABELS[r.newStatus] ?? r.newStatus}
                    </p>
                  </div>
                ))}
                <Separator />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Resposta *</label>
              <Textarea placeholder="Escreva a resposta..." rows={4} value={respondForm.response} onChange={(e) => setRespondForm((p) => ({ ...p, response: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Novo Status *</label>
              <Select value={respondForm.status} onValueChange={(v) => setRespondForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                  <SelectItem value="FORWARDED">Encaminhado</SelectItem>
                  <SelectItem value="RESOLVED">Resolvido</SelectItem>
                  <SelectItem value="CLOSED">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRespondTicket} disabled={respondTicket.isPending}>
              {respondTicket.isPending ? 'Enviando...' : 'Enviar Resposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
