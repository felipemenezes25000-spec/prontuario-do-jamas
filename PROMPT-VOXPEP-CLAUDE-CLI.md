# VOXPEP — PROMPT COMPLETO PARA CLAUDE CLI

> **Como usar:** Cole este prompt INTEIRO no Claude Code (Claude CLI) como instrução inicial do projeto. Ele é auto-contido e define TUDO que o sistema precisa ter. Peça para o Claude CLI executar seção por seção, começando pela Parte 1.

---

## IDENTIDADE DO PROJETO

**Nome:** VoxPEP
**Tagline:** "Fale. O prontuário escuta."
**Tipo:** Prontuário Eletrônico do Paciente (PEP) — produto standalone, SaaS multi-tenant
**Público:** Hospitais e clínicas privadas no Brasil
**Diferencial:** Voice-First + IA em absolutamente tudo. O profissional de saúde NÃO digita — ele FALA.
**Benchmark:** Superar o MV Soul PEP (8× melhor da América Latina pela KLAS Research) em funcionalidades, UX e inteligência.
**Licença:** Produto proprietário, código fechado.

---

## FILOSOFIA DE DESIGN — AS 5 LEIS DO VOXPEP

```
LEI 1: VOZ PRIMEIRO, TECLADO NUNCA
   → Todo campo, formulário, evolução, prescrição e documento pode ser preenchido por voz.
   → O microfone é o input primário. O teclado é fallback para edição fina.
   → O profissional fala naturalmente em português brasileiro. A IA entende contexto médico.

LEI 2: IA EM TODA CAMADA
   → Não existe funcionalidade "burra". Toda tela tem alguma camada de inteligência:
     - Autocompletar preditivo
     - Sugestão de diagnóstico
     - Pré-preenchimento baseado em histórico
     - Detecção de anomalias
     - Alertas proativos
     - Resumo automático

LEI 3: ZERO RETRABALHO
   → Informação inserida uma vez flui para todos os módulos automaticamente.
   → Nunca pedir dado que o sistema já tem.
   → Copiar/colar de prontuário é antipadrão — a IA gera texto original baseado no contexto.

LEI 4: TEMPO REAL OU NADA
   → Tudo é WebSocket/SSE. Mudanças propagam instantaneamente.
   → Checagem feita pelo enfermeiro aparece no médico em <1 segundo.
   → Resultados de exame entram no prontuário automaticamente.

LEI 5: REGULAMENTADO MAS NÃO ENGESSADO
   → 100% conforme CFM, SBIS (NGS1+NGS2), LGPD, COFEN, ANVISA.
   → Mas a UX é moderna, limpa, rápida — não parece software dos anos 2000.
```

---

## STACK TECNOLÓGICO COMPLETO

### Backend
```
Runtime:         Node.js 22 LTS
Framework:       NestJS 11 (TypeScript)
Arquitetura:     Clean Architecture + CQRS + Event Sourcing
ORM:             Prisma 6 (PostgreSQL)
Validação:       class-validator + class-transformer + zod
Autenticação:    JWT + Refresh Token + OAuth2 (Google) + MFA (TOTP)
Real-time:       Socket.IO (WebSocket + fallback long-polling)
Filas:           BullMQ + Redis (jobs assíncronos de IA, transcrição, notificações)
Cache:           Redis 7
Busca:           Elasticsearch 8 (busca semântica em prontuários)
Documentação:    Swagger/OpenAPI 3.1 auto-gerado
Testes:          Jest + Supertest (unitários + integração) — cobertura mínima 80%
Linting:         ESLint + Prettier (config strict)
```

### Frontend Web (Médicos + Admin)
```
Framework:       React 19 + TypeScript 5.5
Build:           Vite 6
Estilo:          Tailwind CSS 4 + shadcn/ui (componentes base)
Estado:          Zustand (global) + TanStack Query v5 (servidor)
Formulários:     React Hook Form + Zod
Tabelas:         TanStack Table v8
Gráficos:        Recharts
Real-time:       Socket.IO Client
Voz:             Web Speech API (recognition) + MediaRecorder API (gravação)
Roteamento:      React Router v7
Internacionalização: Apenas pt-BR (hardcoded, sem i18n)
```

### Frontend Mobile (Pacientes + Médicos mobile)
```
Framework:       Expo SDK 52 + React Native
Navegação:       Expo Router v4
Estado:          Zustand + TanStack Query v5
Voz:             expo-av (gravação) + envio para Whisper API
Push:            Expo Notifications
Storage local:   expo-secure-store (tokens) + MMKV (cache)
```

### Infraestrutura
```
Cloud:           AWS (sa-east-1 — São Paulo)
Banco:           PostgreSQL 16 no RDS (Multi-AZ)
Cache/Filas:     ElastiCache Redis 7
Storage:         S3 (buckets: voxpep-documents, voxpep-audio, voxpep-images, voxpep-exports)
CDN:             CloudFront
Containers:      ECS Fargate (auto-scaling)
CI/CD:           GitHub Actions (lint → test → build → deploy)
Monitoramento:   Sentry + CloudWatch + Grafana
Logs:            CloudWatch Logs → Elasticsearch
Secrets:         AWS SSM Parameter Store
DNS:             Route 53
SSL:             ACM (certificados auto-renovados)
```

### IA e Voz
```
Speech-to-Text:  OpenAI Whisper API (primário) + Google Speech-to-Text v2 (fallback)
LLM:             OpenAI GPT-4o (primário) + Google Gemini 2.0 Flash (fallback)
Text-to-Speech:  OpenAI TTS (para leitura de alertas e confirmações de voz)
Embeddings:      OpenAI text-embedding-3-small (busca semântica em prontuários)
OCR:             AWS Textract (digitalização de documentos/receitas externas)
NER Médico:      Modelo customizado fine-tuned para extrair: CID-10, medicamentos (DCB/ANVISA), dosagens, frequências, diagnósticos, sinais vitais
```

### Assinatura Digital
```
Padrão:          ICP-Brasil (certificado digital A1/A3)
Formato:         CAdES / PAdES (PDF assinado)
Verificação:     SHA-256 + timestamp RFC 3161
Fallback:        Assinatura eletrônica avançada (biometria + geolocalização + device fingerprint) conforme MP 2200-2/2001 Art. 10 §2
```

---

## PARTE 1 — MODELAGEM DE DADOS (PRISMA SCHEMA)

Crie o arquivo `prisma/schema.prisma` com TODAS as entidades abaixo. Use UUIDs como PK, `createdAt`/`updatedAt` em tudo, soft-delete (`deletedAt`) onde indicado. Multi-tenant via campo `tenantId` em todas as tabelas.

### 1.1 Multi-Tenancy & Configuração

```
Tenant {
  id, name, slug (único), cnpj, type (HOSPITAL | CLINIC | NETWORK),
  address, city, state, cep, phone, email, website,
  logo (S3 URL), primaryColor, secondaryColor,
  cnesCode (Cadastro Nacional de Estabelecimentos de Saúde),
  sbisLevel (NGS1 | NGS2 | NONE),
  maxBeds, maxUsers, plan (FREE | STARTER | PRO | ENTERPRISE),
  subscriptionExpiresAt, isActive, settings (JSON — configurações customizáveis),
  createdAt, updatedAt, deletedAt
}

TenantSettings (JSON dentro de Tenant.settings) {
  prescriptionDefaults: { defaultDuration, requireDoubleCheck, allowVerbalOrders },
  voiceSettings: { autoTranscribe, language: "pt-BR", silenceTimeout: 3000 },
  alertSettings: { allergySeverity, interactionLevel, duplicateWindow },
  shiftConfig: { morningStart, afternoonStart, nightStart },
  classificationProtocol: "MANCHESTER" | "STM" | "CUSTOM",
  requireDigitalSignature: boolean,
  autoSoapNotes: boolean,
  aiAssistedDiagnosis: boolean
}
```

### 1.2 Usuários & Profissionais

```
User {
  id, tenantId, email, passwordHash, name, cpf, phone,
  role (ADMIN | DOCTOR | NURSE | NURSE_TECH | PHARMACIST | RECEPTIONIST | LAB_TECH | RADIOLOGIST | NUTRITIONIST | PHYSIO | PSYCHOLOGIST | SOCIAL_WORKER | BILLING),
  avatar (S3), isActive, mfaEnabled, mfaSecret,
  lastLoginAt, loginCount, preferredDevice,
  voiceProfileId (para reconhecimento de voz futuro),
  settings (JSON: { theme, fontSize, voiceSpeed, autoListen }),
  createdAt, updatedAt, deletedAt
}

DoctorProfile {
  id, userId, crm, crmState, specialty (enum), subSpecialties (array),
  medicalSchool, graduationYear, titlePrefix ("Dr." | "Dra."),
  digitalCertificateSerial, digitalCertificateExpiry,
  signatureImage (S3), stampImage (S3),
  consultationDuration (default em minutos), maxDailyPatients,
  teleconsultationEnabled, personalBio,
  prescriptionHeader (texto padrão),
  favoritesMedications (JSON — lista de medicamentos mais usados),
  favoritesDiagnoses (JSON — CIDs mais usados),
  favoritesExams (JSON — exames mais solicitados),
  favoritesTemplates (JSON — templates de evolução preferidos),
  aiPersonalization (JSON — preferências de como a IA gera textos para este médico)
}

NurseProfile {
  id, userId, coren, corenState, specialization,
  canPrescribeNursing (bool), shiftPreference,
  certifications (JSON array)
}

ProfessionalSchedule {
  id, professionalId, dayOfWeek, startTime, endTime,
  location (room/bed/sector), isTelemedicine,
  slotDuration, breakStart, breakEnd
}
```

### 1.3 Paciente & Prontuário Master

```
Patient {
  id, tenantId, mrn (Medical Record Number — gerado sequencial por tenant),
  fullName, socialName (nome social), cpf, rg, cns,
  birthDate, gender (M | F | NB | OTHER), genderIdentity, pronouns,
  maritalStatus, nationality, ethnicity, education, occupation,
  phone, phoneSecondary, email,
  address, addressNumber, addressComplement, neighborhood, city, state, cep,
  photo (S3), bloodType, rhFactor,
  organDonor, advanceDirectives,
  motherName, fatherName,
  insuranceProvider, insurancePlan, insuranceNumber, insuranceExpiry,
  preferredPharmacy, preferredLab,
  emergencyContactName, emergencyContactPhone, emergencyContactRelation,
  isActive, isDeceased, deceasedAt, causeOfDeath,
  consentLGPD (bool), consentLGPDAt, consentTelemedicine,
  tags (array — ex: "gestante", "oncológico", "paliativo", "diabético"),
  riskScore (0-100, calculado por IA),
  lastVisitAt, totalVisits,
  createdAt, updatedAt, deletedAt
}

Allergy {
  id, patientId, substance, type (MEDICATION | FOOD | ENVIRONMENTAL | LATEX | CONTRAST | OTHER),
  severity (MILD | MODERATE | SEVERE | ANAPHYLAXIS),
  reaction, onsetDate, confirmedBy (doctorId), status (ACTIVE | RESOLVED | ERROR),
  source (PATIENT_REPORT | LAB_CONFIRMED | AI_SUGGESTED),
  notes, recordedByVoice (bool),
  createdAt, updatedAt
}

ChronicCondition {
  id, patientId, cidCode, cidDescription, diagnosedAt, diagnosedBy,
  status (ACTIVE | CONTROLLED | REMISSION | RESOLVED),
  severity, currentTreatment, notes,
  createdAt, updatedAt
}

FamilyHistory {
  id, patientId, condition, cidCode, relationship (FATHER | MOTHER | SIBLING | etc),
  ageOfOnset, isDeceased, causeOfDeath, notes,
  createdAt
}

SurgicalHistory {
  id, patientId, procedure, date, hospital, surgeon, anesthesiaType,
  complications, notes,
  createdAt
}

SocialHistory {
  id, patientId, smoking (NEVER | FORMER | CURRENT), smokingDetails,
  alcohol (NEVER | SOCIAL | REGULAR | HEAVY), alcoholDetails,
  drugs (NEVER | FORMER | CURRENT), drugDetails,
  exercise (SEDENTARY | LIGHT | MODERATE | INTENSE), exerciseDetails,
  diet, sleep, stressLevel (1-10),
  sexuallyActive, contraception,
  housingCondition, sanitationAccess,
  createdAt, updatedAt
}

Vaccination {
  id, patientId, vaccine, dose, lot, manufacturer,
  applicationDate, nextDoseDate, applicationSite,
  appliedBy, notes,
  createdAt
}
```

### 1.4 Atendimento (Encounter)

```
Encounter {
  id, tenantId, patientId, primaryDoctorId, primaryNurseId,
  type (OUTPATIENT | EMERGENCY | INPATIENT | TELEMEDICINE | HOME_VISIT | DAY_HOSPITAL | PRE_OP | POST_OP | RETURN | NURSING_CONSULTATION),
  status (SCHEDULED | WAITING | IN_TRIAGE | IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED | NO_SHOW),
  priority (NORMAL | URGENT | EMERGENCY),
  scheduledAt, startedAt, completedAt, duration (minutos calculados),
  location, room, bed,
  chiefComplaint (texto — capturado por voz),
  chiefComplaintAudio (S3 URL — áudio original),
  triageLevel (RED | ORANGE | YELLOW | GREEN | BLUE — Manchester),
  triageScore, triageNurseId, triagedAt,
  vitalsAtTriage (JSON: { bp, hr, rr, temp, spo2, pain, weight, height, bmi }),
  isFollowUp, previousEncounterId,
  insuranceAuthorization, insuranceGuideNumber,
  billingStatus (PENDING | BILLED | PAID | DENIED | APPEALED),
  totalCost,
  patientSatisfactionScore (1-5),
  aiSummary (texto gerado por IA ao finalizar),
  aiSummaryGeneratedAt,
  createdAt, updatedAt
}
```

### 1.5 Transcrição de Voz (Core da inovação)

```
VoiceTranscription {
  id, encounterId, userId, patientId,
  audioUrl (S3), audioDuration (segundos), audioFormat,
  rawTranscription (texto cru do Whisper),
  processedTranscription (texto limpo, pontuado, formatado pela IA),
  structuredData (JSON — dados extraídos pela NER médica):
    {
      symptoms: [{ term, onset, duration, severity, location }],
      diagnoses: [{ cidCode, description, confidence }],
      medications: [{ name, dose, route, frequency }],
      vitals: [{ type, value, unit }],
      procedures: [{ name, code }],
      allergiesDetected: [{ substance, severity }],
      redFlags: [{ flag, urgency }]  // sinais de alerta detectados pela IA
    },
  context (ANAMNESIS | EVOLUTION | PRESCRIPTION | SOAP | DISCHARGE | NURSING | TRIAGE | SURGICAL_NOTE | GENERAL),
  confidence (0-100 do Whisper),
  language ("pt-BR"),
  wasEdited (bool), editedAt, editedBy,
  processingStatus (RECORDING | TRANSCRIBING | PROCESSING | COMPLETED | FAILED),
  processingTimeMs,
  createdAt
}
```

### 1.6 Evolução Clínica & SOAP

```
ClinicalNote {
  id, encounterId, authorId, authorRole,
  type (SOAP | FREE_TEXT | STRUCTURED | ADDENDUM | CORRECTION),
  status (DRAFT | SIGNED | COSIGNED | AMENDED),

  // SOAP (preenchido por IA a partir da voz)
  subjective (texto — queixa do paciente, HDA),
  objective (texto — exame físico, sinais vitais, exames),
  assessment (texto — diagnóstico/impressão),
  plan (texto — plano terapêutico),

  // Alternativa: texto livre
  freeText,

  // Campos estruturados extraídos por IA
  diagnosisCodes (CID-10 array),
  procedureCodes (TUSS array),
  
  // Voz
  voiceTranscriptionId (link para a transcrição original),
  wasGeneratedByAI (bool),
  aiModel (GPT4O | GEMINI),
  aiPromptVersion,
  
  // Assinatura
  signedAt, signedBy, digitalSignatureHash,
  cosignedAt, cosignedBy,
  
  // Versionamento (toda edição gera nova versão, original é imutável)
  version, parentNoteId (para amendments),
  
  createdAt, updatedAt
}
```

### 1.7 Prescrição Eletrônica

```
Prescription {
  id, encounterId, doctorId, patientId, tenantId,
  type (MEDICATION | EXAM | PROCEDURE | DIET | NURSING_CARE | OXYGEN | PHYSIOTHERAPY | CUSTOM),
  status (DRAFT | ACTIVE | SUSPENDED | CANCELLED | COMPLETED | EXPIRED),
  
  // Voz
  voiceTranscriptionId,
  wasGeneratedByAI (bool),
  
  // Validade
  validFrom, validUntil,
  isOneTime (bool — dose única),
  isContinuous (bool — uso contínuo),
  isPRN (bool — "se necessário" / ACM),
  
  // Assinatura
  signedAt, digitalSignatureHash,
  requiresDoubleCheck (bool — antimicrobianos, controlados),
  doubleCheckedBy, doubleCheckedAt,
  
  // Dispensação
  dispensedAt, dispensedBy,
  
  createdAt, updatedAt
}

PrescriptionItem {
  id, prescriptionId,
  
  // Medicamento
  medicationName, activeIngredient, concentration, pharmaceuticalForm,
  dose, doseUnit, route (VO | IV | IM | SC | SL | TOP | INH | REC | OFT | OTO | NASAL),
  frequency, frequencyHours, customSchedule (JSON de horários),
  duration, durationUnit (DAYS | WEEKS | MONTHS | CONTINUOUS),
  infusionRate, infusionRateUnit,
  dilution, dilutionVolume, dilutionSolution,
  maxDailyDose, prnCondition (condição para "se necessário"),
  specialInstructions,
  
  // Exame
  examName, examCode (TUSS), examType (LAB | IMAGE | OTHER),
  examUrgency (ROUTINE | URGENT | EMERGENCY),
  examInstructions, examJustification (CID obrigatório),
  
  // Procedimento
  procedureName, procedureCode,
  
  // Dieta
  dietType, caloricTarget, restrictions, supplements,
  
  // Controle
  isControlled (bool — portaria 344/98), controlledSchedule (C1-C5, A1-A3, B1-B2),
  isAntibiotic (bool), antibioticJustification,
  isHighAlert (bool — medicamento de alto alerta: insulina, heparina, KCl, etc),
  
  // IA
  aiSuggested (bool), aiConfidence, aiReasoning,
  interactionAlerts (JSON — alertas de interação detectados),
  allergyAlerts (JSON — alertas de alergia detectados),
  duplicateAlert (bool),
  doseCheckResult (SAFE | WARNING | DANGER),
  
  // Checagem (enfermagem)
  status (PENDING | CHECKED | PARTIALLY_CHECKED | SUSPENDED | NOT_ADMINISTERED),
  
  sortOrder,
  createdAt, updatedAt
}

MedicationCheck {
  id, prescriptionItemId, nurseId,
  scheduledAt (horário que deveria ser administrado),
  checkedAt (horário real),
  status (ADMINISTERED | NOT_ADMINISTERED | REFUSED | POSTPONED | HELD),
  reason (se não administrado),
  observations,
  vitalsBefore (JSON), vitalsAfter (JSON),
  painScaleBefore, painScaleAfter,
  wasCheckedByVoice (bool),
  lotNumber, expirationDate,
  createdAt
}
```

### 1.8 Sinais Vitais

```
VitalSigns {
  id, encounterId, patientId, recordedBy,
  recordedAt,
  
  systolicBP, diastolicBP, meanArterialPressure,
  heartRate, heartRhythm (REGULAR | IRREGULAR),
  respiratoryRate, respiratoryPattern,
  temperature, temperatureMethod (AXILLARY | ORAL | RECTAL | TYMPANIC),
  oxygenSaturation, oxygenSupplementation (ROOM_AIR | NASAL_CANNULA | MASK | VENTILATOR),
  fiO2,
  painScale (0-10), painLocation, painType,
  weight, height, bmi (calculado),
  headCircumference (pediátrico),
  abdominalCircumference,
  glucoseLevel, glucoseContext (FASTING | POSTPRANDIAL | RANDOM),
  gcs (Glasgow Coma Scale — total), gcsEye, gcsVerbal, gcsMotor,
  pupilLeft, pupilRight, pupilReactivity,
  capillaryRefill,
  edema (NONE | MILD | MODERATE | SEVERE), edemaLocation,
  diuresis24h, fluidBalance,
  
  // IA — análise automática
  aiAlerts (JSON — ex: "PA acima do percentil 95", "bradicardia", "febre"),
  aiTrend (IMPROVING | STABLE | WORSENING),
  aiTrendConfidence,
  
  source (MANUAL | VOICE | MONITOR_INTEGRATION | WEARABLE),
  deviceId,
  
  createdAt
}
```

### 1.9 Classificação de Risco / Triagem

```
TriageAssessment {
  id, encounterId, nurseId,
  protocol (MANCHESTER | STM | ESI | CUSTOM),
  
  // Dados coletados (todos podem ser por voz)
  chiefComplaint, symptomOnset, symptomDuration,
  painScale, painLocation, painCharacter,
  
  // Discriminadores (Manchester)
  discriminators (JSON array — lista de discriminadores avaliados),
  selectedDiscriminator,
  
  // Resultado
  level (RED | ORANGE | YELLOW | GREEN | BLUE),
  levelDescription,
  maxWaitTimeMinutes,
  reassessmentTimeMinutes,
  
  // IA
  aiSuggestedLevel, aiConfidence, aiReasoning,
  aiRedFlags (JSON — sinais de alerta detectados automaticamente),
  overriddenByNurse (bool — se enfermeiro discordou da IA),
  overrideReason,
  
  // Vitais na triagem
  vitalSignsId,
  
  voiceTranscriptionId,
  completedAt,
  createdAt
}
```

### 1.10 Internação & Leitos

```
Admission {
  id, encounterId, patientId, tenantId,
  admittingDoctorId, attendingDoctorId,
  admissionDate, expectedDischargeDate, actualDischargeDate,
  admissionType (ELECTIVE | EMERGENCY | TRANSFER_IN),
  
  // Leito
  currentBedId, admissionBedId,
  isolationRequired (bool), isolationType (CONTACT | DROPLET | AIRBORNE | COMBINED),
  
  // AIH (SUS)
  aihNumber, aihAuthorizedAt,
  diagnosisAtAdmission (CID), diagnosisAtDischarge (CID),
  procedurePerformed (TUSS),
  
  // Alta
  dischargeType (IMPROVED | SAME | WORSE | DEATH | TRANSFER_OUT | EVASION | AGAINST_ADVICE),
  dischargeNotes,
  dischargePrescription (receita de alta),
  dischargeInstructions (orientações — geradas por IA),
  followUpDate,
  
  // IA
  aiLengthOfStayPrediction (dias),
  aiReadmissionRisk (0-100),
  aiDischargePlanSuggestion,
  
  createdAt, updatedAt
}

Bed {
  id, tenantId, ward, room, bedNumber, floor,
  type (STANDARD | ICU | SEMI_ICU | ISOLATION | PEDIATRIC | NEONATAL | SURGICAL | OBSERVATION),
  status (AVAILABLE | OCCUPIED | CLEANING | MAINTENANCE | RESERVED | BLOCKED),
  currentPatientId, currentAdmissionId,
  equipment (JSON array — monitores, bombas, etc),
  lastCleanedAt, lastMaintenanceAt,
  createdAt, updatedAt
}

BedTransfer {
  id, admissionId, fromBedId, toBedId,
  requestedBy, approvedBy, executedBy,
  reason, requestedAt, approvedAt, executedAt,
  status (REQUESTED | APPROVED | DENIED | EXECUTED | CANCELLED),
  createdAt
}
```

### 1.11 Enfermagem / SAE Completa

```
NursingProcess {
  id, encounterId, patientId, nurseId,
  status (IN_PROGRESS | COMPLETED | REVIEWED),
  
  // 1. Coleta de dados / Histórico
  dataCollectionNotes,
  dataCollectionVoiceId,
  
  // 2. Diagnóstico de Enfermagem (NANDA-I)
  // → Via NursingDiagnosis
  
  // 3. Planejamento (NOC + NIC)
  // → Via NursingPlan
  
  // 4. Implementação
  // → Via NursingIntervention
  
  // 5. Avaliação
  evaluationNotes,
  evaluationVoiceId,
  evaluatedAt,
  
  aiSuggestedDiagnoses (JSON — NANDA-I sugeridos pela IA baseado nos dados),
  
  createdAt, updatedAt
}

NursingDiagnosis {
  id, nursingProcessId,
  nandaCode, nandaDomain, nandaClass, nandaTitle,
  relatedFactors (array), riskFactors (array), definingCharacteristics (array),
  status (ACTIVE | RESOLVED | RISK),
  priority (HIGH | MEDIUM | LOW),
  aiSuggested (bool), aiConfidence,
  createdAt, resolvedAt
}

NursingOutcome {
  id, nursingDiagnosisId,
  nocCode, nocTitle,
  baselineScore (1-5), targetScore (1-5), currentScore (1-5),
  indicators (JSON array: { name, baselineScore, currentScore }),
  evaluationFrequency,
  createdAt, updatedAt
}

NursingIntervention {
  id, nursingDiagnosisId,
  nicCode, nicTitle,
  activities (JSON array: { description, frequency, scheduledAt, completedAt, completedBy }),
  status (PLANNED | IN_PROGRESS | COMPLETED | CANCELLED),
  notes, voiceTranscriptionId,
  createdAt, updatedAt
}

NursingNote {
  id, encounterId, nurseId,
  type (ADMISSION_NOTE | SHIFT_NOTE | EVOLUTION | INCIDENT | HANDOFF),
  content (texto — gerado por voz),
  voiceTranscriptionId,
  signedAt, digitalSignatureHash,
  shift (MORNING | AFTERNOON | NIGHT),
  createdAt
}

FluidBalance {
  id, encounterId, patientId, nurseId,
  recordedAt, period (hora ou turno),
  intakeOral, intakeIV, intakeOther, intakeTotal,
  outputUrine, outputDrain, outputEmesis, outputStool, outputOther, outputTotal,
  balance (intakeTotal - outputTotal),
  cumulativeBalance24h,
  aiAlert (se balanço preocupante),
  createdAt
}
```

### 1.12 Centro Cirúrgico

```
SurgicalProcedure {
  id, encounterId, patientId, tenantId,
  surgeonId, firstAssistantId, anesthesiologistId, scrubNurseId, circulatingNurseId,
  
  procedureName, procedureCode (TUSS),
  laterality (LEFT | RIGHT | BILATERAL | NA),
  anesthesiaType (GENERAL | REGIONAL | LOCAL | SEDATION | COMBINED),
  
  // Tempos cirúrgicos
  scheduledAt, patientInAt, anesthesiaStartAt, incisionAt,
  sutureAt, anesthesiaEndAt, patientOutAt,
  
  // Checklist de Segurança (OMS)
  safetyChecklistBefore (JSON — Sign In),
  safetyChecklistDuring (JSON — Time Out),
  safetyChecklistAfter (JSON — Sign Out),
  
  surgicalDescription (texto — ditado por voz pelo cirurgião),
  surgicalDescriptionVoiceId,
  complications, bloodLoss (mL),
  implants (JSON), pathologySamples (JSON),
  
  status (SCHEDULED | PRE_OP | IN_PROGRESS | RECOVERY | COMPLETED | CANCELLED),
  
  aiSurgicalRisk (ASA score sugerido), aiAnticipatedComplications,
  
  createdAt, updatedAt
}
```

### 1.13 Resultados de Exames

```
ExamResult {
  id, encounterId, patientId,
  examName, examCode, examType (LAB | IMAGE | ECG | PATHOLOGY | OTHER),
  requestedBy (doctorId), requestedAt,
  
  // Lab
  labResults (JSON array: {
    analyte, value, unit, referenceRange, flag (NORMAL | LOW | HIGH | CRITICAL),
    criticalAlert (bool)
  }),
  
  // Imagem
  imageUrl (S3 ou PACS URL), imageModality (RX | CT | MRI | US | MAMMO | OTHER),
  radiologistReport,
  
  // Status
  status (REQUESTED | COLLECTED | IN_PROGRESS | COMPLETED | CANCELLED),
  collectedAt, completedAt, reviewedAt, reviewedBy,
  
  // IA
  aiInterpretation (texto — resumo interpretativo dos resultados),
  aiAlerts (JSON — valores críticos, tendências),
  aiTrendComparison (JSON — comparação com exames anteriores),
  
  attachments (JSON array — PDFs, imagens),
  
  createdAt
}
```

### 1.14 Documentos & Termos

```
ClinicalDocument {
  id, encounterId, patientId, authorId, tenantId,
  
  type (CONSENT | ADMISSION_FORM | DISCHARGE_SUMMARY | REFERRAL | MEDICAL_CERTIFICATE |
        DEATH_CERTIFICATE | BIRTH_CERTIFICATE | REPORT | SURGICAL_CONSENT |
        BLOOD_TRANSFUSION_CONSENT | ANESTHESIA_CONSENT | CUSTOM),
  
  title, content (HTML ou texto),
  templateId (template usado),
  
  // Geração
  generatedByAI (bool),
  voiceTranscriptionId,
  
  // Assinatura
  signedAt, signedBy, digitalSignatureHash,
  patientSignedAt, patientSignature (imagem ou digital),
  witnessSignedAt, witnessName,
  
  // PDF
  pdfUrl (S3),
  
  status (DRAFT | SIGNED | VOIDED),
  voidReason,
  
  createdAt, updatedAt
}

DocumentTemplate {
  id, tenantId, name, type, category,
  content (HTML com placeholders: {{patient.name}}, {{doctor.name}}, etc),
  variables (JSON — lista de variáveis disponíveis),
  isDefault (bool), isActive (bool),
  createdBy,
  createdAt, updatedAt
}
```

### 1.15 Alertas & Notificações

```
ClinicalAlert {
  id, tenantId, patientId, encounterId,
  type (ALLERGY | INTERACTION | DUPLICATE_MED | DOSE_CHECK | CRITICAL_RESULT |
        VITAL_SIGN | FALL_RISK | PRESSURE_INJURY | READMISSION_RISK |
        SEPSIS_SCREEN | VTE_RISK | GLUCOSE | DETERIORATION | CUSTOM),
  severity (INFO | WARNING | CRITICAL),
  title, message, details (JSON),
  source (SYSTEM | AI | MANUAL),
  
  triggeredAt, acknowledgedAt, acknowledgedBy,
  actionTaken,
  
  isActive (bool), resolvedAt, resolvedBy,
  
  // TTS — lido em voz alta se crítico
  readAloud (bool), ttsAudioUrl,
  
  createdAt
}

Notification {
  id, userId, tenantId,
  type (ALERT | RESULT | MESSAGE | TASK | REMINDER | SYSTEM),
  title, body, data (JSON),
  channel (IN_APP | PUSH | EMAIL | SMS | WHATSAPP),
  sentAt, readAt, actionUrl,
  createdAt
}
```

### 1.16 Auditoria & LGPD

```
AuditLog {
  id, tenantId, userId, patientId,
  action (VIEW | CREATE | UPDATE | DELETE | SIGN | PRINT | EXPORT | LOGIN | LOGOUT | VOICE_RECORD | SHARE),
  entity (tabela afetada), entityId,
  previousData (JSON — snapshot antes), newData (JSON — snapshot depois),
  ipAddress, userAgent, deviceId, geolocation,
  sessionId,
  timestamp
}

ConsentRecord {
  id, patientId, tenantId,
  type (LGPD_GENERAL | TELEMEDICINE | DATA_SHARING | RESEARCH | MARKETING),
  granted (bool), grantedAt, revokedAt,
  consentText, version,
  ipAddress, deviceId,
  createdAt
}

DataAccessRequest {
  id, patientId, tenantId,
  type (ACCESS | RECTIFICATION | DELETION | PORTABILITY),
  status (PENDING | IN_PROGRESS | COMPLETED | DENIED),
  requestedAt, respondedAt, responseNotes,
  processedBy,
  createdAt
}
```

### 1.17 Agendamento

```
Appointment {
  id, tenantId, patientId, doctorId,
  type (FIRST_VISIT | RETURN | TELEMEDICINE | PROCEDURE | EXAM | PRE_OP | POST_OP),
  status (SCHEDULED | CONFIRMED | WAITING | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW | RESCHEDULED),
  
  scheduledAt, duration (minutos), actualStartAt, actualEndAt,
  location, room, isTelemedicine,
  
  // Confirmação
  confirmedAt, confirmationMethod (APP | SMS | WHATSAPP | PHONE | EMAIL),
  reminderSentAt,
  
  // IA
  aiSuggestedSlot (bool — horário sugerido pela IA baseado no histórico),
  aiNoShowPrediction (0-100),
  
  notes, cancellationReason,
  encounterId (vincula quando atendimento inicia),
  
  createdAt, updatedAt
}
```

### 1.18 Faturamento & Convênios

```
BillingEntry {
  id, encounterId, tenantId, patientId,
  insuranceProvider, planType,
  guideNumber (número da guia), guideType (SADT | INTERNMENT | CONSULTATION),
  
  items (JSON array: { code, description, quantity, unitPrice, total, glosa }),
  totalAmount, glosedAmount, approvedAmount,
  
  status (PENDING | SUBMITTED | APPROVED | PARTIALLY_APPROVED | DENIED | APPEALED | PAID),
  submittedAt, approvedAt, paidAt,
  
  tissXml (S3 — XML TISS gerado),
  
  aiCodingSuggestions (JSON — códigos TUSS sugeridos pela IA baseados no prontuário),
  
  createdAt, updatedAt
}
```

---

## PARTE 2 — MÓDULOS DE IA (o diferencial)

Crie todos os serviços de IA em `src/modules/ai/`. Cada serviço deve ter fallback Gemini caso GPT-4o falhe.

### 2.1 VoiceEngine — Motor de Voz

```typescript
// src/modules/ai/voice-engine.service.ts
//
// FLUXO:
// 1. Usuário aperta botão de microfone (web: MediaRecorder API / mobile: expo-av)
// 2. Áudio é enviado em chunks (streaming) via WebSocket para o backend
// 3. Backend envia para Whisper API (streaming transcription)
// 4. Transcrição parcial volta em tempo real para o frontend (aparece na tela enquanto fala)
// 5. Ao parar de falar (silêncio de 3s ou botão stop), transcrição final vai para processamento
// 6. NER Médica extrai entidades estruturadas do texto
// 7. IA gera o conteúdo final (SOAP, prescrição, evolução, etc) baseado no contexto

// FUNCIONALIDADES DO VOICE ENGINE:
// - Streaming de transcrição em tempo real (partial results)
// - Detecção automática de silêncio (configurable: 2-5 segundos)
// - Cancelamento de ruído básico (web: AudioWorklet / mobile: expo-av noise gate)
// - Suporte a termos médicos em português (Whisper é excelente nisso nativamente)
// - Contexto médico: enviar prompt de contexto para o Whisper ("medical consultation in Brazilian Portuguese")
// - Fallback: se Whisper falhar, tenta Google Speech-to-Text v2
// - Armazenamento do áudio original em S3 (obrigatório para auditoria LGPD)
// - Rate limiting: max 60 minutos de áudio por usuário por dia
// - Formato: WebM Opus (web) / M4A AAC (mobile) → convertido para MP3 se necessário
```

### 2.2 MedicalNER — Reconhecimento de Entidades Médicas

```typescript
// src/modules/ai/medical-ner.service.ts
//
// Recebe texto transcrito e extrai TODAS as entidades médicas estruturadas:
//
// INPUT:  "Paciente refere dor epigástrica há 3 dias, piora após alimentação,
//          nega febre, nega vômitos. PA 130x80, FC 78. Suspeita de DRGE.
//          Vou prescrever omeprazol 20mg via oral uma vez ao dia por 30 dias
//          e pedir uma endoscopia digestiva alta."
//
// OUTPUT (structuredData):
// {
//   symptoms: [
//     { term: "dor epigástrica", onset: "3 dias", severity: null, location: "epigástrio", aggravatingFactor: "alimentação" }
//   ],
//   negatives: ["febre", "vômitos"],
//   vitals: [
//     { type: "systolicBP", value: 130, unit: "mmHg" },
//     { type: "diastolicBP", value: 80, unit: "mmHg" },
//     { type: "heartRate", value: 78, unit: "bpm" }
//   ],
//   diagnoses: [
//     { cidCode: "K21.0", description: "Doença do refluxo gastroesofágico com esofagite", confidence: 0.85 }
//   ],
//   medications: [
//     { name: "Omeprazol", dose: "20", doseUnit: "mg", route: "VO", frequency: "1x/dia", duration: "30 dias" }
//   ],
//   exams: [
//     { name: "Endoscopia digestiva alta", code: null, urgency: "ROUTINE" }
//   ],
//   redFlags: []
// }
//
// IMPLEMENTAÇÃO: Prompt engineering GPT-4o com JSON schema response_format
// FALLBACK: Gemini com structured output
// CACHE: Usar embedding similarity para não reprocessar textos muito similares
```

### 2.3 SOAPGenerator — Gerador de SOAP por Voz

```typescript
// src/modules/ai/soap-generator.service.ts
//
// O médico faz a consulta conversando normalmente com o paciente.
// O VoiceEngine transcreve tudo.
// Ao final, este serviço gera automaticamente a nota SOAP:
//
// PROMPT SYSTEM (simplificado):
// "Você é um assistente médico brasileiro especialista em gerar notas SOAP.
//  Recebeu a transcrição de uma consulta médica entre {doctor.name} ({doctor.specialty})
//  e o paciente {patient.name} ({patient.age} anos, {patient.gender}).
//  
//  Histórico relevante do paciente:
//  - Alergias: {allergies}
//  - Condições crônicas: {conditions}
//  - Medicamentos em uso: {currentMedications}
//  - Última consulta: {lastEncounter.summary}
//  
//  Gere uma nota SOAP profissional em português brasileiro, com terminologia médica correta.
//  Use o padrão CFM/CRM. Seja objetivo, preciso e completo.
//  
//  Formato de saída JSON:
//  { subjective: string, objective: string, assessment: string, plan: string,
//    diagnosisCodes: string[], suggestedPrescriptions: [...], suggestedExams: [...] }"
```

### 2.4 PrescriptionAI — Prescrição Inteligente

```typescript
// src/modules/ai/prescription-ai.service.ts
//
// FUNCIONALIDADES:
// 1. GERAÇÃO POR VOZ: Médico diz "prescrever dipirona 500mg via oral de 6 em 6 horas por 5 dias"
//    → IA parseia e preenche todos os campos estruturados automaticamente
//
// 2. SUGESTÃO BASEADA EM DIAGNÓSTICO: Médico seleciona CID ou diz o diagnóstico
//    → IA sugere protocolo medicamentoso baseado em guidelines
//    → Médico confirma/ajusta por voz: "ok, mas troca a dose pra 1g"
//
// 3. VERIFICAÇÃO DE SEGURANÇA (roda SEMPRE, automaticamente):
//    - Interação medicamentosa (drug-drug interaction)
//    - Alergia do paciente
//    - Duplicidade terapêutica
//    - Dose máxima excedida (por peso/idade/clearance renal)
//    - Contraindicação por condição (ex: metformina + insuficiência renal)
//    - Medicamento de alto alerta (double-check obrigatório)
//    - Gestante/lactante (categoria FDA)
//    - Pediátrico (dose por kg)
//    - Idoso (critérios de Beers)
//
// 4. FAVORITOS INTELIGENTES: Aprende com o padrão do médico
//    → Se Dr. João sempre prescreve amoxicilina 500mg 8/8h por 7 dias para amigdalite,
//      na próxima vez que disser "amigdalite", sugere automaticamente
//
// 5. RECEITA AUTOMÁTICA: Ao assinar, gera PDF formatado com:
//    - Cabeçalho do médico (CRM, especialidade)
//    - Dados do paciente
//    - Medicamentos com posologia
//    - Tipo de receita (simples, especial, controle especial, azul, amarela)
//    - QR Code de verificação
//    - Assinatura digital
```

### 2.5 TriageAI — Classificação de Risco com IA

```typescript
// src/modules/ai/triage-ai.service.ts
//
// Enfermeiro descreve por voz: "paciente masculino, 45 anos, dor torácica há 2 horas,
// irradia pra braço esquerdo, sudorese, PA 160x100, FC 110, saturação 94%"
//
// IA AUTOMATICAMENTE:
// 1. Extrai sinais vitais → preenche campos
// 2. Identifica discriminadores Manchester → "dor torácica + irradiação + sudorese"
// 3. Classifica: LARANJA (muito urgente) com justificativa
// 4. Detecta RED FLAGS: "possível SCA — considerar ECG imediato e troponina"
// 5. Sugere tempo máximo de espera: 10 minutos
// 6. Sugere protocolo: "Protocolo Dor Torácica — AAS 200mg, ECG 12 derivações, troponina"
//
// Enfermeiro pode aceitar, ajustar ou override com justificativa
```

### 2.6 DischargeAI — Alta Inteligente

```typescript
// src/modules/ai/discharge-ai.service.ts
//
// Ao dar alta, a IA gera AUTOMATICAMENTE:
// 1. Resumo de alta (baseado em TODA a internação: evoluções, prescrições, exames, procedimentos)
// 2. Receita de alta (medicamentos que deve continuar em casa)
// 3. Orientações ao paciente (em linguagem LEIGA, simples, com pictogramas)
// 4. Sinais de alerta para retorno (quando voltar ao hospital)
// 5. Agendamento de retorno sugerido
// 6. Encaminhamentos necessários
//
// Tudo gerado em segundos. Médico revisa, ajusta por voz se necessário, e assina.
```

### 2.7 ClinicalCopilot — Copiloto Clínico em Tempo Real

```typescript
// src/modules/ai/clinical-copilot.service.ts
//
// Funciona como um "copiloto" durante o atendimento:
// - Roda em background enquanto o médico atende
// - Analisa a transcrição em tempo real
// - Mostra sugestões discretas na lateral da tela:
//
//   💡 "Paciente tem histórico de HAS — última PA de controle há 45 dias"
//   💡 "Hemoglobina glicada vencida (último exame: 8 meses atrás)"
//   💡 "Medicamento losartana vence em 5 dias — renovar receita?"
//   💡 "Baseado nos sintomas, considerar investigar H. pylori (Classificação de Roma IV)"
//   ⚠️ "Paciente relata usar ibuprofeno — INTERAÇÃO com losartana"
//
// NÃO interrompe o médico. São cards discretos que ele pode ver ou ignorar.
// Se o médico perguntar por voz "alguma sugestão?", a IA lê os cards em voz alta.
```

### 2.8 PatientSummaryAI — Resumo Instantâneo do Paciente

```typescript
// src/modules/ai/patient-summary-ai.service.ts
//
// Quando o médico abre o prontuário de um paciente, em <2 segundos a IA gera:
//
// "Maria Silva, 62 anos, hipertensa e diabética tipo 2.
//  Em acompanhamento regular — última consulta há 32 dias com Dr. Carlos (cardiologia).
//  Medicações atuais: losartana 50mg, metformina 850mg, AAS 100mg.
//  Últimos exames (15/02): HbA1c 7.2% (↑ vs 6.8% anterior), creatinina normal.
//  Alergia confirmada: dipirona (urticária).
//  3 internações prévias, última por ICC descompensada em 2024.
//  ⚠️ Risco cardiovascular alto. Hemoglobina glicada subindo — considerar ajuste."
//
// Este resumo aparece como um card no topo do prontuário.
// Pode ser lido em voz alta se o médico preferir (TTS).
```

---

## PARTE 3 — FUNCIONALIDADES WEB (MÉDICO/ADMIN)

Crie todas as telas em `src/frontend/web/src/pages/`. Use React + TypeScript + Tailwind + shadcn/ui.

### 3.1 Layout & Navegação

```
Layout principal:
├── Sidebar esquerda (colapsível):
│   ├── Dashboard
│   ├── Agenda
│   ├── Pacientes
│   ├── Atendimentos (Encounters)
│   ├── Internações
│   ├── Centro Cirúrgico
│   ├── Farmácia
│   ├── Resultados de Exames
│   ├── Relatórios & BI
│   ├── Faturamento (TISS)
│   ├── Configurações
│   └── Admin (se role ADMIN)
├── Header superior:
│   ├── Busca global (paciente por nome, CPF, MRN — com Elasticsearch)
│   ├── Notificações (sino com badge)
│   ├── Alertas clínicos ativos
│   ├── Botão de microfone global (sempre disponível)
│   └── Perfil do usuário
└── Área principal (conteúdo)
```

### 3.2 Telas do Prontuário (Core)

```
1. LISTA DE PACIENTES
   - Grid com filtros: nome, CPF, MRN, convênio, tags, médico, status
   - Indicadores visuais: cor de risco, ícones de alergias, alertas ativos
   - Busca por voz: "mostrar pacientes do Dr. Carlos" → filtra automaticamente
   - Card rápido ao hover: resumo IA do paciente

2. PRONTUÁRIO DO PACIENTE (tela principal — mais importante do sistema)
   Layout em abas verticais à esquerda:
   ├── Resumo (AI Summary card + timeline visual de atendimentos)
   ├── Dados Pessoais (editável, com voz)
   ├── Alergias & Condições (com alertas visuais)
   ├── Histórico Familiar / Cirúrgico / Social
   ├── Vacinas
   ├── Atendimentos (lista cronológica)
   ├── Prescrições (ativas + históricas)
   ├── Exames & Resultados (com gráficos de tendência)
   ├── Documentos & Termos
   ├── Sinais Vitais (gráficos em série temporal)
   ├── Enfermagem / SAE
   ├── Internações
   └── Faturamento

3. TELA DE ATENDIMENTO (Encounter — onde a mágica acontece)
   Layout dividido:
   ├── Esquerda (70%): Área de trabalho
   │   ├── Botão GRANDE de microfone (estado: idle → recording → processing)
   │   ├── Transcrição em tempo real (texto aparecendo enquanto fala)
   │   ├── SOAP Notes (geradas/preenchidas automaticamente)
   │   ├── Prescrições (lista de itens, adicionar por voz)
   │   ├── Solicitação de exames (por voz)
   │   └── Documentos (gerar por voz)
   └── Direita (30%): Painel lateral inteligente
       ├── Resumo IA do paciente
       ├── Sinais vitais atuais
       ├── Alergias (sempre visível)
       ├── Medicamentos em uso
       ├── Alertas clínicos ativos
       ├── Sugestões do Copilot (cards discretos)
       └── Resultados recentes

4. LISTA DE INTERNADOS
   - Quadro de leitos visual (mapa do andar)
   - Status por cores: ocupado, livre, limpeza, manutenção
   - Sinais vitais resumidos por paciente
   - Alertas ativos por paciente
   - Prescrições pendentes de checagem

5. PAINEL DE ENFERMAGEM
   - Lista de pacientes do setor/turno
   - Checagem de medicamentos (swipe ou voz: "checado dipirona leito 3")
   - Registro de sinais vitais (por voz)
   - Balanço hídrico
   - Escala de Glasgow, Braden, Morse, etc
   - SAE completa (NANDA/NIC/NOC)
   - Passagem de plantão assistida por IA (resume o turno automaticamente)

6. CLASSIFICAÇÃO DE RISCO
   - Tela otimizada para speed
   - Enfermeiro fala sintomas → IA classifica em tempo real
   - Campos pré-preenchidos, enfermeiro confirma/ajusta
   - Semáforo visual grande (vermelho/laranja/amarelo/verde/azul)
   - Timer automático de reclassificação
   - Painel de espera com tempos

7. CENTRO CIRÚRGICO
   - Mapa de salas (ocupação)
   - Checklist OMS (3 fases)
   - Descrição cirúrgica por voz
   - Tempos cirúrgicos automáticos (inicia timer ao clicar)

8. DASHBOARD
   - KPIs em tempo real: pacientes atendidos, tempo médio, ocupação leitos
   - Gráficos: atendimentos por hora/dia, classificação de risco, diagnósticos mais frequentes
   - Alertas institucionais
   - Previsão de demanda (IA)

9. FATURAMENTO / TISS
   - Geração automática de guias TISS (IA sugere códigos TUSS baseado no prontuário)
   - Conferência de glosas
   - Export XML TISS 4.0
   - Dashboard financeiro

10. RELATÓRIOS & BI
    - Relatórios pré-configurados (movimento hospitalar, censo, produtividade médica)
    - Construtor de relatórios custom
    - Export PDF/XLSX
    - Gráficos interativos

11. ADMIN
    - Gestão de usuários e permissões (RBAC granular)
    - Configurações do tenant
    - Templates de documentos
    - Tabelas de medicamentos / CID / TUSS
    - Auditoria (logs de acesso)
    - LGPD (solicitações de dados)
```

### 3.3 Componente de Voz (o mais importante)

```
VoiceMicrophone — componente React reutilizável:

Props:
  - context: "anamnesis" | "evolution" | "prescription" | "triage" | "soap" | "nursing" | "surgical" | "general"
  - encounterId: string
  - patientId: string
  - onTranscriptionUpdate: (partial: string) => void  // tempo real
  - onTranscriptionComplete: (result: VoiceTranscriptionResult) => void  // final
  - onStructuredDataExtracted: (data: StructuredMedicalData) => void  // NER
  - autoStop: boolean (default: true — para ao detectar silêncio)
  - silenceTimeout: number (default: 3000ms)

Estados visuais:
  - IDLE: ícone de microfone cinza, pulso suave
  - LISTENING: ícone vermelho, onda sonora animada, "Escutando..."
  - PROCESSING: ícone azul, spinner, "Processando..."
  - COMPLETE: ícone verde, check, "Pronto!"
  - ERROR: ícone vermelho, "Erro — toque para tentar novamente"

Posicionamento: Botão flutuante no canto inferior direito de toda tela de atendimento.
Atalho de teclado: Espaço (segurar para falar, soltar para parar) ou F2 (toggle)
```

---

## PARTE 4 — FUNCIONALIDADES MOBILE (Expo/React Native)

### 4.1 App do Paciente (versão simplificada)
```
- Login (CPF + senha ou biometria)
- Meus agendamentos (ver, confirmar, cancelar)
- Resultados de exames (PDF viewer)
- Minhas receitas (com QR code para farmácia)
- Teleconsulta (Daily.co / WebRTC)
- Mensagens com o médico
- Dados pessoais
- Consentimentos LGPD
```

### 4.2 App do Médico/Enfermeiro (versão completa mobile)
```
- Tudo que a versão web tem, adaptado para mobile
- Foco TOTAL em voz (mobile é o device mais natural pra isso)
- Botão de microfone sempre visível
- Checagem de medicamentos por scan de pulseira (câmera) + voz
- Sinais vitais por voz
- Foto de feridas/lesões integrada ao prontuário
- Push notifications para alertas clínicos críticos
- Modo offline básico (cache de dados do paciente para consulta)
```

---

## PARTE 5 — REGRAS DE NEGÓCIO CRÍTICAS

### 5.1 Segurança & Compliance
```
- Toda ação em prontuário gera AuditLog (sem exceção)
- Prontuário NUNCA é deletado — apenas soft-delete com log
- Notas clínicas assinadas são IMUTÁVEIS — correções geram Addendum
- Acesso ao prontuário requer vínculo: médico assistente, equipe do setor, ou justificativa
- Sessão expira em 30 minutos de inatividade
- Bloqueio após 5 tentativas de login
- Senhas: mínimo 12 caracteres, 1 maiúscula, 1 número, 1 especial
- Dados de saúde são dados sensíveis (LGPD Art. 11) — consentimento obrigatório
- Toda exportação/impressão de prontuário é logada
- Áudio de voz armazenado por no mínimo 20 anos (prazo legal do prontuário)
```

### 5.2 Prescrição
```
- Prescrição SÓ pode ser feita por profissional habilitado (médico, dentista, enfermeiro conforme escopo)
- Antimicrobianos: justificativa obrigatória + prazo máximo de 14 dias
- Controlados (Portaria 344/98): receita especial, dupla checagem
- Medicamentos de alto alerta: double-check obrigatório por segundo profissional
- Interação medicamentosa GRAVE: bloqueia prescrição até override com justificativa
- Alergia confirmada: bloqueia TOTALMENTE (sem override)
- Dose acima de 10× a usual: bloqueia até confirmação
```

### 5.3 Enfermagem
```
- SAE obrigatória para todos os internados (Resolução COFEN 736/24)
- Checagem de medicamento: 9 certos (paciente certo, medicamento certo, dose certa,
  via certa, hora certa, registro certo, ação certa, forma certa, resposta certa)
- Sinais vitais mínimos a cada 6 horas para internados
- Escala de Braden a cada 24h para acamados
- Passagem de plantão registrada obrigatoriamente
```

### 5.4 Voz
```
- Áudio original SEMPRE armazenado (requisito legal — é parte do prontuário)
- Transcrição pode ser editada pelo autor (edição logada)
- Se IA gerar conteúdo, o campo wasGeneratedByAI = true (transparência)
- Profissional SEMPRE revisa e assina (IA não substitui responsabilidade)
- Timeout de gravação: máximo 15 minutos por vez (evitar gravações acidentais)
- Indicador visual claro de que está gravando (privacidade do paciente)
```

---

## PARTE 6 — ESTRUTURA DE PASTAS DO PROJETO

```
voxpep/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # JWT, MFA, OAuth
│   │   │   │   ├── tenants/          # Multi-tenancy
│   │   │   │   ├── users/            # Usuários & Profissionais
│   │   │   │   ├── patients/         # Cadastro de pacientes
│   │   │   │   ├── encounters/       # Atendimentos
│   │   │   │   ├── medical-records/  # Prontuário master
│   │   │   │   ├── prescriptions/    # Prescrição eletrônica
│   │   │   │   ├── clinical-notes/   # SOAP / Evoluções
│   │   │   │   ├── vital-signs/      # Sinais vitais
│   │   │   │   ├── nursing/          # SAE completa
│   │   │   │   ├── triage/           # Classificação de risco
│   │   │   │   ├── admissions/       # Internações & Leitos
│   │   │   │   ├── surgical/         # Centro cirúrgico
│   │   │   │   ├── exams/            # Resultados de exames
│   │   │   │   ├── documents/        # Documentos & Templates
│   │   │   │   ├── alerts/           # Alertas clínicos
│   │   │   │   ├── appointments/     # Agendamento
│   │   │   │   ├── billing/          # Faturamento TISS
│   │   │   │   ├── notifications/    # Push, email, in-app
│   │   │   │   ├── audit/            # Logs & LGPD
│   │   │   │   ├── ai/              # TODOS os serviços de IA
│   │   │   │   │   ├── voice-engine.service.ts
│   │   │   │   │   ├── medical-ner.service.ts
│   │   │   │   │   ├── soap-generator.service.ts
│   │   │   │   │   ├── prescription-ai.service.ts
│   │   │   │   │   ├── triage-ai.service.ts
│   │   │   │   │   ├── discharge-ai.service.ts
│   │   │   │   │   ├── clinical-copilot.service.ts
│   │   │   │   │   ├── patient-summary-ai.service.ts
│   │   │   │   │   ├── coding-ai.service.ts      # Sugestão de códigos TUSS/CID
│   │   │   │   │   ├── handoff-ai.service.ts      # Passagem de plantão
│   │   │   │   │   └── predictive-ai.service.ts   # Readmissão, deterioração, LOS
│   │   │   │   └── search/           # Elasticsearch
│   │   │   ├── common/
│   │   │   │   ├── guards/           # Auth, Roles, Tenant
│   │   │   │   ├── interceptors/     # Audit, Logging, Timeout
│   │   │   │   ├── decorators/       # @CurrentUser, @Tenant, @Roles
│   │   │   │   ├── pipes/            # Validation
│   │   │   │   └── filters/          # Exception handling
│   │   │   ├── config/               # Env, database, redis, aws, openai
│   │   │   ├── prisma/               # Prisma service
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                          # React Web (médicos/admin)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   ├── voice/            # VoiceMicrophone, VoiceWaveform, VoiceIndicator
│   │   │   │   ├── medical/          # AllergyBadge, VitalSignsChart, SOAPEditor, PrescriptionForm
│   │   │   │   ├── layout/           # Sidebar, Header, BedMap
│   │   │   │   └── common/           # DataTable, SearchBar, Pagination
│   │   │   ├── pages/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── patients/
│   │   │   │   ├── encounters/
│   │   │   │   ├── prescriptions/
│   │   │   │   ├── nursing/
│   │   │   │   ├── triage/
│   │   │   │   ├── admissions/
│   │   │   │   ├── surgical/
│   │   │   │   ├── exams/
│   │   │   │   ├── billing/
│   │   │   │   ├── reports/
│   │   │   │   ├── settings/
│   │   │   │   └── admin/
│   │   │   ├── hooks/
│   │   │   │   ├── useVoice.ts       # Hook principal de voz
│   │   │   │   ├── useRealtime.ts    # Socket.IO
│   │   │   │   ├── useAI.ts          # Chamadas aos serviços de IA
│   │   │   │   └── useAuth.ts
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── services/             # API clients (TanStack Query)
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── mobile/                       # Expo React Native
│       ├── app/                      # Expo Router
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── stores/
│       └── package.json
│
├── packages/                         # Shared code (monorepo)
│   ├── shared-types/                 # TypeScript types compartilhados
│   ├── shared-utils/                 # Funções utilitárias
│   └── medical-constants/            # CID-10, TUSS, medicamentos, NANDA-I, NIC, NOC
│
├── infra/                            # IaC
│   ├── docker-compose.yml            # Dev local
│   ├── terraform/                    # AWS infra
│   └── github-actions/               # CI/CD workflows
│
├── docs/                             # Documentação
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── VOICE-FLOW.md
│   └── AI-SERVICES.md
│
├── turbo.json                        # Turborepo config
├── package.json                      # Root workspace
└── README.md
```

---

## PARTE 7 — ORDEM DE IMPLEMENTAÇÃO

Execute na seguinte ordem, testando cada parte antes de avançar:

```
FASE 1 — FUNDAÇÃO (semana 1-2)
  □ Setup monorepo (Turborepo + pnpm workspaces)
  □ NestJS boilerplate com Prisma + PostgreSQL
  □ Schema Prisma completo (todas as entidades)
  □ Migrations + seed com dados de teste
  □ Auth module (JWT + refresh + MFA)
  □ Multi-tenancy guard (tenantId em tudo)
  □ RBAC (role-based access control)
  □ Audit interceptor (loga toda ação)
  □ React web boilerplate com Vite + Tailwind + shadcn

FASE 2 — CORE CLÍNICO (semana 3-5)
  □ CRUD Pacientes (com busca Elasticsearch)
  □ Prontuário Master (alergias, condições, históricos)
  □ Encounters (atendimentos)
  □ Sinais Vitais
  □ Clinical Notes (SOAP)
  □ Prescrição Eletrônica (todos os tipos)
  □ Checagem de Medicamentos
  □ Resultados de Exames
  □ Documentos & Templates

FASE 3 — VOZ + IA (semana 6-8)
  □ VoiceEngine (gravação + Whisper + streaming)
  □ MedicalNER (extração de entidades)
  □ SOAPGenerator (SOAP por voz)
  □ PrescriptionAI (prescrição por voz)
  □ PatientSummaryAI (resumo instantâneo)
  □ ClinicalCopilot (sugestões em tempo real)
  □ Componente VoiceMicrophone (React)
  □ Integrar voz em TODAS as telas

FASE 4 — MÓDULOS AVANÇADOS (semana 9-11)
  □ Classificação de Risco + TriageAI
  □ Internações + Leitos + BedMap
  □ SAE completa (NANDA/NIC/NOC)
  □ Centro Cirúrgico
  □ Passagem de plantão com IA
  □ Alta inteligente (DischargeAI)
  □ Agendamento

FASE 5 — FATURAMENTO & COMPLIANCE (semana 12-13)
  □ Faturamento TISS (XML 4.0)
  □ Sugestão automática de códigos (CodingAI)
  □ Assinatura digital ICP-Brasil
  □ LGPD (consentimentos, solicitações, portabilidade)
  □ Relatórios & Dashboard BI

FASE 6 — MOBILE (semana 14-16)
  □ App paciente (Expo)
  □ App médico mobile
  □ Push notifications
  □ Modo offline básico

FASE 7 — POLISH & DEPLOY (semana 17-18)
  □ Testes E2E
  □ Performance (caching, queries, lazy loading)
  □ Docker + ECS + CI/CD
  □ Monitoramento (Sentry + CloudWatch)
  □ Documentação final
```

---

## PARTE 8 — DIFERENCIAIS VS MV (por que VoxPEP é superior)

```
| Funcionalidade                    | MV Soul PEP        | VoxPEP                          |
|-----------------------------------|--------------------|---------------------------------|
| Input primário                    | Teclado/Mouse      | VOZ (microfone)                 |
| Transcrição em tempo real         | Não tem            | Sim (Whisper streaming)         |
| SOAP gerado por IA               | Não tem            | Sim (GPT-4o)                    |
| Prescrição por voz                | Não tem            | Sim (fala → campos preenchidos) |
| NER médica automática             | Não tem            | Sim (extrai CID, medicamentos)  |
| Copiloto clínico em tempo real    | Não tem            | Sim (sugestões discretas)       |
| Resumo IA do paciente             | Não tem            | Sim (2 segundos ao abrir)       |
| Triagem com IA                    | Básico             | IA sugere classificação + flags |
| Passagem de plantão com IA        | Manual             | IA resume o turno todo          |
| Alta com IA                       | Manual             | Resumo + receita + orientações  |
| Predição de readmissão            | Não tem            | Sim (ML)                        |
| Predição de deterioração          | Não tem            | Sim (Early Warning Score + IA)  |
| Busca semântica em prontuários    | Texto exato        | Elasticsearch + embeddings      |
| Sugestão automática TUSS/CID      | Não tem            | Sim (IA baseada no prontuário)  |
| Interface                         | Desktop (2000s)    | Web moderna (React + Tailwind)  |
| Mobile                            | Limitado           | Full-featured (Expo)            |
| Multi-tenant SaaS                 | On-premise         | Cloud-native SaaS               |
| Setup para novo hospital          | Meses              | Horas (self-service)            |
| Certificação SBIS                 | Sim (desde 2009)   | Preparado para (NGS1+NGS2)      |
```

---

## INSTRUÇÕES FINAIS PARA O CLAUDE CLI

```
REGRAS OBRIGATÓRIAS:
1. Use TypeScript strict mode em TUDO (tsconfig strict: true)
2. Cada módulo NestJS segue: Controller → Service → Repository → Prisma
3. Cada endpoint tem: validação (Zod/class-validator), auth guard, tenant guard, audit log
4. Cada tela React tem: loading state, error state, empty state
5. Componente de voz presente em TODA tela que aceita input de texto
6. Testes unitários para cada service (Jest, mínimo 80% cobertura)
7. Documentação Swagger em cada controller
8. Commits semânticos (feat:, fix:, chore:, docs:)
9. Código em inglês, textos de UI em português brasileiro
10. Nunca usar 'any' em TypeScript — tipar tudo

PERGUNTE-ME antes de começar cada FASE.
Comece pela FASE 1 — FUNDAÇÃO.
```

---

*Este prompt foi gerado em Março/2026. Versão 1.0.*
