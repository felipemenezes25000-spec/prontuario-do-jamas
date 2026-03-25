import { useState } from 'react';
import {
  DollarSign,
  FileText,
  CreditCard,
  Plus,
  CheckCircle2,
  XCircle,
  Send,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
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
  DialogFooter,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  usePriceTables,
  useCreatePriceTable,
  useBudgets,
  useCreateBudget,
  useUpdateBudgetStatus,
  useInstallmentPlans,
  useCreateInstallmentPlan,
  type PriceItem,
  type BudgetStatus,
  type BudgetFilters,
} from '@/services/billing-private-pay.service';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const STATUS_LABEL: Record<BudgetStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
};

const STATUS_COLOR: Record<BudgetStatus, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  SENT: 'bg-blue-900 text-blue-300',
  APPROVED: 'bg-emerald-900 text-emerald-300',
  REJECTED: 'bg-red-900 text-red-300',
};

// ─── Price Tables Tab ─────────────────────────────────────────────────────────

function PriceTablesTab() {
  const { data: tables = [], isLoading } = usePriceTables();
  const createTable = useCreatePriceTable();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<PriceItem[]>([
    { code: '', description: '', unitPrice: 0 },
  ]);

  function addItem() {
    setItems((prev) => [...prev, { code: '', description: '', unitPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof PriceItem, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function reset() {
    setName('');
    setDescription('');
    setItems([{ code: '', description: '', unitPrice: 0 }]);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error('Informe o nome da tabela.');
      return;
    }
    const validItems = items.filter((i) => i.code && i.description && i.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item com código, descrição e valor.');
      return;
    }
    try {
      await createTable.mutateAsync({ name, description, items: validItems });
      toast.success('Tabela de preços criada.');
      setOpen(false);
      reset();
    } catch {
      toast.error('Erro ao criar tabela de preços.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">{tables.length} tabela(s) cadastrada(s)</p>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nova Tabela
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : tables.length === 0 ? (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-8 pb-8 text-center text-gray-500">
            Nenhuma tabela de preços cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tables.map((t) => (
            <Card key={t.docId} className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-emerald-400" />
                  {t.name}
                  <Badge className="ml-auto bg-gray-700 text-gray-300 text-xs">
                    {t.items.length} itens
                  </Badge>
                </CardTitle>
                {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Código</TableHead>
                      <TableHead className="text-gray-400">Descrição</TableHead>
                      <TableHead className="text-gray-400 text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.items.slice(0, 5).map((item, i) => (
                      <TableRow key={i} className="border-gray-700">
                        <TableCell className="text-gray-300 font-mono text-xs">{item.code}</TableCell>
                        <TableCell className="text-gray-200 text-sm">{item.description}</TableCell>
                        <TableCell className="text-emerald-400 text-right font-medium">
                          {fmt(item.unitPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {t.items.length > 5 && (
                      <TableRow className="border-gray-700">
                        <TableCell colSpan={3} className="text-center text-gray-500 text-xs">
                          + {t.items.length - 5} item(s)
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Tabela de Preços</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label className="text-gray-300">Nome da Tabela *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Tabela Particular 2025"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-gray-300">Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Observações opcionais"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Itens *</Label>
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={item.code}
                    onChange={(e) => updateItem(idx, 'code', e.target.value)}
                    placeholder="Código"
                    className="bg-gray-800 border-gray-600 text-white w-28 shrink-0"
                  />
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Descrição"
                    className="bg-gray-800 border-gray-600 text-white flex-1"
                  />
                  <Input
                    type="number"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    placeholder="R$ 0,00"
                    className="bg-gray-800 border-gray-600 text-white w-28 shrink-0"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-gray-500 hover:text-red-400 shrink-0"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-gray-400" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSubmit}
              disabled={createTable.isPending}
            >
              {createTable.isPending ? 'Salvando...' : 'Criar Tabela'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Budgets Tab ──────────────────────────────────────────────────────────────

function BudgetsTab() {
  const [filters, setFilters] = useState<BudgetFilters>({ page: 1, pageSize: 10 });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: tables = [] } = usePriceTables();
  const { data: result, isLoading } = useBudgets(
    statusFilter !== 'all'
      ? { ...filters, status: statusFilter as BudgetStatus }
      : filters,
  );
  const createBudget = useCreateBudget();
  const updateStatus = useUpdateBudgetStatus();

  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [priceTableId, setPriceTableId] = useState('');
  const [notes, setNotes] = useState('');
  const [budgetItems, setBudgetItems] = useState([
    { code: '', description: '', quantity: 1, unitPrice: 0 },
  ]);

  function addBudgetItem() {
    setBudgetItems((prev) => [...prev, { code: '', description: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeBudgetItem(idx: number) {
    setBudgetItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateBudgetItem(idx: number, field: string, value: string | number) {
    setBudgetItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );
  }

  function applyPriceTable(tableId: string) {
    const table = tables.find((t) => t.id === tableId || t.docId === tableId);
    if (!table) return;
    setBudgetItems(table.items.map((i) => ({ code: i.code, description: i.description, quantity: 1, unitPrice: i.unitPrice })));
    setPriceTableId(tableId);
  }

  function totalEstimate() {
    return budgetItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  }

  function resetBudgetForm() {
    setPatientId('');
    setPriceTableId('');
    setNotes('');
    setBudgetItems([{ code: '', description: '', quantity: 1, unitPrice: 0 }]);
  }

  async function handleCreateBudget() {
    if (!patientId.trim()) {
      toast.error('Informe o ID do paciente.');
      return;
    }
    const validItems = budgetItems.filter((i) => i.code && i.description);
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item.');
      return;
    }
    try {
      const res = await createBudget.mutateAsync({
        patientId,
        priceTableId: priceTableId || undefined,
        notes,
        items: validItems,
      });
      toast.success(`Orçamento criado — ${fmt(res.totalAmount)}`);
      setOpen(false);
      resetBudgetForm();
    } catch {
      toast.error('Erro ao criar orçamento.');
    }
  }

  async function handleStatusChange(docId: string, status: BudgetStatus) {
    try {
      await updateStatus.mutateAsync({ docId, status });
      toast.success(`Status atualizado para "${STATUS_LABEL[status]}".`);
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  }

  const budgets = result?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="DRAFT">Rascunho</SelectItem>
            <SelectItem value="SENT">Enviado</SelectItem>
            <SelectItem value="APPROVED">Aprovado</SelectItem>
            <SelectItem value="REJECTED">Recusado</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="ml-auto bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Novo Orçamento
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : budgets.length === 0 ? (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-8 pb-8 text-center text-gray-500">
            Nenhum orçamento encontrado.
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-900 border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-400">Paciente</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400 text-right">Total</TableHead>
                <TableHead className="text-gray-400">Válido até</TableHead>
                <TableHead className="text-gray-400">Criado</TableHead>
                <TableHead className="text-gray-400 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((b) => (
                <TableRow key={b.docId} className="border-gray-700 hover:bg-gray-800/50">
                  <TableCell className="text-gray-200">{b.patientName ?? b.patientId.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', STATUS_COLOR[b.status])}>
                      {STATUS_LABEL[b.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-emerald-400 font-medium text-right">{fmt(b.totalAmount)}</TableCell>
                  <TableCell className="text-gray-400 text-sm">{fmtDate(b.validUntil)}</TableCell>
                  <TableCell className="text-gray-400 text-sm">{fmtDate(b.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      {b.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300 text-xs h-7"
                          onClick={() => handleStatusChange(b.docId, 'SENT')}
                        >
                          <Send className="w-3 h-3 mr-1" /> Enviar
                        </Button>
                      )}
                      {b.status === 'SENT' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-400 hover:text-emerald-300 text-xs h-7"
                            onClick={() => handleStatusChange(b.docId, 'APPROVED')}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 text-xs h-7"
                            onClick={() => handleStatusChange(b.docId, 'REJECTED')}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Recusar
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Pagination */}
          {(result?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
              <span className="text-sm text-gray-400">
                Página {result?.page} de {result?.totalPages} ({result?.total} registros)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                  disabled={(filters.page ?? 1) <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                  disabled={(filters.page ?? 1) >= (result?.totalPages ?? 1)}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Create Budget Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Orçamento Particular</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-gray-300">ID do Paciente *</Label>
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="UUID do paciente"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            {tables.length > 0 && (
              <div className="space-y-1">
                <Label className="text-gray-300">Carregar da Tabela de Preços</Label>
                <Select onValueChange={applyPriceTable}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Selecionar tabela (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {tables.map((t) => (
                      <SelectItem key={t.docId} value={t.docId}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Itens do Orçamento *</Label>
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" onClick={addBudgetItem}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {budgetItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={item.code}
                    onChange={(e) => updateBudgetItem(idx, 'code', e.target.value)}
                    placeholder="Código"
                    className="bg-gray-800 border-gray-600 text-white w-24 shrink-0"
                  />
                  <Input
                    value={item.description}
                    onChange={(e) => updateBudgetItem(idx, 'description', e.target.value)}
                    placeholder="Descrição"
                    className="bg-gray-800 border-gray-600 text-white flex-1"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateBudgetItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    placeholder="Qtd"
                    className="bg-gray-800 border-gray-600 text-white w-16 shrink-0"
                  />
                  <Input
                    type="number"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateBudgetItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    placeholder="R$"
                    className="bg-gray-800 border-gray-600 text-white w-28 shrink-0"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-gray-500 hover:text-red-400 shrink-0"
                    onClick={() => removeBudgetItem(idx)}
                    disabled={budgetItems.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="text-right text-emerald-400 font-semibold">
                Total estimado: {fmt(totalEstimate())}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas..."
                className="bg-gray-800 border-gray-600 text-white"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-gray-400" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreateBudget}
              disabled={createBudget.isPending}
            >
              {createBudget.isPending ? 'Criando...' : 'Criar Orçamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Installments Tab ─────────────────────────────────────────────────────────

function InstallmentsTab() {
  const { data: budgets } = useBudgets({ status: 'APPROVED', pageSize: 50 });
  const createPlan = useCreateInstallmentPlan();

  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [installments, setInstallments] = useState(3);
  const [downPayment, setDownPayment] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [viewBudgetId, setViewBudgetId] = useState('');

  const { data: plans = [], isLoading: plansLoading } = useInstallmentPlans(viewBudgetId);

  const approvedBudgets = budgets?.data ?? [];

  const selectedBudget = approvedBudgets.find(
    (b) => b.budgetId === selectedBudgetId || b.docId === selectedBudgetId,
  );

  function calcInstallmentPreview() {
    if (!selectedBudget) return 0;
    const remaining = selectedBudget.totalAmount - downPayment;
    if (remaining <= 0 || installments <= 0) return 0;
    if (interestRate === 0) return Math.round((remaining / installments) * 100) / 100;
    const r = interestRate / 100;
    return Math.round(
      (remaining * r * Math.pow(1 + r, installments)) /
      (Math.pow(1 + r, installments) - 1) * 100
    ) / 100;
  }

  async function handleCreatePlan() {
    if (!selectedBudgetId) {
      toast.error('Selecione um orçamento aprovado.');
      return;
    }
    try {
      const plan = await createPlan.mutateAsync({
        budgetId: selectedBudget?.budgetId ?? selectedBudgetId,
        installments,
        downPayment: downPayment || undefined,
        interestRateMonthly: interestRate || undefined,
        firstDueDate: firstDueDate || undefined,
      });
      toast.success(`Plano criado: ${plan.installments}x ${fmt(plan.installmentAmount)}`);
      setViewBudgetId(plan.budgetId);
    } catch {
      toast.error('Erro ao criar plano de parcelamento.');
    }
  }

  const preview = calcInstallmentPreview();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Create plan */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Gerar Plano de Parcelamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-gray-300">Orçamento Aprovado *</Label>
            {approvedBudgets.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum orçamento aprovado disponível.</p>
            ) : (
              <Select
                value={selectedBudgetId}
                onValueChange={(v) => {
                  setSelectedBudgetId(v);
                  const b = approvedBudgets.find((x) => x.docId === v);
                  if (b) setViewBudgetId(b.budgetId);
                }}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Selecionar orçamento" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {approvedBudgets.map((b) => (
                    <SelectItem key={b.docId} value={b.docId}>
                      {b.patientName ?? b.patientId.slice(0, 8)} — {fmt(b.totalAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-300">Nº de Parcelas</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Entrada (R$)</Label>
              <Input
                type="number"
                min={0}
                value={downPayment || ''}
                onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Juros Mensal (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={interestRate || ''}
                onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="0,0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">1ª Parcela</Label>
              <Input
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          {selectedBudget && (
            <div className="rounded-lg bg-gray-800 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Total do orçamento</span>
                <span className="font-medium">{fmt(selectedBudget.totalAmount)}</span>
              </div>
              {downPayment > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Entrada</span>
                  <span className="text-amber-400">- {fmt(downPayment)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-400 font-semibold border-t border-gray-700 pt-1 mt-1">
                <span>{installments}x de</span>
                <span>{fmt(preview)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Total final</span>
                <span>{fmt(downPayment + preview * installments)}</span>
              </div>
            </div>
          )}

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleCreatePlan}
            disabled={createPlan.isPending || !selectedBudgetId}
          >
            {createPlan.isPending ? 'Gerando...' : 'Gerar Plano'}
          </Button>
        </CardContent>
      </Card>

      {/* Right: Plans list */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Planos do Orçamento Selecionado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!viewBudgetId ? (
            <p className="text-gray-500 text-sm">Selecione um orçamento para ver seus planos.</p>
          ) : plansLoading ? (
            <p className="text-gray-400 text-sm">Carregando...</p>
          ) : plans.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum plano criado para este orçamento.</p>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.docId} className="rounded-lg bg-gray-800 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">
                      {plan.installments}x {fmt(plan.installmentAmount)}
                    </span>
                    <Badge className={cn(
                      'text-xs',
                      plan.status === 'ACTIVE' ? 'bg-emerald-900 text-emerald-300' :
                      plan.status === 'COMPLETED' ? 'bg-gray-700 text-gray-300' :
                      'bg-red-900 text-red-300',
                    )}>
                      {plan.status === 'ACTIVE' ? 'Ativo' : plan.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                    </Badge>
                  </div>
                  {plan.downPayment > 0 && (
                    <div className="text-xs text-amber-400">Entrada: {fmt(plan.downPayment)}</div>
                  )}
                  {plan.interestRateMonthly > 0 && (
                    <div className="text-xs text-gray-400">Juros: {plan.interestRateMonthly}% a.m.</div>
                  )}
                  <div className="text-xs text-gray-400">
                    Total com juros: {fmt(plan.totalWithInterest)}
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {plan.entries.slice(0, 6).map((entry) => (
                      <div
                        key={entry.number}
                        className="flex justify-between items-center text-xs py-0.5"
                      >
                        <span className="text-gray-400">{entry.number}ª parcela — {fmtDate(entry.dueDate)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">{fmt(entry.amount)}</span>
                          <Badge className={cn(
                            'text-xs px-1.5 py-0.5',
                            entry.status === 'PAID' ? 'bg-emerald-900 text-emerald-300' :
                            entry.status === 'OVERDUE' ? 'bg-red-900 text-red-300' :
                            'bg-gray-700 text-gray-400',
                          )}>
                            {entry.status === 'PAID' ? 'Pago' : entry.status === 'OVERDUE' ? 'Vencida' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {plan.entries.length > 6 && (
                      <p className="text-xs text-gray-500 text-center">
                        + {plan.entries.length - 6} parcela(s)
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivatePayPage() {
  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-900/30">
          <DollarSign className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Particular / Tabela Própria</h1>
          <p className="text-sm text-gray-400">
            Gestão de tabelas de preços, orçamentos e parcelamentos para pacientes particulares
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="price-tables" className="space-y-4">
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="price-tables" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400">
            <ListChecks className="w-4 h-4 mr-1.5" />
            Tabelas de Preço
          </TabsTrigger>
          <TabsTrigger value="budgets" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400">
            <FileText className="w-4 h-4 mr-1.5" />
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="installments" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400">
            <CreditCard className="w-4 h-4 mr-1.5" />
            Parcelamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price-tables">
          <PriceTablesTab />
        </TabsContent>
        <TabsContent value="budgets">
          <BudgetsTab />
        </TabsContent>
        <TabsContent value="installments">
          <InstallmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
