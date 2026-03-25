import { useState } from 'react';
import { Baby, TrendingUp, Syringe, Star, Calculator, Plus } from 'lucide-react';
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
import { PageLoading } from '@/components/common/page-loading';
import {
  usePediatricPatients,
  useGrowthData,
  useCreateGrowthMeasurement,
  useVaccinations,
  useAdministerVaccine,
  useMilestones,
  useCalculateDose,
  type PediatricPatient,
  type Vaccination,
  type DevelopmentalMilestone,
} from '@/services/pediatrics.service';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const VACCINE_STATUS_COLORS: Record<Vaccination['status'], string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  ADMINISTERED: 'bg-emerald-500/20 text-emerald-400',
  DELAYED: 'bg-yellow-500/20 text-yellow-400',
  CONTRAINDICATED: 'bg-red-500/20 text-red-400',
};

const VACCINE_STATUS_LABELS: Record<Vaccination['status'], string> = {
  SCHEDULED: 'Agendada',
  ADMINISTERED: 'Aplicada',
  DELAYED: 'Atrasada',
  CONTRAINDICATED: 'Contraindicada',
};

const MILESTONE_CATEGORY_LABELS: Record<DevelopmentalMilestone['category'], string> = {
  MOTOR: 'Motor',
  LANGUAGE: 'Linguagem',
  SOCIAL: 'Social',
  COGNITIVE: 'Cognitivo',
};

// ─── Percentile bar ──────────────────────────────────────────────────────────

function PercentileBar({ value, label }: { value: number; label: string }) {
  const color = value < 3 ? 'bg-red-500' : value > 97 ? 'bg-orange-500' : 'bg-emerald-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">P{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

// ─── Patient Panel with per-patient data ─────────────────────────────────────

function PatientDetailPanel({ patient }: { patient: PediatricPatient }) {
  const { data: growth } = useGrowthData(patient.patientId);
  const { data: vaccinations } = useVaccinations(patient.patientId);
  const { data: milestones } = useMilestones(patient.patientId);
  const administerVaccine = useAdministerVaccine();

  const ageYears = Math.floor(patient.ageMonths / 12);
  const ageMonthsRem = patient.ageMonths % 12;

  const handleAdminister = async (v: Vaccination) => {
    try {
      await administerVaccine.mutateAsync({
        vaccinationId: v.id,
        administeredDate: new Date().toISOString().slice(0, 10),
        lot: 'A/V',
        site: 'Deltóide D',
      });
      toast.success(`Vacina ${v.vaccineName} registrada.`);
    } catch {
      toast.error('Erro ao registrar vacina.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
          <Baby className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{patient.patientName}</p>
          <p className="text-sm text-muted-foreground">
            {ageYears > 0 ? `${ageYears}a ` : ''}{ageMonthsRem}m · {patient.weight} kg · {patient.height} cm
          </p>
        </div>
        {patient.vaccinesPending > 0 && (
          <Badge variant="outline" className="ml-auto text-xs border-yellow-500 text-yellow-400">
            {patient.vaccinesPending} vacina(s) pendente(s)
          </Badge>
        )}
      </div>

      {/* Growth */}
      {growth && growth.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Última Medição Antropométrica</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(() => {
              const last = growth[growth.length - 1];
              if (!last) return null;
              return (
                <>
                  <PercentileBar value={last.weightPercentile} label={`Peso: ${last.weight} kg`} />
                  <PercentileBar value={last.heightPercentile} label={`Estatura: ${last.height} cm`} />
                  <PercentileBar value={last.bmiPercentile} label={`IMC: ${last.bmi.toFixed(1)}`} />
                  <p className="text-xs text-muted-foreground">{new Date(last.date).toLocaleDateString('pt-BR')}</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Pending vaccines */}
      {vaccinations && vaccinations.filter((v) => v.status !== 'ADMINISTERED').length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vacinas Pendentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vaccinations.filter((v) => v.status !== 'ADMINISTERED').slice(0, 4).map((v) => (
                <div key={v.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{v.vaccineName} — {v.dose}</p>
                    <p className="text-xs text-muted-foreground">
                      Prevista: {new Date(v.scheduledDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', VACCINE_STATUS_COLORS[v.status])}>
                      {VACCINE_STATUS_LABELS[v.status]}
                    </Badge>
                    {v.status === 'SCHEDULED' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => handleAdminister(v)}
                        disabled={administerVaccine.isPending}>
                        Aplicar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones summary */}
      {milestones && milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Marcos do Desenvolvimento</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {(['MOTOR', 'LANGUAGE', 'SOCIAL', 'COGNITIVE'] as DevelopmentalMilestone['category'][]).map((cat) => {
                const catMilestones = milestones.filter((m) => m.category === cat);
                const achieved = catMilestones.filter((m) => m.status === 'ACHIEVED').length;
                return (
                  <div key={cat} className="rounded-md bg-muted/30 p-2">
                    <p className="text-xs font-medium text-muted-foreground">{MILESTONE_CATEGORY_LABELS[cat]}</p>
                    <p className="text-sm font-semibold">{achieved}/{catMilestones.length}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PediatricsPage() {
  const [activeTab, setActiveTab] = useState('growth');
  const [selectedPatient, setSelectedPatient] = useState<PediatricPatient | null>(null);

  const [growthOpen, setGrowthOpen] = useState(false);
  const [growthForm, setGrowthForm] = useState({
    patientId: '',
    date: new Date().toISOString().slice(0, 10),
    weight: '',
    height: '',
    headCircumference: '',
  });

  const [doseOpen, setDoseOpen] = useState(false);
  const [doseForm, setDoseForm] = useState({ medication: '', weight: '' });
  const [doseResult, setDoseResult] = useState<{ calculatedDose: number; unit: string; frequency: string; maxDose?: number } | null>(null);

  const { data: patientsData, isLoading: patientsLoading } = usePediatricPatients();
  const createGrowth = useCreateGrowthMeasurement();
  const calculateDose = useCalculateDose();

  const handleCreateGrowth = async () => {
    if (!growthForm.patientId || !growthForm.weight || !growthForm.height) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    try {
      await createGrowth.mutateAsync({
        patientId: growthForm.patientId,
        date: growthForm.date,
        weight: Number(growthForm.weight),
        height: Number(growthForm.height),
        headCircumference: growthForm.headCircumference ? Number(growthForm.headCircumference) : undefined,
      });
      toast.success('Medição registrada com sucesso.');
      setGrowthOpen(false);
      setGrowthForm({ patientId: '', date: new Date().toISOString().slice(0, 10), weight: '', height: '', headCircumference: '' });
    } catch {
      toast.error('Erro ao registrar medição.');
    }
  };

  const handleCalculateDose = async () => {
    if (!doseForm.medication || !doseForm.weight) {
      toast.error('Informe o medicamento e o peso.');
      return;
    }
    try {
      const result = await calculateDose.mutateAsync({
        medication: doseForm.medication,
        weight: Number(doseForm.weight),
      });
      setDoseResult(result);
    } catch {
      toast.error('Erro ao calcular dose.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Baby className="h-6 w-6 text-primary" />
          Pediatria
        </h1>
        <p className="text-muted-foreground">
          Curvas de crescimento OMS/CDC, cartão de vacinação PNI e marcos do desenvolvimento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="growth" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Curvas de Crescimento
          </TabsTrigger>
          <TabsTrigger value="vaccination" className="flex items-center gap-2">
            <Syringe className="h-4 w-4" />
            Vacinação
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Marcos do Desenvolvimento
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Curvas de Crescimento ──────────────────────────────────── */}
        <TabsContent value="growth" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{patientsData?.total ?? 0} pacientes pediátricos</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDoseOpen(true)} className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calcular Dose Pediátrica
              </Button>
              <Button onClick={() => setGrowthOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Registrar Medição
              </Button>
            </div>
          </div>

          {patientsLoading ? <PageLoading /> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {patientsData?.data && patientsData.data.length > 0 ? patientsData.data.map((p: PediatricPatient) => (
                <Card key={p.id}
                  className={cn('cursor-pointer transition-colors hover:border-primary/50', selectedPatient?.id === p.id && 'border-primary')}
                  onClick={() => setSelectedPatient(selectedPatient?.id === p.id ? null : p)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{p.patientName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(p.ageMonths / 12) > 0 ? `${Math.floor(p.ageMonths / 12)}a ` : ''}
                      {p.ageMonths % 12}m · {p.weight} kg · {p.height} cm
                    </p>
                  </CardHeader>
                  {selectedPatient?.id === p.id && (
                    <CardContent>
                      <PatientDetailPanel patient={p} />
                    </CardContent>
                  )}
                </Card>
              )) : (
                <div className="col-span-3 text-center text-muted-foreground py-10">Nenhum paciente pediátrico cadastrado.</div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Vacinação ──────────────────────────────────────────────── */}
        <TabsContent value="vaccination" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Cartão de Vacinas — PNI</CardTitle></CardHeader>
            <CardContent>
              {patientsLoading ? <PageLoading /> : patientsData?.data && patientsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Vacinas Pendentes</TableHead>
                      <TableHead>Próxima Consulta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsData.data.map((p: PediatricPatient) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.patientName}</TableCell>
                        <TableCell className="text-sm">
                          {Math.floor(p.ageMonths / 12) > 0 ? `${Math.floor(p.ageMonths / 12)}a ` : ''}
                          {p.ageMonths % 12}m
                        </TableCell>
                        <TableCell>
                          {p.vaccinesPending > 0 ? (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                              {p.vaccinesPending} pendente(s)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-400">Em dia</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.nextAppointment ? new Date(p.nextAppointment).toLocaleDateString('pt-BR') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhum paciente cadastrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Marcos do Desenvolvimento ─────────────────────────────── */}
        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Marcos do Desenvolvimento por Domínio</CardTitle></CardHeader>
            <CardContent>
              {patientsLoading ? <PageLoading /> : patientsData?.data && patientsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Vacinas Pendentes</TableHead>
                      <TableHead>Próxima Consulta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsData.data.map((p: PediatricPatient) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedPatient(selectedPatient?.id === p.id ? null : p)}>
                        <TableCell className="font-medium">{p.patientName}</TableCell>
                        <TableCell>
                          {Math.floor(p.ageMonths / 12) > 0 ? `${Math.floor(p.ageMonths / 12)}a ` : ''}
                          {p.ageMonths % 12}m
                        </TableCell>
                        <TableCell>{p.weight} kg</TableCell>
                        <TableCell>
                          {p.vaccinesPending > 0
                            ? <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">{p.vaccinesPending}</Badge>
                            : <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-400">Ok</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.nextAppointment ? new Date(p.nextAppointment).toLocaleDateString('pt-BR') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Nenhum paciente cadastrado.</p>
              )}
            </CardContent>
          </Card>
          {selectedPatient && (
            <Card>
              <CardHeader><CardTitle>Marcos — {selectedPatient.patientName}</CardTitle></CardHeader>
              <CardContent>
                <PatientDetailPanel patient={selectedPatient} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Registrar Medição ─────────────────────────────────────── */}
      <Dialog open={growthOpen} onOpenChange={setGrowthOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Medição Antropométrica</DialogTitle>
            <DialogDescription>Registre peso, estatura e perímetro cefálico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID do Paciente *</Label>
                <Input placeholder="UUID" value={growthForm.patientId}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, patientId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data da Medição</Label>
                <Input type="date" value={growthForm.date}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Peso (kg) *</Label>
                <Input type="number" step="0.1" placeholder="10.5" value={growthForm.weight}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, weight: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estatura (cm) *</Label>
                <Input type="number" step="0.1" placeholder="75" value={growthForm.height}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, height: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Per. Cefálico (cm)</Label>
                <Input type="number" step="0.1" placeholder="46" value={growthForm.headCircumference}
                  onChange={(e) => setGrowthForm((p) => ({ ...p, headCircumference: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrowthOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateGrowth} disabled={createGrowth.isPending}>
              {createGrowth.isPending ? 'Salvando...' : 'Registrar Medição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Calculadora de Dose ───────────────────────────────────── */}
      <Dialog open={doseOpen} onOpenChange={(o) => { setDoseOpen(o); if (!o) setDoseResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calculadora de Dose Pediátrica</DialogTitle>
            <DialogDescription>Calcule a dose baseada no peso corporal da criança.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Medicamento</Label>
              <Input placeholder="Ex: Amoxicilina, Dipirona" value={doseForm.medication}
                onChange={(e) => setDoseForm((p) => ({ ...p, medication: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Peso da Criança (kg)</Label>
              <Input type="number" step="0.1" placeholder="12.5" value={doseForm.weight}
                onChange={(e) => setDoseForm((p) => ({ ...p, weight: e.target.value }))} />
            </div>
            {doseResult && (
              <div className="rounded-md bg-primary/10 border border-primary/30 p-4 space-y-1">
                <p className="text-sm font-medium text-primary">Dose Calculada</p>
                <p className="text-2xl font-bold">{doseResult.calculatedDose} {doseResult.unit}</p>
                <p className="text-sm text-muted-foreground">Frequência: {doseResult.frequency}</p>
                {doseResult.maxDose && (
                  <p className="text-xs text-yellow-400">Dose máxima: {doseResult.maxDose} {doseResult.unit}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDoseOpen(false); setDoseResult(null); }}>Fechar</Button>
            <Button onClick={handleCalculateDose} disabled={calculateDose.isPending}>
              {calculateDose.isPending ? 'Calculando...' : 'Calcular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
