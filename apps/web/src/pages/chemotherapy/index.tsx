import { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Calendar,
  Activity,
  Pill,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  useChemoProtocols,
  useCreateProtocol,
  useChemoCycles,
  useCreateCycle,
  useUpdateCycleStatus,
  type ChemoProtocol,
  type ChemoCycle,
  type ChemoCycleStatus,
} from '@/services/chemotherapy.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

// ============================================================================
// Status config
// ============================================================================

const cycleStatusConfig: Record<
  ChemoCycleStatus,
  { label: string; color: string }
> = {
  PLANNED: { label: 'Planejado', color: 'bg-blue-600' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-amber-600' },
  COMPLETED: { label: 'Concluido', color: 'bg-green-600' },
  SUSPENDED: { label: 'Suspenso', color: 'bg-orange-600' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-600' },
};

const emetogenicColors: Record<string, string> = {
  HIGH: 'bg-red-600',
  MODERATE: 'bg-amber-600',
  LOW: 'bg-blue-600',
  MINIMAL: 'bg-green-600',
};

// ============================================================================
// Main Page
// ============================================================================

export default function ChemotherapyPage() {
  const [activeTab, setActiveTab] = useState('protocolos');
  const [showNewProtocol, setShowNewProtocol] = useState(false);
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [selectedProtocol, setSelectedProtocol] =
    useState<ChemoProtocol | null>(null);
  const [patientIdFilter, setPatientIdFilter] = useState('');

  // Queries
  const {
    data: protocolsData,
    isLoading: loadingProtocols,
    isError: errorProtocols,
    refetch: refetchProtocols,
  } = useChemoProtocols();

  const {
    data: cycles = [],
    isLoading: loadingCycles,
    isError: errorCycles,
    refetch: refetchCycles,
  } = useChemoCycles(patientIdFilter);

  const protocols = protocolsData?.data ?? [];

  // Mutations
  const createProtocol = useCreateProtocol();
  const createCycle = useCreateCycle();
  const updateCycleStatus = useUpdateCycleStatus();

  // Protocol form state
  const [protocolForm, setProtocolForm] = useState({
    name: '',
    regimen: '',
    indication: '',
    cycleDays: '',
    maxCycles: '',
    emetogenicRisk: '',
    notes: '',
    drugsText: '',
  });

  // Cycle form state
  const [cycleForm, setCycleForm] = useState({
    patientId: '',
    protocolId: '',
    cycleNumber: '',
    scheduledDate: '',
    weight: '',
    height: '',
    nurseNotes: '',
  });

  const handleCreateProtocol = () => {
    // Parse drugs from text (one per line: name,dose,unit,route)
    const drugs = (protocolForm.drugsText ?? '')
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const parts = line.split(',').map((s) => s.trim());
        return {
          name: parts[0] || '',
          dose: parseFloat(parts[1] ?? '0') || 0,
          unit: parts[2] || 'mg/m2',
          route: parts[3] || 'IV',
        };
      });

    createProtocol.mutate(
      {
        name: protocolForm.name,
        regimen: protocolForm.regimen,
        indication: protocolForm.indication,
        cycleDays: parseInt(protocolForm.cycleDays, 10) || 21,
        maxCycles: parseInt(protocolForm.maxCycles, 10) || 6,
        emetogenicRisk: protocolForm.emetogenicRisk || undefined,
        notes: protocolForm.notes || undefined,
        drugs,
      },
      {
        onSuccess: () => {
          setShowNewProtocol(false);
          setProtocolForm({
            name: '',
            regimen: '',
            indication: '',
            cycleDays: '',
            maxCycles: '',
            emetogenicRisk: '',
            notes: '',
            drugsText: '',
          });
        },
      },
    );
  };

  const handleCreateCycle = () => {
    createCycle.mutate(
      {
        patientId: cycleForm.patientId,
        protocolId: cycleForm.protocolId,
        cycleNumber: parseInt(cycleForm.cycleNumber, 10) || 1,
        scheduledDate: cycleForm.scheduledDate,
        weight: cycleForm.weight ? parseFloat(cycleForm.weight) : undefined,
        height: cycleForm.height ? parseFloat(cycleForm.height) : undefined,
        nurseNotes: cycleForm.nurseNotes || undefined,
      },
      {
        onSuccess: () => {
          setShowNewCycle(false);
          setCycleForm({
            patientId: '',
            protocolId: '',
            cycleNumber: '',
            scheduledDate: '',
            weight: '',
            height: '',
            nurseNotes: '',
          });
        },
      },
    );
  };

  const handleStatusChange = (cycleId: string, status: ChemoCycleStatus) => {
    updateCycleStatus.mutate({ cycleId, status });
  };

  // Loading / Error
  if (activeTab === 'protocolos' && loadingProtocols)
    return <PageLoading cards={2} showTable />;
  if (activeTab === 'protocolos' && errorProtocols)
    return <PageError onRetry={() => refetchProtocols()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          <h1 className="text-2xl font-bold tracking-tight">Quimioterapia</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger
            value="protocolos"
            className="text-xs data-[state=active]:bg-teal-600"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Protocolos
          </TabsTrigger>
          <TabsTrigger
            value="ciclos"
            className="text-xs data-[state=active]:bg-teal-600"
          >
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Ciclos
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* Protocols Tab */}
        {/* ================================================================ */}
        <TabsContent value="protocolos" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowNewProtocol(true)}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Novo Protocolo
            </Button>
          </div>

          {protocols.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Pill className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum protocolo cadastrado
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowNewProtocol(true)}
                >
                  Cadastrar Protocolo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Protocolos ({protocolsData?.total ?? 0})
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Nome
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">
                        Regime
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">
                        Indicacao
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">
                        Dias/Ciclo
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">
                        Max Ciclos
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">
                        Risco Emetico
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">
                        Ciclos Ativos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {protocols.map((protocol) => (
                      <tr
                        key={protocol.id}
                        onClick={() => setSelectedProtocol(protocol)}
                        className="cursor-pointer transition-colors hover:bg-accent/30"
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {protocol.name}
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-teal-600 dark:text-teal-400">
                            {protocol.regimen}
                          </code>
                        </td>
                        <td className="hidden max-w-xs truncate px-4 py-3 text-sm text-muted-foreground md:table-cell">
                          {protocol.indication}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {protocol.cycleDays}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {protocol.maxCycles}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {protocol.emetogenicRisk ? (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] text-white',
                                emetogenicColors[protocol.emetogenicRisk] ??
                                  'bg-zinc-600',
                              )}
                            >
                              {protocol.emetogenicRisk}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {protocol._count?.cycles ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* Cycles Tab */}
        {/* ================================================================ */}
        <TabsContent value="ciclos" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                ID Paciente:
              </Label>
              <Input
                placeholder="UUID do paciente"
                value={patientIdFilter}
                onChange={(e) => setPatientIdFilter(e.target.value)}
                className="max-w-xs bg-card border-border font-mono text-xs"
              />
            </div>
            <Button
              onClick={() => setShowNewCycle(true)}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Novo Ciclo
            </Button>
          </div>

          {!patientIdFilter ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Activity className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Insira o ID do paciente para visualizar os ciclos
                </p>
              </CardContent>
            </Card>
          ) : loadingCycles ? (
            <PageLoading cards={0} showTable />
          ) : errorCycles ? (
            <PageError onRetry={() => refetchCycles()} />
          ) : cycles.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Calendar className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum ciclo encontrado para este paciente
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Ciclos — {cycles[0]?.patient?.fullName ?? 'Paciente'}
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Paciente
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Protocolo
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">
                        Ciclo
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">
                        Data Agendada
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell text-center">
                        BSA (m2)
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        Acao
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {cycles.map((cycle: ChemoCycle) => (
                      <tr
                        key={cycle.id}
                        className="transition-colors hover:bg-accent/30"
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {cycle.patient?.fullName ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-teal-600 dark:text-teal-400">
                            {cycle.protocol?.regimen ?? '—'}
                          </code>
                          <span className="ml-2 text-muted-foreground text-xs">
                            {cycle.protocol?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-bold">
                          {cycle.cycleNumber}
                          {cycle.protocol?.maxCycles
                            ? `/${cycle.protocol.maxCycles}`
                            : ''}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] text-white',
                              cycleStatusConfig[cycle.status]?.color,
                            )}
                          >
                            {cycleStatusConfig[cycle.status]?.label ??
                              cycle.status}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                          {new Date(cycle.scheduledDate).toLocaleDateString(
                            'pt-BR',
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-center md:table-cell">
                          {cycle.bsa ? cycle.bsa.toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {cycle.status === 'PLANNED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() =>
                                handleStatusChange(cycle.id, 'IN_PROGRESS')
                              }
                              disabled={updateCycleStatus.isPending}
                            >
                              Iniciar
                            </Button>
                          )}
                          {cycle.status === 'IN_PROGRESS' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() =>
                                handleStatusChange(cycle.id, 'COMPLETED')
                              }
                              disabled={updateCycleStatus.isPending}
                            >
                              Concluir
                            </Button>
                          )}
                          {(cycle.status === 'COMPLETED' ||
                            cycle.status === 'CANCELLED' ||
                            cycle.status === 'SUSPENDED') && (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ================================================================== */}
      {/* New Protocol Dialog */}
      {/* ================================================================== */}
      <Dialog open={showNewProtocol} onOpenChange={setShowNewProtocol}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Protocolo de Quimioterapia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input
                  placeholder="Ex: FOLFOX-6"
                  value={protocolForm.name}
                  onChange={(e) =>
                    setProtocolForm({ ...protocolForm, name: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Regime *</Label>
                <Input
                  placeholder="Ex: FOLFOX"
                  value={protocolForm.regimen}
                  onChange={(e) =>
                    setProtocolForm({
                      ...protocolForm,
                      regimen: e.target.value,
                    })
                  }
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Indicacao *</Label>
              <Input
                placeholder="Ex: Cancer colorretal metastatico"
                value={protocolForm.indication}
                onChange={(e) =>
                  setProtocolForm({
                    ...protocolForm,
                    indication: e.target.value,
                  })
                }
                className="bg-background border-border"
              />
            </div>

            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Dias/Ciclo *</Label>
                <Input
                  type="number"
                  placeholder="21"
                  value={protocolForm.cycleDays}
                  onChange={(e) =>
                    setProtocolForm({
                      ...protocolForm,
                      cycleDays: e.target.value,
                    })
                  }
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Ciclos *</Label>
                <Input
                  type="number"
                  placeholder="6"
                  value={protocolForm.maxCycles}
                  onChange={(e) =>
                    setProtocolForm({
                      ...protocolForm,
                      maxCycles: e.target.value,
                    })
                  }
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Risco Emetico</Label>
                <Select
                  value={protocolForm.emetogenicRisk}
                  onValueChange={(val) =>
                    setProtocolForm({ ...protocolForm, emetogenicRisk: val })
                  }
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">Alto</SelectItem>
                    <SelectItem value="MODERATE">Moderado</SelectItem>
                    <SelectItem value="LOW">Baixo</SelectItem>
                    <SelectItem value="MINIMAL">Minimo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Drogas (uma por linha: nome,dose,unidade,via)
              </Label>
              <Textarea
                placeholder={
                  'Oxaliplatina,85,mg/m2,IV\nLeucovorin,400,mg/m2,IV\n5-FU,400,mg/m2,IV bolus'
                }
                rows={4}
                value={protocolForm.drugsText}
                onChange={(e) =>
                  setProtocolForm({
                    ...protocolForm,
                    drugsText: e.target.value,
                  })
                }
                className="bg-background border-border font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observacoes</Label>
              <Textarea
                placeholder="Notas adicionais..."
                rows={2}
                value={protocolForm.notes}
                onChange={(e) =>
                  setProtocolForm({ ...protocolForm, notes: e.target.value })
                }
                className="bg-background border-border"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowNewProtocol(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateProtocol}
                disabled={
                  !protocolForm.name ||
                  !protocolForm.regimen ||
                  !protocolForm.indication ||
                  !protocolForm.drugsText ||
                  createProtocol.isPending
                }
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createProtocol.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* New Cycle Dialog */}
      {/* ================================================================== */}
      <Dialog open={showNewCycle} onOpenChange={setShowNewCycle}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Ciclo de Quimioterapia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">ID Paciente *</Label>
                <Input
                  placeholder="UUID"
                  value={cycleForm.patientId}
                  onChange={(e) =>
                    setCycleForm({ ...cycleForm, patientId: e.target.value })
                  }
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Protocolo *</Label>
                <Select
                  value={cycleForm.protocolId}
                  onValueChange={(val) =>
                    setCycleForm({ ...cycleForm, protocolId: val })
                  }
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {protocols.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.regimen})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Numero do Ciclo *</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={cycleForm.cycleNumber}
                  onChange={(e) =>
                    setCycleForm({ ...cycleForm, cycleNumber: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Data Agendada *</Label>
                <Input
                  type="date"
                  value={cycleForm.scheduledDate}
                  onChange={(e) =>
                    setCycleForm({
                      ...cycleForm,
                      scheduledDate: e.target.value,
                    })
                  }
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="70.0"
                  value={cycleForm.weight}
                  onChange={(e) =>
                    setCycleForm({ ...cycleForm, weight: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Altura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="170.0"
                  value={cycleForm.height}
                  onChange={(e) =>
                    setCycleForm({ ...cycleForm, height: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>
            </div>

            {cycleForm.weight && cycleForm.height && (
              <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3">
                <p className="text-xs text-muted-foreground">
                  BSA Estimado (DuBois)
                </p>
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                  {(
                    0.007184 *
                    Math.pow(parseFloat(cycleForm.weight) || 0, 0.425) *
                    Math.pow(parseFloat(cycleForm.height) || 0, 0.725)
                  ).toFixed(4)}{' '}
                  m2
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Notas de Enfermagem</Label>
              <Textarea
                placeholder="Observacoes..."
                rows={2}
                value={cycleForm.nurseNotes}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, nurseNotes: e.target.value })
                }
                className="bg-background border-border"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNewCycle(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCycle}
                disabled={
                  !cycleForm.patientId ||
                  !cycleForm.protocolId ||
                  !cycleForm.scheduledDate ||
                  createCycle.isPending
                }
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createCycle.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Protocol Detail Dialog */}
      {/* ================================================================== */}
      <Dialog
        open={!!selectedProtocol}
        onOpenChange={() => setSelectedProtocol(null)}
      >
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProtocol?.name}{' '}
              <span className="text-muted-foreground font-normal">
                ({selectedProtocol?.regimen})
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedProtocol && (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Indicacao</p>
                  <p>{selectedProtocol.indication}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risco Emetico</p>
                  <p>{selectedProtocol.emetogenicRisk ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dias/Ciclo</p>
                  <p>{selectedProtocol.cycleDays}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Ciclos</p>
                  <p>{selectedProtocol.maxCycles}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Drogas</p>
                <div className="space-y-1">
                  {(
                    (Array.isArray(selectedProtocol.drugs) ? selectedProtocol.drugs : []) as Array<{
                      name: string;
                      dose: number;
                      unit: string;
                      route?: string;
                    }>
                  ).map((drug, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{drug.name}</span>
                      <span className="text-muted-foreground">
                        {drug.dose} {drug.unit} {drug.route ? `(${drug.route})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedProtocol.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Observacoes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProtocol.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
