import { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  BarChart3,
  Pill,
  Microscope,
  TrendingDown,
  Clock,
  CheckCircle,
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
  useAntimicrobialUsage,
  useAntibiogram,
  useStewDashboard,
  useCreateUsageRecord,
  useDeescalate,
  type AntimicrobialUsage,
  type InstitutionalAntibiogram,
} from '@/services/antimicrobial-stewardship.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const SENSITIVITY_COLOR = (pct: number) => {
  if (pct >= 80) return 'bg-emerald-500/20 text-emerald-400';
  if (pct >= 50) return 'bg-amber-500/20 text-amber-400';
  return 'bg-red-500/20 text-red-400';
};

const STATUS_CONFIG = {
  ATIVO: { label: 'Ativo', color: 'bg-blue-500/20 text-blue-400' },
  CONCLUIDO: { label: 'Concluído', color: 'bg-zinc-500/20 text-zinc-400' },
  SUSPENSO: { label: 'Suspenso', color: 'bg-amber-500/20 text-amber-400' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AntimicrobialStewardshipPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('30d');
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    patientId: '',
    drug: '',
    startDate: '',
    indication: '',
    culture: '',
    sensitivity: '',
  });

  const { data: usageList = [], isLoading: loadingUsage, isError, refetch } = useAntimicrobialUsage();
  const { data: antibiogram = [], isLoading: loadingAntibiogram } = useAntibiogram();
  const { data: dashboard, isLoading: loadingDashboard } = useStewDashboard(period);

  const createUsageRecord = useCreateUsageRecord();
  const deescalate = useDeescalate();

  const activeUsage = usageList.filter((u: AntimicrobialUsage) => u.status === 'ATIVO');
  const deescalationCandidates = activeUsage.filter((u: AntimicrobialUsage) => u.culture && !u.deescalated);

  const handleCreate = async () => {
    if (!newForm.patientId || !newForm.drug || !newForm.startDate || !newForm.indication) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    try {
      await createUsageRecord.mutateAsync({
        ...newForm,
        culture: newForm.culture || undefined,
        sensitivity: newForm.sensitivity || undefined,
      });
      toast.success('Uso de antimicrobiano registrado.');
      setShowNew(false);
      setNewForm({ patientId: '', drug: '', startDate: '', indication: '', culture: '', sensitivity: '' });
    } catch {
      toast.error('Erro ao registrar uso.');
    }
  };

  const handleDeescalate = async (id: string, drug: string) => {
    try {
      await deescalate.mutateAsync(id);
      toast.success(`De-escalação de ${drug} registrada.`);
    } catch {
      toast.error('Erro ao registrar de-escalação.');
    }
  };

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setNewForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stewardship de Antimicrobianos</h1>
            <p className="text-sm text-muted-foreground">DDD, duração terapêutica, de-escalação e antibiograma institucional</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Registrar Uso
        </Button>
      </div>

      {/* De-escalation alert */}
      {deescalationCandidates.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
          <TrendingDown className="h-4 w-4 shrink-0" />
          <span>
            {deescalationCandidates.length} paciente(s) com cultura disponível e elegível(is) para de-escalação
          </span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="dashboard" className="text-xs data-[state=active]:bg-emerald-600">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="usage" className="text-xs data-[state=active]:bg-emerald-600">
            <Pill className="mr-1.5 h-3.5 w-3.5" />
            Uso de Antimicrobianos
          </TabsTrigger>
          <TabsTrigger value="antibiogram" className="text-xs data-[state=active]:bg-emerald-600">
            <Microscope className="mr-1.5 h-3.5 w-3.5" />
            Antibiograma Institucional
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Dashboard ──────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              {[
                { label: '7 dias', value: '7d' },
                { label: '30 dias', value: '30d' },
                { label: '90 dias', value: '90d' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    'rounded px-3 py-1 text-xs transition-colors',
                    period === opt.value ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {loadingDashboard ? (
            <PageLoading cards={4} />
          ) : dashboard ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-blue-400" />
                      <p className="text-xs text-muted-foreground">DDD Total</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-400">{dashboard.totalDDD.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Doses Diárias Definidas</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <p className="text-xs text-muted-foreground">Duração Média</p>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{dashboard.avgDuration.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-1">dias de tratamento</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-emerald-400" />
                      <p className="text-xs text-muted-foreground">Taxa de De-escalação</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">{dashboard.deescalationRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">dos casos elegíveis</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Microscope className="h-4 w-4 text-purple-400" />
                      <p className="text-xs text-muted-foreground">Coleta de Cultura</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-400">{dashboard.cultureComplianceRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">antes do antibiótico</p>
                  </CardContent>
                </Card>
              </div>

              {/* KPI gauges */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Taxa de De-escalação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Meta: ≥ 60%</span>
                      <span className={cn(
                        dashboard.deescalationRate >= 60 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                        {dashboard.deescalationRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          dashboard.deescalationRate >= 60 ? 'bg-emerald-500' : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min(dashboard.deescalationRate, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Conformidade com Coleta de Cultura</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Meta: ≥ 80%</span>
                      <span className={cn(
                        dashboard.cultureComplianceRate >= 80 ? 'text-emerald-400' : 'text-amber-400',
                      )}>
                        {dashboard.cultureComplianceRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          dashboard.cultureComplianceRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500',
                        )}
                        style={{ width: `${Math.min(dashboard.cultureComplianceRate, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <BarChart3 className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Uso de Antimicrobianos ─────────────────────────────────── */}
        <TabsContent value="usage" className="space-y-4 mt-4">
          {loadingUsage ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Antimicrobianos em Uso ({usageList.length})
                  {deescalationCandidates.length > 0 && (
                    <Badge className="ml-2 bg-amber-600 text-xs">{deescalationCandidates.length} candidatos à de-escalação</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Antimicrobiano</TableHead>
                    <TableHead>Indicação</TableHead>
                    <TableHead className="text-center">DDD</TableHead>
                    <TableHead>Cultura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>De-escalação</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum registro de uso de antimicrobiano
                      </TableCell>
                    </TableRow>
                  ) : (
                    usageList.map((usage: AntimicrobialUsage) => (
                      <TableRow key={usage.id}>
                        <TableCell className="font-medium text-sm">{usage.patientName}</TableCell>
                        <TableCell>
                          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-emerald-400">
                            {usage.drug}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm max-w-32 truncate">{usage.indication}</TableCell>
                        <TableCell className="text-center font-bold">{usage.ddd.toFixed(1)}</TableCell>
                        <TableCell className="text-sm">
                          {usage.culture ? (
                            <div>
                              <p className="truncate max-w-28">{usage.culture}</p>
                              {usage.sensitivity && (
                                <p className="text-xs text-muted-foreground truncate max-w-28">{usage.sensitivity}</p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs border-red-500 text-red-400">Sem coleta</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', STATUS_CONFIG[usage.status]?.color)}
                          >
                            {STATUS_CONFIG[usage.status]?.label ?? usage.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {usage.deescalated ? (
                            <Badge className="text-xs bg-emerald-600 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Realizada
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não realizada</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {usage.status === 'ATIVO' && usage.culture && !usage.deescalated && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-amber-500 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => handleDeescalate(usage.id, usage.drug)}
                              disabled={deescalate.isPending}
                            >
                              <TrendingDown className="mr-1 h-3 w-3" />
                              De-escalar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Antibiograma ───────────────────────────────────────────── */}
        <TabsContent value="antibiogram" className="space-y-4 mt-4">
          {loadingAntibiogram ? (
            <PageLoading cards={0} showTable />
          ) : antibiogram.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Microscope className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Antibiograma institucional não disponível</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Antibiograma Institucional Consolidado</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Porcentagem de sensibilidade (S%) por organismo. Verde ≥ 80%, Amarelo 50–79%, Vermelho &lt; 50%.
                </p>
              </CardHeader>
              <div className="overflow-x-auto">
                {antibiogram.map((org: InstitutionalAntibiogram) => (
                  <div key={org.organism} className="border-b border-border last:border-0">
                    <div className="px-4 py-2 bg-background/50">
                      <p className="text-sm font-semibold italic">{org.organism}</p>
                    </div>
                    <div className="px-4 py-3 flex flex-wrap gap-2">
                      {org.antibiotics.map((ab) => (
                        <div
                          key={ab.name}
                          className={cn(
                            'flex flex-col items-center rounded border px-3 py-2 min-w-[80px]',
                            SENSITIVITY_COLOR(ab.sensitivity),
                          )}
                        >
                          <p className="text-xs font-medium text-center leading-tight">{ab.name}</p>
                          <p className="text-lg font-bold mt-1">{ab.sensitivity}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── New Usage Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Uso de Antimicrobiano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ID do Paciente *</Label>
                <Input
                  placeholder="UUID"
                  value={newForm.patientId}
                  onChange={setField('patientId')}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Antimicrobiano *</Label>
                <Input
                  placeholder="Ex: Meropenem"
                  value={newForm.drug}
                  onChange={setField('drug')}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Início *</Label>
                <Input
                  type="date"
                  value={newForm.startDate}
                  onChange={setField('startDate')}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Indicação *</Label>
                <Input
                  placeholder="Ex: Pneumonia"
                  value={newForm.indication}
                  onChange={setField('indication')}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cultura (organismo isolado)</Label>
              <Input
                placeholder="Ex: Klebsiella pneumoniae"
                value={newForm.culture}
                onChange={setField('culture')}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sensibilidade</Label>
              <Input
                placeholder="Ex: Sensível a Imipenem"
                value={newForm.sensitivity}
                onChange={setField('sensitivity')}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={createUsageRecord.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createUsageRecord.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
