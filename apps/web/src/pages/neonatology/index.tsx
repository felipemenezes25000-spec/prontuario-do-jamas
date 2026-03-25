import { useState } from 'react';
import { Baby, Weight, Sun, Plus, AlertTriangle } from 'lucide-react';
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
  useNICUAdmissions,
  useCreateNICUAdmission,
  useWeightChart,
  useCreateWeightRecord,
  usePhototherapy,
  useCreatePhototherapy,
  useNeonatalAlerts,
  useAcknowledgeAlert,
  type NICUAdmission,
  type WeightRecord,
  type PhototherapySession,
  type NeonatalAlert,
} from '@/services/neonatology.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const ADMISSION_STATUS_COLORS: Record<NICUAdmission['status'], string> = {
  ADMITTED: 'bg-blue-500/20 text-blue-400',
  DISCHARGED: 'bg-emerald-500/20 text-emerald-400',
  TRANSFERRED: 'bg-yellow-500/20 text-yellow-400',
};

const ADMISSION_STATUS_LABELS: Record<NICUAdmission['status'], string> = {
  ADMITTED: 'Internado',
  DISCHARGED: 'Alta',
  TRANSFERRED: 'Transferido',
};

const PHOTOTHERAPY_TYPE_LABELS: Record<PhototherapySession['type'], string> = {
  CONVENTIONAL: 'Convencional',
  INTENSIVE: 'Intensiva',
  DOUBLE: 'Dupla',
};

const PHOTOTHERAPY_STATUS_COLORS: Record<PhototherapySession['status'], string> = {
  ACTIVE: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
};

const ALERT_SEVERITY_COLORS: Record<NeonatalAlert['severity'], string> = {
  LOW: 'bg-blue-500/20 text-blue-400 border-blue-500',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500',
};

const ALERT_TYPE_LABELS: Record<NeonatalAlert['type'], string> = {
  WEIGHT_LOSS: 'Perda de Peso',
  TEMPERATURE: 'Temperatura',
  BILIRUBIN: 'Bilirrubina',
  APNEA: 'Apneia',
  BRADYCARDIA: 'Bradicardia',
  DESATURATION: 'Dessaturação',
};

// ─── Apgar Display ───────────────────────────────────────────────────────────

function ApgarBadge({ score, minute }: { score: number; minute: number }) {
  const color = score >= 7 ? 'text-emerald-400' : score >= 4 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="text-center">
      <p className={cn('text-lg font-bold', color)}>{score}</p>
      <p className="text-xs text-muted-foreground">{minute}'</p>
    </div>
  );
}

// ─── Weight Chart Panel ───────────────────────────────────────────────────────

function WeightChartPanel() {
  const [patientId, setPatientId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({ patientId: '', weight: '' });

  const { data: weights, isLoading } = useWeightChart(searchId);
  const createWeight = useCreateWeightRecord();

  const handleCreate = async () => {
    if (!weightForm.patientId || !weightForm.weight) {
      toast.error('Informe o ID do paciente e o peso.');
      return;
    }
    try {
      await createWeight.mutateAsync({
        patientId: weightForm.patientId,
        weight: Number(weightForm.weight),
      });
      toast.success('Peso registrado com sucesso.');
      setWeightOpen(false);
      setWeightForm({ patientId: '', weight: '' });
    } catch {
      toast.error('Erro ao registrar peso.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="ID do neonato para buscar controle de peso" value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearchId(patientId.trim())}
          className="max-w-sm" />
        <Button variant="outline" onClick={() => setSearchId(patientId.trim())}>Buscar</Button>
        <Button onClick={() => setWeightOpen(true)} className="flex items-center gap-2 ml-auto">
          <Plus className="h-4 w-4" />
          Registrar Peso
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Controle de Peso Neonatal</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <PageLoading /> : weights && weights.length > 0 ? (
            <>
              {/* Trend summary */}
              {(() => {
                const first = weights[0];
                const last = weights[weights.length - 1];
                if (!first || !last) return null;
                return (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-md bg-muted/40 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Peso ao Nascer</p>
                      <p className="text-lg font-bold">{first.weight}g</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Peso Atual</p>
                      <p className="text-lg font-bold">{last.weight}g</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Variação Total</p>
                      <p className={cn('text-lg font-bold', last.weight >= first.weight ? 'text-emerald-400' : 'text-red-400')}>
                        {last.weight >= first.weight ? '+' : ''}
                        {last.weight - first.weight}g
                      </p>
                    </div>
                  </div>
                );
              })()}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Dia de Vida</TableHead>
                    <TableHead>Peso (g)</TableHead>
                    <TableHead>Variação %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weights.map((w: WeightRecord) => (
                    <TableRow key={w.id}>
                      <TableCell>{new Date(w.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>D{w.dayOfLife}</TableCell>
                      <TableCell className="font-semibold">{w.weight}g</TableCell>
                      <TableCell>
                        <span className={cn('text-sm font-medium',
                          w.percentChange > 0 ? 'text-emerald-400' :
                          w.percentChange < -10 ? 'text-red-400' : 'text-yellow-400')}>
                          {w.percentChange > 0 ? '+' : ''}{w.percentChange.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {Math.abs(w.percentChange) > 10 ? (
                          <Badge variant="outline" className="text-xs border-red-500 text-red-400">Alerta</Badge>
                        ) : w.percentChange < 0 ? (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">Perda fisiológica</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-400">Ganho ponderal</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              {searchId ? 'Nenhum registro de peso encontrado.' : 'Informe o ID do neonato para buscar o controle de peso.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Peso</DialogTitle>
            <DialogDescription>Registre o peso atual do neonato.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>ID do Neonato *</Label>
              <Input placeholder="UUID do paciente" value={weightForm.patientId}
                onChange={(e) => setWeightForm((p) => ({ ...p, patientId: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Peso (gramas) *</Label>
              <Input type="number" placeholder="3200" value={weightForm.weight}
                onChange={(e) => setWeightForm((p) => ({ ...p, weight: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeightOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createWeight.isPending}>
              {createWeight.isPending ? 'Salvando...' : 'Registrar Peso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Phototherapy Panel ───────────────────────────────────────────────────────

function PhototherapyPanel() {
  const [patientId, setPatientId] = useState('');
  const [searchId, setSearchId] = useState('');
  const [ptOpen, setPtOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    type: '' as PhototherapySession['type'],
    bilirubinBefore: '',
    irradiance: '',
    notes: '',
  });

  const { data: sessions, isLoading } = usePhototherapy(searchId);
  const createPt = useCreatePhototherapy();

  const handleCreate = async () => {
    if (!form.patientId || !form.type || !form.bilirubinBefore || !form.irradiance) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createPt.mutateAsync({
        patientId: form.patientId,
        type: form.type,
        bilirubinBefore: Number(form.bilirubinBefore),
        irradiance: Number(form.irradiance),
        notes: form.notes,
      });
      toast.success('Fototerapia iniciada com sucesso.');
      setPtOpen(false);
      setForm({ patientId: '', type: '' as PhototherapySession['type'], bilirubinBefore: '', irradiance: '', notes: '' });
    } catch {
      toast.error('Erro ao iniciar fototerapia.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="ID do neonato para buscar fototerapias" value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearchId(patientId.trim())}
          className="max-w-sm" />
        <Button variant="outline" onClick={() => setSearchId(patientId.trim())}>Buscar</Button>
        <Button onClick={() => setPtOpen(true)} className="flex items-center gap-2 ml-auto">
          <Plus className="h-4 w-4" />
          Iniciar Fototerapia
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Controle de Fototerapia</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <PageLoading /> : sessions && sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Bilirrubina Antes</TableHead>
                  <TableHead>Bilirrubina Após</TableHead>
                  <TableHead>Irradiância</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s: PhototherapySession) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.patientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{PHOTOTHERAPY_TYPE_LABELS[s.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn('font-semibold text-sm', s.bilirubinBefore > 15 ? 'text-red-400' : 'text-yellow-400')}>
                        {s.bilirubinBefore} mg/dL
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.bilirubinAfter ? (
                        <span className={cn('font-semibold text-sm', s.bilirubinAfter <= 12 ? 'text-emerald-400' : 'text-yellow-400')}>
                          {s.bilirubinAfter} mg/dL
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{s.irradiance} μW/cm²</TableCell>
                    <TableCell className="text-sm">{new Date(s.startTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell className="text-sm">
                      {s.endTime ? new Date(s.endTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', PHOTOTHERAPY_STATUS_COLORS[s.status])}>
                        {s.status === 'ACTIVE' ? 'Ativa' : s.status === 'COMPLETED' ? 'Concluída' : 'Suspensa'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              {searchId ? 'Nenhuma fototerapia encontrada.' : 'Informe o ID do neonato para buscar fototerapias.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={ptOpen} onOpenChange={setPtOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Fototerapia</DialogTitle>
            <DialogDescription>Registre o início da fototerapia neonatal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>ID do Neonato *</Label>
              <Input placeholder="UUID" value={form.patientId}
                onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo de Fototerapia *</Label>
              <Select value={form.type}
                onValueChange={(v) => setForm((p) => ({ ...p, type: v as PhototherapySession['type'] }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PHOTOTHERAPY_TYPE_LABELS) as PhototherapySession['type'][]).map((k) => (
                    <SelectItem key={k} value={k}>{PHOTOTHERAPY_TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bilirrubina Antes (mg/dL) *</Label>
                <Input type="number" step="0.1" placeholder="18.5" value={form.bilirubinBefore}
                  onChange={(e) => setForm((p) => ({ ...p, bilirubinBefore: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Irradiância (μW/cm²) *</Label>
                <Input type="number" placeholder="30" value={form.irradiance}
                  onChange={(e) => setForm((p) => ({ ...p, irradiance: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input placeholder="Observações clínicas" value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPtOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createPt.isPending}>
              {createPt.isPending ? 'Iniciando...' : 'Iniciar Fototerapia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NeonatologyPage() {
  const [activeTab, setActiveTab] = useState('admissions');

  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    patientId: '',
    motherName: '',
    gestationalWeeks: '',
    birthWeight: '',
    apgar1: '',
    apgar5: '',
    capurroScore: '',
    deliveryType: '' as NICUAdmission['deliveryType'],
    diagnosis: '',
    bed: '',
  });

  const { data: admissionsData, isLoading: admissionsLoading } = useNICUAdmissions();
  const { data: alertsData } = useNeonatalAlerts();
  const createAdmission = useCreateNICUAdmission();
  const acknowledgeAlert = useAcknowledgeAlert();

  const activeAlerts = alertsData?.data?.filter((a: NeonatalAlert) => !a.acknowledged) ?? [];

  const handleCreateAdmission = async () => {
    if (!admissionForm.patientId || !admissionForm.gestationalWeeks || !admissionForm.birthWeight || !admissionForm.deliveryType || !admissionForm.bed) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await createAdmission.mutateAsync({
        patientId: admissionForm.patientId,
        motherName: admissionForm.motherName,
        gestationalWeeks: Number(admissionForm.gestationalWeeks),
        birthWeight: Number(admissionForm.birthWeight),
        apgar1: Number(admissionForm.apgar1),
        apgar5: Number(admissionForm.apgar5),
        capurroScore: Number(admissionForm.capurroScore),
        deliveryType: admissionForm.deliveryType,
        diagnosis: admissionForm.diagnosis.split(',').map((d) => d.trim()).filter(Boolean),
        bed: admissionForm.bed,
      });
      toast.success('Internação UTIN registrada com sucesso.');
      setAdmissionOpen(false);
      setAdmissionForm({ patientId: '', motherName: '', gestationalWeeks: '', birthWeight: '', apgar1: '', apgar5: '', capurroScore: '', deliveryType: '' as NICUAdmission['deliveryType'], diagnosis: '', bed: '' });
    } catch {
      toast.error('Erro ao registrar internação.');
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert.mutateAsync(id);
      toast.success('Alerta confirmado.');
    } catch {
      toast.error('Erro ao confirmar alerta.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Baby className="h-6 w-6 text-primary" />
            Neonatologia — UTIN
          </h1>
          <p className="text-muted-foreground">
            Admissões UTIN, controle de peso neonatal e fototerapia
          </p>
        </div>
        {activeAlerts.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            {activeAlerts.length} alerta(s) ativo(s)
          </Badge>
        )}
      </div>

      {/* Active alerts strip */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.slice(0, 3).map((alert: NeonatalAlert) => (
            <div key={alert.id}
              className={cn('flex items-center justify-between rounded-lg border p-3', ALERT_SEVERITY_COLORS[alert.severity])}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  <span className="font-medium text-sm">{alert.patientName}</span>
                  <span className="text-xs mx-2">·</span>
                  <span className="text-xs">{ALERT_TYPE_LABELS[alert.type]}</span>
                  <span className="text-xs mx-2">·</span>
                  <span className="text-xs">{alert.message}</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0"
                onClick={() => handleAcknowledge(alert.id)}
                disabled={acknowledgeAlert.isPending}>
                Confirmar
              </Button>
            </div>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="admissions" className="flex items-center gap-2">
            <Baby className="h-4 w-4" />
            Admissões UTIN
          </TabsTrigger>
          <TabsTrigger value="weight" className="flex items-center gap-2">
            <Weight className="h-4 w-4" />
            Controle de Peso
          </TabsTrigger>
          <TabsTrigger value="phototherapy" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Fototerapia
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Admissões UTIN ─────────────────────────────────────────── */}
        <TabsContent value="admissions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {admissionsData?.data?.filter((a: NICUAdmission) => a.status === 'ADMITTED').length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Internados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {admissionsData?.data?.filter((a: NICUAdmission) => a.status === 'DISCHARGED').length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Alta</p>
              </div>
            </div>
            <Button onClick={() => setAdmissionOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Admissão UTIN
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Neonatos Internados</CardTitle></CardHeader>
            <CardContent>
              {admissionsLoading ? <PageLoading /> : admissionsData?.data && admissionsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Neonato</TableHead>
                      <TableHead>Mãe</TableHead>
                      <TableHead>Leito</TableHead>
                      <TableHead>IG Nasc.</TableHead>
                      <TableHead>Peso Nasc.</TableHead>
                      <TableHead>Peso Atual</TableHead>
                      <TableHead>Apgar</TableHead>
                      <TableHead>Capurro</TableHead>
                      <TableHead>Parto</TableHead>
                      <TableHead>Diagnósticos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admissionsData.data.map((a: NICUAdmission) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.patientName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.motherName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{a.bed}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{a.gestationalWeeks}s</TableCell>
                        <TableCell className="text-sm">{a.birthWeight}g</TableCell>
                        <TableCell className={cn('text-sm font-medium', a.currentWeight < a.birthWeight ? 'text-yellow-400' : 'text-emerald-400')}>
                          {a.currentWeight}g
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <ApgarBadge score={a.apgar1} minute={1} />
                            <ApgarBadge score={a.apgar5} minute={5} />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{a.capurroScore}s</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {a.deliveryType === 'VAGINAL' ? 'Normal' : 'Cesárea'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-32">
                            {a.diagnosis.slice(0, 2).map((d, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                            ))}
                            {a.diagnosis.length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{a.diagnosis.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', ADMISSION_STATUS_COLORS[a.status])}>
                            {ADMISSION_STATUS_LABELS[a.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma admissão registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Controle de Peso ───────────────────────────────────────── */}
        <TabsContent value="weight">
          <WeightChartPanel />
        </TabsContent>

        {/* ── Tab 3: Fototerapia ────────────────────────────────────────────── */}
        <TabsContent value="phototherapy">
          <PhototherapyPanel />
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Nova Admissão UTIN ────────────────────────────────────── */}
      <Dialog open={admissionOpen} onOpenChange={setAdmissionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Admissão UTIN</DialogTitle>
            <DialogDescription>Registre a admissão do neonato na Unidade de Terapia Intensiva Neonatal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Neonato *</Label>
                <Input placeholder="UUID do paciente" value={admissionForm.patientId}
                  onChange={(e) => setAdmissionForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Nome da Mãe</Label>
                <Input placeholder="Nome completo da mãe" value={admissionForm.motherName}
                  onChange={(e) => setAdmissionForm((p) => ({ ...p, motherName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>IG ao Nascer (semanas) *</Label>
                <Input type="number" placeholder="34" value={admissionForm.gestationalWeeks}
                  onChange={(e) => setAdmissionForm((p) => ({ ...p, gestationalWeeks: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Peso ao Nascer (g) *</Label>
                <Input type="number" placeholder="2100" value={admissionForm.birthWeight}
                  onChange={(e) => setAdmissionForm((p) => ({ ...p, birthWeight: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Leito *</Label>
                <Input placeholder="UTIN-01" value={admissionForm.bed}
                  onChange={(e) => setAdmissionForm((p) => ({ ...p, bed: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>Apgar 1'</Label>
                <Input type="number" min="0" max="10" placeholder="7" value={admissionForm.apgar1}
                  onChange={(e) => setAdmissionForm((p) => ({ ...p, apgar1: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Apgar 5'</Label>
                <Input type="number" min="0" max="10" placeholder="9" value={admissionForm.apgar5}
                  onChange={(e) => setAdmissionForm((p) => ({ ...p, apgar5: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Capurro (semanas)</Label>
                <Input type="number" step="0.1" placeholder="34.5" value={admissionForm.capurroScore}
                  onChange={(e) => setAdmissionForm((p) => ({ ...p, capurroScore: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Parto *</Label>
                <Select value={admissionForm.deliveryType}
                  onValueChange={(v) => setAdmissionForm((p) => ({ ...p, deliveryType: v as NICUAdmission['deliveryType'] }))}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VAGINAL">Normal / Vaginal</SelectItem>
                    <SelectItem value="CESAREAN">Cesárea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Diagnósticos (separados por vírgula)</Label>
              <Input placeholder="Prematuridade, SDR, Sepse neonatal" value={admissionForm.diagnosis}
                onChange={(e) => setAdmissionForm((p) => ({ ...p, diagnosis: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmissionOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAdmission} disabled={createAdmission.isPending}>
              {createAdmission.isPending ? 'Internando...' : 'Registrar Admissão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
