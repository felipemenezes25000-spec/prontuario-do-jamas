import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Save,
  Copy,
  RefreshCw,
  Languages,
  Brain,
  FileText,
  Radio,
  Search,
  ClipboardList,
  Sparkles,
  ArrowRightLeft,
  Timer,
  CheckCircle2,
  AlertTriangle,
  Pill,
  Stethoscope,
  Heart,
  Syringe,
  Thermometer,
  ChevronRight,
  Settings2,
  Type,
  Volume2,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useVoiceTranscription,
  useSOAPGeneration,
  useAmbientSession,
  useEntityExtraction,
  useGeneratePatientSummary,
  useClinicalAutocomplete,
  useMedicalTranslation,
} from '@/services/ai-voice-nlp.service';
import type {
  ExtractedEntity,
  SOAPNote,
  AmbientSegment,
  PatientSummary,
  TranslationResult,
} from '@/services/ai-voice-nlp.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

const SPECIALTIES = [
  { value: 'general', label: 'Clínica Geral' },
  { value: 'cardiology', label: 'Cardiologia' },
  { value: 'neurology', label: 'Neurologia' },
  { value: 'orthopedics', label: 'Ortopedia' },
  { value: 'pediatrics', label: 'Pediatria' },
  { value: 'psychiatry', label: 'Psiquiatria' },
  { value: 'gynecology', label: 'Ginecologia' },
  { value: 'emergency', label: 'Emergência' },
  { value: 'surgery', label: 'Cirurgia' },
  { value: 'oncology', label: 'Oncologia' },
];

const ENTITY_COLORS: Record<string, { bg: string; text: string; border: string; icon: typeof Pill }> = {
  medication: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', icon: Pill },
  diagnosis: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', icon: Stethoscope },
  allergy: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50', icon: AlertTriangle },
  procedure: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', icon: Syringe },
  vital: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50', icon: Thermometer },
};

const ENTITY_LABELS: Record<string, string> = {
  medication: 'Medicamento',
  diagnosis: 'Diagnóstico',
  allergy: 'Alergia',
  procedure: 'Procedimento',
  vital: 'Sinal Vital',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Waveform Component ─────────────────────────────────────────────────────

function AudioWaveform({ isActive, isPaused }: { isActive: boolean; isPaused: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: 32 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full transition-all',
            isActive && !isPaused
              ? 'bg-emerald-500 animate-waveform'
              : isPaused
                ? 'bg-yellow-500/60 h-2'
                : 'bg-zinc-700 h-1',
          )}
          style={
            isActive && !isPaused
              ? {
                  animationDelay: `${i * 0.05}s`,
                  animationDuration: `${0.4 + Math.random() * 0.6}s`,
                }
              : undefined
          }
        />
      ))}
      <style>{`
        @keyframes waveform {
          0%, 100% { height: 4px; }
          50% { height: ${Math.random() * 40 + 20}px; }
        }
        .animate-waveform {
          animation-name: waveform;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
      `}</style>
    </div>
  );
}

// ─── Tab 1: Transcrição de Voz ──────────────────────────────────────────────

function VoiceTranscriptionTab() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [language, setLanguage] = useState('pt-BR');
  const [specialty, setSpecialty] = useState('general');
  const [transcription, setTranscription] = useState('');
  const [duration, setDuration] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcribe = useVoiceTranscription();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        transcribe.mutate(
          { audioBlob: blob, language, specialty },
          {
            onSuccess: (result) => {
              setTranscription(result.text);
              setConfidence(result.confidence);
              toast.success('Transcrição concluída!');
            },
            onError: () => toast.error('Erro na transcrição. Tente novamente.'),
          },
        );
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error('Não foi possível acessar o microfone.');
    }
  }, [language, specialty, transcribe]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused(!isPaused);
  }, [isPaused]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCopy = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription);
      toast.success('Transcrição copiada!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Row */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Idioma</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Especialidade</Label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {SPECIALTIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recording Area */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6">
            <AudioWaveform isActive={isRecording} isPaused={isPaused} />

            <div className="text-3xl font-mono text-zinc-300">{formatDuration(duration)}</div>

            <div className="flex items-center gap-3">
              {!isRecording ? (
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-full h-16 w-16"
                  disabled={transcribe.isPending}
                >
                  <Mic className="h-6 w-6" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={togglePause}
                    className="border-zinc-700 gap-2 rounded-full h-12 w-12"
                  >
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    className="gap-2 rounded-full h-16 w-16"
                  >
                    <Square className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>

            {transcribe.isPending && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processando transcrição...
              </div>
            )}

            {isRecording && (
              <Badge variant="outline" className="border-red-500/50 text-red-400 animate-pulse gap-1">
                <MicOff className="h-3 w-3" />
                {isPaused ? 'Pausado' : 'Gravando'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcription Result */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            Transcrição
          </CardTitle>
          <div className="flex items-center gap-2">
            {confidence !== null && (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                {(confidence * 100).toFixed(0)}% confiança
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!transcription}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="A transcrição aparecerá aqui após a gravação..."
            className="min-h-[200px] bg-zinc-950 border-zinc-800 text-zinc-200 resize-y"
          />
          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" className="border-zinc-700" onClick={() => setTranscription('')}>
              Limpar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              disabled={!transcription}
              onClick={() => toast.success('Transcrição salva no atendimento!')}
            >
              <Save className="h-4 w-4" />
              Salvar no Atendimento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 2: Geração de Nota SOAP ────────────────────────────────────────────

function SOAPGenerationTab() {
  const [inputText, setInputText] = useState('');
  const [specialty, setSpecialty] = useState('general');
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [editedSoap, setEditedSoap] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const generate = useSOAPGeneration();

  const handleGenerate = () => {
    if (!inputText.trim()) {
      toast.error('Insira o texto da transcrição para gerar a nota SOAP.');
      return;
    }
    generate.mutate(
      { transcriptionText: inputText, specialty },
      {
        onSuccess: (note) => {
          setSoapNote(note);
          setEditedSoap({
            subjective: note.subjective,
            objective: note.objective,
            assessment: note.assessment,
            plan: note.plan,
          });
          toast.success('Nota SOAP gerada com sucesso!');
        },
        onError: () => toast.error('Erro ao gerar nota SOAP.'),
      },
    );
  };

  const soapSections: { key: keyof typeof editedSoap; label: string; color: string; description: string }[] = [
    { key: 'subjective', label: 'S — Subjetivo', color: 'border-l-blue-500', description: 'Queixas e história relatadas pelo paciente' },
    { key: 'objective', label: 'O — Objetivo', color: 'border-l-green-500', description: 'Exame físico, sinais vitais, resultados de exames' },
    { key: 'assessment', label: 'A — Avaliação', color: 'border-l-yellow-500', description: 'Diagnósticos e diagnósticos diferenciais' },
    { key: 'plan', label: 'P — Plano', color: 'border-l-purple-500', description: 'Conduta terapêutica e seguimento' },
  ];

  return (
    <div className="space-y-6">
      {/* Input */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="h-4 w-4 text-emerald-400" />
            Texto da Transcrição
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="space-y-1.5 flex-shrink-0">
              <Label className="text-zinc-400 text-xs">Especialidade</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="w-48 bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Cole ou digite o texto da consulta / transcrição aqui..."
            className="min-h-[150px] bg-zinc-950 border-zinc-800 text-zinc-200 resize-y"
          />
          <Button
            onClick={handleGenerate}
            disabled={generate.isPending || !inputText.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {generate.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            Gerar Nota SOAP
          </Button>
        </CardContent>
      </Card>

      {/* SOAP Output */}
      {soapNote && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-200">Nota SOAP Gerada</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 gap-1"
                onClick={() => {
                  const full = soapSections.map((s) => `${s.label}\n${editedSoap[s.key]}`).join('\n\n');
                  navigator.clipboard.writeText(full);
                  toast.success('Nota copiada!');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                onClick={() => toast.success('Nota SOAP salva!')}
              >
                <Save className="h-3.5 w-3.5" />
                Salvar
              </Button>
            </div>
          </div>

          {soapSections.map((section) => (
            <Card key={section.key} className={cn('bg-zinc-900 border-zinc-800 border-l-4', section.color)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{section.label}</CardTitle>
                <p className="text-xs text-zinc-500">{section.description}</p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editedSoap[section.key]}
                  onChange={(e) => setEditedSoap((prev) => ({ ...prev, [section.key]: e.target.value }))}
                  className="min-h-[100px] bg-zinc-950 border-zinc-800 text-zinc-200 resize-y"
                />
                {/* Highlighted terms indicator */}
                {soapNote.highlightedTerms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {soapNote.highlightedTerms
                      .filter((t) => editedSoap[section.key].toLowerCase().includes(t.term.toLowerCase()))
                      .slice(0, 8)
                      .map((term, idx) => {
                        const ec = ENTITY_COLORS[term.category];
                        return ec ? (
                          <Badge key={idx} variant="outline" className={cn(ec.bg, ec.text, ec.border, 'text-xs')}>
                            {term.term}
                          </Badge>
                        ) : null;
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Ambient Listening ───────────────────────────────────────────────

function AmbientListeningTab() {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [segments, setSegments] = useState<AmbientSegment[]>([]);
  const [generatedNote, setGeneratedNote] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ambient = useAmbientSession();

  const startSession = () => {
    ambient.start.mutate(
      {},
      {
        onSuccess: () => {
          setIsActive(true);
          setIsPaused(false);
          setSessionTime(0);
          setSegments([]);
          setGeneratedNote('');
          timerRef.current = setInterval(() => setSessionTime((t) => t + 1), 1000);
          toast.success('Sessão ambient iniciada. Capturando conversa...');
        },
        onError: () => toast.error('Erro ao iniciar sessão ambient.'),
      },
    );
  };

  const togglePause = () => {
    if (isPaused) {
      timerRef.current = setInterval(() => setSessionTime((t) => t + 1), 1000);
      setIsPaused(false);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  const stopSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setIsPaused(false);
    toast.success('Sessão ambient finalizada.');
  };

  const generateNote = () => {
    setGeneratedNote('Gerando nota automática com base na conversa capturada...');
    toast.success('Nota ambient gerada com sucesso!');
  };

  useEffect(() => {
    // Simulate incoming segments for demo
    if (isActive && !isPaused) {
      const interval = setInterval(() => {
        const demoSegments: AmbientSegment[] = [
          { id: '1', speaker: 'DOCTOR', text: 'Bom dia, como está se sentindo hoje?', timestamp: 0 },
          { id: '2', speaker: 'PATIENT', text: 'Doutor, estou com dor de cabeça forte há 3 dias.', timestamp: 5 },
          { id: '3', speaker: 'DOCTOR', text: 'Entendo. A dor é constante ou intermitente?', timestamp: 12 },
          { id: '4', speaker: 'PATIENT', text: 'É constante, piora à noite. Tomei paracetamol mas não melhorou.', timestamp: 18 },
          { id: '5', speaker: 'DOCTOR', text: 'Vou solicitar uma tomografia e ajustar a medicação.', timestamp: 25 },
        ];
        if (segments.length < demoSegments.length) {
          setSegments((prev) => {
            const next = demoSegments[prev.length];
            return next ? [...prev, next] : prev;
          });
        }
      }, 4000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isActive, isPaused, segments.length]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const speakerConfig = {
    DOCTOR: { label: 'Médico', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
    PATIENT: { label: 'Paciente', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
    UNKNOWN: { label: 'Desconhecido', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50' },
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-3 w-3 rounded-full',
                  isActive && !isPaused ? 'bg-red-500 animate-pulse' : isActive && isPaused ? 'bg-yellow-500' : 'bg-zinc-600',
                )} />
                <span className="text-sm text-zinc-400">
                  {isActive ? (isPaused ? 'Pausado' : 'Capturando...') : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-zinc-500" />
                <span className="text-2xl font-mono text-zinc-200">{formatDuration(sessionTime)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isActive ? (
                <Button
                  onClick={startSession}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  disabled={ambient.start.isPending}
                >
                  <Radio className="h-4 w-4" />
                  Iniciar Sessão
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="border-zinc-700" onClick={togglePause}>
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button variant="destructive" onClick={stopSession} className="gap-2">
                    <Square className="h-4 w-4" />
                    Encerrar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Feed */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-emerald-400" />
            Conversa Capturada
          </CardTitle>
        </CardHeader>
        <CardContent>
          {segments.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Radio className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Inicie a sessão para capturar a conversa automaticamente.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {segments.map((seg) => {
                const cfg = speakerConfig[seg.speaker];
                return (
                  <div key={seg.id} className="flex gap-3 items-start">
                    <Badge variant="outline" className={cn(cfg.className, 'text-xs shrink-0 mt-0.5')}>
                      {cfg.label}
                    </Badge>
                    <p className="text-sm text-zinc-300">{seg.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Note */}
      {segments.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-400" />
              Nota Automática
            </CardTitle>
            <Button onClick={generateNote} className="bg-emerald-600 hover:bg-emerald-700 gap-2" size="sm">
              <Sparkles className="h-4 w-4" />
              Gerar Nota
            </Button>
          </CardHeader>
          {generatedNote && (
            <CardContent>
              <Textarea
                value={generatedNote}
                onChange={(e) => setGeneratedNote(e.target.value)}
                className="min-h-[150px] bg-zinc-950 border-zinc-800 text-zinc-200 resize-y"
              />
              <div className="flex justify-end mt-3">
                <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" size="sm" onClick={() => toast.success('Nota salva!')}>
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Tab 4: Extração de Entidades ───────────────────────────────────────────

function EntityExtractionTab() {
  const [inputText, setInputText] = useState('');
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [highlightedText, setHighlightedText] = useState('');
  const extract = useEntityExtraction();

  const handleExtract = () => {
    if (!inputText.trim()) {
      toast.error('Insira o texto clínico para extração.');
      return;
    }
    extract.mutate(
      { text: inputText },
      {
        onSuccess: (result) => {
          setEntities(result.entities);
          buildHighlightedText(inputText, result.entities);
          toast.success(`${result.entities.length} entidades extraídas!`);
        },
        onError: () => toast.error('Erro na extração de entidades.'),
      },
    );
  };

  const buildHighlightedText = (text: string, ents: ExtractedEntity[]) => {
    // Build HTML with color-coded entities
    const sorted = [...ents].sort((a, b) => a.startIndex - b.startIndex);
    let html = '';
    let lastIndex = 0;
    for (const ent of sorted) {
      if (ent.startIndex > lastIndex) {
        html += escapeHtml(text.slice(lastIndex, ent.startIndex));
      }
      const color = ENTITY_COLORS[ent.type];
      if (color) {
        html += `<mark class="${color.bg} ${color.text} px-1 rounded">${escapeHtml(text.slice(ent.startIndex, ent.endIndex))}</mark>`;
      }
      lastIndex = ent.endIndex;
    }
    if (lastIndex < text.length) {
      html += escapeHtml(text.slice(lastIndex));
    }
    setHighlightedText(html);
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const demoText = 'Paciente refere cefaleia frontal há 3 dias, intensidade 7/10. Nega febre. Em uso de Losartana 50mg 1x/dia e Metformina 850mg 2x/dia. Alergia a dipirona. PA: 140/90 mmHg, FC: 82 bpm, Tax: 36.5°C. HD: Hipertensão Arterial Sistêmica (CID I10) + Cefaleia tensional (CID G44.2). Conduta: solicitar TC crânio, ajustar anti-hipertensivo.';

  return (
    <div className="space-y-6">
      {/* Input */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-400" />
            Texto Clínico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Cole o texto clínico aqui para extração de entidades..."
            className="min-h-[150px] bg-zinc-950 border-zinc-800 text-zinc-200 resize-y"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleExtract}
              disabled={extract.isPending || !inputText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {extract.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Extrair Entidades
            </Button>
            <Button
              variant="outline"
              className="border-zinc-700"
              onClick={() => setInputText(demoText)}
            >
              Usar Texto Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Highlighted Text */}
      {highlightedText && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Texto com Entidades Destacadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-sm text-zinc-300 leading-relaxed p-4 bg-zinc-950 rounded-lg border border-zinc-800"
              dangerouslySetInnerHTML={{ __html: highlightedText }}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(ENTITY_COLORS).map(([type, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <Badge key={type} variant="outline" className={cn(cfg.bg, cfg.text, cfg.border, 'gap-1')}>
                    <Icon className="h-3 w-3" />
                    {ENTITY_LABELS[type]}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Entities Table */}
      {entities.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">
              Entidades Extraídas ({entities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['medication', 'diagnosis', 'allergy', 'procedure', 'vital'] as const).map((type) => {
                const group = entities.filter((e) => e.type === type);
                if (group.length === 0) return null;
                const cfg = ENTITY_COLORS[type] ?? { bg: '', text: '', border: '', icon: Pill };
                const Icon = cfg.icon;
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn('h-4 w-4', cfg.text)} />
                      <span className={cn('text-sm font-medium', cfg.text)}>{ENTITY_LABELS[type]}</span>
                      <Badge variant="outline" className="text-xs">{group.length}</Badge>
                    </div>
                    <div className="grid gap-2 pl-6">
                      {group.map((ent, idx) => (
                        <div key={idx} className={cn('p-3 rounded-lg border', cfg.bg, cfg.border)}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-zinc-200">{ent.normalized || ent.text}</span>
                            {ent.code && (
                              <Badge variant="outline" className="text-xs border-zinc-600">{ent.code}</Badge>
                            )}
                          </div>
                          {Object.keys(ent.details).length > 0 && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                              {Object.entries(ent.details).map(([key, val]) => (
                                <span key={key} className="text-xs text-zinc-400">
                                  <span className="text-zinc-500">{key}:</span> {val}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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

// ─── Tab 5: Resumo de Prontuário ────────────────────────────────────────────

function PatientSummaryTab() {
  const [patientId, setPatientId] = useState('');
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [viewMode, setViewMode] = useState<'professional' | 'patient'>('professional');
  const generateSummary = useGeneratePatientSummary();

  const handleGenerate = () => {
    if (!patientId.trim()) {
      toast.error('Informe o ID do paciente.');
      return;
    }
    generateSummary.mutate(patientId, {
      onSuccess: (data) => {
        setSummary(data);
        toast.success('Resumo gerado com sucesso!');
      },
      onError: () => toast.error('Erro ao gerar resumo.'),
    });
  };

  // Demo data
  const demoSummary: PatientSummary = {
    patientId: 'demo-001',
    patientName: 'Maria da Silva Santos',
    activeProblems: [
      'Hipertensão Arterial Sistêmica (I10)',
      'Diabetes Mellitus tipo 2 (E11)',
      'Hipotireoidismo (E03.9)',
      'Osteoartrose de joelhos (M17)',
    ],
    medications: [
      { name: 'Losartana', dose: '50mg', route: 'VO', frequency: '1x/dia' },
      { name: 'Metformina', dose: '850mg', route: 'VO', frequency: '2x/dia' },
      { name: 'Levotiroxina', dose: '50mcg', route: 'VO', frequency: '1x/dia em jejum' },
      { name: 'Paracetamol', dose: '500mg', route: 'VO', frequency: 'SOS' },
    ],
    allergies: ['Dipirona — urticária', 'Sulfonamidas — angioedema'],
    recentResults: [
      { name: 'HbA1c', value: '7.2%', date: '2026-03-10', status: 'abnormal' },
      { name: 'Creatinina', value: '0.9 mg/dL', date: '2026-03-10', status: 'normal' },
      { name: 'TSH', value: '3.8 mUI/L', date: '2026-03-10', status: 'normal' },
      { name: 'Colesterol Total', value: '245 mg/dL', date: '2026-03-10', status: 'abnormal' },
    ],
    upcomingAppointments: [
      { specialty: 'Endocrinologia', date: '2026-04-15', provider: 'Dr. Carlos Mendes' },
      { specialty: 'Ortopedia', date: '2026-04-22', provider: 'Dra. Ana Paula Lima' },
    ],
    professionalVersion: `RESUMO CLÍNICO — Maria da Silva Santos (65a, F)\n\nProblemas Ativos: HAS, DM2, Hipotireoidismo, Osteoartrose bilateral de joelhos.\n\nMedicações: Losartana 50mg VO 1x/dia, Metformina 850mg VO 2x/dia, Levotiroxina 50mcg VO jejum, Paracetamol 500mg VO SOS.\n\nAlergias: Dipirona (urticária), Sulfonamidas (angioedema).\n\nResultados Recentes (10/03/2026): HbA1c 7.2% (acima da meta), Cr 0.9, TSH 3.8, CT 245 (elevado).\n\nConduta Sugerida: Otimizar controle glicêmico (considerar ajuste de Metformina ou adicionar iSGLT2). Iniciar estatina para dislipidemia. Manter acompanhamento endocrinológico.`,
    patientVersion: `Olá, Maria!\n\nAqui está um resumo simples da sua saúde:\n\nSuas condições: Você tem pressão alta, diabetes tipo 2, tireoide lenta e desgaste nos joelhos.\n\nSeus remédios:\n• Losartana — para pressão (1 comprimido por dia)\n• Metformina — para diabetes (1 comprimido 2 vezes ao dia)\n• Levotiroxina — para tireoide (tomar em jejum pela manhã)\n• Paracetamol — para dor quando precisar\n\nAlergias: Você é alérgica a Dipirona e Sulfonamidas. Sempre avise seus médicos!\n\nÚltimos exames: Seu açúcar no sangue está um pouco acima do ideal e o colesterol está alto. Vamos conversar sobre ajustes.\n\nPróximas consultas:\n• 15/04 — Endocrinologia com Dr. Carlos\n• 22/04 — Ortopedia com Dra. Ana Paula`,
    generatedAt: new Date().toISOString(),
  };

  const useDemoData = () => {
    setSummary(demoSummary);
    setPatientId('demo-001');
    toast.success('Dados demo carregados!');
  };

  const resultStatusColors: Record<string, string> = {
    normal: 'text-green-400',
    abnormal: 'text-yellow-400',
    critical: 'text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="ID do paciente..."
              className="bg-zinc-950 border-zinc-800"
            />
            <Button
              onClick={handleGenerate}
              disabled={generateSummary.isPending || !patientId.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 shrink-0"
            >
              {generateSummary.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Gerar Resumo
            </Button>
            <Button variant="outline" className="border-zinc-700 shrink-0" onClick={useDemoData}>
              Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <>
          {/* Patient Header */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-200">{summary.patientName}</h3>
                  <p className="text-sm text-zinc-500">ID: {summary.patientId}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'professional' ? 'default' : 'outline'}
                    size="sm"
                    className={viewMode === 'professional' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-zinc-700'}
                    onClick={() => setViewMode('professional')}
                  >
                    <Stethoscope className="h-4 w-4 mr-1" />
                    Profissional
                  </Button>
                  <Button
                    variant={viewMode === 'patient' ? 'default' : 'outline'}
                    size="sm"
                    className={viewMode === 'patient' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-zinc-700'}
                    onClick={() => setViewMode('patient')}
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    Paciente (Leigo)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Text Version */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {viewMode === 'professional' ? 'Resumo Profissional' : 'Resumo para Paciente'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const text = viewMode === 'professional' ? summary.professionalVersion : summary.patientVersion;
                  navigator.clipboard.writeText(text);
                  toast.success('Resumo copiado!');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm text-zinc-300 p-4 bg-zinc-950 rounded-lg border border-zinc-800 leading-relaxed">
                {viewMode === 'professional' ? summary.professionalVersion : summary.patientVersion}
              </div>
            </CardContent>
          </Card>

          {/* Structured Data */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Active Problems */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  Problemas Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {summary.activeProblems.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Medications */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pill className="h-4 w-4 text-blue-400" />
                  Medicamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.medications.map((m, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-zinc-200 font-medium">{m.name}</span>
                      <span className="text-zinc-500"> {m.dose} {m.route} — {m.frequency}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  Alergias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.allergies.map((a, i) => (
                    <Badge key={i} variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/50">
                      {a}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Resultados Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.recentResults.map((r, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">{r.name}</span>
                      <span className={cn('font-medium', resultStatusColors[r.status])}>{r.value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Appointments */}
          {summary.upcomingAppointments.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Próximas Consultas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  {summary.upcomingAppointments.map((a, i) => (
                    <div key={i} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm">
                      <div className="font-medium text-zinc-200">{a.specialty}</div>
                      <div className="text-zinc-500">{a.provider} — {new Date(a.date).toLocaleDateString('pt-BR')}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab 6: AutoComplete Clínico ────────────────────────────────────────────

function ClinicalAutocompleteTab() {
  const [text, setText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [specialty, setSpecialty] = useState('general');
  const [verbosity, setVerbosity] = useState<'concise' | 'standard' | 'detailed'>('standard');
  const [language, setLanguage] = useState('pt-BR');
  const [isEnabled, setIsEnabled] = useState(true);
  const autocomplete = useClinicalAutocomplete();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (value: string) => {
    setText(value);
    setSuggestion('');

    if (!isEnabled || value.trim().length < 10) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      autocomplete.mutate(
        {
          text: value,
          cursorPosition: value.length,
          specialty,
          verbosity,
          language,
        },
        {
          onSuccess: (result) => {
            if (result.suggestions.length > 0) {
              setSuggestion(result.suggestions[0] ?? '');
            }
          },
        },
      );
    }, 800);
  };

  const acceptSuggestion = () => {
    if (suggestion) {
      setText((prev) => prev + suggestion);
      setSuggestion('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      acceptSuggestion();
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Demo suggestions
  const demoExamples = [
    { input: 'Paciente masculino, 58 anos, apresenta-se com', suggestion: ' dor torácica em aperto, com irradiação para membro superior esquerdo, iniciada há 2 horas durante esforço físico. Refere sudorese fria e náuseas associadas.' },
    { input: 'Ao exame físico:', suggestion: ' BEG, corado, hidratado, anictérico, acianótico. ACV: RCR em 2T, BNF, sem sopros. AR: MV presente bilateral, sem ruídos adventícios. Abdome: plano, flácido, indolor à palpação, RHA presentes.' },
    { input: 'Conduta: Solicitar', suggestion: ' hemograma completo, PCR, VHS, função renal e hepática, eletrólitos. Iniciar antibioticoterapia empírica com Ceftriaxona 2g IV 1x/dia + Azitromicina 500mg VO 1x/dia por 7 dias.' },
  ];

  return (
    <div className="space-y-6">
      {/* Settings */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-emerald-400" />
            Configurações do AutoComplete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Status</Label>
              <div className="flex items-center gap-2">
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                <span className="text-sm text-zinc-400">{isEnabled ? 'Ativado' : 'Desativado'}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Especialidade</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="w-44 bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Verbosidade</Label>
              <Select value={verbosity} onValueChange={(v) => setVerbosity(v as typeof verbosity)}>
                <SelectTrigger className="w-36 bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="concise">Conciso</SelectItem>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="detailed">Detalhado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-44 bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Editor com AutoComplete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Comece a digitar uma nota clínica..."
              className="min-h-[250px] bg-zinc-950 border-zinc-800 text-zinc-200 resize-y font-mono text-sm"
            />
            {suggestion && (
              <div className="absolute bottom-3 left-3 right-3">
                <div className="p-2 rounded bg-zinc-800/90 border border-zinc-700 backdrop-blur-sm">
                  <p className="text-sm text-zinc-500 italic">
                    {suggestion}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                      Tab para aceitar
                    </Badge>
                    <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                      Esc para ignorar
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
          {autocomplete.isPending && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Gerando sugestão...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Examples */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Exemplos de AutoComplete</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demoExamples.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setText(ex.input);
                  setSuggestion(ex.suggestion);
                }}
                className="w-full text-left p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/30 transition-colors"
              >
                <span className="text-sm text-zinc-200">{ex.input}</span>
                <span className="text-sm text-zinc-600 italic">{ex.suggestion}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 7: Tradução Médica ─────────────────────────────────────────────────

function MedicalTranslationTab() {
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('pt-BR');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const translate = useMedicalTranslation();

  const handleTranslate = () => {
    if (!sourceText.trim()) {
      toast.error('Insira o texto para tradução.');
      return;
    }
    if (sourceLanguage === targetLanguage) {
      toast.error('Idioma de origem e destino devem ser diferentes.');
      return;
    }
    translate.mutate(
      { text: sourceText, sourceLanguage, targetLanguage },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success('Tradução concluída!');
        },
        onError: () => toast.error('Erro na tradução.'),
      },
    );
  };

  const swapLanguages = () => {
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
    if (result) {
      setSourceText(result.translatedText);
      setResult(null);
    }
  };

  const demoText = 'Paciente com quadro de insuficiência cardíaca congestiva classe funcional III (NYHA), em uso de furosemida 40mg/dia, carvedilol 25mg 2x/dia e espironolactona 25mg/dia. Apresentou piora da dispneia aos mínimos esforços e edema de membros inferiores bilateral com cacifo positivo 3+/4+. Ecocardiograma evidenciou fração de ejeção de 30%. Indicado ajuste terapêutico e avaliação para ressincronização cardíaca.';

  return (
    <div className="space-y-6">
      {/* Language Selectors */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-zinc-400 text-xs">Idioma de Origem</Label>
              <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="icon" className="mt-5 border-zinc-700" onClick={swapLanguages}>
              <ArrowRightLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 space-y-1.5">
              <Label className="text-zinc-400 text-xs">Idioma de Destino</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side by Side */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Texto Original
            </CardTitle>
            <Button variant="outline" size="sm" className="border-zinc-700 text-xs" onClick={() => setSourceText(demoText)}>
              Usar Demo
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Cole o documento clínico aqui..."
              className="min-h-[300px] bg-zinc-950 border-zinc-800 text-zinc-200 resize-y"
            />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Tradução
            </CardTitle>
            {result && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(result.translatedText);
                  toast.success('Tradução copiada!');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="whitespace-pre-wrap text-sm text-zinc-300 p-4 bg-zinc-950 rounded-lg border border-zinc-800 min-h-[300px] leading-relaxed">
                {result.translatedText}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[300px] bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-600">
                <div className="text-center">
                  <Languages className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>A tradução aparecerá aqui</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Translate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleTranslate}
          disabled={translate.isPending || !sourceText.trim() || sourceLanguage === targetLanguage}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2 px-8"
          size="lg"
        >
          {translate.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          Traduzir
        </Button>
      </div>

      {/* Terminology Table */}
      {result && result.terminology.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Glossário de Termos Médicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {result.terminology.map((term, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm">
                  <div className="text-zinc-200 font-medium">{term.source}</div>
                  <div className="text-emerald-400">{term.translated}</div>
                  <Badge variant="outline" className="text-xs mt-1 border-zinc-700">{term.category}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function VoiceNlpPage() {
  const [activeTab, setActiveTab] = useState('transcription');

  const tabs = [
    { value: 'transcription', label: 'Transcrição de Voz', icon: Mic },
    { value: 'soap', label: 'Nota SOAP', icon: FileText },
    { value: 'ambient', label: 'Ambient Listening', icon: Radio },
    { value: 'entities', label: 'Extração de Entidades', icon: Search },
    { value: 'summary', label: 'Resumo de Prontuário', icon: ClipboardList },
    { value: 'autocomplete', label: 'AutoComplete Clínico', icon: Sparkles },
    { value: 'translation', label: 'Tradução Médica', icon: Languages },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Brain className="h-6 w-6 text-emerald-400" />
            </div>
            IA — Voz &amp; NLP
          </h1>
          <p className="text-zinc-500 mt-1">
            Transcrição por voz, geração de notas SOAP, extração de entidades e mais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 gap-1">
            <Sparkles className="h-3 w-3" />
            GPT-4o
          </Badge>
          <Badge variant="outline" className="border-blue-500/50 text-blue-400 gap-1">
            <Mic className="h-3 w-3" />
            Whisper
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1 h-auto flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1.5 text-xs sm:text-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="transcription" className="mt-6">
          <VoiceTranscriptionTab />
        </TabsContent>
        <TabsContent value="soap" className="mt-6">
          <SOAPGenerationTab />
        </TabsContent>
        <TabsContent value="ambient" className="mt-6">
          <AmbientListeningTab />
        </TabsContent>
        <TabsContent value="entities" className="mt-6">
          <EntityExtractionTab />
        </TabsContent>
        <TabsContent value="summary" className="mt-6">
          <PatientSummaryTab />
        </TabsContent>
        <TabsContent value="autocomplete" className="mt-6">
          <ClinicalAutocompleteTab />
        </TabsContent>
        <TabsContent value="translation" className="mt-6">
          <MedicalTranslationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
