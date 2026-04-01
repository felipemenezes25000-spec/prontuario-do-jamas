import { useMemo, useState, useCallback } from 'react';
import {
  Pill,
  Search,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Zap,
  X,
  Loader2,
  Warehouse,
  PackageCheck,
  Plus,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { usePrescriptions } from '@/services/prescriptions.service';
import {
  usePendingDispensation,
  useDispense,
  useInventory,
  useCreateInventoryEntry,
  useInventoryAlerts,
} from '@/services/pharmacy.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { SafetyValidationForm, DoubleCheckActions } from '@/components/medical/prescription-safety-panel';
import { DrugSearch } from '@/components/drug-search';
import {
  useCheckInteractions,
  type Drug,
  type InteractionResult,
} from '@/services/drugs.service';
import type { PrescriptionItem, DrugInventory } from '@/types';

// ============================================================================
// Dispensation Tab
// ============================================================================

function DispensationTab() {
  const { data: pending = [], isLoading, isError, refetch } = usePendingDispensation();
  const dispenseMutation = useDispense();
  const [dispensingItem, setDispensingItem] = useState<PrescriptionItem | null>(null);
  const [dispenseForm, setDispenseForm] = useState({
    quantity: 1,
    lot: '',
    expirationDate: '',
    observations: '',
  });

  const handleDispense = useCallback(() => {
    if (!dispensingItem) return;
    dispenseMutation.mutate(
      {
        prescriptionItemId: dispensingItem.id,
        quantity: dispenseForm.quantity,
        lot: dispenseForm.lot || undefined,
        expirationDate: dispenseForm.expirationDate || undefined,
        observations: dispenseForm.observations || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Medicamento dispensado com sucesso');
          setDispensingItem(null);
          setDispenseForm({ quantity: 1, lot: '', expirationDate: '', observations: '' });
        },
        onError: () => {
          toast.error('Erro ao dispensar medicamento');
        },
      },
    );
  }, [dispensingItem, dispenseForm, dispenseMutation]);

  if (isLoading) return <PageLoading cards={2} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-12">
            <PackageCheck className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma dispensacao pendente
            </p>
          </CardContent>
        </Card>
      ) : (
        pending.map((presc) => (
          <Card key={presc.id} className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {presc.patient?.fullName ?? `Paciente ${presc.patientId.slice(-6)}`}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    MRN: {presc.patient?.mrn ?? '---'} | Dr(a). {presc.doctor?.name ?? '---'}
                  </p>
                </div>
                <Badge className="bg-teal-600 text-white text-[10px]">Ativa</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicamento</TableHead>
                    <TableHead>Dose</TableHead>
                    <TableHead>Via</TableHead>
                    <TableHead>Frequencia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presc.items.map((item) => {
                    const isDispensed = item.dispensations && item.dispensations.length > 0;
                    const isHighAlert = item.isHighAlert || item.isControlled;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Pill className={cn('h-3 w-3', isHighAlert ? 'text-red-400' : 'text-muted-foreground')} />
                            <span className={isHighAlert ? 'text-red-300 font-medium' : ''}>
                              {item.medicationName ?? item.examName ?? '---'}
                            </span>
                            {isHighAlert && (
                              <Badge variant="secondary" className="bg-red-500/20 text-red-300 text-[9px]">
                                Alto Alerta
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{item.dose ?? '---'}</TableCell>
                        <TableCell className="text-xs">{item.route ?? '---'}</TableCell>
                        <TableCell className="text-xs">{item.frequency ?? '---'}</TableCell>
                        <TableCell>
                          {isDispensed ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">
                              Dispensado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isDispensed && (
                            <Button
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-500 text-xs h-7"
                              onClick={() => setDispensingItem(item)}
                            >
                              <PackageCheck className="mr-1 h-3 w-3" />
                              Dispensar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Dispensation Dialog */}
      <Dialog open={!!dispensingItem} onOpenChange={(open) => !open && setDispensingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispensar Medicamento</DialogTitle>
            <DialogDescription>
              {dispensingItem?.medicationName} - {dispensingItem?.dose} {dispensingItem?.route}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={dispenseForm.quantity}
                onChange={(e) =>
                  setDispenseForm((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value, 10) || 1,
                  }))
                }
                className="bg-card border-border"
              />
            </div>
            <div>
              <Label>Lote</Label>
              <Input
                value={dispenseForm.lot}
                onChange={(e) =>
                  setDispenseForm((prev) => ({ ...prev, lot: e.target.value }))
                }
                placeholder="Numero do lote"
                className="bg-card border-border"
              />
            </div>
            <div>
              <Label>Validade</Label>
              <Input
                type="date"
                value={dispenseForm.expirationDate}
                onChange={(e) =>
                  setDispenseForm((prev) => ({
                    ...prev,
                    expirationDate: e.target.value,
                  }))
                }
                className="bg-card border-border"
              />
            </div>
            <div>
              <Label>Observacoes</Label>
              <Input
                value={dispenseForm.observations}
                onChange={(e) =>
                  setDispenseForm((prev) => ({
                    ...prev,
                    observations: e.target.value,
                  }))
                }
                placeholder="Observacoes opcionais"
                className="bg-card border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDispensingItem(null)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-500"
              onClick={handleDispense}
              disabled={dispenseMutation.isPending}
            >
              {dispenseMutation.isPending && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}
              Confirmar Dispensacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Inventory Tab
// ============================================================================

function InventoryTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    drugName: '',
    lot: '',
    expirationDate: '',
    quantity: 0,
    minQuantity: 10,
    location: 'Farmacia Central',
  });

  const filters = useMemo(() => ({
    ...(statusFilter !== 'all' ? { status: statusFilter as DrugInventory['status'] } : {}),
    ...(locationFilter !== 'all' ? { location: locationFilter } : {}),
    ...(searchQuery ? { search: searchQuery } : {}),
  }), [statusFilter, locationFilter, searchQuery]);

  const { data: inventory = [], isLoading, isError, refetch } = useInventory(filters);
  const { data: alerts } = useInventoryAlerts();
  const createEntry = useCreateInventoryEntry();

  const locations = useMemo(() => {
    const locs = new Set(inventory.map((i) => i.location));
    return Array.from(locs);
  }, [inventory]);

  const stats = useMemo(() => ({
    total: inventory.length,
    lowStock: alerts?.totalLowStock ?? 0,
    expired: alerts?.totalExpired ?? 0,
    available: inventory.filter((i) => i.status === 'AVAILABLE').length,
  }), [inventory, alerts]);

  const handleAddEntry = useCallback(() => {
    if (!newEntry.drugName || !newEntry.lot || !newEntry.expirationDate) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    createEntry.mutate(
      {
        drugName: newEntry.drugName,
        lot: newEntry.lot,
        expirationDate: newEntry.expirationDate,
        quantity: newEntry.quantity,
        minQuantity: newEntry.minQuantity,
        location: newEntry.location,
      },
      {
        onSuccess: () => {
          toast.success('Entrada registrada com sucesso');
          setAddDialogOpen(false);
          setNewEntry({
            drugName: '',
            lot: '',
            expirationDate: '',
            quantity: 0,
            minQuantity: 10,
            location: 'Farmacia Central',
          });
        },
        onError: () => {
          toast.error('Erro ao registrar entrada');
        },
      },
    );
  }, [newEntry, createEntry]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">Disponivel</Badge>;
      case 'LOW_STOCK':
        return <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">Estoque Baixo</Badge>;
      case 'OUT_OF_STOCK':
        return <Badge className="bg-red-500/20 text-red-300 text-[10px]">Sem Estoque</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-red-600/30 text-red-400 text-[10px]">Vencido</Badge>;
      case 'QUARANTINE':
        return <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">Quarentena</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (isLoading) return <PageLoading cards={3} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {(stats.lowStock > 0 || stats.expired > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.lowStock > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">
                {stats.lowStock} item(s) com estoque baixo
              </span>
            </div>
          )}
          {stats.expired > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-300 font-medium">
                {stats.expired} item(s) vencido(s)
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total de Itens', value: stats.total, icon: Package, color: 'text-blue-400', bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10', borderColor: 'border-blue-500/20 hover:border-blue-500/40' },
          { label: 'Disponiveis', value: stats.available, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10', borderColor: 'border-emerald-500/20 hover:border-emerald-500/40' },
          { label: 'Estoque Baixo', value: stats.lowStock, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10', borderColor: 'border-amber-500/20 hover:border-amber-500/40', pulse: stats.lowStock > 0 },
          { label: 'Vencidos', value: stats.expired, icon: Calendar, color: 'text-red-400', bg: 'bg-gradient-to-br from-red-500/20 to-red-600/10', borderColor: 'border-red-500/20 hover:border-red-500/40', pulse: stats.expired > 0 },
        ].map((kpi) => (
          <Card key={kpi.label} className={cn('group relative overflow-hidden border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg', kpi.borderColor)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight">{kpi.value}</p>
                </div>
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110', kpi.bg)}>
                  <kpi.icon className={cn('h-6 w-6', kpi.color)} />
                </div>
              </div>
              {'pulse' in kpi && kpi.pulse && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', kpi.color === 'text-amber-400' ? 'bg-amber-400' : 'bg-red-400')} />
                    <span className={cn('relative inline-flex h-2 w-2 rounded-full', kpi.color === 'text-amber-400' ? 'bg-amber-500' : 'bg-red-500')} />
                  </span>
                  <span className={cn('text-[10px] font-medium', kpi.color)}>Requer atencao</span>
                </div>
              )}
            </CardContent>
            <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100', kpi.bg)} />
          </Card>
        ))}
      </div>

      {/* Filters & Actions */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar medicamento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-background/50 border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="AVAILABLE">Disponivel</SelectItem>
                  <SelectItem value="LOW_STOCK">Estoque Baixo</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Sem Estoque</SelectItem>
                  <SelectItem value="EXPIRED">Vencido</SelectItem>
                  <SelectItem value="QUARANTINE">Quarentena</SelectItem>
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-44 bg-background/50 border-border">
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Locais</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 shadow-lg shadow-teal-500/20 transition-all"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Registrar Entrada
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="border-border bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medicamento</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lote</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Validade</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qtd</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Local</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                        <Package className="h-6 w-6 text-blue-400" />
                      </div>
                      <p className="mt-3 text-sm font-medium">Nenhum item encontrado</p>
                      <p className="text-xs text-muted-foreground">Ajuste os filtros ou registre uma nova entrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id} className={cn('transition-colors', item.status === 'EXPIRED' && 'bg-red-500/5', item.status === 'LOW_STOCK' && 'bg-amber-500/5')}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Pill className={cn('h-3.5 w-3.5', item.status === 'EXPIRED' ? 'text-red-400' : item.status === 'LOW_STOCK' ? 'text-amber-400' : 'text-muted-foreground')} />
                        <span className="font-medium text-sm">{item.drugName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{item.lot}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(item.expirationDate).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      <span className={item.quantity <= item.minQuantity ? 'text-amber-400' : ''}>
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {item.minQuantity}
                    </TableCell>
                    <TableCell className="text-xs">{item.location}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Entrada de Estoque</DialogTitle>
            <DialogDescription>
              Adicione um novo item ao estoque da farmacia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do Medicamento *</Label>
              <Input
                value={newEntry.drugName}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, drugName: e.target.value }))
                }
                placeholder="Ex: Dipirona 500mg"
                className="bg-card border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lote *</Label>
                <Input
                  value={newEntry.lot}
                  onChange={(e) =>
                    setNewEntry((prev) => ({ ...prev, lot: e.target.value }))
                  }
                  placeholder="Ex: LOT2024A"
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label>Validade *</Label>
                <Input
                  type="date"
                  value={newEntry.expirationDate}
                  onChange={(e) =>
                    setNewEntry((prev) => ({
                      ...prev,
                      expirationDate: e.target.value,
                    }))
                  }
                  className="bg-card border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  value={newEntry.quantity}
                  onChange={(e) =>
                    setNewEntry((prev) => ({
                      ...prev,
                      quantity: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="bg-card border-border"
                />
              </div>
              <div>
                <Label>Quantidade Minima</Label>
                <Input
                  type="number"
                  min={0}
                  value={newEntry.minQuantity}
                  onChange={(e) =>
                    setNewEntry((prev) => ({
                      ...prev,
                      minQuantity: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="bg-card border-border"
                />
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Select
                value={newEntry.location}
                onValueChange={(val) =>
                  setNewEntry((prev) => ({ ...prev, location: val }))
                }
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Farmacia Central">Farmacia Central</SelectItem>
                  <SelectItem value="Satelite UTI">Satelite UTI</SelectItem>
                  <SelectItem value="Satelite Emergencia">Satelite Emergencia</SelectItem>
                  <SelectItem value="Satelite Centro Cirurgico">Satelite Centro Cirurgico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-500"
              onClick={handleAddEntry}
              disabled={createEntry.isPending}
            >
              {createEntry.isPending && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Original Pharmacy Content (Prescriptions + Safety + Interactions)
// ============================================================================

function PrescriptionsTab() {
  const [search, setSearch] = useState('');
  const [safetyPanelOpen, setSafetyPanelOpen] = useState(false);
  const [interactionPanelOpen, setInteractionPanelOpen] = useState(false);
  const [selectedDrugs, setSelectedDrugs] = useState<Drug[]>([]);
  const [interactionResults, setInteractionResults] = useState<InteractionResult | null>(null);
  const checkInteractions = useCheckInteractions();
  const { data: prescriptionsData, isLoading, isError, refetch } = usePrescriptions();

  const prescriptions = useMemo(() => prescriptionsData?.data ?? [], [prescriptionsData]);

  const handleAddDrug = useCallback((drug: Drug) => {
    setSelectedDrugs((prev) => {
      if (prev.some((d) => d.id === drug.id)) return prev;
      return [...prev, drug];
    });
    setInteractionResults(null);
  }, []);

  const handleRemoveDrug = useCallback((drugId: string) => {
    setSelectedDrugs((prev) => prev.filter((d) => d.id !== drugId));
    setInteractionResults(null);
  }, []);

  const handleCheckInteractions = useCallback(() => {
    if (selectedDrugs.length < 2) return;
    checkInteractions.mutate(
      selectedDrugs.map((d) => d.id),
      { onSuccess: (data) => setInteractionResults(data) },
    );
  }, [selectedDrugs, checkInteractions]);

  const kpiValues = useMemo(() => {
    const pending = prescriptions.filter((p) => p.status === 'ACTIVE' || p.status === 'DRAFT').length;
    const dispensed = prescriptions.filter((p) => p.status === 'COMPLETED').length;
    const totalItems = prescriptions.reduce((sum, p) => sum + ((p.items ?? []).length), 0);
    const highAlertItems = prescriptions.reduce(
      (sum, p) => sum + ((p.items ?? []).filter((i) => i.isHighAlert).length),
      0,
    );
    return { pending, dispensed, totalItems, highAlertItems };
  }, [prescriptions]);

  if (isLoading) return <PageLoading cards={4} showTable={false} />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Prescricoes Pendentes', value: kpiValues.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10', borderColor: 'border-amber-500/20 hover:border-amber-500/40' },
          { label: 'Dispensadas', value: kpiValues.dispensed, icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-gradient-to-br from-teal-500/20 to-teal-600/10', borderColor: 'border-teal-500/20 hover:border-teal-500/40' },
          { label: 'Itens Alto Alerta', value: kpiValues.highAlertItems, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-gradient-to-br from-red-500/20 to-red-600/10', borderColor: 'border-red-500/20 hover:border-red-500/40', pulse: kpiValues.highAlertItems > 0 },
          { label: 'Total de Itens', value: kpiValues.totalItems, icon: Package, color: 'text-blue-400', bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10', borderColor: 'border-blue-500/20 hover:border-blue-500/40' },
        ].map((kpi) => (
          <Card key={kpi.label} className={cn('group relative overflow-hidden border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg', kpi.borderColor)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight">{kpi.value}</p>
                </div>
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110', kpi.bg)}>
                  <kpi.icon className={cn('h-6 w-6', kpi.color)} />
                </div>
              </div>
              {'pulse' in kpi && kpi.pulse && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  <span className="text-[10px] font-medium text-red-400">Requer atencao</span>
                </div>
              )}
            </CardContent>
            <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100', kpi.bg)} />
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar medicamento ou prescricao..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/50 border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Safety Validation Panel */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => setSafetyPanelOpen((prev) => !prev)}
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Validacao de Seguranca
            </CardTitle>
            {safetyPanelOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {safetyPanelOpen && (
          <CardContent>
            <SafetyValidationForm />
          </CardContent>
        )}
      </Card>

      {/* Drug Interaction Checker */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => setInteractionPanelOpen((prev) => !prev)}
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-400" />
              Verificador de Interacoes Medicamentosas
            </CardTitle>
            {interactionPanelOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {interactionPanelOpen && (
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Adicione dois ou mais medicamentos para verificar interacoes entre eles.
            </p>

            <DrugSearch
              onSelect={handleAddDrug}
              placeholder="Buscar e adicionar medicamento..."
              excludeIds={selectedDrugs.map((d) => d.id)}
            />

            {selectedDrugs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Medicamentos selecionados ({selectedDrugs.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDrugs.map((drug) => (
                    <Badge
                      key={drug.id}
                      variant="secondary"
                      className={cn(
                        'pl-2 pr-1 py-1 text-xs',
                        drug.isHighAlert && 'border-red-500/50 bg-red-500/10 text-red-300',
                      )}
                    >
                      {drug.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveDrug(drug.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={handleCheckInteractions}
                  disabled={selectedDrugs.length < 2 || checkInteractions.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-xs h-8"
                >
                  {checkInteractions.isPending ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="mr-1.5 h-3 w-3" />
                  )}
                  Verificar Interacoes
                </Button>
              </div>
            )}

            {interactionResults && (
              <div className="space-y-3 pt-2 border-t border-border">
                {(interactionResults.interactions ?? []).length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-300">
                      Nenhuma interacao encontrada entre os medicamentos selecionados.
                    </p>
                  </div>
                ) : (
                  <>
                    {interactionResults.hasSevere && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                        <p className="text-sm font-medium text-red-300">
                          Interacoes GRAVES detectadas!
                        </p>
                      </div>
                    )}
                    {(interactionResults.interactions ?? []).map((interaction, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'rounded-lg border p-3 space-y-1.5',
                          interaction.severity === 'SEVERE'
                            ? 'border-red-500/50 bg-red-500/5'
                            : interaction.severity === 'MODERATE'
                              ? 'border-amber-500/50 bg-amber-500/5'
                              : 'border-blue-500/50 bg-blue-500/5',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {interaction.drug1.name} + {interaction.drug2.name}
                          </p>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] text-white',
                              interaction.severity === 'SEVERE'
                                ? 'bg-red-600'
                                : interaction.severity === 'MODERATE'
                                  ? 'bg-amber-600'
                                  : 'bg-blue-600',
                            )}
                          >
                            {interaction.severity === 'SEVERE'
                              ? 'Grave'
                              : interaction.severity === 'MODERATE'
                                ? 'Moderada'
                                : 'Leve'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{interaction.effect}</p>
                        {interaction.management && (
                          <p className="text-xs">
                            <span className="font-medium">Manejo: </span>
                            {interaction.management}
                          </p>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dispensing Queue */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fila de Dispensacao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prescriptions.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Pill className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma prescricao na fila</p>
            </div>
          ) : prescriptions.map((presc) => (
            <div key={presc.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Paciente {presc.patientId.slice(-6)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(presc.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] text-white',
                    presc.status === 'ACTIVE' ? 'bg-teal-600' : presc.status === 'DRAFT' ? 'bg-yellow-600' : 'bg-muted-foreground',
                  )}
                >
                  {presc.status === 'ACTIVE' ? 'Ativa' : presc.status === 'DRAFT' ? 'Rascunho' : presc.status}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {(presc.items ?? []).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <Pill className={cn('h-3 w-3 shrink-0', item.isHighAlert ? 'text-red-400' : 'text-muted-foreground')} />
                    <span className={item.isHighAlert ? 'text-red-300' : ''}>{item.medicationName}</span>
                    <span className="text-muted-foreground">— {item.dose} {item.route} {item.frequency}</span>
                  </div>
                ))}
              </div>
              {presc.requiresDoubleCheck && (
                <div className="mt-3">
                  <DoubleCheckActions
                    prescriptionId={presc.id}
                    requiresDoubleCheck={presc.requiresDoubleCheck}
                    doubleCheckedAt={presc.doubleCheckedAt}
                    doubleCheckedByName={presc.doubleCheckedBy?.name}
                  />
                </div>
              )}
              {presc.status === 'ACTIVE' && (
                <Button size="sm" className="mt-3 bg-teal-600 hover:bg-teal-500 text-xs h-7">
                  <CheckCircle2 className="mr-1.5 h-3 w-3" />
                  Dispensar
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Pharmacy Page
// ============================================================================

export default function PharmacyPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-teal-500/5 via-card to-card p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-500/5 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
            <Pill className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Farmacia</h1>
            <p className="text-sm text-muted-foreground">
              Dispensacao, controle de estoque e verificacao de seguranca
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dispensacao" className="w-full">
        <TabsList className="bg-card/80 border border-border backdrop-blur-sm grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="dispensacao" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <PackageCheck className="h-4 w-4" />
            Dispensacao
          </TabsTrigger>
          <TabsTrigger value="estoque" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <Warehouse className="h-4 w-4" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="prescricoes" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
            <Pill className="h-4 w-4" />
            Prescricoes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dispensacao">
          <DispensationTab />
        </TabsContent>

        <TabsContent value="estoque">
          <InventoryTab />
        </TabsContent>

        <TabsContent value="prescricoes">
          <PrescriptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
