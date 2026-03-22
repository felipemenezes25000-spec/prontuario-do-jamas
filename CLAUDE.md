# VoxPEP — Prontuario Eletronico Inteligente

## Project
Voice-first Electronic Health Records (PEP) SaaS for Brazilian hospitals.
"Fale. O prontuario escuta."

## Stack
- Backend: NestJS 11, Prisma 6, PostgreSQL 16, Redis 7, BullMQ, Socket.IO
- Frontend: React 19, Vite 6, Tailwind CSS 4, shadcn/ui, Zustand, TanStack Query v5
- AI: OpenAI Whisper (voice), GPT-4o (NER/SOAP/prescriptions), Elasticsearch (search)
- Infra: Docker, AWS (ECS Fargate, RDS, S3, ElastiCache, CloudFront)

## Monorepo Structure
pnpm workspaces + Turborepo
- apps/api — NestJS backend
- apps/web — React frontend
- apps/mobile — React Native (Expo) mobile app
- packages/shared-types — TypeScript enums and interfaces
- packages/shared-utils — Pure utility functions
- packages/medical-constants — Medical reference data (routes, triage, medications)

## Commands
- `pnpm install` — install all deps
- `pnpm dev` — start api + web in parallel
- `pnpm build` — build all packages and apps
- `pnpm lint` — lint everything
- `pnpm test` — run all tests
- `docker compose -f infra/docker-compose.yml up -d` — start databases
- `cd apps/api && npx prisma migrate dev` — run migrations
- `cd apps/api && npx prisma db seed` — seed development data
- `cd apps/api && npx prisma studio` — visual database editor

## Key Conventions
- TypeScript strict mode everywhere — never use `any`
- Code in English, UI text in Portuguese Brazilian
- NestJS modules: Controller -> Service -> Prisma
- Every endpoint: validation (class-validator) + auth guard + tenant guard + audit log
- Voice button on every data-entry screen
- Dark mode default with emerald (#10b981) accent
- Semantic commits: feat:, fix:, chore:, docs:
- Minimum 80% test coverage for services

## Architecture
- Clean Architecture + CQRS pattern
- Multi-tenant via tenantId on all tables
- JWT auth with refresh tokens, optional MFA
- Real-time via Socket.IO (vitals, alerts, prescriptions)
- AI services in apps/api/src/modules/ai/ with GPT-4o primary, Gemini fallback
- Voice pipeline: audio -> Whisper -> NER -> structured data -> content generation

## Important Files
- apps/api/prisma/schema.prisma — complete data model (40 models, 76 enums)
- apps/api/src/modules/ai/ — AI service stubs
- apps/web/src/components/voice/ — voice recording components
- apps/web/src/pages/encounters/[id]/ — main encounter screen (hero page)

## Development Workflow
1. Start databases: `docker compose -f infra/docker-compose.yml up -d`
2. Copy env: `cp .env.development .env`
3. Install deps: `pnpm install`
4. Run migrations: `cd apps/api && npx prisma migrate dev`
5. Start dev servers: `pnpm dev`
6. API at http://localhost:3000, Web at http://localhost:5173

## Testing
- Unit tests: `pnpm turbo test`
- API integration tests require PostgreSQL + Redis (docker-compose)
- Coverage reports: `pnpm turbo test -- --coverage`
- E2E: Playwright (planned)

## Security Notes
- LGPD (Brazilian GDPR) compliant — all patient data encrypted at rest
- Audit trail on every clinical data mutation
- Audio recordings stored in S3 with 20-year retention (CFM requirement)
- Role-based access: ADMIN, DOCTOR, NURSE, RECEPTIONIST, PHARMACIST, LAB_TECH
- Tenant isolation enforced at database query level (Prisma middleware)
