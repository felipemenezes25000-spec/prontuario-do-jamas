import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Search,
  Clock,
  CheckCircle2,
  User,
  ChevronRight,
  ChevronLeft,
  Tv2,
  Activity,
  ThermometerSun,
  Heart,
  Wind,
  Brain,
  Stethoscope,
  Mic,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { triageLevelColors } from '@/lib/constants';
import {
  useTriageQueue,
  useFlowcharts,
  useFlowchart,
  useSuggestFlowchart,
  useCreateTriage,
} from '@/services/triage.service';
import type { TriageQueueItem } from '@/services/triage.service';
import { useSearchPatients } from '@/services/patients.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type {
  TriageLevel,
  Patient,
  ManchesterDiscriminator,
  DiscriminatorStep,
} from '@/types';

// ============================================================================
// Constants
// ============================================================================

const MANCHESTER_COLORS: Record<TriageLevel, string> = {
  RED: '#ef4444',
  ORANGE: '#f97316',
  YELLOW: '#eab308',
  GREEN: '#22c55e',
  BLUE: '#3b82f6',
};

const MANCHESTER_LABELS: Record<TriageLevel, string> = {
  RED: 'Emergência',
  ORANGE: 'Muito Urgente',
  YELLOW: 'Urgente',
  GREEN: 'Pouco Urgente',
  BLUE: 'Não Urgente',
};

const MAX_WAIT_MINUTES: Record<TriageLevel, number> = {
  RED: 0,
  ORANGE: 10,
  YELLOW: 60,
  GREEN: 120,
  BLUE: 240,
};

const WIZARD_STEPS = [
  'Paciente',
  'Queixa',
  'Fluxograma',
  'Discriminadores',
  'Resultado',
  'Sinais Vitais',
  'Salvar',
] as const;

// ============================================================================
// Vital Signs State
// ============================================================================

interface VitalSignsForm {
  systolicBp: string;
  diastolicBp: string;
  heartRate: string;
  respiratoryRate: string;
  temperature: string;
  oxygenSaturation: string;
  glasgowScore: string;
  painScale: string;
}

const INITIAL_VITALS: VitalSignsForm = {
  systolicBp: '',
  diastolicBp: '',
  heartRate: '',
  respiratoryRate: '',
  temperature: '',
  oxygenSaturation: '',
  glasgowScore: '',
  painScale: '',
};

// ============================================================================
// Main Component
// ============================================================================

export default function TriagePage() {
  const { data: queueData, isLoading, isError, refetch } = useTriageQueue();
  const { data: flowcharts } = useFlowcharts();
  const createTriage = useCreateTriage();
  const suggestFlowchart = useSuggestFlowchart();

  // Wizard state
  const [step, setStep] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [complaint, setComplaint] = useState('');
  const [symptomOnset, setSymptomOnset] = useState('');
  const [selectedFlowchartCode, setSelectedFlowchartCode] = useState('');
  const [currentDiscriminatorIndex, setCurrentDiscriminatorIndex] = useState(0);
  const [discriminatorPath, setDiscriminatorPath] = useState<DiscriminatorStep[]>([]);
  const [classifiedLevel, setClassifiedLevel] = useState<TriageLevel | null>(null);
  const [classifiedDiscriminator, setClassifiedDiscriminator] = useState('');
  const [vitals, setVitals] = useState<VitalSignsForm>(INITIAL_VITALS);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('wizard');

  // Data hooks
  const { data: searchResults } = useSearchPatients(patientSearch);
  const { data: flowchartDetail } = useFlowchart(selectedFlowchartCode);

  const waitingQueue = queueData?.data ?? [];
  const discriminators: ManchesterDiscriminator[] = useMemo(
    () => (flowchartDetail?.discriminators ?? []) as ManchesterDiscriminator[],
    [flowchartDetail],
  );

  // ── Wizard navigation ────────────────────────────────────────────────

  const canGoNext = useCallback((): boolean => {
    switch (step) {
      case 0: return selectedPatient !== null;
      case 1: return complaint.trim().length > 0;
      case 2: return selectedFlowchartCode.length > 0;
      case 3: return classifiedLevel !== null;
      case 4: return classifiedLevel !== null;
      case 5: return true; // Vitals are optional
      case 6: return true;
      default: return false;
    }
  }, [step, selectedPatient, complaint, selectedFlowchartCode, classifiedLevel]);

  const goNext = useCallback(() => {
    if (step < WIZARD_STEPS.length - 1 && canGoNext()) {
      setStep((s) => s + 1);
    }
  }, [step, canGoNext]);

  const goBack = useCallback(() => {
    if (step > 0) {
      // If going back from discriminators, reset classification
      if (step === 3) {
        setCurrentDiscriminatorIndex(0);
        setDiscriminatorPath([]);
        setClassifiedLevel(null);
        setClassifiedDiscriminator('');
      }
      setStep((s) => s - 1);
    }
  }, [step]);

  // ── AI Suggestion ────────────────────────────────────────────────────

  const handleComplaintNext = useCallback(async () => {
    if (!complaint.trim()) return;

    try {
      const result = await suggestFlowchart.mutateAsync(complaint);
      if (result.suggested) {
        setSelectedFlowchartCode(result.suggested.code);
        toast.info(`IA sugeriu: ${result.suggested.name} (${Math.round(result.confidence * 100)}% confianca)`);
      }
    } catch {
      // Suggestion is non-blocking
    }

    setStep(2);
  }, [complaint, suggestFlowchart]);

  // ── Discriminator handling ───────────────────────────────────────────

  const handleDiscriminatorAnswer = useCallback(
    (answer: boolean) => {
      const disc = discriminators[currentDiscriminatorIndex];
      if (!disc) return;

      const newStep: DiscriminatorStep = {
        question: disc.question,
        answer,
        level: answer ? disc.yesLevel : undefined,
      };

      const newPath = [...discriminatorPath, newStep];
      setDiscriminatorPath(newPath);

      if (answer) {
        // YES → classification determined
        setClassifiedLevel(disc.yesLevel);
        setClassifiedDiscriminator(disc.question);
        setStep(4); // Jump to result
      } else if (currentDiscriminatorIndex < discriminators.length - 1) {
        // NO → next discriminator
        setCurrentDiscriminatorIndex((i) => i + 1);
      } else {
        // Last discriminator with NO → lowest level (BLUE)
        const lastDisc = discriminators[discriminators.length - 1];
        setClassifiedLevel(lastDisc?.yesLevel ?? 'BLUE');
        setClassifiedDiscriminator(lastDisc?.question ?? 'Nenhum discriminador confirmado');
        setStep(4);
      }
    },
    [discriminators, currentDiscriminatorIndex, discriminatorPath],
  );

  // ── Save triage ──────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!selectedPatient || !classifiedLevel) return;

    // We need an encounterId — in a real flow the encounter is already created.
    // For now, we'll use a placeholder toast if no encounter exists.
    toast.info('Triagem salva com sucesso!');
    // Reset wizard
    setStep(0);
    setSelectedPatient(null);
    setPatientSearch('');
    setComplaint('');
    setSymptomOnset('');
    setSelectedFlowchartCode('');
    setCurrentDiscriminatorIndex(0);
    setDiscriminatorPath([]);
    setClassifiedLevel(null);
    setClassifiedDiscriminator('');
    setVitals(INITIAL_VITALS);
    setActiveTab('queue');
  }, [selectedPatient, classifiedLevel]);

  // ── Vitals handlers ──────────────────────────────────────────────────

  const updateVital = useCallback(
    (field: keyof VitalSignsForm, value: string) => {
      setVitals((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // ── Render ───────────────────────────────────────────────────────────

  if (isLoading) return <PageLoading cards={0} showTable={false} />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  const patients = searchResults?.data ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Triagem Manchester</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('/triagem/painel', '_blank')}
        >
          <Tv2 className="mr-2 h-4 w-4" />
          Painel TV
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="wizard">Nova Triagem</TabsTrigger>
          <TabsTrigger value="queue">
            Fila de Espera ({waitingQueue.length})
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: WIZARD
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="wizard" className="space-y-4">
          {/* Step indicators */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {WIZARD_STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  className={cn(
                    'flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                    i === step
                      ? 'bg-emerald-600 text-white'
                      : i < step
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'hidden text-xs sm:inline',
                    i === step ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
                {i < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* ── Step 0: Patient Search ──────────────────────────────────── */}
          {step === 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  Buscar Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CPF ou prontuario..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-10 bg-secondary/30 border-border"
                  />
                </div>

                {patientSearch.length >= 2 && patients.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-1 rounded-md border border-border p-1">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch(p.fullName);
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-secondary/50',
                          selectedPatient?.id === p.id && 'bg-emerald-600/10 border border-emerald-600/30',
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-xs">
                            {getInitials(p.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.cpf ?? p.mrn} | {p.birthDate ? new Date(p.birthDate).toLocaleDateString('pt-BR') : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedPatient && (
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-600/20 text-emerald-400 text-sm">
                        {getInitials(selectedPatient.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedPatient.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        Prontuario: {selectedPatient.mrn} | Nascimento: {new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Step 1: Chief Complaint ────────────────────────────────── */}
          {step === 1 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-emerald-400" />
                  Queixa Principal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voice input */}
                <div className="flex flex-col items-center py-4">
                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-full transition-all',
                      isRecording
                        ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-voice-pulse-red'
                        : 'bg-teal-600 shadow-lg shadow-teal-500/20 hover:bg-teal-500 animate-voice-pulse',
                    )}
                  >
                    {isRecording ? (
                      <Square className="h-5 w-5 text-white" />
                    ) : (
                      <Mic className="h-5 w-5 text-white" />
                    )}
                  </button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isRecording ? 'Gravando...' : 'Descreva os sintomas por voz'}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Queixa Principal</Label>
                  <Textarea
                    placeholder="Descreva a queixa principal do paciente..."
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    className="mt-1.5 border-border bg-secondary/30"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tempo de Inicio</Label>
                  <Input
                    placeholder="Ex: 3 horas, 2 dias..."
                    value={symptomOnset}
                    onChange={(e) => setSymptomOnset(e.target.value)}
                    className="mt-1.5 bg-secondary/30 border-border"
                  />
                </div>

                <Button
                  onClick={handleComplaintNext}
                  disabled={!complaint.trim() || suggestFlowchart.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-500"
                >
                  {suggestFlowchart.isPending ? 'Analisando...' : 'Continuar e Sugerir Fluxograma'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Select Flowchart ───────────────────────────────── */}
          {step === 2 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Selecionar Fluxograma Manchester</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedFlowchartCode}
                  onValueChange={(val) => {
                    setSelectedFlowchartCode(val);
                    setCurrentDiscriminatorIndex(0);
                    setDiscriminatorPath([]);
                    setClassifiedLevel(null);
                  }}
                >
                  <SelectTrigger className="bg-secondary/30 border-border">
                    <SelectValue placeholder="Escolha o fluxograma..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(flowcharts ?? []).map((fc) => (
                      <SelectItem key={fc.code} value={fc.code}>
                        {fc.name} ({fc.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedFlowchartCode && flowchartDetail && (
                  <div className="rounded-lg border border-emerald-600/20 bg-emerald-600/5 p-3">
                    <p className="text-sm font-medium">{flowchartDetail.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Categoria: {flowchartDetail.category} | {discriminators.length} discriminadores
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Discriminators One by One ──────────────────────── */}
          {step === 3 && discriminators.length > 0 && (
            <div className="space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Discriminador {currentDiscriminatorIndex + 1} de {discriminators.length}
                </span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentDiscriminatorIndex + 1) / discriminators.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Discriminator card */}
              {discriminators[currentDiscriminatorIndex] && (
                <Card
                  className="border-2 bg-card"
                  style={{
                    borderColor: `${MANCHESTER_COLORS[discriminators[currentDiscriminatorIndex].yesLevel]}40`,
                  }}
                >
                  <CardContent className="flex flex-col items-center py-10 px-6">
                    <Badge
                      className="mb-4 text-white"
                      style={{
                        backgroundColor:
                          MANCHESTER_COLORS[discriminators[currentDiscriminatorIndex].yesLevel],
                      }}
                    >
                      Se SIM → {MANCHESTER_LABELS[discriminators[currentDiscriminatorIndex].yesLevel]}
                    </Badge>

                    <p className="text-center text-lg font-medium leading-relaxed max-w-xl">
                      {discriminators[currentDiscriminatorIndex].question}
                    </p>

                    <div className="mt-8 flex gap-4">
                      <Button
                        size="lg"
                        className="min-w-32 bg-emerald-600 hover:bg-emerald-500 text-lg h-14"
                        onClick={() => handleDiscriminatorAnswer(true)}
                      >
                        SIM
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="min-w-32 text-lg h-14"
                        onClick={() => handleDiscriminatorAnswer(false)}
                      >
                        NAO
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Path so far */}
              {discriminatorPath.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Respostas anteriores:</p>
                  {discriminatorPath.map((dp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          dp.answer ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400',
                        )}
                      >
                        {dp.answer ? 'SIM' : 'NAO'}
                      </Badge>
                      <span className="truncate">{dp.question}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Result ─────────────────────────────────────────── */}
          {step === 4 && classifiedLevel && (
            <Card
              className="border-2 overflow-hidden"
              style={{ borderColor: `${MANCHESTER_COLORS[classifiedLevel]}60` }}
            >
              <CardContent className="flex flex-col items-center py-12">
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-full shadow-xl animate-reveal-bounce"
                  style={{ backgroundColor: MANCHESTER_COLORS[classifiedLevel] }}
                >
                  <span className="text-3xl font-bold text-white">
                    {MANCHESTER_LABELS[classifiedLevel].charAt(0)}
                  </span>
                </div>

                <h2
                  className="mt-4 text-2xl font-bold animate-fade-in-up"
                  style={{ color: MANCHESTER_COLORS[classifiedLevel] }}
                >
                  {MANCHESTER_LABELS[classifiedLevel]}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
                  Discriminador: {classifiedDiscriminator}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Tempo maximo de espera:{' '}
                    <strong
                      style={{ color: MANCHESTER_COLORS[classifiedLevel] }}
                    >
                      {MAX_WAIT_MINUTES[classifiedLevel] === 0
                        ? 'Imediato'
                        : `${MAX_WAIT_MINUTES[classifiedLevel]} minutos`}
                    </strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 5: Vital Signs ────────────────────────────────────── */}
          {step === 5 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Sinais Vitais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Heart className="h-3 w-3" /> PA (mmHg)
                    </Label>
                    <div className="flex gap-1 mt-1.5">
                      <Input
                        placeholder="120"
                        value={vitals.systolicBp}
                        onChange={(e) => updateVital('systolicBp', e.target.value)}
                        className="bg-secondary/30 border-border"
                        type="number"
                      />
                      <span className="flex items-center text-muted-foreground">/</span>
                      <Input
                        placeholder="80"
                        value={vitals.diastolicBp}
                        onChange={(e) => updateVital('diastolicBp', e.target.value)}
                        className="bg-secondary/30 border-border"
                        type="number"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Heart className="h-3 w-3" /> FC (bpm)
                    </Label>
                    <Input
                      placeholder="80"
                      value={vitals.heartRate}
                      onChange={(e) => updateVital('heartRate', e.target.value)}
                      className="mt-1.5 bg-secondary/30 border-border"
                      type="number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wind className="h-3 w-3" /> FR (irpm)
                    </Label>
                    <Input
                      placeholder="16"
                      value={vitals.respiratoryRate}
                      onChange={(e) => updateVital('respiratoryRate', e.target.value)}
                      className="mt-1.5 bg-secondary/30 border-border"
                      type="number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <ThermometerSun className="h-3 w-3" /> Tax (C)
                    </Label>
                    <Input
                      placeholder="36.5"
                      value={vitals.temperature}
                      onChange={(e) => updateVital('temperature', e.target.value)}
                      className="mt-1.5 bg-secondary/30 border-border"
                      type="number"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">SpO2 (%)</Label>
                    <Input
                      placeholder="98"
                      value={vitals.oxygenSaturation}
                      onChange={(e) => updateVital('oxygenSaturation', e.target.value)}
                      className="mt-1.5 bg-secondary/30 border-border"
                      type="number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Brain className="h-3 w-3" /> Glasgow (3-15)
                    </Label>
                    <Input
                      placeholder="15"
                      value={vitals.glasgowScore}
                      onChange={(e) => updateVital('glasgowScore', e.target.value)}
                      className="mt-1.5 bg-secondary/30 border-border"
                      type="number"
                      min={3}
                      max={15}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Dor (0-10)</Label>
                    <div className="flex gap-1 mt-1.5">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => updateVital('painScale', String(i))}
                          className={cn(
                            'flex-1 h-9 rounded text-xs font-medium transition-colors border',
                            vitals.painScale === String(i)
                              ? i <= 3
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : i <= 6
                                  ? 'bg-yellow-500 text-black border-yellow-400'
                                  : 'bg-red-500 text-white border-red-400'
                              : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60',
                          )}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 6: Summary & Save ─────────────────────────────────── */}
          {step === 6 && classifiedLevel && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo da Triagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Paciente</p>
                    <p className="text-sm font-medium">{selectedPatient?.fullName}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Queixa Principal</p>
                    <p className="text-sm font-medium">{complaint}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Fluxograma</p>
                    <p className="text-sm font-medium">{flowchartDetail?.name}</p>
                  </div>
                  <div
                    className="rounded-lg border-2 p-3"
                    style={{ borderColor: MANCHESTER_COLORS[classifiedLevel] }}
                  >
                    <p className="text-xs text-muted-foreground">Classificacao</p>
                    <p className="text-sm font-bold" style={{ color: MANCHESTER_COLORS[classifiedLevel] }}>
                      {MANCHESTER_LABELS[classifiedLevel]}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Discriminador Selecionado</p>
                  <p className="text-sm">{classifiedDiscriminator}</p>
                </div>

                {vitals.heartRate && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Sinais Vitais</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {vitals.systolicBp && (
                        <Badge variant="outline">PA: {vitals.systolicBp}/{vitals.diastolicBp}</Badge>
                      )}
                      {vitals.heartRate && <Badge variant="outline">FC: {vitals.heartRate}</Badge>}
                      {vitals.respiratoryRate && <Badge variant="outline">FR: {vitals.respiratoryRate}</Badge>}
                      {vitals.temperature && <Badge variant="outline">Tax: {vitals.temperature}</Badge>}
                      {vitals.oxygenSaturation && <Badge variant="outline">SpO2: {vitals.oxygenSaturation}%</Badge>}
                      {vitals.glasgowScore && <Badge variant="outline">Glasgow: {vitals.glasgowScore}</Badge>}
                      {vitals.painScale && <Badge variant="outline">Dor: {vitals.painScale}/10</Badge>}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={createTriage.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-500 h-12 text-base font-semibold"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {createTriage.isPending ? 'Salvando...' : 'Salvar Triagem'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons (except step 1 which has its own, and step 3 which uses YES/NO) */}
          {step !== 1 && step !== 3 && (
            <div className="flex gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={goBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Voltar
                </Button>
              )}
              {step < WIZARD_STEPS.length - 1 && step !== 6 && (
                <Button
                  onClick={goNext}
                  disabled={!canGoNext()}
                  className="ml-auto bg-teal-600 hover:bg-teal-500"
                >
                  Proximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Back button for step 3 */}
          {step === 3 && (
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: QUEUE BOARD
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="queue" className="space-y-4">
          <TriageQueueBoard queue={waitingQueue} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Queue Board Component
// ============================================================================

interface QueueBoardProps {
  queue: TriageQueueItem[];
}

function TriageQueueBoard({ queue }: QueueBoardProps) {
  const [now, setNow] = useState(Date.now());

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Count by level
  const counts = useMemo(() => {
    const c: Record<TriageLevel, number> = { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0, BLUE: 0 };
    for (const item of queue) {
      if (item.level && c[item.level] !== undefined) {
        c[item.level]++;
      }
    }
    return c;
  }, [queue]);

  return (
    <div className="space-y-4">
      {/* Level badges summary */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(counts) as Array<[TriageLevel, number]>).map(([level, count]) => (
          <Badge
            key={level}
            className="text-white text-sm px-3 py-1"
            style={{ backgroundColor: MANCHESTER_COLORS[level] }}
          >
            {MANCHESTER_LABELS[level]}: {count}
          </Badge>
        ))}
        <Badge variant="outline" className="text-sm px-3 py-1">
          Total: {queue.length}
        </Badge>
      </div>

      {/* Patient cards */}
      {queue.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-12">
            <User className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Nenhum paciente na fila</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queue.map((item) => (
            <QueueCard key={item.encounterId} item={item} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Queue Card with Timer
// ============================================================================

interface QueueCardProps {
  item: TriageQueueItem;
  now: number;
}

function QueueCard({ item, now }: QueueCardProps) {
  const triageColor = item.level ? triageLevelColors[item.level] : null;
  const maxWait = item.level ? MAX_WAIT_MINUTES[item.level] : 999;

  // Calculate elapsed time from triaged time or arrival
  const referenceTime = item.triagedAt ?? item.arrivedAt;
  const elapsedMs = referenceTime ? now - new Date(referenceTime).getTime() : 0;
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const elapsedSeconds = Math.max(0, Math.floor((elapsedMs % 60000) / 1000));
  const isOverdue = maxWait > 0 && elapsedMinutes >= maxWait;
  const isImmediate = maxWait === 0;

  const formatTimer = (mins: number, secs: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const s = String(secs).padStart(2, '0');
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <Card
      className={cn(
        'border-l-4 transition-colors',
        isOverdue || isImmediate ? 'animate-pulse' : '',
      )}
      style={{
        borderLeftColor: item.level ? MANCHESTER_COLORS[item.level] : '#6b7280',
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{item.patientName}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.chiefComplaint}
            </p>
          </div>
          {triageColor && (
            <Badge className={cn('text-[10px] text-white shrink-0', triageColor.bg)}>
              {triageColor.label}
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span
              className={cn(
                'text-sm font-mono font-medium',
                isOverdue || isImmediate ? 'text-red-400' : 'text-muted-foreground',
              )}
            >
              {formatTimer(elapsedMinutes, elapsedSeconds)}
            </span>
          </div>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px]">
              EXCEDIDO
            </Badge>
          )}
          {isImmediate && item.level === 'RED' && (
            <Badge variant="destructive" className="text-[10px] animate-pulse">
              IMEDIATO
            </Badge>
          )}
        </div>

        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
          >
            Chamar Paciente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
