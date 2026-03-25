import { useState } from 'react';
import {
  GitCompareArrows,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  ClipboardList,
  Search,
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
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { cn } from '@/lib/utils';
import {
  useReconciliations,
  useReconciliation,
  useStartReconciliation,
  useRecordDecision,
  useCompleteReconciliation,
  type Reconciliation,
  type ReconciliationDecision,
} from '@/services/medication-reconciliation.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pendente',
    color: 'border-amber-500 text-amber-400',
    icon: <Clock className="h-3 w-3" />,
  },
  IN_PROGRESS: {
    label: 'Em Andamento',
    color: 'border-blue-500 text-blue-400',
    icon: <GitCompareArrows className="h-3 w-3" />,
  },
  COMPLETED: {
    label: 'Concluída',
    color: 'border-emerald-500 text-emerald-400',
    icon: <CheckCircle className="h-3 w-3" />,
  },
};

const DISCREPANCY_LABELS: Record<string, string> = {
  OMISSION: 'Omissão',
  COMMISSION: 'Comissão',
  DOSE_CHANGE: 'Mudança de Dose',
  ROUTE_CHANGE: 'Mudança de Via',
  FREQUENCY_CHANGE: 'Mudança de Frequência',
};

const DECISION_LABELS: Record<ReconciliationDecision, string> = {
  KEEP: 'Manter',
  MODIFY: 'Modificar',
  SUSPEND: 'Suspender',
  PENDING: 'Pendente',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function MedicationReconciliationPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({ patientId: '', admissionId: '' });
  const [decisionDialog, setDecisionDialog] = useState<{
    reconciliationId: string;
    itemId: string;
    itemName: string;
  } | null>(null);
  const [decisionForm, setDecisionForm] = useState<{
    decision: ReconciliationDecision;
    notes: string;
  }>({ decision: 'PENDING', notes: '' });

  const { data: reconciliations = [], isLoading, isError, refetch } = useReconciliations(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const { data: selectedRec } = useReconciliation(selectedId ?? '');
  const startReconciliation = useStartReconciliation();
  const recordDecision = useRecordDecision();
  const completeReconciliation = useCompleteReconciliation();

  const filtered = reconciliations.filter((r: Reconciliation) =>
    !search ||
    r.patientName.toLowerCase().includes(search.toLowerCase()) ||
    r.mrn.toLowerCase().includes(search.toLowerCase()),
  );

  const discrepancies = reconciliations.flatMap((r: Reconciliation) =>
    r.items.filter((i) => i.hasDiscrepancy),
  );

  const handleStart = async () => {
    if (!newForm.patientId || !newForm.admissionId) {
      toast.error('Preencha todos os campos.');
      return;
    }
    try {
      await startReconciliation.mutateAsync(newForm);
      toast.success('Reconciliação iniciada.');
      setShowNewDialog(false);
      setNewForm({ patientId: '', admissionId: '' });
    } catch {
      toast.error('Erro ao iniciar reconciliação.');
    }
  };

  const handleDecision = async () => {
    if (!decisionDialog) return;
    try {
      await recordDecision.mutateAsync({
        reconciliationId: decisionDialog.reconciliationId,
        itemId: decisionDialog.itemId,
        decision: decisionForm.decision,
        notes: decisionForm.notes || undefined,
      });
      toast.success('Decisão registrada.');
      setDecisionDialog(null);
    } catch {
      toast.error('Erro ao registrar decisão.');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeReconciliation.mutateAsync(id);
      toast.success('Reconciliação concluída.');
      setSelectedId(null);
    } catch {
      toast.error('Erro ao concluir reconciliação.');
    }
  };

  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitCompareArrows className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reconciliação Medicamentosa</h1>
            <p className="text-sm text-muted-foreground">Comparação e validação de medicamentos domiciliares vs. internação</p>
          </div>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Nova Reconciliação
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="pending" className="text-xs data-[state=active]:bg-emerald-600">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs data-[state=active]:bg-emerald-600">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="discrepancies" className="text-xs data-[state=active]:bg-emerald-600">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Discrepâncias ({discrepancies.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Pendentes ─────────────────────────────────────────────── */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente ou prontuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-card border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="COMPLETED">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <PageLoading cards={2} showTable />
          ) : filtered.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <GitCompareArrows className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma reconciliação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((rec: Reconciliation) => {
                const cfg = STATUS_CONFIG[rec.status];
                const withDiscrepancy = rec.items.filter((i) => i.hasDiscrepancy).length;
                return (
                  <Card
                    key={rec.id}
                    className="border-border bg-card cursor-pointer hover:bg-accent/20 transition-colors"
                    onClick={() => setSelectedId(rec.id)}
                  >
                    <CardContent className="flex items-center justify-between py-4 px-5">
                      <div className="space-y-1">
                        <p className="font-semibold">{rec.patientName}</p>
                        <p className="text-xs text-muted-foreground">Prontuário: {rec.mrn}</p>
                        <p className="text-xs text-muted-foreground">
                          {rec.items.length} medicamentos • {withDiscrepancy} discrepâncias
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn('gap-1 text-xs', cfg?.color)}>
                          {cfg?.icon}
                          {cfg?.label}
                        </Badge>
                        {rec.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => { e.stopPropagation(); handleComplete(rec.id); }}
                            disabled={completeReconciliation.isPending}
                          >
                            Concluir
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Histórico ─────────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="border-border bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reconciliações Concluídas</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Paciente</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Prontuário</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">Itens</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Concluída por</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Concluída em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {reconciliations
                    .filter((r: Reconciliation) => r.status === 'COMPLETED')
                    .map((rec: Reconciliation) => (
                      <tr key={rec.id} className="hover:bg-accent/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{rec.patientName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{rec.mrn}</td>
                        <td className="px-4 py-3 text-sm text-center">{rec.items.length}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{rec.completedBy ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {rec.completedAt
                            ? new Date(rec.completedAt).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab: Discrepâncias ─────────────────────────────────────────── */}
        <TabsContent value="discrepancies" className="space-y-4 mt-4">
          {discrepancies.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma discrepância identificada</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Discrepâncias Identificadas ({discrepancies.length})
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicamento Domiciliar</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Decisão</TableHead>
                    <TableHead>Decidido por</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discrepancies.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{item.homeMedicationName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.homeDose} • {item.homeRoute} • {item.homeFrequency}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.discrepancyType ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-400 text-xs">
                            {DISCREPANCY_LABELS[item.discrepancyType] ?? item.discrepancyType}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            item.decision === 'KEEP' && 'bg-emerald-500/20 text-emerald-400',
                            item.decision === 'SUSPEND' && 'bg-red-500/20 text-red-400',
                            item.decision === 'MODIFY' && 'bg-blue-500/20 text-blue-400',
                            item.decision === 'PENDING' && 'bg-amber-500/20 text-amber-400',
                          )}
                        >
                          {DECISION_LABELS[item.decision]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.decidedBy ?? '—'}
                      </TableCell>
                      <TableCell>
                        {item.decision === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              setDecisionDialog({
                                reconciliationId: item.reconciliationId,
                                itemId: item.id,
                                itemName: item.homeMedicationName,
                              })
                            }
                          >
                            Decidir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Detail Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!selectedId && !!selectedRec} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Reconciliação — {selectedRec?.patientName}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                Prontuário: {selectedRec?.mrn}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedRec && (
            <div className="space-y-3">
              {selectedRec.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-lg border p-3 space-y-2',
                    item.hasDiscrepancy ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-background',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{item.homeMedicationName}</p>
                    {item.hasDiscrepancy && (
                      <Badge variant="outline" className="border-amber-500 text-amber-400 text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {item.discrepancyType ? DISCREPANCY_LABELS[item.discrepancyType] : 'Discrepância'}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Domiciliar: </span>
                      {item.homeDose} • {item.homeRoute} • {item.homeFrequency}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Internação: </span>
                      {item.currentMedicationName
                        ? `${item.currentDose} • ${item.currentRoute} • ${item.currentFrequency}`
                        : 'Não prescrito'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        item.decision === 'KEEP' && 'bg-emerald-500/20 text-emerald-400',
                        item.decision === 'SUSPEND' && 'bg-red-500/20 text-red-400',
                        item.decision === 'MODIFY' && 'bg-blue-500/20 text-blue-400',
                        item.decision === 'PENDING' && 'bg-amber-500/20 text-amber-400',
                      )}
                    >
                      {DECISION_LABELS[item.decision]}
                    </Badge>
                    {item.decisionNotes && (
                      <span className="text-xs text-muted-foreground">— {item.decisionNotes}</span>
                    )}
                    {item.decision === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs ml-auto"
                        onClick={() =>
                          setDecisionDialog({
                            reconciliationId: item.reconciliationId,
                            itemId: item.id,
                            itemName: item.homeMedicationName,
                          })
                        }
                      >
                        Registrar Decisão
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── New Reconciliation Dialog ───────────────────────────────────────── */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Reconciliação Medicamentosa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">ID do Paciente *</Label>
              <Input
                placeholder="UUID do paciente"
                value={newForm.patientId}
                onChange={(e) => setNewForm({ ...newForm, patientId: e.target.value })}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ID da Internação *</Label>
              <Input
                placeholder="UUID da internação"
                value={newForm.admissionId}
                onChange={(e) => setNewForm({ ...newForm, admissionId: e.target.value })}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleStart}
              disabled={!newForm.patientId || !newForm.admissionId || startReconciliation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {startReconciliation.isPending ? 'Iniciando...' : 'Iniciar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Decision Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!decisionDialog} onOpenChange={() => setDecisionDialog(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Decisão Clínica — {decisionDialog?.itemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Decisão *</Label>
              <Select
                value={decisionForm.decision}
                onValueChange={(v) => setDecisionForm({ ...decisionForm, decision: v as ReconciliationDecision })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEEP">Manter</SelectItem>
                  <SelectItem value="MODIFY">Modificar</SelectItem>
                  <SelectItem value="SUSPEND">Suspender</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Input
                placeholder="Justificativa clínica..."
                value={decisionForm.notes}
                onChange={(e) => setDecisionForm({ ...decisionForm, notes: e.target.value })}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionDialog(null)}>Cancelar</Button>
            <Button
              onClick={handleDecision}
              disabled={recordDecision.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {recordDecision.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
