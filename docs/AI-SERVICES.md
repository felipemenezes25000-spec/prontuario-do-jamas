# VoxPEP AI Services Documentation

## Overview

VoxPEP uses AI in every layer of the application to automate clinical documentation, enhance patient safety, support clinical decision-making, and streamline administrative workflows. All AI services follow a dual-provider strategy (OpenAI primary, Google Gemini fallback) with safe defaults on failure.

## Services

### 1. VoiceEngine

- **Purpose:** Speech-to-text transcription of clinical dictation
- **Primary:** OpenAI Whisper API (`whisper-1`)
- **Fallback:** Google Speech-to-Text v2
- **Input:** Audio buffer (WebM/M4A/MP3)
- **Output:** `{ text, confidence, duration }`
- **Features:**
  - Context prompts customized for each medical scenario (SOAP, triage, prescription, surgical)
  - Portuguese (pt-BR) language optimized
  - Medical terminology vocabulary boosting
- **Rate limit:** 60 minutes of audio per user per day

### 2. MedicalNER

- **Purpose:** Named Entity Recognition for medical text in Portuguese
- **Model:** GPT-4o with structured JSON output
- **Extracts:**
  - Symptoms (with onset, severity, duration)
  - Vital signs (with values and units)
  - Diagnoses (with CID-10 codes)
  - Medications (name, dose, route, frequency)
  - Exam requests
  - Red flags (critical findings requiring immediate attention)
- **Temperature:** 0.1 (high accuracy mode)

### 3. SOAPGenerator

- **Purpose:** Generate structured SOAP clinical notes from voice transcription
- **Input:** Raw transcription text + patient context (allergies, conditions, medications)
- **Output:** Structured SOAP note with:
  - Subjective, Objective, Assessment, Plan sections
  - Suggested diagnosis codes (CID-10)
  - Suggested exams
  - Suggested medications
- **Standards:** Follows CFM (Conselho Federal de Medicina) and CRM documentation guidelines
- **Temperature:** 0.2

### 4. PrescriptionAI

Three sub-services:

- **parseVoicePrescription:** Converts natural language dictation into structured prescription objects (medication name, dose, route, frequency, duration, instructions)
- **suggestMedications:** Provides diagnosis-based medication suggestions using current clinical protocols
- **checkSafety:** Validates prescriptions against:
  - Drug-drug interactions
  - Drug-allergy conflicts
  - Dose limit verification
  - Beers criteria (geriatric patients)
  - Pediatric dose adjustments
  - Renal/hepatic dose adjustments

### 5. TriageAI

- **Purpose:** Manchester Protocol triage classification via AI analysis
- **Input:** Chief complaint, vital signs, symptoms, patient history
- **Output:** Triage color classification (RED/ORANGE/YELLOW/GREEN/BLUE) with reasoning
- **Safety features:**
  - Hardcoded red-flag rules for critical vitals override AI classification
  - Defaults to YELLOW on any error (safety-first principle)
  - Never downgrades from a higher acuity determined by vital sign rules

### 6. DischargeAI

- **Purpose:** Generate discharge documentation
- **Outputs:**
  - **Professional summary:** Complete discharge summary compliant with CFM and ANS (Agencia Nacional de Saude Suplementar) standards
  - **Patient instructions:** Plain-language discharge instructions written at a 5th-grade reading level, including medication schedules, warning signs, and follow-up appointments

### 7. ClinicalCopilot

- **Purpose:** Real-time clinical decision support during encounters
- **Triggers:** Runs during active consultations to provide contextual suggestions
- **Suggestion types:**
  - Overdue screenings (e.g., mammography, colonoscopy by age/risk)
  - Drug interaction warnings
  - Clinical protocol recommendations
  - Preventive care reminders
  - Relevant guideline references
- **Constraints:** Maximum 8 suggestions per invocation, priority-ordered by clinical relevance

### 8. PatientSummaryAI

- **Purpose:** Instant patient summary generation for quick context
- **Output:** 3-5 sentence narrative summary of the patient's current clinical status
- **Special formatting:** `[ATENCAO:]` flags prepended for urgent findings (critical labs, overdue medications, active alerts)

### 9. CodingAI

- **Purpose:** Automated medical coding from clinical notes
- **Codes generated:**
  - **TUSS** (Terminologia Unificada da Saude Suplementar) procedure codes
  - **CID-10** diagnosis codes
- **Output:** Confidence-scored results allowing human review of low-confidence suggestions
- **Temperature:** 0.1 (precision-focused)

### 10. HandoffAI

- **Purpose:** Shift handoff summary generation for nursing and medical teams
- **Output:**
  - Per-patient summary of current status and recent changes
  - Critical items requiring immediate attention
  - Pending tasks and orders
  - Scheduled procedures and appointments
- **Temperature:** 0.2

### 11. PredictiveAI

- **Purpose:** Clinical risk prediction models
- **Models:**
  - **Readmission risk:** Based on HOSPITAL/LACE score methodology
  - **Deterioration risk:** Based on MEWS (Modified Early Warning Score) parameters
  - **Length of stay prediction:** Diagnosis and acuity-based estimation
- **Output:** Risk scores (0-100) with contributing factors and recommended interventions
- **Temperature:** 0.1

## Error Handling Strategy

All AI services follow a consistent error handling pattern:

1. **Try** OpenAI (primary provider)
2. **Catch** failure, **try** Google Gemini (fallback provider)
3. **Catch** all failures, **return safe default**

Safe defaults by service:

| Service | Default on Failure |
|---------|-------------------|
| TriageAI | YELLOW classification (medium acuity) |
| PrescriptionAI (safety) | UNSAFE flag (conservative) |
| ClinicalCopilot | Empty suggestions array |
| PatientSummaryAI | "Summary unavailable" message |
| All others | Empty/null result with error logged |

All failures are logged with full context (request payload hash, error type, provider, latency) for observability.

## Model Configuration

| Service | Model | Temperature | Output Format |
|---------|-------|-------------|---------------|
| VoiceEngine | whisper-1 | N/A | verbose_json |
| MedicalNER | gpt-4o | 0.1 | json_object |
| SOAPGenerator | gpt-4o | 0.2 | json_object |
| PrescriptionAI | gpt-4o | 0.1 | json_object |
| TriageAI | gpt-4o | 0.1 | json_object |
| DischargeAI | gpt-4o | 0.3 | json_object |
| ClinicalCopilot | gpt-4o | 0.2 | json_object |
| PatientSummaryAI | gpt-4o | 0.2 | text |
| CodingAI | gpt-4o | 0.1 | json_object |
| HandoffAI | gpt-4o | 0.2 | json_object |
| PredictiveAI | gpt-4o | 0.1 | json_object |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for all AI services | Yes |
| `GOOGLE_AI_API_KEY` | Google Gemini API key (fallback) | Recommended |
| `ELASTICSEARCH_URL` | Elasticsearch connection URL | No (defaults to localhost:9200) |
