import { useState } from 'react';
import { toast } from 'sonner';
import {
  FlaskConical,
  ClipboardList,
  ShieldCheck,
  FileText,
  Settings2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Bell,
  BellOff,
  GitBranch,
  TestTube,
  Smartphone,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Siren,
  Ban,
  Clock4,
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
  DialogTrigger,
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
  useLisWorklist,
  useQCResults,
  useDeltaChecks,
  useAutoReleaseRules,
  useRegisterSample,
  useUpdateSampleStatus,
  useAcknowledgeDeltaCheck,
  useReflexRules,
  useCreateReflexRule,
  useRequestAddOn,
  useRecordPocResult,
  useInterpretLabPanel,
  usePredictResult,
  useDetectSampleSwap,
  usePredictCriticalValue,
  usePredictSampleRejection,
  usePredictTat,
  type SampleStatus,
  type WorklistItem,
  type QCResult,
  type ReflexRule,
  type LabPanelInterpretation,
  type ResultPrediction,
  type SwapDetectionResult,
  type CriticalValuePrediction,
  type SampleRejectionPrediction,
  type TatPrediction,
} from '@/services/lis.service';

// ─── Status helpers ───────────────────────────────────────────────────────────

function sampleStatusBadge(status: SampleStatus) {
  const map: Record<SampleStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    COLETADO: { variant: 'outline' },
    RECEBIDO: { variant: 'secondary' },
    PROCESSANDO: { variant: 'secondary' },
    LIBERADO: { variant: 'default' },
    CANCELADO: { variant: 'destructive' },
  };
  return <Badge variant={map[status].variant}>{status}</Badge>;
}

function qcStatusIcon(status: QCResult['status']) {
  if (status === 'APROVADO') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'ALERTA') return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

// ─── Register Sample Dialog ───────────────────────────────────────────────────

function RegisterSampleDialog() {
  const [open, setOpen] = useState(false);
  const registerSample = useRegisterSample();
  const [form, setForm] = useState({
    barcode: '',
    patientId: '',
    material: '',
    exams: '',
    collectedBy: '',
  });

  const handleSubmit = () => {
    if (!form.barcode || !form.patientId || !form.material || !form.collectedBy) return;
    registerSample.mutate(
      {
        barcode: form.barcode,
        patientId: form.patientId,
        material: form.material,
        exams: form.exams.split(',').map((e) => e.trim()).filter(Boolean),
        collectedBy: form.collectedBy,
      },
      {
        onSuccess: () => {
          toast.success('Amostra registrada com sucesso');
          setOpen(false);
          setForm({ barcode: '', patientId: '', material: '', exams: '', collectedBy: '' });
        },
        onError: () => toast.error('Erro ao registrar amostra'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Amostra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nova Amostra</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Código de Barras</Label>
              <Input
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                placeholder="Ex: LIS-2024-001"
              />
            </div>
            <div className="space-y-1">
              <Label>Material</Label>
              <Input
                value={form.material}
                onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                placeholder="Sangue, Urina, LCR..."
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>ID do Paciente</Label>
            <Input
              value={form.patientId}
              onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              placeholder="UUID do paciente"
            />
          </div>
          <div className="space-y-1">
            <Label>Exames (separados por vírgula)</Label>
            <Input
              value={form.exams}
              onChange={(e) => setForm((f) => ({ ...f, exams: e.target.value }))}
              placeholder="Hemograma, PCR, Glicemia..."
            />
          </div>
          <div className="space-y-1">
            <Label>Coletado por</Label>
            <Input
              value={form.collectedBy}
              onChange={(e) => setForm((f) => ({ ...f, collectedBy: e.target.value }))}
              placeholder="Nome do profissional"
            />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!form.barcode || !form.patientId || !form.material || !form.collectedBy || registerSample.isPending}
            onClick={handleSubmit}
          >
            {registerSample.isPending ? 'Registrando...' : 'Registrar Amostra'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Worklist Tab ─────────────────────────────────────────────────────────────

function WorklistRow({ item }: { item: WorklistItem }) {
  const updateStatus = useUpdateSampleStatus();
  const [status, setStatus] = useState<SampleStatus>(item.status);

  const handleChange = (newStatus: SampleStatus) => {
    setStatus(newStatus);
    updateStatus.mutate(
      { id: item.id, status: newStatus },
      {
        onSuccess: () => toast.success(`Status atualizado: ${newStatus}`),
        onError: () => {
          setStatus(item.status);
          toast.error('Erro ao atualizar status');
        },
      },
    );
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{item.sampleBarcode}</span>
          {item.priority === 'URGENTE' && (
            <Badge variant="destructive" className="text-xs">URGENTE</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-medium text-sm">{item.patientName}</TableCell>
      <TableCell className="text-sm">{item.examName}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{item.sector}</TableCell>
      <TableCell>
        {sampleStatusBadge(status)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(item.collectedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </TableCell>
      <TableCell>
        <Select value={status} onValueChange={(v) => handleChange(v as SampleStatus)}>
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COLETADO">Coletado</SelectItem>
            <SelectItem value="RECEBIDO">Recebido</SelectItem>
            <SelectItem value="PROCESSANDO">Processando</SelectItem>
            <SelectItem value="LIBERADO">Liberado</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

function WorklistTab() {
  const { data: worklist, isLoading } = useLisWorklist();
  const [filter, setFilter] = useState<SampleStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const items = (worklist ?? []).filter((w) => {
    const statusOk = filter === 'ALL' || w.status === filter;
    const searchOk = !search || w.patientName.toLowerCase().includes(search.toLowerCase()) || w.sampleBarcode.includes(search);
    return statusOk && searchOk;
  });

  const urgentCount = (worklist ?? []).filter((w) => w.priority === 'URGENTE' && w.status !== 'LIBERADO').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 flex-wrap">
          <Input
            className="w-56"
            placeholder="Buscar paciente ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="COLETADO">Coletado</SelectItem>
              <SelectItem value="RECEBIDO">Recebido</SelectItem>
              <SelectItem value="PROCESSANDO">Processando</SelectItem>
              <SelectItem value="LIBERADO">Liberado</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          {urgentCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 px-3">
              <AlertTriangle className="h-3 w-3" />
              {urgentCount} urgente(s)
            </Badge>
          )}
        </div>
        <RegisterSampleDialog />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando worklist...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum item na worklist</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código de Barras</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Exame</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Coleta</TableHead>
                <TableHead>Alterar Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <WorklistRow key={item.id} item={item} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Quality Control Tab ──────────────────────────────────────────────────────

function QCTab() {
  const { data: qcResults, isLoading } = useQCResults();

  const statusCount = (status: QCResult['status']) =>
    (qcResults ?? []).filter((r) => r.status === status).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-emerald-400">{statusCount('APROVADO')}</p>
              <p className="text-xs text-muted-foreground">Aprovados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-yellow-400">{statusCount('ALERTA')}</p>
              <p className="text-xs text-muted-foreground">Alertas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{statusCount('REPROVADO')}</p>
              <p className="text-xs text-muted-foreground">Reprovados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando resultados de QC...</div>
      ) : (qcResults ?? []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum resultado de controle de qualidade</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Analito</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Média ± DP</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(qcResults ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {qcStatusIcon(r.status)}
                      <span className="text-sm">{r.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{r.analyte}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.level}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.value.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.mean.toFixed(2)} ± {r.sd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Results (Delta Checks) Tab ───────────────────────────────────────────────

function ResultsTab() {
  const { data: deltas, isLoading } = useDeltaChecks();
  const acknowledge = useAcknowledgeDeltaCheck();

  const pending = (deltas ?? []).filter((d) => !d.acknowledged);

  const handleAcknowledge = (id: string) => {
    acknowledge.mutate(id, {
      onSuccess: () => toast.success('Alerta reconhecido'),
      onError: () => toast.error('Erro ao reconhecer alerta'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Alertas de Delta-Check</p>
          {pending.length > 0 && (
            <Badge variant="destructive">{pending.length} pendentes</Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando resultados...</div>
      ) : (deltas ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p>Nenhum alerta de delta-check ativo</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Analito</TableHead>
                <TableHead>Valor Anterior</TableHead>
                <TableHead>Valor Atual</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead>Flagado em</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(deltas ?? []).map((d) => (
                <TableRow key={d.id} className={d.acknowledged ? 'opacity-50' : ''}>
                  <TableCell className="font-medium text-sm">{d.patientName}</TableCell>
                  <TableCell className="text-sm">{d.analyte}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {d.previousValue.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">
                    {d.currentValue.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${Math.abs(d.percentChange) > 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {d.percentChange > 0 ? '+' : ''}{d.percentChange.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(d.flaggedAt).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {d.acknowledged ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BellOff className="h-3 w-3" />
                        Reconhecido
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(d.id)}
                        disabled={acknowledge.isPending}
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Reconhecer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Auto-Release Rules Tab ───────────────────────────────────────────────────

function RulesTab() {
  const { data: rules, isLoading } = useAutoReleaseRules();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Regras de liberação automática configuradas
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando regras...</div>
      ) : (rules ?? []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma regra de liberação cadastrada</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exame</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Faixa de Referência</TableHead>
                <TableHead>Delta Máx. (%)</TableHead>
                <TableHead>Ativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rules ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.examName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">{r.examCode}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {r.minValue} – {r.maxValue}
                  </TableCell>
                  <TableCell className="text-sm">{r.deltaPercent}%</TableCell>
                  <TableCell>
                    {r.enabled ? (
                      <div className="flex items-center gap-1 text-emerald-400 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Ativa
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <XCircle className="h-4 w-4" />
                        Inativa
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Reflex Testing Tab ──────────────────────────────────────────────────────

function ReflexTab() {
  const { data: rules, isLoading } = useReflexRules();
  const createRule = useCreateReflexRule();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    triggerAnalyte: '',
    condition: 'ABNORMAL',
    thresholdValue: '',
    reflexTest: '',
    notes: '',
  });

  const handleSubmit = () => {
    if (!form.triggerAnalyte || !form.reflexTest) return;
    createRule.mutate(
      {
        triggerAnalyte: form.triggerAnalyte,
        condition: form.condition,
        thresholdValue: form.thresholdValue ? parseFloat(form.thresholdValue) : undefined,
        reflexTest: form.reflexTest,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Regra de reflexo criada');
          setOpen(false);
          setForm({ triggerAnalyte: '', condition: 'ABNORMAL', thresholdValue: '', reflexTest: '', notes: '' });
        },
        onError: () => toast.error('Erro ao criar regra'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Regras de testes reflexos automáticos (ex: TSH anormal → pedir T4L)</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Regra de Reflexo</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Analito Gatilho</Label>
                  <Input value={form.triggerAnalyte} onChange={(e) => setForm((f) => ({ ...f, triggerAnalyte: e.target.value }))} placeholder="TSH, Glicose..." />
                </div>
                <div className="space-y-1">
                  <Label>Condição</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABNORMAL">Anormal</SelectItem>
                      <SelectItem value="ABOVE_HIGH">Acima do limite</SelectItem>
                      <SelectItem value="BELOW_LOW">Abaixo do limite</SelectItem>
                      <SelectItem value="POSITIVE">Positivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Valor Limiar (opcional)</Label>
                  <Input type="number" value={form.thresholdValue} onChange={(e) => setForm((f) => ({ ...f, thresholdValue: e.target.value }))} placeholder="Ex: 0.5" />
                </div>
                <div className="space-y-1">
                  <Label>Exame Reflexo</Label>
                  <Input value={form.reflexTest} onChange={(e) => setForm((f) => ({ ...f, reflexTest: e.target.value }))} placeholder="T4L, Insulina..." />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Justificativa clínica..." />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={createRule.isPending || !form.triggerAnalyte || !form.reflexTest}>
                {createRule.isPending ? 'Criando...' : 'Criar Regra'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando regras...</div>
      ) : (rules ?? []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma regra de reflexo configurada</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Analito Gatilho</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Limiar</TableHead>
                <TableHead>Exame Reflexo</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rules ?? []).map((r: ReflexRule) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.triggerAnalyte}</TableCell>
                  <TableCell><Badge variant="secondary">{r.condition}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{r.thresholdValue ?? '—'}</TableCell>
                  <TableCell className="text-emerald-400 font-medium">{r.reflexTest}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Add-on Testing Tab ──────────────────────────────────────────────────────

function AddOnTab() {
  const requestAddOn = useRequestAddOn();
  const [form, setForm] = useState({ barcode: '', testName: '', testCode: '', patientId: '', justification: '' });
  const [result, setResult] = useState<{ id: string; testName: string; sampleAge: string; status: string } | null>(null);

  const handleSubmit = () => {
    if (!form.barcode || !form.testName || !form.testCode || !form.patientId) return;
    requestAddOn.mutate(
      { barcode: form.barcode, testName: form.testName, testCode: form.testCode, patientId: form.patientId, justification: form.justification || undefined },
      {
        onSuccess: (data) => {
          toast.success(`Exame add-on solicitado: ${data.testName}`);
          setResult(data);
          setForm({ barcode: '', testName: '', testCode: '', patientId: '', justification: '' });
        },
        onError: () => toast.error('Erro ao solicitar add-on (verifique estabilidade da amostra)'),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-xl">
      <p className="text-sm text-muted-foreground">Adicionar exame a uma amostra já coletada (verificação automática de estabilidade)</p>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Código de Barras</Label>
              <Input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} placeholder="Ex: LIS-2024-001" />
            </div>
            <div className="space-y-1">
              <Label>ID do Paciente</Label>
              <Input value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))} placeholder="UUID" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome do Exame</Label>
              <Input value={form.testName} onChange={(e) => setForm((f) => ({ ...f, testName: e.target.value }))} placeholder="Ferritina, PCR..." />
            </div>
            <div className="space-y-1">
              <Label>Código</Label>
              <Input value={form.testCode} onChange={(e) => setForm((f) => ({ ...f, testCode: e.target.value }))} placeholder="FERR, PCR..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Justificativa clínica</Label>
            <Input value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} placeholder="Motivo da solicitação..." />
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={requestAddOn.isPending || !form.barcode || !form.testName || !form.testCode || !form.patientId}>
            {requestAddOn.isPending ? 'Solicitando...' : 'Solicitar Add-on'}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card className="bg-emerald-950/30 border-emerald-700/50">
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="font-semibold text-emerald-300">Add-on solicitado com sucesso</span>
            </div>
            <p className="text-sm text-muted-foreground">Exame: <span className="text-white">{result.testName}</span></p>
            <p className="text-sm text-muted-foreground">Idade da amostra: <span className="text-white">{result.sampleAge}</span></p>
            <Badge variant="outline">{result.status}</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── POC Testing Tab ─────────────────────────────────────────────────────────

function PocTab() {
  const recordPoc = useRecordPocResult();
  const [form, setForm] = useState({ patientId: '', deviceType: 'GLUCOMETER', deviceId: '', operatorId: '', analyte: '', value: '', unit: '', flag: '' });
  const [result, setResult] = useState<{ criticalCount: number; criticalAnalytes: string[]; results: Array<{ analyte: string; value: string; flag?: string }> } | null>(null);

  const handleSubmit = () => {
    if (!form.patientId || !form.deviceId || !form.operatorId || !form.analyte || !form.value) return;
    recordPoc.mutate(
      {
        patientId: form.patientId,
        deviceType: form.deviceType,
        deviceId: form.deviceId,
        operatorId: form.operatorId,
        results: [{ analyte: form.analyte, value: form.value, unit: form.unit || undefined, flag: form.flag || undefined }],
      },
      {
        onSuccess: (data) => {
          toast.success('Resultado POC registrado');
          setResult(data);
          if (data.criticalCount > 0) toast.error(`CRÍTICO: ${data.criticalAnalytes.join(', ')} com valor crítico!`);
        },
        onError: () => toast.error('Erro ao registrar resultado POC'),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-xl">
      <p className="text-sm text-muted-foreground">Registro de resultados point-of-care (glicômetro, gasometria, coagulação)</p>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ID do Paciente</Label>
              <Input value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))} placeholder="UUID" />
            </div>
            <div className="space-y-1">
              <Label>Tipo de Dispositivo</Label>
              <Select value={form.deviceType} onValueChange={(v) => setForm((f) => ({ ...f, deviceType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLUCOMETER">Glicômetro</SelectItem>
                  <SelectItem value="BLOOD_GAS">Gasômetro</SelectItem>
                  <SelectItem value="COAGULATION">Coagulação POC</SelectItem>
                  <SelectItem value="CARDIAC_MARKER">Marcador Cardíaco</SelectItem>
                  <SelectItem value="URINALYSIS">Urinálise</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ID do Dispositivo</Label>
              <Input value={form.deviceId} onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))} placeholder="Nº série..." />
            </div>
            <div className="space-y-1">
              <Label>ID do Operador</Label>
              <Input value={form.operatorId} onChange={(e) => setForm((f) => ({ ...f, operatorId: e.target.value }))} placeholder="UUID do profissional" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Analito</Label>
              <Input value={form.analyte} onChange={(e) => setForm((f) => ({ ...f, analyte: e.target.value }))} placeholder="Glicose..." />
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="120" />
            </div>
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="mg/dL" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Flag (H=Alto, L=Baixo, C=Crítico)</Label>
            <Select value={form.flag} onValueChange={(v) => setForm((f) => ({ ...f, flag: v }))}>
              <SelectTrigger><SelectValue placeholder="Sem flag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem flag</SelectItem>
                <SelectItem value="H">H — Alto</SelectItem>
                <SelectItem value="L">L — Baixo</SelectItem>
                <SelectItem value="C">C — Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={recordPoc.isPending}>
            {recordPoc.isPending ? 'Registrando...' : 'Registrar Resultado POC'}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card className={result.criticalCount > 0 ? 'bg-red-950/30 border-red-700/50' : 'bg-emerald-950/30 border-emerald-700/50'}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2">
              {result.criticalCount > 0 ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              <span className={`font-semibold ${result.criticalCount > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                {result.criticalCount > 0 ? `RESULTADO CRÍTICO — ${result.criticalAnalytes.join(', ')}` : 'Resultado registrado'}
              </span>
            </div>
            {result.results.map((r, i) => (
              <p key={i} className="text-sm text-muted-foreground">{r.analyte}: <span className="text-white font-mono">{r.value}</span> {r.flag && <Badge variant="destructive" className="text-xs">{r.flag}</Badge>}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── AI Features Tab ─────────────────────────────────────────────────────────

function AiLabTab() {
  const interpretPanel = useInterpretLabPanel();
  const predictResult = usePredictResult();
  const detectSwap = useDetectSampleSwap();
  const predictCritical = usePredictCriticalValue();
  const predictRejection = usePredictSampleRejection();
  const predictTat = usePredictTat();

  const [activeAi, setActiveAi] = useState<'interpret' | 'predict' | 'swap' | 'critical' | 'rejection' | 'tat'>('interpret');
  const [interpretForm, setInterpretForm] = useState({ patientId: '', resultsRaw: '', clinicalContext: '' });
  const [predictForm, setPredictForm] = useState({ patientId: '', analyte: '' });
  const [swapForm, setSwapForm] = useState({ patientId: '', examResultId: '', includeDemographic: false });
  const [criticalForm, setCriticalForm] = useState({ patientId: '', analyte: '', currentValue: '', clinicalContext: '' });
  const [rejectionForm, setRejectionForm] = useState({ sampleId: '', material: '', collectionMethod: '', transportTimeMinutes: '', temperature: '' });
  const [tatForm, setTatForm] = useState({ examCode: '', priority: 'ROTINA' as 'ROTINA' | 'URGENTE', currentQueueSize: '' });

  const [interpretResult, setInterpretResult] = useState<LabPanelInterpretation | null>(null);
  const [predictResultData, setPredictResultData] = useState<ResultPrediction | null>(null);
  const [swapResult, setSwapResult] = useState<SwapDetectionResult | null>(null);
  const [criticalResult, setCriticalResult] = useState<CriticalValuePrediction | null>(null);
  const [rejectionResult, setRejectionResult] = useState<SampleRejectionPrediction | null>(null);
  const [tatResult, setTatResult] = useState<TatPrediction | null>(null);

  const handleInterpret = () => {
    let results: Array<{ analyte: string; value: string }> = [];
    try { results = JSON.parse(interpretForm.resultsRaw); } catch { toast.error('JSON inválido para resultados'); return; }
    interpretPanel.mutate(
      { patientId: interpretForm.patientId, results, clinicalContext: interpretForm.clinicalContext || undefined },
      {
        onSuccess: (data) => { setInterpretResult(data); toast.success('Interpretação gerada'); },
        onError: () => toast.error('Erro na interpretação'),
      },
    );
  };

  const handlePredict = () => {
    if (!predictForm.patientId || !predictForm.analyte) return;
    predictResult.mutate(predictForm, {
      onSuccess: (data) => { setPredictResultData(data); toast.success('Predição calculada'); },
      onError: () => toast.error('Erro na predição'),
    });
  };

  const handleSwap = () => {
    if (!swapForm.patientId || !swapForm.examResultId) return;
    detectSwap.mutate(
      { patientId: swapForm.patientId, examResultId: swapForm.examResultId, includeDemographicCheck: swapForm.includeDemographic },
      {
        onSuccess: (data) => { setSwapResult(data); toast[data.swapSuspected ? 'warning' : 'success'](data.recommendation); },
        onError: () => toast.error('Erro na detecção'),
      },
    );
  };

  const handleCritical = () => {
    if (!criticalForm.patientId || !criticalForm.analyte || !criticalForm.currentValue) return;
    predictCritical.mutate(
      { patientId: criticalForm.patientId, analyte: criticalForm.analyte, currentValue: parseFloat(criticalForm.currentValue), clinicalContext: criticalForm.clinicalContext || undefined },
      {
        onSuccess: (data) => { setCriticalResult(data); toast[data.predictedCritical ? 'warning' : 'success'](data.recommendation); },
        onError: () => toast.error('Erro na predição de valor crítico'),
      },
    );
  };

  const handleRejection = () => {
    if (!rejectionForm.sampleId || !rejectionForm.material) return;
    predictRejection.mutate(
      {
        sampleId: rejectionForm.sampleId,
        material: rejectionForm.material,
        collectionMethod: rejectionForm.collectionMethod || undefined,
        transportTimeMinutes: rejectionForm.transportTimeMinutes ? parseInt(rejectionForm.transportTimeMinutes) : undefined,
        temperature: rejectionForm.temperature ? parseFloat(rejectionForm.temperature) : undefined,
      },
      {
        onSuccess: (data) => { setRejectionResult(data); toast[data.rejectionProbability > 50 ? 'warning' : 'success'](data.recommendation); },
        onError: () => toast.error('Erro na predição de rejeição'),
      },
    );
  };

  const handleTat = () => {
    if (!tatForm.examCode) return;
    predictTat.mutate(
      { examCode: tatForm.examCode, priority: tatForm.priority, currentQueueSize: tatForm.currentQueueSize ? parseInt(tatForm.currentQueueSize) : undefined },
      {
        onSuccess: (data) => { setTatResult(data); toast.success(`TAT estimado: ${data.estimatedMinutes} min`); },
        onError: () => toast.error('Erro na predição de TAT'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'interpret' as const, label: 'Interpretação de Painel', icon: Sparkles },
          { key: 'predict' as const, label: 'Predição de Resultado', icon: TrendingUp },
          { key: 'swap' as const, label: 'Detecção de Troca', icon: ShieldAlert },
          { key: 'critical' as const, label: 'Valor Crítico IA', icon: Siren },
          { key: 'rejection' as const, label: 'Rejeição IA', icon: Ban },
          { key: 'tat' as const, label: 'TAT IA', icon: Clock4 },
        ].map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={activeAi === key ? 'default' : 'outline'} size="sm" onClick={() => setActiveAi(key)} className={activeAi === key ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
            <Icon className="h-4 w-4 mr-2" />{label}
          </Button>
        ))}
      </div>

      {activeAi === 'interpret' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Cole os resultados como JSON: <code className="text-xs bg-zinc-800 px-1 rounded">[{'{'}\"analyte\":\"Hemoglobin\",\"value\":\"8.5\",\"referenceMin\":12{'}'}]</code></p>
            <div className="space-y-1">
              <Label>ID do Paciente</Label>
              <Input value={interpretForm.patientId} onChange={(e) => setInterpretForm((f) => ({ ...f, patientId: e.target.value }))} placeholder="UUID" />
            </div>
            <div className="space-y-1">
              <Label>Resultados (JSON)</Label>
              <Input value={interpretForm.resultsRaw} onChange={(e) => setInterpretForm((f) => ({ ...f, resultsRaw: e.target.value }))} placeholder='[{"analyte":"Glucose","value":"250","referenceMax":100}]' />
            </div>
            <div className="space-y-1">
              <Label>Contexto Clínico (opcional)</Label>
              <Input value={interpretForm.clinicalContext} onChange={(e) => setInterpretForm((f) => ({ ...f, clinicalContext: e.target.value }))} placeholder="DM2, internado por ITU..." />
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleInterpret} disabled={interpretPanel.isPending}>
              {interpretPanel.isPending ? 'Interpretando...' : 'Interpretar Painel'}
            </Button>
            {interpretResult && (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <p className="text-sm font-medium">Interpretação IA — {interpretResult.abnormalCount} alterações</p>
                {interpretResult.interpretations.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                    <span className="text-sm">{line}</span>
                  </div>
                ))}
                <p className="text-xs text-zinc-500 italic">{interpretResult.disclaimer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeAi === 'predict' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Predição baseada em tendência histórica do paciente</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ID do Paciente</Label>
                <Input value={predictForm.patientId} onChange={(e) => setPredictForm((f) => ({ ...f, patientId: e.target.value }))} placeholder="UUID" />
              </div>
              <div className="space-y-1">
                <Label>Analito</Label>
                <Input value={predictForm.analyte} onChange={(e) => setPredictForm((f) => ({ ...f, analyte: e.target.value }))} placeholder="Hemoglobin, Creatinine..." />
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePredict} disabled={predictResult.isPending}>
              {predictResult.isPending ? 'Calculando...' : 'Prever Resultado'}
            </Button>
            {predictResultData && (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                {predictResultData.predictedValue !== null ? (
                  <>
                    <p className="text-sm font-medium">Valor previsto: <span className="text-emerald-400 text-lg font-bold">{predictResultData.predictedValue}</span></p>
                    <p className="text-sm text-muted-foreground">Tendência: <Badge variant="outline">{predictResultData.trend}</Badge></p>
                    <p className="text-sm text-muted-foreground">Confiança: {predictResultData.confidence}%</p>
                    <p className="text-xs text-zinc-500 italic">{predictResultData.disclaimer}</p>
                  </>
                ) : (
                  <p className="text-sm text-yellow-400">{predictResultData.message}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeAi === 'swap' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Detecção de inconsistências que sugerem troca de amostra</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ID do Paciente</Label>
                <Input value={swapForm.patientId} onChange={(e) => setSwapForm((f) => ({ ...f, patientId: e.target.value }))} placeholder="UUID" />
              </div>
              <div className="space-y-1">
                <Label>ID do Resultado</Label>
                <Input value={swapForm.examResultId} onChange={(e) => setSwapForm((f) => ({ ...f, examResultId: e.target.value }))} placeholder="UUID do examResult" />
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSwap} disabled={detectSwap.isPending}>
              {detectSwap.isPending ? 'Analisando...' : 'Detectar Troca de Amostra'}
            </Button>
            {swapResult && (
              <div className={`space-y-2 pt-2 border-t ${swapResult.swapSuspected ? 'border-red-800' : 'border-zinc-800'}`}>
                <div className="flex items-center gap-2">
                  {swapResult.swapSuspected ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  <span className={`font-semibold ${swapResult.swapSuspected ? 'text-red-300' : 'text-emerald-300'}`}>
                    {swapResult.swapSuspected ? 'SUSPEITA DE TROCA' : 'Sem suspeita de troca'}
                  </span>
                  <Badge variant="outline">Confiança: {swapResult.confidence}%</Badge>
                </div>
                {swapResult.flags.map((flag, i) => (
                  <p key={i} className="text-sm text-red-300 flex items-start gap-2"><AlertTriangle className="h-3 w-3 mt-1 shrink-0" />{flag}</p>
                ))}
                <p className="text-sm font-medium">{swapResult.recommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Critical Value Prediction */}
      {activeAi === 'critical' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Prediz se um resultado atual pode atingir valor critico nas proximas horas</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ID do Paciente</Label>
                <Input value={criticalForm.patientId} onChange={(e) => setCriticalForm((f) => ({ ...f, patientId: e.target.value }))} placeholder="UUID" />
              </div>
              <div className="space-y-1">
                <Label>Analito</Label>
                <Input value={criticalForm.analyte} onChange={(e) => setCriticalForm((f) => ({ ...f, analyte: e.target.value }))} placeholder="Potassio, Troponina..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valor Atual</Label>
                <Input type="number" value={criticalForm.currentValue} onChange={(e) => setCriticalForm((f) => ({ ...f, currentValue: e.target.value }))} placeholder="5.2" />
              </div>
              <div className="space-y-1">
                <Label>Contexto Clinico (opcional)</Label>
                <Input value={criticalForm.clinicalContext} onChange={(e) => setCriticalForm((f) => ({ ...f, clinicalContext: e.target.value }))} placeholder="IRC, dialise..." />
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCritical} disabled={predictCritical.isPending}>
              {predictCritical.isPending ? 'Analisando...' : 'Prever Valor Critico'}
            </Button>
            {criticalResult && (
              <div className={`space-y-2 pt-2 border-t ${criticalResult.predictedCritical ? 'border-red-800' : 'border-zinc-800'}`}>
                <div className="flex items-center gap-2">
                  {criticalResult.predictedCritical ? <Siren className="h-5 w-5 text-red-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  <span className={`font-semibold ${criticalResult.predictedCritical ? 'text-red-300' : 'text-emerald-300'}`}>
                    {criticalResult.predictedCritical ? 'RISCO DE VALOR CRITICO' : 'Baixo risco de valor critico'}
                  </span>
                  <Badge variant="outline">Probabilidade: {criticalResult.probability}%</Badge>
                </div>
                {criticalResult.timeToThresholdHours !== null && (
                  <p className="text-sm text-muted-foreground">Tempo estimado ate limiar: <span className="text-white font-bold">{criticalResult.timeToThresholdHours}h</span></p>
                )}
                <p className="text-sm font-medium">{criticalResult.recommendation}</p>
                <p className="text-xs text-zinc-500 italic">{criticalResult.disclaimer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Sample Rejection Prediction */}
      {activeAi === 'rejection' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Avalia a probabilidade de rejeicao pre-analitica de uma amostra</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ID da Amostra</Label>
                <Input value={rejectionForm.sampleId} onChange={(e) => setRejectionForm((f) => ({ ...f, sampleId: e.target.value }))} placeholder="LIS-2024-001" />
              </div>
              <div className="space-y-1">
                <Label>Material</Label>
                <Input value={rejectionForm.material} onChange={(e) => setRejectionForm((f) => ({ ...f, material: e.target.value }))} placeholder="Sangue, Urina..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Metodo de Coleta</Label>
                <Input value={rejectionForm.collectionMethod} onChange={(e) => setRejectionForm((f) => ({ ...f, collectionMethod: e.target.value }))} placeholder="Venopuncao..." />
              </div>
              <div className="space-y-1">
                <Label>Tempo Transporte (min)</Label>
                <Input type="number" value={rejectionForm.transportTimeMinutes} onChange={(e) => setRejectionForm((f) => ({ ...f, transportTimeMinutes: e.target.value }))} placeholder="30" />
              </div>
              <div className="space-y-1">
                <Label>Temperatura (C)</Label>
                <Input type="number" value={rejectionForm.temperature} onChange={(e) => setRejectionForm((f) => ({ ...f, temperature: e.target.value }))} placeholder="22" />
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRejection} disabled={predictRejection.isPending}>
              {predictRejection.isPending ? 'Analisando...' : 'Avaliar Risco de Rejeicao'}
            </Button>
            {rejectionResult && (
              <div className={`space-y-2 pt-2 border-t ${rejectionResult.rejectionProbability > 50 ? 'border-red-800' : 'border-zinc-800'}`}>
                <div className="flex items-center gap-2">
                  {rejectionResult.rejectionProbability > 50 ? <Ban className="h-5 w-5 text-red-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  <span className={`font-semibold ${rejectionResult.rejectionProbability > 50 ? 'text-red-300' : 'text-emerald-300'}`}>
                    Probabilidade de rejeicao: {rejectionResult.rejectionProbability}%
                  </span>
                </div>
                {rejectionResult.likelyReasons.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-300">Motivos provaveis:</p>
                    {rejectionResult.likelyReasons.map((reason, i) => (
                      <p key={i} className="text-sm text-red-300 flex items-start gap-2"><AlertTriangle className="h-3 w-3 mt-1 shrink-0" />{reason}</p>
                    ))}
                  </div>
                )}
                <p className="text-sm font-medium">{rejectionResult.recommendation}</p>
                <p className="text-xs text-zinc-500 italic">{rejectionResult.disclaimer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI TAT Prediction */}
      {activeAi === 'tat' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Estima o turnaround time (TAT) de um exame com base na fila atual</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Codigo do Exame</Label>
                <Input value={tatForm.examCode} onChange={(e) => setTatForm((f) => ({ ...f, examCode: e.target.value }))} placeholder="HMG, PCR, TSH..." />
              </div>
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={tatForm.priority} onValueChange={(v) => setTatForm((f) => ({ ...f, priority: v as 'ROTINA' | 'URGENTE' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROTINA">Rotina</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fila Atual (opcional)</Label>
                <Input type="number" value={tatForm.currentQueueSize} onChange={(e) => setTatForm((f) => ({ ...f, currentQueueSize: e.target.value }))} placeholder="12" />
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleTat} disabled={predictTat.isPending}>
              {predictTat.isPending ? 'Calculando...' : 'Prever TAT'}
            </Button>
            {tatResult && (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <Clock4 className="h-5 w-5 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">TAT Estimado: {tatResult.estimatedMinutes} minutos</span>
                </div>
                <p className="text-sm text-muted-foreground">P90 (pior caso): <span className="text-white font-bold">{tatResult.percentile90Minutes} min</span></p>
                {tatResult.bottleneck && (
                  <p className="text-sm text-yellow-400 flex items-start gap-2"><AlertTriangle className="h-3 w-3 mt-1 shrink-0" />Gargalo: {tatResult.bottleneck}</p>
                )}
                <p className="text-sm font-medium">{tatResult.recommendation}</p>
                <p className="text-xs text-zinc-500 italic">{tatResult.disclaimer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── LIS Page ─────────────────────────────────────────────────────────────────

export default function LisPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Laboratório — LIS</h1>
          <p className="text-sm text-muted-foreground">
            Sistema de informação laboratorial — worklist, controle de qualidade, resultados e regras de liberação
          </p>
        </div>
      </div>

      <Tabs defaultValue="worklist" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="worklist" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Worklist
          </TabsTrigger>
          <TabsTrigger value="qc" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Controle de Qualidade
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resultados
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Regras de Liberação
          </TabsTrigger>
          <TabsTrigger value="reflex" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Reflexos
          </TabsTrigger>
          <TabsTrigger value="addon" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Add-on
          </TabsTrigger>
          <TabsTrigger value="poc" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            POC
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            IA Laboratorial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="worklist"><WorklistTab /></TabsContent>
        <TabsContent value="qc"><QCTab /></TabsContent>
        <TabsContent value="results"><ResultsTab /></TabsContent>
        <TabsContent value="rules"><RulesTab /></TabsContent>
        <TabsContent value="reflex"><ReflexTab /></TabsContent>
        <TabsContent value="addon"><AddOnTab /></TabsContent>
        <TabsContent value="poc"><PocTab /></TabsContent>
        <TabsContent value="ai"><AiLabTab /></TabsContent>
      </Tabs>
    </div>
  );
}
