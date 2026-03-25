import { useState } from 'react';
import {
  Heart,
  Plus,
  Activity,
  Waves,
  Stethoscope,
  Clock,
  Search,
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
  useECGRecords,
  useEchoReports,
  useCatheterizations,
  useHolterReports,
  useStressTests,
  useCardiologyTimeline,
  useCreateECG,
  type ECGRecord,
  type EchoReport,
  type CatheterizationReport,
  type HolterReport,
  type StressTestReport,
  type CardiologyEvent,
} from '@/services/cardiology.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const ECG_STATUS: Record<ECGRecord['status'], { label: string; color: string }> = {
  PENDENTE: { label: 'Pendente', color: 'border-amber-500 text-amber-400' },
  INTERPRETADO: { label: 'Interpretado', color: 'border-blue-500 text-blue-400' },
  REVISADO: { label: 'Revisado', color: 'border-emerald-500 text-emerald-400' },
};

const STRESS_CONCLUSION: Record<StressTestReport['conclusion'], { label: string; color: string }> = {
  NORMAL: { label: 'Normal', color: 'bg-emerald-500/20 text-emerald-400' },
  ALTERADO: { label: 'Alterado', color: 'bg-red-500/20 text-red-400' },
  INCONCLUSIVO: { label: 'Inconclusivo', color: 'bg-amber-500/20 text-amber-400' },
};

const EVENT_TYPE_LABELS: Record<CardiologyEvent['type'], { label: string; icon: React.ReactNode }> = {
  ECG: { label: 'ECG', icon: <Activity className="h-3 w-3" /> },
  ECO: { label: 'Ecocardiograma', icon: <Waves className="h-3 w-3" /> },
  CATETERISMO: { label: 'Cateterismo', icon: <Stethoscope className="h-3 w-3" /> },
  HOLTER: { label: 'Holter', icon: <Clock className="h-3 w-3" /> },
  ERGOMETRICO: { label: 'Ergométrico', icon: <TrendingUp className="h-3 w-3" /> },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CardiologyPage() {
  const [activeTab, setActiveTab] = useState('ecg');
  const [patientId, setPatientId] = useState('');
  const [submittedPatientId, setSubmittedPatientId] = useState('');
  const [showNewEcg, setShowNewEcg] = useState(false);

  const [ecgForm, setEcgForm] = useState({
    heartRate: '',
    rhythm: '',
    axis: '',
    prInterval: '',
    qrsDuration: '',
    qtcInterval: '',
    interpretation: '',
    abnormalities: '',
  });

  const { data: ecgRecords = [], isLoading: loadingEcg } = useECGRecords(submittedPatientId);
  const { data: echoReports = [], isLoading: loadingEcho } = useEchoReports(submittedPatientId);
  const { data: cathReports = [], isLoading: loadingCath } = useCatheterizations(submittedPatientId);
  const { data: holterReports = [], isLoading: loadingHolter } = useHolterReports(submittedPatientId);
  const { data: stressTests = [], isLoading: loadingStress } = useStressTests(submittedPatientId);
  const { data: timeline = [], isLoading: loadingTimeline } = useCardiologyTimeline(submittedPatientId);

  const createECG = useCreateECG();

  const handleSearch = () => {
    if (!patientId.trim()) {
      toast.error('Informe o ID do paciente.');
      return;
    }
    setSubmittedPatientId(patientId.trim());
  };

  const handleCreateECG = async () => {
    if (!submittedPatientId || !ecgForm.heartRate || !ecgForm.rhythm || !ecgForm.axis || !ecgForm.interpretation) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    try {
      await createECG.mutateAsync({
        patientId: submittedPatientId,
        heartRate: parseInt(ecgForm.heartRate, 10),
        rhythm: ecgForm.rhythm,
        axis: ecgForm.axis,
        prInterval: ecgForm.prInterval ? parseInt(ecgForm.prInterval, 10) : undefined,
        qrsDuration: ecgForm.qrsDuration ? parseInt(ecgForm.qrsDuration, 10) : undefined,
        qtcInterval: ecgForm.qtcInterval ? parseInt(ecgForm.qtcInterval, 10) : undefined,
        interpretation: ecgForm.interpretation,
        abnormalities: ecgForm.abnormalities
          ? ecgForm.abnormalities.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      });
      toast.success('ECG registrado com sucesso.');
      setShowNewEcg(false);
      setEcgForm({ heartRate: '', rhythm: '', axis: '', prInterval: '', qrsDuration: '', qtcInterval: '', interpretation: '', abnormalities: '' });
    } catch {
      toast.error('Erro ao registrar ECG.');
    }
  };

  const setEcgField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEcgForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 text-red-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cardiologia</h1>
            <p className="text-sm text-muted-foreground">ECG, ecocardiograma, cateterismo, Holter e ergométrico</p>
          </div>
        </div>
        {submittedPatientId && (
          <Button onClick={() => setShowNewEcg(true)} className="gap-2 bg-red-700 hover:bg-red-800">
            <Plus className="h-4 w-4" />
            Registrar ECG
          </Button>
        )}
      </div>

      {/* Patient search */}
      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">ID do Paciente</Label>
              <Input
                placeholder="UUID do paciente..."
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <Button onClick={handleSearch} className="gap-2 bg-red-700 hover:bg-red-800">
              <Search className="h-4 w-4" />
              Buscar Histórico
            </Button>
          </div>
        </CardContent>
      </Card>

      {!submittedPatientId ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-16">
            <Heart className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Insira o ID do paciente para visualizar o histórico cardiológico</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border flex-wrap h-auto gap-1">
            <TabsTrigger value="ecg" className="text-xs data-[state=active]:bg-red-700">
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              ECG ({ecgRecords.length})
            </TabsTrigger>
            <TabsTrigger value="echo" className="text-xs data-[state=active]:bg-red-700">
              <Waves className="mr-1.5 h-3.5 w-3.5" />
              Ecocardiograma ({echoReports.length})
            </TabsTrigger>
            <TabsTrigger value="cath" className="text-xs data-[state=active]:bg-red-700">
              <Stethoscope className="mr-1.5 h-3.5 w-3.5" />
              Cateterismo ({cathReports.length})
            </TabsTrigger>
            <TabsTrigger value="holter" className="text-xs data-[state=active]:bg-red-700">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Holter ({holterReports.length})
            </TabsTrigger>
            <TabsTrigger value="stress" className="text-xs data-[state=active]:bg-red-700">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Ergométrico ({stressTests.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: ECG ─────────────────────────────────────────────────── */}
          <TabsContent value="ecg" className="space-y-4 mt-4">
            {/* Timeline sidebar */}
            {!loadingTimeline && timeline.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Linha do Tempo Cardiológica</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-4">
                    <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-3">
                      {timeline.map((event: CardiologyEvent) => {
                        const cfg = EVENT_TYPE_LABELS[event.type];
                        return (
                          <div key={event.id} className="relative flex items-start gap-3">
                            <div className="absolute -left-3 mt-0.5 h-2 w-2 rounded-full bg-red-500" />
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="gap-1 text-xs border-red-500/50 text-red-400">
                                  {cfg.icon}
                                  {cfg.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.date).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{event.summary}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingEcg ? (
              <PageLoading cards={0} showTable />
            ) : ecgRecords.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Activity className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum ECG registrado para este paciente</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowNewEcg(true)}>
                    Registrar ECG
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {ecgRecords.map((ecg: ECGRecord) => (
                  <Card key={ecg.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{ecg.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ecg.date).toLocaleString('pt-BR')} • Realizado por: {ecg.performedBy}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn('text-xs', ECG_STATUS[ecg.status].color)}>
                          {ECG_STATUS[ecg.status].label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                        {[
                          { label: 'FC', value: `${ecg.heartRate} bpm`, highlight: ecg.heartRate > 100 || ecg.heartRate < 60 },
                          { label: 'Ritmo', value: ecg.rhythm, highlight: false },
                          { label: 'Eixo', value: ecg.axis, highlight: false },
                          { label: 'PR', value: ecg.prInterval ? `${ecg.prInterval} ms` : '—', highlight: ecg.prInterval != null && ecg.prInterval > 200 },
                          { label: 'QRS', value: ecg.qrsDuration ? `${ecg.qrsDuration} ms` : '—', highlight: ecg.qrsDuration != null && ecg.qrsDuration > 120 },
                          { label: 'QTc', value: ecg.qtcInterval ? `${ecg.qtcInterval} ms` : '—', highlight: ecg.qtcInterval != null && ecg.qtcInterval > 440 },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className="rounded border border-border bg-background p-2 text-center">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={cn('font-bold text-sm mt-0.5', highlight ? 'text-amber-400' : '')}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 rounded border border-border bg-background p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Interpretação</p>
                        <p className="text-sm">{ecg.interpretation}</p>
                      </div>
                      {ecg.abnormalities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ecg.abnormalities.map((ab) => (
                            <Badge key={ab} variant="outline" className="text-xs border-red-500/50 text-red-400">{ab}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Ecocardiograma ──────────────────────────────────────── */}
          <TabsContent value="echo" className="space-y-4 mt-4">
            {loadingEcho ? (
              <PageLoading cards={0} showTable />
            ) : echoReports.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Waves className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum ecocardiograma registrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {echoReports.map((echo: EchoReport) => (
                  <Card key={echo.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">{echo.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(echo.date).toLocaleDateString('pt-BR')} • {echo.performedBy}
                          </p>
                        </div>
                        <div className={cn(
                          'text-center rounded border px-3 py-1',
                          echo.ejectionFraction < 40 ? 'border-red-500 bg-red-500/10' :
                            echo.ejectionFraction < 50 ? 'border-amber-500 bg-amber-500/10' :
                              'border-emerald-500 bg-emerald-500/10',
                        )}>
                          <p className="text-xs text-muted-foreground">FE</p>
                          <p className={cn(
                            'text-xl font-black',
                            echo.ejectionFraction < 40 ? 'text-red-400' :
                              echo.ejectionFraction < 50 ? 'text-amber-400' : 'text-emerald-400',
                          )}>
                            {echo.ejectionFraction}%
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                          { label: 'DDVE', value: `${echo.lvedd} mm`, warn: echo.lvedd > 55 },
                          { label: 'DSVE', value: `${echo.lvesd} mm`, warn: echo.lvesd > 40 },
                          { label: 'AE', value: `${echo.leftAtrium} mm`, warn: echo.leftAtrium > 40 },
                          { label: 'Aorta', value: `${echo.aorticRoot} mm`, warn: echo.aorticRoot > 37 },
                        ].map(({ label, value, warn }) => (
                          <div key={label} className="rounded border border-border bg-background p-2 text-center">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={cn('font-bold text-sm mt-0.5', warn ? 'text-amber-400' : '')}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: 'Válvula Mitral', value: echo.mitralValve },
                          { label: 'Válvula Aórtica', value: echo.aorticValve },
                          { label: 'Válvula Tricúspide', value: echo.tricuspidValve },
                          { label: 'Pericárdio', value: echo.pericardium },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded border border-border bg-background p-2">
                            <p className="text-muted-foreground">{label}</p>
                            <p className="font-medium">{value}</p>
                          </div>
                        ))}
                      </div>
                      {echo.conclusion && (
                        <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Conclusão</p>
                          <p className="text-sm">{echo.conclusion}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Cateterismo ─────────────────────────────────────────── */}
          <TabsContent value="cath" className="space-y-4 mt-4">
            {loadingCath ? (
              <PageLoading cards={0} showTable />
            ) : cathReports.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Stethoscope className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum cateterismo registrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cathReports.map((cath: CatheterizationReport) => (
                  <Card key={cath.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{cath.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(cath.date).toLocaleDateString('pt-BR')} • Operador: {cath.operator} • Acesso: {cath.accessSite}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="rounded border border-border bg-background p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Achados Coronarianos</p>
                          <p className="text-sm">{cath.coronaryFindings}</p>
                        </div>
                        <div className="rounded border border-border bg-background p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Ventriculografia Esquerda</p>
                          <p className="text-sm">{cath.leftVentriculography}</p>
                        </div>
                      </div>
                      {cath.interventions.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Intervenções Realizadas</p>
                          <div className="flex flex-wrap gap-1">
                            {cath.interventions.map((iv) => (
                              <Badge key={iv} variant="secondary" className="text-xs">{iv}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {cath.complications.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Complicações</p>
                          <div className="flex flex-wrap gap-1">
                            {cath.complications.map((c) => (
                              <Badge key={c} className="text-xs bg-red-600">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Conclusão</p>
                        <p className="text-sm">{cath.conclusion}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Holter ──────────────────────────────────────────────── */}
          <TabsContent value="holter" className="space-y-4 mt-4">
            {loadingHolter ? (
              <PageLoading cards={0} showTable />
            ) : holterReports.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Clock className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum Holter registrado</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="text-center">Duração</TableHead>
                      <TableHead className="text-center">FC Mín</TableHead>
                      <TableHead className="text-center">FC Méd</TableHead>
                      <TableHead className="text-center">FC Máx</TableHead>
                      <TableHead className="text-center">ESSV</TableHead>
                      <TableHead className="text-center">ESV</TableHead>
                      <TableHead className="text-center">Pausas</TableHead>
                      <TableHead>Conclusão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holterReports.map((h: HolterReport) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{h.patientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(h.startDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{h.duration}h</TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-sm font-medium', h.minHR < 40 ? 'text-red-400' : '')}>{h.minHR}</span>
                        </TableCell>
                        <TableCell className="text-center text-sm">{h.avgHR}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-sm font-medium', h.maxHR > 150 ? 'text-amber-400' : '')}>{h.maxHR}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-sm', h.svePremature > 100 ? 'text-amber-400 font-medium' : 'text-muted-foreground')}>
                            {h.svePremature.toLocaleString('pt-BR')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-sm', h.vePremature > 1000 ? 'text-red-400 font-medium' : 'text-muted-foreground')}>
                            {h.vePremature.toLocaleString('pt-BR')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-sm', h.pauses > 0 ? 'text-red-400 font-medium' : 'text-muted-foreground')}>
                            {h.pauses}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-40 truncate">{h.conclusion}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: Ergométrico ─────────────────────────────────────────── */}
          <TabsContent value="stress" className="space-y-4 mt-4">
            {loadingStress ? (
              <PageLoading cards={0} showTable />
            ) : stressTests.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <TrendingUp className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum teste ergométrico registrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {stressTests.map((st: StressTestReport) => (
                  <Card key={st.id} className="border-border bg-card">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{st.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(st.date).toLocaleDateString('pt-BR')} • Protocolo: {st.protocol} • {st.performedBy}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', STRESS_CONCLUSION[st.conclusion].color)}
                        >
                          {STRESS_CONCLUSION[st.conclusion].label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                        {[
                          { label: 'Duração', value: `${st.duration} min` },
                          { label: 'FC Máx', value: `${st.maxHR} bpm` },
                          { label: 'FC Alvo', value: `${st.targetHR} bpm` },
                          { label: '% Alvo', value: `${st.percentTarget.toFixed(0)}%`, warn: st.percentTarget < 85 },
                          { label: 'METs', value: st.mets.toFixed(1) },
                          { label: 'PA Máx', value: st.maxBP },
                        ].map(({ label, value, warn }) => (
                          <div key={label} className="rounded border border-border bg-background p-2 text-center">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={cn('font-bold text-sm mt-0.5', warn ? 'text-amber-400' : '')}>{value}</p>
                          </div>
                        ))}
                      </div>
                      {st.stSegmentChanges && (
                        <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/5 p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Alterações de ST</p>
                          <p className="text-sm">{st.stSegmentChanges}</p>
                        </div>
                      )}
                      {st.symptoms.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground">Sintomas:</span>
                          {st.symptoms.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs border-amber-500/50 text-amber-400">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ── Create ECG Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showNewEcg} onOpenChange={setShowNewEcg}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar ECG</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">FC (bpm) *</Label>
                <Input
                  type="number"
                  placeholder="75"
                  value={ecgForm.heartRate}
                  onChange={setEcgField('heartRate')}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ritmo *</Label>
                <Input
                  placeholder="Sinusal"
                  value={ecgForm.rhythm}
                  onChange={setEcgField('rhythm')}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Eixo *</Label>
                <Input
                  placeholder="+60°"
                  value={ecgForm.axis}
                  onChange={setEcgField('axis')}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">PR (ms)</Label>
                <Input
                  type="number"
                  placeholder="160"
                  value={ecgForm.prInterval}
                  onChange={setEcgField('prInterval')}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">QRS (ms)</Label>
                <Input
                  type="number"
                  placeholder="90"
                  value={ecgForm.qrsDuration}
                  onChange={setEcgField('qrsDuration')}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">QTc (ms)</Label>
                <Input
                  type="number"
                  placeholder="420"
                  value={ecgForm.qtcInterval}
                  onChange={setEcgField('qtcInterval')}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Interpretação *</Label>
              <Input
                placeholder="Ex: Ritmo sinusal, sem alterações isquêmicas..."
                value={ecgForm.interpretation}
                onChange={setEcgField('interpretation')}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Anormalidades (separadas por vírgula)</Label>
              <Input
                placeholder="Ex: Bloqueio de ramo direito, Inversão de onda T"
                value={ecgForm.abnormalities}
                onChange={setEcgField('abnormalities')}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEcg(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateECG}
              disabled={createECG.isPending}
              className="bg-red-700 hover:bg-red-800"
            >
              {createECG.isPending ? 'Salvando...' : 'Registrar ECG'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
