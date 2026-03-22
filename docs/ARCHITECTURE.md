# VoxPEP Architecture Document

> Last updated: 2026-03-21
> Version: 1.0.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [The Five Laws of VoxPEP](#2-the-five-laws-of-voxpep)
3. [Stack Rationale](#3-stack-rationale)
4. [Architecture Layers](#4-architecture-layers)
5. [Multi-Tenancy](#5-multi-tenancy)
6. [Authentication and Authorization](#6-authentication-and-authorization)
7. [Voice Pipeline](#7-voice-pipeline)
8. [AI Services](#8-ai-services)
9. [Real-Time Communication](#9-real-time-communication)
10. [Security and Compliance](#10-security-and-compliance)
11. [Data Model](#11-data-model)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Monitoring and Observability](#13-monitoring-and-observability)
14. [Scaling Strategy](#14-scaling-strategy)
15. [Disaster Recovery](#15-disaster-recovery)

---

## 1. System Overview

VoxPEP is a voice-first Electronic Health Records (Prontuario Eletronico do Paciente)
SaaS platform designed for Brazilian hospitals and clinics. The system captures clinical
data primarily through voice, leveraging AI to transform spoken medical narratives into
structured, searchable, and legally compliant health records.

### High-Level Architecture

```
                         +──────────────────────────+
                         |      CloudFront CDN      |
                         +────────────┬─────────────+
                                      |
                    +─────────────────┼─────────────────+
                    |                 |                  |
              +─────┴─────+   +──────┴──────+   +──────┴──────+
              |  Web App  |   | Mobile App  |   |  Admin App  |
              |  (React)  |   |   (Expo)    |   |  (planned)  |
              +─────┬─────+   +──────┬──────+   +──────┬──────+
                    |                |                  |
                    +────────────────┼──────────────────+
                                     |
                         +-----------+-----------+
                         |    ALB / API Gateway   |
                         +-----------+-----------+
                                     |
                    +────────────────┼────────────────+
                    |                                 |
              +─────┴──────+                +─────────┴────────+
              |  REST API  |                |   WebSocket API   |
              |  (NestJS)  |                |   (Socket.IO)     |
              +─────┬──────+                +─────────┬────────+
                    |                                 |
         +──────────┼──────────┼──────────────────────+
         |          |          |          |
   +─────┴───+ +───┴────+ +──┴───+ +───┴────────+
   |Postgres | | Redis  | |  S3  | |Elasticsearch|
   | (RDS)   | |(Cache) | |      | |             |
   +---------+ +--------+ +------+ +─────────────+
```

### Core Capabilities

- **Voice-First Data Entry**: Doctors speak; the system writes structured records
- **AI-Powered Clinical Intelligence**: automatic SOAP notes, NER, prescription drafts
- **Real-Time Collaboration**: live vitals, bed maps, alerts across care teams
- **Multi-Tenant SaaS**: complete data isolation between hospital tenants
- **LGPD and CFM Compliant**: audit trails, encryption, 20-year record retention

---

## 2. The Five Laws of VoxPEP

These are the non-negotiable design principles that govern every architectural decision:

### Law 1: Voice is the Primary Interface
Every screen that accepts clinical data input MUST have a voice recording button.
Doctors should never need to type more than a search query. The system captures
spoken language and converts it to structured data automatically.

### Law 2: No Data Without a Tenant
Every row in every clinical table has a `tenantId` column. There are zero exceptions.
Cross-tenant queries are impossible by design. A Prisma middleware enforces this at
the ORM level before any query reaches the database.

### Law 3: Every Mutation Leaves a Trail
Clinical data is never truly deleted (soft-delete via `deletedAt`). Every create,
update, and delete operation generates an audit log entry with the user, timestamp,
IP address, previous values, and new values. This is a CFM (Conselho Federal de
Medicina) legal requirement.

### Law 4: AI Suggests, Humans Decide
AI-generated content (SOAP notes, prescriptions, triage classifications) is always
presented as a draft. A licensed professional must review and sign before it becomes
part of the legal medical record. The system clearly marks AI-generated content.

### Law 5: Offline Resilience
The voice pipeline must degrade gracefully. If the network drops during voice
capture, the audio is stored locally and synced when connectivity returns. The
mobile app supports full offline encounter recording.

---

## 3. Stack Rationale

### Backend: NestJS 11

**Why NestJS over Express/Fastify/Hono?**
- Built-in dependency injection matches Clean Architecture patterns
- First-class TypeScript support with decorators for validation, auth, guards
- Module system enforces separation of concerns
- Built-in WebSocket gateway for Socket.IO integration
- Extensive ecosystem: @nestjs/bull for queues, @nestjs/swagger for API docs
- Enterprise-grade: used by Adidas, Roche, Capgemini in healthcare

### ORM: Prisma 6

**Why Prisma over TypeORM/Drizzle/Knex?**
- Type-safe query builder eliminates entire categories of runtime errors
- Schema-first approach: `schema.prisma` is the single source of truth
- Excellent migration system with deterministic SQL generation
- Middleware support for tenant isolation and soft-delete
- Prisma Studio for visual debugging during development
- Strong PostgreSQL support including JSON columns, enums, full-text search

### Database: PostgreSQL 16

**Why PostgreSQL over MySQL/MongoDB?**
- JSONB columns for flexible medical data without sacrificing ACID compliance
- Full-text search (with Portuguese stemming) as a fallback to Elasticsearch
- Row-level security capabilities (future enhancement)
- Mature extension ecosystem: pgcrypto, pg_trgm, PostGIS
- Excellent support on AWS RDS with Multi-AZ deployment
- 20+ year track record in healthcare systems

### Cache/Queue: Redis 7 + BullMQ

**Why Redis?**
- Sub-millisecond reads for session management and caching
- BullMQ provides reliable job queues for async AI processing
- Pub/Sub for Socket.IO adapter (multi-instance scaling)
- Rate limiting storage
- Atomic operations for real-time counters (bed availability, queue position)

### Frontend: React 19 + Vite 6

**Why React over Next.js/Remix/Angular?**
- VoxPEP is a true SPA (no SEO requirements for a medical dashboard)
- Vite provides faster dev experience than Next.js for SPAs
- React 19 concurrent features for smooth voice recording + UI updates
- Massive ecosystem of medical/charting components
- Team expertise and hiring pool in Brazil

### State Management: Zustand + TanStack Query v5

**Why this combination?**
- Zustand: minimal boilerplate for client state (UI, auth, voice recording)
- TanStack Query: automatic caching, background refetch, optimistic updates for
  server state (patients, encounters, prescriptions)
- Clear separation: Zustand for "what the UI is doing", TanStack Query for
  "what the server knows"

### UI: Tailwind CSS 4 + shadcn/ui

**Why shadcn/ui?**
- Copy-paste components (no dependency lock-in)
- Radix UI primitives for accessibility (WCAG 2.1 AA)
- Dark mode first (reduces eye strain in 24h hospital environments)
- Customizable: emerald (#10b981) accent matches healthcare branding
- Growing adoption in Brazilian medical startups

### Search: Elasticsearch 8

**Why Elasticsearch?**
- Fuzzy matching for medical terminology (paciente vs. pacient)
- Portuguese language analyzer with medical synonym expansion
- Sub-second search across millions of records
- Aggregations for clinical dashboards and analytics
- Proven in healthcare: Epic, Cerner use similar stacks

---

## 4. Architecture Layers

VoxPEP follows Clean Architecture principles adapted for NestJS:

```
┌─────────────────────────────────────────────────────────┐
│                     Controller Layer                     │
│  - HTTP request/response handling                       │
│  - Input validation (class-validator DTOs)              │
│  - Authentication guards                                │
│  - Tenant context extraction                            │
│  - Swagger documentation decorators                     │
├─────────────────────────────────────────────────────────┤
│                      Service Layer                       │
│  - Business logic and orchestration                     │
│  - Transaction management                               │
│  - Event emission (for audit logs, notifications)       │
│  - AI service integration                               │
│  - Authorization logic (role-based checks)              │
├─────────────────────────────────────────────────────────┤
│                    Repository Layer                      │
│  - Prisma queries with tenant filtering                 │
│  - Soft-delete handling                                 │
│  - Pagination and sorting                               │
│  - Complex joins and aggregations                       │
├─────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                  │
│  - Prisma Client (database)                             │
│  - Redis Client (cache/queue)                           │
│  - S3 Client (file storage)                             │
│  - OpenAI Client (AI services)                          │
│  - Elasticsearch Client (search)                        │
└─────────────────────────────────────────────────────────┘
```

### Module Structure

Each domain module follows the same structure:

```
src/modules/patients/
  ├── patients.module.ts          # NestJS module definition
  ├── patients.controller.ts      # HTTP endpoints
  ├── patients.service.ts         # Business logic
  ├── patients.repository.ts      # Prisma queries
  ├── dto/
  │   ├── create-patient.dto.ts   # Input validation
  │   ├── update-patient.dto.ts
  │   └── query-patient.dto.ts    # Pagination/filter params
  ├── entities/
  │   └── patient.entity.ts       # Response shape
  ├── guards/
  │   └── patient-access.guard.ts # Custom authorization
  └── __tests__/
      ├── patients.service.spec.ts
      └── patients.controller.spec.ts
```

### Request Lifecycle

```
HTTP Request
  │
  ├─> Global Exception Filter (catches unhandled errors)
  ├─> Global Validation Pipe (class-validator on DTOs)
  ├─> Auth Guard (JWT verification)
  ├─> Tenant Guard (extracts tenantId, injects into request)
  ├─> Role Guard (checks user role against endpoint requirements)
  │
  ├─> Controller Method
  │     └─> Service Method
  │           ├─> Repository Method (Prisma query with tenantId)
  │           ├─> Event Emitter (audit log, notifications)
  │           └─> Return DTO
  │
  └─> Response Interceptor (wraps in standard format)
        └─> { success: true, data: {...}, timestamp: "..." }
```

---

## 5. Multi-Tenancy

### Strategy: Shared Database, Shared Schema, Row-Level Isolation

Every table that contains tenant-specific data includes a non-nullable `tenantId`
column with a foreign key to the `Tenant` table.

### Implementation

**Prisma Middleware (query interceptor):**

```
Request with tenantId in context
  │
  ├─> Prisma Middleware intercepts query
  │     ├─> For findMany/findFirst: adds WHERE tenantId = ?
  │     ├─> For create: sets tenantId = ? on data
  │     ├─> For update/delete: adds WHERE tenantId = ?
  │     └─> For raw queries: BLOCKED (must use repository methods)
  │
  └─> Query executes with tenant isolation guaranteed
```

**Database indexes:**
- Every table has a composite index on `(tenantId, id)`
- Query-heavy tables have composite indexes: `(tenantId, createdAt)`,
  `(tenantId, status)`, etc.
- The `tenantId` column is the first column in all composite indexes for
  optimal B-tree traversal

### Tenant Lifecycle

```
Tenant Registration
  ├─> Create Tenant record
  ├─> Create Admin User for tenant
  ├─> Seed default data (departments, rooms, medication lists)
  ├─> Configure tenant settings (logo, name, modules)
  └─> Activate tenant
```

### Cross-Tenant Protection

- No API endpoint can accept `tenantId` as a parameter
- `tenantId` is always extracted from the JWT token
- Direct database access (Prisma Studio, psql) in production requires VPN + MFA
- Audit logs record any admin-level cross-tenant queries

---

## 6. Authentication and Authorization

### Authentication Flow

```
┌──────────┐     POST /auth/login      ┌──────────┐
│  Client  │ ──────────────────────>   │   API    │
│          │    { email, password }     │          │
│          │                           │  ┌──────┐│
│          │                           │  │Bcrypt││
│          │                           │  │Verify││
│          │                           │  └──┬───┘│
│          │                           │     │    │
│          │   { accessToken,          │  ┌──┴───┐│
│          │ <──────────────────────   │  │ JWT  ││
│          │     refreshToken }        │  │ Sign ││
│          │                           │  └──────┘│
└──────────┘                           └──────────┘
```

### Token Structure

**Access Token (15-minute TTL):**
```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "role": "DOCTOR",
  "permissions": ["read:patients", "write:encounters", "sign:notes"],
  "iat": 1710000000,
  "exp": 1710000900
}
```

**Refresh Token (7-day TTL):**
- Stored in Redis with user session metadata
- Rotated on each use (one-time use tokens)
- Revoked on logout or password change
- Family tracking: if a stolen refresh token is reused, all tokens in the
  family are revoked

### Multi-Factor Authentication (MFA)

```
Login with credentials
  │
  ├─> If MFA enabled for user:
  │     ├─> Return partial token (mfaPending: true)
  │     ├─> Send TOTP challenge (Google Authenticator / SMS)
  │     ├─> POST /auth/mfa/verify { code }
  │     └─> Return full access + refresh tokens
  │
  └─> If MFA not enabled:
        └─> Return access + refresh tokens directly
```

### Role-Based Access Control (RBAC)

| Role           | Patients | Encounters | Prescriptions | Admin | Triage |
|----------------|----------|------------|---------------|-------|--------|
| ADMIN          | Full     | Full       | Full          | Full  | Full   |
| DOCTOR         | Read/Write| Full      | Full          | None  | Read   |
| NURSE          | Read     | Read/Write | Read          | None  | Full   |
| RECEPTIONIST   | Create   | None       | None          | None  | Create |
| PHARMACIST     | Read     | Read       | Dispense      | None  | None   |
| LAB_TECH       | Read     | Read       | None          | None  | None   |

### Permission Guards

Guards are composable and stackable:

```
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.DOCTOR, Role.NURSE)
@Post('encounters/:id/notes')
createNote(@Body() dto: CreateNoteDto) { ... }
```

---

## 7. Voice Pipeline

### Complete Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VOICE PIPELINE                               │
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  Audio   │    │  Upload  │    │  Speech  │    │ Medical  │     │
│  │ Capture  │───>│   via    │───>│  to Text │───>│   NER    │     │
│  │ (Client) │    │WebSocket │    │ (Whisper)│    │ (GPT-4o) │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                       │             │
│                                                       v             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  Store   │<───│  User    │<───│   Draft  │<───│ Content  │     │
│  │  Final   │    │  Review  │    │  Output  │    │Generation│     │
│  │ (Prisma) │    │  + Sign  │    │  (JSON)  │    │ (GPT-4o) │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                       │                                             │
│                       v                                             │
│                  ┌──────────┐                                       │
│                  │  Audit   │                                       │
│                  │   Log    │                                       │
│                  └──────────┘                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Stage 1: Audio Capture

**Web (MediaRecorder API):**
- Format: WebM/Opus at 16kHz mono (optimal for Whisper)
- Chunk size: 250ms intervals for streaming
- Max duration: 5 minutes per recording (configurable)
- Visual feedback: waveform visualization + duration timer

**Mobile (expo-av):**
- Format: AAC/M4A at 16kHz mono
- Background recording support
- Offline queue with IndexedDB/AsyncStorage

### Stage 2: Transport

**WebSocket (Socket.IO):**

```
Client                              Server
  │                                    │
  ├─ audio:start {encounterId} ──────>│  Create session
  │                                    │
  ├─ audio:chunk {binary data} ──────>│  Buffer chunks
  ├─ audio:chunk {binary data} ──────>│  Buffer chunks
  ├─ audio:chunk {binary data} ──────>│  Buffer chunks
  │                                    │
  ├─ audio:stop ─────────────────────>│  Finalize audio
  │                                    │  Upload to S3
  │                                    │  Queue transcription
  │                                    │
  │<─────── transcription:progress ───│  Streaming partial text
  │<─────── transcription:progress ───│
  │<─────── transcription:complete ───│  Full transcription
  │                                    │
  │<─────── ner:complete ─────────────│  Extracted entities
  │<─────── content:draft ────────────│  Generated content
  │                                    │
```

### Stage 3: Speech-to-Text (Whisper)

- Model: `whisper-1` via OpenAI API
- Language hint: `pt` (Portuguese Brazilian)
- Prompt engineering: medical vocabulary priming
- Fallback: Google Cloud Speech-to-Text v2 if OpenAI is unavailable
- Cost optimization: audio files larger than 25MB are split into segments

### Stage 4: Medical NER (Named Entity Recognition)

GPT-4o extracts structured entities from transcribed text:

```json
{
  "entities": {
    "symptoms": ["dor no peito", "falta de ar"],
    "diagnoses": ["infarto agudo do miocardio"],
    "medications": [
      { "name": "AAS", "dose": "200mg", "route": "VO", "frequency": "1x/dia" }
    ],
    "vitals": [
      { "type": "BLOOD_PRESSURE", "systolic": 180, "diastolic": 110 }
    ],
    "procedures": ["ECG 12 derivacoes"],
    "allergies": ["penicilina"]
  },
  "confidence": 0.92,
  "flags": ["HIGH_BLOOD_PRESSURE_ALERT"]
}
```

### Stage 5: Content Generation

Based on extracted entities and encounter context, GPT-4o generates:

- **SOAP Notes**: Subjective, Objective, Assessment, Plan sections
- **Prescriptions**: structured medication orders with dose, route, frequency
- **Triage Classification**: Manchester Protocol color + justification
- **Discharge Summaries**: complete discharge documentation

### Stage 6: User Review and Signing

- AI-generated content is displayed with a "draft" badge
- Doctor can edit any field before signing
- Digital signature creates a legally binding record
- Signed content becomes immutable (amendments via addendum only)

---

## 8. AI Services

### Service Architecture

```
src/modules/ai/
  ├── ai.module.ts
  ├── services/
  │   ├── transcription.service.ts    # Whisper integration
  │   ├── ner.service.ts              # Medical entity extraction
  │   ├── soap-generator.service.ts   # SOAP note generation
  │   ├── prescription-ai.service.ts  # Prescription draft generation
  │   ├── triage-ai.service.ts        # Manchester triage classification
  │   ├── summary.service.ts          # Discharge summary generation
  │   └── search-ai.service.ts        # Semantic search enhancement
  ├── providers/
  │   ├── openai.provider.ts          # Primary: GPT-4o, Whisper
  │   └── google-ai.provider.ts       # Fallback: Gemini, Google STT
  ├── prompts/
  │   ├── ner-system.prompt.ts        # NER system prompt (Portuguese)
  │   ├── soap-system.prompt.ts       # SOAP generation prompt
  │   └── triage-system.prompt.ts     # Triage classification prompt
  └── queue/
      ├── ai-job.processor.ts         # BullMQ job processor
      └── ai-job.producer.ts          # Queue job creator
```

### Fallback Strategy

```
Request to AI Service
  │
  ├─> Try OpenAI (GPT-4o / Whisper)
  │     ├─> Success: return result
  │     └─> Failure (timeout/rate-limit/error):
  │           │
  │           ├─> Try Google AI (Gemini / Cloud STT)
  │           │     ├─> Success: return result (flagged as fallback)
  │           │     └─> Failure:
  │           │           │
  │           │           └─> Return error to user with manual input option
  │           │
  │           └─> Log incident to Sentry
  │
  └─> All AI calls are async (BullMQ) with timeout: 30s
```

### Cost Management

- Audio transcription: ~$0.006/minute (Whisper)
- NER extraction: ~$0.01/encounter (GPT-4o input/output)
- Content generation: ~$0.03/encounter (GPT-4o)
- Monthly budget alerts at 80% threshold
- Tenant-level usage tracking and billing

---

## 9. Real-Time Communication

### Socket.IO Architecture

```
┌───────────────────────────────────────────────────┐
│                  Socket.IO Server                  │
│                                                   │
│  Namespaces:                                      │
│  ├── / (default)          General notifications   │
│  ├── /vitals              Live vital signs         │
│  ├── /alerts              Clinical alerts          │
│  ├── /prescriptions       Prescription updates     │
│  ├── /beds                Bed status changes        │
│  ├── /voice               Audio streaming          │
│  └── /chat                Team messaging           │
│                                                   │
│  Adapter: Redis (for multi-instance scaling)      │
└───────────────────────────────────────────────────┘
```

### Event Reference

| Namespace      | Event                  | Direction | Description                        |
|----------------|------------------------|-----------|------------------------------------|
| /vitals        | vitals:new             | S -> C    | New vital signs recorded           |
| /vitals        | vitals:alert           | S -> C    | Vital sign out of range            |
| /alerts        | alert:critical         | S -> C    | Critical patient alert             |
| /alerts        | alert:acknowledge      | C -> S    | Staff acknowledges alert           |
| /prescriptions | prescription:new       | S -> C    | New prescription created           |
| /prescriptions | prescription:dispensed  | S -> C    | Medication dispensed               |
| /beds          | bed:status-change      | S -> C    | Bed occupied/available/cleaning    |
| /beds          | bed:transfer           | S -> C    | Patient transferred                |
| /voice         | audio:start            | C -> S    | Start voice recording session      |
| /voice         | audio:chunk            | C -> S    | Audio data chunk                   |
| /voice         | audio:stop             | C -> S    | Stop recording                     |
| /voice         | transcription:progress | S -> C    | Partial transcription result       |
| /voice         | transcription:complete | S -> C    | Final transcription                |
| /voice         | ner:complete           | S -> C    | Extracted medical entities         |
| /voice         | content:draft          | S -> C    | AI-generated content draft         |

### Room Strategy

- Each tenant has an isolated room: `tenant:{tenantId}`
- Each department: `dept:{tenantId}:{departmentId}`
- Each encounter: `encounter:{encounterId}`
- Each patient: `patient:{patientId}`
- Users join rooms based on their role and current context

---

## 10. Security and Compliance

### LGPD (Lei Geral de Protecao de Dados) Compliance

VoxPEP handles sensitive health data (dados sensiveis) under LGPD Article 11.
Compliance measures:

| Requirement                | Implementation                                        |
|----------------------------|-------------------------------------------------------|
| Legal basis                | Legitimate interest + patient consent per encounter    |
| Data minimization          | Only collect clinically necessary data                 |
| Purpose limitation         | Data used only for healthcare delivery                 |
| Data subject rights        | Export (JSON/PDF), anonymization, deletion request API |
| Data protection officer    | Configurable per tenant (DPO contact info)             |
| Breach notification        | Automated incident detection + 72-hour alert system   |
| Cross-border transfers     | Data stays in AWS sa-east-1 (Sao Paulo)               |
| Impact assessment          | DPIA document maintained per tenant                    |

### CFM (Conselho Federal de Medicina) Requirements

| Requirement                     | Implementation                                     |
|---------------------------------|----------------------------------------------------|
| Digital signature               | ICP-Brasil compatible digital certificates         |
| Record immutability             | Signed records cannot be edited (addendum only)    |
| Audit trail                     | Complete log of all access and modifications       |
| Record retention                | 20-year minimum retention for all clinical data    |
| Access control                  | Role-based with professional license verification  |
| System availability             | 99.9% uptime SLA with failover                     |

### Encryption

```
Data at Rest:
  ├── PostgreSQL: AWS RDS encryption (AES-256)
  ├── S3: Server-side encryption (SSE-S3)
  ├── Redis: In-transit encryption (TLS)
  └── Elasticsearch: Encrypted EBS volumes

Data in Transit:
  ├── HTTPS/TLS 1.3 for all API communication
  ├── WSS (WebSocket Secure) for real-time
  └── mTLS between internal services (planned)

Application-Level:
  ├── Patient CPF: AES-256-GCM encrypted in database
  ├── Passwords: bcrypt with cost factor 12
  ├── API keys: hashed with SHA-256 + salt
  └── Audio files: encrypted at rest in S3
```

### Audit Logging

Every clinical data mutation generates an audit record:

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "userId": "uuid",
  "action": "UPDATE",
  "resource": "ClinicalNote",
  "resourceId": "uuid",
  "previousValues": { "content": "old text..." },
  "newValues": { "content": "new text..." },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-03-21T10:30:00Z"
}
```

### Session Management

- Access tokens: 15-minute expiry, stored in memory only
- Refresh tokens: 7-day expiry, httpOnly secure cookie
- Concurrent session limit: 3 per user (configurable per tenant)
- Automatic logout after 30 minutes of inactivity
- Session revocation on password change or security incident

---

## 11. Data Model

### Entity Relationship Overview

```
Tenant (1) ──────── (*) User
  │                    │
  │                    ├── (1) ── (*) Session
  │                    └── (1) ── (*) AuditLog
  │
  ├── (1) ── (*) Patient
  │                │
  │                ├── (1) ── (*) Encounter
  │                │              │
  │                │              ├── (1) ── (*) ClinicalNote
  │                │              ├── (1) ── (*) Prescription
  │                │              │              └── (*) PrescriptionItem
  │                │              ├── (1) ── (*) VitalSign
  │                │              ├── (1) ── (*) LabOrder
  │                │              │              └── (*) LabResult
  │                │              └── (1) ── (1) Triage
  │                │
  │                ├── (1) ── (*) Allergy
  │                ├── (1) ── (*) MedicalHistory
  │                └── (1) ── (*) Document
  │
  ├── (1) ── (*) Department
  │                └── (*) ── (*) Room
  │                              └── (*) ── (*) Bed
  │
  └── (1) ── (*) Medication (catalog)
```

### Soft-Delete Strategy

All clinical entities use soft-delete:

- `deletedAt: DateTime?` column on every table
- Prisma middleware automatically filters `WHERE deletedAt IS NULL`
- Hard delete requires explicit bypass (admin-only, audit-logged)
- Soft-deleted records remain queryable via admin audit interface

### Event Sourcing (Encounter Timeline)

The `EncounterEvent` table captures a complete timeline:

```
EncounterEvent
  ├── id: UUID
  ├── encounterId: UUID (FK)
  ├── tenantId: UUID (FK)
  ├── eventType: ENUM (CREATED, NOTE_ADDED, PRESCRIPTION_SIGNED, ...)
  ├── payload: JSONB (event-specific data)
  ├── userId: UUID (who triggered it)
  ├── createdAt: DateTime
  └── INDEX: (encounterId, createdAt)
```

This enables:
- Complete encounter timeline reconstruction
- Real-time activity feed on encounter screen
- Undo/redo capabilities (planned)
- Compliance auditing

---

## 12. Deployment Architecture

### AWS Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS sa-east-1                             │
│                                                                 │
│  ┌──────────────┐         ┌──────────────────────┐             │
│  │  CloudFront  │────────>│     S3 (Static)      │             │
│  │  (CDN)       │         │  React App Bundle    │             │
│  └──────┬───────┘         └──────────────────────┘             │
│         │                                                       │
│         │  /api/*                                               │
│         v                                                       │
│  ┌──────────────┐                                               │
│  │     ALB      │                                               │
│  │  (HTTPS)     │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│         v                                                       │
│  ┌──────────────────────────────────────┐                      │
│  │         ECS Fargate Cluster          │                      │
│  │                                      │                      │
│  │  ┌─────────┐  ┌─────────┐          │                      │
│  │  │ API (1) │  │ API (2) │  ...     │  Auto-scaling        │
│  │  └────┬────┘  └────┬────┘          │  Min: 2, Max: 10     │
│  │       │             │               │                      │
│  └───────┼─────────────┼───────────────┘                      │
│          │             │                                        │
│    ┌─────┴─────────────┴─────┐                                 │
│    │                         │                                  │
│    v                         v                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  RDS         │  │ ElastiCache  │  │     S3       │        │
│  │  PostgreSQL  │  │  Redis       │  │  (Documents, │        │
│  │  Multi-AZ    │  │  Cluster     │  │   Audio,     │        │
│  │              │  │              │  │   Images)    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Build Pipeline

```
GitHub Push (main)
  │
  ├─> GitHub Actions CI
  │     ├─> Lint + Type Check
  │     ├─> Unit Tests (with service containers)
  │     ├─> Build Docker images
  │     └─> Push to Amazon ECR
  │
  └─> AWS CodePipeline (CD)
        ├─> Pull images from ECR
        ├─> Run database migrations (ECS task)
        ├─> Blue/Green deployment on ECS Fargate
        ├─> Health check verification
        └─> CloudFront cache invalidation
```

### Environment Strategy

| Environment | Database          | Purpose                       |
|-------------|-------------------|-------------------------------|
| local       | Docker Compose    | Developer workstation         |
| staging     | RDS (Single-AZ)  | QA and acceptance testing     |
| production  | RDS (Multi-AZ)   | Live hospital operations      |

---

## 13. Monitoring and Observability

### Error Tracking: Sentry

- Frontend and Backend SDKs configured
- Source maps uploaded during CI/CD
- Alert rules: P1 errors notify on-call via PagerDuty
- User context: tenantId, userId, role (no PHI in error reports)
- Release tracking tied to git SHA

### Metrics: CloudWatch + Grafana

**Application Metrics:**
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Active WebSocket connections
- Voice pipeline processing time
- AI service response time and cost
- Queue depth (BullMQ)

**Infrastructure Metrics:**
- CPU and memory utilization (ECS tasks)
- Database connections and query latency
- Redis memory usage and hit ratio
- S3 storage growth

**Business Metrics:**
- Active encounters per tenant
- Voice recordings per day
- AI content acceptance rate (draft vs final)
- Triage queue wait times
- Bed occupancy rates

### Dashboards

```
Grafana Dashboards:
  ├── System Health        # Overall system status
  ├── API Performance      # Request latency, error rates
  ├── Voice Pipeline       # Transcription times, success rates
  ├── AI Services          # Cost, latency, fallback rates
  ├── Database             # Connection pool, slow queries
  ├── Real-Time            # WebSocket connections, events/sec
  └── Business KPIs        # Per-tenant usage metrics
```

### Alerting Rules

| Alert                        | Threshold           | Severity | Action              |
|------------------------------|----------------------|----------|---------------------|
| API error rate > 5%          | 5min window          | P1       | PagerDuty + Slack   |
| API latency p99 > 3s        | 5min window          | P2       | Slack               |
| Voice pipeline failure > 10% | 15min window         | P1       | PagerDuty + Slack   |
| Database CPU > 80%          | 10min sustained      | P2       | Slack + auto-scale  |
| Redis memory > 80%          | Immediate            | P2       | Slack               |
| Disk usage > 85%            | Immediate            | P1       | PagerDuty           |
| Zero active ECS tasks       | Immediate            | P1       | PagerDuty           |
| AI provider downtime        | 2 consecutive fails  | P2       | Slack (auto-fallback)|

---

## 14. Scaling Strategy

### Horizontal Scaling (Compute)

```
ECS Fargate Auto-Scaling:
  ├── Target tracking: CPU at 60%
  ├── Target tracking: Memory at 70%
  ├── Step scaling: request count per target
  ├── Minimum tasks: 2 (high availability)
  ├── Maximum tasks: 10 (cost ceiling)
  └── Scale-in cooldown: 300s (avoid flapping)
```

### Database Scaling

```
PostgreSQL (RDS):
  ├── Vertical: r6g.xlarge (prod), t4g.medium (staging)
  ├── Read replicas: 1 replica for read-heavy queries
  │     ├── Dashboard aggregations
  │     ├── Search indexing (Elasticsearch sync)
  │     └── Report generation
  ├── Connection pooling: RDS Proxy (max 100 connections)
  └── Partitioning: encounter_events by month (planned)
```

### Caching Layers

```
Cache Hierarchy:
  ├── L1: In-memory (per-instance)
  │     ├── Tenant settings (5min TTL)
  │     ├── Medication catalog (1hr TTL)
  │     └── User permissions (5min TTL)
  │
  ├── L2: Redis (shared across instances)
  │     ├── Session data (15min TTL)
  │     ├── Patient search results (2min TTL)
  │     ├── Bed status map (real-time, no TTL)
  │     └── Rate limiting counters (1min windows)
  │
  └── L3: Elasticsearch (search cache)
        └── Query result cache (5min TTL)
```

### WebSocket Scaling

- Redis adapter for Socket.IO (cross-instance event broadcasting)
- Sticky sessions via ALB (WebSocket affinity)
- Connection limit: 10,000 per ECS task
- Heartbeat interval: 25s (NAT timeout safe)

---

## 15. Disaster Recovery

### Backup Strategy

| Resource     | Method                    | Frequency   | Retention |
|------------- |---------------------------|-------------|-----------|
| PostgreSQL   | RDS automated snapshots   | Daily       | 35 days   |
| PostgreSQL   | Point-in-time recovery    | Continuous  | 35 days   |
| S3 (docs)    | Cross-region replication  | Real-time   | Permanent |
| S3 (audio)   | Cross-region replication  | Real-time   | 20 years  |
| Redis        | RDB snapshots             | Hourly      | 7 days    |
| Elasticsearch| Index snapshots to S3     | Daily       | 30 days   |

### Recovery Time Objectives

| Scenario               | RTO        | RPO        |
|------------------------|------------|------------|
| Single AZ failure      | 0 (auto)   | 0          |
| Database failure       | < 5 min    | < 1 min    |
| Full region failure    | < 4 hours  | < 1 hour   |
| Data corruption        | < 1 hour   | < 5 min    |
| Ransomware/breach      | < 8 hours  | < 1 hour   |

### Incident Response

```
Incident Detected
  │
  ├─> Automated alerts (PagerDuty)
  ├─> On-call engineer responds (15min SLA)
  ├─> Assess severity and impact
  │     ├─> P1 (system down): all hands, war room
  │     ├─> P2 (degraded): primary on-call + backup
  │     └─> P3 (minor): next business day
  │
  ├─> Mitigate (rollback, scale, failover)
  ├─> Resolve root cause
  ├─> Post-mortem within 48 hours
  └─> Update runbook
```

---

## Appendix A: Technology Version Matrix

| Technology      | Version  | Update Policy          |
|-----------------|----------|------------------------|
| Node.js         | 22 LTS   | Follow LTS schedule    |
| NestJS          | 11.x     | Minor: monthly         |
| Prisma          | 6.x      | Minor: monthly         |
| React           | 19.x     | Minor: quarterly       |
| Vite            | 6.x      | Minor: quarterly       |
| PostgreSQL      | 16.x     | Major: annually        |
| Redis           | 7.x      | Major: annually        |
| Elasticsearch   | 8.12.x   | Minor: quarterly       |
| Docker          | 25.x     | Latest stable          |
| pnpm            | 9.x      | Latest stable          |
| Turborepo       | 2.x      | Latest stable          |

## Appendix B: Repository Structure

```
voxpep/
  ├── apps/
  │   ├── api/                    # NestJS backend
  │   │   ├── prisma/
  │   │   │   ├── schema.prisma   # Data model
  │   │   │   ├── migrations/     # SQL migrations
  │   │   │   └── seed.ts         # Development seed data
  │   │   ├── src/
  │   │   │   ├── main.ts
  │   │   │   ├── app.module.ts
  │   │   │   ├── common/         # Guards, pipes, filters, interceptors
  │   │   │   └── modules/
  │   │   │       ├── auth/
  │   │   │       ├── patients/
  │   │   │       ├── encounters/
  │   │   │       ├── clinical-notes/
  │   │   │       ├── prescriptions/
  │   │   │       ├── vital-signs/
  │   │   │       ├── triage/
  │   │   │       ├── admissions/
  │   │   │       ├── ai/
  │   │   │       ├── search/
  │   │   │       └── notifications/
  │   │   ├── test/
  │   │   ├── Dockerfile
  │   │   └── package.json
  │   │
  │   ├── web/                    # React frontend
  │   │   ├── src/
  │   │   │   ├── components/
  │   │   │   │   ├── ui/         # shadcn/ui components
  │   │   │   │   └── voice/      # Voice recording components
  │   │   │   ├── pages/
  │   │   │   ├── hooks/
  │   │   │   ├── stores/         # Zustand stores
  │   │   │   ├── services/       # API client (TanStack Query)
  │   │   │   └── lib/
  │   │   ├── Dockerfile
  │   │   ├── nginx.conf
  │   │   └── package.json
  │   │
  │   └── mobile/                 # React Native (Expo)
  │       └── package.json
  │
  ├── packages/
  │   ├── shared-types/           # TypeScript interfaces + enums
  │   ├── shared-utils/           # Pure utility functions
  │   └── medical-constants/      # Medical reference data
  │
  ├── infra/
  │   ├── docker-compose.yml      # Development databases
  │   └── docker-compose.prod.yml # Production-like environment
  │
  ├── docs/
  │   ├── ARCHITECTURE.md         # This document
  │   ├── API.md                  # API reference
  │   └── VOICE-FLOW.md           # Voice pipeline documentation
  │
  ├── .github/
  │   └── workflows/
  │       └── ci.yml              # GitHub Actions CI pipeline
  │
  ├── .env.development            # Development environment template
  ├── CLAUDE.md                   # AI assistant instructions
  ├── turbo.json                  # Turborepo configuration
  ├── pnpm-workspace.yaml         # Workspace definition
  └── package.json                # Root package.json
```
