import { useState } from 'react';
import { Mic, ClipboardList, MessageSquare, Ear, Plus } from 'lucide-react';
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
  useSpeechAssessments,
  useCreateSpeechAssessment,
  useSpeechSessions,
  useCreateSpeechSession,
  type AssessmentType,
  type SpeechAssessment,
  type SpeechSession,
} from '@/services/speech-therapy.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AssessmentType, string> = {
  SWALLOWING: 'Deglutição',
  SPEECH: 'Fala',
  AUDIOMETRY: 'Audiometria',
  LANGUAGE: 'Linguagem',
  VOICE: 'Voz',
};

const TYPE_COLORS: Record<AssessmentType, string> = {
  SWALLOWING: 'bg-blue-500/20 text-blue-400',
  SPEECH: 'bg-emerald-500/20 text-emerald-400',
  AUDIOMETRY: 'bg-purple-500/20 text-purple-400',
  LANGUAGE: 'bg-yellow-500/20 text-yellow-400',
  VOICE: 'bg-orange-500/20 text-orange-400',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SpeechTherapyPage() {
  const [activeTab, setActiveTab] = useState('assessments');
  const [filterType, setFilterType] = useState<AssessmentType | 'ALL'>('ALL');

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    patientId: '',
    encounterId: '',
    assessmentType: '' as AssessmentType,
    findings: '',
    oralMotorExam: '',
    swallowingLevel: '',
    speechIntelligibility: '',
    audiometryResults: '',
    recommendation: '',
  });

  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    patientId: '',
    encounterId: '',
    assessmentId: '',
    type: '' as AssessmentType,
    activitiesPerformed: '',
    evolution: '',
    patientResponse: '',
    nextPlan: '',
    duration: '',
  });

  const { data: assessmentsData, isLoading: assessmentsLoading } = useSpeechAssessments(
    filterType !== 'ALL' ? { type: filterType } : undefined,
  );
  const { data: sessionsData, isLoading: sessionsLoading } = useSpeechSessions();
  const createAssessment = useCreateSpeechAssessment();
  const createSession = useCreateSpeechSession();

  const handleCreateAssessment = async () => {
    if (!assessmentForm.patientId || !assessmentForm.assessmentType || !assessmentForm.findings || !assessmentForm.recommendation) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createAssessment.mutateAsync({
        patientId: assessmentForm.patientId,
        encounterId: assessmentForm.encounterId,
        assessmentType: assessmentForm.assessmentType,
        findings: assessmentForm.findings,
        oralMotorExam: assessmentForm.oralMotorExam,
        swallowingLevel: assessmentForm.swallowingLevel || undefined,
        speechIntelligibility: assessmentForm.speechIntelligibility || undefined,
        audiometryResults: assessmentForm.audiometryResults || undefined,
        recommendation: assessmentForm.recommendation,
      });
      toast.success('Avaliação fonoaudiológica registrada.');
      setAssessmentOpen(false);
      setAssessmentForm({ patientId: '', encounterId: '', assessmentType: '' as AssessmentType, findings: '', oralMotorExam: '', swallowingLevel: '', speechIntelligibility: '', audiometryResults: '', recommendation: '' });
    } catch {
      toast.error('Erro ao registrar avaliação.');
    }
  };

  const handleCreateSession = async () => {
    if (!sessionForm.patientId || !sessionForm.assessmentId || !sessionForm.type || !sessionForm.evolution) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createSession.mutateAsync({
        patientId: sessionForm.patientId,
        encounterId: sessionForm.encounterId,
        assessmentId: sessionForm.assessmentId,
        type: sessionForm.type,
        activitiesPerformed: sessionForm.activitiesPerformed.split(',').map((a) => a.trim()).filter(Boolean),
        evolution: sessionForm.evolution,
        patientResponse: sessionForm.patientResponse,
        nextPlan: sessionForm.nextPlan || undefined,
        duration: Number(sessionForm.duration),
      });
      toast.success('Sessão registrada com sucesso.');
      setSessionOpen(false);
      setSessionForm({ patientId: '', encounterId: '', assessmentId: '', type: '' as AssessmentType, activitiesPerformed: '', evolution: '', patientResponse: '', nextPlan: '', duration: '' });
    } catch {
      toast.error('Erro ao registrar sessão.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mic className="h-6 w-6 text-primary" />
          Fonoaudiologia
        </h1>
        <p className="text-muted-foreground">
          Avaliações de fala, linguagem, deglutição, voz e audiometria
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Terapia de Fala
          </TabsTrigger>
          <TabsTrigger value="audiometry" className="flex items-center gap-2">
            <Ear className="h-4 w-4" />
            Audiometria
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Avaliações ─────────────────────────────────────────────── */}
        <TabsContent value="assessments" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              {(['ALL', 'SWALLOWING', 'SPEECH', 'LANGUAGE', 'VOICE', 'AUDIOMETRY'] as const).map((t) => (
                <Badge
                  key={t}
                  variant={filterType === t ? 'default' : 'outline'}
                  className={cn('cursor-pointer text-xs', filterType !== t && t !== 'ALL' && TYPE_COLORS[t as AssessmentType])}
                  onClick={() => setFilterType(t)}
                >
                  {t === 'ALL' ? 'Todos' : TYPE_LABELS[t as AssessmentType]}
                </Badge>
              ))}
            </div>
            <Button onClick={() => setAssessmentOpen(true)} className="flex items-center gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Avaliações Fonoaudiológicas ({assessmentsData?.total ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {assessmentsLoading ? <PageLoading /> : assessmentsData?.data && assessmentsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Achados</TableHead>
                      <TableHead>Exame Motor Oral</TableHead>
                      <TableHead>Recomendação</TableHead>
                      <TableHead>Avaliado por</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentsData.data.map((a: SpeechAssessment) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.patientName}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', TYPE_COLORS[a.assessmentType])}>
                            {TYPE_LABELS[a.assessmentType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-40 truncate text-sm">{a.findings}</TableCell>
                        <TableCell className="max-w-36 truncate text-sm">{a.oralMotorExam}</TableCell>
                        <TableCell className="max-w-40 truncate text-sm">{a.recommendation}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.assessedBy}</TableCell>
                        <TableCell>{new Date(a.assessedAt).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma avaliação registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Terapia de Fala ────────────────────────────────────────── */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{sessionsData?.total ?? 0} sessões realizadas</p>
            <Button onClick={() => setSessionOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Sessão
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Sessões Terapêuticas</CardTitle></CardHeader>
            <CardContent>
              {sessionsLoading ? <PageLoading /> : sessionsData?.data && sessionsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Sessão #</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Resposta do Paciente</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Terapeuta</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsData.data.map((s: SpeechSession) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.patientName}</TableCell>
                        <TableCell>#{s.sessionNumber}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', TYPE_COLORS[s.type])}>
                            {TYPE_LABELS[s.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-40 truncate text-sm">{s.evolution}</TableCell>
                        <TableCell className="max-w-36 truncate text-sm">{s.patientResponse}</TableCell>
                        <TableCell>{s.duration} min</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.therapist}</TableCell>
                        <TableCell>{new Date(s.date).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma sessão registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Audiometria ────────────────────────────────────────────── */}
        <TabsContent value="audiometry" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Resultados de Audiometria</CardTitle></CardHeader>
            <CardContent>
              {assessmentsLoading ? <PageLoading /> : (
                (() => {
                  const audioAssessments = assessmentsData?.data?.filter(
                    (a: SpeechAssessment) => a.assessmentType === 'AUDIOMETRY' && a.audiometryResults,
                  ) ?? [];
                  return audioAssessments.length > 0 ? (
                    <div className="space-y-3">
                      {audioAssessments.map((a: SpeechAssessment) => (
                        <div key={a.id} className="rounded-lg border border-border p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{a.patientName}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(a.assessedAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Resultado Audiométrico</p>
                              <p>{a.audiometryResults}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Recomendação</p>
                              <p>{a.recommendation}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">Por: {a.assessedBy}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-10">
                      Nenhum resultado de audiometria registrado.
                    </p>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Nova Avaliação ─────────────────────────────────────────── */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Avaliação Fonoaudiológica</DialogTitle>
            <DialogDescription>Registre a avaliação do paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={assessmentForm.patientId}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Avaliação *</Label>
                <Select value={assessmentForm.assessmentType}
                  onValueChange={(v) => setAssessmentForm((p) => ({ ...p, assessmentType: v as AssessmentType }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as AssessmentType[]).map((k) => (
                      <SelectItem key={k} value={k}>{TYPE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Achados *</Label>
              <Input placeholder="Descreva os achados da avaliação" value={assessmentForm.findings}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, findings: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Exame Motor Oral</Label>
              <Input placeholder="Força, mobilidade, tônus" value={assessmentForm.oralMotorExam}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, oralMotorExam: e.target.value }))} />
            </div>
            {assessmentForm.assessmentType === 'SWALLOWING' && (
              <div className="space-y-1">
                <Label>Nível de Deglutição (FOIS/ASHA)</Label>
                <Input placeholder="Ex: FOIS 5 — Via oral plena" value={assessmentForm.swallowingLevel}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, swallowingLevel: e.target.value }))} />
              </div>
            )}
            {assessmentForm.assessmentType === 'AUDIOMETRY' && (
              <div className="space-y-1">
                <Label>Resultados Audiométricos</Label>
                <Input placeholder="Perda bilateral, BERA, etc." value={assessmentForm.audiometryResults}
                  onChange={(e) => setAssessmentForm((p) => ({ ...p, audiometryResults: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Recomendação *</Label>
              <Input placeholder="Conduta e recomendações" value={assessmentForm.recommendation}
                onChange={(e) => setAssessmentForm((p) => ({ ...p, recommendation: e.target.value }))} />
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

      {/* ── Dialog: Registrar Sessão ──────────────────────────────────────── */}
      <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Sessão Terapêutica</DialogTitle>
            <DialogDescription>Documente a sessão de fonoaudiologia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={sessionForm.patientId}
                  onChange={(e) => setSessionForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID da Avaliação *</Label>
                <Input placeholder="UUID da avaliação" value={sessionForm.assessmentId}
                  onChange={(e) => setSessionForm((p) => ({ ...p, assessmentId: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={sessionForm.type}
                  onValueChange={(v) => setSessionForm((p) => ({ ...p, type: v as AssessmentType }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as AssessmentType[]).map((k) => (
                      <SelectItem key={k} value={k}>{TYPE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Duração (min)</Label>
                <Input type="number" placeholder="45" value={sessionForm.duration}
                  onChange={(e) => setSessionForm((p) => ({ ...p, duration: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Atividades (separadas por vírgula)</Label>
              <Input placeholder="Exercícios de deglutição, Sopro" value={sessionForm.activitiesPerformed}
                onChange={(e) => setSessionForm((p) => ({ ...p, activitiesPerformed: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Evolução *</Label>
              <Input placeholder="Descreva a evolução" value={sessionForm.evolution}
                onChange={(e) => setSessionForm((p) => ({ ...p, evolution: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Resposta do Paciente</Label>
              <Input placeholder="Colaborativo, resistente, etc." value={sessionForm.patientResponse}
                onChange={(e) => setSessionForm((p) => ({ ...p, patientResponse: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSession} disabled={createSession.isPending}>
              {createSession.isPending ? 'Salvando...' : 'Registrar Sessão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
