import { useState } from 'react';
import {
  Activity,
  Plus,
  TrendingUp,
  AlertTriangle,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  Brain,
  Eye,
  Monitor,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALERT_SEVERITY: Record<string, { label: string; className: string }> = {
  CRITICAL: { label: 'Crítico', className: 'bg-red-600/30 text-red-300 border-red-600/50' },
  HIGH: { label: 'Alto', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  MODERATE: { label: 'Moderado', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  LOW: { label: 'Baixo', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
};

const RASS_SCALE = [
  { score: -5, label: 'Não responsivo' },
  { score: -4, label: 'Sedação profunda' },
  { score: -3, label: 'Sedação moderada' },
  { score: -2, label: 'Sedação leve' },
  { score: -1, label: 'Sonolento' },
  { score: 0, label: 'Alerta e calmo' },
  { score: 1, label: 'Inquieto' },
  { score: 2, label: 'Agitado' },
  { score: 3, label: 'Muito agitado' },
  { score: 4, label: 'Combativo' },
];

const DEMO_ALERTS = [
  { id: '1', patient: 'Maria Silva — Leito 12A', message: 'PA Sistólica > 180 mmHg', severity: 'CRITICAL', time: '14:32' },
  { id: '2', patient: 'João Santos — Leito 8B', message: 'SpO2 < 90%', severity: 'CRITICAL', time: '14:28' },
  { id: '3', patient: 'Ana Oliveira — Leito 3A', message: 'FC > 120 bpm por 15 min', severity: 'HIGH', time: '14:15' },
  { id: '4', patient: 'Carlos Ferreira — Leito UTI-5', message: 'Temperatura > 38.5°C', severity: 'MODERATE', time: '13:50' },
  { id: '5', patient: 'Lucia Mendes — Leito 7C', message: 'Glasgow caiu de 15 para 12', severity: 'HIGH', time: '13:42' },
];

const DEMO_RECENT_VITALS = [
  { time: '14:00', fc: 78, pas: 128, pad: 82, fr: 16, temp: 36.5, spo2: 97, glasgow: 15 },
  { time: '12:00', fc: 82, pas: 132, pad: 85, fr: 18, temp: 36.7, spo2: 96, glasgow: 15 },
  { time: '10:00', fc: 75, pas: 125, pad: 80, fr: 15, temp: 36.4, spo2: 98, glasgow: 15 },
  { time: '08:00', fc: 70, pas: 120, pad: 78, fr: 14, temp: 36.2, spo2: 98, glasgow: 15 },
  { time: '06:00', fc: 68, pas: 118, pad: 76, fr: 14, temp: 36.0, spo2: 99, glasgow: 15 },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function VitalSignsPage() {
  const [activeTab, setActiveTab] = useState('registro');
  const [selectedRASS, setSelectedRASS] = useState<number>(0);
  const [, setCamICU] = useState<string>('');

  // Vital signs form
  const [vitals, setVitals] = useState({
    fc: '',
    pas: '',
    pad: '',
    fr: '',
    temp: '',
    spo2: '',
    glasgowO: '4',
    glasgowV: '5',
    glasgowM: '6',
    dor: '0',
    patientId: '',
  });

  const glasgowTotal = Number(vitals.glasgowO) + Number(vitals.glasgowV) + Number(vitals.glasgowM);

  const handleRegister = () => {
    if (!vitals.patientId) {
      toast.error('Informe o ID do paciente.');
      return;
    }
    toast.success('Sinais vitais registrados com sucesso!');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Sinais Vitais</h1>
          <p className="text-sm text-gray-400">Registro, tendências, monitoramento ICU e alertas</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
          <Activity className="mr-1 h-3 w-3" /> Tempo Real
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Alertas Ativos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">5</div>
            <p className="text-xs text-gray-500">2 críticos</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pacientes Monitorados</CardTitle>
            <Monitor className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">42</div>
            <p className="text-xs text-gray-500">18 em UTI</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Registros Hoje</CardTitle>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">328</div>
            <p className="text-xs text-gray-500">média: 8/paciente</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">NEWS Score Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">3.2</div>
            <p className="text-xs text-gray-500">Risco baixo-moderado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-gray-800 bg-[#12121a]">
          <TabsTrigger value="registro" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Plus className="mr-1 h-4 w-4" /> Registro
          </TabsTrigger>
          <TabsTrigger value="tendencias" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <TrendingUp className="mr-1 h-4 w-4" /> Tendências
          </TabsTrigger>
          <TabsTrigger value="icu" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Brain className="mr-1 h-4 w-4" /> ICU Avançado
          </TabsTrigger>
          <TabsTrigger value="alertas" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Bell className="mr-1 h-4 w-4" /> Alertas
          </TabsTrigger>
        </TabsList>

        {/* Registro Tab */}
        <TabsContent value="registro" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Registrar Sinais Vitais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">ID do Paciente</Label>
                <Input
                  value={vitals.patientId}
                  onChange={(e) => setVitals({ ...vitals, patientId: e.target.value })}
                  placeholder="Buscar paciente..."
                  className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-gray-300 flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> FC (bpm)</Label>
                  <Input type="number" value={vitals.fc} onChange={(e) => setVitals({ ...vitals, fc: e.target.value })} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="60-100" />
                </div>
                <div>
                  <Label className="text-gray-300 flex items-center gap-1"><Activity className="h-3 w-3 text-blue-400" /> PA Sistólica</Label>
                  <Input type="number" value={vitals.pas} onChange={(e) => setVitals({ ...vitals, pas: e.target.value })} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="120" />
                </div>
                <div>
                  <Label className="text-gray-300 flex items-center gap-1"><Activity className="h-3 w-3 text-blue-400" /> PA Diastólica</Label>
                  <Input type="number" value={vitals.pad} onChange={(e) => setVitals({ ...vitals, pad: e.target.value })} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="80" />
                </div>
                <div>
                  <Label className="text-gray-300 flex items-center gap-1"><Wind className="h-3 w-3 text-cyan-400" /> FR (irpm)</Label>
                  <Input type="number" value={vitals.fr} onChange={(e) => setVitals({ ...vitals, fr: e.target.value })} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="12-20" />
                </div>
                <div>
                  <Label className="text-gray-300 flex items-center gap-1"><Thermometer className="h-3 w-3 text-orange-400" /> Temp (°C)</Label>
                  <Input type="number" step="0.1" value={vitals.temp} onChange={(e) => setVitals({ ...vitals, temp: e.target.value })} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="36.5" />
                </div>
                <div>
                  <Label className="text-gray-300 flex items-center gap-1"><Droplets className="h-3 w-3 text-purple-400" /> SpO2 (%)</Label>
                  <Input type="number" value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="95-100" />
                </div>
                <div>
                  <Label className="text-gray-300">Dor (0-10)</Label>
                  <Input type="number" min="0" max="10" value={vitals.dor} onChange={(e) => setVitals({ ...vitals, dor: e.target.value })} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
              </div>

              {/* Glasgow */}
              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Escala de Glasgow (ECG = {glasgowTotal})</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-gray-400 text-xs">Abertura Ocular (1-4)</Label>
                    <select value={vitals.glasgowO} onChange={(e) => setVitals({ ...vitals, glasgowO: e.target.value })} className="mt-1 w-full rounded-md border border-gray-700 bg-[#12121a] p-2 text-gray-200 text-sm">
                      <option value="4">4 — Espontânea</option>
                      <option value="3">3 — Ao estímulo verbal</option>
                      <option value="2">2 — À dor</option>
                      <option value="1">1 — Nenhuma</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Resposta Verbal (1-5)</Label>
                    <select value={vitals.glasgowV} onChange={(e) => setVitals({ ...vitals, glasgowV: e.target.value })} className="mt-1 w-full rounded-md border border-gray-700 bg-[#12121a] p-2 text-gray-200 text-sm">
                      <option value="5">5 — Orientada</option>
                      <option value="4">4 — Confusa</option>
                      <option value="3">3 — Palavras inadequadas</option>
                      <option value="2">2 — Sons incompreensíveis</option>
                      <option value="1">1 — Nenhuma</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Resposta Motora (1-6)</Label>
                    <select value={vitals.glasgowM} onChange={(e) => setVitals({ ...vitals, glasgowM: e.target.value })} className="mt-1 w-full rounded-md border border-gray-700 bg-[#12121a] p-2 text-gray-200 text-sm">
                      <option value="6">6 — Obedece comandos</option>
                      <option value="5">5 — Localiza dor</option>
                      <option value="4">4 — Retirada inespecífica</option>
                      <option value="3">3 — Flexão anormal</option>
                      <option value="2">2 — Extensão</option>
                      <option value="1">1 — Nenhuma</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button onClick={handleRegister} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                <Plus className="mr-1 h-4 w-4" /> Registrar Sinais Vitais
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tendências Tab */}
        <TabsContent value="tendencias" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Tendência — Últimas 24h
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Chart placeholder */}
              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-8 text-center mb-4">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-700 mb-3" />
                <p className="text-gray-500">Gráfico de tendência de sinais vitais</p>
                <p className="text-xs text-gray-600 mt-1">FC, PA, FR, Temp, SpO2 ao longo do tempo</p>
              </div>

              {/* Table of recent values */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="py-2 px-3 text-left text-gray-400 font-medium">Hora</th>
                      <th className="py-2 px-3 text-center text-gray-400 font-medium">FC</th>
                      <th className="py-2 px-3 text-center text-gray-400 font-medium">PA</th>
                      <th className="py-2 px-3 text-center text-gray-400 font-medium">FR</th>
                      <th className="py-2 px-3 text-center text-gray-400 font-medium">Temp</th>
                      <th className="py-2 px-3 text-center text-gray-400 font-medium">SpO2</th>
                      <th className="py-2 px-3 text-center text-gray-400 font-medium">Glasgow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_RECENT_VITALS.map((v, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="py-2 px-3 text-gray-300 font-mono">{v.time}</td>
                        <td className="py-2 px-3 text-center text-gray-200">{v.fc}</td>
                        <td className="py-2 px-3 text-center text-gray-200">{v.pas}/{v.pad}</td>
                        <td className="py-2 px-3 text-center text-gray-200">{v.fr}</td>
                        <td className="py-2 px-3 text-center text-gray-200">{v.temp}°C</td>
                        <td className="py-2 px-3 text-center text-gray-200">{v.spo2}%</td>
                        <td className="py-2 px-3 text-center text-gray-200">{v.glasgow}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ICU Tab */}
        <TabsContent value="icu" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* PAM Invasiva / PVC / Swan-Ganz */}
            <Card className="border-gray-800 bg-[#12121a] lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Hemodinâmica Invasiva
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label className="text-gray-300">PAM Invasiva (mmHg)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="75" />
                    <p className="text-xs text-gray-500 mt-1">Meta: 65–100 mmHg</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">PVC (mmHg)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="8" />
                    <p className="text-xs text-gray-500 mt-1">Normal: 2–12 mmHg</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">PAPO (mmHg)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="12" />
                    <p className="text-xs text-gray-500 mt-1">Swan-Ganz — Normal: 6–15 mmHg</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">DC (L/min)</Label>
                    <Input type="number" step="0.1" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="5.0" />
                    <p className="text-xs text-gray-500 mt-1">Débito Cardíaco — Normal: 4–8 L/min</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">IC (L/min/m²)</Label>
                    <Input type="number" step="0.1" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="2.8" />
                    <p className="text-xs text-gray-500 mt-1">Índice Cardíaco — Normal: 2.5–4.0</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">SVR (din·s/cm⁵)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="1200" />
                    <p className="text-xs text-gray-500 mt-1">Resistência Vascular — Normal: 900–1400</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">SvO₂ (%)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="65" />
                    <p className="text-xs text-gray-500 mt-1">Sat. venosa mista — Meta: ≥ 65%</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">Variação PP (%)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="10" />
                    <p className="text-xs text-gray-500 mt-1">Responsividade a fluidos: &gt; 13% = responsivo</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: 'Choque Cardiogênico', criteria: 'IC < 2.2 + PAPO > 18', color: 'text-red-400 border-red-600/50' },
                    { label: 'Choque Distributivo', criteria: 'SVR baixa + IC alto', color: 'text-orange-400 border-orange-600/50' },
                    { label: 'Choque Hipovolêmico', criteria: 'PVC baixa + IC baixo', color: 'text-yellow-400 border-yellow-600/50' },
                    { label: 'Choque Obstrutivo', criteria: 'PVC alta + SVR alta', color: 'text-purple-400 border-purple-600/50' },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-lg border bg-[#0a0a0f] p-2 ${item.color}`}>
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{item.criteria}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* RASS */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  RASS — Escala de Agitação-Sedação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {RASS_SCALE.map((item) => (
                  <button
                    key={item.score}
                    onClick={() => setSelectedRASS(item.score)}
                    className={`w-full text-left rounded-lg border p-2 text-sm transition-colors ${
                      selectedRASS === item.score
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-800 bg-[#0a0a0f] text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    <span className="font-bold mr-2">{item.score > 0 ? `+${item.score}` : item.score}</span>
                    {item.label}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* CAM-ICU */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-yellow-400" />
                  CAM-ICU — Delirium
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Avaliação de delirium em pacientes críticos</p>
                {[
                  { step: '1', title: 'Alteração aguda do estado mental', desc: 'Mudança do estado basal ou flutuação nas últimas 24h?' },
                  { step: '2', title: 'Desatenção', desc: 'Squeeze letter test ou ASE (Attention Screening Exam)' },
                  { step: '3', title: 'Pensamento desorganizado', desc: 'Perguntas sim/não + comando simples' },
                  { step: '4', title: 'Nível de consciência alterado', desc: 'RASS diferente de 0' },
                ].map((item) => (
                  <div key={item.step} className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-gray-300">{item.step}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-200">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <select
                        className="rounded border border-gray-700 bg-[#12121a] p-1 text-xs text-gray-200"
                        onChange={(e) => setCamICU(e.target.value)}
                      >
                        <option value="">--</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* BIS */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-cyan-400" />
                  BIS — Índice Bispectral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-300">Valor BIS (0-100)</Label>
                  <Input type="number" min="0" max="100" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="45" />
                </div>
                <div className="space-y-2">
                  {[
                    { range: '80-100', label: 'Acordado', color: 'text-emerald-400' },
                    { range: '60-79', label: 'Sedação leve/moderada', color: 'text-yellow-400' },
                    { range: '40-59', label: 'Anestesia geral adequada', color: 'text-blue-400' },
                    { range: '20-39', label: 'Sedação profunda', color: 'text-orange-400' },
                    { range: '0-19', label: 'Burst suppression', color: 'text-red-400' },
                  ].map((item) => (
                    <div key={item.range} className="flex justify-between text-sm border-b border-gray-800/50 pb-1">
                      <span className="font-mono text-gray-400">{item.range}</span>
                      <span className={item.color}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* PIC */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-red-400" />
                  PIC — Pressão Intracraniana
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">PIC (mmHg)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="10" />
                  </div>
                  <div>
                    <Label className="text-gray-300">PAM (mmHg)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="85" />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-sm text-gray-400">PPC (Pressão de Perfusão Cerebral)</p>
                  <p className="text-3xl font-bold text-emerald-400">75 mmHg</p>
                  <p className="text-xs text-gray-500">PPC = PAM - PIC (meta: 60-70 mmHg)</p>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Normal</span><span className="text-emerald-400">&lt; 15 mmHg</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Elevada</span><span className="text-yellow-400">15-20 mmHg</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Hipertensão intracraniana</span><span className="text-red-400">&gt; 20 mmHg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alertas Tab */}
        <TabsContent value="alertas" className="space-y-4">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-400" />
                Alertas de Sinais Vitais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_ALERTS.map((alert) => {
                  const cfg = ALERT_SEVERITY[alert.severity] ?? { label: 'Baixa', className: 'text-gray-400 border-gray-500/50' };
                  return (
                    <div key={alert.id} className={`flex items-center justify-between rounded-lg border p-4 ${
                      alert.severity === 'CRITICAL' ? 'border-red-600/50 bg-red-600/5' : 'border-gray-800 bg-[#0a0a0f]'
                    }`}>
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-5 w-5 ${alert.severity === 'CRITICAL' ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`} />
                        <div>
                          <p className="font-medium text-gray-200">{alert.patient}</p>
                          <p className="text-sm text-gray-400">{alert.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-mono">{alert.time}</span>
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 text-xs">
                          Reconhecer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
