import type {
  MedicationRoute,
  TranscriptionContext,
  TriageProtocol,
  Shift,
  LabFlag,
  AiTrend,
  TemperatureMethod,
  OxygenSupplementation,
  HeartRhythm,
  Edema,
  GlucoseContext,
} from './enums.js';

// ─── Tenant Settings ────────────────────────────────────────────────────────

export interface PrescriptionDefaults {
  defaultRoute: MedicationRoute;
  requireDoubleCheck: boolean;
  requirePharmacistValidation: boolean;
  allowVerbalOrders: boolean;
  verbalOrderExpirationHours: number;
}

export interface VoiceSettings {
  defaultLanguage: string;
  defaultContext: TranscriptionContext;
  enableAiSuggestions: boolean;
  enableRealTimeTranscription: boolean;
  silenceTimeoutSeconds: number;
  maxRecordingMinutes: number;
}

export interface AlertSettings {
  enableDrugInteractionCheck: boolean;
  enableDoseCheck: boolean;
  enableDuplicateTherapyCheck: boolean;
  enableAllergyCheck: boolean;
  enableCriticalResultAlerts: boolean;
  enableSepsisScreening: boolean;
  enableDeteriorationScore: boolean;
}

export interface ShiftConfig {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  nightStart: string;
  nightEnd: string;
}

export interface TenantSettings {
  prescriptionDefaults: PrescriptionDefaults;
  voiceSettings: VoiceSettings;
  alertSettings: AlertSettings;
  shiftConfig: ShiftConfig;
  defaultTriageProtocol: TriageProtocol;
  defaultShift: Shift;
  timezone: string;
  dateFormat: string;
  requireDigitalSignature: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  passwordExpirationDays: number;
  enableTelemedicine: boolean;
  enableWhatsAppNotifications: boolean;
}

// ─── Structured Medical Data (from AI/Voice) ────────────────────────────────

export interface ExtractedSymptom {
  description: string;
  duration: string | null;
  intensity: string | null;
  location: string | null;
}

export interface ExtractedVital {
  name: string;
  value: number;
  unit: string;
}

export interface ExtractedDiagnosis {
  description: string;
  icdCode: string | null;
  certainty: 'confirmed' | 'suspected' | 'ruled_out';
}

export interface ExtractedMedication {
  name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
}

export interface ExtractedExam {
  name: string;
  type: string | null;
  urgency: string | null;
}

export interface StructuredMedicalData {
  symptoms: ExtractedSymptom[];
  negatives: string[];
  vitals: ExtractedVital[];
  diagnoses: ExtractedDiagnosis[];
  medications: ExtractedMedication[];
  exams: ExtractedExam[];
  redFlags: string[];
}

// ─── Vital Signs ────────────────────────────────────────────────────────────

export interface BloodPressure {
  systolic: number;
  diastolic: number;
}

export interface Temperature {
  value: number;
  method: TemperatureMethod;
}

export interface SpO2 {
  value: number;
  supplementation: OxygenSupplementation;
}

export interface VitalSignsData {
  bp: BloodPressure | null;
  hr: number | null;
  hrRhythm: HeartRhythm | null;
  rr: number | null;
  temp: Temperature | null;
  spo2: SpO2 | null;
  pain: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  glucose: number | null;
  glucoseContext: GlucoseContext | null;
  edema: Edema | null;
  aiTrend: AiTrend | null;
}

// ─── Lab Results ────────────────────────────────────────────────────────────

export interface LabResultItem {
  analyte: string;
  value: number;
  unit: string;
  referenceRange: string;
  flag: LabFlag;
  criticalAlert: boolean;
}

// ─── Safety Checklist ───────────────────────────────────────────────────────

export interface SafetyChecklistItem {
  name: string;
  checked: boolean;
  checkedBy: string | null;
  checkedAt: Date | null;
}

export interface SafetyChecklist {
  items: SafetyChecklistItem[];
}

// ─── API Response Wrappers ──────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors: string[] | null;
}
