import { useState } from 'react';
import {
  Activity,
  Wind,
  Monitor,
  Droplets,
  Syringe,
  Target,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useIcuAdvancedFlowsheet,
  useIcuDevicesAdvanced,
  useVentilationRecords,
  useRecordVentilation,
  useDailyGoals,
  useSetDailyGoals,
  useRecordSedation,
  type CreateVentilationDto,
  type CreateSedationDto,
} from '@/services/icu-advanced.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function peepColor(peep: number) {
  if (peep >= 12) return 'text-red-400';
  if (peep >= 8) return 'text-yellow-400';
  return 'text-emerald-400';
}

// ─── Ventilation Dialog ───────────────────────────────────────────────────────

function VentilationDialog({
  open,
  onClose,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
}) {
  const record = useRecordVentilation();
  const [form, setForm] = useState<Partial<CreateVentilationDto>>({
    patientId,
    mode: 'VCV',
    tidalVolumeMl: 450,
    respiratoryRate: 14,
    peep: 5,
    fio2: 40,
  });

  const set = (field: keyof CreateVentilationDto, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.mode || !form.tidalVolumeMl || !form.respiratoryRate || !form.peep || !form.fio2) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    record.mutate(form as CreateVentilationDto, {
      onSuccess: () => {
        toast.success('Parâmetros ventilatórios registrados.');
        onClose();
      },
      onError: () => toast.error('Erro ao registrar parâmetros.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Parâmetros Ventilatórios</DialogTitle>
          <DialogDescription>Atualizar configurações do ventilador mecânico</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1 col-span-2">
            <Label>Modo Ventilatório</Label>
            <Select value={form.mode} onValueChange={(v) => set('mode', v)}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VCV">VCV — Volume Controlado</SelectItem>
                <SelectItem value="PCV">PCV — Pressão Controlada</SelectItem>
                <SelectItem value="PSV">PSV — Pressão de Suporte</SelectItem>
                <SelectItem value="SIMV">SIMV</SelectItem>
                <SelectItem value="CPAP">CPAP</SelectItem>
                <SelectItem value="PRVC">PRVC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(
            [
              { label: 'VC (mL)', field: 'tidalVolumeMl' },
              { label: 'FR (ipm)', field: 'respiratoryRate' },
              { label: 'PEEP (cmH₂O)', field: 'peep' },
              { label: 'FiO₂ (%)', field: 'fio2' },
              { label: 'PS (cmH₂O)', field: 'pressureSupport' },
              { label: 'SpO₂ (%)', field: 'spo2' },
              { label: 'PaO₂ (mmHg)', field: 'pao2' },
              { label: 'EtCO₂ (mmHg)', field: 'etco2' },
            ] as { label: string; field: keyof CreateVentilationDto }[]
          ).map(({ label, field }) => (
            <div key={field} className="space-y-1">
              <Label>{label}</Label>
              <Input
                type="number"
                value={(form[field] as number | undefined) ?? ''}
                onChange={(e) => set(field, parseFloat(e.target.value))}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={record.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {record.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sedation Dialog ─────────────────────────────────────────────────────────

function SedationDialog({
  open,
  onClose,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
}) {
  const record = useRecordSedation();
  const [form, setForm] = useState<Partial<CreateSedationDto>>({
    patientId,
    agent: 'midazolam',
    dose: '',
    route: 'EV',
    rassTarget: -2,
    rassActual: -2,
  });

  const set = (field: keyof CreateSedationDto, value: string | number | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.agent || !form.dose || !form.route) {
      toast.error('Preencha agente, dose e via.');
      return;
    }
    record.mutate(form as CreateSedationDto, {
      onSuccess: () => {
        toast.success('Sedação/analgesia registrada.');
        onClose();
      },
      onError: () => toast.error('Erro ao registrar sedação.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Registro de Sedoanalgesia</DialogTitle>
          <DialogDescription>RASS alvo e avaliação CAM-ICU</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1 col-span-2">
            <Label>Agente Sedativo</Label>
            <Select value={form.agent} onValueChange={(v) => set('agent', v)}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="midazolam">Midazolam</SelectItem>
                <SelectItem value="propofol">Propofol</SelectItem>
                <SelectItem value="dexmedetomidine">Dexmedetomidina</SelectItem>
                <SelectItem value="ketamine">Cetamina</SelectItem>
                <SelectItem value="fentanyl">Fentanil</SelectItem>
                <SelectItem value="morphine">Morfina</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dose</Label>
            <Input
              value={form.dose ?? ''}
              onChange={(e) => set('dose', e.target.value)}
              placeholder="ex: 0.1 mg/kg/h"
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1">
            <Label>Via</Label>
            <Select value={form.route} onValueChange={(v) => set('route', v)}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EV">EV (Endovenoso)</SelectItem>
                <SelectItem value="SC">SC (Subcutâneo)</SelectItem>
                <SelectItem value="SNG">SNG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>RASS Alvo</Label>
            <Select
              value={String(form.rassTarget)}
              onValueChange={(v) => set('rassTarget', parseInt(v))}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[-5, -4, -3, -2, -1, 0].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} — {r === 0 ? 'Alerta/Calmo' : r === -1 ? 'Sonolento' : r === -2 ? 'Sedação leve' : r === -3 ? 'Sedação moderada' : r === -4 ? 'Sedação profunda' : 'Não desperta'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>RASS Real</Label>
            <Select
              value={String(form.rassActual)}
              onValueChange={(v) => set('rassActual', parseInt(v))}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Label>CAM-ICU Positivo?</Label>
            <Button
              size="sm"
              variant={form.camIcuPositive ? 'destructive' : 'outline'}
              onClick={() => set('camIcuPositive', !form.camIcuPositive)}
              className="border-zinc-700"
            >
              {form.camIcuPositive ? 'Sim (Delírio)' : 'Não'}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={record.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {record.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Daily Goals Dialog ───────────────────────────────────────────────────────

function DailyGoalsDialog({
  open,
  onClose,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
}) {
  const setGoals = useSetDailyGoals();
  const [goals, setGoalsState] = useState({
    targetSpo2: '94-98',
    targetMap: '65-90',
    targetGlucose: '140-180',
    sedationGoal: 'RASS -2',
    mobilizationPlan: 'Fisioterapia motora',
    nutritionTarget: '25 kcal/kg/dia',
    fluidBalance: 'Neutro ou -500mL',
    extubationCriteria: 'Avaliar desmame amanhã',
    otherGoals: '',
  });

  const handleSave = () => {
    setGoals.mutate(
      {
        patientId,
        date: new Date().toISOString().slice(0, 10),
        sedationTarget: -2,
        painTarget: 3,
        mobilizationPlan: goals.mobilizationPlan,
        nutritionGoal: goals.nutritionTarget,
        fluidBalance: goals.fluidBalance,
        other: goals.otherGoals,
        goals: {
          spo2: { goal: goals.targetSpo2 },
          map: { goal: goals.targetMap },
          glucose: { goal: goals.targetGlucose },
          sedation: { goal: goals.sedationGoal },
          extubation: { goal: goals.extubationCriteria },
        },
      },
      {
        onSuccess: () => {
          toast.success('Metas diárias definidas.');
          onClose();
        },
        onError: () => toast.error('Erro ao salvar metas.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Metas Diárias da UTI</DialogTitle>
          <DialogDescription>Checklist de metas para o turno — utalize o Daily Goals</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-96 overflow-y-auto pr-1">
          {(
            [
              { label: 'SpO₂ Alvo (%)', field: 'targetSpo2' },
              { label: 'PAM Alvo (mmHg)', field: 'targetMap' },
              { label: 'Glicemia Alvo (mg/dL)', field: 'targetGlucose' },
              { label: 'Meta de Sedação', field: 'sedationGoal' },
              { label: 'Plano de Mobilização', field: 'mobilizationPlan' },
              { label: 'Meta Nutricional', field: 'nutritionTarget' },
              { label: 'Balanço Hídrico', field: 'fluidBalance' },
              { label: 'Critérios de Extubação', field: 'extubationCriteria' },
              { label: 'Outras Metas', field: 'otherGoals' },
            ] as { label: string; field: keyof typeof goals }[]
          ).map(({ label, field }) => (
            <div key={field} className="space-y-1">
              <Label>{label}</Label>
              <Input
                value={goals[field]}
                onChange={(e) => setGoalsState((g) => ({ ...g, [field]: e.target.value }))}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={setGoals.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {setGoals.isPending ? 'Salvando...' : 'Salvar Metas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEMO_PATIENT_ID = 'demo-patient-icu';

export default function IcuMonitoringPage() {
  const [patientId] = useState(DEMO_PATIENT_ID);
  const [ventOpen, setVentOpen] = useState(false);
  const [sedOpen, setSedOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const flowsheet = useIcuAdvancedFlowsheet(patientId);
  const devices = useIcuDevicesAdvanced(patientId);
  const ventilation = useVentilationRecords(patientId);
  const dailyGoals = useDailyGoals(patientId);

  const latestVent = ventilation.data?.[0];
  const devicesData = devices.data ?? [];
  const goalsData = dailyGoals.data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Monitor className="h-7 w-7 text-emerald-400" />
            Monitoramento em Tempo Real — UTI
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Flowsheet, dispositivos, ventilação e metas diárias
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => flowsheet.refetch()}
            className="border-zinc-700 text-zinc-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setGoalsOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Target className="h-4 w-4 mr-2" />
            Metas Diárias
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wind className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-xs text-zinc-400">Modo Ventilatório</p>
                <p className="text-xl font-bold text-white">{latestVent?.mode ?? '—'}</p>
                <p className="text-xs text-zinc-500">
                  VC: {latestVent?.tidalVolumeMl ?? '—'} mL | FR: {latestVent?.respiratoryRate ?? '—'} ipm
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-xs text-zinc-400">PEEP / FiO₂</p>
                <p className={`text-xl font-bold ${latestVent ? peepColor(latestVent.peep) : 'text-white'}`}>
                  {latestVent?.peep ?? '—'} cmH₂O
                </p>
                <p className="text-xs text-zinc-500">FiO₂: {latestVent?.fio2 ?? '—'}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Droplets className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-xs text-zinc-400">SpO₂ / EtCO₂</p>
                <p className="text-xl font-bold text-white">
                  {latestVent?.spo2 ?? '—'}%
                </p>
                <p className="text-xs text-zinc-500">EtCO₂: {latestVent?.etco2 ?? '—'} mmHg</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Syringe className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-xs text-zinc-400">Dispositivos Ativos</p>
                <p className="text-xl font-bold text-white">{devicesData.length}</p>
                <p className="text-xs text-zinc-500">
                  {devicesData.filter((d) => d.daysInserted >= 7).length} com alerta de troca
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ventilation">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="ventilation">Ventilação</TabsTrigger>
          <TabsTrigger value="devices">Dispositivos</TabsTrigger>
          <TabsTrigger value="flowsheet">Flowsheet</TabsTrigger>
          <TabsTrigger value="goals">Metas Diárias</TabsTrigger>
        </TabsList>

        {/* Ventilation Tab */}
        <TabsContent value="ventilation" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Parâmetros Ventilatórios</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSedOpen(true)}
                className="border-zinc-700 text-zinc-300"
              >
                <Syringe className="h-4 w-4 mr-2" />
                Sedoanalgesia
              </Button>
              <Button
                size="sm"
                onClick={() => setVentOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Wind className="h-4 w-4 mr-2" />
                Registrar Parâmetros
              </Button>
            </div>
          </div>

          {ventilation.isLoading ? (
            <p className="text-zinc-500">Carregando...</p>
          ) : !ventilation.data?.length ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-8 text-center text-zinc-500">
                Nenhum registro ventilatório encontrado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ventilation.data.map((v) => (
                <Card key={v.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {v.mode}
                        </Badge>
                        <span className="text-xs text-zinc-500">{formatDate(v.recordedAt)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-zinc-400 text-xs">VC</p>
                        <p className="font-semibold text-white">{v.tidalVolumeMl} mL</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">FR</p>
                        <p className="font-semibold text-white">{v.respiratoryRate} ipm</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">PEEP</p>
                        <p className={`font-semibold ${peepColor(v.peep)}`}>{v.peep} cmH₂O</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs">FiO₂</p>
                        <p className="font-semibold text-white">{v.fio2}%</p>
                      </div>
                      {v.spo2 != null && (
                        <div>
                          <p className="text-zinc-400 text-xs">SpO₂</p>
                          <p className="font-semibold text-emerald-400">{v.spo2}%</p>
                        </div>
                      )}
                      {v.pao2 != null && (
                        <div>
                          <p className="text-zinc-400 text-xs">PaO₂</p>
                          <p className="font-semibold text-white">{v.pao2} mmHg</p>
                        </div>
                      )}
                      {v.etco2 != null && (
                        <div>
                          <p className="text-zinc-400 text-xs">EtCO₂</p>
                          <p className="font-semibold text-white">{v.etco2} mmHg</p>
                        </div>
                      )}
                      {v.compliance != null && (
                        <div>
                          <p className="text-zinc-400 text-xs">Compliância</p>
                          <p className="font-semibold text-white">{v.compliance} mL/cmH₂O</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="mt-4">
          {devices.isLoading ? (
            <p className="text-zinc-500">Carregando dispositivos...</p>
          ) : !devicesData.length ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-8 text-center text-zinc-500">
                Nenhum dispositivo registrado para este paciente.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devicesData.map((device) => {
                const isHighRisk = device.daysInserted >= 7;
                return (
                  <Card
                    key={device.id}
                    className={`border ${isHighRisk ? 'border-red-500/40 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="text-white">{device.deviceType}</span>
                        {isHighRisk ? (
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Local</span>
                        <span className="text-white">{device.site ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Dias inserido</span>
                        <Badge
                          className={
                            isHighRisk
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }
                        >
                          {device.daysInserted}d
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Inserido em</span>
                        <span className="text-zinc-300 text-xs">{formatDate(device.insertedAt)}</span>
                      </div>
                      {device.size != null && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Tamanho</span>
                          <span className="text-white">{device.size}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Flowsheet Tab */}
        <TabsContent value="flowsheet" className="mt-4">
          {flowsheet.isLoading ? (
            <p className="text-zinc-500">Carregando flowsheet...</p>
          ) : !flowsheet.data ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-8 text-center text-zinc-500">
                Nenhum dado de flowsheet disponível.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(flowsheet.data).map(([key, value]) => (
                <Card key={key} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4 flex justify-between items-center">
                    <span className="text-zinc-400 text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    <span className="text-white font-semibold">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Daily Goals Tab */}
        <TabsContent value="goals" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Metas Diárias</h2>
            <Button
              size="sm"
              onClick={() => setGoalsOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Target className="h-4 w-4 mr-2" />
              Atualizar Metas
            </Button>
          </div>
          {!goalsData ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-8 text-center text-zinc-500">
                Metas diárias não definidas. Clique em "Atualizar Metas" para definir.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(goalsData)
                .filter(([k]) => k !== 'id' && k !== 'patientId' && k !== 'createdAt')
                .map(([key, value]) => (
                  <Card key={key} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 flex justify-between items-start gap-2">
                      <span className="text-zinc-400 text-sm capitalize flex-1">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <span className="text-emerald-400 font-medium text-sm text-right">
                        {String(value)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <VentilationDialog open={ventOpen} onClose={() => setVentOpen(false)} patientId={patientId} />
      <SedationDialog open={sedOpen} onClose={() => setSedOpen(false)} patientId={patientId} />
      <DailyGoalsDialog open={goalsOpen} onClose={() => setGoalsOpen(false)} patientId={patientId} />
    </div>
  );
}
