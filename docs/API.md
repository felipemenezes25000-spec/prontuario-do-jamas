# VoxPEP API Reference

> Version: 1.0.0
> Base URL: `https://api.voxpep.com.br/api/v1`
> Last updated: 2026-03-21

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Common Patterns](#3-common-patterns)
4. [Endpoints](#4-endpoints)
   - [Auth](#41-auth)
   - [Patients](#42-patients)
   - [Encounters](#43-encounters)
   - [Clinical Notes](#44-clinical-notes)
   - [Prescriptions](#45-prescriptions)
   - [Vital Signs](#46-vital-signs)
   - [Triage](#47-triage)
   - [Admissions](#48-admissions)
   - [Medications](#49-medications)
   - [Search](#410-search)
   - [AI Services](#411-ai-services)
   - [Notifications](#412-notifications)
5. [WebSocket Events](#5-websocket-events)
6. [Rate Limiting](#6-rate-limiting)
7. [Error Codes](#7-error-codes)

---

## 1. Overview

### Base URL

| Environment | URL                                     |
|-------------|-----------------------------------------|
| Production  | `https://api.voxpep.com.br/api/v1`     |
| Staging     | `https://staging-api.voxpep.com.br/api/v1` |
| Local       | `http://localhost:3000/api/v1`          |

### Content Type

All requests and responses use `application/json` unless otherwise specified.
File uploads use `multipart/form-data`.

### Required Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
X-Request-Id: <uuid>  (optional, for request tracing)
```

Note: `X-Tenant-Id` is NOT sent as a header. The tenant is extracted from
the JWT token to prevent tenant spoofing.

---

## 2. Authentication

### Login Flow

```
1. POST /auth/login          -> { accessToken, refreshToken }
2. Use accessToken in Authorization header
3. When accessToken expires (15min), POST /auth/refresh
4. On logout, POST /auth/logout to revoke tokens
```

### Token Refresh

Access tokens expire after 15 minutes. The client should proactively refresh
before expiration. Refresh tokens are single-use and rotate on each refresh.

### MFA Flow (when enabled)

```
1. POST /auth/login           -> { mfaToken, mfaRequired: true }
2. POST /auth/mfa/verify      -> { accessToken, refreshToken }
```

---

## 3. Common Patterns

### Standard Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operacao realizada com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

### Standard Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Dados invalidos",
  "errors": [
    {
      "field": "email",
      "message": "Email invalido",
      "code": "INVALID_EMAIL"
    }
  ],
  "timestamp": "2026-03-21T10:30:00.000Z",
  "path": "/api/v1/patients"
}
```

### Pagination

All list endpoints support pagination:

```
GET /patients?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

**Parameters:**

| Parameter  | Type   | Default    | Description                  |
|------------|--------|------------|------------------------------|
| page       | number | 1          | Page number (1-indexed)      |
| pageSize   | number | 20         | Items per page (max: 100)    |
| sortBy     | string | createdAt  | Field to sort by             |
| sortOrder  | string | desc       | asc or desc                  |

**Paginated Response:**

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "meta": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

### Filtering

List endpoints accept filter parameters as query strings:

```
GET /patients?search=joao&status=ACTIVE&gender=MALE&minAge=30&maxAge=60
GET /encounters?status=IN_PROGRESS&departmentId=uuid&startDate=2026-01-01
```

### Field Selection

Use the `fields` parameter to request only specific fields:

```
GET /patients?fields=id,fullName,cpf,dateOfBirth
```

---

## 4. Endpoints

### 4.1 Auth

#### POST /auth/login

Authenticate a user and receive tokens.

**Request:**
```json
{
  "email": "dr.silva@hospital.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
    "expiresIn": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "dr.silva@hospital.com",
      "fullName": "Dr. Carlos Silva",
      "role": "DOCTOR",
      "tenantId": "660e8400-e29b-41d4-a716-446655440000"
    }
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

**Response (401 - Invalid credentials):**
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Email ou senha invalidos",
  "timestamp": "2026-03-21T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

**Response (200 - MFA required):**
```json
{
  "success": true,
  "data": {
    "mfaRequired": true,
    "mfaToken": "temp-mfa-token-uuid",
    "mfaMethods": ["TOTP", "SMS"]
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /auth/register

Register a new user (admin-only or self-registration if tenant allows).

**Request:**
```json
{
  "email": "enfermeira.ana@hospital.com",
  "password": "SecurePass123!",
  "fullName": "Ana Beatriz Costa",
  "role": "NURSE",
  "professionalLicense": "COREN-SP 123456",
  "departmentId": "770e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "email": "enfermeira.ana@hospital.com",
    "fullName": "Ana Beatriz Costa",
    "role": "NURSE",
    "createdAt": "2026-03-21T10:30:00.000Z"
  },
  "message": "Usuario criado com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /auth/refresh

Refresh an expired access token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "bmV3IHJlZnJlc2ggdG9r...",
    "expiresIn": 900
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /auth/logout

Revoke current session tokens.

**Response (200):**
```json
{
  "success": true,
  "message": "Sessao encerrada com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### GET /auth/me

Get current authenticated user profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "dr.silva@hospital.com",
    "fullName": "Dr. Carlos Silva",
    "role": "DOCTOR",
    "professionalLicense": "CRM-SP 123456",
    "department": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Emergencia"
    },
    "tenant": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Hospital Sao Paulo"
    },
    "mfaEnabled": true,
    "lastLoginAt": "2026-03-21T08:00:00.000Z",
    "createdAt": "2025-01-15T10:00:00.000Z"
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /auth/mfa/verify

Verify MFA code during login.

**Request:**
```json
{
  "mfaToken": "temp-mfa-token-uuid",
  "code": "123456",
  "method": "TOTP"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
    "expiresIn": 900
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /auth/mfa/enable

Enable MFA for the current user.

**Request:**
```json
{
  "method": "TOTP",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBOR...",
    "backupCodes": [
      "A1B2C3D4",
      "E5F6G7H8",
      "I9J0K1L2",
      "M3N4O5P6",
      "Q7R8S9T0"
    ]
  },
  "message": "Escaneie o QR code com seu aplicativo autenticador",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.2 Patients

#### GET /patients

List patients with filtering and pagination.

**Query Parameters:**

| Parameter   | Type   | Description                        |
|-------------|--------|------------------------------------|
| search      | string | Search by name, CPF, or MRN        |
| status      | enum   | ACTIVE, INACTIVE, DECEASED         |
| gender      | enum   | MALE, FEMALE, OTHER                |
| minAge      | number | Minimum age                        |
| maxAge      | number | Maximum age                        |
| bloodType   | enum   | A_POS, A_NEG, B_POS, etc.         |
| hasAllergy  | boolean| Filter patients with allergies     |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440000",
        "fullName": "Joao Pedro Oliveira",
        "cpf": "***.***.***-12",
        "dateOfBirth": "1985-06-15",
        "age": 40,
        "gender": "MALE",
        "bloodType": "O_POS",
        "phone": "(11) 99999-8888",
        "status": "ACTIVE",
        "hasActiveEncounter": true,
        "lastEncounterAt": "2026-03-20T14:00:00.000Z",
        "createdAt": "2025-01-10T10:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /patients

Create a new patient.

**Request:**
```json
{
  "fullName": "Maria Santos",
  "cpf": "123.456.789-00",
  "dateOfBirth": "1990-03-25",
  "gender": "FEMALE",
  "bloodType": "A_POS",
  "phone": "(11) 99999-7777",
  "email": "maria@email.com",
  "address": {
    "street": "Rua das Flores, 123",
    "neighborhood": "Centro",
    "city": "Sao Paulo",
    "state": "SP",
    "zipCode": "01000-000"
  },
  "emergencyContact": {
    "name": "Carlos Santos",
    "relationship": "SPOUSE",
    "phone": "(11) 99999-6666"
  },
  "insuranceProvider": "Unimed",
  "insuranceNumber": "0012345678"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440000",
    "fullName": "Maria Santos",
    "cpf": "***.***.***-00",
    "mrn": "VXP-2026-00042",
    "dateOfBirth": "1990-03-25",
    "gender": "FEMALE",
    "bloodType": "A_POS",
    "status": "ACTIVE",
    "createdAt": "2026-03-21T10:30:00.000Z"
  },
  "message": "Paciente criado com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### GET /patients/:id

Get a single patient with full details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "fullName": "Joao Pedro Oliveira",
    "cpf": "***.***.***-12",
    "mrn": "VXP-2026-00001",
    "dateOfBirth": "1985-06-15",
    "age": 40,
    "gender": "MALE",
    "bloodType": "O_POS",
    "phone": "(11) 99999-8888",
    "email": "joao@email.com",
    "address": {
      "street": "Av. Paulista, 1000",
      "neighborhood": "Bela Vista",
      "city": "Sao Paulo",
      "state": "SP",
      "zipCode": "01310-000"
    },
    "emergencyContact": {
      "name": "Ana Oliveira",
      "relationship": "SPOUSE",
      "phone": "(11) 99999-7777"
    },
    "insuranceProvider": "Bradesco Saude",
    "insuranceNumber": "9876543210",
    "allergies": [
      {
        "id": "uuid",
        "substance": "Penicilina",
        "severity": "SEVERE",
        "reaction": "Anafilaxia"
      }
    ],
    "medicalHistory": [
      {
        "id": "uuid",
        "condition": "Hipertensao arterial",
        "icdCode": "I10",
        "status": "ACTIVE",
        "diagnosedAt": "2020-06-01"
      }
    ],
    "status": "ACTIVE",
    "createdAt": "2025-01-10T10:00:00.000Z",
    "updatedAt": "2026-03-20T14:00:00.000Z"
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### PUT /patients/:id

Update patient information.

**Request:**
```json
{
  "phone": "(11) 99999-5555",
  "address": {
    "street": "Rua Nova, 456",
    "neighborhood": "Vila Mariana",
    "city": "Sao Paulo",
    "state": "SP",
    "zipCode": "04000-000"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "...updated patient..." },
  "message": "Paciente atualizado com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### DELETE /patients/:id

Soft-delete a patient (sets status to INACTIVE).

**Response (200):**
```json
{
  "success": true,
  "message": "Paciente desativado com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### GET /patients/:id/encounters

List all encounters for a patient.

#### GET /patients/:id/allergies

List allergies for a patient.

#### POST /patients/:id/allergies

Add an allergy to a patient.

**Request:**
```json
{
  "substance": "Dipirona",
  "severity": "MODERATE",
  "reaction": "Urticaria",
  "notes": "Reacao confirmada em 2024"
}
```

#### GET /patients/:id/medical-history

List medical history entries.

#### POST /patients/:id/medical-history

Add a medical history entry.

**Request:**
```json
{
  "condition": "Diabetes Mellitus Tipo 2",
  "icdCode": "E11",
  "status": "ACTIVE",
  "diagnosedAt": "2022-01-15",
  "notes": "Em tratamento com metformina"
}
```

---

### 4.3 Encounters

#### GET /encounters

List encounters with filtering.

**Query Parameters:**

| Parameter     | Type   | Description                          |
|---------------|--------|--------------------------------------|
| status        | enum   | WAITING, IN_PROGRESS, COMPLETED, ... |
| departmentId  | uuid   | Filter by department                 |
| doctorId      | uuid   | Filter by attending doctor           |
| patientId     | uuid   | Filter by patient                    |
| type          | enum   | EMERGENCY, OUTPATIENT, INPATIENT     |
| startDate     | date   | Filter from date                     |
| endDate       | date   | Filter to date                       |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440000",
        "patient": {
          "id": "990e8400-...",
          "fullName": "Joao Pedro Oliveira",
          "age": 40,
          "mrn": "VXP-2026-00001"
        },
        "doctor": {
          "id": "550e8400-...",
          "fullName": "Dr. Carlos Silva"
        },
        "department": {
          "id": "770e8400-...",
          "name": "Emergencia"
        },
        "type": "EMERGENCY",
        "status": "IN_PROGRESS",
        "chiefComplaint": "Dor toracica ha 2 horas",
        "triageColor": "RED",
        "startedAt": "2026-03-21T08:00:00.000Z",
        "bed": {
          "id": "uuid",
          "number": "E-04",
          "room": "Sala Vermelha"
        }
      }
    ],
    "meta": { "...pagination..." }
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /encounters

Create a new encounter.

**Request:**
```json
{
  "patientId": "990e8400-e29b-41d4-a716-446655440000",
  "type": "EMERGENCY",
  "departmentId": "770e8400-e29b-41d4-a716-446655440000",
  "chiefComplaint": "Dor toracica ha 2 horas",
  "notes": "Paciente chegou consciente e orientado"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440000",
    "status": "WAITING",
    "type": "EMERGENCY",
    "chiefComplaint": "Dor toracica ha 2 horas",
    "startedAt": "2026-03-21T10:30:00.000Z"
  },
  "message": "Atendimento criado com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### GET /encounters/:id

Get encounter with full details including notes, prescriptions, vitals.

#### PUT /encounters/:id

Update encounter details.

#### PATCH /encounters/:id/status

Transition encounter status.

**Request:**
```json
{
  "status": "IN_PROGRESS",
  "doctorId": "550e8400-e29b-41d4-a716-446655440000",
  "bedId": "uuid"
}
```

**Valid Status Transitions:**

```
WAITING -> IN_PROGRESS (doctor starts encounter)
IN_PROGRESS -> OBSERVATION (patient needs monitoring)
OBSERVATION -> IN_PROGRESS (doctor resumes)
IN_PROGRESS -> COMPLETED (encounter finished)
IN_PROGRESS -> TRANSFERRED (patient transferred)
WAITING -> CANCELLED (patient left)
* -> DISCHARGED (patient discharged from facility)
```

#### GET /encounters/:id/timeline

Get the complete event timeline for an encounter.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventType": "ENCOUNTER_CREATED",
      "description": "Atendimento criado",
      "user": { "fullName": "Recepcionista Maria" },
      "createdAt": "2026-03-21T08:00:00.000Z"
    },
    {
      "id": "uuid",
      "eventType": "TRIAGE_COMPLETED",
      "description": "Triagem: Vermelho (Manchester)",
      "user": { "fullName": "Enf. Ana Costa" },
      "createdAt": "2026-03-21T08:05:00.000Z"
    },
    {
      "id": "uuid",
      "eventType": "VITALS_RECORDED",
      "description": "Sinais vitais registrados: PA 180/110, FC 95",
      "user": { "fullName": "Enf. Ana Costa" },
      "createdAt": "2026-03-21T08:06:00.000Z"
    },
    {
      "id": "uuid",
      "eventType": "NOTE_SIGNED",
      "description": "Nota clinica assinada (SOAP)",
      "user": { "fullName": "Dr. Carlos Silva" },
      "createdAt": "2026-03-21T08:30:00.000Z"
    }
  ],
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.4 Clinical Notes

#### GET /encounters/:encounterId/notes

List all clinical notes for an encounter.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440000",
      "type": "SOAP",
      "status": "SIGNED",
      "subjective": "Paciente refere dor toracica em aperto, de forte intensidade, irradiando para membro superior esquerdo, iniciada ha aproximadamente 2 horas. Nega febre. Refere nauseas.",
      "objective": "REG, consciente, orientado, taquicardico. PA: 180/110 mmHg, FC: 95 bpm, FR: 22 irpm, SpO2: 94% em ar ambiente. ACV: bulhas ritmicas, sem sopros. AR: MV presente bilateral, sem RA.",
      "assessment": "Sindrome coronariana aguda. Hipertensao arterial descompensada.",
      "plan": "1. ECG 12 derivacoes URGENTE\n2. Troponina, CK-MB, hemograma, coagulograma\n3. AAS 200mg VO agora\n4. Morfina 2mg IV se dor intensa\n5. Nitrato SL se PA > 120/80\n6. Encaminhar para cardiologia",
      "aiGenerated": true,
      "signedBy": {
        "id": "550e8400-...",
        "fullName": "Dr. Carlos Silva",
        "professionalLicense": "CRM-SP 123456"
      },
      "signedAt": "2026-03-21T08:30:00.000Z",
      "createdAt": "2026-03-21T08:25:00.000Z"
    }
  ],
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /encounters/:encounterId/notes

Create a new clinical note.

**Request:**
```json
{
  "type": "SOAP",
  "subjective": "Paciente refere melhora da dor...",
  "objective": "PA: 140/90 mmHg, FC: 78 bpm...",
  "assessment": "SCA em resolucao...",
  "plan": "Manter protocolo...",
  "aiGenerated": false
}
```

#### POST /encounters/:encounterId/notes/:noteId/sign

Digitally sign a clinical note (makes it immutable).

**Request:**
```json
{
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cc0e8400-...",
    "status": "SIGNED",
    "signedAt": "2026-03-21T10:35:00.000Z",
    "signedBy": {
      "fullName": "Dr. Carlos Silva",
      "professionalLicense": "CRM-SP 123456"
    }
  },
  "message": "Nota assinada com sucesso",
  "timestamp": "2026-03-21T10:35:00.000Z"
}
```

#### POST /encounters/:encounterId/notes/:noteId/addendum

Add an addendum to a signed note (the original note remains unchanged).

**Request:**
```json
{
  "content": "Resultado do ECG: supradesnivelamento de ST em V1-V4. Confirmado IAM anterior. Paciente encaminhado para hemodinamica.",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "dd0e8400-...",
    "parentNoteId": "cc0e8400-...",
    "type": "ADDENDUM",
    "content": "Resultado do ECG: supradesnivelamento de ST em V1-V4...",
    "status": "SIGNED",
    "signedAt": "2026-03-21T11:00:00.000Z"
  },
  "message": "Adendo adicionado com sucesso",
  "timestamp": "2026-03-21T11:00:00.000Z"
}
```

---

### 4.5 Prescriptions

#### GET /encounters/:encounterId/prescriptions

List prescriptions for an encounter.

#### POST /encounters/:encounterId/prescriptions

Create a new prescription.

**Request:**
```json
{
  "type": "MEDICATION",
  "urgency": "URGENT",
  "items": [
    {
      "medicationId": "uuid",
      "name": "Acido Acetilsalicilico (AAS)",
      "dose": "200",
      "doseUnit": "mg",
      "route": "ORAL",
      "frequency": "ONCE",
      "instructions": "Mastigar e engolir imediatamente",
      "startDate": "2026-03-21"
    },
    {
      "medicationId": "uuid",
      "name": "Sulfato de Morfina",
      "dose": "2",
      "doseUnit": "mg",
      "route": "INTRAVENOUS",
      "frequency": "IF_NEEDED",
      "instructions": "Administrar lentamente se dor intensa (EVA >= 7). Maximo 10mg/4h.",
      "startDate": "2026-03-21"
    },
    {
      "medicationId": "uuid",
      "name": "Enoxaparina",
      "dose": "60",
      "doseUnit": "mg",
      "route": "SUBCUTANEOUS",
      "frequency": "EVERY_12H",
      "instructions": "Aplicar no abdomen",
      "startDate": "2026-03-21",
      "duration": 5,
      "durationUnit": "DAYS"
    }
  ],
  "notes": "Protocolo SCA com supra de ST"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "ee0e8400-...",
    "status": "DRAFT",
    "type": "MEDICATION",
    "urgency": "URGENT",
    "items": [ "...prescription items..." ],
    "createdAt": "2026-03-21T10:30:00.000Z"
  },
  "message": "Prescricao criada com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /encounters/:encounterId/prescriptions/:id/sign

Sign a prescription (makes it active and visible to pharmacy).

**Request:**
```json
{
  "password": "SecurePass123!"
}
```

#### POST /encounters/:encounterId/prescriptions/:id/items/:itemId/dispense

Mark a prescription item as dispensed (pharmacy role).

**Request:**
```json
{
  "quantity": 1,
  "lot": "LOT-2026-001",
  "expirationDate": "2027-06-01",
  "notes": "Dispensado pela farmacia central"
}
```

#### POST /encounters/:encounterId/prescriptions/:id/check

Run AI-powered drug interaction and allergy checks.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "safe": false,
    "alerts": [
      {
        "type": "DRUG_INTERACTION",
        "severity": "HIGH",
        "message": "AAS + Enoxaparina: risco aumentado de sangramento",
        "recommendation": "Monitorar sinais de sangramento. Considerar ajuste de dose."
      },
      {
        "type": "ALLERGY_WARNING",
        "severity": "CRITICAL",
        "message": "Paciente com alergia registrada a Penicilina. Verificar reatividade cruzada.",
        "relatedAllergy": "Penicilina"
      }
    ]
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.6 Vital Signs

#### GET /encounters/:encounterId/vitals

List vital sign recordings for an encounter.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ff0e8400-...",
      "bloodPressureSystolic": 180,
      "bloodPressureDiastolic": 110,
      "heartRate": 95,
      "respiratoryRate": 22,
      "temperature": 36.5,
      "oxygenSaturation": 94,
      "painScale": 8,
      "glasgowComaScale": 15,
      "recordedBy": {
        "fullName": "Enf. Ana Costa"
      },
      "recordedAt": "2026-03-21T08:06:00.000Z"
    }
  ],
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /encounters/:encounterId/vitals

Record new vital signs.

**Request:**
```json
{
  "bloodPressureSystolic": 140,
  "bloodPressureDiastolic": 90,
  "heartRate": 78,
  "respiratoryRate": 18,
  "temperature": 36.8,
  "oxygenSaturation": 97,
  "painScale": 4,
  "glasgowComaScale": 15,
  "notes": "Melhora apos medicacao"
}
```

#### GET /encounters/:encounterId/vitals/trends

Get vital sign trends over time (for charting).

**Query Parameters:**

| Parameter | Type   | Description                            |
|-----------|--------|----------------------------------------|
| type      | enum   | BLOOD_PRESSURE, HEART_RATE, etc.       |
| hours     | number | Number of hours to look back (default: 24) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "type": "BLOOD_PRESSURE",
    "points": [
      { "timestamp": "2026-03-21T08:06:00Z", "systolic": 180, "diastolic": 110 },
      { "timestamp": "2026-03-21T10:00:00Z", "systolic": 160, "diastolic": 100 },
      { "timestamp": "2026-03-21T12:00:00Z", "systolic": 140, "diastolic": 90 }
    ],
    "normalRange": {
      "systolic": { "min": 90, "max": 140 },
      "diastolic": { "min": 60, "max": 90 }
    }
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.7 Triage

#### GET /triage/queue

Get the current triage queue.

**Query Parameters:**

| Parameter     | Type   | Description                    |
|---------------|--------|--------------------------------|
| departmentId  | uuid   | Filter by department           |
| color         | enum   | RED, ORANGE, YELLOW, GREEN, BLUE |
| status        | enum   | WAITING, IN_TRIAGE, COMPLETED  |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "patient": {
          "fullName": "Joao Pedro Oliveira",
          "age": 40,
          "mrn": "VXP-2026-00001"
        },
        "encounter": {
          "id": "uuid",
          "chiefComplaint": "Dor toracica"
        },
        "color": "RED",
        "protocol": "MANCHESTER",
        "discriminator": "Dor toracica com sudorese",
        "waitTime": "00:03:00",
        "queuePosition": 1,
        "status": "WAITING",
        "createdAt": "2026-03-21T08:00:00.000Z"
      }
    ],
    "summary": {
      "RED": 1,
      "ORANGE": 3,
      "YELLOW": 8,
      "GREEN": 12,
      "BLUE": 2,
      "total": 26,
      "averageWaitTime": "00:45:00"
    }
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /encounters/:encounterId/triage

Create or update triage for an encounter.

**Request:**
```json
{
  "protocol": "MANCHESTER",
  "color": "RED",
  "discriminator": "Dor toracica com sudorese",
  "vitals": {
    "bloodPressureSystolic": 180,
    "bloodPressureDiastolic": 110,
    "heartRate": 95,
    "respiratoryRate": 22,
    "temperature": 36.5,
    "oxygenSaturation": 94,
    "painScale": 8
  },
  "notes": "Paciente diaforetico, ansioso, dor precordial EVA 8/10",
  "aiAssisted": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "color": "RED",
    "protocol": "MANCHESTER",
    "discriminator": "Dor toracica com sudorese",
    "priority": 1,
    "expectedWaitTime": "00:00:00",
    "message": "Atendimento IMEDIATO"
  },
  "message": "Triagem realizada com sucesso",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.8 Admissions

#### POST /admissions/admit

Admit a patient to an inpatient bed.

**Request:**
```json
{
  "encounterId": "bb0e8400-...",
  "bedId": "uuid",
  "admissionType": "EMERGENCY",
  "diagnosis": "IAM anterior",
  "icdCode": "I21.0",
  "attendingDoctorId": "550e8400-...",
  "estimatedStay": 5,
  "notes": "Paciente pos-angioplastia. Monitorar sinais vitais a cada 2h."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient": { "fullName": "Joao Pedro Oliveira" },
    "bed": { "number": "UTI-03", "room": "UTI Coronariana" },
    "status": "ADMITTED",
    "admittedAt": "2026-03-21T12:00:00.000Z"
  },
  "message": "Paciente internado com sucesso",
  "timestamp": "2026-03-21T12:00:00.000Z"
}
```

#### POST /admissions/:id/discharge

Discharge a patient.

**Request:**
```json
{
  "dischargeType": "MEDICAL",
  "dischargeSummary": "Paciente evoluiu bem apos angioplastia primaria...",
  "followUpInstructions": "Retorno com cardiologista em 7 dias. Manter medicacoes prescritas.",
  "prescriptionsOnDischarge": [
    { "medication": "AAS 100mg", "instructions": "1 comprimido VO 1x/dia, continuo" },
    { "medication": "Clopidogrel 75mg", "instructions": "1 comprimido VO 1x/dia por 12 meses" },
    { "medication": "Atorvastatina 40mg", "instructions": "1 comprimido VO a noite, continuo" }
  ],
  "password": "SecurePass123!"
}
```

#### POST /admissions/:id/transfer

Transfer a patient to a different bed/unit.

**Request:**
```json
{
  "toBedId": "uuid",
  "reason": "Alta da UTI para enfermaria",
  "notes": "Paciente estavel, sem dor, hemodinamicamente estavel"
}
```

#### GET /admissions/bed-map

Get the current bed map for a department.

**Query Parameters:**

| Parameter     | Type | Description          |
|---------------|------|----------------------|
| departmentId  | uuid | Filter by department |
| floor         | number | Filter by floor    |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "department": "UTI Coronariana",
    "beds": [
      {
        "id": "uuid",
        "number": "UTI-01",
        "status": "OCCUPIED",
        "patient": {
          "fullName": "Maria Santos",
          "age": 65,
          "admittedAt": "2026-03-19T10:00:00.000Z",
          "diagnosis": "ICC descompensada"
        }
      },
      {
        "id": "uuid",
        "number": "UTI-02",
        "status": "AVAILABLE"
      },
      {
        "id": "uuid",
        "number": "UTI-03",
        "status": "OCCUPIED",
        "patient": {
          "fullName": "Joao Pedro Oliveira",
          "age": 40,
          "admittedAt": "2026-03-21T12:00:00.000Z",
          "diagnosis": "IAM anterior"
        }
      },
      {
        "id": "uuid",
        "number": "UTI-04",
        "status": "CLEANING",
        "estimatedAvailableAt": "2026-03-21T13:00:00.000Z"
      }
    ],
    "summary": {
      "total": 10,
      "occupied": 6,
      "available": 2,
      "cleaning": 1,
      "maintenance": 1,
      "occupancyRate": 0.6
    }
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.9 Medications

#### GET /medications

Search the medication catalog.

**Query Parameters:**

| Parameter       | Type   | Description                     |
|-----------------|--------|---------------------------------|
| search          | string | Search by name or active ingredient |
| category        | enum   | ANALGESIC, ANTIBIOTIC, etc.     |
| route           | enum   | ORAL, INTRAVENOUS, etc.         |
| controlledOnly  | boolean| Filter controlled substances    |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Acido Acetilsalicilico",
        "brandNames": ["Aspirina", "AAS", "Bufferin"],
        "activeIngredient": "Acido Acetilsalicilico",
        "category": "ANALGESIC",
        "availableDoses": ["100mg", "200mg", "500mg"],
        "availableRoutes": ["ORAL"],
        "controlled": false,
        "interactions": ["Warfarina", "Heparina", "Ibuprofeno"]
      }
    ],
    "meta": { "...pagination..." }
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.10 Search

#### GET /search

Global search across patients, encounters, notes, and prescriptions.

**Query Parameters:**

| Parameter | Type   | Description                        |
|-----------|--------|------------------------------------|
| q         | string | Search query                       |
| type      | enum   | patient, encounter, note, all      |
| dateFrom  | date   | Filter results from date           |
| dateTo    | date   | Filter results to date             |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "type": "patient",
        "id": "uuid",
        "title": "Joao Pedro Oliveira",
        "subtitle": "MRN: VXP-2026-00001 | CPF: ***-12",
        "highlight": "...dor <em>toracica</em>...",
        "score": 0.95
      },
      {
        "type": "encounter",
        "id": "uuid",
        "title": "Atendimento #2026-00042",
        "subtitle": "Joao Pedro Oliveira - Emergencia",
        "highlight": "...dor <em>toracica</em> ha 2 horas...",
        "score": 0.87
      }
    ],
    "totalResults": 15,
    "searchTime": "23ms"
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.11 AI Services

#### POST /ai/transcribe

Transcribe an audio file to text.

**Request:** `multipart/form-data`

| Field       | Type   | Description                         |
|-------------|--------|-------------------------------------|
| audio       | file   | Audio file (WebM, M4A, WAV, MP3)   |
| language    | string | Language hint (default: "pt")       |
| encounterId | uuid   | Associated encounter (optional)     |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "text": "Paciente refere dor no peito ha duas horas, de forte intensidade, com irradiacao para o braco esquerdo. Nega febre. Refere nauseas e sudorese.",
    "language": "pt",
    "duration": 45.2,
    "confidence": 0.94,
    "audioUrl": "https://s3.amazonaws.com/voxpep-audio/uuid.webm"
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /ai/extract-entities

Extract medical entities from text.

**Request:**
```json
{
  "text": "Paciente refere dor no peito ha duas horas...",
  "encounterId": "uuid",
  "context": "EMERGENCY"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "entities": {
      "symptoms": [
        { "text": "dor no peito", "icdCode": "R07.9", "onset": "2 horas" },
        { "text": "nauseas", "icdCode": "R11.0" },
        { "text": "sudorese", "icdCode": "R61" }
      ],
      "negated": ["febre"],
      "vitals": [],
      "medications": [],
      "procedures": [],
      "diagnoses": []
    },
    "confidence": 0.91,
    "processingTime": "1.2s"
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /ai/generate-soap

Generate a SOAP note from transcribed text and extracted entities.

**Request:**
```json
{
  "transcription": "Paciente refere dor no peito ha duas horas...",
  "entities": { "...extracted entities..." },
  "encounterId": "uuid",
  "previousNotes": []
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subjective": "Paciente refere dor toracica em aperto...",
    "objective": "REG, consciente, orientado...",
    "assessment": "Sindrome coronariana aguda...",
    "plan": "1. ECG 12 derivacoes URGENTE...",
    "confidence": 0.88,
    "isDraft": true
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### POST /ai/generate-prescription

Generate a prescription draft from clinical context.

**Request:**
```json
{
  "encounterId": "uuid",
  "diagnosis": "IAM anterior com supra de ST",
  "patientAllergies": ["Penicilina"],
  "currentMedications": []
}
```

#### POST /ai/classify-triage

AI-assisted Manchester triage classification.

**Request:**
```json
{
  "chiefComplaint": "Dor no peito",
  "vitals": {
    "bloodPressureSystolic": 180,
    "heartRate": 95,
    "oxygenSaturation": 94,
    "temperature": 36.5
  },
  "additionalInfo": "Paciente diaforetico, ansioso"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "suggestedColor": "RED",
    "protocol": "MANCHESTER",
    "discriminator": "Dor toracica com sudorese",
    "reasoning": "Dor precordial com sinais de instabilidade hemodinamica (PA elevada, taquicardia, dessaturacao) e sudorese sugere sindrome coronariana aguda. Classificacao: VERMELHO - Emergencia.",
    "confidence": 0.95,
    "isDraft": true
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

---

### 4.12 Notifications

#### GET /notifications

List notifications for the current user.

**Query Parameters:**

| Parameter | Type    | Description           |
|-----------|---------|-----------------------|
| read      | boolean | Filter by read status |
| type      | enum    | ALERT, INFO, TASK     |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "ALERT",
        "title": "Resultado critico de laboratorio",
        "message": "Troponina I: 2.5 ng/mL (ref: < 0.04) - Paciente Joao P. Oliveira",
        "severity": "CRITICAL",
        "encounterId": "uuid",
        "read": false,
        "createdAt": "2026-03-21T09:00:00.000Z"
      }
    ],
    "unreadCount": 5
  },
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

#### PATCH /notifications/:id/read

Mark a notification as read.

#### POST /notifications/read-all

Mark all notifications as read.

---

## 5. WebSocket Events

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.voxpep.com.br', {
  auth: { token: 'Bearer <accessToken>' },
  transports: ['websocket']
});
```

### Namespaces and Events

See the Architecture document (`docs/ARCHITECTURE.md`, section 9) for the
complete list of WebSocket namespaces and events.

### Voice Recording Session

```javascript
// Connect to voice namespace
const voiceSocket = io('wss://api.voxpep.com.br/voice', {
  auth: { token: 'Bearer <accessToken>' }
});

// Start recording
voiceSocket.emit('audio:start', { encounterId: 'uuid' });

// Send audio chunks (from MediaRecorder)
mediaRecorder.ondataavailable = (event) => {
  voiceSocket.emit('audio:chunk', event.data);
};

// Stop recording
voiceSocket.emit('audio:stop');

// Listen for results
voiceSocket.on('transcription:progress', (data) => {
  console.log('Partial:', data.text);
});

voiceSocket.on('transcription:complete', (data) => {
  console.log('Full:', data.text);
});

voiceSocket.on('ner:complete', (data) => {
  console.log('Entities:', data.entities);
});

voiceSocket.on('content:draft', (data) => {
  console.log('SOAP Draft:', data);
});
```

---

## 6. Rate Limiting

### Default Limits

| Scope          | Limit              | Window  |
|----------------|--------------------|---------|
| Per user       | 100 requests       | 1 minute |
| Per IP         | 300 requests       | 1 minute |
| Auth endpoints | 10 requests        | 1 minute |
| AI endpoints   | 20 requests        | 1 minute |
| File uploads   | 10 requests        | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1710000060
```

### Rate Limit Exceeded Response (429)

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Muitas requisicoes. Tente novamente em 30 segundos.",
  "retryAfter": 30,
  "timestamp": "2026-03-21T10:30:00.000Z",
  "path": "/api/v1/patients"
}
```

---

## 7. Error Codes

### HTTP Status Codes

| Code | Meaning               | When                                    |
|------|-----------------------|-----------------------------------------|
| 200  | OK                    | Successful GET, PUT, PATCH, DELETE       |
| 201  | Created               | Successful POST                          |
| 400  | Bad Request           | Validation error, malformed request      |
| 401  | Unauthorized          | Missing or invalid token                 |
| 403  | Forbidden             | Insufficient permissions                 |
| 404  | Not Found             | Resource does not exist                  |
| 409  | Conflict              | Duplicate resource (e.g., CPF exists)    |
| 422  | Unprocessable Entity  | Business rule violation                  |
| 429  | Too Many Requests     | Rate limit exceeded                      |
| 500  | Internal Server Error | Unexpected server error                  |
| 503  | Service Unavailable   | AI service or database unavailable       |

### Application Error Codes

| Code                      | Description                                  |
|---------------------------|----------------------------------------------|
| AUTH_INVALID_CREDENTIALS  | Email or password is incorrect               |
| AUTH_TOKEN_EXPIRED        | Access token has expired                     |
| AUTH_REFRESH_REVOKED      | Refresh token has been revoked               |
| AUTH_MFA_REQUIRED         | MFA verification needed                      |
| AUTH_MFA_INVALID          | Invalid MFA code                             |
| PATIENT_CPF_EXISTS        | Patient with this CPF already exists         |
| PATIENT_NOT_FOUND         | Patient ID does not exist                    |
| ENCOUNTER_INVALID_STATUS  | Invalid status transition                    |
| ENCOUNTER_ALREADY_CLOSED  | Cannot modify a completed encounter          |
| NOTE_ALREADY_SIGNED       | Cannot edit a signed note                    |
| NOTE_SIGN_UNAUTHORIZED    | Only the author or attending can sign        |
| PRESCRIPTION_INTERACTION  | Drug interaction detected                    |
| PRESCRIPTION_ALLERGY      | Patient allergy conflict                     |
| BED_NOT_AVAILABLE         | Requested bed is occupied or in maintenance  |
| TRIAGE_ALREADY_DONE       | Encounter already has a triage record        |
| AI_SERVICE_UNAVAILABLE    | AI provider is temporarily unavailable       |
| AI_PROCESSING_TIMEOUT     | AI request timed out                         |
| UPLOAD_TOO_LARGE          | File exceeds maximum size (50MB)             |
| TENANT_LIMIT_REACHED      | Tenant has reached their plan limit          |
