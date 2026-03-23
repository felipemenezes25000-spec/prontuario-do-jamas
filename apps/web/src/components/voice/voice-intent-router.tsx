import { PrescriptionVoicePreview } from './voice-prescription-preview';
import { ExamVoicePreview } from './voice-exam-preview';
import { CertificateVoicePreview } from './voice-certificate-preview';
import { ReferralVoicePreview } from './voice-referral-preview';
import { VitalsVoicePreview } from './voice-vitals-preview';
import { DischargeVoicePreview } from './voice-discharge-preview';
import type { VoiceIntent } from '@/stores/voice.store';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────

interface VoiceIntentRouterProps {
  intent: VoiceIntent | null;
  extractedData: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  encounterId?: string;
  onConfirm?: (intent: VoiceIntent, data: unknown) => void;
  onDiscard?: () => void;
}

// ── Helpers to extract typed data ──────────────────────────

interface PrescriptionItem {
  medicationName: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  confidence: number;
}

interface ExamItem {
  examName: string;
  examType: string;
  tussCode?: string;
  urgency: string;
  clinicalIndication?: string;
  confidence: number;
}

interface CertificateData {
  days: number;
  cidCode?: string;
  cidDescription?: string;
  justification: string;
  certificateType: string;
  restrictions?: string;
  confidence: number;
}

interface ReferralData {
  specialty: string;
  reason: string;
  urgency: string;
  cidCode?: string;
  clinicalSummary?: string;
  questionsForSpecialist?: string;
  confidence: number;
}

interface VitalsData {
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

interface DischargeData {
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

function extractPrescriptionItems(data: Record<string, unknown>): PrescriptionItem[] {
  const items = data.items as PrescriptionItem[] | undefined;
  return (items ?? []).map((i) => ({
    medicationName: String(i.medicationName ?? ''),
    dose: i.dose != null ? String(i.dose) : undefined,
    route: i.route != null ? String(i.route) : undefined,
    frequency: i.frequency != null ? String(i.frequency) : undefined,
    duration: i.duration != null ? String(i.duration) : undefined,
    instructions: i.instructions != null ? String(i.instructions) : undefined,
    confidence: typeof i.confidence === 'number' ? i.confidence : 0.7,
  }));
}

function extractExamItems(data: Record<string, unknown>): ExamItem[] {
  const exams = data.exams as ExamItem[] | undefined;
  return (exams ?? []).map((e) => ({
    examName: String(e.examName ?? ''),
    examType: String(e.examType ?? 'LABORATORIAL'),
    tussCode: e.tussCode != null ? String(e.tussCode) : undefined,
    urgency: String(e.urgency ?? 'ROTINA'),
    clinicalIndication: e.clinicalIndication != null ? String(e.clinicalIndication) : undefined,
    confidence: typeof e.confidence === 'number' ? e.confidence : 0.7,
  }));
}

function extractCertificate(data: Record<string, unknown>): CertificateData {
  return {
    days: typeof data.days === 'number' ? data.days : 1,
    cidCode: data.cidCode != null ? String(data.cidCode) : undefined,
    cidDescription: data.cidDescription != null ? String(data.cidDescription) : undefined,
    justification: String(data.justification ?? ''),
    certificateType: String(data.certificateType ?? 'Atestado medico'),
    restrictions: data.restrictions != null ? String(data.restrictions) : undefined,
    confidence: typeof data.confidence === 'number' ? data.confidence : 0.7,
  };
}

function extractReferral(data: Record<string, unknown>): ReferralData {
  return {
    specialty: String(data.specialty ?? ''),
    reason: String(data.reason ?? ''),
    urgency: String(data.urgency ?? 'ELETIVO'),
    cidCode: data.cidCode != null ? String(data.cidCode) : undefined,
    clinicalSummary: data.clinicalSummary != null ? String(data.clinicalSummary) : undefined,
    questionsForSpecialist: data.questionsForSpecialist != null
      ? String(data.questionsForSpecialist)
      : undefined,
    confidence: typeof data.confidence === 'number' ? data.confidence : 0.7,
  };
}

function extractVitals(data: Record<string, unknown>): VitalsData {
  const num = (k: string) => {
    const v = data[k];
    return typeof v === 'number' ? v : undefined;
  };
  return {
    systolicBP: num('systolicBP'),
    diastolicBP: num('diastolicBP'),
    heartRate: num('heartRate'),
    respiratoryRate: num('respiratoryRate'),
    temperature: num('temperature'),
    oxygenSaturation: num('oxygenSaturation'),
    gcs: num('gcs'),
    painScale: num('painScale'),
    painLocation: data.painLocation != null ? String(data.painLocation) : undefined,
    weight: num('weight'),
    height: num('height'),
    glucoseLevel: num('glucoseLevel'),
    confidence: typeof data.confidence === 'number' ? data.confidence : 0.7,
    summary: String(data.summary ?? 'Sinais vitais extraidos por voz'),
  };
}

function extractDischarge(data: Record<string, unknown>): DischargeData {
  return {
    dischargeType: String(data.dischargeType ?? 'MELHORADO'),
    condition: String(data.condition ?? 'ESTAVEL'),
    followUpDays: typeof data.followUpDays === 'number' ? data.followUpDays : undefined,
    instructions: String(data.instructions ?? ''),
    followUpSpecialty: data.followUpSpecialty != null ? String(data.followUpSpecialty) : undefined,
    warningSignals: Array.isArray(data.warningSignals)
      ? (data.warningSignals as string[])
      : undefined,
    homeMedications: Array.isArray(data.homeMedications)
      ? (data.homeMedications as string[])
      : undefined,
    restrictions: Array.isArray(data.restrictions)
      ? (data.restrictions as string[])
      : undefined,
    confidence: typeof data.confidence === 'number' ? data.confidence : 0.7,
  };
}

// ── Component ──────────────────────────────────────────────

export function VoiceIntentRouter({
  intent,
  extractedData,
  open,
  onOpenChange,
  patientId,
  encounterId,
  onConfirm,
  onDiscard,
}: VoiceIntentRouterProps) {
  const handleDiscard = () => {
    onDiscard?.();
    onOpenChange(false);
  };

  if (!intent || intent === 'SOAP' || intent === 'EVOLUTION') {
    return null;
  }

  switch (intent) {
    case 'PRESCRIPTION':
      return (
        <PrescriptionVoicePreview
          open={open}
          onOpenChange={onOpenChange}
          items={extractPrescriptionItems(extractedData)}
          patientId={patientId}
          encounterId={encounterId}
          onConfirm={(items) => {
            onConfirm?.(intent, items);
            toast.success('Prescricao confirmada');
            onOpenChange(false);
          }}
          onDiscard={handleDiscard}
        />
      );

    case 'EXAM_REQUEST':
      return (
        <ExamVoicePreview
          open={open}
          onOpenChange={onOpenChange}
          items={extractExamItems(extractedData)}
          onConfirm={(items) => {
            onConfirm?.(intent, items);
            toast.success(`${items.length} exame(s) solicitado(s)`);
            onOpenChange(false);
          }}
          onDiscard={handleDiscard}
        />
      );

    case 'CERTIFICATE':
      return (
        <CertificateVoicePreview
          open={open}
          onOpenChange={onOpenChange}
          data={extractCertificate(extractedData)}
          onConfirm={(data) => {
            onConfirm?.(intent, data);
            toast.success('Atestado emitido');
            onOpenChange(false);
          }}
          onDiscard={handleDiscard}
        />
      );

    case 'REFERRAL':
      return (
        <ReferralVoicePreview
          open={open}
          onOpenChange={onOpenChange}
          data={extractReferral(extractedData)}
          onConfirm={(data) => {
            onConfirm?.(intent, data);
            toast.success(`Encaminhamento para ${data.specialty} emitido`);
            onOpenChange(false);
          }}
          onDiscard={handleDiscard}
        />
      );

    case 'VITALS':
      return (
        <VitalsVoicePreview
          open={open}
          onOpenChange={onOpenChange}
          data={extractVitals(extractedData)}
          onConfirm={(data) => {
            onConfirm?.(intent, data);
            toast.success('Sinais vitais registrados');
            onOpenChange(false);
          }}
          onDiscard={handleDiscard}
        />
      );

    case 'DISCHARGE':
      return (
        <DischargeVoicePreview
          open={open}
          onOpenChange={onOpenChange}
          data={extractDischarge(extractedData)}
          onConfirm={(data) => {
            onConfirm?.(intent, data);
            toast.success('Alta hospitalar processada');
            onOpenChange(false);
          }}
          onDiscard={handleDiscard}
        />
      );

    default:
      return null;
  }
}
