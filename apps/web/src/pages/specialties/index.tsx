import { useState, useMemo } from 'react';
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
  Search,
  Users,
  Baby,
  Syringe,
  ShieldCheck,
  Microscope,
  Radiation,
  Scissors,
  Flower2,
  TreePine,
  HandMetal,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Specialty Definitions ──────────────────────────────────────────────────

interface SpecialtyDef {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  activePatients: number;
  calculators: string[];
  assessmentFields: { label: string; type: 'text' | 'number' | 'select' | 'textarea'; options?: string[] }[];
}

const SPECIALTIES: SpecialtyDef[] = [
  { id: 'cardiologia', name: 'Cardiologia', icon: Heart, color: 'text-red-400', activePatients: 47, calculators: ['Framingham', 'CHADS2-VASc', 'TIMI', 'HEART Score'], assessmentFields: [{ label: 'PA Sistólica', type: 'number' }, { label: 'PA Diastólica', type: 'number' }, { label: 'FC', type: 'number' }, { label: 'Ritmo', type: 'select', options: ['Sinusal', 'FA', 'Flutter', 'TV', 'FV'] }, { label: 'Dor torácica', type: 'textarea' }] },
  { id: 'neurologia', name: 'Neurologia', icon: Brain, color: 'text-purple-400', activePatients: 32, calculators: ['NIHSS', 'Glasgow', 'ABCD2', 'Hunt-Hess'], assessmentFields: [{ label: 'Glasgow (E+V+M)', type: 'number' }, { label: 'Pupilas', type: 'select', options: ['Isocóricas', 'Anisocóricas', 'Midriáticas', 'Mióticas'] }, { label: 'Força MMSS', type: 'text' }, { label: 'Força MMII', type: 'text' }, { label: 'Exame neurológico', type: 'textarea' }] },
  { id: 'ortopedia', name: 'Ortopedia', icon: Bone, color: 'text-amber-400', activePatients: 28, calculators: ['EVA Dor', 'DASH', 'Harris Hip Score'], assessmentFields: [{ label: 'Localização', type: 'text' }, { label: 'EVA (0-10)', type: 'number' }, { label: 'Amplitude de movimento', type: 'text' }, { label: 'Exame', type: 'textarea' }] },
  { id: 'nefrologia', name: 'Nefrologia', icon: Droplets, color: 'text-blue-400', activePatients: 19, calculators: ['CKD-EPI', 'MDRD', 'KDIGO AKI'], assessmentFields: [{ label: 'Creatinina', type: 'number' }, { label: 'Ureia', type: 'number' }, { label: 'TFG estimada', type: 'number' }, { label: 'Diurese 24h (mL)', type: 'number' }, { label: 'Observações', type: 'textarea' }] },
  { id: 'pneumologia', name: 'Pneumologia', icon: Wind, color: 'text-cyan-400', activePatients: 24, calculators: ['CURB-65', 'PSI/PORT', 'mMRC Dispneia'], assessmentFields: [{ label: 'SpO2', type: 'number' }, { label: 'FR', type: 'number' }, { label: 'Ausculta', type: 'select', options: ['MV+', 'MV+ c/ crepitações', 'MV+ c/ sibilos', 'MV reduzido', 'Abolido'] }, { label: 'Exame', type: 'textarea' }] },
  { id: 'endocrinologia', name: 'Endocrinologia', icon: Pill, color: 'text-orange-400', activePatients: 36, calculators: ['HbA1c → Média Glicêmica', 'IMC', 'HOMA-IR'], assessmentFields: [{ label: 'Glicemia jejum', type: 'number' }, { label: 'HbA1c (%)', type: 'number' }, { label: 'TSH', type: 'number' }, { label: 'T4 livre', type: 'number' }, { label: 'Avaliação', type: 'textarea' }] },
  { id: 'gastroenterologia', name: 'Gastroenterologia', icon: Stethoscope, color: 'text-yellow-400', activePatients: 22, calculators: ['Child-Pugh', 'MELD', 'Ranson'], assessmentFields: [{ label: 'Abdome', type: 'select', options: ['Plano', 'Globoso', 'Distendido', 'Escavado'] }, { label: 'RHA', type: 'select', options: ['Presentes', 'Aumentados', 'Diminuídos', 'Ausentes'] }, { label: 'Exame abdominal', type: 'textarea' }] },
  { id: 'oftalmologia', name: 'Oftalmologia', icon: Eye, color: 'text-green-400', activePatients: 15, calculators: ['Acuidade Visual', 'PIO Target'], assessmentFields: [{ label: 'AV OD', type: 'text' }, { label: 'AV OE', type: 'text' }, { label: 'PIO OD (mmHg)', type: 'number' }, { label: 'PIO OE (mmHg)', type: 'number' }, { label: 'Fundoscopia', type: 'textarea' }] },
  { id: 'otorrinolaringologia', name: 'Otorrinolaringologia', icon: Ear, color: 'text-pink-400', activePatients: 13, calculators: ['Escala Mallampati', 'STOP-BANG'], assessmentFields: [{ label: 'Oroscopia', type: 'textarea' }, { label: 'Otoscopia', type: 'textarea' }, { label: 'Rinoscopia', type: 'textarea' }] },
  { id: 'dermatologia', name: 'Dermatologia', icon: Flower2, color: 'text-rose-400', activePatients: 18, calculators: ['BSA', 'PASI', 'DLQI'], assessmentFields: [{ label: 'Tipo de lesão', type: 'select', options: ['Mácula', 'Pápula', 'Nódulo', 'Vesícula', 'Bolha', 'Placa', 'Úlcera'] }, { label: 'Localização', type: 'text' }, { label: 'Descrição', type: 'textarea' }] },
  { id: 'urologia', name: 'Urologia', icon: Droplets, color: 'text-indigo-400', activePatients: 16, calculators: ['IPSS', 'Gleason Score'], assessmentFields: [{ label: 'PSA', type: 'number' }, { label: 'IPSS', type: 'number' }, { label: 'Toque retal', type: 'textarea' }] },
  { id: 'ginecologia', name: 'Ginecologia', icon: Flower2, color: 'text-fuchsia-400', activePatients: 25, calculators: ['Bishop Score', 'FIGO Staging'], assessmentFields: [{ label: 'DUM', type: 'text' }, { label: 'Ciclo menstrual', type: 'select', options: ['Regular', 'Irregular', 'Amenorreia'] }, { label: 'Exame ginecológico', type: 'textarea' }] },
  { id: 'pediatria', name: 'Pediatria', icon: Baby, color: 'text-sky-400', activePatients: 41, calculators: ['Peso/Idade', 'Altura/Idade', 'IMC/Idade', 'Apgar'], assessmentFields: [{ label: 'Peso (kg)', type: 'number' }, { label: 'Estatura (cm)', type: 'number' }, { label: 'PC (cm)', type: 'number' }, { label: 'Desenvolvimento', type: 'textarea' }] },
  { id: 'geriatria', name: 'Geriatria', icon: TreePine, color: 'text-emerald-400', activePatients: 20, calculators: ['Katz ADL', 'Lawton IADL', 'MoCA', 'Mini-Mental'], assessmentFields: [{ label: 'Katz (0-6)', type: 'number' }, { label: 'Lawton (0-27)', type: 'number' }, { label: 'MoCA', type: 'number' }, { label: 'Quedas recentes', type: 'select', options: ['Não', '1 queda', '2+ quedas'] }, { label: 'Avaliação funcional', type: 'textarea' }] },
  { id: 'psiquiatria', name: 'Psiquiatria', icon: Brain, color: 'text-violet-400', activePatients: 30, calculators: ['PHQ-9', 'GAD-7', 'AUDIT', 'Columbia Suicide'], assessmentFields: [{ label: 'PHQ-9', type: 'number' }, { label: 'GAD-7', type: 'number' }, { label: 'Risco suicida', type: 'select', options: ['Nenhum', 'Baixo', 'Moderado', 'Alto'] }, { label: 'Exame psíquico', type: 'textarea' }] },
  { id: 'oncologia', name: 'Oncologia', icon: Microscope, color: 'text-red-500', activePatients: 35, calculators: ['ECOG/PS', 'TNM Staging', 'Karnofsky'], assessmentFields: [{ label: 'ECOG', type: 'select', options: ['0', '1', '2', '3', '4'] }, { label: 'Estadiamento TNM', type: 'text' }, { label: 'Protocolo QT', type: 'text' }, { label: 'Avaliação', type: 'textarea' }] },
  { id: 'infectologia', name: 'Infectologia', icon: ShieldCheck, color: 'text-lime-400', activePatients: 14, calculators: ['qSOFA', 'Centor Score'], assessmentFields: [{ label: 'Temperatura', type: 'number' }, { label: 'Foco infeccioso', type: 'text' }, { label: 'ATB em uso', type: 'text' }, { label: 'Culturas', type: 'textarea' }] },
  { id: 'reumatologia', name: 'Reumatologia', icon: HandMetal, color: 'text-teal-400', activePatients: 17, calculators: ['DAS28', 'SLEDAI', 'BASDAI'], assessmentFields: [{ label: 'Articulações acometidas', type: 'text' }, { label: 'VHS', type: 'number' }, { label: 'PCR', type: 'number' }, { label: 'FAN', type: 'text' }, { label: 'Exame', type: 'textarea' }] },
  { id: 'hematologia', name: 'Hematologia', icon: Droplets, color: 'text-red-300', activePatients: 12, calculators: ['IPI', 'Sokal Score', 'IPSS-R MDS'], assessmentFields: [{ label: 'Hb', type: 'number' }, { label: 'Leucócitos', type: 'number' }, { label: 'Plaquetas', type: 'number' }, { label: 'Observações', type: 'textarea' }] },
  { id: 'cirurgia-geral', name: 'Cirurgia Geral', icon: Scissors, color: 'text-zinc-400', activePatients: 23, calculators: ['ASA', 'Alvarado Score', 'POSSUM'], assessmentFields: [{ label: 'Procedimento', type: 'text' }, { label: 'ASA', type: 'select', options: ['I', 'II', 'III', 'IV', 'V'] }, { label: 'Exame abdominal', type: 'textarea' }] },
  { id: 'anestesiologia', name: 'Anestesiologia', icon: Syringe, color: 'text-slate-400', activePatients: 8, calculators: ['Mallampati', 'Lee Index', 'ARISCAT'], assessmentFields: [{ label: 'Mallampati', type: 'select', options: ['I', 'II', 'III', 'IV'] }, { label: 'Via aérea difícil', type: 'select', options: ['Não', 'Sim', 'Suspeita'] }, { label: 'Avaliação pré-anestésica', type: 'textarea' }] },
  { id: 'radiologia', name: 'Radiologia', icon: Radiation, color: 'text-yellow-300', activePatients: 0, calculators: ['BI-RADS', 'Lung-RADS', 'LI-RADS'], assessmentFields: [{ label: 'Exame', type: 'text' }, { label: 'Achados', type: 'textarea' }, { label: 'Impressão', type: 'textarea' }] },
  { id: 'medicina-intensiva', name: 'Medicina Intensiva', icon: Activity, color: 'text-red-400', activePatients: 18, calculators: ['APACHE II', 'SOFA', 'SAPS 3'], assessmentFields: [{ label: 'SOFA', type: 'number' }, { label: 'APACHE II', type: 'number' }, { label: 'Ventilação', type: 'select', options: ['Ar ambiente', 'CN', 'MNR', 'VNI', 'IOT/VMI'] }, { label: 'Evolução UTI', type: 'textarea' }] },
];

// ─── Calculator Components ──────────────────────────────────────────────────

function FraminghamCalculator() {
  const [age, setAge] = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [hdl, setHdl] = useState('');
  const [systolic, setSystolic] = useState('');
  const [smoker, setSmoker] = useState('no');
  const [result, setResult] = useState<{ risk: string; percent: number } | null>(null);

  function calculate() {
    const a = Number(age);
    const c = Number(cholesterol);
    const h = Number(hdl);
    const s = Number(systolic);
    if (!a || !c || !h || !s) { toast.error('Preencha todos os campos'); return; }
    const score = Math.round((a * 0.5) + (c * 0.02) - (h * 0.1) + (s * 0.05) + (smoker === 'yes' ? 5 : 0));
    const percent = Math.min(99, Math.max(1, score));
    const risk = percent < 10 ? 'Baixo' : percent < 20 ? 'Intermediário' : 'Alto';
    setResult({ risk, percent });
    toast.success(`Risco Framingham: ${risk} (${percent}%)`);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-zinc-300">Idade</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-900 text-white" /></div>
        <div><Label className="text-zinc-300">Colesterol Total</Label><Input type="number" value={cholesterol} onChange={(e) => setCholesterol(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-900 text-white" /></div>
        <div><Label className="text-zinc-300">HDL</Label><Input type="number" value={hdl} onChange={(e) => setHdl(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-900 text-white" /></div>
        <div><Label className="text-zinc-300">PA Sistólica</Label><Input type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-900 text-white" /></div>
      </div>
      <div>
        <Label className="text-zinc-300">Tabagista</Label>
        <Select value={smoker} onValueChange={setSmoker}>
          <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900 text-white"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="no">Não</SelectItem><SelectItem value="yes">Sim</SelectItem></SelectContent>
        </Select>
      </div>
      <Button onClick={calculate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"><Calculator className="mr-2 h-4 w-4" />Calcular</Button>
      {result && (
        <div className={cn('rounded-lg border p-4 text-center', result.risk === 'Baixo' ? 'border-emerald-500/50 bg-emerald-500/10' : result.risk === 'Intermediário' ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-red-500/50 bg-red-500/10')}>
          <p className="text-lg font-bold text-white">Risco: {result.risk}</p>
          <p className="text-sm text-zinc-400">Risco cardiovascular em 10 anos: {result.percent}%</p>
        </div>
      )}
    </div>
  );
}

function CKDEPICalculator() {
  const [creatinine, setCreatinine] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('male');
  const [result, setResult] = useState<{ egfr: number; stage: string } | null>(null);

  function calculate() {
    const cr = Number(creatinine);
    const a = Number(age);
    if (!cr || !a) { toast.error('Preencha todos os campos'); return; }
    const k = sex === 'female' ? 0.7 : 0.9;
    const alpha = sex === 'female' ? -0.329 : -0.411;
    const sexMultiplier = sex === 'female' ? 1.018 : 1.0;
    const egfr = Math.round(141 * Math.pow(Math.min(cr / k, 1), alpha) * Math.pow(Math.max(cr / k, 1), -1.209) * Math.pow(0.993, a) * sexMultiplier);
    const stage = egfr >= 90 ? 'G1' : egfr >= 60 ? 'G2' : egfr >= 45 ? 'G3a' : egfr >= 30 ? 'G3b' : egfr >= 15 ? 'G4' : 'G5';
    setResult({ egfr, stage });
    toast.success(`TFG estimada: ${egfr} mL/min — Estágio ${stage}`);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-zinc-300">Creatinina (mg/dL)</Label><Input type="number" step="0.1" value={creatinine} onChange={(e) => setCreatinine(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-900 text-white" /></div>
        <div><Label className="text-zinc-300">Idade</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="mt-1 border-zinc-700 bg-zinc-900 text-white" /></div>
      </div>
      <div><Label className="text-zinc-300">Sexo</Label>
        <Select value={sex} onValueChange={setSex}><SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Masculino</SelectItem><SelectItem value="female">Feminino</SelectItem></SelectContent></Select>
      </div>
      <Button onClick={calculate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"><Calculator className="mr-2 h-4 w-4" />Calcular CKD-EPI</Button>
      {result && (
        <div className={cn('rounded-lg border p-4 text-center', result.egfr >= 60 ? 'border-emerald-500/50 bg-emerald-500/10' : result.egfr >= 30 ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-red-500/50 bg-red-500/10')}>
          <p className="text-lg font-bold text-white">TFG: {result.egfr} mL/min/1.73m²</p>
          <p className="text-sm text-zinc-400">Estágio DRC: {result.stage}</p>
        </div>
      )}
    </div>
  );
}

function GenericScoreCalculator({ name, fields, interpret }: { name: string; fields: { label: string; min: number; max: number }[]; interpret: (total: number) => { label: string; color: string } }) {
  const [values, setValues] = useState<Record<string, number>>({});
  const total = useMemo(() => fields.reduce((sum, f) => sum + (values[f.label] ?? 0), 0), [values, fields]);
  const result = interpret(total);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400 font-medium">{name}</p>
      {fields.map((f) => (
        <div key={f.label}>
          <Label className="text-zinc-300">{f.label} ({f.min}-{f.max})</Label>
          <Input type="number" min={f.min} max={f.max} value={values[f.label] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.label]: Number(e.target.value) }))} className="mt-1 border-zinc-700 bg-zinc-900 text-white" />
        </div>
      ))}
      <div className={cn('rounded-lg border p-4 text-center', result.color)}>
        <p className="text-lg font-bold">Score: {total}</p>
        <p className="text-sm opacity-80">{result.label}</p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SpecialtiesPage() {
  const [activeTab, setActiveTab] = useState('hub');
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyDef | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [assessmentValues, setAssessmentValues] = useState<Record<string, string>>({});

  const filteredSpecialties = useMemo(() =>
    SPECIALTIES.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm],
  );

  const totalPatients = useMemo(() => SPECIALTIES.reduce((sum, s) => sum + s.activePatients, 0), []);

  function handleOpenAssessment(specialty: SpecialtyDef) {
    setSelectedSpecialty(specialty);
    setAssessmentValues({});
    setShowAssessment(true);
  }

  function handleSaveAssessment() {
    const filled = Object.values(assessmentValues).filter(Boolean).length;
    if (filled === 0) { toast.error('Preencha pelo menos um campo'); return; }
    toast.success(`Avaliação de ${selectedSpecialty?.name} salva com sucesso`);
    setShowAssessment(false);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hub de Especialidades</h1>
          <p className="text-sm text-zinc-400">23 especialidades — {totalPatients} pacientes ativos</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
          <Activity className="mr-1 h-3 w-3" /> {totalPatients} pacientes
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800/50">
          <TabsTrigger value="hub">Grid de Especialidades</TabsTrigger>
          <TabsTrigger value="calculadoras">Calculadoras Clínicas</TabsTrigger>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
        </TabsList>

        {/* Hub Grid */}
        <TabsContent value="hub" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input placeholder="Buscar especialidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-zinc-700 bg-zinc-900 text-white" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredSpecialties.map((spec) => {
              const Icon = spec.icon;
              return (
                <Card key={spec.id} className="border-zinc-800 bg-zinc-900 hover:border-emerald-500/50 transition-colors cursor-pointer group" onClick={() => handleOpenAssessment(spec)}>
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="rounded-full bg-zinc-800 p-3 mb-3 group-hover:bg-emerald-500/20 transition-colors">
                      <Icon className={cn('h-6 w-6', spec.color)} />
                    </div>
                    <p className="font-medium text-white text-sm">{spec.name}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Users className="h-3 w-3 text-zinc-500" />
                      <span className="text-xs text-zinc-400">{spec.activePatients} pacientes</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Calculator className="h-3 w-3 text-zinc-500" />
                      <span className="text-xs text-zinc-500">{spec.calculators.length} scores</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Calculators */}
        <TabsContent value="calculadoras" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Heart className="h-4 w-4 text-red-400" />Framingham Risk Score</CardTitle></CardHeader>
              <CardContent><FraminghamCalculator /></CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-400" />CKD-EPI (TFG)</CardTitle></CardHeader>
              <CardContent><CKDEPICalculator /></CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-purple-400" />Glasgow Coma Scale</CardTitle></CardHeader>
              <CardContent>
                <GenericScoreCalculator
                  name="Escala de Coma de Glasgow"
                  fields={[
                    { label: 'Abertura Ocular (E)', min: 1, max: 4 },
                    { label: 'Resposta Verbal (V)', min: 1, max: 5 },
                    { label: 'Resposta Motora (M)', min: 1, max: 6 },
                  ]}
                  interpret={(total) => total >= 13 ? { label: 'TCE Leve', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' } : total >= 9 ? { label: 'TCE Moderado', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' } : { label: 'TCE Grave', color: 'border-red-500/50 bg-red-500/10 text-red-400' }}
                />
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Wind className="h-4 w-4 text-cyan-400" />CURB-65</CardTitle></CardHeader>
              <CardContent>
                <GenericScoreCalculator
                  name="Pneumonia Comunitária"
                  fields={[
                    { label: 'Confusão', min: 0, max: 1 },
                    { label: 'Ureia >50 mg/dL', min: 0, max: 1 },
                    { label: 'FR ≥30', min: 0, max: 1 },
                    { label: 'PAS <90 ou PAD ≤60', min: 0, max: 1 },
                    { label: 'Idade ≥65', min: 0, max: 1 },
                  ]}
                  interpret={(total) => total <= 1 ? { label: 'Baixo risco — ambulatorial', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' } : total === 2 ? { label: 'Risco moderado — internação curta', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' } : { label: 'Alto risco — UTI', color: 'border-red-500/50 bg-red-500/10 text-red-400' }}
                />
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-violet-400" />PHQ-9 (Depressão)</CardTitle></CardHeader>
              <CardContent>
                <GenericScoreCalculator
                  name="Patient Health Questionnaire-9"
                  fields={Array.from({ length: 9 }, (_, i) => ({ label: `Questão ${i + 1}`, min: 0, max: 3 }))}
                  interpret={(total) => total <= 4 ? { label: 'Nenhum/Mínimo', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' } : total <= 9 ? { label: 'Leve', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' } : total <= 14 ? { label: 'Moderado', color: 'border-orange-500/50 bg-orange-500/10 text-orange-400' } : total <= 19 ? { label: 'Moderadamente grave', color: 'border-red-500/50 bg-red-500/10 text-red-400' } : { label: 'Grave', color: 'border-red-700/50 bg-red-700/10 text-red-300' }}
                />
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4 text-yellow-400" />Child-Pugh</CardTitle></CardHeader>
              <CardContent>
                <GenericScoreCalculator
                  name="Classificação de Child-Pugh"
                  fields={[
                    { label: 'Bilirrubina', min: 1, max: 3 },
                    { label: 'Albumina', min: 1, max: 3 },
                    { label: 'INR', min: 1, max: 3 },
                    { label: 'Ascite', min: 1, max: 3 },
                    { label: 'Encefalopatia', min: 1, max: 3 },
                  ]}
                  interpret={(total) => total <= 6 ? { label: 'Classe A — Bem compensada', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' } : total <= 9 ? { label: 'Classe B — Comprometimento significativo', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' } : { label: 'Classe C — Descompensada', color: 'border-red-500/50 bg-red-500/10 text-red-400' }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="estatisticas" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-emerald-400">{SPECIALTIES.length}</p>
                <p className="text-sm text-zinc-400">Especialidades</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-blue-400">{totalPatients}</p>
                <p className="text-sm text-zinc-400">Pacientes Ativos</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-yellow-400">{SPECIALTIES.reduce((sum, s) => sum + s.calculators.length, 0)}</p>
                <p className="text-sm text-zinc-400">Scores Disponíveis</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-purple-400">
                  {Math.round(totalPatients / SPECIALTIES.length)}
                </p>
                <p className="text-sm text-zinc-400">Média por Especialidade</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader><CardTitle className="text-white">Pacientes por Especialidade</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...SPECIALTIES].sort((a, b) => b.activePatients - a.activePatients).map((spec) => {
                  const Icon = spec.icon;
                  const pct = Math.round((spec.activePatients / totalPatients) * 100);
                  return (
                    <div key={spec.id} className="flex items-center gap-3">
                      <Icon className={cn('h-4 w-4 shrink-0', spec.color)} />
                      <span className="text-sm text-zinc-300 w-40 truncate">{spec.name}</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400 w-10 text-right">{spec.activePatients}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assessment Dialog */}
      <Dialog open={showAssessment} onOpenChange={setShowAssessment}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedSpecialty && (() => { const Icon = selectedSpecialty.icon; return <Icon className={cn('h-5 w-5', selectedSpecialty.color)} />; })()}
              Avaliação — {selectedSpecialty?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {selectedSpecialty?.assessmentFields.map((field) => (
              <div key={field.label}>
                <Label className="text-zinc-300">{field.label}</Label>
                {field.type === 'textarea' ? (
                  <Textarea value={assessmentValues[field.label] ?? ''} onChange={(e) => setAssessmentValues((v) => ({ ...v, [field.label]: e.target.value }))} className="mt-1 border-zinc-700 bg-zinc-900 text-white" rows={3} />
                ) : field.type === 'select' ? (
                  <Select value={assessmentValues[field.label] ?? ''} onValueChange={(val) => setAssessmentValues((v) => ({ ...v, [field.label]: val }))}>
                    <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900 text-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{field.options?.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input type={field.type} value={assessmentValues[field.label] ?? ''} onChange={(e) => setAssessmentValues((v) => ({ ...v, [field.label]: e.target.value }))} className="mt-1 border-zinc-700 bg-zinc-900 text-white" />
                )}
              </div>
            ))}
            {selectedSpecialty && (
              <div>
                <Label className="text-zinc-300">Scores disponíveis</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSpecialty.calculators.map((calc) => (
                    <Badge key={calc} variant="outline" className="cursor-pointer hover:bg-emerald-500/20 border-zinc-700 text-zinc-300" onClick={() => { setShowAssessment(false); setActiveTab('calculadoras'); toast.info(`Abrindo calculadora ${calc}`); }}>
                      <Calculator className="mr-1 h-3 w-3" />{calc}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setShowAssessment(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveAssessment}>Salvar Avaliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
