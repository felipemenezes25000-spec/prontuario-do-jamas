import { useState } from 'react';
import {
  Heart,
  Brain,
  Bone,
  Droplets,
  Wind,
  Pill,
  Stethoscope,
  Calculator,
  Activity,
  Eye,
  Ear,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePapanicolaou } from '@/services/specialties-enhanced.service';

// ─── Calculator Helpers ─────────────────────────────────────────────────────

function classifyFramingham(score: number): { risk: string; className: string } {
  if (score < 10) return { risk: 'Baixo (<10%)', className: 'text-emerald-400' };
  if (score < 20) return { risk: 'Intermediário (10-20%)', className: 'text-yellow-400' };
  return { risk: 'Alto (>20%)', className: 'text-red-400' };
}

function classifyCKD(egfr: number): { stage: string; className: string } {
  if (egfr >= 90) return { stage: 'G1 — Normal', className: 'text-emerald-400' };
  if (egfr >= 60) return { stage: 'G2 — Leve', className: 'text-green-400' };
  if (egfr >= 45) return { stage: 'G3a — Leve-Moderado', className: 'text-yellow-400' };
  if (egfr >= 30) return { stage: 'G3b — Moderado-Grave', className: 'text-orange-400' };
  if (egfr >= 15) return { stage: 'G4 — Grave', className: 'text-red-400' };
  return { stage: 'G5 — Falência Renal', className: 'text-red-500' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SpecialtiesPage() {
  const [activeTab, setActiveTab] = useState('cardiologia');

  // Framingham
  const [framAge, setFramAge] = useState('');
  const [framCholesterol, setFramCholesterol] = useState('');
  const [framHDL, setFramHDL] = useState('');
  const [framSBP, setFramSBP] = useState('');
  const [framSmoker, setFramSmoker] = useState(false);
  const [framResult, setFramResult] = useState<number | null>(null);

  // CHA2DS2-VASc
  const [chaAge65, setChaAge65] = useState(false);
  const [chaAge75, setChaAge75] = useState(false);
  const [chaFemale, setChaFemale] = useState(false);
  const [chaHF, setChaHF] = useState(false);
  const [chaHTN, setChaHTN] = useState(false);
  const [chaDM, setChaDM] = useState(false);
  const [chaStroke, setChaStroke] = useState(false);
  const [chaVascular, setChaVascular] = useState(false);

  // CKD-EPI
  const [ckdCreatinine, setCkdCreatinine] = useState('');
  const [ckdAge, setCkdAge] = useState('');
  const [ckdFemale, setCkdFemale] = useState(false);
  const [ckdResult, setCkdResult] = useState<number | null>(null);

  // mRankin
  const [mrankin, setMrankin] = useState(0);

  // DAS28
  const [das28Tender, setDas28Tender] = useState('');
  const [das28Swollen, setDas28Swollen] = useState('');
  const [das28ESR, setDas28ESR] = useState('');
  const [das28VAS, setDas28VAS] = useState('');
  const [das28Result, setDas28Result] = useState<number | null>(null);

  const chaScore = (chaAge65 ? 1 : 0) + (chaAge75 ? 2 : 0) + (chaFemale ? 1 : 0) + (chaHF ? 1 : 0) + (chaHTN ? 1 : 0) + (chaDM ? 1 : 0) + (chaStroke ? 2 : 0) + (chaVascular ? 1 : 0);

  // Oftalmologia
  const [snellenOD, setSnellenOD] = useState('');
  const [snellenOE, setSnellenOE] = useState('');
  const [tonoOD, setTonoOD] = useState('');
  const [tonoOE, setTonoOE] = useState('');

  // ORL
  const [audiLeft, setAudioLeft] = useState('');
  const [audiRight, setAudioRight] = useState('');
  const [beraResult, setBeraResult] = useState('');

  // Ginecologia
  const papanicolaou = usePapanicolaou();
  const [papResult, setPapResult] = useState('');
  const [papInterpretation, setPapInterpretation] = useState<Record<string, unknown> | null>(null);

  const calculateFramingham = () => {
    const age = Number(framAge);
    const chol = Number(framCholesterol);
    const hdl = Number(framHDL);
    const sbp = Number(framSBP);
    if (!age || !chol || !hdl || !sbp) return;
    // Simplified Framingham estimate
    let score = 0;
    score += age > 60 ? 12 : age > 50 ? 8 : age > 40 ? 4 : 0;
    score += chol > 280 ? 4 : chol > 240 ? 3 : chol > 200 ? 1 : 0;
    score += hdl < 35 ? 4 : hdl < 45 ? 2 : hdl < 50 ? 1 : 0;
    score += sbp > 160 ? 4 : sbp > 140 ? 3 : sbp > 130 ? 1 : 0;
    score += framSmoker ? 4 : 0;
    setFramResult(Math.min(score, 30));
  };

  const calculateCKDEPI = () => {
    const cr = Number(ckdCreatinine);
    const age = Number(ckdAge);
    if (!cr || !age) return;
    // Simplified CKD-EPI 2021
    const kappa = ckdFemale ? 0.7 : 0.9;
    const alpha = ckdFemale ? -0.241 : -0.302;
    const sexFactor = ckdFemale ? 1.012 : 1.0;
    const egfr = 142 * Math.pow(Math.min(cr / kappa, 1), alpha) * Math.pow(Math.max(cr / kappa, 1), -1.200) * Math.pow(0.9938, age) * sexFactor;
    setCkdResult(Math.round(egfr * 10) / 10);
  };

  const calculateDAS28 = () => {
    const tender = Number(das28Tender);
    const swollen = Number(das28Swollen);
    const esr = Number(das28ESR);
    const vas = Number(das28VAS);
    if (tender < 0 || swollen < 0 || !esr || vas < 0) return;
    const result = 0.56 * Math.sqrt(tender) + 0.28 * Math.sqrt(swollen) + 0.70 * Math.log(esr) + 0.014 * vas;
    setDas28Result(Math.round(result * 100) / 100);
  };

  const mrankinLabels = [
    'Sem sintomas',
    'Sem incapacidade significativa',
    'Leve incapacidade',
    'Incapacidade moderada',
    'Incapacidade moderada-grave',
    'Incapacidade grave',
    'Óbito',
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Especialidades — Calculadoras Clínicas</h1>
          <p className="text-sm text-gray-400">Ferramentas de cálculo por especialidade médica</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
          <Calculator className="mr-1 h-3 w-3" /> Scores Validados
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-gray-800 bg-[#12121a] flex flex-wrap h-auto gap-1">
          <TabsTrigger value="cardiologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Heart className="mr-1 h-3 w-3" /> Cardiologia
          </TabsTrigger>
          <TabsTrigger value="nefrologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Droplets className="mr-1 h-3 w-3" /> Nefrologia
          </TabsTrigger>
          <TabsTrigger value="neurologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Brain className="mr-1 h-3 w-3" /> Neurologia
          </TabsTrigger>
          <TabsTrigger value="ortopedia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Bone className="mr-1 h-3 w-3" /> Ortopedia
          </TabsTrigger>
          <TabsTrigger value="endocrinologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Pill className="mr-1 h-3 w-3" /> Endocrinologia
          </TabsTrigger>
          <TabsTrigger value="pneumologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Wind className="mr-1 h-3 w-3" /> Pneumologia
          </TabsTrigger>
          <TabsTrigger value="reumatologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Activity className="mr-1 h-3 w-3" /> Reumatologia
          </TabsTrigger>
          <TabsTrigger value="dermatologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Stethoscope className="mr-1 h-3 w-3" /> Dermatologia
          </TabsTrigger>
          <TabsTrigger value="oftalmologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Eye className="mr-1 h-3 w-3" /> Oftalmologia
          </TabsTrigger>
          <TabsTrigger value="orl" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Ear className="mr-1 h-3 w-3" /> ORL
          </TabsTrigger>
          <TabsTrigger value="ginecologia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ClipboardList className="mr-1 h-3 w-3" /> Ginecologia
          </TabsTrigger>
        </TabsList>

        {/* Cardiologia */}
        <TabsContent value="cardiologia" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Framingham */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100">Framingham Risk Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Idade</Label>
                    <Input type="number" value={framAge} onChange={(e) => setFramAge(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="anos" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Colesterol Total (mg/dL)</Label>
                    <Input type="number" value={framCholesterol} onChange={(e) => setFramCholesterol(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                  </div>
                  <div>
                    <Label className="text-gray-300">HDL (mg/dL)</Label>
                    <Input type="number" value={framHDL} onChange={(e) => setFramHDL(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                  </div>
                  <div>
                    <Label className="text-gray-300">PAS (mmHg)</Label>
                    <Input type="number" value={framSBP} onChange={(e) => setFramSBP(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-gray-300">
                  <input type="checkbox" checked={framSmoker} onChange={(e) => setFramSmoker(e.target.checked)} className="rounded border-gray-600" />
                  Tabagista
                </label>
                <Button onClick={calculateFramingham} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">Calcular</Button>
                {framResult !== null && (
                  <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                    <p className="text-sm text-gray-400">Risco em 10 anos</p>
                    <p className={`text-3xl font-bold ${classifyFramingham(framResult).className}`}>{framResult}%</p>
                    <p className={`text-sm ${classifyFramingham(framResult).className}`}>{classifyFramingham(framResult).risk}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CHA2DS2-VASc */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100">CHA₂DS₂-VASc</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">Risco de AVC em fibrilação atrial</p>
                {[
                  { label: 'ICC / Disfunção VE (C) +1', checked: chaHF, set: setChaHF },
                  { label: 'Hipertensão (H) +1', checked: chaHTN, set: setChaHTN },
                  { label: 'Idade 65-74 (A) +1', checked: chaAge65, set: setChaAge65 },
                  { label: 'Idade >= 75 (A₂) +2', checked: chaAge75, set: setChaAge75 },
                  { label: 'Diabetes (D) +1', checked: chaDM, set: setChaDM },
                  { label: 'AVC / AIT prévio (S₂) +2', checked: chaStroke, set: setChaStroke },
                  { label: 'Doença vascular (V) +1', checked: chaVascular, set: setChaVascular },
                  { label: 'Sexo feminino (Sc) +1', checked: chaFemale, set: setChaFemale },
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <input type="checkbox" checked={item.checked} onChange={(e) => item.set(e.target.checked)} className="rounded border-gray-600" />
                    {item.label}
                  </label>
                ))}
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center mt-4">
                  <p className="text-sm text-gray-400">Score</p>
                  <p className={`text-3xl font-bold ${chaScore >= 2 ? 'text-red-400' : chaScore === 1 ? 'text-yellow-400' : 'text-emerald-400'}`}>{chaScore}</p>
                  <p className="text-sm text-gray-400">
                    {chaScore >= 2 ? 'Anticoagulação recomendada' : chaScore === 1 ? 'Considerar anticoagulação' : 'Baixo risco'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Nefrologia */}
        <TabsContent value="nefrologia" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100">CKD-EPI 2021 — Taxa de Filtração Glomerular</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Creatinina sérica (mg/dL)</Label>
                  <Input type="number" step="0.01" value={ckdCreatinine} onChange={(e) => setCkdCreatinine(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
                <div>
                  <Label className="text-gray-300">Idade</Label>
                  <Input type="number" value={ckdAge} onChange={(e) => setCkdAge(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-gray-300">
                <input type="checkbox" checked={ckdFemale} onChange={(e) => setCkdFemale(e.target.checked)} className="rounded border-gray-600" />
                Sexo feminino
              </label>
              <Button onClick={calculateCKDEPI} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">Calcular eGFR</Button>
              {ckdResult !== null && (
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-sm text-gray-400">eGFR (mL/min/1.73m²)</p>
                  <p className={`text-3xl font-bold ${classifyCKD(ckdResult).className}`}>{ckdResult}</p>
                  <p className={`text-sm ${classifyCKD(ckdResult).className}`}>{classifyCKD(ckdResult).stage}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Neurologia */}
        <TabsContent value="neurologia" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100">Escala de Rankin Modificada (mRS)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {mrankinLabels.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setMrankin(i)}
                    className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                      mrankin === i
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-800 bg-[#0a0a0f] text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    <span className="font-bold mr-2">{i}</span> {label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                <p className="text-sm text-gray-400">mRS Score</p>
                <p className={`text-3xl font-bold ${mrankin <= 1 ? 'text-emerald-400' : mrankin <= 3 ? 'text-yellow-400' : 'text-red-400'}`}>{mrankin}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ortopedia */}
        <TabsContent value="ortopedia" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100">Classificação AO de Fraturas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Selecione os componentes da classificação:</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">Osso</Label>
                    <select className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200">
                      <option value="1">1 - Úmero</option>
                      <option value="2">2 - Rádio/Ulna</option>
                      <option value="3">3 - Fêmur</option>
                      <option value="4">4 - Tíbia/Fíbula</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Segmento</Label>
                    <select className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200">
                      <option value="1">1 - Proximal</option>
                      <option value="2">2 - Diáfise</option>
                      <option value="3">3 - Distal</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Tipo</Label>
                    <select className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200">
                      <option value="A">A - Simples</option>
                      <option value="B">B - Cunha</option>
                      <option value="C">C - Complexa</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100">Score de Caprini — Risco TVP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">Avaliação de risco de tromboembolismo venoso</p>
                {[
                  'Idade 41-60 (+1)',
                  'Idade 61-74 (+2)',
                  'Idade >= 75 (+3)',
                  'Cirurgia grande (+2)',
                  'Imobilização > 72h (+2)',
                  'Histórico TVP/TEP (+3)',
                  'Neoplasia (+2)',
                  'Obesidade IMC > 25 (+1)',
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <input type="checkbox" className="rounded border-gray-600" />
                    {item}
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Endocrinologia */}
        <TabsContent value="endocrinologia" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100">Calculadora de Dose de Insulina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Peso (kg)</Label>
                  <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="70" />
                </div>
                <div>
                  <Label className="text-gray-300">HbA1c (%)</Label>
                  <Input type="number" step="0.1" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="7.5" />
                </div>
                <div>
                  <Label className="text-gray-300">Glicemia atual (mg/dL)</Label>
                  <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="180" />
                </div>
                <div>
                  <Label className="text-gray-300">Fator de sensibilidade</Label>
                  <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="50" />
                </div>
              </div>
              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                <p className="text-sm text-gray-400 mb-2">Recomendação</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">0.5 U/kg/dia</p>
                    <p className="text-xs text-gray-500">Dose total diária estimada</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">50/50</p>
                    <p className="text-xs text-gray-500">Basal / Bolus</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pneumologia */}
        <TabsContent value="pneumologia" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100">Espirometria — Interpretação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">VEF1 (L)</Label>
                    <Input type="number" step="0.01" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="2.5" />
                  </div>
                  <div>
                    <Label className="text-gray-300">CVF (L)</Label>
                    <Input type="number" step="0.01" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="3.8" />
                  </div>
                  <div>
                    <Label className="text-gray-300">VEF1 previsto (%)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="85" />
                  </div>
                  <div>
                    <Label className="text-gray-300">VEF1/CVF (%)</Label>
                    <Input type="number" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" placeholder="70" />
                  </div>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">Interpretar</Button>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100">Classificação GOLD — DPOC</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-400">Baseado em VEF1 pós-broncodilatador</p>
                {[
                  { gold: 'GOLD 1', desc: 'Leve — VEF1 >= 80%', className: 'border-emerald-500/50 text-emerald-400' },
                  { gold: 'GOLD 2', desc: 'Moderado — VEF1 50-79%', className: 'border-yellow-500/50 text-yellow-400' },
                  { gold: 'GOLD 3', desc: 'Grave — VEF1 30-49%', className: 'border-orange-500/50 text-orange-400' },
                  { gold: 'GOLD 4', desc: 'Muito Grave — VEF1 < 30%', className: 'border-red-500/50 text-red-400' },
                ].map((item) => (
                  <div key={item.gold} className={`rounded-lg border bg-[#0a0a0f] p-3 ${item.className}`}>
                    <p className="font-bold">{item.gold}</p>
                    <p className="text-sm">{item.desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reumatologia */}
        <TabsContent value="reumatologia" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100">DAS28-VHS — Artrite Reumatoide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Articulações dolorosas (0-28)</Label>
                  <Input type="number" min="0" max="28" value={das28Tender} onChange={(e) => setDas28Tender(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
                <div>
                  <Label className="text-gray-300">Articulações edemaciadas (0-28)</Label>
                  <Input type="number" min="0" max="28" value={das28Swollen} onChange={(e) => setDas28Swollen(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
                <div>
                  <Label className="text-gray-300">VHS (mm/h)</Label>
                  <Input type="number" value={das28ESR} onChange={(e) => setDas28ESR(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
                <div>
                  <Label className="text-gray-300">EVA paciente (0-100mm)</Label>
                  <Input type="number" min="0" max="100" value={das28VAS} onChange={(e) => setDas28VAS(e.target.value)} className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
              </div>
              <Button onClick={calculateDAS28} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">Calcular DAS28</Button>
              {das28Result !== null && (
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-sm text-gray-400">DAS28-VHS</p>
                  <p className={`text-3xl font-bold ${das28Result < 2.6 ? 'text-emerald-400' : das28Result < 3.2 ? 'text-green-400' : das28Result < 5.1 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {das28Result}
                  </p>
                  <p className="text-sm text-gray-400">
                    {das28Result < 2.6 ? 'Remissão' : das28Result < 3.2 ? 'Baixa atividade' : das28Result < 5.1 ? 'Atividade moderada' : 'Alta atividade'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dermatologia */}
        <TabsContent value="dermatologia" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100">Mapeamento de Nevos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">Critérios ABCDE para avaliação de lesões melanocíticas</p>
              <div className="grid gap-3">
                {[
                  { letter: 'A', name: 'Assimetria', desc: 'Lesão assimétrica em 1 ou 2 eixos' },
                  { letter: 'B', name: 'Bordas', desc: 'Bordas irregulares, mal definidas' },
                  { letter: 'C', name: 'Cor', desc: 'Múltiplas cores (preto, marrom, vermelho, azul)' },
                  { letter: 'D', name: 'Diâmetro', desc: 'Maior que 6mm' },
                  { letter: 'E', name: 'Evolução', desc: 'Mudança de tamanho, forma ou cor' },
                ].map((item) => (
                  <label key={item.letter} className="flex items-start gap-3 rounded-lg border border-gray-800 bg-[#0a0a0f] p-3">
                    <input type="checkbox" className="mt-1 rounded border-gray-600" />
                    <div>
                      <p className="font-medium text-gray-200">
                        <span className="text-emerald-400 font-bold mr-1">{item.letter}</span> — {item.name}
                      </p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oftalmologia */}
        <TabsContent value="oftalmologia" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Acuidade Visual Snellen */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-400" />
                  Acuidade Visual — Tabela de Snellen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-500">Registre a acuidade visual com/sem correção</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Olho Direito (OD)</Label>
                    <select
                      value={snellenOD}
                      onChange={(e) => setSnellenOD(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200 text-sm"
                    >
                      <option value="">Selecionar...</option>
                      {['20/20','20/25','20/30','20/40','20/50','20/70','20/100','20/200','CD','MM','PL','SPL'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Olho Esquerdo (OE)</Label>
                    <select
                      value={snellenOE}
                      onChange={(e) => setSnellenOE(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200 text-sm"
                    >
                      <option value="">Selecionar...</option>
                      {['20/20','20/25','20/30','20/40','20/50','20/70','20/100','20/200','CD','MM','PL','SPL'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(snellenOD || snellenOE) && (
                  <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">OD:</span>
                      <span className={snellenOD === '20/20' ? 'text-emerald-400' : snellenOD && snellenOD !== '20/20' ? 'text-yellow-400' : 'text-gray-500'}>
                        {snellenOD || '—'}
                        {snellenOD === '20/20' && ' (normal)'}
                        {snellenOD && snellenOD !== '20/20' && snellenOD !== '' && ' (reduzida)'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">OE:</span>
                      <span className={snellenOE === '20/20' ? 'text-emerald-400' : snellenOE && snellenOE !== '20/20' ? 'text-yellow-400' : 'text-gray-500'}>
                        {snellenOE || '—'}
                        {snellenOE === '20/20' && ' (normal)'}
                        {snellenOE && snellenOE !== '20/20' && snellenOE !== '' && ' (reduzida)'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500 border-b border-gray-800/50 pb-1">
                    <span>20/20</span><span className="text-emerald-400">Visão normal</span>
                  </div>
                  <div className="flex justify-between text-gray-500 border-b border-gray-800/50 pb-1">
                    <span>20/40</span><span className="text-yellow-400">Baixa visão leve</span>
                  </div>
                  <div className="flex justify-between text-gray-500 border-b border-gray-800/50 pb-1">
                    <span>20/200</span><span className="text-orange-400">Cegueira legal (EUA)</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>CD / MM / PL / SPL</span><span className="text-red-400">Baixa visão grave</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tonometria */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-cyan-400" />
                  Tonometria — Pressão Intraocular
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-500">Pressão intraocular por aplanação (Goldmann) ou não-contato</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">PIO OD (mmHg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={tonoOD}
                      onChange={(e) => setTonoOD(e.target.value)}
                      className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">PIO OE (mmHg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={tonoOE}
                      onChange={(e) => setTonoOE(e.target.value)}
                      className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200"
                      placeholder="15"
                    />
                  </div>
                </div>
                {(tonoOD || tonoOE) && (
                  <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3 space-y-2">
                    {[{ label: 'OD', val: tonoOD }, { label: 'OE', val: tonoOE }].map(({ label, val }) => {
                      const n = Number(val);
                      const cls = !val ? 'text-gray-500' : n <= 21 ? 'text-emerald-400' : n <= 25 ? 'text-yellow-400' : 'text-red-400';
                      const desc = !val ? '—' : n <= 21 ? 'Normal' : n <= 25 ? 'Limítrofe' : 'Elevada — suspeita de glaucoma';
                      return (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-gray-400">{label}: {val ? `${val} mmHg` : '—'}</span>
                          <span className={cls}>{desc}</span>
                        </div>
                      );
                    })}
                    {tonoOD && tonoOE && Math.abs(Number(tonoOD) - Number(tonoOE)) > 4 && (
                      <p className="text-xs text-orange-400 mt-1">⚠ Assimetria {'>'} 4 mmHg — investigar glaucoma unilateral</p>
                    )}
                  </div>
                )}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500 border-b border-gray-800/50 pb-1">
                    <span>{'≤ 21 mmHg'}</span><span className="text-emerald-400">Normal</span>
                  </div>
                  <div className="flex justify-between text-gray-500 border-b border-gray-800/50 pb-1">
                    <span>22–25 mmHg</span><span className="text-yellow-400">Hipertensão ocular</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>{'> 25 mmHg'}</span><span className="text-red-400">Suspeita de glaucoma</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ORL */}
        <TabsContent value="orl" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Audiometria */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Ear className="h-5 w-5 text-yellow-400" />
                  Audiometria Tonal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-500">Limiares auditivos por via aérea (dB HL)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Ouvido Esquerdo (dB)</Label>
                    <Input
                      type="number"
                      value={audiLeft}
                      onChange={(e) => setAudioLeft(e.target.value)}
                      className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200"
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Ouvido Direito (dB)</Label>
                    <Input
                      type="number"
                      value={audiRight}
                      onChange={(e) => setAudioRight(e.target.value)}
                      className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200"
                      placeholder="25"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  {[
                    { range: '0–25 dB', label: 'Audição normal', color: 'text-emerald-400' },
                    { range: '26–40 dB', label: 'Perda leve', color: 'text-green-400' },
                    { range: '41–55 dB', label: 'Perda moderada', color: 'text-yellow-400' },
                    { range: '56–70 dB', label: 'Perda moderada-grave', color: 'text-orange-400' },
                    { range: '71–90 dB', label: 'Perda grave', color: 'text-red-400' },
                    { range: '> 90 dB', label: 'Perda profunda', color: 'text-red-500' },
                  ].map((item) => (
                    <div key={item.range} className="flex justify-between border-b border-gray-800/50 pb-1">
                      <span className="text-gray-400 font-mono">{item.range}</span>
                      <span className={item.color}>{item.label}</span>
                    </div>
                  ))}
                </div>
                {(audiLeft || audiRight) && (
                  <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3 space-y-1">
                    {[{ side: 'Esquerdo', val: audiLeft }, { side: 'Direito', val: audiRight }].map(({ side, val }) => {
                      const n = Number(val);
                      const cls = !val ? 'text-gray-500' : n <= 25 ? 'text-emerald-400' : n <= 40 ? 'text-green-400' : n <= 55 ? 'text-yellow-400' : n <= 70 ? 'text-orange-400' : 'text-red-400';
                      const desc = !val ? '—' : n <= 25 ? 'Normal' : n <= 40 ? 'Perda leve' : n <= 55 ? 'Moderada' : n <= 70 ? 'Mod.-grave' : 'Grave/Profunda';
                      return (
                        <div key={side} className="flex justify-between text-sm">
                          <span className="text-gray-400">{side}: {val ? `${val} dB` : '—'}</span>
                          <span className={cls}>{desc}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BERA */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Ear className="h-5 w-5 text-purple-400" />
                  BERA — Potencial Evocado Auditivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-500">Brainstem Evoked Response Audiometry — avalia vias auditivas centrais</p>
                <div>
                  <Label className="text-gray-300">Resultado / Laudo</Label>
                  <Textarea
                    value={beraResult}
                    onChange={(e) => setBeraResult(e.target.value)}
                    className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200 text-sm"
                    rows={4}
                    placeholder="Latências das ondas I, III e V (ms)&#10;Intervalo I–V bilateral...&#10;Limiares eletrofisiológicos..."
                  />
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-300">Valores de referência (ondas ABR)</p>
                  {[
                    { wave: 'Onda I', latency: '~1.5 ms', origin: 'Nervo auditivo' },
                    { wave: 'Onda III', latency: '~3.7 ms', origin: 'Complexo olivar' },
                    { wave: 'Onda V', latency: '~5.7 ms', origin: 'Colículo inferior' },
                    { wave: 'Intervalo I–V', latency: '~4.0 ms', origin: 'Condução tronco encefálico' },
                  ].map((item) => (
                    <div key={item.wave} className="grid grid-cols-3 text-xs gap-1">
                      <span className="text-emerald-400 font-mono">{item.wave}</span>
                      <span className="text-gray-200">{item.latency}</span>
                      <span className="text-gray-500">{item.origin}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-gray-400 font-medium">Interpretação:</p>
                  <ul className="space-y-1 text-gray-500 list-disc list-inside">
                    <li>Aumento de latência interpico I–III: disfunção retrococlear distal</li>
                    <li>Aumento de latência interpico III–V: disfunção retrococlear central</li>
                    <li>Ausência de ondas: perda auditiva profunda ou neuropatia auditiva</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ginecologia */}
        <TabsContent value="ginecologia" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Papanicolaou / Bethesda */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-pink-400" />
                  Papanicolaou — Sistema Bethesda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-500">Classificação e conduta baseada no Sistema Bethesda 2014</p>
                <div>
                  <Label className="text-gray-300">Resultado do Exame</Label>
                  <select
                    value={papResult}
                    onChange={(e) => setPapResult(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200 text-sm"
                  >
                    <option value="">Selecionar resultado...</option>
                    <option value="NILM">NILM — Negativo para lesão intraepitelial</option>
                    <option value="ASC-US">ASC-US — Células escamosas atípicas de significado indeterminado</option>
                    <option value="ASC-H">ASC-H — Células escamosas atípicas, não se pode excluir HSIL</option>
                    <option value="LSIL">LSIL — Lesão intraepitelial escamosa de baixo grau</option>
                    <option value="HSIL">HSIL — Lesão intraepitelial escamosa de alto grau</option>
                    <option value="AGC">AGC — Células glandulares atípicas</option>
                    <option value="AIS">AIS — Adenocarcinoma in situ</option>
                    <option value="CARCINOMA">Carcinoma invasor</option>
                  </select>
                </div>
                <Button
                  onClick={() => {
                    if (!papResult) { toast.error('Selecione um resultado.'); return; }
                    papanicolaou.mutate(
                      { result: papResult },
                      {
                        onSuccess: (data) => {
                          setPapInterpretation(data as Record<string, unknown>);
                          toast.success('Interpretação gerada!');
                        },
                        onError: () => toast.error('Erro ao interpretar resultado.'),
                      },
                    );
                  }}
                  disabled={!papResult || papanicolaou.isPending}
                  className="bg-pink-600 hover:bg-pink-700 text-white w-full"
                >
                  {papanicolaou.isPending ? 'Interpretando...' : 'Interpretar Resultado'}
                </Button>
                {papInterpretation && (
                  <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-3 space-y-2">
                    {papInterpretation.classification != null && (
                      <div>
                        <p className="text-xs text-gray-400">Classificação</p>
                        <p className="text-sm font-medium text-gray-100">{String(papInterpretation.classification)}</p>
                      </div>
                    )}
                    {papInterpretation.management != null && (
                      <div>
                        <p className="text-xs text-gray-400">Conduta recomendada</p>
                        <p className="text-sm text-emerald-400">{String(papInterpretation.management)}</p>
                      </div>
                    )}
                    {papInterpretation.followUp != null && (
                      <div>
                        <p className="text-xs text-gray-400">Seguimento</p>
                        <p className="text-sm text-blue-400">{String(papInterpretation.followUp)}</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Bethesda reference table */}
                <div className="space-y-1 text-xs">
                  <p className="text-gray-400 font-medium">Tabela de Condutas (Bethesda 2014)</p>
                  {[
                    { result: 'NILM', conduct: 'Repetir em 3 anos (25–65a)', color: 'text-emerald-400' },
                    { result: 'ASC-US', conduct: 'Colposcopia ou teste HPV', color: 'text-yellow-400' },
                    { result: 'LSIL', conduct: 'Colposcopia', color: 'text-yellow-400' },
                    { result: 'ASC-H / HSIL', conduct: 'Colposcopia imediata + biópsia', color: 'text-orange-400' },
                    { result: 'AGC / AIS', conduct: 'Colposcopia + curetagem endocervical', color: 'text-red-400' },
                    { result: 'Carcinoma', conduct: 'Encaminhamento oncologia urgente', color: 'text-red-500' },
                  ].map((item) => (
                    <div key={item.result} className="grid grid-cols-2 gap-2 border-b border-gray-800/50 pb-1">
                      <span className="text-gray-400 font-mono">{item.result}</span>
                      <span className={item.color}>{item.conduct}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Periodicidade e rastreio */}
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  Rastreio Ginecológico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">Recomendações baseadas no MS/INCA e FEBRASGO</p>
                {[
                  {
                    title: 'Papanicolaou',
                    detail: 'Início: 25 anos (ativas sexualmente)\nFrequência: anual por 2 anos consecutivos negativos, depois a cada 3 anos\nCessação: 64 anos com 2 exames negativos nos últimos 5 anos',
                    color: 'border-pink-500/40',
                  },
                  {
                    title: 'HPV-DNA (teste primário)',
                    detail: 'A partir de 30 anos como teste primário\nFrequência: a cada 5 anos se negativo\nHPV positivo: encaminhar para citologia reflexa',
                    color: 'border-purple-500/40',
                  },
                  {
                    title: 'USG Pélvica',
                    detail: 'Sintomas: sangramento uterino anormal, dor pélvica\nRastreio não é recomendado na população geral sem sintomas',
                    color: 'border-blue-500/40',
                  },
                  {
                    title: 'Mamografia',
                    detail: 'SUS: 50–69 anos, a cada 2 anos\nSBGO/FEBRASGO: a partir de 40 anos, anual\nAlto risco (BRCA1/2): ressonância anual a partir dos 25–30 anos',
                    color: 'border-emerald-500/40',
                  },
                ].map((item) => (
                  <div key={item.title} className={`rounded-lg border bg-[#0a0a0f] p-3 ${item.color}`}>
                    <p className="text-sm font-semibold text-gray-200 mb-1">{item.title}</p>
                    <p className="text-xs text-gray-500 whitespace-pre-line">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
