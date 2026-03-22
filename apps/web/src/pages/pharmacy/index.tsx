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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePrescriptions } from '@/services/prescriptions.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { SafetyValidationForm, DoubleCheckActions } from '@/components/medical/prescription-safety-panel';
import { DrugSearch } from '@/components/drug-search';
import {
  useCheckInteractions,
  type Drug,
  type InteractionResult,
} from '@/services/drugs.service';

export default function PharmacyPage() {
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
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Farmácia</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Prescrições Pendentes', value: String(kpiValues.pending), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Dispensadas', value: String(kpiValues.dispensed), icon: CheckCircle2, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' },
          { label: 'Itens Alto Alerta', value: String(kpiValues.highAlertItems), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Total de Itens', value: String(kpiValues.totalItems), icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', kpi.bg)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar medicamento ou prescrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

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
              Validação de Segurança
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
              Verificador de Interações Medicamentosas
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
              Adicione dois ou mais medicamentos para verificar interações entre eles.
            </p>

            <DrugSearch
              onSelect={handleAddDrug}
              placeholder="Buscar e adicionar medicamento..."
              excludeIds={selectedDrugs.map((d) => d.id)}
            />

            {/* Selected drugs */}
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
                  Verificar Interações
                </Button>
              </div>
            )}

            {/* Interaction results */}
            {interactionResults && (
              <div className="space-y-3 pt-2 border-t border-border">
                {(interactionResults.interactions ?? []).length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-300">
                      Nenhuma interação encontrada entre os medicamentos selecionados.
                    </p>
                  </div>
                ) : (
                  <>
                    {interactionResults.hasSevere && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                        <p className="text-sm font-medium text-red-300">
                          Interações GRAVES detectadas!
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
          <CardTitle className="text-base">Fila de Dispensação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prescriptions.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Pill className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma prescrição na fila</p>
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
