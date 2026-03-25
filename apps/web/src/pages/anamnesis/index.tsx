import { useState } from 'react';
import {
  BookOpen,
  Pill,
  Heart,
  Cpu,
  GitBranch,
  Clock,
  AlertTriangle,
  Lightbulb,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useProblems,
  useCreateProblem,
  useHomeMedications,
  useCreateHomeMedication,
  useImplantedDevices,
  useGenogram,
  useVisualTimeline,
  useAiInconsistencyCheck,
  useAiAnamnesisSuggestions,
} from '@/services/anamnesis.service';

const DEMO_PATIENT_ID = 'demo-patient-1';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativo', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  INACTIVE: { label: 'Inativo', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
  RESOLVED: { label: 'Resolvido', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
};

const TIMELINE_ICONS: Record<string, string> = {
  encounter: 'text-blue-400',
  document: 'text-purple-400',
  vital_signs: 'text-emerald-400',
  exam: 'text-yellow-400',
};

// ─── Problem Dialog ───────────────────────────────────────────────────────

function ProblemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateProblem();
  const [form, setForm] = useState({
    patientId: DEMO_PATIENT_ID,
    description: '',
    icdCode: '',
    status: 'ACTIVE',
  });

  const handleSubmit = () => {
    if (!form.description) { toast.error('Descricao obrigatoria.'); return; }
    create.mutate(form, {
      onSuccess: () => { toast.success('Problema adicionado!'); onClose(); setForm({ ...form, description: '', icdCode: '' }); },
      onError: () => toast.error('Erro ao adicionar problema.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Problema</DialogTitle>
          <DialogDescription>Adicionar ao prontuario do paciente</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Descricao</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-zinc-950 border-zinc-700" placeholder="Ex: Hipertensao Arterial Sistemica" />
          </div>
          <div className="space-y-1">
            <Label>Codigo CID (opcional)</Label>
            <Input value={form.icdCode} onChange={(e) => setForm({ ...form, icdCode: e.target.value })} className="bg-zinc-950 border-zinc-700" placeholder="Ex: I10" />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
                <SelectItem value="RESOLVED">Resolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Medication Dialog ────────────────────────────────────────────────────

function MedicationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateHomeMedication();
  const [form, setForm] = useState({
    patientId: DEMO_PATIENT_ID,
    medicationName: '',
    dose: '',
    frequency: '',
  });

  const handleSubmit = () => {
    if (!form.medicationName) { toast.error('Nome do medicamento obrigatorio.'); return; }
    create.mutate(form, {
      onSuccess: () => { toast.success('Medicamento adicionado!'); onClose(); setForm({ ...form, medicationName: '', dose: '', frequency: '' }); },
      onError: () => toast.error('Erro ao adicionar medicamento.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Medicamento Domiciliar</DialogTitle>
          <DialogDescription>Medicamento em uso pelo paciente</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Medicamento</Label>
            <Input value={form.medicationName} onChange={(e) => setForm({ ...form, medicationName: e.target.value })} className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Dose</Label>
              <Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} className="bg-zinc-950 border-zinc-700" placeholder="50mg" />
            </div>
            <div className="space-y-1">
              <Label>Frequencia</Label>
              <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="bg-zinc-950 border-zinc-700" placeholder="12/12h" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AnamnesisPage() {
  const [problemDialog, setProblemDialog] = useState(false);
  const [medDialog, setMedDialog] = useState(false);
  const [selectedPatientId] = useState(DEMO_PATIENT_ID);
  const [timelineFilter, setTimelineFilter] = useState<string | undefined>(undefined);
  const [aiComplaint, setAiComplaint] = useState('');

  const { data: problems = [], isLoading } = useProblems(selectedPatientId);
  const { data: meds = [] } = useHomeMedications(selectedPatientId);
  const { data: devices = [] } = useImplantedDevices(selectedPatientId);
  const { data: genogram } = useGenogram(selectedPatientId);
  const { data: timeline } = useVisualTimeline(selectedPatientId, timelineFilter);
  const aiInconsistency = useAiInconsistencyCheck();
  const aiSuggestions = useAiAnamnesisSuggestions();

  const activeProblems = problems.filter((p) => p.status === 'ACTIVE');
  const mriAlertDevices = devices.filter((d) => d.mriAlert);

  const handleInconsistencyCheck = () => {
    aiInconsistency.mutate({ patientId: selectedPatientId }, {
      onSuccess: (data) => {
        if (data.totalFound === 0) toast.success('Nenhuma inconsistencia encontrada!');
        else toast.warning(`${data.totalFound} inconsistencia(s) detectada(s).`);
      },
      onError: () => toast.error('Erro na analise.'),
    });
  };

  const handleSuggestions = () => {
    if (!aiComplaint) { toast.error('Informe a queixa principal.'); return; }
    aiSuggestions.mutate({ patientId: selectedPatientId, chiefComplaint: aiComplaint }, {
      onSuccess: () => toast.success('Sugestoes geradas!'),
      onError: () => toast.error('Erro ao gerar sugestoes.'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">Anamnese e Historia Clinica</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700" onClick={() => setProblemDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Problema
          </Button>
          <Button variant="outline" className="border-zinc-700" onClick={() => setMedDialog(true)}>
            <Pill className="h-4 w-4 mr-2" /> Medicamento
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-xs text-zinc-400">Problemas Ativos</p>
              <p className="text-2xl font-bold text-red-400">{activeProblems.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Pill className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs text-zinc-400">Medicamentos Casa</p>
              <p className="text-2xl font-bold">{meds.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Cpu className="h-5 w-5 text-purple-400" />
            <div>
              <p className="text-xs text-zinc-400">Dispositivos</p>
              <p className="text-2xl font-bold">{devices.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            {mriAlertDevices.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            ) : (
              <Cpu className="h-5 w-5 text-emerald-400" />
            )}
            <div>
              <p className="text-xs text-zinc-400">Alertas RNM</p>
              <p className={cn('text-2xl font-bold', mriAlertDevices.length > 0 ? 'text-red-400' : 'text-emerald-400')}>
                {mriAlertDevices.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="problems">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="problems">Problemas</TabsTrigger>
          <TabsTrigger value="medications">Medicamentos</TabsTrigger>
          <TabsTrigger value="devices">Dispositivos</TabsTrigger>
          <TabsTrigger value="genogram">Genograma</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
        </TabsList>

        {/* Problems */}
        <TabsContent value="problems" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lista de Problemas</CardTitle>
              <Button size="sm" onClick={() => setProblemDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {problems.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum problema registrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Descricao</TableHead>
                      <TableHead>CID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problems.map((p) => {
                      const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.ACTIVE;
                      return (
                        <TableRow key={p.id} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="font-medium">{p.description}</TableCell>
                          <TableCell className="text-zinc-400">{p.icdCode ?? '—'}</TableCell>
                          <TableCell><Badge variant="outline" className={cfg?.className ?? ''}>{cfg?.label ?? p.status}</Badge></TableCell>
                          <TableCell className="text-zinc-400">{formatDate(p.createdAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medications */}
        <TabsContent value="medications" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Medicamentos Domiciliares</CardTitle>
              <Button size="sm" onClick={() => setMedDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {meds.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum medicamento domiciliar registrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Dose</TableHead>
                      <TableHead>Frequencia</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meds.map((m) => (
                      <TableRow key={m.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium">{m.medicationName}</TableCell>
                        <TableCell className="text-zinc-400">{m.dose ?? '—'}</TableCell>
                        <TableCell className="text-zinc-400">{m.frequency ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={m.active ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50'}>
                            {m.active ? 'Ativo' : 'Suspenso'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices */}
        <TabsContent value="devices" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-base">Dispositivos Implantados</CardTitle></CardHeader>
            <CardContent className="p-0">
              {devices.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum dispositivo implantado registrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Fabricante</TableHead>
                      <TableHead>RNM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((d) => (
                      <TableRow key={d.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-400">{d.deviceType}</TableCell>
                        <TableCell className="font-medium">{d.description}</TableCell>
                        <TableCell className="text-zinc-400">{d.manufacturer ?? '—'}</TableCell>
                        <TableCell>
                          {d.mriAlert ? (
                            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Contraindicado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                              Compativel
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Genogram */}
        <TabsContent value="genogram" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-emerald-400" />
                Genograma Interativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!genogram ? (
                <p className="text-center text-zinc-500 py-10">Nenhum genograma registrado para este paciente</p>
              ) : (
                <div className="space-y-3">
                  {genogram.members.map((member, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                        member.deceased ? 'bg-zinc-700 text-zinc-400' : 'bg-emerald-600/20 text-emerald-400',
                      )}>
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          <Badge variant="outline" className="text-xs border-zinc-600">{member.relation}</Badge>
                          {member.deceased && <Badge variant="outline" className="text-xs bg-zinc-700/50 text-zinc-400">Falecido{member.ageAtDeath ? ` (${member.ageAtDeath}a)` : ''}</Badge>}
                        </div>
                        {member.conditions && member.conditions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {member.conditions.map((c, j) => (
                              <Badge key={j} variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">{c}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" />
                Linha do Tempo Clinica
              </CardTitle>
              <Select value={timelineFilter ?? 'all'} onValueChange={(v) => setTimelineFilter(v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-44 bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="encounter">Atendimentos</SelectItem>
                  <SelectItem value="document">Documentos</SelectItem>
                  <SelectItem value="vital_signs">Sinais Vitais</SelectItem>
                  <SelectItem value="exam">Exames</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {!timeline || timeline.items.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum evento na linha do tempo</p>
              ) : (
                <div className="space-y-3">
                  {timeline.items.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                      <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', TIMELINE_ICONS[item.type] ?? 'text-zinc-400')} style={{ backgroundColor: 'currentColor' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.title}</span>
                          <Badge variant="outline" className="text-xs border-zinc-600">{item.type}</Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{item.summary}</p>
                        <p className="text-xs text-zinc-500 mt-1">{formatDate(item.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Features */}
        <TabsContent value="ai" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  Deteccao de Inconsistencias (IA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Analisa alergias, diagnosticos, medicamentos e historia social em busca de contradicoes.
                </p>
                <Button onClick={handleInconsistencyCheck} disabled={aiInconsistency.isPending} className="w-full bg-yellow-600 hover:bg-yellow-700">
                  {aiInconsistency.isPending ? 'Analisando...' : 'Verificar Inconsistencias'}
                </Button>
                {aiInconsistency.data && (
                  <div className="space-y-2 mt-3">
                    {aiInconsistency.data.inconsistencies.length === 0 ? (
                      <p className="text-sm text-emerald-400">Nenhuma inconsistencia detectada.</p>
                    ) : (
                      aiInconsistency.data.inconsistencies.map((inc, i) => (
                        <div key={i} className={cn(
                          'p-2 rounded border',
                          inc.severity === 'HIGH' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30',
                        )}>
                          <p className="text-sm font-medium">{inc.description}</p>
                          <p className="text-xs text-zinc-400 mt-1">{inc.recommendation}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-emerald-400" />
                  Sugestoes de Anamnese (IA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Queixa Principal</Label>
                  <Input value={aiComplaint} onChange={(e) => setAiComplaint(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="Ex: dor de cabeca ha 3 dias" />
                </div>
                <Button onClick={handleSuggestions} disabled={aiSuggestions.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {aiSuggestions.isPending ? 'Gerando...' : 'Sugerir Perguntas'}
                </Button>
                {aiSuggestions.data && (
                  <div className="space-y-2 mt-3">
                    {aiSuggestions.data.suggestedQuestions.map((q, i) => (
                      <div key={i} className="p-2 rounded bg-zinc-800/50 border border-zinc-700 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold text-xs mt-0.5">{i + 1}.</span>
                        <p className="text-sm">{q}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ProblemDialog open={problemDialog} onClose={() => setProblemDialog(false)} />
      <MedicationDialog open={medDialog} onClose={() => setMedDialog(false)} />
    </div>
  );
}
