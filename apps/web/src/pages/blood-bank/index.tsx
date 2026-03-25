import { useState } from 'react';
import {
  Droplets,
  LayoutGrid,
  GitMerge,
  Activity,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Search,
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
  useBloodTyping,
  useCrossmatches,
  useTransfusions,
  useBloodInventory,
  useHemovigilanceIncidents,
  usePerformCrossmatch,
  useStartTransfusion,
  useReportIncident,
  type Crossmatch,
  type Transfusion,
  type InventoryItem,
  type HemovigilanceIncident,
  type BloodType,
  type BloodProduct,
} from '@/services/blood-bank.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const PRODUCT_LABELS: Record<BloodProduct, string> = {
  CONCENTRADO_HEMACIA: 'Concentrado de Hemácias',
  PLASMA: 'Plasma',
  PLAQUETAS: 'Plaquetas',
  CRIOPRECIPITADO: 'Crioprecipitado',
};

const BLOOD_TYPE_COLORS: Record<BloodType, string> = {
  A: 'bg-red-500/20 text-red-300',
  B: 'bg-blue-500/20 text-blue-300',
  AB: 'bg-purple-500/20 text-purple-300',
  O: 'bg-amber-500/20 text-amber-300',
};

const SEVERITY_CONFIG: Record<HemovigilanceIncident['severity'], { label: string; color: string }> = {
  LEVE: { label: 'Leve', color: 'bg-blue-500/20 text-blue-400' },
  MODERADA: { label: 'Moderada', color: 'bg-amber-500/20 text-amber-400' },
  GRAVE: { label: 'Grave', color: 'bg-red-500/20 text-red-400' },
  FATAL: { label: 'Fatal', color: 'bg-zinc-900 text-red-300 border border-red-500' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function BloodBankPage() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [patientId, setPatientId] = useState('');
  const [submittedPatientId, setSubmittedPatientId] = useState('');

  const [showCrossmatch, setShowCrossmatch] = useState(false);
  const [showTransfusion, setShowTransfusion] = useState(false);
  const [showIncident, setShowIncident] = useState(false);

  const [crossmatchForm, setCrossmatchForm] = useState({ patientId: '', donorBagId: '' });
  const [transfusionForm, setTransfusionForm] = useState({ patientId: '', bagId: '', product: '' as BloodProduct | '', volume: '' });
  const [incidentForm, setIncidentForm] = useState({
    transfusionId: '',
    reactionType: '',
    severity: '' as HemovigilanceIncident['severity'] | '',
    description: '',
  });

  const { data: typing } = useBloodTyping(submittedPatientId);
  const { data: crossmatches = [], isLoading: loadingCrossmatches } = useCrossmatches();
  const { data: transfusions = [], isLoading: loadingTransfusions, isError, refetch } = useTransfusions();
  const { data: inventory = [], isLoading: loadingInventory } = useBloodInventory();
  const { data: incidents = [], isLoading: loadingIncidents } = useHemovigilanceIncidents();

  const performCrossmatch = usePerformCrossmatch();
  const startTransfusion = useStartTransfusion();
  const reportIncident = useReportIncident();

  const expiringItems = inventory.filter((i: InventoryItem) => i.isExpiringSoon);
  const activeTransfusions = transfusions.filter((t: Transfusion) => t.status === 'EM_ANDAMENTO');
  const openIncidents = incidents.filter((i: HemovigilanceIncident) => i.status === 'ABERTO');

  const handleCrossmatch = async () => {
    if (!crossmatchForm.patientId || !crossmatchForm.donorBagId) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    try {
      await performCrossmatch.mutateAsync(crossmatchForm);
      toast.success('Prova cruzada realizada.');
      setShowCrossmatch(false);
      setCrossmatchForm({ patientId: '', donorBagId: '' });
    } catch {
      toast.error('Erro ao realizar prova cruzada.');
    }
  };

  const handleStartTransfusion = async () => {
    if (!transfusionForm.patientId || !transfusionForm.bagId || !transfusionForm.product || !transfusionForm.volume) {
      toast.error('Preencha todos os campos.');
      return;
    }
    try {
      await startTransfusion.mutateAsync({
        patientId: transfusionForm.patientId,
        bagId: transfusionForm.bagId,
        product: transfusionForm.product as BloodProduct,
        volume: parseFloat(transfusionForm.volume),
      });
      toast.success('Transfusão iniciada.');
      setShowTransfusion(false);
      setTransfusionForm({ patientId: '', bagId: '', product: '', volume: '' });
    } catch {
      toast.error('Erro ao iniciar transfusão.');
    }
  };

  const handleReportIncident = async () => {
    if (!incidentForm.transfusionId || !incidentForm.reactionType || !incidentForm.severity || !incidentForm.description) {
      toast.error('Preencha todos os campos.');
      return;
    }
    try {
      await reportIncident.mutateAsync({
        transfusionId: incidentForm.transfusionId,
        reactionType: incidentForm.reactionType,
        severity: incidentForm.severity as HemovigilanceIncident['severity'],
        description: incidentForm.description,
      });
      toast.success('Reação transfusional notificada.');
      setShowIncident(false);
      setIncidentForm({ transfusionId: '', reactionType: '', severity: '', description: '' });
    } catch {
      toast.error('Erro ao notificar reação.');
    }
  };

  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Droplets className="h-6 w-6 text-red-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Banco de Sangue</h1>
            <p className="text-sm text-muted-foreground">Tipagem, prova cruzada, transfusões e hemovigilância</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCrossmatch(true)} className="gap-2">
            <GitMerge className="h-4 w-4" />
            Prova Cruzada
          </Button>
          <Button variant="outline" onClick={() => setShowTransfusion(true)} className="gap-2">
            <Activity className="h-4 w-4" />
            Iniciar Transfusão
          </Button>
          <Button variant="destructive" onClick={() => setShowIncident(true)} className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Notificar Reação
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <div className="flex flex-col gap-2">
        {expiringItems.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{expiringItems.length} unidade(s) próxima(s) do vencimento no estoque</span>
          </div>
        )}
        {activeTransfusions.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm text-blue-400">
            <Activity className="h-4 w-4 shrink-0" />
            <span>{activeTransfusions.length} transfusão(ões) em andamento — monitorar sinais vitais</span>
          </div>
        )}
        {openIncidents.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{openIncidents.length} incidente(s) de hemovigilância em aberto</span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="inventory" className="text-xs data-[state=active]:bg-red-700">
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="crossmatch" className="text-xs data-[state=active]:bg-red-700">
            <GitMerge className="mr-1.5 h-3.5 w-3.5" />
            Tipagem / Prova Cruzada
          </TabsTrigger>
          <TabsTrigger value="transfusions" className="text-xs data-[state=active]:bg-red-700">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Transfusões
          </TabsTrigger>
          <TabsTrigger value="hemovigilance" className="text-xs data-[state=active]:bg-red-700">
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            Hemovigilância
            {openIncidents.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-red-600">{openIncidents.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Estoque ─────────────────────────────────────────────────── */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          {loadingInventory ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Estoque de Hemocomponentes ({inventory.length} unidades)</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo Sanguíneo</TableHead>
                    <TableHead>Fator Rh</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Estoque vazio
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory.map((item: InventoryItem) => (
                      <TableRow key={item.id} className={item.isExpiringSoon ? 'bg-amber-500/5' : undefined}>
                        <TableCell className="font-medium text-sm">{PRODUCT_LABELS[item.product]}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('text-lg font-bold px-3', BLOOD_TYPE_COLORS[item.bloodType])}>
                            {item.bloodType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            item.rhFactor === 'POSITIVO' ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400',
                          )}>
                            {item.rhFactor === 'POSITIVO' ? 'Rh+' : 'Rh−'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-lg">{item.quantity}</TableCell>
                        <TableCell className={cn('text-xs', item.isExpiringSoon ? 'text-amber-400 font-medium' : 'text-muted-foreground')}>
                          {new Date(item.expiresAt).toLocaleDateString('pt-BR')}
                          {item.isExpiringSoon && ' ⚠'}
                        </TableCell>
                        <TableCell>
                          {item.isExpiringSoon ? (
                            <Badge className="bg-amber-600 text-xs">Vence em breve</Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-xs">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              OK
                            </Badge>
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

        {/* ── Tab: Tipagem / Prova Cruzada ─────────────────────────────────── */}
        <TabsContent value="crossmatch" className="space-y-4 mt-4">
          {/* Patient typing lookup */}
          <Card className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Buscar Tipagem do Paciente</Label>
                  <Input
                    placeholder="UUID do paciente..."
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setSubmittedPatientId(patientId)}
                    className="bg-background border-border font-mono text-xs"
                  />
                </div>
                <Button onClick={() => setSubmittedPatientId(patientId)} variant="outline" className="gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </Button>
              </div>
              {typing && (
                <div className="mt-4 flex items-center gap-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="text-center">
                    <Badge className={cn('text-3xl font-black px-4 py-2', BLOOD_TYPE_COLORS[typing.bloodType])}>
                      {typing.bloodType}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant="outline" className={cn(
                      'text-sm',
                      typing.rhFactor === 'POSITIVO' ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400',
                    )}>
                      {typing.rhFactor === 'POSITIVO' ? 'Rh Positivo (+)' : 'Rh Negativo (−)'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tipado por: {typing.typedBy} em {new Date(typing.typedAt).toLocaleDateString('pt-BR')}
                    </p>
                    {typing.antibodies.length > 0 && (
                      <div className="mt-1 flex gap-1 flex-wrap">
                        <span className="text-xs text-red-400">Anticorpos:</span>
                        {typing.antibodies.map((ab) => (
                          <Badge key={ab} variant="outline" className="text-xs border-red-500 text-red-400">{ab}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Crossmatches table */}
          {loadingCrossmatches ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Provas Cruzadas ({crossmatches.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Sangue Paciente</TableHead>
                    <TableHead>Bolsa Doador</TableHead>
                    <TableHead>Sangue Doador</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Realizado por</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crossmatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma prova cruzada registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    crossmatches.map((c: Crossmatch) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.patientName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className={cn('text-sm font-bold', BLOOD_TYPE_COLORS[c.patientBloodType])}>
                              {c.patientBloodType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {c.patientRh === 'POSITIVO' ? '+' : '−'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.donorBagId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className={cn('text-sm font-bold', BLOOD_TYPE_COLORS[c.donorBloodType])}>
                              {c.donorBloodType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {c.donorRh === 'POSITIVO' ? '+' : '−'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              c.result === 'COMPATIVEL' ? 'bg-emerald-500/20 text-emerald-400' :
                                c.result === 'INCOMPATIVEL' ? 'bg-red-500/20 text-red-400' :
                                  'bg-amber-500/20 text-amber-400',
                            )}
                          >
                            {c.result === 'COMPATIVEL' ? 'Compatível' :
                              c.result === 'INCOMPATIVEL' ? 'Incompatível' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.testedBy}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.testedAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Transfusões ─────────────────────────────────────────────── */}
        <TabsContent value="transfusions" className="space-y-4 mt-4">
          {loadingTransfusions ? (
            <PageLoading cards={0} showTable />
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transfusões ({transfusions.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Bolsa</TableHead>
                    <TableHead className="text-center">Volume</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Enfermeiro</TableHead>
                    <TableHead>Reações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfusions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma transfusão registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfusions.map((t: Transfusion) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-sm">{t.patientName}</TableCell>
                        <TableCell className="text-sm">{PRODUCT_LABELS[t.product]}</TableCell>
                        <TableCell className="font-mono text-xs">{t.bagId}</TableCell>
                        <TableCell className="text-center text-sm">{t.volume} mL</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              t.status === 'EM_ANDAMENTO' ? 'bg-blue-500/20 text-blue-400' :
                                t.status === 'CONCLUIDA' ? 'bg-emerald-500/20 text-emerald-400' :
                                  t.status === 'REACAO' ? 'bg-red-500/20 text-red-400' :
                                    'bg-zinc-500/20 text-zinc-400',
                            )}
                          >
                            {t.status === 'EM_ANDAMENTO' ? 'Em Andamento' :
                              t.status === 'CONCLUIDA' ? 'Concluída' :
                                t.status === 'REACAO' ? 'Reação' : 'Cancelada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(t.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.nurse}</TableCell>
                        <TableCell>
                          {t.reactions.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">{t.reactions.length} reação(ões)</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem reações</span>
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

        {/* ── Tab: Hemovigilância ──────────────────────────────────────────── */}
        <TabsContent value="hemovigilance" className="space-y-4 mt-4">
          {loadingIncidents ? (
            <PageLoading cards={0} showTable />
          ) : incidents.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum incidente de hemovigilância registrado</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Incidentes de Hemovigilância ({incidents.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo de Reação</TableHead>
                    <TableHead>Gravidade</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notificado por</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((inc: HemovigilanceIncident) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-medium text-sm">{inc.patientName}</TableCell>
                      <TableCell className="text-sm">{inc.reactionType}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-xs', SEVERITY_CONFIG[inc.severity].color)}>
                          {SEVERITY_CONFIG[inc.severity].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-48 truncate">{inc.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            inc.status === 'ABERTO' ? 'border-red-500 text-red-400' :
                              inc.status === 'INVESTIGANDO' ? 'border-amber-500 text-amber-400' :
                                'border-emerald-500 text-emerald-400',
                          )}
                        >
                          {inc.status === 'ABERTO' ? 'Aberto' :
                            inc.status === 'INVESTIGANDO' ? 'Investigando' : 'Concluído'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inc.reportedBy}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inc.reportedAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Crossmatch Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCrossmatch} onOpenChange={setShowCrossmatch}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Realizar Prova Cruzada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">ID do Paciente *</Label>
              <Input
                placeholder="UUID do paciente"
                value={crossmatchForm.patientId}
                onChange={(e) => setCrossmatchForm((p) => ({ ...p, patientId: e.target.value }))}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ID da Bolsa do Doador *</Label>
              <Input
                placeholder="Código da bolsa"
                value={crossmatchForm.donorBagId}
                onChange={(e) => setCrossmatchForm((p) => ({ ...p, donorBagId: e.target.value }))}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCrossmatch(false)}>Cancelar</Button>
            <Button onClick={handleCrossmatch} disabled={performCrossmatch.isPending} className="bg-red-700 hover:bg-red-800">
              {performCrossmatch.isPending ? 'Processando...' : 'Realizar Prova Cruzada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Start Transfusion Dialog ───────────────────────────────────────── */}
      <Dialog open={showTransfusion} onOpenChange={setShowTransfusion}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Transfusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ID do Paciente *</Label>
                <Input
                  placeholder="UUID"
                  value={transfusionForm.patientId}
                  onChange={(e) => setTransfusionForm((p) => ({ ...p, patientId: e.target.value }))}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ID da Bolsa *</Label>
                <Input
                  placeholder="Código"
                  value={transfusionForm.bagId}
                  onChange={(e) => setTransfusionForm((p) => ({ ...p, bagId: e.target.value }))}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Produto *</Label>
              <Select
                value={transfusionForm.product}
                onValueChange={(v) => setTransfusionForm((p) => ({ ...p, product: v as BloodProduct }))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Volume (mL) *</Label>
              <Input
                type="number"
                placeholder="250"
                value={transfusionForm.volume}
                onChange={(e) => setTransfusionForm((p) => ({ ...p, volume: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfusion(false)}>Cancelar</Button>
            <Button onClick={handleStartTransfusion} disabled={startTransfusion.isPending} className="bg-red-700 hover:bg-red-800">
              {startTransfusion.isPending ? 'Iniciando...' : 'Iniciar Transfusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report Incident Dialog ─────────────────────────────────────────── */}
      <Dialog open={showIncident} onOpenChange={setShowIncident}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Notificar Reação Transfusional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">ID da Transfusão *</Label>
              <Input
                placeholder="UUID da transfusão"
                value={incidentForm.transfusionId}
                onChange={(e) => setIncidentForm((p) => ({ ...p, transfusionId: e.target.value }))}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Reação *</Label>
                <Input
                  placeholder="Ex: Febre, Urticária"
                  value={incidentForm.reactionType}
                  onChange={(e) => setIncidentForm((p) => ({ ...p, reactionType: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gravidade *</Label>
                <Select
                  value={incidentForm.severity}
                  onValueChange={(v) => setIncidentForm((p) => ({ ...p, severity: v as HemovigilanceIncident['severity'] }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição *</Label>
              <Input
                placeholder="Descreva a reação observada..."
                value={incidentForm.description}
                onChange={(e) => setIncidentForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncident(false)}>Cancelar</Button>
            <Button onClick={handleReportIncident} disabled={reportIncident.isPending} variant="destructive">
              {reportIncident.isPending ? 'Notificando...' : 'Notificar Reação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
