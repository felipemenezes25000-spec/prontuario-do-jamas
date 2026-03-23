import { useState, useEffect, useCallback, useRef } from 'react';
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
  FileCheck,
  ArrowRightCircle,
  LogOut,
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
import { QuickAntecedents } from '@/components/medical/quick-antecedents';
import { ExamRequestModal } from '@/components/medical/exam-request-modal';
import { usePrescriptions } from '@/services/prescriptions.service';
import { useLatestVitalSigns, useVitalSignsTrends } from '@/services/vital-signs.service';
import { useAlerts } from '@/services/alerts.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { useVoice } from '@/hooks/use-voice';
import { useStreamingSOAP } from '@/hooks/use-streaming-soap';
import { VoiceWaveform } from '@/components/voice/voice-waveform';
import { SignatureBlock, generateSignatureText } from '@/components/medical/signature-block';
import { NEWSBadge } from '@/components/medical/news-badge';
import { NEWSTrendChart } from '@/components/medical/news-trend-chart';
import { useAuthStore } from '@/stores/auth.store';
import type { VoiceIntent } from '@/stores/voice.store';
import api from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────

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

interface ParsedExamItem {
  examName: string;
  examType: string;
  tussCode?: string;
  urgency: string;
  clinicalIndication?: string;
  confidence: number;
}

interface ParsedCertificateData {
  days: number;
  cidCode?: string;
  cidDescription?: string;
  justification: string;
  certificateType: string;
  restrictions?: string;
  confidence: number;
}

interface ParsedVitalsData {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  gcs?: number;
  painScale?: number;
  painLocation?: string;
  weight?: number;
  height?: number;
  glucoseLevel?: number;
  confidence: number;
  summary: string;
}

interface ParsedDischargeData {
  dischargeType: string;
  condition: string;
  followUpDays?: number;
  instructions: string;
  followUpSpecialty?: string;
  warningSignals?: string[];
  homeMedications?: string[];
  restrictions?: string[];
  confidence: number;
}

interface ParsedReferralData {
  specialty: string;
  reason: string;
  urgency: string;
  cidCode?: string;
  clinicalSummary?: string;
  questionsForSpecialist?: string;
  confidence: number;
}

interface CopilotSuggestion {
  type: string;
  text: string;
  confidence: number;
  source: string;
  actionable: boolean;
}

// ── Intent labels for toast notifications ──────────────────

const intentLabels: Record<VoiceIntent, string> = {
  SOAP: 'Nota SOAP',
  PRESCRIPTION: 'Prescricao detectada',
  EXAM_REQUEST: 'Exames solicitados',
  CERTIFICATE: 'Atestado detectado',
  REFERRAL: 'Encaminhamento detectado',
  EVOLUTION: 'Evolucao clinica',
  VITALS: 'Sinais vitais detectados',
  DISCHARGE: 'Alta detectada',
};

const intentIcons: Record<VoiceIntent, string> = {
  SOAP: '📝',
  PRESCRIPTION: '💊',
  EXAM_REQUEST: '🔬',
  CERTIFICATE: '📄',
  REFERRAL: '↗️',
  EVOLUTION: '📋',
  VITALS: '❤️',
  DISCHARGE: '🏠',
};

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
  const { data: vitalsTrends = [] } = useVitalSignsTrends(encounter?.patientId ?? '');
  const { data: alertsData } = useAlerts({ patientId: encounter?.patientId, isActive: true });
  const authUser = useAuthStore((s) => s.user);
  const patientAlerts = alertsData?.data ?? [];
  const { data: patientConditions = [] } = useConditions(encounter?.patientId ?? '');

  // SOAP state
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
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [copilotSuggestions, setCopilotSuggestions] = useState<CopilotSuggestion[]>([]);
  const [isLoadingCopilot, setIsLoadingCopilot] = useState(false);

  // Prescription modal state
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [parsedPrescriptionItems, setParsedPrescriptionItems] = useState<ParsedPrescriptionItem[]>([]);
  const [safetyWarnings, setSafetyWarnings] = useState<SafetyWarning[]>([]);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  const [isSafetyChecked, setIsSafetyChecked] = useState(false);
  const [isParsingPrescription, setIsParsingPrescription] = useState(false);

  // Exam request modal state (BLOCO 4)
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [parsedExamItems, setParsedExamItems] = useState<ParsedExamItem[]>([]);
  const [isParsingExam, setIsParsingExam] = useState(false);

  // Certificate modal state (BLOCO 5)
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [parsedCertificate, setParsedCertificate] = useState<ParsedCertificateData | null>(null);
  const [isParsingCertificate, setIsParsingCertificate] = useState(false);

  // Referral modal state (BLOCO 6)
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [parsedReferral, setParsedReferral] = useState<ParsedReferralData | null>(null);
  const [isParsingReferral, setIsParsingReferral] = useState(false);

  // Vitals modal state (BLOCO 10)
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [parsedVitals, setParsedVitals] = useState<ParsedVitalsData | null>(null);
  const [isParsingVitals, setIsParsingVitals] = useState(false);

  // Manual exam request modal state (BLOCO A10)
  const [manualExamModalOpen, setManualExamModalOpen] = useState(false);

  // Discharge modal state (BLOCO 11)
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [parsedDischarge, setParsedDischarge] = useState<ParsedDischargeData | null>(null);
  const [isParsingDischarge, setIsParsingDischarge] = useState(false);

  // Proactive copilot debounce
  const copilotDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // SOAP streaming — BLOCO 2
  const streaming = useStreamingSOAP({
    onComplete: (fullText) => {
      // Try to parse as JSON and fill SOAP fields
      try {
        const soap = JSON.parse(fullText);
        if (soap.subjective) setSubjective((prev: string) => prev ? `${prev}\n\n${soap.subjective}` : soap.subjective);
        if (soap.objective) setObjective((prev: string) => prev ? `${prev}\n\n${soap.objective}` : soap.objective);
        if (soap.assessment) setAssessment((prev: string) => prev ? `${prev}\n\n${soap.assessment}` : soap.assessment);
        if (soap.plan) setPlan((prev: string) => prev ? `${prev}\n\n${soap.plan}` : soap.plan);
      } catch {
        // If not JSON, append as subjective
        setSubjective((prev: string) => prev ? `${prev}\n\n${fullText}` : fullText);
      }
      // Fetch copilot suggestions after SOAP completes
      void fetchCopilotSuggestions(voice.currentTranscription);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar SOAP: ${error}`);
    },
  });

  // Duration timer
  useEffect(() => {
    if (!encounter) return;
    const tick = () => setElapsed(formatDuration(encounter.startedAt ?? encounter.createdAt));
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [encounter]);

  // Voice intent routing — BLOCO 3
  useEffect(() => {
    if (
      voice.currentTranscription &&
      !voice.isRecording &&
      !voice.isProcessing &&
      voice.intent
    ) {
      const intent = voice.intent;

      // Show toast with detected intent (non-SOAP)
      if (intent !== 'SOAP' && intent !== 'EVOLUTION') {
        toast(
          `${intentIcons[intent]} ${intentLabels[intent]}`,
          {
            description: `"${voice.currentTranscription.slice(0, 80)}${voice.currentTranscription.length > 80 ? '...' : ''}"`,
            duration: 6000,
          },
        );
      }

      switch (intent) {
        case 'PRESCRIPTION':
          void handleParsePrescriptionFromIntent();
          break;
        case 'EXAM_REQUEST':
          void handleParseExamFromIntent();
          break;
        case 'CERTIFICATE':
          void handleParseCertificateFromIntent();
          break;
        case 'REFERRAL':
          void handleParseReferralFromIntent();
          break;
        case 'VITALS':
          void handleParseVitalsFromIntent();
          break;
        case 'DISCHARGE':
          void handleParseDischargeFromIntent();
          break;
        default:
          // SOAP / EVOLUTION — stream SOAP
          void handleStreamSOAP(voice.currentTranscription);
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.currentTranscription, voice.isRecording, voice.isProcessing, voice.intent]);

  // Proactive copilot — BLOCO 7
  const triggerCopilot = useCallback((_field: string, text: string) => {
    if (text.length < 30 || !id) return;
    if (copilotDebounceRef.current) clearTimeout(copilotDebounceRef.current);
    copilotDebounceRef.current = setTimeout(() => {
      void fetchCopilotSuggestions(text);
    }, 3000);
  }, [id]);

  // ── AI Calls ─────────────────────────────────────────────

  const fetchCopilotSuggestions = useCallback(async (transcription: string) => {
    if (!id) return;
    setIsLoadingCopilot(true);
    try {
      const { data } = await api.post<{ suggestions: CopilotSuggestion[] }>(
        '/ai/copilot/suggestions',
        { encounterId: id, transcription },
      );
      setCopilotSuggestions(data.suggestions ?? []);
    } catch {
      // Copilot is non-critical
    } finally {
      setIsLoadingCopilot(false);
    }
  }, [id]);

  const handleStreamSOAP = useCallback(
    async (transcription: string) => {
      if (!transcription || streaming.isStreaming) return;
      await streaming.startStreaming(transcription, id);
    },
    [id, streaming],
  );

  const handleParsePrescriptionFromIntent = async () => {
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
      toast.error('Erro ao processar prescricao');
    } finally {
      setIsParsingPrescription(false);
    }
    // Also generate SOAP in background
    void handleStreamSOAP(voice.currentTranscription);
  };

  const handleParseExamFromIntent = async () => {
    if (!voice.currentTranscription) return;
    setIsParsingExam(true);
    try {
      const { data } = await api.post<{ items: ParsedExamItem[]; suggestedIndication: string }>(
        '/ai/exam/parse-voice',
        { text: voice.currentTranscription, encounterId: id, patientId: encounter?.patientId },
      );
      setParsedExamItems(data.items);
      setExamModalOpen(true);
    } catch {
      toast.error('Erro ao processar solicitacao de exames');
    } finally {
      setIsParsingExam(false);
    }
    void handleStreamSOAP(voice.currentTranscription);
  };

  const handleParseCertificateFromIntent = async () => {
    if (!voice.currentTranscription) return;
    setIsParsingCertificate(true);
    try {
      const { data } = await api.post<ParsedCertificateData>(
        '/ai/certificate/parse-voice',
        { text: voice.currentTranscription, encounterId: id, patientId: encounter?.patientId },
      );
      setParsedCertificate(data);
      setCertificateModalOpen(true);
    } catch {
      toast.error('Erro ao processar atestado');
    } finally {
      setIsParsingCertificate(false);
    }
  };

  const handleParseReferralFromIntent = async () => {
    if (!voice.currentTranscription) return;
    setIsParsingReferral(true);
    try {
      const { data } = await api.post<ParsedReferralData>(
        '/ai/referral/parse-voice',
        { text: voice.currentTranscription, encounterId: id, patientId: encounter?.patientId },
      );
      setParsedReferral(data);
      setReferralModalOpen(true);
    } catch {
      toast.error('Erro ao processar encaminhamento');
    } finally {
      setIsParsingReferral(false);
    }
  };

  const handleParseVitalsFromIntent = async () => {
    if (!voice.currentTranscription) return;
    setIsParsingVitals(true);
    try {
      const { data } = await api.post<ParsedVitalsData>(
        '/ai/vitals/parse-voice',
        { text: voice.currentTranscription, encounterId: id, patientId: encounter?.patientId },
      );
      setParsedVitals(data);
      setVitalsModalOpen(true);
    } catch {
      toast.error('Erro ao processar sinais vitais');
    } finally {
      setIsParsingVitals(false);
    }
  };

  const handleParseDischargeFromIntent = async () => {
    if (!voice.currentTranscription) return;
    setIsParsingDischarge(true);
    try {
      const { data } = await api.post<ParsedDischargeData>(
        '/ai/discharge/parse-voice',
        { text: voice.currentTranscription, encounterId: id, patientId: encounter?.patientId },
      );
      setParsedDischarge(data);
      setDischargeModalOpen(true);
    } catch {
      toast.error('Erro ao processar alta');
    } finally {
      setIsParsingDischarge(false);
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
      toast.error('Erro ao processar prescricao');
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
    setPrescriptionModalOpen(false);
    setParsedPrescriptionItems([]);
    setSafetyWarnings([]);
    setIsSafetyChecked(false);
    toast.success('Prescricao confirmada');
  };

  const handleSaveNote = async () => {
    if (!id) return;
    setIsSavingNote(true);
    try {
      // Generate CFM-standard signature block
      const signatureBlock = authUser
        ? generateSignatureText({
            name: authUser.name,
            crm: authUser.crm,
            crmState: undefined, // CRM state not available in User type yet
            specialty: authUser.specialty,
          })
        : undefined;

      await api.post('/clinical-notes', {
        encounterId: id,
        patientId: encounter?.patientId,
        subjective,
        objective,
        assessment,
        plan,
        signatureBlock,
      });
      toast.success('Nota clinica assinada com sucesso');
    } catch {
      toast.error('Erro ao salvar nota clinica');
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
            {/* NEWS Badge */}
            {latestVitals?.newsScore != null && (
              <NEWSBadge
                score={latestVitals.newsScore}
                classification={latestVitals.newsClassification as 'LOW' | 'MEDIUM' | 'HIGH' | undefined}
                compact
              />
            )}
            {/* Intent badge */}
            {voice.intent && voice.intent !== 'SOAP' && !voice.isRecording && !voice.isProcessing && (
              <Badge variant="outline" className="border-teal-500/30 text-[10px] text-teal-400">
                {intentIcons[voice.intent]} {intentLabels[voice.intent]}
              </Badge>
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
              {/* Radial gradient */}
              <div className={cn(
                'pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px] transition-all duration-500',
                voice.isRecording
                  ? 'h-48 w-48 bg-red-500/15'
                  : 'h-32 w-32 bg-teal-500/10',
              )} />

              {/* Large Voice Button */}
              <button
                onClick={handleVoiceToggle}
                disabled={streaming.isStreaming}
                className={cn(
                  'relative flex h-[72px] w-[72px] items-center justify-center rounded-full transition-all duration-300 cursor-pointer',
                  voice.isRecording
                    ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-voice-pulse-red'
                    : streaming.isStreaming
                      ? 'bg-muted cursor-not-allowed'
                      : 'bg-teal-600 shadow-lg shadow-teal-500/20 hover:bg-teal-500 hover:shadow-teal-500/30 animate-voice-pulse',
                )}
              >
                {voice.isRecording ? (
                  <Square className="h-7 w-7 text-white" />
                ) : streaming.isStreaming ? (
                  <Sparkles className="h-7 w-7 text-white animate-pulse" />
                ) : voice.isProcessing ? (
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
                  'Transcrevendo e classificando intencao...'
                ) : streaming.isStreaming ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400 animate-pulse" />
                    IA escrevendo SOAP em tempo real...
                    <span className="inline-block h-4 w-0.5 animate-pulse bg-teal-500" />
                  </span>
                ) : (
                  'Toque para iniciar gravacao'
                )}
              </p>

              {/* Real waveform when recording */}
              {voice.isRecording && (
                <div className="mt-3 w-full max-w-xs">
                  <VoiceWaveform isActive stream={voice.stream} height={40} />
                </div>
              )}

              {/* Streaming SOAP preview */}
              {streaming.isStreaming && streaming.streamedText && (
                <div className="mt-4 w-full max-w-lg rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 animate-pulse" />
                    <span className="text-xs font-medium text-teal-600 dark:text-teal-400">SOAP sendo gerada...</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {streaming.streamedText.slice(-300)}
                    <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-teal-500" />
                  </p>
                </div>
              )}

              {/* Partial transcription */}
              {(voice.isRecording || voice.isProcessing) && voice.partialTranscription && (
                <div className="mt-4 w-full max-w-lg rounded-lg border border-border bg-card/50 p-4">
                  <p className="text-sm text-muted-foreground italic">
                    {voice.partialTranscription}
                    <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-teal-500" />
                  </p>
                </div>
              )}

              {/* Final transcription result */}
              {!voice.isRecording && !voice.isProcessing && !streaming.isStreaming && voice.currentTranscription && (
                <div className="mt-4 w-full max-w-lg rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                      Transcricao concluida
                      {voice.intent && ` — ${intentLabels[voice.intent]}`}
                    </span>
                    {voice.intentConfidence > 0 && (
                      <Badge variant="outline" className="text-[9px] border-teal-500/30 text-teal-400">
                        {Math.round(voice.intentConfidence * 100)}% confianca
                      </Badge>
                    )}
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

          {/* Quick Antecedents — BLOCO A1 */}
          {encounter.patientId && (
            <QuickAntecedents patientId={encounter.patientId} />
          )}

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
                        {streaming.isStreaming && (
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                            <span className="text-[10px] text-teal-500">IA escrevendo...</span>
                          </div>
                        )}
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
                      onChange={(e) => {
                        section.onChange(e.target.value);
                        triggerCopilot(section.key, e.target.value);
                      }}
                      className="min-h-[100px] resize-y border-border bg-secondary/30 text-sm"
                    />
                  </CardContent>
                </Card>
              ))}

              {/* NEWS Trend Chart (collapsible) */}
              {encounter.patientId && vitalsTrends.length > 0 && (
                <NEWSTrendChart
                  data={vitalsTrends.map((v) => ({
                    id: v.id,
                    recordedAt: v.recordedAt,
                    newsScore: v.newsScore ?? null,
                    newsClassification: v.newsClassification ?? null,
                  }))}
                />
              )}

              {/* Signature Preview */}
              {authUser && (
                <Card className="border-border bg-card">
                  <CardContent className="py-3">
                    <SignatureBlock
                      user={{
                        name: authUser.name,
                        crm: authUser.crm,
                        specialty: authUser.specialty,
                      }}
                    />
                  </CardContent>
                </Card>
              )}

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
                    {(presc.items ?? []).map((item) => (
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-border text-xs"
                  onClick={() => {
                    if (!voice.isRecording) voice.startRecording();
                  }}
                >
                  <Mic className="mr-2 h-3.5 w-3.5" />
                  Solicitar por Voz
                </Button>
                <Button
                  variant="outline"
                  className="border-border text-xs"
                  onClick={() => setManualExamModalOpen(true)}
                >
                  <TestTube className="mr-2 h-3.5 w-3.5" />
                  Solicitar Exame
                </Button>
              </div>

              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-10">
                  <TestTube className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Solicite exames por voz ou manualmente</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documentos Tab */}
            <TabsContent value="documentos" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button variant="outline" className="border-border text-xs">
                  <FileCheck className="mr-2 h-3.5 w-3.5" />
                  Atestado
                </Button>
                <Button variant="outline" className="border-border text-xs">
                  <ArrowRightCircle className="mr-2 h-3.5 w-3.5" />
                  Encaminhamento
                </Button>
                <Button variant="outline" className="border-border text-xs">
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  Laudo
                </Button>
              </div>

              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-10">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum documento gerado ainda</p>
                  <p className="mt-1 text-xs text-muted-foreground">Dite por voz: "atestado de 3 dias" ou "encaminhar para cardiologia"</p>
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
                        { label: 'PA', value: `${latestVitals.systolicBP}/${latestVitals.diastolicBP}`, unit: 'mmHg', icon: Gauge, alert: latestVitals.systolicBP && latestVitals.systolicBP > 140 },
                        { label: 'FC', value: latestVitals.heartRate, unit: 'bpm', icon: Heart, alert: latestVitals.heartRate && (latestVitals.heartRate > 100 || latestVitals.heartRate < 60) },
                        { label: 'FR', value: latestVitals.respiratoryRate, unit: 'irpm', icon: Wind, alert: latestVitals.respiratoryRate && latestVitals.respiratoryRate > 20 },
                        { label: 'Temp', value: latestVitals.temperature ? `${latestVitals.temperature}°` : '-', unit: 'C', icon: Thermometer, alert: latestVitals.temperature && latestVitals.temperature > 37.5 },
                        { label: 'SpO2', value: latestVitals.oxygenSaturation ? `${latestVitals.oxygenSaturation}%` : '-', unit: '', icon: Droplets, alert: latestVitals.oxygenSaturation && latestVitals.oxygenSaturation < 95 },
                        { label: 'Dor', value: latestVitals.painScale !== undefined ? `${latestVitals.painScale}/10` : '-', unit: '', icon: Activity, alert: latestVitals.painScale !== undefined && latestVitals.painScale >= 7 },
                      ].map((vital) => (
                        <div
                          key={vital.label}
                          className={cn(
                            'rounded-lg border p-2 text-center',
                            vital.alert ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-secondary/30',
                          )}
                        >
                          <vital.icon className={cn('mx-auto h-3.5 w-3.5', vital.alert ? 'text-red-400' : 'text-muted-foreground')} />
                          <p className={cn('mt-1 text-sm font-bold', vital.alert ? 'text-red-400' : '')}>{vital.value}</p>
                          <p className="text-[10px] text-muted-foreground">{vital.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Allergies */}
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
                      {patientPrescriptions.flatMap((p) => p.items ?? []).map((item) => (
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

              {/* AI Copilot Suggestions — BLOCO 7 */}
              <Card className="animate-slide-in-right stagger-5 border-teal-500/20 bg-teal-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    Copilot
                    {isLoadingCopilot && <Loader2 className="h-3 w-3 animate-spin text-teal-600 dark:text-teal-400" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {copilotSuggestions.length > 0
                    ? copilotSuggestions.map((suggestion, i) => (
                        <div
                          key={i}
                          className={cn(
                            'shimmer-hover rounded-md border px-3 py-2 transition-colors cursor-pointer',
                            suggestion.type === 'warning'
                              ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/30'
                              : 'border-teal-500/10 bg-teal-500/5 hover:border-teal-500/25 hover:bg-teal-500/10',
                          )}
                          onClick={() => {
                            // Insert suggestion into the active SOAP field
                            if (suggestion.actionable) {
                              setPlan((prev: string) => prev ? `${prev}\n• ${suggestion.text}` : `• ${suggestion.text}`);
                              toast.success('Sugestao aplicada ao Plano');
                            }
                          }}
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
                          {suggestion.actionable && (
                            <p className="mt-1 text-[9px] text-muted-foreground">Clique para aplicar ao Plano</p>
                          )}
                        </div>
                      ))
                    : (
                      <p className="text-xs text-muted-foreground italic">
                        {streaming.isStreaming || voice.isRecording
                          ? 'Sugestoes aparecerao apos a nota SOAP...'
                          : 'Grave ou edite o SOAP — sugestoes aparecerao automaticamente.'}
                      </p>
                    )}
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

          <div className="max-h-[450px] space-y-3 overflow-y-auto">
            {parsedPrescriptionItems.map((item, idx) => (
              <Card key={idx} className={cn(
                'border-l-4 border-border bg-card',
                item.confidence < 0.5 ? 'border-l-red-500' : item.confidence < 0.8 ? 'border-l-amber-500' : 'border-l-teal-500',
              )}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                      <input
                        className="bg-transparent text-sm font-semibold text-foreground outline-none border-b border-transparent hover:border-border focus:border-teal-500 transition-colors w-full"
                        value={item.medicationName}
                        onChange={(e) => {
                          setParsedPrescriptionItems((prev) =>
                            prev.map((it, i) => i === idx ? { ...it, medicationName: e.target.value } : it)
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
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
                        onClick={() => setParsedPrescriptionItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Dose</label>
                      <input
                        className="block w-full bg-transparent text-xs outline-none border-b border-border/50 hover:border-border focus:border-teal-500 py-0.5"
                        value={item.dose ?? ''}
                        placeholder="Ex: 500mg"
                        onChange={(e) => setParsedPrescriptionItems((prev) =>
                          prev.map((it, i) => i === idx ? { ...it, dose: e.target.value } : it)
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Via</label>
                      <input
                        className="block w-full bg-transparent text-xs outline-none border-b border-border/50 hover:border-border focus:border-teal-500 py-0.5"
                        value={item.route ?? ''}
                        placeholder="Ex: VO"
                        onChange={(e) => setParsedPrescriptionItems((prev) =>
                          prev.map((it, i) => i === idx ? { ...it, route: e.target.value } : it)
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Frequencia</label>
                      <input
                        className="block w-full bg-transparent text-xs outline-none border-b border-border/50 hover:border-border focus:border-teal-500 py-0.5"
                        value={item.frequency ?? ''}
                        placeholder="Ex: 8/8h"
                        onChange={(e) => setParsedPrescriptionItems((prev) =>
                          prev.map((it, i) => i === idx ? { ...it, frequency: e.target.value } : it)
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Duracao</label>
                      <input
                        className="block w-full bg-transparent text-xs outline-none border-b border-border/50 hover:border-border focus:border-teal-500 py-0.5"
                        value={item.duration ?? ''}
                        placeholder="Ex: 7 dias"
                        onChange={(e) => setParsedPrescriptionItems((prev) =>
                          prev.map((it, i) => i === idx ? { ...it, duration: e.target.value } : it)
                        )}
                      />
                    </div>
                  </div>
                  {item.instructions && (
                    <div className="pl-6">
                      <label className="text-[10px] text-muted-foreground">Instrucoes</label>
                      <input
                        className="block w-full bg-transparent text-xs italic outline-none border-b border-border/50 hover:border-border focus:border-teal-500 py-0.5"
                        value={item.instructions}
                        onChange={(e) => setParsedPrescriptionItems((prev) =>
                          prev.map((it, i) => i === idx ? { ...it, instructions: e.target.value } : it)
                        )}
                      />
                    </div>
                  )}
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
                  {(warning.items ?? []).length > 0 && (
                    <p className="mt-1 text-muted-foreground">
                      Envolvidos: {(warning.items ?? []).join(', ')}
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
      {/* Exam Request Modal (BLOCO 4) */}
      <Dialog open={examModalOpen} onOpenChange={setExamModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-blue-400" />
              Solicitacao de Exames por IA
            </DialogTitle>
            <DialogDescription>
              Revise os exames detectados antes de confirmar a solicitacao.
            </DialogDescription>
          </DialogHeader>

          {isParsingExam ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <span className="ml-3 text-sm text-muted-foreground">Processando exames...</span>
            </div>
          ) : (
            <div className="max-h-[400px] space-y-3 overflow-y-auto">
              {parsedExamItems.map((item, idx) => (
                <Card key={idx} className="border-border bg-card">
                  <CardContent className="flex items-start gap-3 py-3">
                    <TestTube className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.examName}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">{item.examType}</Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            item.urgency === 'EMERGENCIA'
                              ? 'bg-red-500/20 text-red-400'
                              : item.urgency === 'URGENTE'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-green-500/20 text-green-400',
                          )}
                        >
                          {item.urgency}
                        </Badge>
                        {item.tussCode && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            TUSS {item.tussCode}
                          </Badge>
                        )}
                      </div>
                      {item.clinicalIndication && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.clinicalIndication}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px]',
                          item.confidence >= 0.8
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400',
                        )}
                      >
                        {Math.round(item.confidence * 100)}%
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={() => setParsedExamItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {parsedExamItems.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum exame identificado na transcricao.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-500"
              disabled={parsedExamItems.length === 0}
              onClick={() => {
                toast.success(`${parsedExamItems.length} exame(s) solicitado(s)`);
                setExamModalOpen(false);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirmar Solicitacao
            </Button>
            <Button variant="outline" onClick={() => setExamModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Modal (BLOCO 5) */}
      <Dialog open={certificateModalOpen} onOpenChange={setCertificateModalOpen}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Atestado Medico por IA
            </DialogTitle>
            <DialogDescription>
              Revise o atestado gerado antes de emitir.
            </DialogDescription>
          </DialogHeader>

          {isParsingCertificate ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              <span className="ml-3 text-sm text-muted-foreground">Processando atestado...</span>
            </div>
          ) : parsedCertificate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <p className="text-sm font-medium">{parsedCertificate.certificateType}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Dias</span>
                  <p className="text-sm font-medium">{parsedCertificate.days} dia(s)</p>
                </div>
                {parsedCertificate.cidCode && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">CID-10</span>
                    <p className="text-sm font-medium">
                      {parsedCertificate.cidCode} — {parsedCertificate.cidDescription}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Justificativa</span>
                <p className="mt-1 text-sm leading-relaxed rounded-md border border-border bg-muted/30 p-3">
                  {parsedCertificate.justification}
                </p>
              </div>
              {parsedCertificate.restrictions && (
                <div>
                  <span className="text-xs text-muted-foreground">Restricoes</span>
                  <p className="mt-1 text-sm text-amber-400">{parsedCertificate.restrictions}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px]',
                    parsedCertificate.confidence >= 0.8
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400',
                  )}
                >
                  Confianca: {Math.round(parsedCertificate.confidence * 100)}%
                </Badge>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nao foi possivel gerar o atestado.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              className="bg-purple-600 hover:bg-purple-500"
              disabled={!parsedCertificate}
              onClick={() => {
                toast.success('Atestado emitido com sucesso');
                setCertificateModalOpen(false);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Emitir Atestado
            </Button>
            <Button variant="outline" onClick={() => setCertificateModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referral Modal (BLOCO 6) */}
      <Dialog open={referralModalOpen} onOpenChange={setReferralModalOpen}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-orange-400" />
              Encaminhamento por IA
            </DialogTitle>
            <DialogDescription>
              Revise o encaminhamento gerado antes de emitir.
            </DialogDescription>
          </DialogHeader>

          {isParsingReferral ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
              <span className="ml-3 text-sm text-muted-foreground">Processando encaminhamento...</span>
            </div>
          ) : parsedReferral ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Especialidade</span>
                  <p className="text-sm font-medium">{parsedReferral.specialty}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Urgencia</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs',
                      parsedReferral.urgency === 'URGENTE'
                        ? 'bg-red-500/20 text-red-400'
                        : parsedReferral.urgency === 'PRIORITARIO'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-green-500/20 text-green-400',
                    )}
                  >
                    {parsedReferral.urgency}
                  </Badge>
                </div>
                {parsedReferral.cidCode && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">CID-10</span>
                    <p className="text-sm font-medium">{parsedReferral.cidCode}</p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Motivo</span>
                <p className="mt-1 text-sm leading-relaxed rounded-md border border-border bg-muted/30 p-3">
                  {parsedReferral.reason}
                </p>
              </div>
              {parsedReferral.clinicalSummary && (
                <div>
                  <span className="text-xs text-muted-foreground">Resumo Clinico</span>
                  <p className="mt-1 text-sm leading-relaxed">{parsedReferral.clinicalSummary}</p>
                </div>
              )}
              {parsedReferral.questionsForSpecialist && (
                <div>
                  <span className="text-xs text-muted-foreground">Perguntas para o Especialista</span>
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {parsedReferral.questionsForSpecialist}
                  </p>
                </div>
              )}
              <div className="flex justify-end">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px]',
                    parsedReferral.confidence >= 0.8
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400',
                  )}
                >
                  Confianca: {Math.round(parsedReferral.confidence * 100)}%
                </Badge>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nao foi possivel gerar o encaminhamento.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              className="bg-orange-600 hover:bg-orange-500"
              disabled={!parsedReferral}
              onClick={() => {
                toast.success(`Encaminhamento para ${parsedReferral?.specialty} emitido`);
                setReferralModalOpen(false);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Emitir Encaminhamento
            </Button>
            <Button variant="outline" onClick={() => setReferralModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Vitals Modal (BLOCO 10) */}
      <Dialog open={vitalsModalOpen} onOpenChange={setVitalsModalOpen}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-400" />
              Sinais Vitais por IA
            </DialogTitle>
            <DialogDescription>
              Sinais vitais extraidos da transcricao. Confirme para registrar.
            </DialogDescription>
          </DialogHeader>

          {isParsingVitals ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-red-400" />
              <span className="ml-3 text-sm text-muted-foreground">Processando sinais vitais...</span>
            </div>
          ) : parsedVitals ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">{parsedVitals.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {parsedVitals.systolicBP != null && parsedVitals.diastolicBP != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Gauge className="h-4 w-4 text-blue-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">PA</span>
                      <p className="text-sm font-medium">{parsedVitals.systolicBP}x{parsedVitals.diastolicBP} mmHg</p>
                    </div>
                  </div>
                )}
                {parsedVitals.heartRate != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Heart className="h-4 w-4 text-red-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">FC</span>
                      <p className="text-sm font-medium">{parsedVitals.heartRate} bpm</p>
                    </div>
                  </div>
                )}
                {parsedVitals.respiratoryRate != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Wind className="h-4 w-4 text-cyan-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">FR</span>
                      <p className="text-sm font-medium">{parsedVitals.respiratoryRate} irpm</p>
                    </div>
                  </div>
                )}
                {parsedVitals.temperature != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Thermometer className="h-4 w-4 text-orange-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Temp</span>
                      <p className="text-sm font-medium">{parsedVitals.temperature} °C</p>
                    </div>
                  </div>
                )}
                {parsedVitals.oxygenSaturation != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Droplets className="h-4 w-4 text-teal-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">SpO2</span>
                      <p className="text-sm font-medium">{parsedVitals.oxygenSaturation}%</p>
                    </div>
                  </div>
                )}
                {parsedVitals.glucoseLevel != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Glicemia</span>
                      <p className="text-sm font-medium">{parsedVitals.glucoseLevel} mg/dL</p>
                    </div>
                  </div>
                )}
                {parsedVitals.painScale != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Dor (EVA)</span>
                      <p className="text-sm font-medium">{parsedVitals.painScale}/10{parsedVitals.painLocation ? ` — ${parsedVitals.painLocation}` : ''}</p>
                    </div>
                  </div>
                )}
                {parsedVitals.gcs != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Stethoscope className="h-4 w-4 text-indigo-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Glasgow</span>
                      <p className="text-sm font-medium">{parsedVitals.gcs}/15</p>
                    </div>
                  </div>
                )}
                {parsedVitals.weight != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Gauge className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Peso</span>
                      <p className="text-sm font-medium">{parsedVitals.weight} kg</p>
                    </div>
                  </div>
                )}
                {parsedVitals.height != null && (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Gauge className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Altura</span>
                      <p className="text-sm font-medium">{parsedVitals.height} cm</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px]',
                    parsedVitals.confidence >= 0.8
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400',
                  )}
                >
                  Confianca: {Math.round(parsedVitals.confidence * 100)}%
                </Badge>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum sinal vital identificado.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              className="bg-red-600 hover:bg-red-500"
              disabled={!parsedVitals}
              onClick={() => {
                toast.success('Sinais vitais registrados com sucesso');
                setVitalsModalOpen(false);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Registrar Sinais Vitais
            </Button>
            <Button variant="outline" onClick={() => setVitalsModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discharge Modal (BLOCO 11) */}
      <Dialog open={dischargeModalOpen} onOpenChange={setDischargeModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-emerald-400" />
              Alta Hospitalar por IA
            </DialogTitle>
            <DialogDescription>
              Revise as informacoes de alta antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {isParsingDischarge ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <span className="ml-3 text-sm text-muted-foreground">Processando alta...</span>
            </div>
          ) : parsedDischarge ? (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-4 pr-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Tipo de Alta</span>
                    <p className="text-sm font-medium">{parsedDischarge.dischargeType}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Condicao</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        parsedDischarge.condition === 'ESTAVEL'
                          ? 'bg-green-500/20 text-green-400'
                          : parsedDischarge.condition === 'INSTAVEL'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {parsedDischarge.condition}
                    </Badge>
                  </div>
                  {parsedDischarge.followUpDays != null && (
                    <div>
                      <span className="text-xs text-muted-foreground">Retorno</span>
                      <p className="text-sm font-medium">
                        {parsedDischarge.followUpDays} dia(s)
                        {parsedDischarge.followUpSpecialty ? ` — ${parsedDischarge.followUpSpecialty}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Orientacoes ao Paciente</span>
                  <p className="mt-1 text-sm leading-relaxed whitespace-pre-line rounded-md border border-border bg-muted/30 p-3">
                    {parsedDischarge.instructions}
                  </p>
                </div>

                {parsedDischarge.homeMedications && parsedDischarge.homeMedications.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Medicacoes Domiciliares</span>
                    <ul className="mt-1 space-y-1">
                      {parsedDischarge.homeMedications.map((med, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Pill className="h-3 w-3 text-teal-400" />
                          {med}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedDischarge.warningSignals && parsedDischarge.warningSignals.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      Sinais de Alerta
                    </span>
                    <ul className="mt-1 space-y-1">
                      {parsedDischarge.warningSignals.map((signal, i) => (
                        <li key={i} className="text-sm text-amber-300">• {signal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedDischarge.restrictions && parsedDischarge.restrictions.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Restricoes</span>
                    <ul className="mt-1 space-y-1">
                      {parsedDischarge.restrictions.map((r, i) => (
                        <li key={i} className="text-sm text-red-300">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px]',
                      parsedDischarge.confidence >= 0.8
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400',
                    )}
                  >
                    Confianca: {Math.round(parsedDischarge.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nao foi possivel processar a alta.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={!parsedDischarge}
              onClick={() => {
                toast.success('Alta hospitalar processada com sucesso');
                setDischargeModalOpen(false);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirmar Alta
            </Button>
            <Button variant="outline" onClick={() => setDischargeModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Exam Request Modal (BLOCO A10) */}
      {encounter.patientId && id && (
        <ExamRequestModal
          open={manualExamModalOpen}
          onOpenChange={setManualExamModalOpen}
          encounterId={id}
          patientId={encounter.patientId}
        />
      )}
    </div>
  );
}
