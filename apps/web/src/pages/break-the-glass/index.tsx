import { useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldAlert,
  Eye,
  Flag,
  XOctagon,
  BarChart3,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBTGLogs,
  useBTGStats,
  useReviewBTGAccess,
  type BTGStatus,
  type BreakTheGlassAccess,
} from '@/services/break-the-glass.service';

function statusBadge(status: BTGStatus) {
  const map: Record<BTGStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDING_REVIEW: { label: 'Pendente', variant: 'outline' },
    APPROVED: { label: 'Aprovado', variant: 'default' },
    FLAGGED: { label: 'Sinalizado', variant: 'secondary' },
    VIOLATION: { label: 'Violação', variant: 'destructive' },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function ReviewDialog({
  access,
  open,
  onClose,
}: {
  access: BreakTheGlassAccess;
  open: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<'APPROVED' | 'FLAGGED' | 'VIOLATION'>('APPROVED');
  const [notes, setNotes] = useState('');
  const review = useReviewBTGAccess();

  const handleSubmit = () => {
    review.mutate(
      { id: access.id, status, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success('Revisão DPO registrada com sucesso');
          onClose();
        },
        onError: () => toast.error('Erro ao registrar revisão'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Revisão DPO — Acesso de Emergência</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-md bg-muted p-3 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Usuário:</span>{' '}
              <span className="font-medium">{access.userName}</span>{' '}
              <Badge variant="outline" className="text-xs ml-1">{access.userRole}</Badge>
            </p>
            <p>
              <span className="text-muted-foreground">Paciente:</span>{' '}
              <span className="font-medium">{access.patientName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Justificativa:</span>{' '}
              {access.justification}
            </p>
            <p>
              <span className="text-muted-foreground">Acessado em:</span>{' '}
              {new Date(access.accessedAt).toLocaleString('pt-BR')}
            </p>
            <p>
              <span className="text-muted-foreground">Recursos:</span>{' '}
              {access.resourcesAccessed.join(', ')}
            </p>
          </div>
          <div className="space-y-1">
            <Label>Decisão DPO</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Aprovar — Acesso justificado</SelectItem>
                <SelectItem value="FLAGGED">Sinalizar — Requer acompanhamento</SelectItem>
                <SelectItem value="VIOLATION">Violação — LGPD comprometida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notas DPO</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o acesso..."
            />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={review.isPending}
            onClick={handleSubmit}
          >
            {review.isPending ? 'Salvando...' : 'Registrar Revisão'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogsTab() {
  const [statusFilter, setStatusFilter] = useState<BTGStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<BreakTheGlassAccess | null>(null);
  const { data, isLoading } = useBTGLogs(
    statusFilter !== 'ALL' ? { dpoReviewStatus: statusFilter } : undefined,
  );

  const logs = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Status</SelectItem>
            <SelectItem value="PENDING_REVIEW">Pendente Revisão</SelectItem>
            <SelectItem value="APPROVED">Aprovado</SelectItem>
            <SelectItem value="FLAGGED">Sinalizado</SelectItem>
            <SelectItem value="VIOLATION">Violação</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} acessos</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum log encontrado</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Justificativa</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Status DPO</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{log.userName}</p>
                      <p className="text-xs text-muted-foreground">{log.userRole}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.patientName}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{log.justification}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(log.accessedAt).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>{statusBadge(log.dpoReviewStatus)}</TableCell>
                  <TableCell>
                    {log.dpoReviewStatus === 'PENDING_REVIEW' && (
                      <Button size="sm" variant="outline" onClick={() => setSelected(log)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Revisar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selected && (
        <ReviewDialog
          access={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StatsTab() {
  const { data: stats, isLoading } = useBTGStats();

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando estatísticas...</div>;
  if (!stats) return null;

  const cards = [
    {
      label: 'Total de Acessos',
      value: stats.totalAccesses,
      icon: <Eye className="h-5 w-5 text-blue-400" />,
      color: 'text-blue-400',
    },
    {
      label: 'Pendente Revisão',
      value: stats.pendingReview,
      icon: <Clock className="h-5 w-5 text-yellow-400" />,
      color: 'text-yellow-400',
    },
    {
      label: 'Sinalizados',
      value: stats.flaggedCount,
      icon: <Flag className="h-5 w-5 text-orange-400" />,
      color: 'text-orange-400',
    },
    {
      label: 'Violações LGPD',
      value: stats.violationCount,
      icon: <XOctagon className="h-5 w-5 text-red-400" />,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-3">
                {c.icon}
                <div>
                  <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.violationCount > 0 && (
        <Card className="border-red-500/30">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <XOctagon className="h-6 w-6 text-red-400 shrink-0" />
            <div>
              <p className="font-medium text-red-400">Atenção: Violações LGPD Detectadas</p>
              <p className="text-sm text-muted-foreground">
                {stats.violationCount} acesso(s) classificado(s) como violação. Ação imediata requerida pelo DPO.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.pendingReview === 0 && stats.violationCount === 0 && (
        <Card className="border-emerald-500/30">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            <div>
              <p className="font-medium text-emerald-400">Todos os acessos revisados</p>
              <p className="text-sm text-muted-foreground">
                Nenhuma pendência de revisão DPO encontrada.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BreakTheGlassPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-7 w-7 text-red-400" />
        <div>
          <h1 className="text-2xl font-bold">Break-the-Glass</h1>
          <p className="text-sm text-muted-foreground">
            Auditoria de acessos de emergência a prontuários — conformidade LGPD
          </p>
        </div>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Logs de Acesso
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Revisão DPO
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
        <TabsContent value="review">
          <LogsTab />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
