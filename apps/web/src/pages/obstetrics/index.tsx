import { useState } from 'react';
import { Baby, ClipboardList, Activity, Scan, Plus } from 'lucide-react';
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
  useObstetricPatients,
  useCreatePrenatalCard,
  usePartogram,
  useCreatePartogramEntry,
  useUltrasounds,
  useCreateUltrasound,
  type RiskClassification,
  type PrenatalCard,
  type PartogramEntry,
  type UltrasoundRecord,
} from '@/services/obstetrics.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskClassification, string> = {
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  HIGH: 'bg-red-500/20 text-red-400 border-red-500',
};

const RISK_LABELS: Record<RiskClassification, string> = {
  LOW: 'Baixo Risco',
  MEDIUM: 'Risco Médio',
  HIGH: 'Alto Risco',
};

function gestationalAge(weeks: number, days: number) {
  return `${weeks}s${days > 0 ? `+${days}d` : ''}`;
}

function dppFromDum(dum: string): string {
  const d = new Date(dum);
  d.setFullYear(d.getFullYear() + 1);
  d.setMonth(d.getMonth() - 3);
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('pt-BR');
}

// ─── Partogram Panel ─────────────────────────────────────────────────────────

function PartogramPanel() {
  const [encounterId, setEncounterId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [form, setForm] = useState({
    encounterId: '',
    dilation: '',
    descent: '',
    contractionFrequency: '',
    contractionDuration: '',
    fetalHeartRate: '',
    amnioticFluid: '',
    oxytocin: '',
    notes: '',
  });

  const { data: entries, isLoading } = usePartogram(searchId);
  const createEntry = useCreatePartogramEntry();

  const handleCreate = async () => {
    if (!form.encounterId || !form.dilation || !form.fetalHeartRate) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createEntry.mutateAsync({
        encounterId: form.encounterId,
        dilation: Number(form.dilation),
        descent: Number(form.descent),
        contractionFrequency: Number(form.contractionFrequency),
        contractionDuration: Number(form.contractionDuration),
        fetalHeartRate: Number(form.fetalHeartRate),
        amnioticFluid: form.amnioticFluid,
        oxytocin: form.oxytocin ? Number(form.oxytocin) : undefined,
        notes: form.notes,
      });
      toast.success('Registro no partograma adicionado.');
      setEntryOpen(false);
      setForm({ encounterId: '', dilation: '', descent: '', contractionFrequency: '', contractionDuration: '', fetalHeartRate: '', amnioticFluid: '', oxytocin: '', notes: '' });
    } catch {
      toast.error('Erro ao registrar no partograma.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="ID do atendimento (encounterId)" value={encounterId}
          onChange={(e) => setEncounterId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearchId(encounterId.trim())}
          className="max-w-sm" />
        <Button variant="outline" onClick={() => setSearchId(encounterId.trim())}>Buscar</Button>
        <Button onClick={() => setEntryOpen(true)} className="flex items-center gap-2 ml-auto">
          <Plus className="h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Partograma — Evolução do Trabalho de Parto</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <PageLoading /> : entries && entries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Dilatação (cm)</TableHead>
                  <TableHead>Descida</TableHead>
                  <TableHead>Contrações (freq/dur)</TableHead>
                  <TableHead>BCF (bpm)</TableHead>
                  <TableHead>LA</TableHead>
                  <TableHead>Ocitocina</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e: PartogramEntry) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{new Date(e.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>
                      <span className={cn('font-semibold', e.dilation >= 10 ? 'text-emerald-400' : e.dilation >= 6 ? 'text-yellow-400' : 'text-muted-foreground')}>
                        {e.dilation} cm
                      </span>
                    </TableCell>
                    <TableCell>{e.descent}</TableCell>
                    <TableCell className="text-sm">{e.contractionFrequency}/10min · {e.contractionDuration}s</TableCell>
                    <TableCell>
                      <span className={cn('font-semibold text-sm', (e.fetalHeartRate < 110 || e.fetalHeartRate > 160) ? 'text-red-400' : 'text-emerald-400')}>
                        {e.fetalHeartRate}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{e.amnioticFluid}</TableCell>
                    <TableCell className="text-sm">{e.oxytocin ? `${e.oxytocin} mU/min` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              {searchId ? 'Nenhum registro de partograma para este atendimento.' : 'Informe o ID do atendimento para visualizar o partograma.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Registro no Partograma</DialogTitle>
            <DialogDescription>Registre a evolução do trabalho de parto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>ID do Atendimento *</Label>
              <Input placeholder="UUID do atendimento" value={form.encounterId}
                onChange={(e) => setForm((p) => ({ ...p, encounterId: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Dilatação (cm) *</Label>
                <Input type="number" min="0" max="10" placeholder="0–10" value={form.dilation}
                  onChange={(e) => setForm((p) => ({ ...p, dilation: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Descida (planos de De Lee)</Label>
                <Input type="number" placeholder="0–5" value={form.descent}
                  onChange={(e) => setForm((p) => ({ ...p, descent: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Contrações (freq/10min)</Label>
                <Input type="number" placeholder="3" value={form.contractionFrequency}
                  onChange={(e) => setForm((p) => ({ ...p, contractionFrequency: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Duração (seg)</Label>
                <Input type="number" placeholder="40" value={form.contractionDuration}
                  onChange={(e) => setForm((p) => ({ ...p, contractionDuration: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>BCF (bpm) *</Label>
                <Input type="number" placeholder="140" value={form.fetalHeartRate}
                  onChange={(e) => setForm((p) => ({ ...p, fetalHeartRate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Líquido Amniótico</Label>
                <Select value={form.amnioticFluid}
                  onValueChange={(v) => setForm((p) => ({ ...p, amnioticFluid: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLEAR">Claro</SelectItem>
                    <SelectItem value="MECONIUM_I">Mecônio I</SelectItem>
                    <SelectItem value="MECONIUM_II">Mecônio II</SelectItem>
                    <SelectItem value="MECONIUM_III">Mecônio III</SelectItem>
                    <SelectItem value="BLOODY">Sanguinolento</SelectItem>
                    <SelectItem value="ABSENT">Ausente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ocitocina (mU/min)</Label>
              <Input type="number" placeholder="0" value={form.oxytocin}
                onChange={(e) => setForm((p) => ({ ...p, oxytocin: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createEntry.isPending}>
              {createEntry.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Ultrasound Panel ─────────────────────────────────────────────────────────

function UltrasoundPanel() {
  const [patientId, setPatientId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [usgOpen, setUsgOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    gestationalWeeks: '',
    estimatedWeight: '',
    amnioticFluidIndex: '',
    placentaPosition: '',
    fetalPresentation: '',
    observations: '',
  });

  const { data: ultrasounds, isLoading } = useUltrasounds(searchId);
  const createUltrasound = useCreateUltrasound();

  const handleCreate = async () => {
    if (!form.patientId || !form.gestationalWeeks || !form.fetalPresentation) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createUltrasound.mutateAsync({
        patientId: form.patientId,
        gestationalWeeks: Number(form.gestationalWeeks),
        estimatedWeight: Number(form.estimatedWeight),
        amnioticFluidIndex: Number(form.amnioticFluidIndex),
        placentaPosition: form.placentaPosition,
        fetalPresentation: form.fetalPresentation,
        observations: form.observations,
      });
      toast.success('Ultrassonografia registrada.');
      setUsgOpen(false);
      setForm({ patientId: '', gestationalWeeks: '', estimatedWeight: '', amnioticFluidIndex: '', placentaPosition: '', fetalPresentation: '', observations: '' });
    } catch {
      toast.error('Erro ao registrar ultrassonografia.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="ID do paciente para buscar USGs" value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearchId(patientId.trim())}
          className="max-w-sm" />
        <Button variant="outline" onClick={() => setSearchId(patientId.trim())}>Buscar</Button>
        <Button onClick={() => setUsgOpen(true)} className="flex items-center gap-2 ml-auto">
          <Plus className="h-4 w-4" />
          Nova USG
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Ultrassonografias Obstétricas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <PageLoading /> : ultrasounds && ultrasounds.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>IG (USG)</TableHead>
                  <TableHead>Peso Estimado</TableHead>
                  <TableHead>ILA</TableHead>
                  <TableHead>Placenta</TableHead>
                  <TableHead>Apresentação</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultrasounds.map((u: UltrasoundRecord) => (
                  <TableRow key={u.id}>
                    <TableCell>{new Date(u.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-semibold">{u.gestationalWeeks}s</TableCell>
                    <TableCell>{u.estimatedWeight}g</TableCell>
                    <TableCell>
                      <span className={cn('font-semibold', u.amnioticFluidIndex < 5 ? 'text-red-400' : u.amnioticFluidIndex > 25 ? 'text-orange-400' : 'text-emerald-400')}>
                        {u.amnioticFluidIndex} cm
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{u.placentaPosition}</TableCell>
                    <TableCell className="text-sm">{u.fetalPresentation}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground">{u.observations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              {searchId ? 'Nenhuma USG encontrada.' : 'Informe o ID do paciente para buscar.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={usgOpen} onOpenChange={setUsgOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Ultrassonografia Obstétrica</DialogTitle>
            <DialogDescription>Registre os dados da ultrassonografia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={form.patientId}
                  onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>IG pela USG (semanas) *</Label>
                <Input type="number" placeholder="28" value={form.gestationalWeeks}
                  onChange={(e) => setForm((p) => ({ ...p, gestationalWeeks: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Peso Estimado (g)</Label>
                <Input type="number" placeholder="1200" value={form.estimatedWeight}
                  onChange={(e) => setForm((p) => ({ ...p, estimatedWeight: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Índice de LA (cm)</Label>
                <Input type="number" step="0.1" placeholder="12.5" value={form.amnioticFluidIndex}
                  onChange={(e) => setForm((p) => ({ ...p, amnioticFluidIndex: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Posição da Placenta</Label>
                <Input placeholder="Fúndica, Anterior, Prévia" value={form.placentaPosition}
                  onChange={(e) => setForm((p) => ({ ...p, placentaPosition: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Apresentação Fetal *</Label>
                <Select value={form.fetalPresentation}
                  onValueChange={(v) => setForm((p) => ({ ...p, fetalPresentation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cefálica">Cefálica</SelectItem>
                    <SelectItem value="Pélvica">Pélvica</SelectItem>
                    <SelectItem value="Córmica">Córmica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input placeholder="Achados relevantes" value={form.observations}
                onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsgOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createUltrasound.isPending}>
              {createUltrasound.isPending ? 'Salvando...' : 'Registrar USG'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ObstetricsPage() {
  const [activeTab, setActiveTab] = useState('prenatal');
  const [riskFilter, setRiskFilter] = useState<RiskClassification | undefined>(undefined);

  const [prenatalOpen, setPrenatalOpen] = useState(false);
  const [prenatalForm, setPrenatalForm] = useState({
    patientId: '',
    dum: '',
    bloodType: '',
    rh: '',
    previousPregnancies: '',
    previousDeliveries: '',
    previousCesareans: '',
    previousAbortions: '',
  });

  const { data: patientsData, isLoading: patientsLoading } = useObstetricPatients(
    riskFilter ? { risk: riskFilter } : undefined,
  );
  const createPrenatalCard = useCreatePrenatalCard();

  const handleCreateCard = async () => {
    if (!prenatalForm.patientId || !prenatalForm.dum || !prenatalForm.bloodType) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createPrenatalCard.mutateAsync({
        patientId: prenatalForm.patientId,
        dum: prenatalForm.dum,
        bloodType: prenatalForm.bloodType,
        rh: prenatalForm.rh,
        previousPregnancies: Number(prenatalForm.previousPregnancies) || 0,
        previousDeliveries: Number(prenatalForm.previousDeliveries) || 0,
        previousCesareans: Number(prenatalForm.previousCesareans) || 0,
        previousAbortions: Number(prenatalForm.previousAbortions) || 0,
      });
      toast.success('Cartão pré-natal aberto com sucesso.');
      setPrenatalOpen(false);
      setPrenatalForm({ patientId: '', dum: '', bloodType: '', rh: '', previousPregnancies: '', previousDeliveries: '', previousCesareans: '', previousAbortions: '' });
    } catch {
      toast.error('Erro ao abrir cartão pré-natal.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Baby className="h-6 w-6 text-primary" />
          Obstetrícia
        </h1>
        <p className="text-muted-foreground">
          Pré-natal, partograma e ultrassonografias obstétricas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prenatal" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Pré-Natal
          </TabsTrigger>
          <TabsTrigger value="partogram" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Partograma
          </TabsTrigger>
          <TabsTrigger value="ultrasound" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Ultrassonografias
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Pré-Natal ──────────────────────────────────────────────── */}
        <TabsContent value="prenatal" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as RiskClassification[]).map((r) => (
                <Badge key={r} variant={riskFilter === r ? 'default' : 'outline'}
                  className={cn('cursor-pointer text-xs', RISK_COLORS[r])}
                  onClick={() => setRiskFilter(riskFilter === r ? undefined : r)}>
                  {RISK_LABELS[r]}: {patientsData?.data?.filter((p: PrenatalCard) => p.riskClassification === r).length ?? 0}
                </Badge>
              ))}
            </div>
            <Button onClick={() => setPrenatalOpen(true)} className="flex items-center gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Abrir Cartão Pré-Natal
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Gestantes em Acompanhamento ({patientsData?.total ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {patientsLoading ? <PageLoading /> : patientsData?.data && patientsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>DUM</TableHead>
                      <TableHead>DPP</TableHead>
                      <TableHead>IG Atual</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Tipo / Rh</TableHead>
                      <TableHead>G/P/C/A</TableHead>
                      <TableHead>Consultas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsData.data.map((p: PrenatalCard) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.patientName}</TableCell>
                        <TableCell className="text-sm">{new Date(p.dum).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-sm font-medium text-primary">
                          {dppFromDum(p.dum)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {gestationalAge(p.gestationalWeeks, p.gestationalDays)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', RISK_COLORS[p.riskClassification])}>
                            {RISK_LABELS[p.riskClassification]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{p.bloodType} {p.rh}</TableCell>
                        <TableCell className="text-sm">
                          {p.previousPregnancies}G/{p.previousDeliveries}P/{p.previousCesareans}C/{p.previousAbortions}A
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{p.consultations.length}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma gestante em acompanhamento.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Partograma ─────────────────────────────────────────────── */}
        <TabsContent value="partogram">
          <PartogramPanel />
        </TabsContent>

        {/* ── Tab 3: Ultrassonografias ──────────────────────────────────────── */}
        <TabsContent value="ultrasound">
          <UltrasoundPanel />
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Abrir Cartão Pré-Natal ────────────────────────────────── */}
      <Dialog open={prenatalOpen} onOpenChange={setPrenatalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Abrir Cartão Pré-Natal</DialogTitle>
            <DialogDescription>Inicie o acompanhamento pré-natal da gestante.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={prenatalForm.patientId}
                  onChange={(e) => setPrenatalForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>DUM (Data da Última Menstruação) *</Label>
                <Input type="date" value={prenatalForm.dum}
                  onChange={(e) => setPrenatalForm((p) => ({ ...p, dum: e.target.value }))} />
              </div>
            </div>
            {prenatalForm.dum && (
              <div className="rounded-md bg-primary/10 border border-primary/30 p-3 text-sm">
                DPP calculada (Regra de Naegele):{' '}
                <span className="font-bold text-primary">{dppFromDum(prenatalForm.dum)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo Sanguíneo *</Label>
                <Select value={prenatalForm.bloodType}
                  onValueChange={(v) => setPrenatalForm((p) => ({ ...p, bloodType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'AB', 'O'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fator Rh</Label>
                <Select value={prenatalForm.rh}
                  onValueChange={(v) => setPrenatalForm((p) => ({ ...p, rh: v }))}>
                  <SelectTrigger><SelectValue placeholder="Rh" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+">Positivo (+)</SelectItem>
                    <SelectItem value="-">Negativo (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'previousPregnancies', label: 'Gestações (G)' },
                { key: 'previousDeliveries', label: 'Partos (P)' },
                { key: 'previousCesareans', label: 'Cesáreas (C)' },
                { key: 'previousAbortions', label: 'Abortos (A)' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" min="0" placeholder="0"
                    value={prenatalForm[key as keyof typeof prenatalForm]}
                    onChange={(e) => setPrenatalForm((p) => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrenatalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCard} disabled={createPrenatalCard.isPending}>
              {createPrenatalCard.isPending ? 'Abrindo...' : 'Abrir Cartão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
