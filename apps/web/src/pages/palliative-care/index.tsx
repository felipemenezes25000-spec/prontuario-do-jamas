import { useState } from 'react';
import { Heart, Users, FileText, ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageLoading } from '@/components/common/page-loading';
import {
  usePalliativePatients,
  useCreatePalliativeAssessment,
  useAdvanceDirectives,
  useCreateDirective,
  usePalliativeCarePlans,
  type PalliativeAssessment,
  type AdvanceDirective,
  type PalliativeCarePlan,
  type ESASScore,
} from '@/services/palliative-care.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const DIRECTIVE_TYPE_LABELS: Record<AdvanceDirective['type'], string> = {
  DNR: 'Não Reanimar (DNR)',
  LIVING_WILL: 'Testamento Vital',
  HEALTHCARE_PROXY: 'Procurador de Saúde',
  OTHER: 'Outro',
};

const DIRECTIVE_STATUS_COLORS: Record<AdvanceDirective['status'], string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  REVOKED: 'bg-slate-500/20 text-slate-400',
};

const ESAS_SYMPTOMS = [
  'Dor', 'Cansaço', 'Náusea', 'Depressão', 'Ansiedade',
  'Sonolência', 'Apetite', 'Bem-estar', 'Falta de ar', 'Outros',
];

function PpsBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{score}%</span>
    </div>
  );
}

// ─── Directive Panel ─────────────────────────────────────────────────────────

function DirectivesPanel() {
  const [patientId, setPatientId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [directiveOpen, setDirectiveOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    type: '' as AdvanceDirective['type'],
    content: '',
    witnessName: '',
    documentDate: new Date().toISOString().slice(0, 10),
  });

  const { data: directives, isLoading } = useAdvanceDirectives(searchId);
  const createDirective = useCreateDirective();

  const handleSearch = () => { if (patientId.trim()) setSearchId(patientId.trim()); };

  const handleCreate = async () => {
    if (!form.patientId || !form.type || !form.content || !form.witnessName) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createDirective.mutateAsync(form);
      toast.success('Diretiva antecipada registrada.');
      setDirectiveOpen(false);
      setForm({ patientId: '', type: '' as AdvanceDirective['type'], content: '', witnessName: '', documentDate: new Date().toISOString().slice(0, 10) });
    } catch {
      toast.error('Erro ao registrar diretiva.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="ID do paciente para buscar diretivas" value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-sm" />
        <Button variant="outline" onClick={handleSearch}>Buscar</Button>
        <Button onClick={() => setDirectiveOpen(true)} className="flex items-center gap-2 ml-auto">
          <Plus className="h-4 w-4" />
          Nova Diretiva
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Diretivas Antecipadas de Vontade</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <PageLoading /> : directives && directives.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Testemunha</TableHead>
                  <TableHead>Data do Documento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directives.map((d: AdvanceDirective) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.patientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{DIRECTIVE_TYPE_LABELS[d.type]}</Badge>
                    </TableCell>
                    <TableCell>{d.witnessName}</TableCell>
                    <TableCell>{new Date(d.documentDate).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', DIRECTIVE_STATUS_COLORS[d.status])}>
                        {d.status === 'ACTIVE' ? 'Ativa' : 'Revogada'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              {searchId ? 'Nenhuma diretiva encontrada para este paciente.' : 'Informe o ID do paciente para buscar diretivas.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={directiveOpen} onOpenChange={setDirectiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Diretiva Antecipada de Vontade</DialogTitle>
            <DialogDescription>Registre a vontade antecipada do paciente em conformidade com a CFM 1995/2012.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={form.patientId}
                  onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v as AdvanceDirective['type'] }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DIRECTIVE_TYPE_LABELS) as AdvanceDirective['type'][]).map((k) => (
                      <SelectItem key={k} value={k}>{DIRECTIVE_TYPE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Conteúdo da Diretiva *</Label>
              <Input placeholder="Descreva a diretiva antecipada" value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome da Testemunha *</Label>
                <Input placeholder="Nome completo" value={form.witnessName}
                  onChange={(e) => setForm((p) => ({ ...p, witnessName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data do Documento</Label>
                <Input type="date" value={form.documentDate}
                  onChange={(e) => setForm((p) => ({ ...p, documentDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDirectiveOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createDirective.isPending}>
              {createDirective.isPending ? 'Salvando...' : 'Registrar Diretiva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PalliativeCarePage() {
  const [activeTab, setActiveTab] = useState('patients');

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    patientId: '',
    encounterId: '',
    ppsScore: '',
    prognosis: '',
    goals: '',
    esasScores: ESAS_SYMPTOMS.map((symptom) => ({ symptom, score: 0 })) as ESASScore[],
  });

  const { data: patientsData, isLoading: patientsLoading } = usePalliativePatients();
  const { data: carePlansData, isLoading: carePlansLoading } = usePalliativeCarePlans();
  const createAssessment = useCreatePalliativeAssessment();

  const handleEsasChange = (symptom: string, score: number) => {
    setAssessmentForm((p) => ({
      ...p,
      esasScores: p.esasScores.map((e) => e.symptom === symptom ? { ...e, score } : e),
    }));
  };

  const handleCreateAssessment = async () => {
    if (!assessmentForm.patientId || !assessmentForm.ppsScore || !assessmentForm.prognosis) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createAssessment.mutateAsync({
        patientId: assessmentForm.patientId,
        encounterId: assessmentForm.encounterId,
        ppsScore: Number(assessmentForm.ppsScore),
        esasScores: assessmentForm.esasScores,
        prognosis: assessmentForm.prognosis,
        goals: assessmentForm.goals,
      });
      toast.success('Avaliação paliativa registrada.');
      setAssessmentOpen(false);
      setAssessmentForm({ patientId: '', encounterId: '', ppsScore: '', prognosis: '', goals: '', esasScores: ESAS_SYMPTOMS.map((symptom) => ({ symptom, score: 0 })) });
    } catch {
      toast.error('Erro ao registrar avaliação.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          Cuidados Paliativos
        </h1>
        <p className="text-muted-foreground">
          PPS, Escala ESAS, planos de conforto e diretivas antecipadas de vontade
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="esas" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Escala ESAS
          </TabsTrigger>
          <TabsTrigger value="directives" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Diretivas Antecipadas
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Pacientes ──────────────────────────────────────────────── */}
        <TabsContent value="patients" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{patientsData?.total ?? 0} pacientes em cuidados paliativos</p>
            <Button onClick={() => setAssessmentOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>

          {patientsLoading ? <PageLoading /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {patientsData?.data && patientsData.data.length > 0 ? patientsData.data.map((p: PalliativeAssessment) => (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{p.patientName}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        PPS {p.ppsScore}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Performance Status (PPS)</p>
                      <PpsBar score={p.ppsScore} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Carga Sintomática (ESAS)</p>
                      <div className="flex flex-wrap gap-1">
                        {p.esasScores.filter((e) => e.score >= 4).map((e) => (
                          <Badge key={e.symptom} variant="outline"
                            className={cn('text-xs', e.score >= 7 ? 'border-red-500 text-red-400' : 'border-yellow-500 text-yellow-400')}>
                            {e.symptom}: {e.score}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Prognóstico:</span> {p.prognosis}
                    </p>
                    <p className="text-xs text-muted-foreground">Por: {p.assessedBy} · {new Date(p.assessedAt).toLocaleDateString('pt-BR')}</p>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-2 text-center text-muted-foreground py-10">Nenhum paciente em cuidados paliativos.</div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Escala ESAS ────────────────────────────────────────────── */}
        <TabsContent value="esas" className="space-y-4">
          {carePlansLoading ? <PageLoading /> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {carePlansData?.data && carePlansData.data.length > 0 ? carePlansData.data.map((plan: PalliativeCarePlan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{plan.patientName}</CardTitle>
                      <Badge className={cn('text-xs', plan.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400')}>
                        {plan.status === 'ACTIVE' ? 'Ativo' : 'Concluído'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Controle da Dor</p>
                      <p className="text-sm">{plan.painControl}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Manejo de Sintomas</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {plan.symptomManagement.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Suporte Psicossocial</p>
                      <p className="text-xs">{plan.psychosocialSupport}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Criado em: {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-3 text-center text-muted-foreground py-10">Nenhum plano de cuidados paliativo cadastrado.</div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Diretivas Antecipadas ──────────────────────────────────── */}
        <TabsContent value="directives">
          <DirectivesPanel />
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Nova Avaliação Paliativa ──────────────────────────────── */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação Paliativa</DialogTitle>
            <DialogDescription>Registre o PPS e a carga sintomática (ESAS) do paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={assessmentForm.patientId}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Palliative Performance Scale (PPS) % *</Label>
                <Select value={assessmentForm.ppsScore}
                  onValueChange={(v) => setAssessmentForm((p) => ({ ...p, ppsScore: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map((v) => (
                      <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Escala ESAS — Avaliação de Sintomas (0 = ausente, 10 = máximo)</p>
              <div className="grid grid-cols-2 gap-3">
                {assessmentForm.esasScores.map((esas) => (
                  <div key={esas.symptom} className="flex items-center gap-2">
                    <span className="text-sm w-24 shrink-0">{esas.symptom}</span>
                    <input type="range" min={0} max={10} value={esas.score}
                      onChange={(e) => handleEsasChange(esas.symptom, Number(e.target.value))}
                      className="flex-1 accent-emerald-500" />
                    <span className={cn('text-xs font-semibold w-4', esas.score >= 7 ? 'text-red-400' : esas.score >= 4 ? 'text-yellow-400' : 'text-emerald-400')}>
                      {esas.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Prognóstico *</Label>
              <Input placeholder="Ex: Dias a semanas, Meses" value={assessmentForm.prognosis}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, prognosis: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Objetivos do Cuidado</Label>
              <Input placeholder="Conforto, qualidade de vida, controle de sintomas" value={assessmentForm.goals}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, goals: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessmentOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAssessment} disabled={createAssessment.isPending}>
              {createAssessment.isPending ? 'Salvando...' : 'Registrar Avaliação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
