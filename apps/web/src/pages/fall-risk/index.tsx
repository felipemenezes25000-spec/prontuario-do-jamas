import { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Circle,
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
  useFallRiskAlerts,
  useMorseHistory,
  useBradenHistory,
  usePreventionPlan,
  useCreateMorseAssessment,
  useCreateBradenAssessment,
  useToggleIntervention,
} from '@/services/fall-risk.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  LOW: { label: 'Baixo', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  MODERATE: { label: 'Moderado', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  HIGH: { label: 'Alto', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  VERY_HIGH: { label: 'Muito Alto', className: 'bg-red-600/30 text-red-300 border-red-600/50' },
  NO_RISK: { label: 'Sem Risco', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
};

const DEMO_PATIENT_ID = 'demo-patient-1';

// ─── Subcomponents ──────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.LOW;
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Morse Dialog ────────────────────────────────────────────────────────────

function MorseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMorse = useCreateMorseAssessment();
  const [form, setForm] = useState({
    patientId: DEMO_PATIENT_ID,
    historyOfFalling: '0',
    secondaryDiagnosis: '0',
    ambulatoryAid: '0',
    ivTherapy: '0',
    gait: '0',
    mentalStatus: '0',
  });

  const totalScore =
    Number(form.historyOfFalling) +
    Number(form.secondaryDiagnosis) +
    Number(form.ambulatoryAid) +
    Number(form.ivTherapy) +
    Number(form.gait) +
    Number(form.mentalStatus);

  const handleSubmit = () => {
    createMorse.mutate(
      {
        patientId: form.patientId,
        historyOfFalling: Number(form.historyOfFalling),
        secondaryDiagnosis: Number(form.secondaryDiagnosis),
        ambulatoryAid: Number(form.ambulatoryAid),
        ivTherapy: Number(form.ivTherapy),
        gait: Number(form.gait),
        mentalStatus: Number(form.mentalStatus),
      },
      {
        onSuccess: () => {
          toast.success('Avaliação Morse registrada com sucesso!');
          onClose();
        },
        onError: () => toast.error('Erro ao registrar avaliação Morse.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Avaliação Morse</DialogTitle>
          <DialogDescription>Escala de Quedas de Morse (0–125 pontos)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>ID do Paciente</Label>
            <Input
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          {[
            { key: 'historyOfFalling', label: 'Histórico de Quedas', options: [{ v: '0', l: 'Não (0)' }, { v: '25', l: 'Sim (25)' }] },
            { key: 'secondaryDiagnosis', label: 'Diagnóstico Secundário', options: [{ v: '0', l: 'Não (0)' }, { v: '15', l: 'Sim (15)' }] },
            { key: 'ivTherapy', label: 'Terapia IV / Heparina', options: [{ v: '0', l: 'Não (0)' }, { v: '20', l: 'Sim (20)' }] },
            { key: 'mentalStatus', label: 'Estado Mental', options: [{ v: '0', l: 'Orientado (0)' }, { v: '15', l: 'Desorientado/Agitado (15)' }] },
            {
              key: 'ambulatoryAid', label: 'Dispositivo de Auxílio', options: [
                { v: '0', l: 'Nenhum / Repouso total (0)' },
                { v: '15', l: 'Muletas / Bengala (15)' },
                { v: '30', l: 'Mobília / Apoio (30)' },
              ],
            },
            {
              key: 'gait', label: 'Marcha', options: [
                { v: '0', l: 'Normal / Cadeira de Rodas (0)' },
                { v: '10', l: 'Fraca (10)' },
                { v: '20', l: 'Prejudicada (20)' },
              ],
            },
          ].map(({ key, label, options }) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Select
                value={form[key as keyof typeof form]}
                onValueChange={(v) => setForm({ ...form, [key]: v })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {options.map((o) => (
                    <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 px-3 py-2 rounded-lg bg-zinc-800">
            <span className="font-medium">Pontuação Total</span>
            <span className={cn('text-xl font-bold', totalScore >= 45 ? 'text-red-400' : totalScore >= 25 ? 'text-yellow-400' : 'text-green-400')}>
              {totalScore} pts
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={createMorse.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {createMorse.isPending ? 'Salvando...' : 'Salvar Avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Braden Dialog ───────────────────────────────────────────────────────────

function BradenDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBraden = useCreateBradenAssessment();
  const [patientId, setPatientId] = useState(DEMO_PATIENT_ID);
  const [scores, setScores] = useState({
    sensoryPerception: 4,
    moisture: 4,
    activity: 4,
    mobility: 4,
    nutrition: 4,
    frictionShear: 3,
  });

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleSubmit = () => {
    createBraden.mutate(
      { patientId, ...scores },
      {
        onSuccess: () => {
          toast.success('Avaliação Braden registrada!');
          onClose();
        },
        onError: () => toast.error('Erro ao registrar avaliação Braden.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Avaliação Braden</DialogTitle>
          <DialogDescription>Risco de Lesão por Pressão (6–23 pontos)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>ID do Paciente</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="bg-zinc-950 border-zinc-700" />
          </div>
          {[
            { key: 'sensoryPerception', label: 'Percepção Sensorial', max: 4 },
            { key: 'moisture', label: 'Umidade', max: 4 },
            { key: 'activity', label: 'Atividade', max: 4 },
            { key: 'mobility', label: 'Mobilidade', max: 4 },
            { key: 'nutrition', label: 'Nutrição', max: 4 },
            { key: 'frictionShear', label: 'Fricção e Cisalhamento', max: 3 },
          ].map(({ key, label, max }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label className="flex-1">{label}</Label>
              <div className="flex gap-1">
                {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
                  <button
                    key={v}
                    onClick={() => setScores({ ...scores, [key]: v })}
                    className={cn(
                      'w-8 h-8 rounded text-sm font-medium transition-colors',
                      scores[key as keyof typeof scores] === v
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800">
            <span className="font-medium">Total Braden</span>
            <span className={cn('text-xl font-bold', totalScore <= 12 ? 'text-red-400' : totalScore <= 14 ? 'text-yellow-400' : 'text-green-400')}>
              {totalScore} pts
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createBraden.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {createBraden.isPending ? 'Salvando...' : 'Salvar Avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FallRiskPage() {
  const [morseDialog, setMorseDialog] = useState(false);
  const [bradenDialog, setBradenDialog] = useState(false);
  const [selectedPatientId] = useState(DEMO_PATIENT_ID);

  const { data: alerts = [], isLoading: alertsLoading } = useFallRiskAlerts();
  const { data: morseHistory = [] } = useMorseHistory(selectedPatientId);
  const { data: bradenHistory = [] } = useBradenHistory(selectedPatientId);
  const { data: plan } = usePreventionPlan(selectedPatientId);
  const toggleIntervention = useToggleIntervention();

  const highRiskCount = alerts.filter((a) => a.riskLevel === 'HIGH').length;
  const moderateRiskCount = alerts.filter((a) => a.riskLevel === 'MODERATE').length;

  const handleToggle = (interventionId: string, completed: boolean) => {
    toggleIntervention.mutate(
      { patientId: selectedPatientId, interventionId, completed: !completed },
      {
        onSuccess: () => toast.success('Intervenção atualizada.'),
        onError: () => toast.error('Erro ao atualizar intervenção.'),
      },
    );
  };

  if (alertsLoading) {
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
          <ShieldCheck className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">Risco de Queda</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700" onClick={() => setMorseDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Avaliação Morse
          </Button>
          <Button variant="outline" className="border-zinc-700" onClick={() => setBradenDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Avaliação Braden
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-xs text-zinc-400">Alto Risco</p>
              <p className="text-2xl font-bold text-red-400">{highRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-xs text-zinc-400">Risco Moderado</p>
              <p className="text-2xl font-bold text-yellow-400">{moderateRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-400">Total de Alertas</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="alerts">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="alerts">Alertas Ativos</TabsTrigger>
          <TabsTrigger value="morse">Avaliação Morse</TabsTrigger>
          <TabsTrigger value="braden">Avaliação Braden</TabsTrigger>
          <TabsTrigger value="plan">Plano de Prevenção</TabsTrigger>
        </TabsList>

        {/* Alertas Ativos */}
        <TabsContent value="alerts" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Alertas de Risco de Queda</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {alerts.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhum alerta ativo</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Paciente</TableHead>
                      <TableHead>MRN</TableHead>
                      <TableHead>Leito</TableHead>
                      <TableHead>Morse</TableHead>
                      <TableHead>Braden</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium">{alert.patientName}</TableCell>
                        <TableCell className="text-zinc-400">{alert.mrn}</TableCell>
                        <TableCell className="text-zinc-400">{alert.bed ?? '—'}</TableCell>
                        <TableCell>{alert.morseScore ?? '—'}</TableCell>
                        <TableCell>{alert.bradenScore ?? '—'}</TableCell>
                        <TableCell><RiskBadge level={alert.riskLevel} /></TableCell>
                        <TableCell className="text-zinc-400">{formatDate(alert.alertDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avaliação Morse */}
        <TabsContent value="morse" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Histórico Morse</CardTitle>
              <Button size="sm" onClick={() => setMorseDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Nova Avaliação
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {morseHistory.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhuma avaliação registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Data</TableHead>
                      <TableHead>Histórico Queda</TableHead>
                      <TableHead>Diagnóstico 2°</TableHead>
                      <TableHead>Marcha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Avaliado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {morseHistory.map((a) => (
                      <TableRow key={a.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-400">{formatDate(a.assessedAt)}</TableCell>
                        <TableCell>{a.historyOfFalling}</TableCell>
                        <TableCell>{a.secondaryDiagnosis}</TableCell>
                        <TableCell>{a.gait}</TableCell>
                        <TableCell className="font-bold">{a.totalScore}</TableCell>
                        <TableCell><RiskBadge level={a.riskLevel} /></TableCell>
                        <TableCell className="text-zinc-400">{a.assessedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avaliação Braden */}
        <TabsContent value="braden" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Histórico Braden</CardTitle>
              <Button size="sm" onClick={() => setBradenDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" /> Nova Avaliação
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {bradenHistory.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">Nenhuma avaliação Braden registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Data</TableHead>
                      <TableHead>Sensorial</TableHead>
                      <TableHead>Umidade</TableHead>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Mobilidade</TableHead>
                      <TableHead>Nutrição</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Risco</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bradenHistory.map((a) => (
                      <TableRow key={a.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-400">{formatDate(a.assessedAt)}</TableCell>
                        <TableCell>{a.sensoryPerception}</TableCell>
                        <TableCell>{a.moisture}</TableCell>
                        <TableCell>{a.activity}</TableCell>
                        <TableCell>{a.mobility}</TableCell>
                        <TableCell>{a.nutrition}</TableCell>
                        <TableCell className="font-bold">{a.totalScore}</TableCell>
                        <TableCell><RiskBadge level={a.riskLevel} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plano de Prevenção */}
        <TabsContent value="plan" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Plano de Prevenção de Quedas</CardTitle>
            </CardHeader>
            <CardContent>
              {!plan ? (
                <p className="text-center text-zinc-500 py-10">Nenhum plano de prevenção registrado</p>
              ) : (
                <div className="space-y-3">
                  {plan.interventions.map((intervention) => (
                    <div
                      key={intervention.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
                    >
                      <button
                        onClick={() => handleToggle(intervention.id, intervention.completed)}
                        className="mt-0.5 shrink-0 text-emerald-400 hover:text-emerald-300"
                      >
                        {intervention.completed ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5 text-zinc-500" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', intervention.completed && 'line-through text-zinc-500')}>
                          {intervention.description}
                        </p>
                        {intervention.completedAt && (
                          <p className="text-xs text-zinc-500 mt-1">
                            Concluído em {formatDate(intervention.completedAt)} por {intervention.completedBy}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MorseDialog open={morseDialog} onClose={() => setMorseDialog(false)} />
      <BradenDialog open={bradenDialog} onClose={() => setBradenDialog(false)} />
    </div>
  );
}
