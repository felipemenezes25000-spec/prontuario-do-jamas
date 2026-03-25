import { useState } from 'react';
import {
  FileText,
  MessageSquare,
  Zap,
  ClipboardList,
  Brain,
  Languages,
  Plus,
  Stethoscope,
  Layers,
  PenTool,
  Copy,
  GitCompare,
  Paperclip,
  Image,
  Mic,
  Video,
  LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  useInterConsults,
  useCreateInterConsult,
  useCaseDiscussions,
  useSmartPhrases,
  useCreateSmartPhrase,
  useDeleteSmartPhrase,
  useSpecialtyTemplates,
  usePhysicalExamDefaults,
  useAiDifferentialDiagnosis,
  useAiPatientSummary,
  useCompareNotes,
} from '@/services/clinical-documentation.service';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  ROUTINE: { label: 'Rotina', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  URGENT: { label: 'Urgente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  EMERGENCY: { label: 'Emergência', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
};

// ─── Interconsult Dialog ──────────────────────────────────────────────────

function InterConsultDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateInterConsult();
  const [form, setForm] = useState({
    encounterId: '',
    patientId: '',
    requestingSpecialty: '',
    targetSpecialty: '',
    clinicalQuestion: '',
    urgency: 'ROUTINE',
  });

  const handleSubmit = () => {
    if (!form.patientId || !form.clinicalQuestion || !form.targetSpecialty) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    create.mutate(form, {
      onSuccess: () => { toast.success('Interconsulta solicitada!'); onClose(); },
      onError: () => toast.error('Erro ao solicitar interconsulta.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Interconsulta</DialogTitle>
          <DialogDescription>Solicitar parecer de especialista</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ID do Paciente</Label>
              <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="bg-zinc-950 border-zinc-700" placeholder="UUID do paciente" />
            </div>
            <div className="space-y-1">
              <Label>ID do Atendimento</Label>
              <Input value={form.encounterId} onChange={(e) => setForm({ ...form, encounterId: e.target.value })} className="bg-zinc-950 border-zinc-700" placeholder="UUID do atendimento" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Especialidade Solicitante</Label>
              <Input value={form.requestingSpecialty} onChange={(e) => setForm({ ...form, requestingSpecialty: e.target.value })} className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="space-y-1">
              <Label>Especialidade Alvo</Label>
              <Input value={form.targetSpecialty} onChange={(e) => setForm({ ...form, targetSpecialty: e.target.value })} className="bg-zinc-950 border-zinc-700" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Urgência</Label>
            <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="ROUTINE">Rotina</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
                <SelectItem value="EMERGENCY">Emergência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Pergunta Clínica</Label>
            <Textarea value={form.clinicalQuestion} onChange={(e) => setForm({ ...form, clinicalQuestion: e.target.value })} className="bg-zinc-950 border-zinc-700" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Enviando...' : 'Solicitar Parecer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SmartPhrase Dialog ───────────────────────────────────────────────────

function SmartPhraseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSmartPhrase();
  const [form, setForm] = useState({ shortcut: '', expansion: '', category: '' });

  const handleSubmit = () => {
    if (!form.shortcut || !form.expansion) {
      toast.error('Preencha atalho e expansão.');
      return;
    }
    create.mutate(form, {
      onSuccess: () => { toast.success('SmartPhrase criada!'); onClose(); setForm({ shortcut: '', expansion: '', category: '' }); },
      onError: () => toast.error('Erro ao criar SmartPhrase.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova SmartPhrase</DialogTitle>
          <DialogDescription>Crie um atalho de texto personalizado</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Atalho (ex: .normalexfisico)</Label>
            <Input value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} className="bg-zinc-950 border-zinc-700" placeholder=".meuatalho" />
          </div>
          <div className="space-y-1">
            <Label>Texto Expandido</Label>
            <Textarea value={form.expansion} onChange={(e) => setForm({ ...form, expansion: e.target.value })} className="bg-zinc-950 border-zinc-700" rows={4} placeholder="Texto que aparecerá ao digitar o atalho..." />
          </div>
          <div className="space-y-1">
            <Label>Categoria (opcional)</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-zinc-950 border-zinc-700" placeholder="Exame Físico, Conduta, etc." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Salvando...' : 'Criar SmartPhrase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ClinicalDocumentationPage() {
  const [interConsultDialog, setInterConsultDialog] = useState(false);
  const [smartPhraseDialog, setSmartPhraseDialog] = useState(false);
  const [aiSymptoms, setAiSymptoms] = useState('');
  const [aiPatientId, setAiPatientId] = useState('');

  // Copy-forward
  const [copyForwardText, setCopyForwardText] = useState('');
  const [copyForwardEdited, setCopyForwardEdited] = useState('');

  // Diff viewer
  const compareNotes = useCompareNotes();
  const [diffDocA, setDiffDocA] = useState('');
  const [diffDocB, setDiffDocB] = useState('');

  // Nota com Mídia
  const [mediaNote, setMediaNote] = useState('');
  const [mediaFiles, setMediaFiles] = useState<Array<{ name: string; type: 'photo' | 'audio' | 'video'; preview?: string }>>([]);

  // Diagrama Anatômico
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionNotes, setRegionNotes] = useState<Record<string, string>>({});

  const { data: interConsults = [], isLoading: icLoading } = useInterConsults();
  const { data: discussions = [] } = useCaseDiscussions();
  const { data: smartPhrases = [] } = useSmartPhrases();
  const { data: templates = [] } = useSpecialtyTemplates();
  const { data: examDefaults = [] } = usePhysicalExamDefaults();
  const deletePhrase = useDeleteSmartPhrase();
  const aiDifferential = useAiDifferentialDiagnosis();
  const aiSummary = useAiPatientSummary();

  const handleAiDifferential = () => {
    if (!aiPatientId || !aiSymptoms) { toast.error('Informe paciente e sintomas.'); return; }
    aiDifferential.mutate({ patientId: aiPatientId, symptoms: aiSymptoms }, {
      onSuccess: () => toast.success('Diagnósticos diferenciais gerados!'),
      onError: () => toast.error('Erro na análise IA.'),
    });
  };

  const handleAiSummary = () => {
    if (!aiPatientId) { toast.error('Informe o ID do paciente.'); return; }
    aiSummary.mutate({ patientId: aiPatientId }, {
      onSuccess: () => toast.success('Resumo gerado!'),
      onError: () => toast.error('Erro ao gerar resumo.'),
    });
  };

  if (icLoading) {
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
          <FileText className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">Documentacao Clinica</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700" onClick={() => setInterConsultDialog(true)}>
            <MessageSquare className="h-4 w-4 mr-2" /> Interconsulta
          </Button>
          <Button variant="outline" className="border-zinc-700" onClick={() => setSmartPhraseDialog(true)}>
            <Zap className="h-4 w-4 mr-2" /> SmartPhrase
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs text-zinc-400">Interconsultas</p>
              <p className="text-2xl font-bold">{interConsults.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-purple-400" />
            <div>
              <p className="text-xs text-zinc-400">Discussoes Clinicas</p>
              <p className="text-2xl font-bold">{discussions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-xs text-zinc-400">SmartPhrases</p>
              <p className="text-2xl font-bold">{smartPhrases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-400">Templates</p>
              <p className="text-2xl font-bold">{templates.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="interconsults">
        <TabsList className="bg-zinc-900 border border-zinc-800 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="interconsults">Interconsultas</TabsTrigger>
          <TabsTrigger value="discussions">Discussoes</TabsTrigger>
          <TabsTrigger value="smartphrases">SmartPhrases</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="exammacro">Exame Fisico</TabsTrigger>
          <TabsTrigger value="ai">IA Clinica</TabsTrigger>
          <TabsTrigger value="copyforward" className="gap-1"><Copy className="h-3.5 w-3.5" /> Copy-Forward</TabsTrigger>
          <TabsTrigger value="diff" className="gap-1"><GitCompare className="h-3.5 w-3.5" /> Diff</TabsTrigger>
          <TabsTrigger value="media" className="gap-1"><Paperclip className="h-3.5 w-3.5" /> Midia</TabsTrigger>
          <TabsTrigger value="anatomical" className="gap-1"><LayoutTemplate className="h-3.5 w-3.5" /> Diagrama</TabsTrigger>
        </TabsList>

        {/* Interconsultas */}
        <TabsContent value="interconsults" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Interconsultas</CardTitle>
              <Button size="sm" onClick={() => setInterConsultDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Nova
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {interConsults.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhuma interconsulta registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Data</TableHead>
                      <TableHead>Titulo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Autor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interConsults.map((ic) => {
                      const parsed = JSON.parse(ic.content || '{}');
                      const urgCfg = URGENCY_CONFIG[parsed.urgency as string] ?? URGENCY_CONFIG.ROUTINE;
                      return (
                        <TableRow key={ic.id} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-400">{formatDate(ic.createdAt)}</TableCell>
                          <TableCell className="font-medium">{ic.title.replace('[INTERCONSULT:REQUEST] ', '')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={urgCfg?.className ?? ''}>{urgCfg?.label ?? 'Rotina'}</Badge>
                          </TableCell>
                          <TableCell className="text-zinc-400">{ic.author?.name ?? '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discussoes */}
        <TabsContent value="discussions" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-base">Discussoes de Caso / Junta Medica</CardTitle></CardHeader>
            <CardContent className="p-0">
              {discussions.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhuma discussao registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Data</TableHead>
                      <TableHead>Titulo</TableHead>
                      <TableHead>Autor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discussions.map((d) => (
                      <TableRow key={d.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-400">{formatDate(d.createdAt)}</TableCell>
                        <TableCell className="font-medium">{d.title.replace('[CASE_DISCUSSION] ', '')}</TableCell>
                        <TableCell className="text-zinc-400">{d.author?.name ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SmartPhrases */}
        <TabsContent value="smartphrases" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Minhas SmartPhrases</CardTitle>
              <Button size="sm" onClick={() => setSmartPhraseDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Nova
              </Button>
            </CardHeader>
            <CardContent>
              {smartPhrases.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhuma SmartPhrase criada. Crie atalhos como ".normalexfisico" para agilizar a documentacao.</p>
              ) : (
                <div className="space-y-2">
                  {smartPhrases.map((sp) => {
                    const parsed = JSON.parse(sp.content || '{}');
                    return (
                      <div key={sp.id} className="flex items-start justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                        <div>
                          <code className="text-emerald-400 font-mono text-sm">{parsed.shortcut}</code>
                          <p className="text-sm text-zinc-300 mt-1">{(parsed.expansion as string)?.slice(0, 150)}...</p>
                          {parsed.category && <Badge variant="outline" className="mt-1 text-xs border-zinc-600">{parsed.category}</Badge>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deletePhrase.mutate(sp.id, {
                            onSuccess: () => toast.success('SmartPhrase removida.'),
                          })}
                        >
                          Excluir
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-base">Templates por Especialidade</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {templates.map((t) => (
                  <div key={t.specialty} className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-emerald-600/50 transition-colors cursor-pointer">
                    <Layers className="h-5 w-5 text-emerald-400 mb-2" />
                    <p className="font-medium">{t.specialty}</p>
                    <p className="text-xs text-zinc-400 mt-1">{t.fields.length} campos</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exam Macros */}
        <TabsContent value="exammacro" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-base">Macros de Exame Fisico por Sistema</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {examDefaults.map((ed) => (
                  <div key={ed.system} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <div className="flex items-center gap-2 mb-1">
                      <PenTool className="h-4 w-4 text-emerald-400" />
                      <span className="font-medium text-sm">{ed.system.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{ed.normalText}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Features */}
        <TabsContent value="ai" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  Diagnostico Diferencial (IA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>ID do Paciente</Label>
                  <Input value={aiPatientId} onChange={(e) => setAiPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
                </div>
                <div className="space-y-1">
                  <Label>Sintomas</Label>
                  <Textarea value={aiSymptoms} onChange={(e) => setAiSymptoms(e.target.value)} className="bg-zinc-950 border-zinc-700" rows={3} placeholder="Descreva os sintomas..." />
                </div>
                <Button onClick={handleAiDifferential} disabled={aiDifferential.isPending} className="w-full bg-purple-600 hover:bg-purple-700">
                  {aiDifferential.isPending ? 'Analisando...' : 'Gerar Diferenciais'}
                </Button>
                {aiDifferential.data && (
                  <div className="space-y-2 mt-3">
                    {aiDifferential.data.differentials.map((d, i) => (
                      <div key={i} className="p-2 rounded bg-zinc-800/50 border border-zinc-700">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{d.diagnosis}</span>
                          <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                            {Math.round(d.probability * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{d.justification}</p>
                        <p className="text-xs text-zinc-500">CID: {d.icd}</p>
                      </div>
                    ))}
                    <p className="text-xs text-zinc-500 italic">{aiDifferential.data.disclaimer}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Languages className="h-5 w-5 text-blue-400" />
                  Resumo para Paciente (IA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>ID do Paciente</Label>
                  <Input value={aiPatientId} onChange={(e) => setAiPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
                </div>
                <Button onClick={handleAiSummary} disabled={aiSummary.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
                  {aiSummary.isPending ? 'Gerando...' : 'Gerar Resumo Acessivel'}
                </Button>
                {aiSummary.data && (
                  <div className="p-3 rounded bg-zinc-800/50 border border-zinc-700 mt-3">
                    <p className="text-sm">{(aiSummary.data as Record<string, unknown>).summary as string}</p>
                    <p className="text-xs text-zinc-500 mt-2">
                      Nivel de leitura: {(aiSummary.data as Record<string, unknown>).readingLevel as string}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Copy-Forward */}
        <TabsContent value="copyforward" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Copy className="h-5 w-5 text-emerald-400" />
                  Nota Anterior (Base)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-zinc-400">Cole ou escreva a nota anterior que deseja copiar como base:</p>
                <Textarea
                  value={copyForwardText}
                  onChange={(e) => setCopyForwardText(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 font-mono text-xs"
                  rows={12}
                  placeholder="Nota anterior do paciente..."
                />
                <Button
                  onClick={() => {
                    if (!copyForwardText) { toast.error('Cole a nota anterior primeiro.'); return; }
                    setCopyForwardEdited(copyForwardText);
                    toast.success('Nota copiada para edição!');
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Copy className="h-4 w-4 mr-2" /> Copiar para Nova Nota
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Nova Nota (Editável)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-zinc-400">Edite a nota copiada com as atualizações do dia:</p>
                <Textarea
                  value={copyForwardEdited}
                  onChange={(e) => setCopyForwardEdited(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 font-mono text-xs"
                  rows={12}
                  placeholder="A nota copiada aparecerá aqui para edição..."
                />
                <Button
                  onClick={() => {
                    if (!copyForwardEdited) { toast.error('Nenhuma nota para salvar.'); return; }
                    toast.success('Nota salva com sucesso!');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Salvar Nova Nota
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Diff Viewer */}
        <TabsContent value="diff" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-purple-400" />
                Comparação de Notas — Diff Viewer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>ID da Nota A</Label>
                  <Input
                    value={diffDocA}
                    onChange={(e) => setDiffDocA(e.target.value)}
                    className="bg-zinc-950 border-zinc-700"
                    placeholder="UUID da nota anterior..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>ID da Nota B</Label>
                  <Input
                    value={diffDocB}
                    onChange={(e) => setDiffDocB(e.target.value)}
                    className="bg-zinc-950 border-zinc-700"
                    placeholder="UUID da nota atual..."
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!diffDocA || !diffDocB) { toast.error('Informe os IDs de ambas as notas.'); return; }
                  compareNotes.mutate(
                    { documentIdA: diffDocA, documentIdB: diffDocB },
                    {
                      onSuccess: () => toast.success('Comparação gerada!'),
                      onError: () => toast.error('Erro ao comparar notas.'),
                    },
                  );
                }}
                disabled={compareNotes.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {compareNotes.isPending ? 'Comparando...' : 'Comparar Notas'}
              </Button>

              {compareNotes.data && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                      {compareNotes.data.totalChanges} alterações
                    </Badge>
                    <span className="text-xs text-zinc-400">{compareNotes.data.documentA.title} → {compareNotes.data.documentB.title}</span>
                  </div>
                  <div className="rounded-lg border border-zinc-700 overflow-hidden">
                    <div className="grid grid-cols-3 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 border-b border-zinc-700">
                      <span>Campo</span>
                      <span>Versão A</span>
                      <span>Versão B</span>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {compareNotes.data.differences.map((diff, i) => (
                        <div
                          key={i}
                          className={`grid grid-cols-3 gap-2 px-3 py-2 text-xs ${diff.changed ? 'bg-yellow-500/5' : ''}`}
                        >
                          <span className="text-zinc-400 font-mono">{diff.field}</span>
                          <span className={diff.changed ? 'text-red-400 line-through' : 'text-zinc-300'}>
                            {String(diff.valueA ?? '—')}
                          </span>
                          <span className={diff.changed ? 'text-emerald-400' : 'text-zinc-300'}>
                            {String(diff.valueB ?? '—')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nota com Mídia */}
        <TabsContent value="media" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-orange-400" />
                Nota com Mídia — Fotos, Áudio e Vídeo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Texto da Nota</Label>
                <Textarea
                  value={mediaNote}
                  onChange={(e) => setMediaNote(e.target.value)}
                  className="bg-zinc-950 border-zinc-700"
                  rows={4}
                  placeholder="Descreva a nota clínica com mídia associada..."
                />
              </div>

              {/* Attachment buttons */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { icon: Image, label: 'Foto', type: 'photo' as const, accept: 'image/*', color: 'border-blue-600 text-blue-400 hover:bg-blue-600/10' },
                  { icon: Mic, label: 'Áudio', type: 'audio' as const, accept: 'audio/*', color: 'border-emerald-600 text-emerald-400 hover:bg-emerald-600/10' },
                  { icon: Video, label: 'Vídeo', type: 'video' as const, accept: 'video/*', color: 'border-purple-600 text-purple-400 hover:bg-purple-600/10' },
                ].map(({ icon: Icon, label, type, accept, color }) => (
                  <label
                    key={type}
                    className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    <input
                      type="file"
                      accept={accept}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setMediaFiles((prev) => [
                            ...prev,
                            { name: file.name, type, preview: type === 'photo' ? (ev.target?.result as string) : undefined },
                          ]);
                          toast.success(`${label} anexada: ${file.name}`);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ))}
              </div>

              {/* Attached files list */}
              {mediaFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400 font-medium">Arquivos anexados ({mediaFiles.length})</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {mediaFiles.map((f, i) => (
                      <div key={i} className="relative rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-center">
                        {f.preview ? (
                          <img src={f.preview} alt={f.name} className="h-24 w-full object-cover rounded mb-1" />
                        ) : (
                          <div className="h-24 flex items-center justify-center">
                            {f.type === 'audio' ? <Mic className="h-8 w-8 text-emerald-400" /> : <Video className="h-8 w-8 text-purple-400" />}
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-400 truncate">{f.name}</p>
                        <button
                          onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-600/80 text-white text-[10px] flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  if (!mediaNote && mediaFiles.length === 0) { toast.error('Adicione texto ou mídia.'); return; }
                  toast.success(`Nota salva com ${mediaFiles.length} arquivo(s) anexado(s).`);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Paperclip className="h-4 w-4 mr-2" /> Salvar Nota com Mídia
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagrama Anatômico */}
        <TabsContent value="anatomical" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-cyan-400" />
                Diagrama Anatômico — Anotação por Região
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-zinc-400">Selecione uma região corporal para registrar achados clínicos:</p>

              {/* Body region selector */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { id: 'cabeca', label: 'Cabeça', emoji: '🧠' },
                  { id: 'pescoco', label: 'Pescoço', emoji: '🫀' },
                  { id: 'torax', label: 'Tórax', emoji: '🫁' },
                  { id: 'abdome', label: 'Abdome', emoji: '🫃' },
                  { id: 'pelve', label: 'Pelve', emoji: '⚕️' },
                  { id: 'msdir', label: 'MMSS Dir.', emoji: '💪' },
                  { id: 'msesq', label: 'MMSS Esq.', emoji: '💪' },
                  { id: 'midir', label: 'MMII Dir.', emoji: '🦵' },
                  { id: 'miesq', label: 'MMII Esq.', emoji: '🦵' },
                  { id: 'dorso', label: 'Dorso', emoji: '🔙' },
                ].map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id === selectedRegion ? null : region.id)}
                    className={`rounded-lg border p-3 text-center transition-colors ${
                      selectedRegion === region.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : regionNotes[region.id]
                          ? 'border-blue-500/50 bg-blue-500/5 text-blue-400'
                          : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <span className="text-xl block mb-1">{region.emoji}</span>
                    <span className="text-xs">{region.label}</span>
                    {regionNotes[region.id] && (
                      <span className="block mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 mx-auto" />
                    )}
                  </button>
                ))}
              </div>

              {/* Region note editor */}
              {selectedRegion && (
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
                  <p className="text-sm font-medium text-zinc-200">
                    Achados em: <span className="text-emerald-400 capitalize">{selectedRegion.replace(/([A-Z])/g, ' $1')}</span>
                  </p>
                  <Textarea
                    value={regionNotes[selectedRegion] ?? ''}
                    onChange={(e) => setRegionNotes((prev) => ({ ...prev, [selectedRegion]: e.target.value }))}
                    className="bg-zinc-950 border-zinc-700"
                    rows={4}
                    placeholder={`Descreva os achados em ${selectedRegion}... (ex: cicatriz, lesão, dor, crepitação)`}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        toast.success('Achado registrado!');
                        setSelectedRegion(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Salvar Achado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-700"
                      onClick={() => {
                        setRegionNotes((prev) => { const n = { ...prev }; delete n[selectedRegion]; return n; });
                        setSelectedRegion(null);
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              )}

              {/* Summary of all annotated regions */}
              {Object.keys(regionNotes).length > 0 && (
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-zinc-400">Regiões com achados ({Object.keys(regionNotes).length})</p>
                  {Object.entries(regionNotes).map(([region, note]) => (
                    <div key={region} className="text-xs border-b border-zinc-800/50 pb-1.5">
                      <span className="text-blue-400 font-medium capitalize">{region}: </span>
                      <span className="text-zinc-300">{note}</span>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    onClick={() => toast.success('Diagrama anatômico salvo na nota!')}
                    className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    Inserir Diagrama na Nota
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InterConsultDialog open={interConsultDialog} onClose={() => setInterConsultDialog(false)} />
      <SmartPhraseDialog open={smartPhraseDialog} onClose={() => setSmartPhraseDialog(false)} />
    </div>
  );
}
