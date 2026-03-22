// ─── Tenant & Organization ───────────────────────────────────────────────────

export enum TenantType {
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  NETWORK = 'NETWORK',
}

export enum SbisLevel {
  NGS1 = 'NGS1',
  NGS2 = 'NGS2',
  NONE = 'NONE',
}

export enum TenantPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

// ─── Users & Roles ──────────────────────────────────────────────────────────

export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  NURSE_TECH = 'NURSE_TECH',
  PHARMACIST = 'PHARMACIST',
  RECEPTIONIST = 'RECEPTIONIST',
  LAB_TECH = 'LAB_TECH',
  RADIOLOGIST = 'RADIOLOGIST',
  NUTRITIONIST = 'NUTRITIONIST',
  PHYSIO = 'PHYSIO',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  SOCIAL_WORKER = 'SOCIAL_WORKER',
  BILLING = 'BILLING',
}

// ─── Demographics ───────────────────────────────────────────────────────────

export enum Gender {
  M = 'M',
  F = 'F',
  NB = 'NB',
  OTHER = 'OTHER',
}

export enum BloodType {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  STABLE_UNION = 'STABLE_UNION',
  OTHER = 'OTHER',
}

// ─── Allergies ──────────────────────────────────────────────────────────────

export enum AllergyType {
  MEDICATION = 'MEDICATION',
  FOOD = 'FOOD',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  LATEX = 'LATEX',
  CONTRAST = 'CONTRAST',
  OTHER = 'OTHER',
}

export enum AllergySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  ANAPHYLAXIS = 'ANAPHYLAXIS',
}

export enum AllergyStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ERROR = 'ERROR',
}

export enum AllergySource {
  PATIENT_REPORT = 'PATIENT_REPORT',
  LAB_CONFIRMED = 'LAB_CONFIRMED',
  AI_SUGGESTED = 'AI_SUGGESTED',
}

// ─── Conditions & History ───────────────────────────────────────────────────

export enum ConditionStatus {
  ACTIVE = 'ACTIVE',
  CONTROLLED = 'CONTROLLED',
  REMISSION = 'REMISSION',
  RESOLVED = 'RESOLVED',
}

export enum FamilyRelation {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  SIBLING = 'SIBLING',
  PATERNAL_GRANDFATHER = 'PATERNAL_GRANDFATHER',
  PATERNAL_GRANDMOTHER = 'PATERNAL_GRANDMOTHER',
  MATERNAL_GRANDFATHER = 'MATERNAL_GRANDFATHER',
  MATERNAL_GRANDMOTHER = 'MATERNAL_GRANDMOTHER',
  UNCLE = 'UNCLE',
  AUNT = 'AUNT',
  COUSIN = 'COUSIN',
  CHILD = 'CHILD',
}

// ─── Lifestyle ──────────────────────────────────────────────────────────────

export enum SmokingStatus {
  NEVER = 'NEVER',
  FORMER = 'FORMER',
  CURRENT = 'CURRENT',
}

export enum AlcoholStatus {
  NEVER = 'NEVER',
  SOCIAL = 'SOCIAL',
  REGULAR = 'REGULAR',
  HEAVY = 'HEAVY',
}

export enum DrugStatus {
  NEVER = 'NEVER',
  FORMER = 'FORMER',
  CURRENT = 'CURRENT',
}

export enum ExerciseLevel {
  SEDENTARY = 'SEDENTARY',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  INTENSE = 'INTENSE',
}

// ─── Encounters ─────────────────────────────────────────────────────────────

export enum EncounterType {
  OUTPATIENT = 'OUTPATIENT',
  EMERGENCY = 'EMERGENCY',
  INPATIENT = 'INPATIENT',
  TELEMEDICINE = 'TELEMEDICINE',
  HOME_VISIT = 'HOME_VISIT',
  DAY_HOSPITAL = 'DAY_HOSPITAL',
  PRE_OP = 'PRE_OP',
  POST_OP = 'POST_OP',
  RETURN = 'RETURN',
  NURSING_CONSULTATION = 'NURSING_CONSULTATION',
}

export enum EncounterStatus {
  SCHEDULED = 'SCHEDULED',
  WAITING = 'WAITING',
  IN_TRIAGE = 'IN_TRIAGE',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum Priority {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

// ─── Triage ─────────────────────────────────────────────────────────────────

export enum TriageLevel {
  RED = 'RED',
  ORANGE = 'ORANGE',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
}

export enum TriageProtocol {
  MANCHESTER = 'MANCHESTER',
  STM = 'STM',
  ESI = 'ESI',
  CUSTOM = 'CUSTOM',
}

// ─── Transcription / Voice ──────────────────────────────────────────────────

export enum TranscriptionContext {
  ANAMNESIS = 'ANAMNESIS',
  EVOLUTION = 'EVOLUTION',
  PRESCRIPTION = 'PRESCRIPTION',
  SOAP = 'SOAP',
  DISCHARGE = 'DISCHARGE',
  NURSING = 'NURSING',
  TRIAGE = 'TRIAGE',
  SURGICAL_NOTE = 'SURGICAL_NOTE',
  GENERAL = 'GENERAL',
}

export enum TranscriptionStatus {
  RECORDING = 'RECORDING',
  TRANSCRIBING = 'TRANSCRIBING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// ─── Clinical Notes ─────────────────────────────────────────────────────────

export enum NoteType {
  SOAP = 'SOAP',
  FREE_TEXT = 'FREE_TEXT',
  STRUCTURED = 'STRUCTURED',
  ADDENDUM = 'ADDENDUM',
  CORRECTION = 'CORRECTION',
}

export enum NoteStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
  COSIGNED = 'COSIGNED',
  AMENDED = 'AMENDED',
}

// ─── Prescriptions & Medications ────────────────────────────────────────────

export enum PrescriptionType {
  MEDICATION = 'MEDICATION',
  EXAM = 'EXAM',
  PROCEDURE = 'PROCEDURE',
  DIET = 'DIET',
  NURSING_CARE = 'NURSING_CARE',
  OXYGEN = 'OXYGEN',
  PHYSIOTHERAPY = 'PHYSIOTHERAPY',
  CUSTOM = 'CUSTOM',
}

export enum PrescriptionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export enum MedicationRoute {
  VO = 'VO',
  IV = 'IV',
  IM = 'IM',
  SC = 'SC',
  SL = 'SL',
  TOP = 'TOP',
  INH = 'INH',
  REC = 'REC',
  OFT = 'OFT',
  OTO = 'OTO',
  NASAL = 'NASAL',
}

export enum DurationUnit {
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS',
  CONTINUOUS = 'CONTINUOUS',
}

export enum ControlledSchedule {
  C1 = 'C1',
  C2 = 'C2',
  C3 = 'C3',
  C4 = 'C4',
  C5 = 'C5',
  A1 = 'A1',
  A2 = 'A2',
  A3 = 'A3',
  B1 = 'B1',
  B2 = 'B2',
}

export enum CheckStatus {
  PENDING = 'PENDING',
  CHECKED = 'CHECKED',
  PARTIALLY_CHECKED = 'PARTIALLY_CHECKED',
  SUSPENDED = 'SUSPENDED',
  NOT_ADMINISTERED = 'NOT_ADMINISTERED',
}

export enum MedCheckStatus {
  ADMINISTERED = 'ADMINISTERED',
  NOT_ADMINISTERED = 'NOT_ADMINISTERED',
  REFUSED = 'REFUSED',
  POSTPONED = 'POSTPONED',
  HELD = 'HELD',
}

export enum DoseCheckResult {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
}

// ─── Vital Signs ────────────────────────────────────────────────────────────

export enum VitalSource {
  MANUAL = 'MANUAL',
  VOICE = 'VOICE',
  MONITOR_INTEGRATION = 'MONITOR_INTEGRATION',
  WEARABLE = 'WEARABLE',
}

export enum TemperatureMethod {
  AXILLARY = 'AXILLARY',
  ORAL = 'ORAL',
  RECTAL = 'RECTAL',
  TYMPANIC = 'TYMPANIC',
}

export enum OxygenSupplementation {
  ROOM_AIR = 'ROOM_AIR',
  NASAL_CANNULA = 'NASAL_CANNULA',
  MASK = 'MASK',
  VENTILATOR = 'VENTILATOR',
}

export enum HeartRhythm {
  REGULAR = 'REGULAR',
  IRREGULAR = 'IRREGULAR',
}

export enum Edema {
  NONE = 'NONE',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum GlucoseContext {
  FASTING = 'FASTING',
  POSTPRANDIAL = 'POSTPRANDIAL',
  RANDOM = 'RANDOM',
}

export enum AiTrend {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  WORSENING = 'WORSENING',
}

// ─── Inpatient / Beds ───────────────────────────────────────────────────────

export enum AdmissionType {
  ELECTIVE = 'ELECTIVE',
  EMERGENCY = 'EMERGENCY',
  TRANSFER_IN = 'TRANSFER_IN',
}

export enum DischargeType {
  IMPROVED = 'IMPROVED',
  SAME = 'SAME',
  WORSE = 'WORSE',
  DEATH = 'DEATH',
  TRANSFER_OUT = 'TRANSFER_OUT',
  EVASION = 'EVASION',
  AGAINST_ADVICE = 'AGAINST_ADVICE',
}

export enum BedType {
  STANDARD = 'STANDARD',
  ICU = 'ICU',
  SEMI_ICU = 'SEMI_ICU',
  ISOLATION = 'ISOLATION',
  PEDIATRIC = 'PEDIATRIC',
  NEONATAL = 'NEONATAL',
  SURGICAL = 'SURGICAL',
  OBSERVATION = 'OBSERVATION',
}

export enum BedStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED',
  BLOCKED = 'BLOCKED',
}

export enum IsolationType {
  CONTACT = 'CONTACT',
  DROPLET = 'DROPLET',
  AIRBORNE = 'AIRBORNE',
  COMBINED = 'COMBINED',
}

export enum TransferStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED',
}

// ─── Nursing ────────────────────────────────────────────────────────────────

export enum NursingNoteType {
  ADMISSION_NOTE = 'ADMISSION_NOTE',
  SHIFT_NOTE = 'SHIFT_NOTE',
  EVOLUTION = 'EVOLUTION',
  INCIDENT = 'INCIDENT',
  HANDOFF = 'HANDOFF',
}

export enum Shift {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
}

export enum NursingDiagnosisStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  RISK = 'RISK',
}

export enum NursingDiagnosisPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum InterventionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum NursingProcessStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
}

// ─── Surgery ────────────────────────────────────────────────────────────────

export enum AnesthesiaType {
  GENERAL = 'GENERAL',
  REGIONAL = 'REGIONAL',
  LOCAL = 'LOCAL',
  SEDATION = 'SEDATION',
  COMBINED = 'COMBINED',
}

export enum Laterality {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  BILATERAL = 'BILATERAL',
  NA = 'NA',
}

export enum SurgicalStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_OP = 'PRE_OP',
  IN_PROGRESS = 'IN_PROGRESS',
  RECOVERY = 'RECOVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ─── Exams & Lab ────────────────────────────────────────────────────────────

export enum ExamType {
  LAB = 'LAB',
  IMAGE = 'IMAGE',
  ECG = 'ECG',
  PATHOLOGY = 'PATHOLOGY',
  OTHER = 'OTHER',
}

export enum ExamStatus {
  REQUESTED = 'REQUESTED',
  COLLECTED = 'COLLECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ImageModality {
  RX = 'RX',
  CT = 'CT',
  MRI = 'MRI',
  US = 'US',
  MAMMO = 'MAMMO',
  OTHER = 'OTHER',
}

export enum LabFlag {
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ─── Documents ──────────────────────────────────────────────────────────────

export enum DocumentType {
  CONSENT = 'CONSENT',
  ADMISSION_FORM = 'ADMISSION_FORM',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  REFERRAL = 'REFERRAL',
  MEDICAL_CERTIFICATE = 'MEDICAL_CERTIFICATE',
  DEATH_CERTIFICATE = 'DEATH_CERTIFICATE',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  REPORT = 'REPORT',
  SURGICAL_CONSENT = 'SURGICAL_CONSENT',
  BLOOD_TRANSFUSION_CONSENT = 'BLOOD_TRANSFUSION_CONSENT',
  ANESTHESIA_CONSENT = 'ANESTHESIA_CONSENT',
  CUSTOM = 'CUSTOM',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
  VOIDED = 'VOIDED',
}

// ─── Alerts & Notifications ─────────────────────────────────────────────────

export enum AlertType {
  ALLERGY = 'ALLERGY',
  INTERACTION = 'INTERACTION',
  DUPLICATE_MED = 'DUPLICATE_MED',
  DOSE_CHECK = 'DOSE_CHECK',
  CRITICAL_RESULT = 'CRITICAL_RESULT',
  VITAL_SIGN = 'VITAL_SIGN',
  FALL_RISK = 'FALL_RISK',
  PRESSURE_INJURY = 'PRESSURE_INJURY',
  READMISSION_RISK = 'READMISSION_RISK',
  SEPSIS_SCREEN = 'SEPSIS_SCREEN',
  VTE_RISK = 'VTE_RISK',
  GLUCOSE = 'GLUCOSE',
  DETERIORATION = 'DETERIORATION',
  CUSTOM = 'CUSTOM',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum AlertSource {
  SYSTEM = 'SYSTEM',
  AI = 'AI',
  MANUAL = 'MANUAL',
}

export enum NotificationType {
  ALERT = 'ALERT',
  RESULT = 'RESULT',
  MESSAGE = 'MESSAGE',
  TASK = 'TASK',
  REMINDER = 'REMINDER',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

// ─── Audit & Compliance ─────────────────────────────────────────────────────

export enum AuditAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SIGN = 'SIGN',
  PRINT = 'PRINT',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VOICE_RECORD = 'VOICE_RECORD',
  SHARE = 'SHARE',
}

export enum ConsentType {
  LGPD_GENERAL = 'LGPD_GENERAL',
  TELEMEDICINE = 'TELEMEDICINE',
  DATA_SHARING = 'DATA_SHARING',
  RESEARCH = 'RESEARCH',
  MARKETING = 'MARKETING',
}

export enum DataRequestType {
  ACCESS = 'ACCESS',
  RECTIFICATION = 'RECTIFICATION',
  DELETION = 'DELETION',
  PORTABILITY = 'PORTABILITY',
}

export enum DataRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DENIED = 'DENIED',
}

// ─── Appointments ───────────────────────────────────────────────────────────

export enum AppointmentType {
  FIRST_VISIT = 'FIRST_VISIT',
  RETURN = 'RETURN',
  TELEMEDICINE = 'TELEMEDICINE',
  PROCEDURE = 'PROCEDURE',
  EXAM = 'EXAM',
  PRE_OP = 'PRE_OP',
  POST_OP = 'POST_OP',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
}

// ─── Billing ────────────────────────────────────────────────────────────────

export enum BillingStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  DENIED = 'DENIED',
  APPEALED = 'APPEALED',
  PAID = 'PAID',
}

export enum GuideType {
  SADT = 'SADT',
  INTERNMENT = 'INTERNMENT',
  CONSULTATION = 'CONSULTATION',
}

// ─── Medical Specialties ────────────────────────────────────────────────────

export enum Specialty {
  GENERAL_PRACTICE = 'GENERAL_PRACTICE',
  CARDIOLOGY = 'CARDIOLOGY',
  DERMATOLOGY = 'DERMATOLOGY',
  ENDOCRINOLOGY = 'ENDOCRINOLOGY',
  GASTROENTEROLOGY = 'GASTROENTEROLOGY',
  GERIATRICS = 'GERIATRICS',
  GYNECOLOGY = 'GYNECOLOGY',
  HEMATOLOGY = 'HEMATOLOGY',
  INFECTIOUS_DISEASE = 'INFECTIOUS_DISEASE',
  NEPHROLOGY = 'NEPHROLOGY',
  NEUROLOGY = 'NEUROLOGY',
  ONCOLOGY = 'ONCOLOGY',
  OPHTHALMOLOGY = 'OPHTHALMOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  OTOLARYNGOLOGY = 'OTOLARYNGOLOGY',
  PEDIATRICS = 'PEDIATRICS',
  PNEUMOLOGY = 'PNEUMOLOGY',
  PSYCHIATRY = 'PSYCHIATRY',
  RHEUMATOLOGY = 'RHEUMATOLOGY',
  UROLOGY = 'UROLOGY',
  SURGERY_GENERAL = 'SURGERY_GENERAL',
  SURGERY_CARDIAC = 'SURGERY_CARDIAC',
  SURGERY_NEURO = 'SURGERY_NEURO',
  SURGERY_PLASTIC = 'SURGERY_PLASTIC',
  SURGERY_THORACIC = 'SURGERY_THORACIC',
  SURGERY_VASCULAR = 'SURGERY_VASCULAR',
  ANESTHESIOLOGY = 'ANESTHESIOLOGY',
  RADIOLOGY = 'RADIOLOGY',
  PATHOLOGY = 'PATHOLOGY',
  EMERGENCY = 'EMERGENCY',
  INTENSIVE_CARE = 'INTENSIVE_CARE',
  FAMILY_MEDICINE = 'FAMILY_MEDICINE',
  OBSTETRICS = 'OBSTETRICS',
  ALLERGY_IMMUNOLOGY = 'ALLERGY_IMMUNOLOGY',
  PHYSICAL_MEDICINE = 'PHYSICAL_MEDICINE',
}
