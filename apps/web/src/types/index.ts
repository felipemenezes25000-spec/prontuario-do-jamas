// Re-export shared types when available
// export * from '@voxpep/shared-types';

// ============================================================================
// Generic / Utility Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ============================================================================
// Enums (matching Prisma schema)
// ============================================================================

export type UserRole =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'NURSE_TECH'
  | 'PHARMACIST'
  | 'RECEPTIONIST'
  | 'LAB_TECH'
  | 'RADIOLOGIST'
  | 'NUTRITIONIST'
  | 'PHYSIO'
  | 'PSYCHOLOGIST'
  | 'SOCIAL_WORKER'
  | 'BILLING';

export type Gender = 'M' | 'F' | 'NB' | 'OTHER';

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'STABLE_UNION' | 'OTHER';

export type BloodType = 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG';

export type AllergyType = 'MEDICATION' | 'FOOD' | 'ENVIRONMENTAL' | 'LATEX' | 'CONTRAST' | 'OTHER';

export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';

export type AllergyStatus = 'ACTIVE' | 'INACTIVE' | 'RESOLVED' | 'REFUTED';

export type AllergySource = 'PATIENT_REPORT' | 'FAMILY_REPORT' | 'CLINICAL_TEST' | 'MEDICAL_RECORD' | 'AI_DETECTED';

export type ConditionStatus = 'ACTIVE' | 'INACTIVE' | 'RESOLVED' | 'REMISSION';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EncounterType =
  | 'CONSULTATION'
  | 'RETURN_VISIT'
  | 'EMERGENCY'
  | 'HOSPITALIZATION'
  | 'TELEMEDICINE'
  | 'HOME_VISIT'
  | 'DAY_HOSPITAL'
  | 'PROCEDURE'
  | 'PRE_OPERATIVE'
  | 'POST_OPERATIVE'
  | 'LAB_COLLECTION'
  | 'IMAGING'
  | 'VACCINATION'
  | 'NURSING'
  | 'NUTRITION'
  | 'PHYSIOTHERAPY'
  | 'PSYCHOLOGY'
  | 'SOCIAL_WORK';

export type EncounterStatus =
  | 'SCHEDULED'
  | 'WAITING'
  | 'IN_TRIAGE'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'TRANSFERRED';

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';

export type TriageLevel = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';

export type TriageProtocol = 'MANCHESTER' | 'ESI' | 'CANADIAN' | 'AUSTRALIAN' | 'CUSTOM';

export type NoteType =
  | 'SOAP'
  | 'ADMISSION'
  | 'EVOLUTION'
  | 'DISCHARGE_SUMMARY'
  | 'OPERATIVE_NOTE'
  | 'CONSULTATION'
  | 'PROCEDURE_NOTE'
  | 'PROGRESS_NOTE'
  | 'ADDENDUM'
  | 'CORRECTION'
  | 'TRANSFER';

export type NoteStatus = 'DRAFT' | 'FINAL' | 'SIGNED' | 'COSIGNED' | 'AMENDED' | 'VOIDED';

export type PrescriptionType =
  | 'MEDICATION'
  | 'EXAM'
  | 'PROCEDURE'
  | 'DIET'
  | 'NURSING'
  | 'SPECIAL_CONTROL'
  | 'ANTIMICROBIAL';

export type PrescriptionStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED';

export type MedicationRoute =
  | 'ORAL' | 'SUBLINGUAL' | 'RECTAL' | 'TOPICAL' | 'TRANSDERMAL'
  | 'INHALATION' | 'NASAL' | 'OPHTHALMIC' | 'OTIC' | 'VAGINAL'
  | 'IV' | 'IM' | 'SC' | 'ID' | 'EPIDURAL' | 'INTRATHECAL'
  | 'INTRA_ARTICULAR' | 'NEBULIZATION' | 'ENTERAL' | 'PARENTERAL' | 'OTHER';

export type ExamType = 'LABORATORY' | 'IMAGING' | 'FUNCTIONAL' | 'PATHOLOGY' | 'GENETIC' | 'MICROBIOLOGICAL' | 'OTHER';

export type ExamStatus = 'REQUESTED' | 'SCHEDULED' | 'COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REVIEWED';

export type DocumentType =
  | 'ATESTADO' | 'RECEITA' | 'ENCAMINHAMENTO' | 'LAUDO'
  | 'DECLARACAO' | 'CONSENTIMENTO' | 'TERMO_RESPONSABILIDADE'
  | 'RELATORIO' | 'PRONTUARIO_RESUMO' | 'FICHA_INTERNACAO'
  | 'SUMARIO_ALTA' | 'BOLETIM_OCORRENCIA' | 'CERTIDAO_OBITO' | 'CUSTOM';

export type DocumentStatus = 'DRAFT' | 'FINAL' | 'SIGNED' | 'VOIDED';

export type AlertType =
  | 'ALLERGY' | 'DRUG_INTERACTION' | 'LAB_CRITICAL' | 'VITAL_SIGN'
  | 'FALL_RISK' | 'DETERIORATION' | 'MEDICATION_DUE' | 'DUPLICATE_ORDER'
  | 'DOSE_RANGE' | 'AI_PREDICTION' | 'SEPSIS_RISK' | 'READMISSION_RISK'
  | 'PROTOCOL_DEVIATION' | 'SYSTEM';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';

export type AlertSource = 'SYSTEM' | 'AI_ENGINE' | 'CLINICAL_RULE' | 'LAB_INTERFACE' | 'DEVICE' | 'USER';

export type AdmissionType = 'ELECTIVE' | 'EMERGENCY' | 'URGENT' | 'TRANSFER' | 'OBSERVATION' | 'DAY_HOSPITAL';

export type DischargeType =
  | 'MEDICAL_DISCHARGE' | 'TRANSFER' | 'EVASION' | 'DEATH'
  | 'ADMINISTRATIVE' | 'AGAINST_MEDICAL_ADVICE';

export type BedType =
  | 'WARD' | 'SEMI_PRIVATE' | 'PRIVATE' | 'ICU' | 'NICU' | 'PICU'
  | 'ISOLATION' | 'OBSERVATION' | 'EMERGENCY' | 'SURGICAL' | 'RECOVERY';

export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE' | 'BLOCKED';

export type TransferStatus = 'REQUESTED' | 'APPROVED' | 'DENIED' | 'EXECUTED' | 'CANCELLED';

export type IsolationType = 'CONTACT' | 'DROPLET' | 'AIRBORNE' | 'PROTECTIVE' | 'COMBINED';

export type NursingProcessStatus = 'IN_PROGRESS' | 'COMPLETED' | 'REVISED' | 'CANCELLED';

export type NursingNoteType =
  | 'EVOLUTION' | 'ADMISSION' | 'TRANSFER' | 'DISCHARGE'
  | 'INCIDENT' | 'PROCEDURE' | 'OBSERVATION' | 'HANDOFF';

export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export type InterventionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED';

export type Laterality = 'LEFT' | 'RIGHT' | 'BILATERAL' | 'NOT_APPLICABLE';

export type AnesthesiaType =
  | 'GENERAL' | 'SPINAL' | 'EPIDURAL' | 'LOCAL'
  | 'REGIONAL_BLOCK' | 'SEDATION' | 'COMBINED' | 'TOPICAL' | 'NONE';

export type SurgicalStatus =
  | 'SCHEDULED' | 'PRE_OP' | 'IN_PROGRESS' | 'RECOVERY'
  | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export type BillingStatus =
  | 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_APPROVED'
  | 'DENIED' | 'APPEALED' | 'PAID';

export type GuideType = 'CONSULTATION' | 'SADT' | 'HOSPITALIZATION' | 'SUMMARY';

export type AppointmentType =
  | 'FIRST_VISIT' | 'RETURN' | 'FOLLOW_UP' | 'PROCEDURE'
  | 'EXAM' | 'TELEMEDICINE' | 'HOME_VISIT' | 'GROUP_SESSION';

export type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'WAITING' | 'IN_PROGRESS'
  | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';

export type TranscriptionContext =
  | 'ANAMNESIS' | 'PHYSICAL_EXAM' | 'ASSESSMENT' | 'PLAN'
  | 'PRESCRIPTION' | 'EVOLUTION' | 'TRIAGE' | 'SURGICAL_DESCRIPTION'
  | 'NURSING_NOTE' | 'GENERAL';

export type TranscriptionStatus = 'RECORDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type MedCheckStatus = 'SCHEDULED' | 'ADMINISTERED' | 'DELAYED' | 'MISSED' | 'REFUSED' | 'HELD' | 'CANCELLED';

export type ImageModality =
  | 'XRAY' | 'CT' | 'MRI' | 'ULTRASOUND' | 'PET' | 'SCINTIGRAPHY'
  | 'MAMMOGRAPHY' | 'DENSITOMETRY' | 'FLUOROSCOPY' | 'ANGIOGRAPHY'
  | 'ECHOCARDIOGRAPHY' | 'ENDOSCOPY' | 'OTHER';

// ============================================================================
// Models
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  specialty?: string;
  crm?: string;
  avatarUrl?: string;
  tenantId: string;
  phone?: string;
  isActive?: boolean;
  mfaEnabled?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PatientAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Patient {
  id: string;
  mrn: string;
  fullName: string;
  /** @deprecated Use `fullName` instead. Kept for backward compatibility. */
  name?: string;
  socialName?: string;
  cpf?: string;
  rg?: string;
  cns?: string;
  birthDate: string;
  gender: Gender;
  genderIdentity?: string;
  pronouns?: string;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  ethnicity?: string;
  education?: string;
  occupation?: string;
  phone?: string;
  phoneSecondary?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  photo?: string;
  bloodType?: BloodType;
  motherName?: string;
  fatherName?: string;
  insuranceProvider?: string;
  insurancePlan?: string;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  isActive: boolean;
  isDeceased?: boolean;
  consentLGPD?: boolean;
  tags: string[];
  riskScore?: number;
  lastVisitAt?: string;
  totalVisits?: number;
  createdAt: string;
  updatedAt: string;
  // Nested relations (optional, populated by includes)
  allergies?: Allergy[];
  chronicConditions?: ChronicCondition[];
}

/** Backwards-compatible alias */
export type { Patient as PatientModel };

export interface CreatePatientDto {
  fullName: string;
  socialName?: string;
  cpf?: string;
  birthDate: string;
  gender: Gender;
  phone?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  insuranceProvider?: string;
  insurancePlan?: string;
  insuranceNumber?: string;
  motherName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  tags?: string[];
}

export interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  type: AllergyType;
  severity: AllergySeverity;
  reaction?: string;
  onsetDate?: string;
  status: AllergyStatus;
  source: AllergySource;
  notes?: string;
  recordedByVoice?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAllergyDto {
  patientId: string;
  substance: string;
  type: AllergyType;
  severity: AllergySeverity;
  reaction?: string;
  notes?: string;
  source?: AllergySource;
}

export interface ChronicCondition {
  id: string;
  patientId: string;
  cidCode?: string;
  cidDescription?: string;
  diagnosedAt?: string;
  status: ConditionStatus;
  severity?: string;
  currentTreatment?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Backwards-compatible alias */
export type Condition = ChronicCondition;

export interface CreateConditionDto {
  patientId: string;
  cidCode?: string;
  cidDescription?: string;
  status?: ConditionStatus;
  severity?: string;
  currentTreatment?: string;
  notes?: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  patient?: Patient;
  primaryDoctorId?: string;
  primaryDoctor?: User;
  primaryNurseId?: string;
  type: EncounterType;
  status: EncounterStatus;
  priority: Priority;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  location?: string;
  room?: string;
  chiefComplaint?: string;
  triageLevel?: TriageLevel;
  triageScore?: number;
  isFollowUp?: boolean;
  previousEncounterId?: string;
  billingStatus?: string;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
  // Nested
  clinicalNotes?: ClinicalNote[];
  prescriptions?: Prescription[];
  vitalSigns?: VitalSigns[];
}

export interface CreateEncounterDto {
  patientId: string;
  primaryDoctorId?: string;
  type: EncounterType;
  priority?: Priority;
  scheduledAt?: string;
  chiefComplaint?: string;
  location?: string;
  room?: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  encounterId?: string;
  recordedById: string;
  recordedAt: string;
  systolicBP?: number;
  diastolicBP?: number;
  meanArterialPressure?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  painScale?: number;
  painLocation?: string;
  weight?: number;
  height?: number;
  bmi?: number;
  glucoseLevel?: number;
  gcs?: number;
  newsScore?: number;
  newsClassification?: string;
  source?: string;
  createdAt: string;
}

export interface CreateVitalSignsDto {
  patientId: string;
  encounterId?: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  painScale?: number;
  weight?: number;
  height?: number;
  glucoseLevel?: number;
}

export interface ClinicalNote {
  id: string;
  encounterId: string;
  authorId: string;
  author?: User;
  authorRole: UserRole;
  type: NoteType;
  status: NoteStatus;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  freeText?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  wasGeneratedByAI?: boolean;
  aiModel?: string;
  signedAt?: string;
  signedById?: string;
  cosignedAt?: string;
  cosignedById?: string;
  version: number;
  parentNoteId?: string;
  amendments?: ClinicalNote[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalNoteDto {
  encounterId: string;
  type: NoteType;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  freeText?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
}

export interface Prescription {
  id: string;
  encounterId: string;
  doctorId: string;
  patientId: string;
  patient?: Patient;
  doctor?: User;
  encounter?: Encounter;
  type: PrescriptionType;
  status: PrescriptionStatus;
  wasGeneratedByAI?: boolean;
  validFrom?: string;
  validUntil?: string;
  isOneTime?: boolean;
  isContinuous?: boolean;
  isPRN?: boolean;
  signedAt?: string;
  requiresDoubleCheck?: boolean;
  doubleCheckedAt?: string | null;
  doubleCheckedBy?: { id: string; name: string } | null;
  items: PrescriptionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionDto {
  encounterId: string;
  patientId: string;
  type: PrescriptionType;
  validFrom?: string;
  validUntil?: string;
  isOneTime?: boolean;
  isContinuous?: boolean;
  items?: CreatePrescriptionItemDto[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicationName?: string;
  activeIngredient?: string;
  concentration?: string;
  pharmaceuticalForm?: string;
  dose?: string;
  doseUnit?: string;
  route?: MedicationRoute;
  frequency?: string;
  frequencyHours?: number;
  duration?: string;
  specialInstructions?: string;
  examName?: string;
  examCode?: string;
  examType?: ExamType;
  procedureName?: string;
  dietType?: string;
  infusionRate?: string;
  infusionRateUnit?: string;
  dilution?: string;
  dilutionVolume?: string;
  dilutionSolution?: string;
  isControlled?: boolean;
  isAntibiotic?: boolean;
  isHighAlert?: boolean;
  aiSuggested?: boolean;
  aiConfidence?: number;
  interactionAlerts?: unknown;
  allergyAlerts?: unknown;
  duplicateAlert?: boolean;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionItemDto {
  medicationName?: string;
  activeIngredient?: string;
  dose?: string;
  doseUnit?: string;
  route?: MedicationRoute;
  frequency?: string;
  duration?: string;
  infusionRate?: string;
  infusionRateUnit?: string;
  dilution?: string;
  dilutionVolume?: string;
  dilutionSolution?: string;
  specialInstructions?: string;
  examName?: string;
  examCode?: string;
  procedureName?: string;
  dietType?: string;
}

export interface TriageAssessment {
  id: string;
  encounterId: string;
  nurseId: string;
  protocol: TriageProtocol;
  chiefComplaint: string;
  symptomOnset?: string;
  symptomDuration?: string;
  painScale?: number;
  painLocation?: string;
  painCharacter?: string;
  flowchartCode?: string;
  discriminatorPath?: DiscriminatorStep[];
  discriminators?: unknown;
  selectedDiscriminator?: string;
  level: TriageLevel;
  levelDescription?: string;
  maxWaitTimeMinutes?: number;
  reassessmentTimeMinutes?: number;
  aiSuggestedLevel?: TriageLevel;
  aiConfidence?: number;
  aiReasoning?: string;
  aiRedFlags?: unknown;
  overriddenByNurse?: boolean;
  overrideReason?: string;
  vitalSignsId?: string;
  completedAt?: string;
  createdAt: string;
}

export interface DiscriminatorStep {
  question: string;
  answer: boolean;
  level?: string;
}

export interface ManchesterDiscriminator {
  question: string;
  yesLevel: TriageLevel;
  noNext: boolean;
}

export interface ManchesterFlowchart {
  id: string;
  name: string;
  code: string;
  category: string;
  discriminators: ManchesterDiscriminator[];
  isActive: boolean;
}

export interface ManchesterFlowchartSummary {
  id: string;
  name: string;
  code: string;
  category: string;
  isActive: boolean;
}

export interface FlowchartSuggestion {
  suggested: ManchesterFlowchartSummary | null;
  confidence: number;
}

export interface CreateTriageDto {
  encounterId: string;
  protocol?: TriageProtocol;
  chiefComplaint: string;
  symptomOnset?: string;
  symptomDuration?: string;
  painScale?: number;
  painLocation?: string;
  painCharacter?: string;
  flowchartCode?: string;
  discriminatorPath?: DiscriminatorStep[];
  selectedDiscriminator?: string;
  level: TriageLevel;
  levelDescription?: string;
  maxWaitTimeMinutes?: number;
  reassessmentTimeMinutes?: number;
  vitalSignsId?: string;
}

export interface Admission {
  id: string;
  encounterId: string;
  patientId: string;
  patient?: Patient;
  admittingDoctorId: string;
  attendingDoctorId?: string;
  admissionDate: string;
  expectedDischargeDate?: string;
  actualDischargeDate?: string;
  admissionType: AdmissionType;
  currentBedId?: string;
  currentBed?: Bed;
  admissionBedId?: string;
  isolationRequired?: boolean;
  isolationType?: IsolationType;
  aihNumber?: string;
  diagnosisAtAdmission?: string;
  diagnosisAtDischarge?: string;
  dischargeType?: DischargeType;
  dischargeNotes?: string;
  dischargePrescription?: string;
  dischargeInstructions?: string;
  followUpDate?: string;
  aiLengthOfStayPrediction?: number;
  aiReadmissionRisk?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdmissionDto {
  encounterId: string;
  patientId: string;
  admissionType: AdmissionType;
  admissionDate?: string;
  expectedDischargeDate?: string;
  currentBedId?: string;
  isolationRequired?: boolean;
  isolationType?: IsolationType;
  diagnosisAtAdmission?: string;
}

export interface Bed {
  id: string;
  ward: string;
  room: string;
  bedNumber: string;
  floor?: string;
  type: BedType;
  status: BedStatus;
  currentPatientId?: string;
  currentPatient?: Patient;
  equipment?: unknown;
  lastCleanedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BedTransfer {
  id: string;
  admissionId: string;
  fromBedId: string;
  toBedId: string;
  requestedById: string;
  approvedById?: string;
  executedById?: string;
  reason?: string;
  requestedAt: string;
  approvedAt?: string;
  executedAt?: string;
  status: TransferStatus;
  createdAt: string;
}

export interface CreateBedTransferDto {
  admissionId: string;
  fromBedId: string;
  toBedId: string;
  reason?: string;
}

export interface ExamResult {
  id: string;
  encounterId?: string;
  patientId: string;
  examName: string;
  examCode?: string;
  examType: ExamType;
  requestedById?: string;
  requestedAt?: string;
  labResults?: unknown;
  imageUrl?: string;
  imageModality?: ImageModality;
  radiologistReport?: string;
  status: ExamStatus;
  collectedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  reviewedById?: string;
  aiInterpretation?: string;
  aiAlerts?: unknown;
  attachments?: unknown;
  createdAt: string;
}

export interface CreateExamRequestDto {
  encounterId?: string;
  patientId: string;
  examName: string;
  examCode?: string;
  examType: ExamType;
  urgency?: Priority;
  instructions?: string;
  justification?: string;
}

export interface ClinicalDocument {
  id: string;
  encounterId?: string;
  patientId: string;
  authorId: string;
  author?: User;
  type: DocumentType;
  title: string;
  content?: string;
  templateId?: string;
  generatedByAI?: boolean;
  signedAt?: string;
  signedById?: string;
  pdfUrl?: string;
  status: DocumentStatus;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentDto {
  encounterId?: string;
  patientId: string;
  type: DocumentType;
  title: string;
  content?: string;
  templateId?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  category?: string;
  content: string;
  variables?: unknown;
  isDefault?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  encounterId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  details?: unknown;
  source: AlertSource;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedById?: string;
  actionTaken?: string;
  isActive: boolean;
  resolvedAt?: string;
  resolvedById?: string;
  createdAt: string;
}

export interface NursingProcess {
  id: string;
  encounterId: string;
  patientId: string;
  nurseId: string;
  status: NursingProcessStatus;
  dataCollectionNotes?: string;
  evaluationNotes?: string;
  evaluatedAt?: string;
  aiSuggestedDiagnoses?: unknown;
  diagnoses?: NursingDiagnosis[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNursingProcessDto {
  encounterId: string;
  patientId: string;
  dataCollectionNotes?: string;
}

export interface NursingDiagnosis {
  id: string;
  nursingProcessId: string;
  nandaCode?: string;
  nandaDomain?: string;
  nandaClass?: string;
  nandaTitle: string;
  relatedFactors: string[];
  riskFactors: string[];
  definingCharacteristics: string[];
  status: string;
  priority: string;
  aiSuggested?: boolean;
  aiConfidence?: number;
  outcomes?: NursingOutcome[];
  interventions?: NursingIntervention[];
  createdAt: string;
}

export interface NursingOutcome {
  id: string;
  nursingDiagnosisId: string;
  nocCode?: string;
  nocTitle: string;
  baselineScore: number;
  targetScore: number;
  currentScore: number;
  indicators?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface NursingIntervention {
  id: string;
  nursingDiagnosisId: string;
  nicCode?: string;
  nicTitle: string;
  activities?: unknown;
  status: InterventionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NursingNote {
  id: string;
  encounterId: string;
  nurseId: string;
  type: NursingNoteType;
  content: string;
  shift: Shift;
  signedAt?: string;
  createdAt: string;
}

export interface CreateNursingNoteDto {
  encounterId: string;
  type: NursingNoteType;
  content: string;
  shift: Shift;
}

export interface FluidBalance {
  id: string;
  encounterId: string;
  patientId: string;
  nurseId: string;
  recordedAt: string;
  period?: string;
  intakeOral: number;
  intakeIV: number;
  intakeOther: number;
  intakeTotal: number;
  outputUrine: number;
  outputDrain: number;
  outputEmesis: number;
  outputStool: number;
  outputOther: number;
  outputTotal: number;
  balance: number;
  cumulativeBalance24h?: number;
  aiAlert?: string;
  createdAt: string;
}

export interface CreateFluidBalanceDto {
  encounterId: string;
  patientId: string;
  recordedAt?: string;
  period?: string;
  intakeOral?: number;
  intakeIV?: number;
  intakeOther?: number;
  outputUrine?: number;
  outputDrain?: number;
  outputEmesis?: number;
  outputStool?: number;
  outputOther?: number;
}

export interface MedicationCheck {
  id: string;
  prescriptionItemId: string;
  prescriptionItem?: PrescriptionItem;
  nurseId: string;
  scheduledAt: string;
  checkedAt?: string;
  status: MedCheckStatus;
  reason?: string;
  observations?: string;
  lotNumber?: string;
  createdAt: string;
}

export interface SurgicalProcedure {
  id: string;
  encounterId: string;
  patientId: string;
  patient?: Patient;
  surgeonId: string;
  surgeon?: User;
  firstAssistantId?: string;
  anesthesiologistId?: string;
  scrubNurseId?: string;
  circulatingNurseId?: string;
  procedureName: string;
  procedureCode?: string;
  laterality?: Laterality;
  anesthesiaType?: AnesthesiaType;
  scheduledAt?: string;
  patientInAt?: string;
  incisionAt?: string;
  sutureAt?: string;
  patientOutAt?: string;
  safetyChecklistBefore?: unknown;
  safetyChecklistDuring?: unknown;
  safetyChecklistAfter?: unknown;
  surgicalDescription?: string;
  complications?: string;
  bloodLoss?: number;
  implants?: unknown;
  pathologySamples?: unknown;
  status: SurgicalStatus;
  aiSurgicalRisk?: string;
  aiAnticipatedComplications?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSurgicalProcedureDto {
  encounterId: string;
  patientId: string;
  procedureName: string;
  procedureCode?: string;
  laterality?: Laterality;
  anesthesiaType?: AnesthesiaType;
  scheduledAt?: string;
  surgeonId?: string;
  firstAssistantId?: string;
  anesthesiologistId?: string;
  scrubNurseId?: string;
  circulatingNurseId?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: User;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string;
  duration: number;
  actualStartAt?: string;
  actualEndAt?: string;
  location?: string;
  room?: string;
  isTelemedicine?: boolean;
  confirmedAt?: string;
  notes?: string;
  cancellationReason?: string;
  encounterId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentDto {
  patientId: string;
  doctorId: string;
  type: AppointmentType;
  scheduledAt: string;
  duration?: number;
  location?: string;
  room?: string;
  isTelemedicine?: boolean;
  notes?: string;
}

export interface BillingEntry {
  id: string;
  encounterId: string;
  patientId: string;
  insuranceProvider?: string;
  planType?: string;
  guideNumber?: string;
  guideType?: GuideType;
  items?: unknown;
  totalAmount?: number;
  glosedAmount?: number;
  approvedAmount?: number;
  status: BillingStatus;
  submittedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  tissXml?: string;
  aiCodingSuggestions?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillingEntryDto {
  encounterId: string;
  patientId: string;
  insuranceProvider?: string;
  planType?: string;
  guideType?: GuideType;
  items?: unknown;
  totalAmount?: number;
}

export interface VoiceTranscription {
  id: string;
  encounterId?: string;
  userId: string;
  patientId?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioFormat?: string;
  rawTranscription?: string;
  processedTranscription?: string;
  structuredData?: unknown;
  context: TranscriptionContext;
  confidence?: number;
  language?: string;
  wasEdited?: boolean;
  processingStatus: TranscriptionStatus;
  processingTimeMs?: number;
  createdAt: string;
}

// ============================================================================
// Notification
// ============================================================================

export interface Notification {
  id: string;
  type: 'ALERT' | 'REMINDER' | 'MESSAGE' | 'TASK' | 'RESULT' | 'APPOINTMENT' | 'SYSTEM';
  title: string;
  body: string;
  /** @deprecated Use `body` instead. Kept for backward compatibility. */
  message?: string;
  data?: unknown;
  read?: boolean;
  readAt?: string;
  actionUrl?: string;
  /** @deprecated Use `actionUrl` instead. */
  link?: string;
  createdAt: string;
}

// ============================================================================
// Dashboard
// ============================================================================

export interface DashboardStats {
  totalPatients: number;
  totalPatientsChange: number;
  encountersToday: number;
  encountersTodayChange: number;
  occupiedBeds: number;
  totalBeds: number;
  occupancyRate: number;
  activeAlerts: number;
  criticalAlerts: number;
  scheduledAppointments: number;
  completedAppointments: number;
  pendingPrescriptions: number;
  waitingTriage: number;
  averageWaitTime: number;
  revenueThisMonth: number;
}

// ============================================================================
// Voice State (frontend-only)
// ============================================================================

export interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  currentTranscription: string;
  partialText: string;
  error: string | null;
  duration: number;
}

// ============================================================================
// AI Response types
// ============================================================================

export interface AISOAPResponse {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosisCodes?: string[];
  confidence: number;
  model: string;
}

export interface AIPrescriptionParseResponse {
  items: CreatePrescriptionItemDto[];
  warnings: string[];
  confidence: number;
}

export interface AITriageSuggestion {
  suggestedLevel: TriageLevel;
  reasoning: string;
  redFlags: string[];
  confidence: number;
}

export interface AICopilotResponse {
  suggestion: string;
  context: string;
  confidence: number;
  references?: string[];
}

export interface AIPatientSummaryResponse {
  summary: string;
  keyFindings: string[];
  activeProblems: string[];
  recentChanges: string[];
  recommendations: string[];
}

export interface AICodingSuggestion {
  code: string;
  description: string;
  confidence: number;
  reasoning?: string;
}

export interface AITranscriptionResponse {
  transcriptionId: string;
  rawText: string;
  processedText?: string;
  structuredData?: unknown;
  confidence: number;
  processingTimeMs: number;
}

// ============================================================================
// Billing Appeals (Glosa)
// ============================================================================

export type AppealStatus =
  | 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW'
  | 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED' | 'ESCALATED';

export interface BillingAppeal {
  id: string;
  tenantId: string;
  billingEntryId: string;
  appealNumber: string;
  status: AppealStatus;
  glosedItemCodes: string[];
  glosedAmount: number;
  appealedAmount: number;
  recoveredAmount?: number;
  justification: string;
  aiJustification?: string;
  supportingDocs: string[];
  tissXmlValidation?: unknown;
  submittedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  billingEntry?: BillingEntry;
  createdBy?: { id: string; name: string; email: string };
}

export interface CreateAppealDto {
  billingEntryId: string;
  glosedItemCodes: string[];
  glosedAmount: number;
  appealedAmount: number;
  justification: string;
  supportingDocs?: string[];
}

export interface UpdateAppealStatusDto {
  status: AppealStatus;
  resolution?: string;
  recoveredAmount?: number;
}

export interface TissValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Pharmacy — Dispensation & Inventory (A11 + C6)
// ============================================================================

export type InventoryStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED' | 'QUARANTINE';

export interface Dispensation {
  id: string;
  prescriptionItemId: string;
  prescriptionItem?: PrescriptionItem;
  pharmacistId: string;
  pharmacist?: { id: string; name: string };
  quantity: number;
  lot?: string;
  expirationDate?: string;
  observations?: string;
  dispensedAt: string;
  tenantId: string;
  createdAt: string;
}

export interface CreateDispensationDto {
  prescriptionItemId: string;
  quantity: number;
  lot?: string;
  expirationDate?: string;
  observations?: string;
}

export interface DrugInventory {
  id: string;
  drugName: string;
  drugId?: string;
  lot: string;
  expirationDate: string;
  quantity: number;
  minQuantity: number;
  location: string;
  status: InventoryStatus;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDrugInventoryDto {
  drugName: string;
  drugId?: string;
  lot: string;
  expirationDate: string;
  quantity: number;
  minQuantity?: number;
  location: string;
}

export interface UpdateDrugInventoryDto {
  quantity?: number;
  minQuantity?: number;
  location?: string;
  status?: InventoryStatus;
}

export interface InventoryAlerts {
  lowStock: DrugInventory[];
  expired: DrugInventory[];
  totalLowStock: number;
  totalExpired: number;
}

export interface FluidBalanceSummary {
  totalInput: number;
  totalOutput: number;
  balance: number;
  shifts: {
    morning: { input: number; output: number; balance: number };
    afternoon: { input: number; output: number; balance: number };
    night: { input: number; output: number; balance: number };
  };
  records: FluidBalance[];
}
