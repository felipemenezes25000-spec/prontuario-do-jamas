import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mic,
  Square,
  AlertTriangle,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Pill,
  TestTube,
  FileText,
  Lightbulb,
  Clock,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Stethoscope,
  Loader2,
  Sparkles,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, getInitials, calculateAge } from '@/lib/utils';
import { encounterStatusLabels, encounterTypeLabels, triageLevelColors } from '@/lib/constants';
import { useEncounter } from '@/services/encounters.service';
import { useAllergies, useConditions } from '@/services/patient-details.service';
import { usePrescriptions } from '@/services/prescriptions.service';
import { useLatestVitalSigns } from '@/services/vital-signs.service';
import { useAlerts } from '@/services/alerts.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { useVoice } from '@/hooks/use-voice';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────────

interface SoapResponse {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosisCodes: string[];
  suggestedExams: string[];
  suggestedMedications: Array<{
    name: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  }>;
}

interface ParsedPrescriptionItem {
  medicationName: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  confidence: number;
}

interface SafetyWarning {
  type: string;
  severity: string;
  message: string;
  items: string[];
}

interface CopilotSuggestion {
  type: string;
  text: string;
  confidence: number;
  source: string;
  actionable: boolean;
}

// ── Helpers ────────────────────────────────────────────────

function formatDuration(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return hrs > 0 ? `${hrs}h ${m.toString().padStart(2, '0')}min` : `${m}min`;
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────

export default function EncounterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('soap');
  const [elapsed, setElapsed] = useState('');

  const { data: encounter, isLoading: encounterLoading, isError: encounterError, refetch } = useEncounter(id ?? '');

  const voice = useVoice({
    context: 'soap',
    encounterId: id,
    patientId: encounter?.patientId,
  });

  const { data: patientAllergies = [] } = useAllergies(encounter?.patientId ?? '');
  const { data: prescriptionsData } = usePrescriptions(id ? { encounterId: id } : undefined);
  const patientPrescriptions = prescriptionsData?.data ?? [];
  const { data: latestVitals } = useLatestVitalSigns(encounter?.patientId ?? '');
  const { data: alertsData } = useAlerts({ patientId: encounter?.patientId, isActive: true });
  const patientAlerts = alertsData?.data ?? [];
  const { data: patientConditions = [] } = useConditions(encounter?.patientId ?? '');

  // SOAP state — encounter might carry SOAP fields from prior notes
  const encounterRecord = encounter as Record<string, unknown> | undefined;
  const [subjective, setSubjective] = useState(
    (typeof encounterRecord?.subjective === 'string' ? encounterRecord.subjective : '') as string,
  );
  const [objective, setObjective] = useState(
    (typeof encounterRecord?.objective === 'string' ? encounterRecord.objective : '') as string,
  );
  const [assessment, setAssessment] = useState(
    (typeof encounterRecord?.assessment === 'string' ? encounterRecord.assessment : '') as string,
  );
  const [plan, setPlan] = useState(
    (typeof encounterRecord?.plan === 'string' ? encounterRecord.plan : '') as string,
  );

  // AI state
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [isParsingPrescription, setIsParsingPrescription] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [copilotSuggestions, setCopilotSuggestions] = useState<CopilotSuggestion[]>([]);
  const [isLoadingCopilot, setIsLoadingCopilot] = useState(false);

  // Prescription modal state
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [parsedPrescriptionItems, setParsedPrescriptionItems] = useState<ParsedPrescriptionItem[]>([]);
  const [safetyWarnings, setSafetyWarnings] = useState<SafetyWarning[]>([]);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  const [isSafetyChecked, setIsSafetyChecked] = useState(false);

  // Duration timer
  useEffect(() => {
    if (!encounter) return;
    const tick = () => setElapsed(formatDuration(encounter.startedAt ?? encounter.createdAt));
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [encounter]);

  // Auto-generate SOAP when transcription completes
  useEffect(() => {
    if (
      voice.currentTranscription &&
      !voice.isRecording &&
      !voice.isProcessing &&
      !isGeneratingSoap
    ) {
      void handleGenerateSoap(voice.currentTranscription);
    }
    // Only trigger when transcription becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.currentTranscription, voice.isRecording, voice.isProcessing]);

  // ── AI Calls ─────────────────────────────────────────────

  const handleGenerateSoap = useCallback(
    async (transcription: string) => {
      if (!transcription || isGeneratingSoap) return;
      setIsGeneratingSoap(true);

      try {
        const { data } = await api.post<SoapResponse>('/ai/soap/generate', {
          transcription,
          patientId: encounter?.patientId,
          encounterId: id,
        });

        setSubjective((prev: string) => (prev ? `${prev}\n\n${data.subjective}` : data.subjective));
        setObjective((prev: string) => (prev ? `${prev}\n\n${data.objective}` : data.objective));
        setAssessment((prev: string) => (prev ? `${prev}\n\n${data.assessment}` : data.assessment));
        setPlan((prev: string) => (prev ? `${prev}\n\n${data.plan}` : data.plan));

        // Fetch copilot suggestions after SOAP
        void fetchCopilotSuggestions(transcription);
      } catch {
        // SOAP generation failed silently — user can still type manually
      } finally {
        setIsGeneratingSoap(false);
      }
    },
    [encounter?.patientId, id, isGeneratingSoap],
  );

  const fetchCopilotSuggestions = async (transcription: string) => {
    if (!id) return;
    setIsLoadingCopilot(true);
    try {
      const { data } = await api.post<{ suggestions: CopilotSuggestion[] }>(
        '/ai/copilot/suggestions',
        { encounterId: id, transcription },
      );
      setCopilotSuggestions(data.suggestions);
    } catch {
      // Copilot is non-critical
    } finally {
      setIsLoadingCopilot(false);
    }
  };

  const handleParsePrescription = async () => {
    if (!voice.currentTranscription) return;
    setIsParsingPrescription(true);
    try {
      const { data } = await api.post<{ items: ParsedPrescriptionItem[] }>(
        '/ai/prescription/parse-voice',
        { text: voice.currentTranscription },
      );
      setParsedPrescriptionItems(data.items);
      setIsSafetyChecked(false);
      setSafetyWarnings([]);
      setPrescriptionModalOpen(true);
    } catch {
      // Handle error
    } finally {
      setIsParsingPrescription(false);
    }
  };

  const handleSafetyCheck = async () => {
    if (parsedPrescriptionItems.length === 0 || !encounter?.patientId) return;
    setIsCheckingSafety(true);
    try {
      const { data } = await api.post<{ safe: boolean; warnings: SafetyWarning[] }>(
        '/ai/prescription/check-safety',
        {
          items: parsedPrescriptionItems.map((i) => ({
            medicationName: i.medicationName,
            dose: i.dose,
          })),
          patientId: encounter.patientId,
        },
      );
      setSafetyWarnings(data.warnings);
      setIsSafetyChecked(true);
    } catch {
      setSafetyWarnings([
        {
          type: 'system_error',
          severity: 'high',
          message: 'Nao foi possivel verificar a seguranca. Revise manualmente.',
          items: [],
        },
      ]);
      setIsSafetyChecked(true);
    } finally {
      setIsCheckingSafety(false);
    }
  };

  const handleSavePrescription = async () => {
    // In production: POST /prescriptions with parsed items
    setPrescriptionModalOpen(false);
    setParsedPrescriptionItems([]);
    setSafetyWarnings([]);
    setIsSafetyChecked(false);
  };

  const handleSaveNote = async () => {
    if (!id) return;
    setIsSavingNote(true);
    try {
      await api.post('/clinical-notes', {
        encounterId: id,
        patientId: encounter?.patientId,
        subjective,
        objective,
        assessment,
        plan,
      });
    } catch {
      // Handle save error
    } finally {
      setIsSavingNote(false);
    }
  };

  // ── Render Guards ────────────────────────────────────────

  if (encounterLoading) return <PageLoading cards={0} showTable={false} />;
  if (encounterError) return <PageError onRetry={() => refetch()} />;

  if (!encounter) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Stethoscope className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Atendimento nao encontrado</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/atendimentos')}>
          Voltar para Atendimentos
        </Button>
      </div>
    );
  }

  const patient = encounter.patient;
  const statusInfo = encounterStatusLabels[encounter.status];
  const triageInfo = encounter.triageLevel ? triageLevelColors[encounter.triageLevel] : null;

  const handleVoiceToggle = () => {
    if (voice.isRecording) {
      voice.stopRecording();
    } else {
      voice.startRecording();
    }
  };

  const hasMedicationMentions =
    voice.currentTranscription &&
    /prescri|medica|remedio|comprimido|dipirona|amoxicilina|paracetamol|ibuprofeno|omeprazol/i.test(
      voice.currentTranscription,
    );

  return (
    <div className="animate-fade-in">
      {/* Top header bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/atendimentos')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-teal-500/20 text-sm text-teal-600 dark:text-teal-400">
            {patient ? getInitials(patient.fullName) : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-bold">{patient?.name}</h1>
            {patient && (
              <span className="text-sm text-muted-foreground">
                {calculateAge(patient.birthDate)} anos
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-secondary text-[10px]">
              {encounterTypeLabels[encounter.type]}
            </Badge>
            <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
              {statusInfo?.label}
            </Badge>
            {triageInfo && (
              <div className="flex items-center gap-1">
                <div className={cn('h-2.5 w-2.5 rounded-full', triageInfo.bg)} />
                <span className={cn('text-[10px]', triageInfo.text)}>{triageInfo.label}</span>
              </div>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{elapsed}</span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* LEFT PANEL (70%) */}
        <div className="flex-1 space-y-4 lg:max-w-[70%]">
          {/* Voice Recording Section */}
          <Card className={cn(
            'border-border overflow-hidden transition-all duration-500',
            voice.isRecording
              ? 'bg-gradient-to-b from-red-500/10 via-zinc-900/80 to-zinc-900/50 border-red-500/20'
              : 'bg-card',
          )}>
            <CardContent className="relative flex flex-col items-center py-8">
              {/* Radial gradient emanating from button */}
              <div className={cn(
                'pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px] transition-all duration-500',
                voice.isRecording
                  ? 'h-48 w-48 bg-red-500/15'
                  : 'h-32 w-32 bg-teal-500/10',
              )} />
              {/* Large Voice Button */}
              <button
                onClick={handleVoiceToggle}
                disabled={isGeneratingSoap}
                className={cn(
                  'relative flex h-[72px] w-[72px] items-center justify-center rounded-full transition-all duration-300',
                  voice.isRecording
                    ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-voice-pulse-red'
                    : isGeneratingSoap
                      ? 'bg-muted cursor-not-allowed'
                      : 'bg-teal-600 shadow-lg shadow-teal-500/20 hover:bg-teal-500 hover:shadow-teal-500/30 animate-voice-pulse',
                )}
              >
                {voice.isRecording ? (
                  <Square className="h-7 w-7 text-white" />
                ) : isGeneratingSoap ? (
                  <Loader2 className="h-7 w-7 text-white animate-spin" />
                ) : (
                  <Mic className="h-7 w-7 text-white" />
                )}
              </button>

              {/* Status text */}
              <p className="mt-4 text-sm text-muted-foreground">
                {voice.isRecording ? (
                  <span>
                    Gravando...{' '}
                    <span className="font-mono tabular-nums text-red-400">
                      {formatRecordingTime(voice.duration)}
                    </span>
                  </span>
                ) : voice.isProcessing ? (
                  'Processando transcricao...'
                ) : isGeneratingSoap ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400 animate-pulse" />
                    Gerando nota SOAP com IA...
                  </span>
                ) : (
                  'Toque para iniciar gravacao'
                )}
              </p>

              {/* Audio visualizer wave when recording */}
              {voice.isRecording && (
                <div className="mt-3 flex items-center gap-[2px]">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-gradient-to-t from-red-500 to-red-300"
                      style={{
                        height: '4px',
                        animation: `eq-bar 0.8s ease-in-out infinite`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Partial transcription (typewriter effect area) */}
              {(voice.isRecording || voice.isProcessing) && voice.partialTranscription && (
                <div className="mt-4 w-full max-w-lg rounded-lg border border-border bg-card/50 p-4">
                  <p className="text-sm text-muted-foreground italic">
                    {voice.partialTranscription}
                    <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-teal-500" />
                  </p>
                </div>
              )}

              {/* Final transcription result */}
              {!voice.isRecording && !voice.isProcessing && !isGeneratingSoap && voice.currentTranscription && (
                <div className="mt-4 w-full max-w-lg rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-medium text-teal-600 dark:text-teal-400">Transcricao concluida e SOAP gerada</span>
                  </div>
                  <p className="text-sm">{voice.currentTranscription}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hasMedicationMentions && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500/30 text-xs text-amber-400 hover:bg-amber-500/10"
                        onClick={handleParsePrescription}
                        disabled={isParsingPrescription}
                      >
                        {isParsingPrescription ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Pill className="mr-1 h-3 w-3" />
                        )}
                        Gerar Prescricao
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-xs"
                      onClick={() => voice.clearTranscription()}
                    >
                      Descartar
                    </Button>
                  </div>
                </div>
              )}

              {/* Error */}
              {voice.error && (
                <div className="mt-4 w-full max-w-lg rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <p className="text-sm text-red-400">{voice.error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card border border-border w-full justify-start">
              <TabsTrigger value="soap" className="text-xs data-[state=active]:bg-teal-600">SOAP</TabsTrigger>
              <TabsTrigger value="prescricao" className="text-xs data-[state=active]:bg-teal-600">Prescricao</TabsTrigger>
              <TabsTrigger value="exames" className="text-xs data-[state=active]:bg-teal-600">Exames</TabsTrigger>
              <TabsTrigger value="documentos" className="text-xs data-[state=active]:bg-teal-600">Documentos</TabsTrigger>
            </TabsList>

            {/* SOAP Tab */}
            <TabsContent value="soap" className="space-y-4 mt-4">
              {[
                { key: 'S', label: 'Subjetivo', hint: 'Queixa principal, historia da doenca atual, revisao de sistemas...', value: subjective, onChange: setSubjective },
                { key: 'O', label: 'Objetivo', hint: 'Exame fisico, sinais vitais, dados laboratoriais...', value: objective, onChange: setObjective },
                { key: 'A', label: 'Avaliacao', hint: 'Diagnosticos, hipoteses diagnosticas, CID...', value: assessment, onChange: setAssessment },
                { key: 'P', label: 'Plano', hint: 'Conduta terapeutica, exames solicitados, encaminhamentos...', value: plan, onChange: setPlan },
              ].map((section) => (
                <Card key={section.key} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/20 text-sm font-bold text-teal-600 dark:text-teal-400">
                          {section.key}
                        </div>
                        <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-teal-600 dark:text-teal-400"
                        onClick={() => {
                          if (!voice.isRecording) voice.startRecording();
                        }}
                      >
                        <Mic className="h-3 w-3" />
                        Voz
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder={section.hint}
                      value={section.value}
                      onChange={(e) => section.onChange(e.target.value)}
                      className="min-h-[100px] resize-y border-border bg-secondary/30 text-sm"
                    />
                  </CardContent>
                </Card>
              ))}

              <Button
                className="w-full bg-teal-600 hover:bg-teal-500 h-11 font-semibold"
                onClick={handleSaveNote}
                disabled={isSavingNote}
              >
                {isSavingNote ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Assinar Atendimento
              </Button>
            </TabsContent>

            {/* Prescricao Tab */}
            <TabsContent value="prescricao" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-border text-xs"
                  onClick={() => {
                    if (!voice.isRecording) voice.startRecording();
                  }}
                >
                  <Mic className="mr-2 h-3.5 w-3.5" />
                  Adicionar por Voz
                </Button>
                <Button variant="outline" className="border-border text-xs">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Adicionar Manual
                </Button>
              </div>

              {patientPrescriptions.length === 0 ? (
                <Card className="border-border bg-card">
                  <CardContent className="flex flex-col items-center py-10">
                    <Pill className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">Nenhuma prescricao neste atendimento</p>
                  </CardContent>
                </Card>
              ) : (
                patientPrescriptions.map((presc) => (
                  <div key={presc.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">
                        Prescricao — {new Date(presc.createdAt).toLocaleDateString('pt-BR')}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px]',
                          presc.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400',
                        )}
                      >
                        {presc.status === 'ACTIVE' ? 'Ativa' : presc.status === 'DRAFT' ? 'Rascunho' : presc.status}
                      </Badge>
                    </div>
                    {presc.items.map((item) => (
                      <Card
                        key={item.id}
                        className={cn(
                          'border',
                          item.isHighAlert ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-card',
                        )}
                      >
                        <CardContent className="flex items-center gap-3 py-3">
                          <Pill className={cn('h-4 w-4 shrink-0', item.isHighAlert ? 'text-red-400' : 'text-teal-600 dark:text-teal-400')} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{item.medicationName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.dose} — {item.route} — {item.frequency}
                              {item.duration && ` — ${item.duration}`}
                            </p>
                            {item.specialInstructions && (
                              <p className="mt-1 text-xs italic text-muted-foreground">{item.specialInstructions}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {item.isHighAlert && (
                              <Badge className="bg-red-500/20 text-[10px] text-red-400 mr-1">Alto Alerta</Badge>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))
              )}
            </TabsContent>

            {/* Exames Tab */}
            <TabsContent value="exames" className="space-y-4 mt-4">
              <Button variant="outline" className="border-border text-xs">
                <TestTube className="mr-2 h-3.5 w-3.5" />
                Solicitar Exame
              </Button>

              <Card className="border-border bg-card">
                <CardContent className="py-3">
                  <div className="space-y-3">
                    {[
                      { name: 'ECG 12 derivacoes', status: 'Solicitado', time: '09:10' },
                      { name: 'Troponina T ultrassensivel', status: 'Coletado', time: '09:15' },
                      { name: 'Hemograma completo', status: 'Coletado', time: '09:15' },
                      { name: 'Eletrolitos (Na, K, Mg)', status: 'Solicitado', time: '09:10' },
                      { name: 'Glicemia de jejum', status: 'Resultado', time: '09:40', result: '189 mg/dL', abnormal: true },
                    ].map((exam, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <TestTube className={cn('h-4 w-4 shrink-0', exam.abnormal ? 'text-red-400' : 'text-muted-foreground')} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{exam.name}</p>
                          {exam.result && (
                            <p className={cn('text-xs', exam.abnormal ? 'text-red-400 font-medium' : 'text-muted-foreground')}>
                              Resultado: {exam.result}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            exam.status === 'Resultado' ? (exam.abnormal ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400') :
                            exam.status === 'Coletado' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400',
                          )}
                        >
                          {exam.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{exam.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documentos Tab */}
            <TabsContent value="documentos" className="space-y-4 mt-4">
              <Button variant="outline" className="border-border text-xs">
                <FileText className="mr-2 h-3.5 w-3.5" />
                Gerar Documento
              </Button>

              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-10">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum documento gerado ainda</p>
                  <p className="mt-1 text-xs text-muted-foreground">Atestados, receitas e laudos aparecerao aqui</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT PANEL (30%) — Intelligence Sidebar */}
        <div className="w-full space-y-4 lg:w-[30%] lg:min-w-[300px]">
          <ScrollArea className="lg:h-[calc(100vh-10rem)]">
            <div className="space-y-4 pr-2">
              {/* Patient AI Summary */}
              <Card className="animate-slide-in-right stagger-1 border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Stethoscope className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    Resumo do Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {patient?.gender === 'F' ? 'Feminina' : 'Masculino'}, {patient ? calculateAge(patient.birthDate) : '?'} anos.{' '}
                    {patientConditions.length > 0
                      ? patientConditions.map((c) => c.cidDescription ?? c.cidCode ?? '').filter(Boolean).join(', ') + '.'
                      : 'Sem condicoes cronicas.'}
                    {patientAllergies.length > 0
                      ? ` Alergia: ${patientAllergies.map((a) => a.substance).join(', ')}.`
                      : ''}
                  </p>
                </CardContent>
              </Card>

              {/* Current Vital Signs */}
              {latestVitals && (
                <Card className="animate-slide-in-right stagger-2 border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Activity className="h-3.5 w-3.5 text-blue-400" />
                      Sinais Vitais Atuais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          label: 'PA',
                          value: `${latestVitals.systolicBP}/${latestVitals.diastolicBP}`,
                          unit: 'mmHg',
                          icon: Gauge,
                          alert: latestVitals.systolicBP && latestVitals.systolicBP > 140,
                        },
                        {
                          label: 'FC',
                          value: latestVitals.heartRate,
                          unit: 'bpm',
                          icon: Heart,
                          alert: latestVitals.heartRate && (latestVitals.heartRate > 100 || latestVitals.heartRate < 60),
                        },
                        {
                          label: 'FR',
                          value: latestVitals.respiratoryRate,
                          unit: 'irpm',
                          icon: Wind,
                          alert: latestVitals.respiratoryRate && latestVitals.respiratoryRate > 20,
                        },
                        {
                          label: 'Temp',
                          value: latestVitals.temperature ? `${latestVitals.temperature}°` : '-',
                          unit: 'C',
                          icon: Thermometer,
                          alert: latestVitals.temperature && latestVitals.temperature > 37.5,
                        },
                        {
                          label: 'SpO2',
                          value: latestVitals.oxygenSaturation ? `${latestVitals.oxygenSaturation}%` : '-',
                          unit: '',
                          icon: Droplets,
                          alert: latestVitals.oxygenSaturation && latestVitals.oxygenSaturation < 95,
                        },
                        {
                          label: 'Dor',
                          value: latestVitals.painScale !== undefined ? `${latestVitals.painScale}/10` : '-',
                          unit: '',
                          icon: Activity,
                          alert: latestVitals.painScale !== undefined && latestVitals.painScale >= 7,
                        },
                      ].map((vital) => (
                        <div
                          key={vital.label}
                          className={cn(
                            'rounded-lg border p-2 text-center',
                            vital.alert
                              ? 'border-red-500/30 bg-red-500/5'
                              : 'border-border bg-secondary/30',
                          )}
                        >
                          <vital.icon className={cn('mx-auto h-3.5 w-3.5', vital.alert ? 'text-red-400' : 'text-muted-foreground')} />
                          <p className={cn('mt-1 text-sm font-bold', vital.alert ? 'text-red-400' : '')}>
                            {vital.value}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{vital.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Allergies — always visible */}
              {patientAllergies.length > 0 && (
                <Card className="animate-slide-in-right stagger-3 border-red-500/30 bg-red-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs font-medium text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Alergias
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {patientAllergies.map((allergy) => (
                      <div key={allergy.id} className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
                        <p className="text-xs font-medium text-red-300">{allergy.substance}</p>
                        <p className="text-[10px] text-red-400/70">{allergy.reaction}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Active Medications */}
              <Card className="animate-slide-in-right stagger-4 border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Pill className="h-3.5 w-3.5 text-amber-400" />
                    Medicamentos em Uso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patientPrescriptions.length > 0 ? (
                    <div className="space-y-1.5">
                      {patientPrescriptions.flatMap((p) => p.items).map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          <div className={cn('h-1.5 w-1.5 rounded-full', item.isHighAlert ? 'bg-red-400' : 'bg-teal-400')} />
                          <span className="text-muted-foreground">
                            {item.medicationName} — {item.frequency}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum medicamento prescrito</p>
                  )}
                </CardContent>
              </Card>

              {/* Alerts */}
              {patientAlerts.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs font-medium text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {patientAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          'rounded-md border px-3 py-2 text-xs',
                          alert.severity === 'CRITICAL'
                            ? 'border-red-500/30 bg-red-500/5 text-red-300'
                            : 'border-amber-500/20 bg-amber-500/5 text-amber-300',
                        )}
                      >
                        {alert.message}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* AI Copilot Suggestions */}
              <Card className="animate-slide-in-right stagger-5 border-teal-500/20 bg-teal-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Sugestoes IA
                    {isLoadingCopilot && <Loader2 className="h-3 w-3 animate-spin text-teal-600 dark:text-teal-400" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {copilotSuggestions.length > 0
                    ? copilotSuggestions.map((suggestion, i) => (
                        <div
                          key={i}
                          className={cn(
                            'shimmer-hover rounded-md border px-3 py-2 transition-colors',
                            suggestion.type === 'warning'
                              ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/30'
                              : 'border-teal-500/10 bg-teal-500/5 hover:border-teal-500/25 hover:bg-teal-500/10',
                          )}
                        >
                          <p
                            className={cn(
                              'text-xs italic',
                              suggestion.type === 'warning' ? 'text-red-300/80' : 'text-teal-500 dark:text-teal-300/80',
                            )}
                          >
                            {suggestion.text}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  suggestion.type === 'warning' ? 'bg-red-500/60' : 'bg-teal-500/60',
                                )}
                                style={{ width: `${Math.round(suggestion.confidence * 100)}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                'text-[9px] tabular-nums',
                                suggestion.type === 'warning' ? 'text-red-500/60' : 'text-teal-600 dark:text-teal-500/60',
                              )}
                            >
                              {Math.round(suggestion.confidence * 100)}%
                            </span>
                          </div>
                          {suggestion.source && (
                            <p className="mt-1 text-[9px] text-muted-foreground">{suggestion.source}</p>
                          )}
                        </div>
                      ))
                    : [
                        { text: 'Considerar troponina seriada (6h) para descartar SCA.', confidence: 92 },
                        { text: 'PA elevada — avaliar ajuste de Losartana ou associacao com Anlodipino.', confidence: 87 },
                        { text: 'Glicemia 189 mg/dL — considerar ajuste de Metformina ou adicao de insulina basal.', confidence: 85 },
                        { text: 'Paciente alergica a Penicilina — evitar Amoxicilina e derivados.', confidence: 98 },
                      ].map((suggestion, i) => (
                        <div key={i} className="shimmer-hover rounded-md border border-teal-500/10 bg-teal-500/5 px-3 py-2 transition-colors hover:border-teal-500/25 hover:bg-teal-500/10">
                          <p className="text-xs italic text-teal-500 dark:text-teal-300/80">{suggestion.text}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-teal-500/60"
                                style={{ width: `${suggestion.confidence}%` }}
                              />
                            </div>
                            <span className="text-[9px] tabular-nums text-teal-600 dark:text-teal-500/60">{suggestion.confidence}%</span>
                          </div>
                        </div>
                      ))}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Prescription Modal */}
      <Dialog open={prescriptionModalOpen} onOpenChange={setPrescriptionModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Prescricao Gerada por IA
            </DialogTitle>
            <DialogDescription>
              Revise os itens abaixo antes de confirmar. Edite se necessario.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] space-y-3 overflow-y-auto">
            {parsedPrescriptionItems.map((item, idx) => (
              <Card key={idx} className="border-border bg-card">
                <CardContent className="flex items-start gap-3 py-3">
                  <Pill className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.medicationName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.dose, item.route, item.frequency, item.duration]
                        .filter(Boolean)
                        .join(' — ')}
                    </p>
                    {item.instructions && (
                      <p className="mt-1 text-xs italic text-muted-foreground">{item.instructions}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        item.confidence >= 0.8
                          ? 'bg-green-500/20 text-green-400'
                          : item.confidence >= 0.5
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300"
                      onClick={() => {
                        setParsedPrescriptionItems((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Safety warnings */}
          {isSafetyChecked && safetyWarnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Alertas de Seguranca</span>
              </div>
              {safetyWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs',
                    warning.severity === 'critical' || warning.severity === 'high'
                      ? 'border-red-500/30 bg-red-500/5 text-red-300'
                      : 'border-amber-500/20 bg-amber-500/5 text-amber-300',
                  )}
                >
                  <p className="font-medium">{warning.message}</p>
                  {warning.items.length > 0 && (
                    <p className="mt-1 text-muted-foreground">
                      Envolvidos: {warning.items.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {isSafetyChecked && safetyWarnings.length === 0 && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-green-400">Nenhum alerta de seguranca identificado.</span>
            </div>
          )}

          <DialogFooter className="gap-2">
            {!isSafetyChecked ? (
              <Button
                onClick={handleSafetyCheck}
                disabled={isCheckingSafety || parsedPrescriptionItems.length === 0}
                className="bg-amber-600 hover:bg-amber-500"
              >
                {isCheckingSafety ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldAlert className="mr-2 h-4 w-4" />
                )}
                Verificar Seguranca
              </Button>
            ) : (
              <Button
                onClick={handleSavePrescription}
                className="bg-teal-600 hover:bg-teal-500"
                disabled={parsedPrescriptionItems.length === 0}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar Prescricao
              </Button>
            )}
            <Button variant="outline" onClick={() => setPrescriptionModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
