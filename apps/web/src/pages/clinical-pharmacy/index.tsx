import { useState } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Plus,
  CheckCircle,
  XCircle,
  TrendingUp,
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
  usePendingValidation,
  useInterventions,
  useInterventionMetrics,
  useValidatePrescription,
  useCreateIntervention,
  type PrescriptionForValidation,
  type PharmacistIntervention,
  type PharmacyAlert,
} from '@/services/clinical-pharmacy.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALERT_SEVERITY: Record<string, string> = {
  INFO: 'border-blue-500 text-blue-400',
  WARNING: 'border-amber-500 text-amber-400',
  CRITICAL: 'border-red-500 text-red-400',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  RENAL_ADJUSTMENT: 'Ajuste Renal',
  HEPATIC_ADJUSTMENT: 'Ajuste Hepático',
  INTERACTION: 'Interação',
  ALLERGY: 'Alergia',
  DUPLICATE: 'Duplicidade',
  DOSE_RANGE: 'Dose Fora do Range',
};

const INTERVENTION_TYPE_LABELS: Record<string, string> = {
  DOSE_ADJUSTMENT: 'Ajuste de Dose',
  ROUTE_CHANGE: 'Mudança de Via',
  SUBSTITUTION: 'Substituição',
  SUSPENSION: 'Suspensão',
  ADDITION: 'Adição',
  MONITORING: 'Monitoramento',
  EDUCATION: 'Educação',
};

const IMPACT_LABELS: Record<string, string> = {
  PREVENTED_HARM: 'Dano Prevenido',
  OPTIMIZED_THERAPY: 'Terapia Otimizada',
  COST_SAVING: 'Economia de Custo',
  EDUCATIONAL: 'Educacional',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClinicalPharmacyPage() {
  const [activeTab, setActiveTab] = useState('validations');
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionForValidation | null>(null);
  const [validateForm, setValidateForm] = useState({ action: '', notes: '', modifications: '' });
  const [showIntervention, setShowIntervention] = useState(false);
  const [interventionForm, setInterventionForm] = useState({
    prescriptionId: '',
    type: '',
    description: '',
    impact: '',
  });

  const { data: pending = [], isLoading: loadingPending, isError, refetch } = usePendingValidation();
  const { data: interventions = [], isLoading: loadingInterventions } = useInterventions();
  const { data: metrics, isLoading: loadingMetrics } = useInterventionMetrics();

  const validatePrescription = useValidatePrescription();
  const createIntervention = useCreateIntervention();

  const handleValidate = async () => {
    if (!selectedPrescription || !validateForm.action) {
      toast.error('Selecione uma ação.');
      return;
    }
    try {
      await validatePrescription.mutateAsync({
        prescriptionId: selectedPrescription.id,
        action: validateForm.action as 'APPROVE' | 'REJECT' | 'MODIFY',
        notes: validateForm.notes || undefined,
        modifications: validateForm.modifications || undefined,
      });
      toast.success('Prescrição validada com sucesso.');
      setSelectedPrescription(null);
      setValidateForm({ action: '', notes: '', modifications: '' });
    } catch {
      toast.error('Erro ao validar prescrição.');
    }
  };

  const handleCreateIntervention = async () => {
    if (!interventionForm.prescriptionId || !interventionForm.type || !interventionForm.description || !interventionForm.impact) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createIntervention.mutateAsync(interventionForm);
      toast.success('Intervenção registrada.');
      setShowIntervention(false);
      setInterventionForm({ prescriptionId: '', type: '', description: '', impact: '' });
    } catch {
      toast.error('Erro ao registrar intervenção.');
    }
  };

  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Farmácia Clínica</h1>
            <p className="text-sm text-muted-foreground">Validação farmacêutica, intervenções e monitoramento terapêutico</p>
          </div>
        </div>
        <Button onClick={() => setShowIntervention(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Nova Intervenção
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="validations" className="text-xs data-[state=active]:bg-emerald-600">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Validações Pendentes
            {pending.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-red-600">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="interventions" className="text-xs data-[state=active]:bg-emerald-600">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Intervenções
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs data-[state=active]:bg-emerald-600">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Monitoramento Terapêutico
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Validações ─────────────────────────────────────────────── */}
        <TabsContent value="validations" className="space-y-4 mt-4">
          {loadingPending ? (
            <PageLoading cards={2} showTable />
          ) : pending.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma prescrição aguardando validação</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((rx: PrescriptionForValidation) => {
                const criticals = rx.items.flatMap((i) => i.alerts).filter((a: PharmacyAlert) => a.severity === 'CRITICAL');
                const warnings = rx.items.flatMap((i) => i.alerts).filter((a: PharmacyAlert) => a.severity === 'WARNING');
                return (
                  <Card
                    key={rx.id}
                    className="border-border bg-card cursor-pointer hover:bg-accent/20 transition-colors"
                    onClick={() => setSelectedPrescription(rx)}
                  >
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{rx.patientName}</p>
                            {rx.bed && (
                              <Badge variant="outline" className="text-xs">{rx.bed}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Prontuário: {rx.mrn} • Prescrito por: {rx.prescribedBy}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rx.items.length} itens •{' '}
                            {new Date(rx.prescribedAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {criticals.length > 0 && (
                            <Badge className="bg-red-600 text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {criticals.length} crítico{criticals.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {warnings.length > 0 && (
                            <Badge className="bg-amber-600 text-xs">
                              {warnings.length} alerta{warnings.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Intervenções ───────────────────────────────────────────── */}
        <TabsContent value="interventions" className="space-y-4 mt-4">
          {loadingInterventions ? (
            <PageLoading cards={1} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Histórico de Intervenções ({interventions.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Impacto</TableHead>
                    <TableHead>Aceita</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interventions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma intervenção registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    interventions.map((iv: PharmacistIntervention) => (
                      <TableRow key={iv.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{iv.patientName}</p>
                            <p className="text-xs text-muted-foreground">{iv.mrn}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {INTERVENTION_TYPE_LABELS[iv.type] ?? iv.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm truncate">{iv.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {IMPACT_LABELS[iv.impact] ?? iv.impact}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {iv.accepted === null ? (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">Aguardando</Badge>
                          ) : iv.accepted ? (
                            <Badge className="text-xs bg-emerald-600">
                              <CheckCircle className="mr-1 h-3 w-3" />Aceita
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="mr-1 h-3 w-3" />Recusada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(iv.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Monitoramento ──────────────────────────────────────────── */}
        <TabsContent value="monitoring" className="space-y-4 mt-4">
          {loadingMetrics ? (
            <PageLoading cards={4} />
          ) : metrics ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Total de Intervenções</p>
                    <p className="text-3xl font-bold text-emerald-500">{metrics.totalInterventions}</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Taxa de Aceitação</p>
                    <p className="text-3xl font-bold text-blue-400">{metrics.acceptanceRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Danos Prevenidos</p>
                    <p className="text-3xl font-bold text-red-400">{metrics.preventedHarms}</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Economia Gerada</p>
                    <p className="text-3xl font-bold text-amber-400">
                      {metrics.costSavings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Intervenções por Tipo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metrics.byType.map((item) => {
                    const pct = metrics.totalInterventions > 0
                      ? (item.count / metrics.totalInterventions) * 100
                      : 0;
                    return (
                      <div key={item.type} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{INTERVENTION_TYPE_LABELS[item.type] ?? item.type}</span>
                          <span className="text-muted-foreground">{item.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <TrendingUp className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum dado de monitoramento disponível</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Validate Prescription Dialog ──────────────────────────────────── */}
      <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Validar Prescrição — {selectedPrescription?.patientName}</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-4">
              {selectedPrescription.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{item.medicationName}</p>
                    <p className="text-xs text-muted-foreground">{item.dose} • {item.route} • {item.frequency}</p>
                  </div>
                  {item.alerts.length > 0 && (
                    <div className="space-y-1">
                      {item.alerts.map((alert: PharmacyAlert) => (
                        <div
                          key={alert.id}
                          className={cn('flex items-start gap-2 rounded border px-2 py-1.5 text-xs', ALERT_SEVERITY[alert.severity])}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>
                            <strong>{ALERT_TYPE_LABELS[alert.type] ?? alert.type}:</strong>{' '}
                            {alert.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="space-y-3 border-t border-border pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Decisão do Farmacêutico *</Label>
                  <Select
                    value={validateForm.action}
                    onValueChange={(v) => setValidateForm({ ...validateForm, action: v })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVE">Aprovar</SelectItem>
                      <SelectItem value="MODIFY">Aprovar com Modificação</SelectItem>
                      <SelectItem value="REJECT">Rejeitar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Input
                    placeholder="Justificativa clínica..."
                    value={validateForm.notes}
                    onChange={(e) => setValidateForm({ ...validateForm, notes: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPrescription(null)}>Cancelar</Button>
            <Button
              onClick={handleValidate}
              disabled={!validateForm.action || validatePrescription.isPending}
              className={cn(
                validateForm.action === 'REJECT' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              {validatePrescription.isPending ? 'Salvando...' : 'Confirmar Validação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Intervention Dialog ──────────────────────────────────────── */}
      <Dialog open={showIntervention} onOpenChange={setShowIntervention}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Intervenção Farmacêutica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">ID da Prescrição *</Label>
              <Input
                placeholder="UUID da prescrição"
                value={interventionForm.prescriptionId}
                onChange={(e) => setInterventionForm({ ...interventionForm, prescriptionId: e.target.value })}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo *</Label>
              <Select
                value={interventionForm.type}
                onValueChange={(v) => setInterventionForm({ ...interventionForm, type: v })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INTERVENTION_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição *</Label>
              <Input
                placeholder="Descreva a intervenção..."
                value={interventionForm.description}
                onChange={(e) => setInterventionForm({ ...interventionForm, description: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Impacto *</Label>
              <Select
                value={interventionForm.impact}
                onValueChange={(v) => setInterventionForm({ ...interventionForm, impact: v })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIntervention(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateIntervention}
              disabled={createIntervention.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createIntervention.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
