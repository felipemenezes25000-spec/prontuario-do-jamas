-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('HOSPITAL', 'CLINIC', 'NETWORK');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SbisLevel" AS ENUM ('NGS1', 'NGS2', 'NONE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DOCTOR', 'NURSE', 'NURSE_TECH', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECH', 'RADIOLOGIST', 'NUTRITIONIST', 'PHYSIO', 'PSYCHOLOGIST', 'SOCIAL_WORKER', 'BILLING');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('GENERAL_PRACTICE', 'INTERNAL_MEDICINE', 'CARDIOLOGY', 'DERMATOLOGY', 'ENDOCRINOLOGY', 'GASTROENTEROLOGY', 'GERIATRICS', 'GYNECOLOGY', 'HEMATOLOGY', 'INFECTIOUS_DISEASE', 'NEPHROLOGY', 'NEUROLOGY', 'OBSTETRICS', 'ONCOLOGY', 'OPHTHALMOLOGY', 'ORTHOPEDICS', 'OTOLARYNGOLOGY', 'PEDIATRICS', 'PNEUMOLOGY', 'PSYCHIATRY', 'RADIOLOGY', 'RHEUMATOLOGY', 'UROLOGY', 'ANESTHESIOLOGY', 'EMERGENCY_MEDICINE', 'FAMILY_MEDICINE', 'INTENSIVE_CARE', 'PATHOLOGY', 'PHYSICAL_MEDICINE', 'PLASTIC_SURGERY', 'SPORTS_MEDICINE', 'THORACIC_SURGERY', 'VASCULAR_SURGERY', 'NEUROSURGERY', 'ALLERGY_IMMUNOLOGY');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F', 'NB', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'STABLE_UNION', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "AllergyType" AS ENUM ('MEDICATION', 'FOOD', 'ENVIRONMENTAL', 'LATEX', 'CONTRAST', 'OTHER');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESOLVED', 'REFUTED');

-- CreateEnum
CREATE TYPE "AllergySource" AS ENUM ('PATIENT_REPORT', 'FAMILY_REPORT', 'CLINICAL_TEST', 'MEDICAL_RECORD', 'AI_DETECTED');

-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESOLVED', 'REMISSION');

-- CreateEnum
CREATE TYPE "FamilyRelation" AS ENUM ('FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'PATERNAL_GRANDFATHER', 'PATERNAL_GRANDMOTHER', 'MATERNAL_GRANDFATHER', 'MATERNAL_GRANDMOTHER', 'SON', 'DAUGHTER', 'UNCLE', 'AUNT', 'COUSIN', 'OTHER');

-- CreateEnum
CREATE TYPE "SmokingStatus" AS ENUM ('NEVER', 'FORMER', 'CURRENT', 'PASSIVE');

-- CreateEnum
CREATE TYPE "AlcoholStatus" AS ENUM ('NEVER', 'SOCIAL', 'MODERATE', 'HEAVY', 'FORMER');

-- CreateEnum
CREATE TYPE "DrugUseStatus" AS ENUM ('NEVER', 'FORMER', 'CURRENT');

-- CreateEnum
CREATE TYPE "ExerciseLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('CONSULTATION', 'RETURN_VISIT', 'EMERGENCY', 'HOSPITALIZATION', 'TELEMEDICINE', 'HOME_VISIT', 'DAY_HOSPITAL', 'PROCEDURE', 'PRE_OPERATIVE', 'POST_OPERATIVE', 'LAB_COLLECTION', 'IMAGING', 'VACCINATION', 'NURSING', 'NUTRITION', 'PHYSIOTHERAPY', 'PSYCHOLOGY', 'SOCIAL_WORK');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('SCHEDULED', 'WAITING', 'IN_TRIAGE', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE');

-- CreateEnum
CREATE TYPE "BillingStatusEnum" AS ENUM ('PENDING', 'BILLED', 'PAID', 'DENIED', 'APPEALED');

-- CreateEnum
CREATE TYPE "TranscriptionContext" AS ENUM ('ANAMNESIS', 'PHYSICAL_EXAM', 'ASSESSMENT', 'PLAN', 'PRESCRIPTION', 'EVOLUTION', 'TRIAGE', 'SURGICAL_DESCRIPTION', 'NURSING_NOTE', 'GENERAL');

-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('RECORDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('SOAP', 'ADMISSION', 'EVOLUTION', 'DISCHARGE_SUMMARY', 'OPERATIVE_NOTE', 'CONSULTATION', 'PROCEDURE_NOTE', 'PROGRESS_NOTE', 'ADDENDUM', 'CORRECTION', 'TRANSFER');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('DRAFT', 'FINAL', 'SIGNED', 'COSIGNED', 'AMENDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PrescriptionType" AS ENUM ('MEDICATION', 'EXAM', 'PROCEDURE', 'DIET', 'NURSING', 'SPECIAL_CONTROL', 'ANTIMICROBIAL');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('ORAL', 'SUBLINGUAL', 'RECTAL', 'TOPICAL', 'TRANSDERMAL', 'INHALATION', 'NASAL', 'OPHTHALMIC', 'OTIC', 'VAGINAL', 'IV', 'IM', 'SC', 'ID', 'EPIDURAL', 'INTRATHECAL', 'INTRA_ARTICULAR', 'NEBULIZATION', 'ENTERAL', 'PARENTERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('HOURS', 'DAYS', 'WEEKS', 'MONTHS', 'CONTINUOUS');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('LABORATORY', 'IMAGING', 'FUNCTIONAL', 'PATHOLOGY', 'GENETIC', 'MICROBIOLOGICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ControlledSchedule" AS ENUM ('A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5');

-- CreateEnum
CREATE TYPE "DoseCheckResult" AS ENUM ('NORMAL', 'LOW', 'HIGH', 'CRITICAL', 'NOT_CHECKED');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MedCheckStatus" AS ENUM ('SCHEDULED', 'ADMINISTERED', 'DELAYED', 'MISSED', 'REFUSED', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HeartRhythm" AS ENUM ('REGULAR', 'IRREGULAR', 'ATRIAL_FIBRILLATION', 'TACHYCARDIC', 'BRADYCARDIC', 'OTHER');

-- CreateEnum
CREATE TYPE "TemperatureMethod" AS ENUM ('AXILLARY', 'ORAL', 'RECTAL', 'TYMPANIC', 'TEMPORAL', 'ESOPHAGEAL', 'BLADDER');

-- CreateEnum
CREATE TYPE "OxygenSupplementation" AS ENUM ('ROOM_AIR', 'NASAL_CANNULA', 'SIMPLE_MASK', 'VENTURI_MASK', 'NON_REBREATHER', 'HIGH_FLOW', 'CPAP', 'BIPAP', 'MECHANICAL_VENTILATION');

-- CreateEnum
CREATE TYPE "GlucoseContext" AS ENUM ('FASTING', 'PRE_MEAL', 'POST_MEAL', 'RANDOM', 'BEDTIME');

-- CreateEnum
CREATE TYPE "Edema" AS ENUM ('NONE', 'MILD_1', 'MODERATE_2', 'SEVERE_3', 'ANASARCA_4');

-- CreateEnum
CREATE TYPE "VitalSource" AS ENUM ('MANUAL', 'MONITOR', 'DEVICE', 'VOICE', 'AI_EXTRACTED');

-- CreateEnum
CREATE TYPE "AiTrend" AS ENUM ('STABLE', 'IMPROVING', 'WORSENING', 'CRITICAL', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "TriageProtocol" AS ENUM ('MANCHESTER', 'ESI', 'CANADIAN', 'AUSTRALIAN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('ELECTIVE', 'EMERGENCY', 'URGENT', 'TRANSFER', 'OBSERVATION', 'DAY_HOSPITAL');

-- CreateEnum
CREATE TYPE "IsolationType" AS ENUM ('CONTACT', 'DROPLET', 'AIRBORNE', 'PROTECTIVE', 'COMBINED');

-- CreateEnum
CREATE TYPE "DischargeType" AS ENUM ('MEDICAL_DISCHARGE', 'TRANSFER', 'EVASION', 'DEATH', 'ADMINISTRATIVE', 'AGAINST_MEDICAL_ADVICE');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('WARD', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'NICU', 'PICU', 'ISOLATION', 'OBSERVATION', 'EMERGENCY', 'SURGICAL', 'RECOVERY');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DENIED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NursingProcessStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'REVISED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NursingDxStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'RISK');

-- CreateEnum
CREATE TYPE "NursingPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "NursingNoteType" AS ENUM ('EVOLUTION', 'ADMISSION', 'TRANSFER', 'DISCHARGE', 'INCIDENT', 'PROCEDURE', 'OBSERVATION', 'HANDOFF');

-- CreateEnum
CREATE TYPE "Laterality" AS ENUM ('LEFT', 'RIGHT', 'BILATERAL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "AnesthesiaType" AS ENUM ('GENERAL', 'SPINAL', 'EPIDURAL', 'LOCAL', 'REGIONAL_BLOCK', 'SEDATION', 'COMBINED', 'TOPICAL', 'NONE');

-- CreateEnum
CREATE TYPE "SurgicalStatus" AS ENUM ('SCHEDULED', 'PRE_OP', 'IN_PROGRESS', 'RECOVERY', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ImageModality" AS ENUM ('XRAY', 'CT', 'MRI', 'ULTRASOUND', 'PET', 'SCINTIGRAPHY', 'MAMMOGRAPHY', 'DENSITOMETRY', 'FLUOROSCOPY', 'ANGIOGRAPHY', 'ECHOCARDIOGRAPHY', 'ENDOSCOPY', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ATESTADO', 'RECEITA', 'ENCAMINHAMENTO', 'LAUDO', 'DECLARACAO', 'CONSENTIMENTO', 'TERMO_RESPONSABILIDADE', 'RELATORIO', 'PRONTUARIO_RESUMO', 'FICHA_INTERNACAO', 'SUMARIO_ALTA', 'BOLETIM_OCORRENCIA', 'CERTIDAO_OBITO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'FINAL', 'SIGNED', 'VOIDED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ALLERGY', 'DRUG_INTERACTION', 'LAB_CRITICAL', 'VITAL_SIGN', 'FALL_RISK', 'DETERIORATION', 'MEDICATION_DUE', 'DUPLICATE_ORDER', 'DOSE_RANGE', 'AI_PREDICTION', 'SEPSIS_RISK', 'READMISSION_RISK', 'PROTOCOL_DEVIATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AlertSource" AS ENUM ('SYSTEM', 'AI_ENGINE', 'CLINICAL_RULE', 'LAB_INTERFACE', 'DEVICE', 'USER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ALERT', 'REMINDER', 'MESSAGE', 'TASK', 'RESULT', 'APPOINTMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT', 'SIGN', 'PRESCRIBE', 'VOICE_COMMAND', 'AI_SUGGESTION', 'CONSENT_GRANTED', 'CONSENT_REVOKED', 'DATA_ACCESS', 'EMERGENCY_ACCESS');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('LGPD_GENERAL', 'LGPD_SENSITIVE', 'TELEMEDICINE', 'TREATMENT', 'RESEARCH', 'DATA_SHARING', 'MARKETING', 'RECORDING');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'DELETION', 'PORTABILITY', 'RESTRICTION');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DENIED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('FIRST_VISIT', 'RETURN', 'FOLLOW_UP', 'PROCEDURE', 'EXAM', 'TELEMEDICINE', 'HOME_VISIT', 'GROUP_SESSION');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "GuideType" AS ENUM ('CONSULTATION', 'SADT', 'HOSPITALIZATION', 'SUMMARY');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'APPEALED', 'PAID');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "type" "TenantType" NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "cep" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "cnes_code" TEXT,
    "sbis_level" "SbisLevel" NOT NULL DEFAULT 'NONE',
    "max_beds" INTEGER NOT NULL DEFAULT 0,
    "max_users" INTEGER NOT NULL DEFAULT 0,
    "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
    "subscription_expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "mfa_backup_codes" TEXT[],
    "last_login_at" TIMESTAMP(3),
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "preferred_device" TEXT,
    "voice_profile_id" TEXT,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "crm" TEXT NOT NULL,
    "crm_state" TEXT NOT NULL,
    "specialty" "Specialty" NOT NULL,
    "sub_specialties" TEXT[],
    "medical_school" TEXT,
    "graduation_year" INTEGER,
    "title_prefix" TEXT NOT NULL DEFAULT 'Dr.',
    "digital_certificate_serial" TEXT,
    "digital_certificate_expiry" TIMESTAMP(3),
    "signature_image" TEXT,
    "stamp_image" TEXT,
    "consultation_duration" INTEGER NOT NULL DEFAULT 30,
    "max_daily_patients" INTEGER NOT NULL DEFAULT 20,
    "teleconsultation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "personal_bio" TEXT,
    "prescription_header" TEXT,
    "favorites_medications" JSONB,
    "favorites_diagnoses" JSONB,
    "favorites_exams" JSONB,
    "favorites_templates" JSONB,
    "ai_personalization" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "coren" TEXT NOT NULL,
    "coren_state" TEXT NOT NULL,
    "specialization" TEXT,
    "can_prescribe_nursing" BOOLEAN NOT NULL DEFAULT false,
    "shift_preference" "Shift",
    "certifications" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nurse_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_schedules" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "location" TEXT,
    "room" TEXT,
    "is_telemedicine" BOOLEAN NOT NULL DEFAULT false,
    "slot_duration" INTEGER NOT NULL DEFAULT 30,
    "break_start" TEXT,
    "break_end" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "social_name" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "cns" TEXT,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "gender_identity" TEXT,
    "pronouns" TEXT,
    "marital_status" "MaritalStatus",
    "nationality" TEXT NOT NULL DEFAULT 'Brasileira',
    "ethnicity" TEXT,
    "education" TEXT,
    "occupation" TEXT,
    "phone" TEXT,
    "phone_secondary" TEXT,
    "email" TEXT,
    "address" TEXT,
    "address_number" TEXT,
    "address_complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "cep" TEXT,
    "photo" TEXT,
    "blood_type" "BloodType",
    "rh_factor" TEXT,
    "organ_donor" BOOLEAN NOT NULL DEFAULT false,
    "advance_directives" TEXT,
    "mother_name" TEXT,
    "father_name" TEXT,
    "insurance_provider" TEXT,
    "insurance_plan" TEXT,
    "insurance_number" TEXT,
    "insurance_expiry" TIMESTAMP(3),
    "preferred_pharmacy" TEXT,
    "preferred_lab" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relation" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deceased" BOOLEAN NOT NULL DEFAULT false,
    "deceased_at" TIMESTAMP(3),
    "cause_of_death" TEXT,
    "consent_lgpd" BOOLEAN NOT NULL DEFAULT false,
    "consent_lgpd_at" TIMESTAMP(3),
    "consent_telemedicine" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "risk_score" DOUBLE PRECISION,
    "last_visit_at" TIMESTAMP(3),
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "type" "AllergyType" NOT NULL,
    "severity" "AllergySeverity" NOT NULL,
    "reaction" TEXT,
    "onset_date" TIMESTAMP(3),
    "confirmed_by_id" TEXT,
    "status" "AllergyStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "AllergySource" NOT NULL DEFAULT 'PATIENT_REPORT',
    "notes" TEXT,
    "recorded_by_voice" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chronic_conditions" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "cid_code" TEXT,
    "cid_description" TEXT,
    "diagnosed_at" TIMESTAMP(3),
    "diagnosed_by_id" TEXT,
    "status" "ConditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "severity" TEXT,
    "current_treatment" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chronic_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_histories" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "cid_code" TEXT,
    "relationship" "FamilyRelation" NOT NULL,
    "age_of_onset" INTEGER,
    "is_deceased" BOOLEAN NOT NULL DEFAULT false,
    "cause_of_death" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgical_histories" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "hospital" TEXT,
    "surgeon" TEXT,
    "anesthesia_type" TEXT,
    "complications" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surgical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_histories" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "smoking" "SmokingStatus" NOT NULL DEFAULT 'NEVER',
    "smoking_details" TEXT,
    "alcohol" "AlcoholStatus" NOT NULL DEFAULT 'NEVER',
    "alcohol_details" TEXT,
    "drugs" "DrugUseStatus" NOT NULL DEFAULT 'NEVER',
    "drug_details" TEXT,
    "exercise" "ExerciseLevel" NOT NULL DEFAULT 'SEDENTARY',
    "exercise_details" TEXT,
    "diet" TEXT,
    "sleep" TEXT,
    "stress_level" INTEGER,
    "sexually_active" BOOLEAN,
    "contraception" TEXT,
    "housing_condition" TEXT,
    "sanitation_access" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinations" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "vaccine" TEXT NOT NULL,
    "dose" TEXT,
    "lot" TEXT,
    "manufacturer" TEXT,
    "application_date" TIMESTAMP(3) NOT NULL,
    "next_dose_date" TIMESTAMP(3),
    "application_site" TEXT,
    "applied_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "primary_doctor_id" TEXT,
    "primary_nurse_id" TEXT,
    "type" "EncounterType" NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'SCHEDULED',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "location" TEXT,
    "room" TEXT,
    "bed" TEXT,
    "chief_complaint" TEXT,
    "chief_complaint_audio" TEXT,
    "triage_level" "TriageLevel",
    "triage_score" DOUBLE PRECISION,
    "triage_nurse_id" TEXT,
    "triaged_at" TIMESTAMP(3),
    "vitals_at_triage" JSONB,
    "is_follow_up" BOOLEAN NOT NULL DEFAULT false,
    "previous_encounter_id" TEXT,
    "insurance_authorization" TEXT,
    "insurance_guide_number" TEXT,
    "billing_status" "BillingStatusEnum" NOT NULL DEFAULT 'PENDING',
    "total_cost" DECIMAL(65,30),
    "patient_satisfaction_score" INTEGER,
    "ai_summary" TEXT,
    "ai_summary_generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_transcriptions" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "user_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "audio_url" TEXT,
    "audio_duration" DOUBLE PRECISION,
    "audio_format" TEXT,
    "raw_transcription" TEXT,
    "processed_transcription" TEXT,
    "structured_data" JSONB,
    "context" "TranscriptionContext" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "was_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "edited_by_id" TEXT,
    "processing_status" "TranscriptionStatus" NOT NULL DEFAULT 'RECORDING',
    "processing_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_role" "UserRole" NOT NULL,
    "type" "NoteType" NOT NULL,
    "status" "NoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "free_text" TEXT,
    "diagnosis_codes" TEXT[],
    "procedure_codes" TEXT[],
    "voice_transcription_id" TEXT,
    "was_generated_by_ai" BOOLEAN NOT NULL DEFAULT false,
    "ai_model" TEXT,
    "ai_prompt_version" TEXT,
    "signed_at" TIMESTAMP(3),
    "signed_by_id" TEXT,
    "digital_signature_hash" TEXT,
    "cosigned_at" TIMESTAMP(3),
    "cosigned_by_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_note_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "PrescriptionType" NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "voice_transcription_id" TEXT,
    "was_generated_by_ai" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "is_one_time" BOOLEAN NOT NULL DEFAULT false,
    "is_continuous" BOOLEAN NOT NULL DEFAULT false,
    "is_prn" BOOLEAN NOT NULL DEFAULT false,
    "signed_at" TIMESTAMP(3),
    "digital_signature_hash" TEXT,
    "requires_double_check" BOOLEAN NOT NULL DEFAULT false,
    "double_checked_by_id" TEXT,
    "double_checked_at" TIMESTAMP(3),
    "dispensed_at" TIMESTAMP(3),
    "dispensed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "medication_name" TEXT,
    "active_ingredient" TEXT,
    "concentration" TEXT,
    "pharmaceutical_form" TEXT,
    "dose" TEXT,
    "dose_unit" TEXT,
    "route" "MedicationRoute",
    "frequency" TEXT,
    "frequency_hours" INTEGER,
    "custom_schedule" JSONB,
    "duration" TEXT,
    "duration_unit" "DurationUnit",
    "infusion_rate" TEXT,
    "infusion_rate_unit" TEXT,
    "dilution" TEXT,
    "dilution_volume" TEXT,
    "dilution_solution" TEXT,
    "max_daily_dose" TEXT,
    "prn_condition" TEXT,
    "special_instructions" TEXT,
    "exam_name" TEXT,
    "exam_code" TEXT,
    "exam_type" "ExamType",
    "exam_urgency" "Priority",
    "exam_instructions" TEXT,
    "exam_justification" TEXT,
    "procedure_name" TEXT,
    "procedure_code" TEXT,
    "diet_type" TEXT,
    "caloric_target" INTEGER,
    "restrictions" TEXT,
    "supplements" TEXT,
    "is_controlled" BOOLEAN NOT NULL DEFAULT false,
    "controlled_schedule" "ControlledSchedule",
    "is_antibiotic" BOOLEAN NOT NULL DEFAULT false,
    "antibiotic_justification" TEXT,
    "is_high_alert" BOOLEAN NOT NULL DEFAULT false,
    "ai_suggested" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "ai_reasoning" TEXT,
    "interaction_alerts" JSONB,
    "allergy_alerts" JSONB,
    "duplicate_alert" BOOLEAN NOT NULL DEFAULT false,
    "dose_check_result" "DoseCheckResult",
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_checks" (
    "id" TEXT NOT NULL,
    "prescription_item_id" TEXT NOT NULL,
    "nurse_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "checked_at" TIMESTAMP(3),
    "status" "MedCheckStatus" NOT NULL,
    "reason" TEXT,
    "observations" TEXT,
    "vitals_before" JSONB,
    "vitals_after" JSONB,
    "pain_scale_before" INTEGER,
    "pain_scale_after" INTEGER,
    "was_checked_by_voice" BOOLEAN NOT NULL DEFAULT false,
    "lot_number" TEXT,
    "expiration_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "recorded_by_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "mean_arterial_pressure" DOUBLE PRECISION,
    "heart_rate" INTEGER,
    "heart_rhythm" "HeartRhythm",
    "respiratory_rate" INTEGER,
    "respiratory_pattern" TEXT,
    "temperature" DOUBLE PRECISION,
    "temperature_method" "TemperatureMethod",
    "oxygen_saturation" DOUBLE PRECISION,
    "oxygen_supplementation" "OxygenSupplementation",
    "fi_o2" DOUBLE PRECISION,
    "pain_scale" INTEGER,
    "pain_location" TEXT,
    "pain_type" TEXT,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "head_circumference" DOUBLE PRECISION,
    "abdominal_circumference" DOUBLE PRECISION,
    "glucose_level" DOUBLE PRECISION,
    "glucose_context" "GlucoseContext",
    "gcs" INTEGER,
    "gcs_eye" INTEGER,
    "gcs_verbal" INTEGER,
    "gcs_motor" INTEGER,
    "pupil_left" TEXT,
    "pupil_right" TEXT,
    "pupil_reactivity" TEXT,
    "capillary_refill" TEXT,
    "edema" "Edema",
    "edema_location" TEXT,
    "diuresis_24h" DOUBLE PRECISION,
    "fluid_balance" DOUBLE PRECISION,
    "ai_alerts" JSONB,
    "ai_trend" "AiTrend",
    "ai_trend_confidence" DOUBLE PRECISION,
    "source" "VitalSource" NOT NULL DEFAULT 'MANUAL',
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_assessments" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "nurse_id" TEXT NOT NULL,
    "protocol" "TriageProtocol" NOT NULL DEFAULT 'MANCHESTER',
    "chief_complaint" TEXT NOT NULL,
    "symptom_onset" TEXT,
    "symptom_duration" TEXT,
    "pain_scale" INTEGER,
    "pain_location" TEXT,
    "pain_character" TEXT,
    "discriminators" JSONB,
    "selected_discriminator" TEXT,
    "level" "TriageLevel" NOT NULL,
    "level_description" TEXT,
    "max_wait_time_minutes" INTEGER,
    "reassessment_time_minutes" INTEGER,
    "ai_suggested_level" "TriageLevel",
    "ai_confidence" DOUBLE PRECISION,
    "ai_reasoning" TEXT,
    "ai_red_flags" JSONB,
    "overridden_by_nurse" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "vital_signs_id" TEXT,
    "voice_transcription_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "admitting_doctor_id" TEXT NOT NULL,
    "attending_doctor_id" TEXT,
    "admission_date" TIMESTAMP(3) NOT NULL,
    "expected_discharge_date" TIMESTAMP(3),
    "actual_discharge_date" TIMESTAMP(3),
    "admission_type" "AdmissionType" NOT NULL,
    "current_bed_id" TEXT,
    "admission_bed_id" TEXT,
    "isolation_required" BOOLEAN NOT NULL DEFAULT false,
    "isolation_type" "IsolationType",
    "aih_number" TEXT,
    "aih_authorized_at" TIMESTAMP(3),
    "diagnosis_at_admission" TEXT,
    "diagnosis_at_discharge" TEXT,
    "procedure_performed" TEXT,
    "discharge_type" "DischargeType",
    "discharge_notes" TEXT,
    "discharge_prescription" TEXT,
    "discharge_instructions" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "ai_length_of_stay_prediction" DOUBLE PRECISION,
    "ai_readmission_risk" DOUBLE PRECISION,
    "ai_discharge_plan_suggestion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "bed_number" TEXT NOT NULL,
    "floor" TEXT,
    "type" "BedType" NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_patient_id" TEXT,
    "current_admission_id" TEXT,
    "equipment" JSONB,
    "last_cleaned_at" TIMESTAMP(3),
    "last_maintenance_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_transfers" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "from_bed_id" TEXT NOT NULL,
    "to_bed_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "executed_by_id" TEXT,
    "reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_processes" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "nurse_id" TEXT NOT NULL,
    "status" "NursingProcessStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "data_collection_notes" TEXT,
    "data_collection_voice_id" TEXT,
    "evaluation_notes" TEXT,
    "evaluation_voice_id" TEXT,
    "evaluated_at" TIMESTAMP(3),
    "ai_suggested_diagnoses" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursing_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_diagnoses" (
    "id" TEXT NOT NULL,
    "nursing_process_id" TEXT NOT NULL,
    "nanda_code" TEXT,
    "nanda_domain" TEXT,
    "nanda_class" TEXT,
    "nanda_title" TEXT NOT NULL,
    "related_factors" TEXT[],
    "risk_factors" TEXT[],
    "defining_characteristics" TEXT[],
    "status" "NursingDxStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "NursingPriority" NOT NULL,
    "ai_suggested" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "nursing_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_outcomes" (
    "id" TEXT NOT NULL,
    "nursing_diagnosis_id" TEXT NOT NULL,
    "noc_code" TEXT,
    "noc_title" TEXT NOT NULL,
    "baseline_score" INTEGER NOT NULL,
    "target_score" INTEGER NOT NULL,
    "current_score" INTEGER NOT NULL,
    "indicators" JSONB,
    "evaluation_frequency" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursing_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_interventions" (
    "id" TEXT NOT NULL,
    "nursing_diagnosis_id" TEXT NOT NULL,
    "nic_code" TEXT,
    "nic_title" TEXT NOT NULL,
    "activities" JSONB,
    "status" "InterventionStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "voice_transcription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursing_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_notes" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "nurse_id" TEXT NOT NULL,
    "type" "NursingNoteType" NOT NULL,
    "content" TEXT NOT NULL,
    "voice_transcription_id" TEXT,
    "signed_at" TIMESTAMP(3),
    "digital_signature_hash" TEXT,
    "shift" "Shift" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nursing_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluid_balances" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "nurse_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "period" TEXT,
    "intake_oral" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "intake_iv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "intake_other" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "intake_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "output_urine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "output_drain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "output_emesis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "output_stool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "output_other" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "output_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cumulative_balance_24h" DOUBLE PRECISION,
    "ai_alert" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fluid_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgical_procedures" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "surgeon_id" TEXT NOT NULL,
    "first_assistant_id" TEXT,
    "anesthesiologist_id" TEXT,
    "scrub_nurse_id" TEXT,
    "circulating_nurse_id" TEXT,
    "procedure_name" TEXT NOT NULL,
    "procedure_code" TEXT,
    "laterality" "Laterality",
    "anesthesia_type" "AnesthesiaType",
    "scheduled_at" TIMESTAMP(3),
    "patient_in_at" TIMESTAMP(3),
    "anesthesia_start_at" TIMESTAMP(3),
    "incision_at" TIMESTAMP(3),
    "suture_at" TIMESTAMP(3),
    "anesthesia_end_at" TIMESTAMP(3),
    "patient_out_at" TIMESTAMP(3),
    "safety_checklist_before" JSONB,
    "safety_checklist_during" JSONB,
    "safety_checklist_after" JSONB,
    "surgical_description" TEXT,
    "surgical_description_voice_id" TEXT,
    "complications" TEXT,
    "blood_loss" INTEGER,
    "implants" JSONB,
    "pathology_samples" JSONB,
    "status" "SurgicalStatus" NOT NULL DEFAULT 'SCHEDULED',
    "ai_surgical_risk" TEXT,
    "ai_anticipated_complications" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surgical_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "exam_name" TEXT NOT NULL,
    "exam_code" TEXT,
    "exam_type" "ExamType" NOT NULL,
    "requested_by_id" TEXT,
    "requested_at" TIMESTAMP(3),
    "lab_results" JSONB,
    "image_url" TEXT,
    "image_modality" "ImageModality",
    "radiologist_report" TEXT,
    "status" "ExamStatus" NOT NULL DEFAULT 'REQUESTED',
    "collected_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "ai_interpretation" TEXT,
    "ai_alerts" JSONB,
    "ai_trend_comparison" JSONB,
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_documents" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "template_id" TEXT,
    "generated_by_ai" BOOLEAN NOT NULL DEFAULT false,
    "voice_transcription_id" TEXT,
    "signed_at" TIMESTAMP(3),
    "signed_by_id" TEXT,
    "digital_signature_hash" TEXT,
    "patient_signed_at" TIMESTAMP(3),
    "patient_signature" TEXT,
    "witness_signed_at" TIMESTAMP(3),
    "witness_name" TEXT,
    "pdf_url" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "source" "AlertSource" NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL,
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by_id" TEXT,
    "action_taken" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "read_aloud" BOOLEAN NOT NULL DEFAULT false,
    "tts_audio_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "action_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "patient_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "previous_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_id" TEXT,
    "geolocation" TEXT,
    "session_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "consent_text" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "ip_address" TEXT,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_access_requests" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "type" "DataRequestType" NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "response_notes" TEXT,
    "processed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "actual_start_at" TIMESTAMP(3),
    "actual_end_at" TIMESTAMP(3),
    "location" TEXT,
    "room" TEXT,
    "is_telemedicine" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "confirmation_method" TEXT,
    "reminder_sent_at" TIMESTAMP(3),
    "ai_suggested_slot" BOOLEAN NOT NULL DEFAULT false,
    "ai_no_show_prediction" DOUBLE PRECISION,
    "notes" TEXT,
    "cancellation_reason" TEXT,
    "encounter_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_entries" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "insurance_provider" TEXT,
    "plan_type" TEXT,
    "guide_number" TEXT,
    "guide_type" "GuideType",
    "items" JSONB,
    "total_amount" DECIMAL(65,30),
    "glosed_amount" DECIMAL(65,30),
    "approved_amount" DECIMAL(65,30),
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "tiss_xml" TEXT,
    "ai_coding_suggestions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_cnpj_idx" ON "tenants"("cnpj");

-- CreateIndex
CREATE INDEX "tenants_is_active_idx" ON "tenants"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE INDEX "users_tenant_id_email_idx" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "users_tenant_id_cpf_idx" ON "users"("tenant_id", "cpf");

-- CreateIndex
CREATE INDEX "users_tenant_id_role_idx" ON "users"("tenant_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_user_id_key" ON "doctor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nurse_profiles_user_id_key" ON "nurse_profiles"("user_id");

-- CreateIndex
CREATE INDEX "professional_schedules_professional_id_day_of_week_idx" ON "professional_schedules"("professional_id", "day_of_week");

-- CreateIndex
CREATE INDEX "patients_tenant_id_cpf_idx" ON "patients"("tenant_id", "cpf");

-- CreateIndex
CREATE INDEX "patients_tenant_id_full_name_idx" ON "patients"("tenant_id", "full_name");

-- CreateIndex
CREATE INDEX "patients_cns_idx" ON "patients"("cns");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tenant_id_mrn_key" ON "patients"("tenant_id", "mrn");

-- CreateIndex
CREATE INDEX "allergies_patient_id_status_idx" ON "allergies"("patient_id", "status");

-- CreateIndex
CREATE INDEX "chronic_conditions_patient_id_status_idx" ON "chronic_conditions"("patient_id", "status");

-- CreateIndex
CREATE INDEX "family_histories_patient_id_idx" ON "family_histories"("patient_id");

-- CreateIndex
CREATE INDEX "surgical_histories_patient_id_idx" ON "surgical_histories"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_histories_patient_id_key" ON "social_histories"("patient_id");

-- CreateIndex
CREATE INDEX "vaccinations_patient_id_idx" ON "vaccinations"("patient_id");

-- CreateIndex
CREATE INDEX "encounters_tenant_id_status_idx" ON "encounters"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "encounters_tenant_id_patient_id_idx" ON "encounters"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "encounters_tenant_id_primary_doctor_id_idx" ON "encounters"("tenant_id", "primary_doctor_id");

-- CreateIndex
CREATE INDEX "encounters_tenant_id_scheduled_at_idx" ON "encounters"("tenant_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "encounters_patient_id_created_at_idx" ON "encounters"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "voice_transcriptions_encounter_id_context_idx" ON "voice_transcriptions"("encounter_id", "context");

-- CreateIndex
CREATE INDEX "clinical_notes_encounter_id_type_idx" ON "clinical_notes"("encounter_id", "type");

-- CreateIndex
CREATE INDEX "clinical_notes_encounter_id_author_id_idx" ON "clinical_notes"("encounter_id", "author_id");

-- CreateIndex
CREATE INDEX "prescriptions_encounter_id_type_idx" ON "prescriptions"("encounter_id", "type");

-- CreateIndex
CREATE INDEX "prescriptions_patient_id_status_idx" ON "prescriptions"("patient_id", "status");

-- CreateIndex
CREATE INDEX "prescriptions_tenant_id_status_idx" ON "prescriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");

-- CreateIndex
CREATE INDEX "medication_checks_prescription_item_id_scheduled_at_idx" ON "medication_checks"("prescription_item_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "vital_signs_patient_id_recorded_at_idx" ON "vital_signs"("patient_id", "recorded_at");

-- CreateIndex
CREATE INDEX "vital_signs_encounter_id_recorded_at_idx" ON "vital_signs"("encounter_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "triage_assessments_encounter_id_key" ON "triage_assessments"("encounter_id");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_encounter_id_key" ON "admissions"("encounter_id");

-- CreateIndex
CREATE INDEX "admissions_tenant_id_admission_date_idx" ON "admissions"("tenant_id", "admission_date");

-- CreateIndex
CREATE INDEX "admissions_patient_id_idx" ON "admissions"("patient_id");

-- CreateIndex
CREATE INDEX "beds_tenant_id_status_idx" ON "beds"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "beds_tenant_id_ward_room_bed_number_key" ON "beds"("tenant_id", "ward", "room", "bed_number");

-- CreateIndex
CREATE INDEX "nursing_processes_encounter_id_idx" ON "nursing_processes"("encounter_id");

-- CreateIndex
CREATE INDEX "nursing_processes_patient_id_idx" ON "nursing_processes"("patient_id");

-- CreateIndex
CREATE INDEX "nursing_diagnoses_nursing_process_id_idx" ON "nursing_diagnoses"("nursing_process_id");

-- CreateIndex
CREATE INDEX "nursing_outcomes_nursing_diagnosis_id_idx" ON "nursing_outcomes"("nursing_diagnosis_id");

-- CreateIndex
CREATE INDEX "nursing_interventions_nursing_diagnosis_id_idx" ON "nursing_interventions"("nursing_diagnosis_id");

-- CreateIndex
CREATE INDEX "nursing_notes_encounter_id_shift_idx" ON "nursing_notes"("encounter_id", "shift");

-- CreateIndex
CREATE INDEX "fluid_balances_encounter_id_idx" ON "fluid_balances"("encounter_id");

-- CreateIndex
CREATE INDEX "fluid_balances_patient_id_idx" ON "fluid_balances"("patient_id");

-- CreateIndex
CREATE INDEX "surgical_procedures_tenant_id_scheduled_at_idx" ON "surgical_procedures"("tenant_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "exam_results_patient_id_exam_type_idx" ON "exam_results"("patient_id", "exam_type");

-- CreateIndex
CREATE INDEX "exam_results_patient_id_created_at_idx" ON "exam_results"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "clinical_documents_patient_id_idx" ON "clinical_documents"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_documents_tenant_id_type_idx" ON "clinical_documents"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "document_templates_tenant_id_type_idx" ON "document_templates"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "clinical_alerts_tenant_id_is_active_idx" ON "clinical_alerts"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "clinical_alerts_patient_id_is_active_idx" ON "clinical_alerts"("patient_id", "is_active");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_timestamp_idx" ON "audit_logs"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_patient_id_timestamp_idx" ON "audit_logs"("patient_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "consent_records_patient_id_idx" ON "consent_records"("patient_id");

-- CreateIndex
CREATE INDEX "data_access_requests_patient_id_idx" ON "data_access_requests"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_doctor_id_scheduled_at_idx" ON "appointments"("tenant_id", "doctor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_patient_id_idx" ON "appointments"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_status_idx" ON "appointments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "billing_entries_tenant_id_status_idx" ON "billing_entries"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurse_profiles" ADD CONSTRAINT "nurse_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_schedules" ADD CONSTRAINT "professional_schedules_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chronic_conditions" ADD CONSTRAINT "chronic_conditions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chronic_conditions" ADD CONSTRAINT "chronic_conditions_diagnosed_by_id_fkey" FOREIGN KEY ("diagnosed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_histories" ADD CONSTRAINT "family_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_histories" ADD CONSTRAINT "surgical_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_histories" ADD CONSTRAINT "social_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_applied_by_id_fkey" FOREIGN KEY ("applied_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_primary_doctor_id_fkey" FOREIGN KEY ("primary_doctor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_primary_nurse_id_fkey" FOREIGN KEY ("primary_nurse_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_triage_nurse_id_fkey" FOREIGN KEY ("triage_nurse_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_previous_encounter_id_fkey" FOREIGN KEY ("previous_encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_cosigned_by_id_fkey" FOREIGN KEY ("cosigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_voice_transcription_id_fkey" FOREIGN KEY ("voice_transcription_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_parent_note_id_fkey" FOREIGN KEY ("parent_note_id") REFERENCES "clinical_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_voice_transcription_id_fkey" FOREIGN KEY ("voice_transcription_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_double_checked_by_id_fkey" FOREIGN KEY ("double_checked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_dispensed_by_id_fkey" FOREIGN KEY ("dispensed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_checks" ADD CONSTRAINT "medication_checks_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_checks" ADD CONSTRAINT "medication_checks_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_assessments" ADD CONSTRAINT "triage_assessments_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_assessments" ADD CONSTRAINT "triage_assessments_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_assessments" ADD CONSTRAINT "triage_assessments_vital_signs_id_fkey" FOREIGN KEY ("vital_signs_id") REFERENCES "vital_signs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_assessments" ADD CONSTRAINT "triage_assessments_voice_transcription_id_fkey" FOREIGN KEY ("voice_transcription_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_admitting_doctor_id_fkey" FOREIGN KEY ("admitting_doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_attending_doctor_id_fkey" FOREIGN KEY ("attending_doctor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_current_bed_id_fkey" FOREIGN KEY ("current_bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_admission_bed_id_fkey" FOREIGN KEY ("admission_bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_current_patient_id_fkey" FOREIGN KEY ("current_patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfers" ADD CONSTRAINT "bed_transfers_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfers" ADD CONSTRAINT "bed_transfers_from_bed_id_fkey" FOREIGN KEY ("from_bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfers" ADD CONSTRAINT "bed_transfers_to_bed_id_fkey" FOREIGN KEY ("to_bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfers" ADD CONSTRAINT "bed_transfers_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfers" ADD CONSTRAINT "bed_transfers_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfers" ADD CONSTRAINT "bed_transfers_executed_by_id_fkey" FOREIGN KEY ("executed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_processes" ADD CONSTRAINT "nursing_processes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_processes" ADD CONSTRAINT "nursing_processes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_processes" ADD CONSTRAINT "nursing_processes_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_processes" ADD CONSTRAINT "nursing_processes_data_collection_voice_id_fkey" FOREIGN KEY ("data_collection_voice_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_processes" ADD CONSTRAINT "nursing_processes_evaluation_voice_id_fkey" FOREIGN KEY ("evaluation_voice_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_diagnoses" ADD CONSTRAINT "nursing_diagnoses_nursing_process_id_fkey" FOREIGN KEY ("nursing_process_id") REFERENCES "nursing_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_outcomes" ADD CONSTRAINT "nursing_outcomes_nursing_diagnosis_id_fkey" FOREIGN KEY ("nursing_diagnosis_id") REFERENCES "nursing_diagnoses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_interventions" ADD CONSTRAINT "nursing_interventions_nursing_diagnosis_id_fkey" FOREIGN KEY ("nursing_diagnosis_id") REFERENCES "nursing_diagnoses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_interventions" ADD CONSTRAINT "nursing_interventions_voice_transcription_id_fkey" FOREIGN KEY ("voice_transcription_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_voice_transcription_id_fkey" FOREIGN KEY ("voice_transcription_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluid_balances" ADD CONSTRAINT "fluid_balances_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluid_balances" ADD CONSTRAINT "fluid_balances_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluid_balances" ADD CONSTRAINT "fluid_balances_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_surgeon_id_fkey" FOREIGN KEY ("surgeon_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_first_assistant_id_fkey" FOREIGN KEY ("first_assistant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_anesthesiologist_id_fkey" FOREIGN KEY ("anesthesiologist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_scrub_nurse_id_fkey" FOREIGN KEY ("scrub_nurse_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_circulating_nurse_id_fkey" FOREIGN KEY ("circulating_nurse_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_procedures" ADD CONSTRAINT "surgical_procedures_surgical_description_voice_id_fkey" FOREIGN KEY ("surgical_description_voice_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_voice_transcription_id_fkey" FOREIGN KEY ("voice_transcription_id") REFERENCES "voice_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_requests" ADD CONSTRAINT "data_access_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_requests" ADD CONSTRAINT "data_access_requests_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_entries" ADD CONSTRAINT "billing_entries_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_entries" ADD CONSTRAINT "billing_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_entries" ADD CONSTRAINT "billing_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

