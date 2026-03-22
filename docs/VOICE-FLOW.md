# VoxPEP Voice Pipeline Documentation

> Version: 1.0.0
> Last updated: 2026-03-21

---

## Table of Contents

1. [Overview](#1-overview)
2. [Audio Capture](#2-audio-capture)
3. [Streaming Transport](#3-streaming-transport)
4. [Speech-to-Text](#4-speech-to-text)
5. [Medical NER](#5-medical-ner)
6. [Content Generation](#6-content-generation)
7. [User Review and Signing](#7-user-review-and-signing)
8. [Error Handling and Fallbacks](#8-error-handling-and-fallbacks)
9. [Security and Storage](#9-security-and-storage)
10. [Performance Benchmarks](#10-performance-benchmarks)

---

## 1. Overview

The voice pipeline is the core differentiator of VoxPEP. It transforms spoken
clinical narratives into structured, legally compliant medical records through
a multi-stage AI processing chain.

### End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   Doctor speaks        AI processes           Doctor reviews            │
│   into microphone      in background          and signs                 │
│                                                                         │
│   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐   │
│   │Capt.│─>│Trans│─>│ STT │─>│ NER │─>│ Gen │─>│ Rev │─>│Sign │   │
│   │     │  │port │  │     │  │     │  │     │  │iew  │  │     │   │
│   └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘   │
│   ~0ms     ~100ms    ~3-8s    ~2-4s    ~3-5s    Manual    ~1s        │
│                                                                         │
│   Total AI processing time: ~8-17 seconds                               │
│   User perceives: streaming partial results within ~4 seconds           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Streaming first**: show partial results as soon as possible
2. **Graceful degradation**: every stage has a fallback
3. **User control**: AI always produces drafts, never final records
4. **Audit everything**: every audio file and transformation is logged
5. **Offline capable**: audio stored locally when network is unavailable

---

## 2. Audio Capture

### 2.1 Web (MediaRecorder API)

The web client uses the browser-native MediaRecorder API for audio capture.

**Configuration:**

```
Codec:        WebM/Opus (preferred) or WAV (fallback)
Sample rate:  16,000 Hz (optimal for speech recognition)
Channels:     Mono (1 channel)
Bit rate:     32 kbps (Opus) or 256 kbps (WAV)
Chunk size:   250ms intervals (timeslice parameter)
Max duration: 300 seconds (5 minutes, configurable per tenant)
```

**Browser Compatibility:**

| Browser        | Opus/WebM | WAV Fallback | Status  |
|----------------|-----------|--------------|---------|
| Chrome 120+    | Yes       | Yes          | Primary |
| Firefox 120+   | Yes       | Yes          | Primary |
| Safari 17+     | No        | Yes          | Supported |
| Edge 120+      | Yes       | Yes          | Primary |

**Permission Flow:**

```
1. User clicks voice button
2. Browser prompts for microphone permission (first time only)
3. If granted: initialize MediaRecorder
4. If denied: show error with instructions to enable in settings
5. If unavailable: show error, suggest using mobile app
```

**UI Components:**

```
┌────────────────────────────────────────────┐
│                                            │
│   ┌──────────────────────────────────┐    │
│   │  ~~~~~ Waveform Display ~~~~~    │    │
│   └──────────────────────────────────┘    │
│                                            │
│   ○ Recording: 01:23 / 05:00              │
│                                            │
│   [ ■ Stop ]  [ ⏸ Pause ]  [ ✕ Cancel ]  │
│                                            │
└────────────────────────────────────────────┘
```

The waveform visualization uses the Web Audio API (AnalyserNode) to provide
real-time visual feedback. The visualization runs at 30fps using
requestAnimationFrame and renders to a canvas element.

### 2.2 Mobile (expo-av)

The mobile client uses Expo's audio library for recording.

**Configuration:**

```
Codec:             AAC (M4A container)
Sample rate:       16,000 Hz
Channels:          Mono
Bit rate:          64 kbps
Recording quality: Audio.RecordingOptionsPresets.HIGH_QUALITY
```

**Offline Support:**

When the device is offline, the mobile app:
1. Records audio and stores it in the device filesystem
2. Creates a queue entry in AsyncStorage with metadata
3. Shows a "pending sync" indicator on the encounter
4. When connectivity returns, uploads audio in order (FIFO)
5. Processes through the normal STT/NER/generation pipeline
6. Notifies the user when processing is complete

**Background Recording:**

The mobile app supports background audio recording for situations where the
doctor needs to switch apps (e.g., to check a reference). Background recording
uses expo-task-manager and expo-background-fetch.

---

## 3. Streaming Transport

### 3.1 WebSocket Protocol (Socket.IO)

Audio data is streamed from client to server via Socket.IO in the `/voice`
namespace. This provides real-time bidirectional communication for audio
streaming and progressive result delivery.

### 3.2 Session Lifecycle

```
CLIENT                                          SERVER
  │                                                │
  │  ──── Connect to /voice namespace ────────>    │
  │       { auth: { token: "Bearer ..." } }        │
  │                                                │
  │  <──── connection:established ────────────     │
  │       { sessionId: "uuid" }                    │
  │                                                │
  │  ──── audio:start ───────────────────────>     │
  │       {                                        │
  │         encounterId: "uuid",                   │
  │         format: "webm-opus",                   │
  │         sampleRate: 16000,                     │
  │         context: "SOAP_NOTE"                   │
  │       }                                        │
  │                                                │
  │  <──── audio:ready ──────────────────────     │
  │       { recordingId: "uuid" }                  │
  │                                                │
  │  ──── audio:chunk ───────────────────────>     │ Buffer chunk
  │       { binary: ArrayBuffer(4096) }            │
  │  ──── audio:chunk ───────────────────────>     │ Buffer chunk
  │  ──── audio:chunk ───────────────────────>     │ Buffer chunk
  │       ...repeats every 250ms...                │
  │                                                │
  │  ──── audio:stop ────────────────────────>     │
  │                                                │
  │  <──── audio:processing ─────────────────     │
  │       { status: "uploading_to_s3" }            │
  │                                                │
  │  <──── audio:processing ─────────────────     │
  │       { status: "transcribing" }               │
  │                                                │
  │  <──── transcription:progress ───────────     │ Partial text
  │       { text: "Paciente refere dor...",        │
  │         isFinal: false }                       │
  │                                                │
  │  <──── transcription:complete ───────────     │ Full text
  │       { text: "Paciente refere dor no...",     │
  │         confidence: 0.94,                      │
  │         duration: 45.2 }                       │
  │                                                │
  │  <──── ner:progress ─────────────────────     │
  │       { status: "extracting_entities" }        │
  │                                                │
  │  <──── ner:complete ─────────────────────     │ Entities
  │       { entities: { symptoms: [...],           │
  │         medications: [...] } }                 │
  │                                                │
  │  <──── content:progress ─────────────────     │
  │       { status: "generating_soap" }            │
  │                                                │
  │  <──── content:draft ────────────────────     │ Draft content
  │       { type: "SOAP",                          │
  │         subjective: "...",                     │
  │         objective: "...",                      │
  │         assessment: "...",                     │
  │         plan: "..." }                          │
  │                                                │
```

### 3.3 Chunk Format

Audio chunks are sent as raw binary data over the WebSocket connection.
Each chunk is approximately 4KB (250ms of Opus audio at 32kbps).

**Server-Side Buffering:**

The server buffers incoming chunks in memory until the `audio:stop` event.
The complete audio is then:
1. Concatenated into a single buffer
2. Uploaded to S3 for permanent storage
3. Sent to the transcription service

**Memory Management:**

- Max buffer size per session: 50MB (enforced server-side)
- If buffer limit is reached, the server sends `audio:error` with
  `BUFFER_OVERFLOW` code and the client stops recording
- Idle sessions (no chunks for 30s) are automatically closed
- Completed sessions are cleaned up immediately after S3 upload

### 3.4 Reconnection Handling

If the WebSocket connection drops during recording:

1. Socket.IO automatically attempts reconnection (3 retries, 1s/2s/5s delays)
2. If reconnected within 10s, the session resumes with the same recordingId
3. The client re-sends any chunks that were buffered locally during disconnect
4. If reconnection fails, the client saves audio locally and shows a
   "recording saved offline" message
5. On next successful connection, pending audio is uploaded via HTTP fallback

---

## 4. Speech-to-Text

### 4.1 Primary: OpenAI Whisper

VoxPEP uses the Whisper API (model: `whisper-1`) for speech-to-text.

**API Configuration:**

```
Model:       whisper-1
Language:    pt (Portuguese)
Format:      verbose_json (includes word-level timestamps)
Temperature: 0 (deterministic output)
Prompt:      Medical vocabulary primer (see below)
```

**Medical Vocabulary Prompt:**

The Whisper API accepts a prompt parameter that helps the model recognize
domain-specific terminology. VoxPEP includes a medical vocabulary primer:

```
Termos medicos: pressao arterial, frequencia cardiaca, saturacao de oxigenio,
Glasgow, manchas, toracica, precordial, diaforetico, taquicardico, bradicardico,
dispneico, cianose, edema, eritema, petequias, equimose, hematoma, distensao
abdominal, hepatomegalia, esplenomegalia, sopro cardiaco, bulhas, estertores,
sibilos, roncos, murmúrio vesicular, timpanismo, macicez, descompressao brusca,
peritonismo, taquipneia, bradipneia, normocardico, normotermico,
eletrocardiograma, ecocardiograma, tomografia, ressonancia, hemograma,
coagulograma, gasometria, troponina, creatinina, ureia, sodio, potassio,
glicemia, hemoglobina, hematocrito, leucocitos, plaquetas, PCR, VHS.

Medicamentos: dipirona, paracetamol, ibuprofeno, diclofenaco, tramadol,
morfina, metoclopramida, ondansetrona, omeprazol, ranitidina, captopril,
enalapril, losartana, hidroclorotiazida, furosemida, espironolactona,
metformina, insulina, glibenclamida, sinvastatina, atorvastatina,
enoxaparina, heparina, warfarina, clopidogrel, AAS, amoxicilina,
cefalexina, ceftriaxona, ciprofloxacino, metronidazol, azitromicina,
salbutamol, ipratropio, prednisolona, dexametasona, hidrocortisona,
diazepam, midazolam, haloperidol, fenitoina, carbamazepina.

Abreviaturas: PA, FC, FR, SpO2, HGT, SNG, SVD, AVP, AVC, IAM, ICC, DPOC,
ITU, IRC, DM, HAS, TEP, TVP, PCR, RCP, IOT, VM, UTI.
```

### 4.2 Fallback: Google Cloud Speech-to-Text v2

If Whisper is unavailable (timeout, rate limit, or API error), VoxPEP
falls back to Google Cloud Speech-to-Text v2.

**Configuration:**

```
Model:              latest_long (optimized for long-form audio)
Language:           pt-BR
Sample rate:        16000
Encoding:           WEBM_OPUS or LINEAR16
Features:           automatic_punctuation, word_time_offsets
Adaptation:         Custom medical phrase set
```

**Fallback Trigger Conditions:**

- OpenAI API returns HTTP 429 (rate limited)
- OpenAI API returns HTTP 500/502/503 (server error)
- OpenAI API response time exceeds 15 seconds
- OpenAI API returns empty transcription for non-silent audio

When the fallback is used, the transcription result is flagged with
`provider: "google-stt"` so the system can track fallback rates.

### 4.3 Audio Preprocessing

Before sending to the STT API, the server performs:

1. **Format validation**: verify audio is in expected format (WebM/Opus or WAV)
2. **Duration check**: reject audio shorter than 0.5s (likely accidental)
3. **Silence detection**: if audio is >80% silence, warn user
4. **File size check**: split files larger than 25MB into segments
5. **Sample rate normalization**: resample to 16kHz if different

### 4.4 Streaming Transcription (Progressive)

For a better user experience, VoxPEP shows partial transcription results
as they become available:

1. Audio is split into overlapping 30-second segments
2. Each segment is sent to Whisper in parallel
3. Results are merged and deduplicated
4. Partial results are streamed to the client via WebSocket

This approach reduces perceived latency from ~8s (full audio) to ~3s
(first segment result).

---

## 5. Medical NER

### 5.1 Entity Extraction Pipeline

After transcription, the text is sent to GPT-4o for Medical Named Entity
Recognition (NER). This extracts structured medical data from free-text
clinical narratives.

**System Prompt (summarized):**

```
You are a medical NER system specialized in Brazilian Portuguese clinical text.
Extract the following entity types from the input text:

1. SYMPTOMS: patient complaints with onset, duration, severity
2. DIAGNOSES: identified or suspected conditions with ICD-10 codes
3. MEDICATIONS: drugs with dose, route, frequency
4. VITALS: vital signs with values and units
5. PROCEDURES: ordered or performed procedures
6. ALLERGIES: substance allergies with severity
7. LAB_RESULTS: laboratory values with reference ranges
8. NEGATED: explicitly denied symptoms or conditions

Output MUST be valid JSON matching the provided schema.
Do NOT invent information not present in the text.
Mark uncertain entities with confidence < 0.7.
```

### 5.2 Structured Output Format

```json
{
  "entities": {
    "symptoms": [
      {
        "text": "dor toracica em aperto",
        "normalized": "Dor toracica",
        "icdCode": "R07.9",
        "onset": "2 horas",
        "severity": "forte",
        "location": "precordial",
        "radiation": "membro superior esquerdo",
        "confidence": 0.95
      }
    ],
    "diagnoses": [
      {
        "text": "sindrome coronariana aguda",
        "icdCode": "I24.9",
        "status": "SUSPECTED",
        "confidence": 0.88
      }
    ],
    "medications": [
      {
        "name": "AAS",
        "genericName": "Acido Acetilsalicilico",
        "dose": "200",
        "doseUnit": "mg",
        "route": "ORAL",
        "frequency": "ONCE",
        "indication": "antiagregante plaquetario",
        "confidence": 0.97
      }
    ],
    "vitals": [
      {
        "type": "BLOOD_PRESSURE",
        "systolic": 180,
        "diastolic": 110,
        "unit": "mmHg",
        "confidence": 0.99
      },
      {
        "type": "HEART_RATE",
        "value": 95,
        "unit": "bpm",
        "confidence": 0.96
      }
    ],
    "procedures": [
      {
        "text": "ECG 12 derivacoes",
        "code": "89.52",
        "status": "ORDERED",
        "urgency": "URGENT",
        "confidence": 0.94
      }
    ],
    "allergies": [
      {
        "substance": "Penicilina",
        "severity": "SEVERE",
        "reaction": "anafilaxia",
        "confidence": 0.90
      }
    ],
    "negated": [
      {
        "text": "febre",
        "context": "nega febre",
        "confidence": 0.98
      }
    ]
  },
  "metadata": {
    "inputLength": 245,
    "processingTime": "2.1s",
    "modelVersion": "gpt-4o-2026-01-01",
    "overallConfidence": 0.93
  }
}
```

### 5.3 Confidence Scoring

Each extracted entity includes a confidence score (0.0 to 1.0):

| Range       | Meaning              | UI Treatment                     |
|-------------|----------------------|----------------------------------|
| 0.9 - 1.0  | High confidence      | Displayed normally               |
| 0.7 - 0.9  | Medium confidence    | Displayed with yellow highlight  |
| 0.5 - 0.7  | Low confidence       | Displayed with orange highlight  |
| < 0.5      | Very low confidence  | Not displayed (logged only)      |

### 5.4 Entity Validation

After extraction, entities are validated against:

1. **Medical dictionary**: check that medication names and ICD codes exist
2. **Patient context**: cross-reference with existing allergies and history
3. **Vital sign ranges**: flag physiologically impossible values
4. **Drug interactions**: pre-check medications against current prescriptions

---

## 6. Content Generation

### 6.1 SOAP Note Generation

The most common content generation task. GPT-4o receives:
- The full transcription
- Extracted entities
- Patient history (allergies, medications, conditions)
- Previous encounter notes (for continuity)
- Encounter context (type: emergency, outpatient, etc.)

**Output Structure:**

| Section     | Content                                           |
|-------------|---------------------------------------------------|
| Subjective  | Patient's reported symptoms, history of present illness, relevant review of systems |
| Objective   | Physical exam findings, vital signs, test results  |
| Assessment  | Clinical impression, differential diagnoses        |
| Plan        | Ordered tests, medications, follow-up, referrals   |

**Quality Controls:**

- Generated SOAP notes must reference entities from the NER output
- Subjective section must not contain physical exam findings
- Objective section must not contain patient-reported symptoms
- Assessment must reference specific findings from S and O
- Plan items must be numbered and specific

### 6.2 Prescription Generation

When the doctor's spoken narrative includes medication orders, the system
generates a structured prescription draft:

```
Input:  "Prescrever AAS duzentos miligramas via oral agora,
         morfina dois miligramas endovenosa se dor forte,
         enoxaparina sessenta miligramas subcutanea de doze em doze horas"

Output: [
  {
    "medication": "Acido Acetilsalicilico (AAS)",
    "dose": "200mg",
    "route": "VO (Via Oral)",
    "frequency": "Dose unica",
    "instructions": "Mastigar e engolir imediatamente",
    "urgency": "STAT"
  },
  {
    "medication": "Sulfato de Morfina",
    "dose": "2mg",
    "route": "IV (Intravenosa)",
    "frequency": "Se necessario (SN)",
    "instructions": "Se dor intensa (EVA >= 7). Aplicar lentamente.",
    "urgency": "IF_NEEDED"
  },
  {
    "medication": "Enoxaparina Sodica",
    "dose": "60mg",
    "route": "SC (Subcutanea)",
    "frequency": "12/12h",
    "instructions": "Aplicar no abdomen, alternando lados",
    "urgency": "ROUTINE"
  }
]
```

### 6.3 Triage Classification

For emergency encounters, the AI can suggest a Manchester triage
classification based on the chief complaint and initial assessment:

```
Input:
  Chief complaint: "Dor no peito"
  Vitals: PA 180/110, FC 95, SpO2 94%
  Additional: "Paciente diaforetico, ansioso"

Output:
  Color: RED (Emergencia)
  Discriminator: "Dor toracica com sudorese"
  Reasoning: "Dor precordial associada a sudorese em paciente
    hipertenso com taquicardia e dessaturacao sugere SCA.
    Atendimento imediato necessario."
  Wait time: 0 minutes
```

### 6.4 Discharge Summary

For completed encounters, the AI generates a comprehensive discharge
summary that includes:
- Reason for admission
- Summary of hospital course
- Diagnoses (primary and secondary)
- Procedures performed
- Discharge medications with instructions
- Follow-up appointments
- Warning signs to watch for

---

## 7. User Review and Signing

### 7.1 Draft Review Interface

AI-generated content is always presented as an editable draft:

```
┌─────────────────────────────────────────────────────────┐
│  NOTA CLINICA (Rascunho - Gerado por IA)    [Editar]   │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  S: Paciente refere dor toracica em aperto, de forte    │
│     intensidade, irradiando para MSE, ha ~2h. Nega      │
│     febre. Refere nauseas e sudorese.                   │
│     [confidence: 94%]                                   │
│                                                         │
│  O: REG, consciente, orientado, taquicardico.           │
│     PA: 180/110 mmHg | FC: 95 bpm | FR: 22 irpm        │
│     SpO2: 94% AA                                        │
│     ACV: BRNF 2T, sem sopros.                           │
│     AR: MV+, sem RA.                                    │
│     [confidence: 91%]                                   │
│                                                         │
│  A: 1. Sindrome Coronariana Aguda (I24.9)              │
│     2. Crise hipertensiva (I10)                         │
│     [confidence: 88%]                                   │
│                                                         │
│  P: 1. ECG 12 derivacoes URGENTE                        │
│     2. Troponina, CK-MB, hemograma, coagulograma       │
│     3. AAS 200mg VO agora                               │
│     4. Morfina 2mg IV SN (dor intensa)                  │
│     5. Nitrato SL se PA > 120/80                        │
│     6. Avaliar cardiologia                              │
│     [confidence: 86%]                                   │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ ✓ Assinar  │  │ ✎ Editar     │  │ ✕ Descartar   │  │
│  └────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  Voz original: [▶ Play 00:45]                          │
│  Transcricao: [Ver texto completo]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Editing Flow

1. Doctor clicks "Editar" to enter edit mode
2. Each section (S, O, A, P) becomes an editable text area
3. The doctor can modify, add, or remove content
4. Changes are tracked (diff) for the audit trail
5. After editing, the doctor can sign or save as draft

### 7.3 Digital Signing

When the doctor clicks "Assinar":

1. System prompts for password confirmation (or MFA if enabled)
2. A digital signature is created containing:
   - User ID and professional license (CRM/COREN)
   - Timestamp (server-side, tamper-proof)
   - Content hash (SHA-256 of the signed content)
   - IP address and user agent
3. The note status changes to `SIGNED`
4. The content becomes immutable
5. An audit log entry is created
6. An encounter timeline event is created
7. The note is visible to all authorized staff

### 7.4 Addendum Flow

If a signed note needs correction:

1. The doctor cannot edit the original signed note
2. Instead, they create an "Addendum" (adendo)
3. The addendum references the original note
4. The addendum is also signed and timestamped
5. Both the original and addendum are displayed together
6. The addendum clearly indicates it was added after signing

This follows CFM Resolution 1638/2002 and SBIS/CFM requirements for
electronic health record integrity.

---

## 8. Error Handling and Fallbacks

### 8.1 Fallback Chain

```
                    ┌─────────────────┐
                    │  Audio Capture   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
              ┌─────┤  WebSocket OK?  ├─────┐
              │ Yes └─────────────────┘ No  │
              │                             │
              v                             v
     ┌────────────────┐          ┌────────────────┐
     │  Stream chunks │          │  Record locally │
     │  via Socket.IO │          │  + queue sync   │
     └───────┬────────┘          └───────┬────────┘
             │                           │
             v                           v
     ┌────────────────┐          ┌────────────────┐
     │  Whisper (STT) │          │  HTTP upload    │
     │  via OpenAI    │          │  when online    │
     └───────┬────────┘          └────────────────┘
             │
      ┌──────┴──────┐
      │ Success?    │
      ├── Yes ──> Continue to NER
      └── No ───> ┌────────────────┐
                  │ Google STT v2  │
                  └───────┬────────┘
                          │
                   ┌──────┴──────┐
                   │ Success?    │
                   ├── Yes ──> Continue to NER (flagged as fallback)
                   └── No ───> Show error, offer manual text input
```

### 8.2 Error Types and Recovery

| Error                        | Recovery Strategy                       |
|------------------------------|-----------------------------------------|
| Microphone permission denied | Show instructions to enable in settings |
| WebSocket connection lost    | Auto-reconnect (3 retries), then offline mode |
| Audio buffer overflow (50MB) | Stop recording, process what we have     |
| Whisper API timeout (15s)    | Retry once, then fallback to Google STT |
| Whisper API rate limit       | Immediate fallback to Google STT        |
| NER extraction failure       | Show raw transcription, allow manual input |
| Content generation failure   | Show entities, allow manual note creation |
| S3 upload failure            | Retry with exponential backoff (3 attempts) |
| All AI services down         | Full manual mode with text input         |

### 8.3 Retry Policy

```
Retry configuration:
  - Max retries: 3
  - Backoff: exponential (1s, 2s, 4s)
  - Timeout per attempt: 15s (STT), 30s (NER/generation)
  - Circuit breaker: open after 5 consecutive failures
  - Circuit breaker reset: after 60 seconds
```

### 8.4 Offline Mode (Mobile)

When the mobile device is offline:

1. Audio is recorded and stored in device filesystem
2. Metadata is saved to AsyncStorage queue:
   ```json
   {
     "id": "local-uuid",
     "encounterId": "uuid",
     "audioPath": "/local/recordings/2026-03-21-083000.m4a",
     "duration": 45.2,
     "createdAt": "2026-03-21T08:30:00.000Z",
     "syncStatus": "PENDING",
     "retryCount": 0
   }
   ```
3. A background task checks for connectivity every 30 seconds
4. When online, recordings are uploaded in FIFO order
5. Each upload triggers the full STT -> NER -> generation pipeline
6. Results are pushed to the device via push notification
7. The encounter is updated with the AI-generated content

---

## 9. Security and Storage

### 9.1 Audio File Storage

**S3 Bucket Configuration:**

```
Bucket:         voxpep-audio-{environment}
Region:         sa-east-1 (Sao Paulo)
Encryption:     AES-256 (SSE-S3)
Versioning:     Enabled
Access:         Private (no public access)
CORS:           Restricted to app domains
```

**Object Key Structure:**

```
s3://voxpep-audio-production/
  └── {tenantId}/
      └── {year}/
          └── {month}/
              └── {encounterId}/
                  └── {recordingId}.webm
```

Example:
```
s3://voxpep-audio-production/660e8400-.../2026/03/bb0e8400-.../rec-ff0e8400-...webm
```

### 9.2 Retention Policy

Per CFM Resolution 1821/2007 and LGPD requirements:

| Data Type              | Retention Period | Storage Tier         |
|------------------------|------------------|----------------------|
| Audio recordings       | 20 years         | S3 Standard -> Glacier (after 1 year) |
| Transcriptions         | 20 years         | PostgreSQL (RDS)     |
| NER results            | 20 years         | PostgreSQL (RDS)     |
| Signed clinical notes  | 20 years         | PostgreSQL (RDS)     |
| Draft notes (unsigned) | 90 days          | PostgreSQL (RDS)     |
| Processing logs        | 2 years          | CloudWatch Logs      |

**S3 Lifecycle Policy:**

```
Rule 1: Standard -> Standard-IA after 90 days
Rule 2: Standard-IA -> Glacier after 365 days
Rule 3: Glacier -> Glacier Deep Archive after 5 years
Rule 4: Never delete (20-year legal retention)
```

### 9.3 Encryption

**In Transit:**
- Client to server: WSS (WebSocket Secure) over TLS 1.3
- Server to S3: HTTPS (AWS SDK)
- Server to OpenAI: HTTPS (API calls)

**At Rest:**
- S3: AES-256 server-side encryption (SSE-S3)
- RDS: AES-256 encryption (managed by AWS)
- Audio files are additionally encrypted at the application level with
  a per-tenant encryption key stored in AWS KMS

### 9.4 Access Control

- Audio files are never directly accessible via URL
- Access requires a signed pre-signed URL (expires in 5 minutes)
- Only the recording doctor and authorized staff can access audio
- Every access generates an audit log entry
- Bulk download requires ADMIN role + MFA verification

### 9.5 Data Anonymization

For research purposes, VoxPEP supports data anonymization:

1. Strip patient identifiers (name, CPF, phone, address)
2. Replace dates with relative offsets
3. Remove audio files (text-only export)
4. Generate anonymization certificate
5. Export as de-identified JSON/CSV

---

## 10. Performance Benchmarks

### 10.1 Target Latencies

| Stage                | Target      | Acceptable  | Max       |
|----------------------|-------------|-------------|-----------|
| Audio upload (30s)   | < 500ms     | < 1s        | < 3s      |
| Transcription (30s)  | < 3s        | < 5s        | < 8s      |
| NER extraction       | < 2s        | < 3s        | < 5s      |
| Content generation   | < 3s        | < 5s        | < 8s      |
| Total pipeline       | < 8s        | < 12s       | < 20s     |
| First partial result | < 3s        | < 5s        | < 8s      |

### 10.2 Accuracy Targets

| Metric                              | Target  | Minimum |
|--------------------------------------|---------|---------|
| Transcription word accuracy (WER)    | > 95%   | > 90%   |
| Entity extraction precision          | > 90%   | > 85%   |
| Entity extraction recall             | > 85%   | > 80%   |
| ICD-10 code accuracy                 | > 80%   | > 70%   |
| SOAP note acceptance rate (no edits) | > 60%   | > 40%   |
| Triage classification accuracy       | > 85%   | > 75%   |

### 10.3 Scalability

```
Concurrent voice sessions per API instance:  50
Max audio file size:                          50MB (~25 minutes)
Max transcription queue depth:                500 jobs
Processing throughput:                        100 transcriptions/min (cluster)
WebSocket connections per instance:           10,000
```

### 10.4 Cost per Encounter (AI services)

| Service              | Cost per encounter | Monthly (1000 encounters) |
|----------------------|--------------------|-----------------------------|
| Whisper (45s avg)    | $0.0045           | $4.50                       |
| NER (GPT-4o)         | $0.010            | $10.00                      |
| SOAP (GPT-4o)        | $0.030            | $30.00                      |
| Total AI cost        | ~$0.045           | ~$44.50                     |

These costs assume average encounter duration of 45 seconds of audio
and typical clinical narrative complexity.
