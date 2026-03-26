import { useState } from 'react';
import {
  Globe,
  Wifi,
  WifiOff,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Separator } from '@/components/ui/separator';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  useRNDSStatus,
  useRNDSHistory,
  useSendEncounter,
  useSendVaccination,
  useSendLabResult,
  type RNDSSubmission,
  type SubmissionStatus,
  type SubmissionType,
} from '@/services/rnds.service';

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  ENVIADO: { label: 'Enviado', icon: Send, color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  ACEITO: { label: 'Aceito', icon: CheckCircle2, color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
  REJEITADO: { label: 'Rejeitado', icon: XCircle, color: 'border-red-500 bg-red-500/10 text-red-400' },
  ERRO: { label: 'Erro', icon: AlertTriangle, color: 'border-orange-500 bg-orange-500/10 text-orange-400' },
};

const TYPE_LABELS: Record<SubmissionType, string> = {
  RESUMO_ATENDIMENTO: 'Resumo de Atendimento',
  VACINACAO: 'Vacinação',
  RESULTADO_EXAME: 'Resultado de Exame',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function RNDSPage() {
  const [activeTab, setActiveTab] = useState('status');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<SubmissionType | 'ALL'>('ALL');

  // Send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendType, setSendType] = useState<'encounter' | 'vaccination' | 'lab'>('encounter');
  const [encounterIdInput, setEncounterIdInput] = useState('');
  const [vaccForm, setVaccForm] = useState({ patientId: '', vaccine: '', dose: '', lot: '', administeredAt: '' });
  const [labForm, setLabForm] = useState({ patientId: '', examCode: '', result: '', unit: '', referenceRange: '', collectedAt: '' });

  const { data: connectionStatus, isLoading: statusLoading, error: statusError } = useRNDSStatus();
  const { data: submissions, isLoading: historyLoading } = useRNDSHistory();
  const sendEncounter = useSendEncounter();
  const sendVaccination = useSendVaccination();
  const sendLabResult = useSendLabResult();

  const filteredSubmissions = submissions?.filter((s) => {
    const statusOk = statusFilter === 'ALL' || s.status === statusFilter;
    const typeOk = typeFilter === 'ALL' || s.type === typeFilter;
    return statusOk && typeOk;
  }) ?? [];

  const handleSend = async () => {
    try {
      if (sendType === 'encounter') {
        if (!encounterIdInput) { toast.error('Informe o ID do atendimento.'); return; }
        await sendEncounter.mutateAsync({ encounterId: encounterIdInput });
      } else if (sendType === 'vaccination') {
        if (!vaccForm.patientId || !vaccForm.vaccine) { toast.error('Preencha os campos obrigatórios.'); return; }
        await sendVaccination.mutateAsync(vaccForm);
      } else {
        if (!labForm.patientId || !labForm.examCode) { toast.error('Preencha os campos obrigatórios.'); return; }
        await sendLabResult.mutateAsync(labForm);
      }
      toast.success('Envio realizado com sucesso.');
      setSendDialogOpen(false);
      resetForms();
    } catch {
      toast.error('Erro ao enviar para RNDS.');
    }
  };

  const handleResend = async (submission: RNDSSubmission) => {
    if (submission.type === 'RESUMO_ATENDIMENTO') {
      try {
        await sendEncounter.mutateAsync({ encounterId: submission.resourceId });
        toast.success('Reenvio realizado com sucesso.');
      } catch {
        toast.error('Erro ao reenviar.');
      }
    } else {
      toast.info('Reenvio disponível apenas para resumos de atendimento nesta interface.');
    }
  };

  const resetForms = () => {
    setEncounterIdInput('');
    setVaccForm({ patientId: '', vaccine: '', dose: '', lot: '', administeredAt: '' });
    setLabForm({ patientId: '', examCode: '', result: '', unit: '', referenceRange: '', collectedAt: '' });
  };

  if (statusError) {
    return <PageError message="Erro ao carregar status RNDS." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6 text-emerald-400" />
            RNDS — Rede Nacional de Dados em Saúde
          </h1>
          <p className="text-muted-foreground">
            Integração com a RNDS/DATASUS para envio de dados clínicos
          </p>
        </div>
        <Button onClick={() => setSendDialogOpen(true)} className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Novo Envio
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Status de Conexão
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Envios
          </TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          {statusLoading ? (
            <PageLoading />
          ) : connectionStatus ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {connectionStatus.connected ? (
                      <Wifi className="h-8 w-8 text-emerald-400" />
                    ) : (
                      <WifiOff className="h-8 w-8 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className={`text-lg font-bold ${connectionStatus.connected ? 'text-emerald-400' : 'text-red-400'}`}>
                        {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Globe className="h-8 w-8 text-blue-400" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ambiente</p>
                      <p className="text-lg font-bold">
                        {connectionStatus.environment === 'PRODUCAO' ? 'Produção' : 'Homologação'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-yellow-400" />
                    <div>
                      <p className="text-sm text-muted-foreground">Última Verificação</p>
                      <p className="text-sm font-medium">
                        {new Date(connectionStatus.lastCheckAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-purple-400" />
                    <div>
                      <p className="text-sm text-muted-foreground">Certificado Digital</p>
                      <p className="text-sm font-medium">
                        {connectionStatus.certificateExpiry
                          ? `Expira: ${new Date(connectionStatus.certificateExpiry).toLocaleDateString('pt-BR')}`
                          : 'Não configurado'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Summary stats */}
          {submissions && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold">{submissions.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total de Envios</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-emerald-400">
                    {submissions.filter((s) => s.status === 'ACEITO').length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Aceitos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-blue-400">
                    {submissions.filter((s) => s.status === 'ENVIADO').length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Pendentes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-red-400">
                    {submissions.filter((s) => s.status === 'REJEITADO' || s.status === 'ERRO').length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Erros/Rejeitados</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SubmissionStatus | 'ALL')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="ENVIADO">Enviado</SelectItem>
                <SelectItem value="ACEITO">Aceito</SelectItem>
                <SelectItem value="REJEITADO">Rejeitado</SelectItem>
                <SelectItem value="ERRO">Erro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as SubmissionType | 'ALL')}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Tipos</SelectItem>
                <SelectItem value="RESUMO_ATENDIMENTO">Resumo de Atendimento</SelectItem>
                <SelectItem value="VACINACAO">Vacinação</SelectItem>
                <SelectItem value="RESULTADO_EXAME">Resultado de Exame</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Envios</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <PageLoading />
              ) : filteredSubmissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>CNS</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead>Resposta</TableHead>
                      <TableHead>FHIR Bundle</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((sub) => {
                      const statusCfg = STATUS_CONFIG[sub.status];
                      const StatusIcon = statusCfg.icon;
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <Badge variant="outline" className={statusCfg.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{TYPE_LABELS[sub.type]}</TableCell>
                          <TableCell className="text-sm font-medium">{sub.patientName}</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{sub.patientCns}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(sub.submittedAt).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                            {sub.responseMessage ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {sub.fhirBundleId ? sub.fhirBundleId.slice(0, 12) + '...' : '—'}
                          </TableCell>
                          <TableCell>
                            {(sub.status === 'REJEITADO' || sub.status === 'ERRO') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResend(sub)}
                                disabled={sendEncounter.isPending}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Reenviar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum envio encontrado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Envio RNDS</DialogTitle>
            <DialogDescription>Selecione o tipo de dado a enviar para a RNDS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Envio</label>
              <Select value={sendType} onValueChange={(v) => setSendType(v as typeof sendType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="encounter">Resumo de Atendimento</SelectItem>
                  <SelectItem value="vaccination">Vacinação</SelectItem>
                  <SelectItem value="lab">Resultado de Exame</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {sendType === 'encounter' && (
              <div>
                <label className="text-sm font-medium">ID do Atendimento *</label>
                <Input
                  placeholder="UUID do atendimento"
                  value={encounterIdInput}
                  onChange={(e) => setEncounterIdInput(e.target.value)}
                />
              </div>
            )}

            {sendType === 'vaccination' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">ID do Paciente *</label>
                  <Input placeholder="UUID" value={vaccForm.patientId} onChange={(e) => setVaccForm((p) => ({ ...p, patientId: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Vacina *</label>
                  <Input placeholder="Nome da vacina" value={vaccForm.vaccine} onChange={(e) => setVaccForm((p) => ({ ...p, vaccine: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Dose</label>
                    <Input placeholder="1ª dose" value={vaccForm.dose} onChange={(e) => setVaccForm((p) => ({ ...p, dose: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Lote</label>
                    <Input placeholder="Lote" value={vaccForm.lot} onChange={(e) => setVaccForm((p) => ({ ...p, lot: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Data de Aplicação</label>
                  <Input type="datetime-local" value={vaccForm.administeredAt} onChange={(e) => setVaccForm((p) => ({ ...p, administeredAt: e.target.value }))} />
                </div>
              </div>
            )}

            {sendType === 'lab' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">ID do Paciente *</label>
                  <Input placeholder="UUID" value={labForm.patientId} onChange={(e) => setLabForm((p) => ({ ...p, patientId: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Código do Exame *</label>
                  <Input placeholder="Código" value={labForm.examCode} onChange={(e) => setLabForm((p) => ({ ...p, examCode: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Resultado</label>
                    <Input placeholder="Valor" value={labForm.result} onChange={(e) => setLabForm((p) => ({ ...p, result: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unidade</label>
                    <Input placeholder="mg/dL" value={labForm.unit} onChange={(e) => setLabForm((p) => ({ ...p, unit: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Intervalo de Referência</label>
                  <Input placeholder="70-100" value={labForm.referenceRange} onChange={(e) => setLabForm((p) => ({ ...p, referenceRange: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Data da Coleta</label>
                  <Input type="datetime-local" value={labForm.collectedAt} onChange={(e) => setLabForm((p) => ({ ...p, collectedAt: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSend}
              disabled={sendEncounter.isPending || sendVaccination.isPending || sendLabResult.isPending}
            >
              {(sendEncounter.isPending || sendVaccination.isPending || sendLabResult.isPending) ? 'Enviando...' : 'Enviar para RNDS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
