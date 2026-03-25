import { useState } from 'react';
import {
  Microscope,
  Plus,
  ClipboardList,
  FileText,
  FlaskConical,
  AlertTriangle,
  CheckCircle,
  PenLine,
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
  useBiopsyRequests,
  usePathologyReports,
  useCreateBiopsyRequest,
  useUpdatePathologyReport,
  useSignPathologyReport,
  type BiopsyRequest,
  type PathologyReport,
  type PathologyStep,
  type PathologyStatus,
} from '@/services/pathology.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PathologyStatus, { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'border-amber-500 text-amber-400' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'border-blue-500 text-blue-400' },
  CONCLUIDO: { label: 'Concluído', color: 'border-emerald-500 text-emerald-400' },
  CANCELADO: { label: 'Cancelado', color: 'border-zinc-500 text-zinc-400' },
};

const STEP_CONFIG: Record<PathologyStep, { label: string; order: number }> = {
  MACROSCOPIA: { label: 'Macroscopia', order: 1 },
  MICROSCOPIA: { label: 'Microscopia', order: 2 },
  IHQ: { label: 'Imunohistoquímica', order: 3 },
  LAUDO_FINAL: { label: 'Laudo Final', order: 4 },
};

const STEP_ORDER: PathologyStep[] = ['MACROSCOPIA', 'MICROSCOPIA', 'IHQ', 'LAUDO_FINAL'];

// ─── Component ──────────────────────────────────────────────────────────────

export default function PathologyPage() {
  const [activeTab, setActiveTab] = useState('requests');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PathologyReport | null>(null);
  const [updateStep, setUpdateStep] = useState<PathologyStep | null>(null);
  const [updateContent, setUpdateContent] = useState('');

  const [requestForm, setRequestForm] = useState({
    patientId: '',
    material: '',
    biopsySite: '',
    clinicalIndication: '',
    clinicalHistory: '',
    urgent: false,
  });

  const { data: requests = [], isLoading: loadingRequests, isError, refetch } = useBiopsyRequests();
  const { data: reports = [], isLoading: loadingReports } = usePathologyReports();

  const createBiopsyRequest = useCreateBiopsyRequest();
  const updatePathologyReport = useUpdatePathologyReport();
  const signPathologyReport = useSignPathologyReport();

  const pendingRequests = requests.filter((r: BiopsyRequest) => r.status === 'PENDENTE');
  const urgentRequests = requests.filter((r: BiopsyRequest) => r.urgent && r.status !== 'CONCLUIDO');

  const handleCreate = async () => {
    if (!requestForm.patientId || !requestForm.material || !requestForm.biopsySite || !requestForm.clinicalIndication) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createBiopsyRequest.mutateAsync(requestForm);
      toast.success('Solicitação de biópsia registrada.');
      setShowNewRequest(false);
      setRequestForm({ patientId: '', material: '', biopsySite: '', clinicalIndication: '', clinicalHistory: '', urgent: false });
    } catch {
      toast.error('Erro ao registrar solicitação.');
    }
  };

  const handleUpdateStep = async () => {
    if (!selectedReport || !updateStep || !updateContent) {
      toast.error('Preencha o conteúdo do passo.');
      return;
    }
    try {
      await updatePathologyReport.mutateAsync({
        reportId: selectedReport.id,
        step: updateStep,
        content: updateContent,
      });
      toast.success(`${STEP_CONFIG[updateStep].label} atualizada.`);
      setUpdateStep(null);
      setUpdateContent('');
    } catch {
      toast.error('Erro ao atualizar laudo.');
    }
  };

  const handleSign = async (reportId: string) => {
    try {
      await signPathologyReport.mutateAsync(reportId);
      toast.success('Laudo assinado digitalmente.');
      setSelectedReport(null);
    } catch {
      toast.error('Erro ao assinar laudo.');
    }
  };

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRequestForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Microscope className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Anatomia Patológica</h1>
            <p className="text-sm text-muted-foreground">Requisições de biópsia, fluxo macroscopia/microscopia/IHQ e laudos</p>
          </div>
        </div>
        <Button onClick={() => setShowNewRequest(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Nova Requisição
        </Button>
      </div>

      {/* Urgent alert */}
      {urgentRequests.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{urgentRequests.length} requisição(ões) urgente(s) aguardando processamento</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="requests" className="text-xs data-[state=active]:bg-emerald-600">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Requisições
            {pendingRequests.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-amber-600">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs data-[state=active]:bg-emerald-600">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Laudos
          </TabsTrigger>
          <TabsTrigger value="ihq" className="text-xs data-[state=active]:bg-emerald-600">
            <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
            Imunohistoquímica
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Requisições ────────────────────────────────────────────── */}
        <TabsContent value="requests" className="space-y-4 mt-4">
          {loadingRequests ? (
            <PageLoading cards={0} showTable />
          ) : requests.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma requisição de biópsia</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowNewRequest(true)}>
                  Nova Requisição
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Requisições ({requests.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Sítio</TableHead>
                    <TableHead>Indicação</TableHead>
                    <TableHead>Etapa Atual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Urgente</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req: BiopsyRequest) => {
                    const statusCfg = STATUS_CONFIG[req.status];
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium text-sm">{req.patientName}</TableCell>
                        <TableCell className="text-sm">{req.material}</TableCell>
                        <TableCell className="text-sm">{req.biopsySite}</TableCell>
                        <TableCell className="text-sm max-w-40 truncate">{req.clinicalIndication}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {STEP_CONFIG[req.currentStep]?.label ?? req.currentStep}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', statusCfg.color)}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.urgent ? (
                            <Badge className="bg-red-600 text-xs">URGENTE</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(req.requestedAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Laudos ──────────────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          {loadingReports ? (
            <PageLoading cards={0} showTable />
          ) : reports.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum laudo anatomopatológico registrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report: PathologyReport) => (
                <Card
                  key={report.id}
                  className="border-border bg-card cursor-pointer hover:bg-accent/20 transition-colors"
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{report.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Material: {report.material} • Sítio: {report.biopsySite}
                        </p>
                        {/* Workflow stepper */}
                        <div className="flex items-center gap-1 mt-2">
                          {STEP_ORDER.map((step, idx) => {
                            const currentIdx = STEP_ORDER.indexOf(report.currentStep);
                            const done = idx < currentIdx;
                            const current = idx === currentIdx;
                            return (
                              <div key={step} className="flex items-center gap-1">
                                <div className={cn(
                                  'h-2 w-2 rounded-full',
                                  done ? 'bg-emerald-500' : current ? 'bg-blue-500' : 'bg-secondary',
                                )} />
                                <span className={cn(
                                  'text-[10px]',
                                  done ? 'text-emerald-400' : current ? 'text-blue-400' : 'text-muted-foreground',
                                )}>
                                  {STEP_CONFIG[step].label}
                                </span>
                                {idx < STEP_ORDER.length - 1 && (
                                  <div className={cn('h-px w-4', done ? 'bg-emerald-500' : 'bg-secondary')} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', STATUS_CONFIG[report.status].color)}>
                          {STATUS_CONFIG[report.status].label}
                        </Badge>
                        {report.status !== 'CONCLUIDO' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                          >
                            <PenLine className="h-3 w-3" />
                            Atualizar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: IHQ ─────────────────────────────────────────────────────── */}
        <TabsContent value="ihq" className="space-y-4 mt-4">
          {loadingReports ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Casos com Imunohistoquímica</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Status IHQ</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Patologista</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.filter((r: PathologyReport) =>
                    r.currentStep === 'IHQ' || r.currentStep === 'LAUDO_FINAL' || r.immunohistochemistry,
                  ).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum caso em fase de IHQ
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports
                      .filter((r: PathologyReport) => r.currentStep === 'IHQ' || r.currentStep === 'LAUDO_FINAL' || r.immunohistochemistry)
                      .map((report: PathologyReport) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium text-sm">{report.patientName}</TableCell>
                          <TableCell className="text-sm">{report.material}</TableCell>
                          <TableCell>
                            {report.currentStep === 'IHQ' ? (
                              <Badge className="bg-blue-600 text-xs">Em Análise</Badge>
                            ) : report.immunohistochemistry ? (
                              <Badge className="bg-emerald-600 text-xs">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Concluída
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Aguardando</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-48 truncate">
                            {report.immunohistochemistry || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{report.pathologist}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedReport(report);
                                setUpdateStep('IHQ');
                              }}
                            >
                              Registrar IHQ
                            </Button>
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

      {/* ── New Biopsy Request Dialog ──────────────────────────────────────── */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Requisição de Biópsia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">ID do Paciente *</Label>
              <Input
                placeholder="UUID do paciente"
                value={requestForm.patientId}
                onChange={setField('patientId')}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Material *</Label>
                <Input
                  placeholder="Ex: Fragmento colônico"
                  value={requestForm.material}
                  onChange={setField('material')}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sítio da Biópsia *</Label>
                <Input
                  placeholder="Ex: Cólon ascendente"
                  value={requestForm.biopsySite}
                  onChange={setField('biopsySite')}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Indicação Clínica *</Label>
              <Input
                placeholder="Ex: Lesão suspeita de adenocarcinoma"
                value={requestForm.clinicalIndication}
                onChange={setField('clinicalIndication')}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">História Clínica</Label>
              <Input
                placeholder="Resumo relevante da história clínica..."
                value={requestForm.clinicalHistory}
                onChange={setField('clinicalHistory')}
                className="bg-background border-border"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requestForm.urgent}
                onChange={(e) => setRequestForm((p) => ({ ...p, urgent: e.target.checked }))}
                className="h-4 w-4 accent-red-500"
              />
              <span className="text-sm font-medium text-red-400">Urgente</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRequest(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={createBiopsyRequest.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createBiopsyRequest.isPending ? 'Enviando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report Update Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!selectedReport} onOpenChange={() => { setSelectedReport(null); setUpdateStep(null); setUpdateContent(''); }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Laudo Anatomopatológico — {selectedReport?.patientName}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              {/* Current content display */}
              {(['MACROSCOPIA', 'MICROSCOPIA', 'IHQ', 'LAUDO_FINAL'] as PathologyStep[]).map((step) => {
                const content = step === 'MACROSCOPIA' ? selectedReport.macroscopy
                  : step === 'MICROSCOPIA' ? selectedReport.microscopy
                    : step === 'IHQ' ? selectedReport.immunohistochemistry
                      : selectedReport.finalDiagnosis;
                if (!content) return null;
                return (
                  <div key={step} className="rounded border border-border bg-background p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{STEP_CONFIG[step].label}</p>
                    <p className="text-sm whitespace-pre-wrap">{content}</p>
                  </div>
                );
              })}

              {/* Update form */}
              {selectedReport.status !== 'CONCLUIDO' && (
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Atualizar Etapa</Label>
                    <Select
                      value={updateStep ?? ''}
                      onValueChange={(v) => setUpdateStep(v as PathologyStep)}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione a etapa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_ORDER.map((step) => (
                          <SelectItem key={step} value={step}>{STEP_CONFIG[step].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {updateStep && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Conteúdo *</Label>
                      <textarea
                        placeholder={`Descreva os achados de ${STEP_CONFIG[updateStep].label}...`}
                        value={updateContent}
                        onChange={(e) => setUpdateContent(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      />
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    {updateStep && (
                      <Button
                        variant="outline"
                        onClick={handleUpdateStep}
                        disabled={!updateContent || updatePathologyReport.isPending}
                        className="gap-2"
                      >
                        <PenLine className="h-4 w-4" />
                        {updatePathologyReport.isPending ? 'Salvando...' : 'Salvar Etapa'}
                      </Button>
                    )}
                    {selectedReport.finalDiagnosis && (
                      <Button
                        onClick={() => handleSign(selectedReport.id)}
                        disabled={signPathologyReport.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {signPathologyReport.isPending ? 'Assinando...' : 'Assinar Laudo'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
