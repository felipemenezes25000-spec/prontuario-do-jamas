# VOXPEP — PROMPT DE INTEGRAÇÃO + TEMA MÉDICO LIGHT

> **Como usar:** Cole este prompt inteiro no Claude Code (Claude CLI) no diretório `C:\Users\Felipe\Documents\Projeto prontuário`. Execute tarefa por tarefa, na ordem indicada.

---

## CONTEXTO

Você está trabalhando no **VoxPEP**, um prontuário eletrônico voice-first. O projeto já tem:

- **Backend NestJS** com 26 módulos, 43 DTOs, 11 serviços de IA, Prisma schema completo (2.135 linhas)
- **Frontend React** com 17 páginas, componentes de voz, shadcn/ui, Zustand stores
- **Problema:** Frontend e backend estão DESCONECTADOS — as páginas usam `mock-data.ts` em vez de chamar a API real
- **Problema:** O hook `useVoice` grava áudio real mas retorna transcrição HARDCODED em vez de enviar pro Whisper
- **Problema:** O sistema só tem dark mode. Precisa de light mode completo com tema médico profissional
- **NÃO existe app mobile e NÃO vamos criar. Ignore tudo sobre mobile.**

Arquivos-chave que você precisa conhecer:
- Schema Prisma: `apps/api/prisma/schema.prisma` (2.135 linhas, 40 models, 76 enums)
- API client com interceptors: `apps/web/src/lib/api.ts` (Axios com JWT refresh automático)
- Auth store: `apps/web/src/stores/auth.store.ts` (Zustand + persist)
- Voice hook: `apps/web/src/hooks/use-voice.ts` (MediaRecorder real, transcrição fake)
- Voice store: `apps/web/src/stores/voice.store.ts`
- CSS global: `apps/web/src/styles/globals.css` (dark only, emerald accent)
- Routes: `apps/web/src/routes.tsx` (17 rotas com lazy loading)
- API modules: `apps/api/src/modules/` (26 módulos NestJS)

Convencões do projeto:
- TypeScript strict — NUNCA usar `any` (use `unknown` + type guard)
- Código em inglês, textos de UI em português brasileiro
- Commits semânticos: `feat:`, `fix:`, `chore:`, `style:`
- Testes em Jest (backend) e Vitest (frontend)

---

## TAREFA 1 — BANCO DE DADOS (Prisma migrations + seed)

### 1.1 Rodar migrations

```bash
cd apps/api
npx prisma migrate dev --name init
```

Se der erro de conexão, verificar se PostgreSQL está rodando:
```bash
docker compose -f ../../infra/docker-compose.yml up -d postgres redis
```

### 1.2 Atualizar seed

Abra `apps/api/prisma/seed.ts` e garanta que ele popula TODAS as tabelas essenciais com dados realistas para desenvolvimento. O seed DEVE criar:

```
1 Tenant ("Hospital VoxPEP Demo", tipo HOSPITAL, plano ENTERPRISE)
1 Tenant ("Clínica VoxPEP Demo", tipo CLINIC, plano PRO)

Usuários no Hospital:
  - 1 Admin (admin@voxpep.dev / Voxpep@2024)
  - 3 Médicos (Dr. Carlos Mendes - Cardiologia, Dra. Ana Costa - Clínica Médica, Dr. Rafael Lima - Ortopedia)
  - 2 Enfermeiros (Enf. Juliana Santos, Enf. Marcos Oliveira)
  - 1 Recepcionista (Maria Recepção)
  - 1 Farmacêutico (João Farmácia)

10 Pacientes com dados completos:
  - Pelo menos 3 com alergias (1 grave: anafilaxia a dipirona)
  - Pelo menos 4 com condições crônicas (HAS, DM2, asma, hipotireoidismo)
  - Pelo menos 2 com histórico familiar relevante
  - Pelo menos 2 com histórico cirúrgico
  - Idades variadas: 1 pediátrico (8 anos), 2 adultos jovens (25-35), 4 meia-idade (40-60), 2 idosos (65+), 1 gestante
  - Pelo menos 5 com convênio, 3 particular, 2 SUS

15 Encounters (atendimentos) variados:
  - 3 OUTPATIENT (ambulatorial) completos
  - 2 EMERGENCY com triagem Manchester
  - 2 INPATIENT (internação com leito)
  - 2 TELEMEDICINE
  - 2 RETURN (retorno)
  - 2 em WAITING, 1 IN_PROGRESS, 1 SCHEDULED

Prescrições:
  - 8 prescrições com itens variados (medicamentos, exames, dietas)
  - Pelo menos 1 com controlado (Portaria 344)
  - Pelo menos 1 com antimicrobiano
  - Pelo menos 3 com checagem de enfermagem (MedicationCheck)

Sinais vitais:
  - Pelo menos 2 registros por encounter ativo
  - 1 paciente com tendência de piora (PA subindo progressivamente)

Resultados de exames:
  - 5 resultados laboratoriais (hemograma, glicemia, HbA1c, creatinina, colesterol)
  - 2 com valores CRITICAL (flag)

Notas clínicas (SOAP):
  - 5 notas SOAP completas vinculadas aos encounters

Alertas clínicos:
  - 3 alertas ativos (1 CRITICAL de alergia, 1 WARNING de interação, 1 INFO de exame vencido)

Leitos:
  - 20 leitos (10 enfermaria, 5 UTI, 3 semi-UTI, 2 isolamento)
  - 4 ocupados, 14 livres, 1 limpeza, 1 manutenção

Agendamentos:
  - 10 appointments (5 futuros, 3 passados completos, 2 cancelados)

Documentos:
  - 3 templates (Atestado Médico, Receita Simples, Termo de Consentimento)
  - 2 documentos assinados

SAE/Enfermagem:
  - 2 NursingProcess com diagnósticos NANDA, outcomes NOC e interventions NIC
  - 3 NursingNotes
  - 2 FluidBalance
```

Gere o seed completo com `prisma.$transaction` para performance. Use UUIDs determinísticos (ex: `00000000-0000-0000-0000-000000000001`) para facilitar referências cruzadas.

Rode o seed:
```bash
npx prisma db seed
```

---

## TAREFA 2 — TEMA MÉDICO LIGHT MODE

### 2.1 Design System — Paleta de Cores Light

O VoxPEP precisa de um **light mode profissional com identidade médica**. A identidade visual deve transmitir: confiança, limpeza, saúde, tecnologia.

**Paleta principal (light mode):**
```
Primary:          #0D9488 (teal-600 — cor da saúde, confiança, calma)
Primary hover:    #0F766E (teal-700)
Primary soft:     #CCFBF1 (teal-50 — backgrounds suaves)
Primary muted:    #99F6E4 (teal-200)

Background:       #F8FAFC (slate-50 — levemente azulado, não branco puro)
Surface/Card:     #FFFFFF
Surface elevated: #F1F5F9 (slate-100)

Foreground:       #0F172A (slate-900)
Muted text:       #64748B (slate-500)
Subtle text:      #94A3B8 (slate-400)

Border:           #E2E8F0 (slate-200)
Border hover:     #CBD5E1 (slate-300)
Input bg:         #FFFFFF
Input border:     #CBD5E1

Sidebar:          #FFFFFF
Sidebar border:   #E2E8F0
Sidebar active:   #F0FDFA (teal-50)

Destructive:      #DC2626 (red-600 — alertas, erros)
Warning:          #D97706 (amber-600)
Success:          #059669 (emerald-600)
Info:             #0284C7 (sky-600)

Triage Manchester:
  Red:     #DC2626
  Orange:  #EA580C
  Yellow:  #CA8A04
  Green:   #16A34A
  Blue:    #2563EB

Ring/Focus:       #0D9488 (teal-600)
```

**Dark mode (manter como está, apenas ajustar as CSS vars):**
O dark mode já existe com emerald accent. Troque o accent de emerald (#10b981) para teal (#0D9488) para consistência entre temas.

### 2.2 Implementação do Theme Toggle

Crie o sistema de tema usando a abordagem `class` do Tailwind (dark/light via classe no `<html>`):

**1. Atualizar `apps/web/src/styles/globals.css`:**

Substituir o `@theme` fixo por CSS custom properties com dois temas. Use a estratégia:
- `:root` (default) = LIGHT mode
- `.dark` no `<html>` = DARK mode

```css
@import "tailwindcss";

/* ─── LIGHT MODE (default) ─── */
:root {
  --color-background: #F8FAFC;
  --color-foreground: #0F172A;
  --color-card: #FFFFFF;
  --color-card-foreground: #0F172A;
  --color-popover: #FFFFFF;
  --color-popover-foreground: #0F172A;
  --color-primary: #0D9488;
  --color-primary-foreground: #FFFFFF;
  --color-secondary: #F1F5F9;
  --color-secondary-foreground: #0F172A;
  --color-muted: #F1F5F9;
  --color-muted-foreground: #64748B;
  --color-accent: #F0FDFA;
  --color-accent-foreground: #0F172A;
  --color-destructive: #DC2626;
  --color-destructive-foreground: #FFFFFF;
  --color-warning: #D97706;
  --color-warning-foreground: #FFFFFF;
  --color-success: #059669;
  --color-success-foreground: #FFFFFF;
  --color-info: #0284C7;
  --color-info-foreground: #FFFFFF;
  --color-border: #E2E8F0;
  --color-input: #E2E8F0;
  --color-ring: #0D9488;
  --color-sidebar: #FFFFFF;
  --color-sidebar-foreground: #0F172A;
  --color-sidebar-accent: #F0FDFA;
  --color-sidebar-border: #E2E8F0;
  --color-triage-red: #DC2626;
  --color-triage-orange: #EA580C;
  --color-triage-yellow: #CA8A04;
  --color-triage-green: #16A34A;
  --color-triage-blue: #2563EB;
  --radius: 0.625rem;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

/* ─── DARK MODE ─── */
.dark {
  --color-background: #09090B;
  --color-foreground: #FAFAFA;
  --color-card: #18181B;
  --color-card-foreground: #FAFAFA;
  --color-popover: #18181B;
  --color-popover-foreground: #FAFAFA;
  --color-primary: #2DD4BF;
  --color-primary-foreground: #042F2E;
  --color-secondary: #27272A;
  --color-secondary-foreground: #FAFAFA;
  --color-muted: #27272A;
  --color-muted-foreground: #A1A1AA;
  --color-accent: #27272A;
  --color-accent-foreground: #FAFAFA;
  --color-destructive: #EF4444;
  --color-destructive-foreground: #FAFAFA;
  --color-warning: #F59E0B;
  --color-warning-foreground: #09090B;
  --color-success: #10B981;
  --color-success-foreground: #09090B;
  --color-info: #38BDF8;
  --color-info-foreground: #09090B;
  --color-border: #27272A;
  --color-input: #27272A;
  --color-ring: #2DD4BF;
  --color-sidebar: #0A0A0C;
  --color-sidebar-foreground: #FAFAFA;
  --color-sidebar-accent: #18181B;
  --color-sidebar-border: #27272A;
  --color-triage-red: #EF4444;
  --color-triage-orange: #F97316;
  --color-triage-yellow: #EAB308;
  --color-triage-green: #22C55E;
  --color-triage-blue: #3B82F6;
}
```

Manter TODAS as animações existentes (voice-pulse, sound-wave, heartbeat, etc) — elas são theme-agnostic.

Atualizar os scrollbar styles para funcionar em ambos os temas:
```css
::-webkit-scrollbar-thumb {
  background: var(--color-border);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-muted-foreground);
}
```

Atualizar `.glass` para ambos os temas:
```css
.glass {
  background: color-mix(in srgb, var(--color-card) 80%, transparent);
  backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
}
```

Atualizar `.text-gradient-emerald` para teal:
```css
.text-gradient-teal {
  background: linear-gradient(135deg, #0D9488, #0891B2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Atualizar `.glow-emerald` para teal:
```css
.glow-teal { box-shadow: 0 0 20px rgba(13, 148, 136, 0.3); }
```

**2. Criar `apps/web/src/stores/theme.store.ts`:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: (theme) => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },
    }),
    {
      name: 'voxpep-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = state.theme === 'system' ? getSystemTheme() : state.theme;
          applyTheme(resolved);
          state.resolvedTheme = resolved;
        }
      },
    },
  ),
);
```

**3. Criar `apps/web/src/components/layout/theme-toggle.tsx`:**

Componente com 3 opções: Sol (light), Lua (dark), Monitor (system). Use ícones do Lucide. Fica no header, ao lado do sino de notificações. Estilo: dropdown com animação suave. O ícone que aparece é o do tema ativo.

**4. Inicializar o tema no `apps/web/src/main.tsx`:**

Antes do render do React, ler o localStorage e aplicar a classe no `<html>` para evitar flash (FOUC).

**5. Atualizar TODOS os componentes que usam cores hardcoded:**

Buscar por qualquer ocorrência de:
- `bg-zinc-*`, `bg-gray-*`, `bg-slate-*` hardcoded → trocar por variáveis do tema (`bg-background`, `bg-card`, `bg-muted`, `bg-secondary`)
- `text-zinc-*`, `text-gray-*` → `text-foreground`, `text-muted-foreground`
- `border-zinc-*` → `border-border`
- `bg-emerald-*` → `bg-primary` (ou variantes)
- `text-emerald-*` → `text-primary`
- `rgba(16, 185, 129,` → `rgba(13, 148, 136,` (teal no lugar de emerald nos CSS animations)
- Cores de glow/shadow hardcoded → adaptar para CSS variables

Componentes que CERTAMENTE precisam ser atualizados:
- `sidebar.tsx` — bg-sidebar, cores de texto, active states
- `header.tsx` — background, border
- `voice-button.tsx` — cores dos estados (idle, listening, processing)
- `login.tsx` — background, card, gradients
- `dashboard/index.tsx` — stat cards, gráficos
- Todos os componentes em `components/medical/` — badges, cards, charts
- `mock-data.ts` — remover referências de cores hardcoded se houver

**6. Adicionar sutil elementos visuais médicos no light mode:**

- No sidebar, adicionar um ícone sutil de caduceu ou cruz da saúde no footer
- Na tela de login, usar um gradiente suave teal→cyan com um ícone de batimento cardíaco (ECG line) como background decorativo
- Nos cards de triagem, usar fundo levemente colorido (tinge) na cor da classificação (ex: card RED com `bg-red-50` no light, `bg-red-950/20` no dark)
- Nos alertas clínicos, usar border-left colorido (4px) no estilo "card com indicador lateral"
- Font body: Inter (importar de Google Fonts se necessário, ou fallback system)

### 2.3 Identidade Visual — Detalhes

- **Logo:** Manter "VoxPEP" com "Vox" em foreground e "PEP" em primary (teal). No light mode o ícone do estetoscópio deve ter fundo teal. No dark, manter como está.
- **Botão de voz:** No light mode, o estado idle deve ser `bg-teal-600 text-white` (não cinza). O estado listening deve manter o vermelho pulsante. Processing = teal com spinner.
- **Cards:** No light mode, usar `shadow-sm` sutil nos cards em vez de flat. Hover: `shadow-md` com transição suave.
- **Tabelas:** Header com `bg-slate-50` (light) ou `bg-zinc-900` (dark). Rows alternadas com `bg-slate-50/50`.
- **Badges de triagem:** Cores fortes com texto branco em ambos os temas. Não usar variantes "soft" para triagem — precisam de contraste máximo.

---

## TAREFA 3 — CONECTAR FRONTEND AO BACKEND (a mais importante)

### 3.1 Configurar Proxy (Vite → NestJS)

Em `apps/web/vite.config.ts`, adicionar proxy para que `/api` redirecione para o backend:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    '/socket.io': {
      target: 'http://localhost:3000',
      ws: true,
    },
  },
},
```

### 3.2 Atualizar Services (TanStack Query)

Para cada service em `apps/web/src/services/`, transformar em hooks de TanStack Query que chamam a API real. O padrão é:

```typescript
// Exemplo: apps/web/src/services/patients.service.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Patient, CreatePatientDto, PaginatedResponse } from '@/types';

// Queries
export function usePatients(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Patient>>('/patients', { params });
      return data;
    },
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      const { data } = await api.get<Patient>(`/patients/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Mutations
export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePatientDto) => api.post('/patients', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}
```

Converter TODOS os 7 services existentes para este padrão:
- `auth.service.ts` — login, register, refresh, logout, me
- `patients.service.ts` — CRUD + search + alergias + condições + histórico
- `encounters.service.ts` — CRUD + por paciente + por médico + atualizar status
- `prescriptions.service.ts` — CRUD + items + checagem + assinar
- `vital-signs.service.ts` — criar + por encounter + por paciente + últimos
- `nursing.service.ts` — SAE completo + notas + balanço hídrico
- `appointments.service.ts` — CRUD + por médico + por paciente + confirmar

Criar NOVOS services que estão faltando:
- `triage.service.ts` — criar triagem + fila de espera + atualizar nível
- `admissions.service.ts` — CRUD + leitos + transferência + alta
- `clinical-notes.service.ts` — CRUD SOAP + assinar + addendum
- `exams.service.ts` — solicitar + resultados + por paciente
- `documents.service.ts` — CRUD + templates + gerar PDF + assinar
- `alerts.service.ts` — listar ativos + acknowledeged + resolver
- `billing.service.ts` — CRUD + gerar TISS XML + status
- `surgical.service.ts` — CRUD + checklist OMS + descrição
- `ai.service.ts` — todos os endpoints de IA (SOAP, prescrição, triagem, copilot, summary)
- `voice.service.ts` — upload de áudio + transcrição + processamento

### 3.3 Atualizar TODAS as Páginas

Cada página deve:
1. **Remover** importações de `mock-data.ts`
2. **Usar** os hooks de TanStack Query dos services
3. **Ter** 3 estados: loading (skeleton), error (mensagem + retry), empty (ilustração + CTA)
4. **Adicionar** o header `X-Tenant-Id` automaticamente (criar interceptor no `api.ts` que pega do auth store)

Páginas a atualizar (em ordem de prioridade):

```
PRIORIDADE ALTA (fluxo principal):
1. pages/auth/login.tsx — login real contra API, armazena tokens no auth store
2. pages/dashboard/index.tsx — dados reais: contagem de pacientes, encounters hoje, leitos, agendamentos
3. pages/patients/index.tsx — lista real com paginação, busca, filtros
4. pages/patients/[id]/index.tsx — prontuário completo do paciente com tabs reais
5. pages/encounters/index.tsx — lista de atendimentos do dia
6. pages/encounters/[id]/index.tsx — tela de atendimento com SOAP real, prescrições reais, voz real

PRIORIDADE MÉDIA:
7. pages/triage/index.tsx — fila de espera real + formulário de triagem
8. pages/nursing/index.tsx — painel de enfermagem com checagem real
9. pages/appointments/index.tsx — agenda real
10. pages/admissions/index.tsx — mapa de leitos real
11. pages/exams/index.tsx — resultados de exames reais

PRIORIDADE BAIXA:
12. pages/pharmacy/index.tsx — prescrições pendentes de dispensação
13. pages/billing/index.tsx — faturamento
14. pages/surgical/index.tsx — centro cirúrgico
15. pages/reports/index.tsx — relatórios básicos
16. pages/settings/index.tsx — configurações do tenant
17. pages/admin/index.tsx — gestão de usuários
```

### 3.4 Adicionar Header X-Tenant-Id

No `apps/web/src/lib/api.ts`, adicionar ao interceptor de request:

```typescript
// Dentro do interceptor existente, após o Bearer token:
const tenantId = parsed?.state?.user?.tenantId;
if (tenantId && config.headers) {
  config.headers['X-Tenant-Id'] = tenantId;
}
```

### 3.5 Atualizar Types

Em `apps/web/src/types/index.ts`, garantir que TODOS os types correspondem EXATAMENTE ao que a API retorna (baseado no Prisma schema). Gerar os types a partir do Prisma client se possível, ou criar manualmente espelhando os models.

---

## TAREFA 4 — CONECTAR VOZ AO BACKEND (o diferencial)

### 4.1 Criar endpoint de upload de áudio

No backend, em `apps/api/src/modules/ai/`, criar (ou atualizar) um controller com:

```
POST /api/v1/ai/voice/transcribe
  - Multipart form-data: audio file (WebM/Opus)
  - Body: { context, encounterId, patientId }
  - Retorna: { transcriptionId, text, confidence, structuredData }

POST /api/v1/ai/voice/process
  - Body: { text, context, patientId, encounterId }
  - Retorna: { processedText, structuredData, entities }

POST /api/v1/ai/soap/generate
  - Body: { transcription, patientId, encounterId, doctorSpecialty }
  - Retorna: { subjective, objective, assessment, plan, diagnosisCodes, suggestedExams, suggestedMedications }

POST /api/v1/ai/prescription/parse-voice
  - Body: { text }
  - Retorna: { items: [...] }

POST /api/v1/ai/prescription/check-safety
  - Body: { items, patientId }
  - Retorna: { safe, warnings: [...] }

POST /api/v1/ai/prescription/suggest
  - Body: { diagnosis, patientId }
  - Retorna: { suggestions: [...] }

POST /api/v1/ai/copilot/suggestions
  - Body: { encounterId, transcription }
  - Retorna: { suggestions: [...] }

POST /api/v1/ai/patient/summary
  - Body: { patientId }
  - Retorna: { summary: string }

POST /api/v1/ai/triage/classify
  - Body: { text, vitalSigns }
  - Retorna: { level, levelDescription, discriminators, redFlags, suggestedMaxWait }
```

Cada endpoint deve:
- Ser protegido por `@UseGuards(JwtAuthGuard)`
- Logar em AuditLog (action: `AI_GENERATE`)
- Ter Swagger decorators (`@ApiTags('AI')`, `@ApiOperation`, `@ApiResponse`)
- Chamar o service de IA correspondente que já existe
- Retornar em <5 segundos (configurar timeout no controller)
- Se ambos OpenAI e Gemini falharem, retornar 503 com mensagem clara

### 4.2 Atualizar useVoice hook

No `apps/web/src/hooks/use-voice.ts`, substituir a simulação por chamada real:

```typescript
// No recorder.onstop:
// 1. Criar Blob do áudio
const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

// 2. Criar FormData
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');
formData.append('context', context); // do parâmetro do hook
formData.append('encounterId', encounterId ?? '');
formData.append('patientId', patientId ?? '');

// 3. Enviar para o backend
setProcessing(true);
try {
  const { data } = await api.post('/ai/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000, // Whisper pode demorar
  });
  setTranscription(data.text);
  setStructuredData(data.structuredData);
} catch (error) {
  setError('Erro ao transcrever áudio. Tente novamente.');
} finally {
  setProcessing(false);
}
```

Adicionar ao hook:
- Parâmetros: `context`, `encounterId`, `patientId` (opcionais)
- Retornar: `structuredData` além de `currentTranscription`
- Adicionar ao store: `structuredData` field

### 4.3 Integrar voz na tela de atendimento

Em `pages/encounters/[id]/index.tsx`:

1. O botão de microfone central deve chamar `useVoice({ context: 'soap', encounterId: id, patientId })`
2. Ao completar transcrição, chamar automaticamente `POST /ai/soap/generate` para preencher os campos SOAP
3. O médico revisa o SOAP gerado, edita se necessário (campos de texto editáveis)
4. Ao clicar "Salvar Nota", enviar `POST /clinical-notes` com os dados do SOAP
5. Se o SOAP mencionar medicamentos, mostrar botão "Gerar Prescrição" que chama `POST /ai/prescription/parse-voice`
6. Prescrição sugerida aparece em modal, médico confirma/edita, depois salva via `POST /prescriptions`
7. Safety check automático antes de salvar prescrição (mostrar warnings em modal se houver)
8. Sugestões do Copilot aparecem no painel lateral direito durante todo o atendimento

---

## TAREFA 5 — REALTIME (Socket.IO no frontend)

### 5.1 Atualizar useRealtime hook

Em `apps/web/src/hooks/use-realtime.ts`, conectar ao Socket.IO do backend:

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

export function useRealtime() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const socket = io('/realtime', {
      query: { tenantId: user.tenantId, userId: user.id },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return {
    socket: socketRef.current,
    joinEncounter: (encounterId: string) =>
      socketRef.current?.emit('join:encounter', { encounterId }),
    leaveEncounter: (encounterId: string) =>
      socketRef.current?.emit('leave:encounter', { encounterId }),
    joinPatient: (patientId: string) =>
      socketRef.current?.emit('join:patient', { patientId }),
    joinWard: (ward: string) =>
      socketRef.current?.emit('join:ward', { ward }),
  };
}
```

Usar na tela de atendimento para receber atualizações em tempo real de:
- Vitais novos → atualizar painel de sinais vitais
- Checagem de medicamento → atualizar status da prescrição
- Alertas novos → mostrar toast + badge
- Transcrição parcial → atualizar texto na tela

---

## TAREFA 6 — POLIMENTO FINAL

### 6.1 Remover mock-data.ts

Após conectar todas as páginas à API real, deletar `apps/web/src/lib/mock-data.ts` completamente. Se alguma página ainda importar dele, o TypeScript vai dar erro — corrija uma por uma.

### 6.2 Loading & Error States Consistentes

Criar componentes reutilizáveis:

```
components/common/page-loading.tsx — Skeleton com layout de página
components/common/page-error.tsx — Mensagem de erro + botão Retry
components/common/page-empty.tsx — Ilustração + texto + CTA
components/common/data-table-loading.tsx — Skeleton de tabela
```

### 6.3 Toasts & Feedback

Usar `sonner` (já instalado) para feedback de ações:
- Sucesso: toast verde "Prescrição salva com sucesso"
- Erro: toast vermelho "Erro ao salvar"
- Info: toast azul "Nota SOAP gerada por IA — revise antes de assinar"
- Warning: toast amarelo "Interação medicamentosa detectada"

### 6.4 Breadcrumbs

Adicionar breadcrumbs no header para navegação contextual:
- Dashboard > Pacientes > Maria Silva > Atendimento #1234

### 6.5 Favicon & Título

- Favicon: ícone de estetoscópio em teal (SVG inline)
- Title dinâmico por página: "VoxPEP — Pacientes", "VoxPEP — Atendimento"

### 6.6 Fontes

Importar Google Fonts no `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## ORDEM DE EXECUÇÃO

```
1. TAREFA 1 — Banco (migrations + seed) .............. [~30 min]
2. TAREFA 2 — Tema light + medical ................... [~2-3 horas]
3. TAREFA 3 — Conectar front ↔ back .................. [~4-5 horas]
4. TAREFA 4 — Conectar voz ao backend ................ [~2-3 horas]
5. TAREFA 5 — Realtime (Socket.IO) ................... [~1 hora]
6. TAREFA 6 — Polimento .............................. [~1-2 horas]
```

**REGRAS:**
- NÃO crie nada de mobile (Expo/React Native). O projeto é WEB ONLY.
- NÃO altere o schema Prisma (ele já está completo).
- NÃO altere a estrutura de módulos do NestJS (todos os 26 já existem).
- Sempre teste que o build compila sem erros antes de prosseguir.
- Commits a cada tarefa concluída: `feat: connect patients page to real API`, `style: implement light mode medical theme`, etc.

**Comece pela TAREFA 1. Pergunte-me se tiver dúvidas sobre qualquer tarefa.**

---

*Prompt gerado em Março/2026. Versão 2.0 — Integração + Light Theme.*
