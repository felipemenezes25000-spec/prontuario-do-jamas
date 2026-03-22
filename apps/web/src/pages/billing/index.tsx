import { useState, useMemo } from 'react';
import {
  Receipt,
  TrendingDown,
  Clock,
  CheckCircle2,
  Plus,
  Sparkles,
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  XCircle,
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
import { cn } from '@/lib/utils';
import { useBillingEntries } from '@/services/billing.service';
import {
  useBillingAppeals,
  useCreateAppeal,
  useUpdateAppealStatus,
  useGenerateAIJustification,
  useValidateTissXml,
} from '@/services/appeals.service';
import type { AppealStatus } from '@/types';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

// ============================================================================
// Status config
// ============================================================================

const billingStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-600' },
  SUBMITTED: { label: 'Enviado', color: 'bg-blue-600' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-600' },
  PARTIALLY_APPROVED: { label: 'Parcial', color: 'bg-amber-600' },
  DENIED: { label: 'Glosado', color: 'bg-red-600' },
  APPEALED: { label: 'Em Recurso', color: 'bg-purple-600' },
  PAID: { label: 'Pago', color: 'bg-teal-600' },
};

const appealStatusConfig: Record<
  string,
  { label: string; color: string }
> = {
  DRAFT: { label: 'Rascunho', color: 'bg-zinc-500' },
  SUBMITTED: { label: 'Enviado', color: 'bg-blue-600' },
  IN_REVIEW: { label: 'Em Analise', color: 'bg-yellow-600' },
  ACCEPTED: { label: 'Aceito', color: 'bg-green-600' },
  PARTIALLY_ACCEPTED: { label: 'Parcialmente Aceito', color: 'bg-orange-600' },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-600' },
  ESCALATED: { label: 'Escalado', color: 'bg-purple-600' },
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ============================================================================
// Main Page
// ============================================================================

export default function BillingPage() {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const { data: billingData, isLoading, isError, refetch } = useBillingEntries();
  const allBilling = billingData?.data ?? [];

  const totalBilled = useMemo(
    () => allBilling.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0),
    [allBilling],
  );
  const totalApproved = useMemo(
    () =>
      allBilling
        .filter((b) => b.status === 'APPROVED' || b.status === 'PAID')
        .reduce((sum, b) => sum + (b.approvedAmount ?? b.totalAmount ?? 0), 0),
    [allBilling],
  );
  const totalDenied = useMemo(
    () =>
      allBilling
        .filter((b) => b.status === 'DENIED')
        .reduce((sum, b) => sum + (b.glosedAmount ?? b.totalAmount ?? 0), 0),
    [allBilling],
  );
  const totalPending = useMemo(
    () =>
      allBilling
        .filter((b) => b.status === 'PENDING' || b.status === 'SUBMITTED')
        .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0),
    [allBilling],
  );

  const detail = selectedEntry
    ? allBilling.find((b) => b.id === selectedEntry)
    : null;

  const kpis = [
    {
      label: 'Total Faturado',
      value: formatCurrency(totalBilled),
      icon: Receipt,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-500/10',
    },
    {
      label: 'Aprovado',
      value: formatCurrency(totalApproved),
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Glosado',
      value: formatCurrency(totalDenied),
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Pendente',
      value: formatCurrency(totalPending),
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  if (isLoading) return <PageLoading cards={4} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Faturamento</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    kpi.bgColor,
                  )}
                >
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entries">Lancamentos</TabsTrigger>
          <TabsTrigger value="appeals">Recursos de Glosa</TabsTrigger>
          <TabsTrigger value="tiss">Validacao TISS</TabsTrigger>
        </TabsList>

        {/* ====== Billing Entries Tab ====== */}
        <TabsContent value="entries">
          <Card className="border-border bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lancamentos</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                      Data
                    </th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">
                      Guia TISS
                    </th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">
                      Convenio
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {allBilling.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry.id)}
                      className="cursor-pointer transition-colors hover:bg-accent/30"
                    >
                      <td className="px-4 py-3 text-sm">
                        {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="hidden max-w-xs truncate px-4 py-3 text-sm text-muted-foreground font-mono sm:table-cell">
                        {entry.guideNumber ?? '\u2014'}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {entry.insuranceProvider ?? 'Particular'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right">
                        {formatCurrency(entry.totalAmount ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] text-white',
                            billingStatusConfig[entry.status]?.color,
                          )}
                        >
                          {billingStatusConfig[entry.status]?.label ??
                            entry.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {allBilling.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Nenhum lancamento encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ====== Appeals Tab ====== */}
        <TabsContent value="appeals">
          <AppealsTab />
        </TabsContent>

        {/* ====== TISS Validation Tab ====== */}
        <TabsContent value="tiss">
          <TissValidationTab />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Detalhes do Lancamento</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid gap-3 grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p>
                    {new Date(detail.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Convenio</p>
                  <p>{detail.insuranceProvider ?? 'Particular'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guia TISS</p>
                  <p className="font-mono text-xs">
                    {detail.guideNumber ?? '\u2014'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p>{detail.guideType ?? '\u2014'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm text-muted-foreground">
                  Valor Total
                </span>
                <span className="text-lg font-bold">
                  {formatCurrency(detail.totalAmount ?? 0)}
                </span>
              </div>
              {(detail.approvedAmount != null ||
                detail.glosedAmount != null) && (
                <div className="grid gap-3 grid-cols-2">
                  {detail.approvedAmount != null && (
                    <div className="flex items-center justify-between rounded-lg border border-green-500/20 p-2">
                      <span className="text-xs text-muted-foreground">
                        Aprovado
                      </span>
                      <span className="text-sm font-medium text-green-400">
                        {formatCurrency(detail.approvedAmount)}
                      </span>
                    </div>
                  )}
                  {detail.glosedAmount != null && (
                    <div className="flex items-center justify-between rounded-lg border border-red-500/20 p-2">
                      <span className="text-xs text-muted-foreground">
                        Glosado
                      </span>
                      <span className="text-sm font-medium text-red-400">
                        {formatCurrency(detail.glosedAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs text-white',
                    billingStatusConfig[detail.status]?.color,
                  )}
                >
                  {billingStatusConfig[detail.status]?.label ?? detail.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Appeals Tab Component
// ============================================================================

function AppealsTab() {
  const [statusFilter, setStatusFilter] = useState<AppealStatus | 'ALL'>('ALL');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const filters =
    statusFilter !== 'ALL' ? { status: statusFilter as AppealStatus } : undefined;
  const {
    data: appealsData,
    isLoading,
  } = useBillingAppeals(filters);
  const appeals = appealsData?.data ?? [];

  const createAppeal = useCreateAppeal();
  const updateStatus = useUpdateAppealStatus();
  const generateAI = useGenerateAIJustification();

  const handleCreateAppeal = (formData: {
    billingEntryId: string;
    glosedItemCodes: string;
    glosedAmount: string;
    appealedAmount: string;
    justification: string;
  }) => {
    createAppeal.mutate(
      {
        billingEntryId: formData.billingEntryId,
        glosedItemCodes: (formData.glosedItemCodes ?? '')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        glosedAmount: parseFloat(formData.glosedAmount),
        appealedAmount: parseFloat(formData.appealedAmount),
        justification: formData.justification,
        supportingDocs: [],
      },
      {
        onSuccess: () => setShowCreateDialog(false),
      },
    );
  };

  const handleGenerateAI = (appealId: string) => {
    generateAI.mutate(appealId, {
      onSuccess: (data) => {
        setAiResult(data.aiJustification);
      },
    });
  };

  const handleSubmitAppeal = (appealId: string) => {
    updateStatus.mutate({ id: appealId, status: 'SUBMITTED' });
  };

  if (isLoading) return <PageLoading cards={0} showTable />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as AppealStatus | 'ALL')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="DRAFT">Rascunho</SelectItem>
            <SelectItem value="SUBMITTED">Enviado</SelectItem>
            <SelectItem value="IN_REVIEW">Em Analise</SelectItem>
            <SelectItem value="ACCEPTED">Aceito</SelectItem>
            <SelectItem value="PARTIALLY_ACCEPTED">
              Parcialmente Aceito
            </SelectItem>
            <SelectItem value="REJECTED">Rejeitado</SelectItem>
            <SelectItem value="ESCALATED">Escalado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="ml-auto"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Novo Recurso
        </Button>
      </div>

      {/* Appeals Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                  Recurso
                </th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">
                  Guia
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">
                  Glosado
                </th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground text-right sm:table-cell">
                  Em Recurso
                </th>
                <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground text-right md:table-cell">
                  Recuperado
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                  Data
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {appeals.map((appeal) => (
                <tr
                  key={appeal.id}
                  className="transition-colors hover:bg-accent/30"
                >
                  <td className="px-4 py-3 text-sm font-mono">
                    {appeal.appealNumber}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground font-mono sm:table-cell">
                    {appeal.billingEntry?.guideNumber ?? '\u2014'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] text-white',
                        appealStatusConfig[appeal.status]?.color,
                      )}
                    >
                      {appealStatusConfig[appeal.status]?.label ??
                        appeal.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-red-400">
                    {formatCurrency(appeal.glosedAmount)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm font-medium text-right text-blue-400 sm:table-cell">
                    {formatCurrency(appeal.appealedAmount)}
                  </td>
                  <td className="hidden px-4 py-3 text-sm font-medium text-right text-green-400 md:table-cell">
                    {appeal.recoveredAmount != null
                      ? formatCurrency(appeal.recoveredAmount)
                      : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(appeal.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {appeal.status === 'DRAFT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSubmitAppeal(appeal.id)}
                          disabled={updateStatus.isPending}
                          title="Enviar recurso"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateAI(appeal.id)}
                        disabled={generateAI.isPending}
                        title="Gerar justificativa com IA"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAppeal(appeal.id)}
                        title="Ver detalhes"
                      >
                        <FileCheck2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {appeals.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum recurso de glosa encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Appeal Dialog */}
      <CreateAppealDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateAppeal}
        isPending={createAppeal.isPending}
      />

      {/* Appeal Detail Dialog */}
      <AppealDetailDialog
        appealId={selectedAppeal}
        onClose={() => setSelectedAppeal(null)}
      />

      {/* AI Justification Result Dialog */}
      <Dialog open={!!aiResult} onOpenChange={() => setAiResult(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Justificativa Gerada por IA
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 text-sm">
            {aiResult}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Create Appeal Dialog
// ============================================================================

function CreateAppealDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    billingEntryId: string;
    glosedItemCodes: string;
    glosedAmount: string;
    appealedAmount: string;
    justification: string;
  }) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    billingEntryId: '',
    glosedItemCodes: '',
    glosedAmount: '',
    appealedAmount: '',
    justification: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Recurso de Glosa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billingEntryId">ID do Lancamento</Label>
            <Input
              id="billingEntryId"
              placeholder="UUID do lancamento de faturamento"
              value={formData.billingEntryId}
              onChange={(e) => updateField('billingEntryId', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="glosedItemCodes">
              Codigos Glosados (separados por virgula)
            </Label>
            <Input
              id="glosedItemCodes"
              placeholder="10101012, 20201010"
              value={formData.glosedItemCodes}
              onChange={(e) => updateField('glosedItemCodes', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="glosedAmount">Valor Glosado (R$)</Label>
              <Input
                id="glosedAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.glosedAmount}
                onChange={(e) => updateField('glosedAmount', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appealedAmount">Valor em Recurso (R$)</Label>
              <Input
                id="appealedAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.appealedAmount}
                onChange={(e) => updateField('appealedAmount', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Justificativa</Label>
            <Textarea
              id="justification"
              rows={4}
              placeholder="Descreva a justificativa clinica para o recurso..."
              value={formData.justification}
              onChange={(e) => updateField('justification', e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar Recurso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Appeal Detail Dialog
// ============================================================================

function AppealDetailDialog({
  appealId,
  onClose,
}: {
  appealId: string | null;
  onClose: () => void;
}) {
  const { data: appeal } = useBillingAppeals();
  const detail = appeal?.data?.find((a) => a.id === appealId);

  return (
    <Dialog open={!!appealId} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Recurso</DialogTitle>
        </DialogHeader>
        {detail && (
          <div className="space-y-3">
            <div className="grid gap-3 grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Numero</p>
                <p className="font-mono">{detail.appealNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs text-white',
                    appealStatusConfig[detail.status]?.color,
                  )}
                >
                  {appealStatusConfig[detail.status]?.label ?? detail.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Guia</p>
                <p className="font-mono text-xs">
                  {detail.billingEntry?.guideNumber ?? '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p>
                  {new Date(detail.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-3">
              <div className="flex flex-col items-center rounded-lg border border-red-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">
                  Glosado
                </span>
                <span className="text-sm font-medium text-red-400">
                  {formatCurrency(detail.glosedAmount)}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-blue-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">
                  Em Recurso
                </span>
                <span className="text-sm font-medium text-blue-400">
                  {formatCurrency(detail.appealedAmount)}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-green-500/20 p-2">
                <span className="text-[10px] text-muted-foreground">
                  Recuperado
                </span>
                <span className="text-sm font-medium text-green-400">
                  {detail.recoveredAmount != null
                    ? formatCurrency(detail.recoveredAmount)
                    : '\u2014'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Justificativa
              </p>
              <p className="text-sm rounded-lg border border-border p-3 bg-muted/30">
                {detail.justification}
              </p>
            </div>

            {detail.aiJustification && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  Justificativa IA
                </p>
                <p className="text-sm rounded-lg border border-emerald-500/20 p-3 bg-emerald-500/5 whitespace-pre-wrap">
                  {detail.aiJustification}
                </p>
              </div>
            )}

            {detail.resolution && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Resolucao
                </p>
                <p className="text-sm rounded-lg border border-border p-3 bg-muted/30">
                  {detail.resolution}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Codigos glosados: {(detail.glosedItemCodes ?? []).join(', ')}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TISS Validation Tab
// ============================================================================

function TissValidationTab() {
  const [xml, setXml] = useState('');
  const validateTiss = useValidateTissXml();

  const handleValidate = () => {
    if (!xml.trim()) return;
    validateTiss.mutate(xml);
  };

  const result = validateTiss.data;

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Validacao de XML TISS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tiss-xml">Cole o XML TISS abaixo</Label>
            <Textarea
              id="tiss-xml"
              rows={10}
              className="font-mono text-xs"
              placeholder='<?xml version="1.0" encoding="UTF-8"?>&#10;<ans:mensagemTISS ...>'
              value={xml}
              onChange={(e) => setXml(e.target.value)}
            />
          </div>
          <Button
            onClick={handleValidate}
            disabled={validateTiss.isPending || !xml.trim()}
          >
            {validateTiss.isPending ? 'Validando...' : 'Validar XML'}
          </Button>

          {result && (
            <div className="space-y-3 pt-2">
              {/* Overall result */}
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3',
                  result.valid
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5',
                )}
              >
                {result.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {result.valid
                    ? 'XML TISS valido'
                    : `${(result.errors ?? []).length} erro(s) encontrado(s)`}
                </span>
              </div>

              {/* Errors */}
              {(result.errors ?? []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-red-400">Erros</p>
                  {(result.errors ?? []).map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded border border-red-500/20 p-2 text-sm"
                    >
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {(result.warnings ?? []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-yellow-400">Avisos</p>
                  {(result.warnings ?? []).map((warn, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded border border-yellow-500/20 p-2 text-sm"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
