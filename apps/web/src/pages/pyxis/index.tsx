import { useState } from 'react';
import {
  Package,
  LayoutGrid,
  ArrowDownCircle,
  RefreshCw,
  Plus,
  Wifi,
  WifiOff,
  Wrench,
  AlertTriangle,
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
import { cn } from '@/lib/utils';
import {
  usePyxisCabinets,
  usePyxisInventory,
  usePyxisTransactions,
  useRestockRequests,
  useCreateRestockRequest,
  useDispenseFromPyxis,
  type PyxisCabinet,
  type PyxisInventoryItem,
  type PyxisTransaction,
  type RestockRequest,
} from '@/services/pyxis.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const CABINET_STATUS_CONFIG: Record<PyxisCabinet['status'], { label: string; color: string; icon: React.ReactNode }> = {
  ONLINE: { label: 'Online', color: 'border-emerald-500 text-emerald-400', icon: <Wifi className="h-3 w-3" /> },
  OFFLINE: { label: 'Offline', color: 'border-red-500 text-red-400', icon: <WifiOff className="h-3 w-3" /> },
  MAINTENANCE: { label: 'Manutenção', color: 'border-amber-500 text-amber-400', icon: <Wrench className="h-3 w-3" /> },
};

const ITEM_STATUS_CONFIG: Record<PyxisInventoryItem['status'], { label: string; color: string }> = {
  ADEQUATE: { label: 'Adequado', color: 'bg-emerald-500/20 text-emerald-400' },
  LOW: { label: 'Baixo', color: 'bg-amber-500/20 text-amber-400' },
  CRITICAL: { label: 'Crítico', color: 'bg-red-500/20 text-red-400' },
  EXPIRED: { label: 'Vencido', color: 'bg-zinc-500/20 text-zinc-400' },
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DISPENSE: 'Dispensação',
  RETURN: 'Devolução',
  RESTOCK: 'Reposição',
  WASTE: 'Descarte',
  OVERRIDE: 'Override',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function PyxisPage() {
  const [activeTab, setActiveTab] = useState('cabinets');
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | undefined>(undefined);
  const [showRestock, setShowRestock] = useState(false);
  const [showDispense, setShowDispense] = useState(false);
  const [restockForm, setRestockForm] = useState({ cabinetId: '', medicationName: '', requestedQuantity: '' });
  const [dispenseForm, setDispenseForm] = useState({ cabinetId: '', inventoryItemId: '', quantity: '', patientId: '', reason: '' });

  const { data: cabinets = [], isLoading: loadingCabinets } = usePyxisCabinets();
  const { data: inventory = [], isLoading: loadingInventory } = usePyxisInventory(selectedCabinetId);
  const { data: transactions = [], isLoading: loadingTransactions } = usePyxisTransactions(
    selectedCabinetId ? { cabinetId: selectedCabinetId } : undefined,
  );
  const { data: restockRequests = [], isLoading: loadingRestock } = useRestockRequests();

  const createRestockRequest = useCreateRestockRequest();
  const dispenseFromPyxis = useDispenseFromPyxis();

  const criticalItems = inventory.filter((i: PyxisInventoryItem) =>
    i.status === 'CRITICAL' || i.status === 'EXPIRED',
  );

  const handleRestock = async () => {
    if (!restockForm.cabinetId || !restockForm.medicationName || !restockForm.requestedQuantity) {
      toast.error('Preencha todos os campos.');
      return;
    }
    try {
      await createRestockRequest.mutateAsync({
        cabinetId: restockForm.cabinetId,
        medicationName: restockForm.medicationName,
        requestedQuantity: parseInt(restockForm.requestedQuantity, 10),
      });
      toast.success('Solicitação de reposição criada.');
      setShowRestock(false);
      setRestockForm({ cabinetId: '', medicationName: '', requestedQuantity: '' });
    } catch {
      toast.error('Erro ao criar solicitação de reposição.');
    }
  };

  const handleDispense = async () => {
    if (!dispenseForm.cabinetId || !dispenseForm.inventoryItemId || !dispenseForm.quantity) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await dispenseFromPyxis.mutateAsync({
        cabinetId: dispenseForm.cabinetId,
        inventoryItemId: dispenseForm.inventoryItemId,
        quantity: parseInt(dispenseForm.quantity, 10),
        patientId: dispenseForm.patientId || undefined,
        reason: dispenseForm.reason || undefined,
      });
      toast.success('Dispensação registrada com sucesso.');
      setShowDispense(false);
      setDispenseForm({ cabinetId: '', inventoryItemId: '', quantity: '', patientId: '', reason: '' });
    } catch {
      toast.error('Erro ao registrar dispensação.');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pyxis — Dispensação Automatizada</h1>
            <p className="text-sm text-muted-foreground">Gestão de armários automatizados e rastreabilidade de medicamentos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRestock(true)} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Solicitar Reposição
          </Button>
          <Button onClick={() => setShowDispense(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Registrar Dispensação
          </Button>
        </div>
      </div>

      {/* Alert bar */}
      {criticalItems.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{criticalItems.length} item(ns) em estado crítico ou vencido no armário selecionado</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="cabinets" className="text-xs data-[state=active]:bg-emerald-600">
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
            Armários
          </TabsTrigger>
          <TabsTrigger value="dispenses" className="text-xs data-[state=active]:bg-emerald-600">
            <ArrowDownCircle className="mr-1.5 h-3.5 w-3.5" />
            Dispensações
          </TabsTrigger>
          <TabsTrigger value="restock" className="text-xs data-[state=active]:bg-emerald-600">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reposição
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Armários ────────────────────────────────────────────────── */}
        <TabsContent value="cabinets" className="space-y-4 mt-4">
          {loadingCabinets ? (
            <PageLoading cards={3} />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                {cabinets.map((c: PyxisCabinet) => {
                  const cfg = CABINET_STATUS_CONFIG[c.status];
                  const occupancy = Math.round((c.occupiedSlots / c.totalSlots) * 100);
                  return (
                    <Card
                      key={c.id}
                      className={cn(
                        'border-border bg-card cursor-pointer hover:bg-accent/20 transition-colors',
                        selectedCabinetId === c.id && 'ring-1 ring-emerald-500',
                      )}
                      onClick={() => setSelectedCabinetId(c.id === selectedCabinetId ? undefined : c.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{c.name}</CardTitle>
                          <Badge variant="outline" className={cn('gap-1 text-xs', cfg.color)}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.ward} — {c.location}</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Ocupação</span>
                          <span>{c.occupiedSlots}/{c.totalSlots} slots ({occupancy}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              occupancy > 80 ? 'bg-red-500' : occupancy > 60 ? 'bg-amber-500' : 'bg-emerald-500',
                            )}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {selectedCabinetId && (
                <Card className="border-border bg-card overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Estoque — {cabinets.find((c: PyxisCabinet) => c.id === selectedCabinetId)?.name}
                    </CardTitle>
                  </CardHeader>
                  {loadingInventory ? (
                    <CardContent><PageLoading cards={0} showTable /></CardContent>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicamento</TableHead>
                          <TableHead>Slot</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-center">Mín/Máx</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventory.map((item: PyxisInventoryItem) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-sm">{item.medicationName}</TableCell>
                            <TableCell className="text-xs font-mono">{item.slot}</TableCell>
                            <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {item.minQuantity}/{item.maxQuantity}
                            </TableCell>
                            <TableCell className="text-xs font-mono">{item.lot}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(item.expirationDate).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('text-xs', ITEM_STATUS_CONFIG[item.status].color)}>
                                {ITEM_STATUS_CONFIG[item.status].label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Tab: Dispensações ────────────────────────────────────────────── */}
        <TabsContent value="dispenses" className="space-y-4 mt-4">
          {loadingTransactions ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Histórico de Transações</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Armário</TableHead>
                    <TableHead>Medicamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Realizado por</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t: PyxisTransaction) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">{t.cabinetName}</TableCell>
                        <TableCell className="font-medium text-sm">{t.medicationName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              t.type === 'DISPENSE' && 'border-blue-500 text-blue-400',
                              t.type === 'RETURN' && 'border-emerald-500 text-emerald-400',
                              t.type === 'OVERRIDE' && 'border-red-500 text-red-400',
                              t.type === 'WASTE' && 'border-orange-500 text-orange-400',
                            )}
                          >
                            {TRANSACTION_TYPE_LABELS[t.type] ?? t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">{t.quantity}</TableCell>
                        <TableCell className="text-sm">
                          {t.patientName ? (
                            <div>
                              <p>{t.patientName}</p>
                              <p className="text-xs text-muted-foreground">{t.patientMrn}</p>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.performedBy}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(t.performedAt).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Reposição ───────────────────────────────────────────────── */}
        <TabsContent value="restock" className="space-y-4 mt-4">
          {loadingRestock ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Solicitações de Reposição ({restockRequests.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Armário</TableHead>
                    <TableHead>Medicamento</TableHead>
                    <TableHead className="text-center">Qtd Atual</TableHead>
                    <TableHead className="text-center">Qtd Solicitada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Solicitado por</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restockRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma solicitação pendente
                      </TableCell>
                    </TableRow>
                  ) : (
                    restockRequests.map((r: RestockRequest) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.cabinetName}</TableCell>
                        <TableCell className="font-medium text-sm">{r.medicationName}</TableCell>
                        <TableCell className="text-center">{r.currentQuantity}</TableCell>
                        <TableCell className="text-center font-bold text-emerald-400">{r.requestedQuantity}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              r.status === 'PENDING' && 'bg-amber-500/20 text-amber-400',
                              r.status === 'APPROVED' && 'bg-blue-500/20 text-blue-400',
                              r.status === 'FULFILLED' && 'bg-emerald-500/20 text-emerald-400',
                              r.status === 'CANCELLED' && 'bg-zinc-500/20 text-zinc-400',
                            )}
                          >
                            {r.status === 'PENDING' ? 'Pendente' :
                              r.status === 'APPROVED' ? 'Aprovada' :
                                r.status === 'FULFILLED' ? 'Atendida' : 'Cancelada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.requestedBy}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.requestedAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Restock Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showRestock} onOpenChange={setShowRestock}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Reposição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Armário *</Label>
              <Select
                value={restockForm.cabinetId}
                onValueChange={(v) => setRestockForm({ ...restockForm, cabinetId: v })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o armário..." />
                </SelectTrigger>
                <SelectContent>
                  {cabinets.map((c: PyxisCabinet) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.ward}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Medicamento *</Label>
              <Input
                placeholder="Nome do medicamento"
                value={restockForm.medicationName}
                onChange={(e) => setRestockForm({ ...restockForm, medicationName: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade Solicitada *</Label>
              <Input
                type="number"
                placeholder="0"
                value={restockForm.requestedQuantity}
                onChange={(e) => setRestockForm({ ...restockForm, requestedQuantity: e.target.value })}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestock(false)}>Cancelar</Button>
            <Button
              onClick={handleRestock}
              disabled={createRestockRequest.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createRestockRequest.isPending ? 'Enviando...' : 'Solicitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dispense Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showDispense} onOpenChange={setShowDispense}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Dispensação Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ID do Armário *</Label>
                <Input
                  placeholder="UUID"
                  value={dispenseForm.cabinetId}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, cabinetId: e.target.value })}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ID do Item *</Label>
                <Input
                  placeholder="UUID"
                  value={dispenseForm.inventoryItemId}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, inventoryItemId: e.target.value })}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade *</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={dispenseForm.quantity}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, quantity: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ID do Paciente</Label>
                <Input
                  placeholder="UUID (opcional)"
                  value={dispenseForm.patientId}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, patientId: e.target.value })}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Justificativa</Label>
              <Input
                placeholder="Motivo da dispensação..."
                value={dispenseForm.reason}
                onChange={(e) => setDispenseForm({ ...dispenseForm, reason: e.target.value })}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDispense(false)}>Cancelar</Button>
            <Button
              onClick={handleDispense}
              disabled={dispenseFromPyxis.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {dispenseFromPyxis.isPending ? 'Registrando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
