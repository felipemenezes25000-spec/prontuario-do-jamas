import { useState } from 'react';
import {
  Shield,
  Lock,
  FileCheck,
  Eye,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Key,
  Database,
  ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Constants ──────────────────────────────────────────────────────────────

const CONSENT_STATUS: Record<string, { label: string; className: string }> = {
  GRANTED: { label: 'Concedido', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
  REVOKED: { label: 'Revogado', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  PENDING: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
};

const CHECKLIST_STATUS: Record<string, { label: string; className: string }> = {
  COMPLIANT: { label: 'Conforme', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
  NON_COMPLIANT: { label: 'Não Conforme', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
  IN_PROGRESS: { label: 'Em Andamento', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
};

const DEMO_CONSENTS = [
  { id: '1', patient: 'Maria Silva', type: 'Tratamento de Dados', status: 'GRANTED', date: '2026-03-20' },
  { id: '2', patient: 'João Santos', type: 'Compartilhamento com Operadoras', status: 'PENDING', date: '2026-03-22' },
  { id: '3', patient: 'Ana Oliveira', type: 'Pesquisa Científica', status: 'REVOKED', date: '2026-03-18' },
  { id: '4', patient: 'Carlos Ferreira', type: 'Tratamento de Dados', status: 'GRANTED', date: '2026-03-21' },
];

const DEMO_PORTABILITY = [
  { id: '1', patient: 'Maria Silva', requestDate: '2026-03-15', status: 'Em Processamento', format: 'HL7 FHIR' },
  { id: '2', patient: 'Pedro Costa', requestDate: '2026-03-10', status: 'Concluído', format: 'PDF + XML' },
  { id: '3', patient: 'Lucia Mendes', requestDate: '2026-03-22', status: 'Aguardando Validação', format: 'HL7 FHIR' },
];

const DEMO_ONA_CHECKLIST = [
  { id: '1', item: 'Identificação do Paciente', standard: 'ONA Nível 3', status: 'COMPLIANT', score: 98 },
  { id: '2', item: 'Comunicação Efetiva', standard: 'ONA Nível 3', status: 'COMPLIANT', score: 95 },
  { id: '3', item: 'Segurança de Medicamentos', standard: 'ONA Nível 3', status: 'IN_PROGRESS', score: 82 },
  { id: '4', item: 'Cirurgia Segura', standard: 'ONA Nível 3', status: 'COMPLIANT', score: 97 },
  { id: '5', item: 'Higienização das Mãos', standard: 'ONA Nível 3', status: 'NON_COMPLIANT', score: 72 },
  { id: '6', item: 'Queda do Paciente', standard: 'ONA Nível 3', status: 'COMPLIANT', score: 91 },
  { id: '7', item: 'Lesão por Pressão', standard: 'ONA Nível 3', status: 'IN_PROGRESS', score: 85 },
];

const DEMO_JCI_CHECKLIST = [
  { id: '1', item: 'International Patient Safety Goals (IPSG)', standard: 'JCI 7th Ed.', status: 'COMPLIANT', score: 96 },
  { id: '2', item: 'Access to Care (ACC)', standard: 'JCI 7th Ed.', status: 'COMPLIANT', score: 93 },
  { id: '3', item: 'Patient and Family Rights (PFR)', standard: 'JCI 7th Ed.', status: 'IN_PROGRESS', score: 88 },
  { id: '4', item: 'Medication Management (MMU)', standard: 'JCI 7th Ed.', status: 'IN_PROGRESS', score: 80 },
  { id: '5', item: 'Governance, Leadership (GLD)', standard: 'JCI 7th Ed.', status: 'COMPLIANT', score: 94 },
];

const DEMO_DPIA = [
  { id: '1', process: 'Prontuário Eletrônico', riskLevel: 'Alto', mitigations: 8, pending: 1, lastReview: '2026-02-15' },
  { id: '2', process: 'Telemedicina', riskLevel: 'Médio', mitigations: 5, pending: 0, lastReview: '2026-01-20' },
  { id: '3', process: 'Portal do Paciente', riskLevel: 'Alto', mitigations: 6, pending: 2, lastReview: '2026-03-01' },
  { id: '4', process: 'IA Diagnóstica', riskLevel: 'Crítico', mitigations: 10, pending: 3, lastReview: '2026-03-10' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState('lgpd');
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [minPasswordLength, setMinPasswordLength] = useState('12');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Governança & Conformidade</h1>
          <p className="text-sm text-gray-400">LGPD, Segurança, Acreditação e DPIA</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
          <Shield className="mr-1 h-3 w-3" /> Nível 3 ONA
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Consentimentos Ativos</CardTitle>
            <FileCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">1.247</div>
            <p className="text-xs text-gray-500">+34 esta semana</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Solicitações Portabilidade</CardTitle>
            <Database className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">12</div>
            <p className="text-xs text-gray-500">3 pendentes</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Score Acreditação</CardTitle>
            <ClipboardList className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">91.2%</div>
            <p className="text-xs text-gray-500">ONA Nível 3</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">DPIAs Ativas</CardTitle>
            <Eye className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">4</div>
            <p className="text-xs text-gray-500">6 mitigações pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-gray-800 bg-[#12121a]">
          <TabsTrigger value="lgpd" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Shield className="mr-1 h-4 w-4" /> LGPD
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Lock className="mr-1 h-4 w-4" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="acreditacao" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileCheck className="mr-1 h-4 w-4" /> Acreditação
          </TabsTrigger>
          <TabsTrigger value="dpia" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Eye className="mr-1 h-4 w-4" /> DPIA
          </TabsTrigger>
        </TabsList>

        {/* LGPD Tab */}
        <TabsContent value="lgpd" className="space-y-6">
          {/* Portabilidade */}
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-400" />
                Portabilidade de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_PORTABILITY.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                    <div>
                      <p className="font-medium text-gray-200">{req.patient}</p>
                      <p className="text-sm text-gray-500">Solicitado em {req.requestDate} — Formato: {req.format}</p>
                    </div>
                    <Badge variant="outline" className={
                      req.status === 'Concluído' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : req.status === 'Em Processamento' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                    }>
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Consentimentos */}
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                Consentimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_CONSENTS.map((c) => {
                  const cfg = (CONSENT_STATUS[c.status] ?? CONSENT_STATUS.PENDING)!;
                  return (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                      <div>
                        <p className="font-medium text-gray-200">{c.patient}</p>
                        <p className="text-sm text-gray-500">{c.type} — {c.date}</p>
                      </div>
                      <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* DPO Dashboard */}
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                DPO Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-400">98.5%</p>
                  <p className="text-sm text-gray-400">Conformidade LGPD</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">3</p>
                  <p className="text-sm text-gray-400">Incidentes Abertos</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-3xl font-bold text-yellow-400">7</p>
                  <p className="text-sm text-gray-400">Solicitações Titulares</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança Tab */}
        <TabsContent value="seguranca" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  Timeout de Sessão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300">Timeout de inatividade (minutos)</Label>
                  <Input
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200"
                  />
                </div>
                <p className="text-xs text-gray-500">CFM exige desconexão automática após período de inatividade.</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Salvar Configuração</Button>
              </CardContent>
            </Card>

            <Card className="border-gray-800 bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Key className="h-5 w-5 text-blue-400" />
                  Política de Senhas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300">Comprimento mínimo</Label>
                  <Input
                    type="number"
                    value={minPasswordLength}
                    onChange={(e) => setMinPasswordLength(e.target.value)}
                    className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200"
                  />
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Letras maiúsculas e minúsculas</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Números obrigatórios</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Caracteres especiais</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Expiração a cada 90 dias</div>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Salvar Política</Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                Segregação de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { tenant: 'Hospital Central', isolation: 'Row-Level Security', encryption: 'AES-256', status: 'Ativo' },
                  { tenant: 'Clínica Norte', isolation: 'Row-Level Security', encryption: 'AES-256', status: 'Ativo' },
                  { tenant: 'Pronto Socorro Sul', isolation: 'Row-Level Security', encryption: 'AES-256', status: 'Ativo' },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                    <div>
                      <p className="font-medium text-gray-200">{t.tenant}</p>
                      <p className="text-sm text-gray-500">{t.isolation} — {t.encryption}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">{t.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Acreditação Tab */}
        <TabsContent value="acreditacao" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-yellow-400" />
                Checklist ONA — Nível 3
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_ONA_CHECKLIST.map((item) => {
                  const cfg = (CHECKLIST_STATUS[item.status] ?? CHECKLIST_STATUS.IN_PROGRESS)!;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-200">{item.item}</p>
                        <p className="text-sm text-gray-500">{item.standard}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-gray-300">{item.score}%</span>
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-400" />
                Checklist JCI — 7ª Edição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_JCI_CHECKLIST.map((item) => {
                  const cfg = (CHECKLIST_STATUS[item.status] ?? CHECKLIST_STATUS.IN_PROGRESS)!;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-200">{item.item}</p>
                        <p className="text-sm text-gray-500">{item.standard}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-gray-300">{item.score}%</span>
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DPIA Tab */}
        <TabsContent value="dpia" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Eye className="h-5 w-5 text-red-400" />
                Avaliações de Impacto à Proteção de Dados (DPIA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_DPIA.map((dpia) => (
                  <div key={dpia.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-200">{dpia.process}</p>
                      <p className="text-sm text-gray-500">
                        Última revisão: {dpia.lastReview} — {dpia.mitigations} mitigações ({dpia.pending} pendentes)
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      dpia.riskLevel === 'Crítico' ? 'bg-red-600/30 text-red-300 border-red-600/50'
                        : dpia.riskLevel === 'Alto' ? 'bg-red-500/20 text-red-400 border-red-500/50'
                        : dpia.riskLevel === 'Médio' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    }>
                      {dpia.riskLevel}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-gray-800 bg-[#12121a]">
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-gray-100">6</p>
                <p className="text-sm text-gray-400">Mitigações Pendentes</p>
              </CardContent>
            </Card>
            <Card className="border-gray-800 bg-[#12121a]">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-2xl font-bold text-gray-100">29</p>
                <p className="text-sm text-gray-400">Mitigações Concluídas</p>
              </CardContent>
            </Card>
            <Card className="border-gray-800 bg-[#12121a]">
              <CardContent className="pt-6 text-center">
                <Clock className="mx-auto h-8 w-8 text-yellow-400 mb-2" />
                <p className="text-2xl font-bold text-gray-100">45 dias</p>
                <p className="text-sm text-gray-400">Próxima Revisão DPIA</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
