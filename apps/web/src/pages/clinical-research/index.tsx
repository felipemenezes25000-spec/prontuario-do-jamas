import { useState } from 'react';
import {
  FlaskConical,
  Users,
  Shuffle,
  FileText,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Search,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIAL_STATUS: Record<string, { label: string; className: string }> = {
  RECRUITING: { label: 'Recrutando', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
  ACTIVE: { label: 'Ativo', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  COMPLETED: { label: 'Concluído', className: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
  SUSPENDED: { label: 'Suspenso', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
};

const DEMO_TRIALS = [
  {
    id: 'NCT-2026-001',
    title: 'Estudo Fase III: Eficácia do Anticorpo Monoclonal XR-450 na ICC',
    sponsor: 'Pharma Brasil S.A.',
    phase: 'Fase III',
    status: 'RECRUITING',
    enrolled: 87,
    target: 150,
    pi: 'Dr. Ricardo Mendes',
    startDate: '2025-06-15',
  },
  {
    id: 'NCT-2026-002',
    title: 'Estudo Multicêntrico: Biomarcadores Preditivos em Sepse Neonatal',
    sponsor: 'Universidade Federal de São Paulo',
    phase: 'Observacional',
    status: 'ACTIVE',
    enrolled: 234,
    target: 300,
    pi: 'Dra. Camila Santos',
    startDate: '2024-11-01',
  },
  {
    id: 'NCT-2026-003',
    title: 'Trial Randomizado: Protocolo ERAS em Cirurgia Bariátrica',
    sponsor: 'Hospital Central',
    phase: 'Fase IV',
    status: 'RECRUITING',
    enrolled: 45,
    target: 120,
    pi: 'Dr. Paulo Ferreira',
    startDate: '2025-09-20',
  },
  {
    id: 'NCT-2026-004',
    title: 'Estudo Fase II: Imunoterapia Combinada em Melanoma Avançado',
    sponsor: 'Onco Research Ltda.',
    phase: 'Fase II',
    status: 'ACTIVE',
    enrolled: 62,
    target: 80,
    pi: 'Dra. Ana Luiza Costa',
    startDate: '2025-03-10',
  },
  {
    id: 'NCT-2025-010',
    title: 'Registro Nacional de Cardiopatias Congênitas',
    sponsor: 'SBC',
    phase: 'Registro',
    status: 'COMPLETED',
    enrolled: 500,
    target: 500,
    pi: 'Dr. Fernando Lima',
    startDate: '2023-01-15',
  },
];

const DEMO_ELIGIBILITY_CRITERIA = [
  { criterion: 'Idade >= 18 anos', matchedPatients: 12543, percentage: 85 },
  { criterion: 'Diagnóstico ICC (I50)', matchedPatients: 342, percentage: 2.3 },
  { criterion: 'FEVE <= 40%', matchedPatients: 198, percentage: 1.3 },
  { criterion: 'Sem uso de IECA/BRA nos últimos 30 dias', matchedPatients: 87, percentage: 0.6 },
  { criterion: 'Creatinina < 2.0 mg/dL', matchedPatients: 76, percentage: 0.5 },
];

const DEMO_CRFS = [
  { id: 'CRF-001', trial: 'NCT-2026-001', patient: 'PAC-0087', visit: 'V3 — Semana 12', status: 'Pendente', queries: 2 },
  { id: 'CRF-002', trial: 'NCT-2026-001', patient: 'PAC-0045', visit: 'V4 — Semana 24', status: 'Completo', queries: 0 },
  { id: 'CRF-003', trial: 'NCT-2026-002', patient: 'PAC-0234', visit: 'V1 — Basal', status: 'Em Revisão', queries: 1 },
  { id: 'CRF-004', trial: 'NCT-2026-003', patient: 'PAC-0012', visit: 'V2 — Semana 4', status: 'Pendente', queries: 3 },
  { id: 'CRF-005', trial: 'NCT-2026-004', patient: 'PAC-0061', visit: 'V5 — Semana 36', status: 'Completo', queries: 0 },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClinicalResearchPage() {
  const [activeTab, setActiveTab] = useState('trials');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTrials = DEMO_TRIALS.filter(
    (t) => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Pesquisa Clínica</h1>
          <p className="text-sm text-gray-400">Gestão de trials, elegibilidade, randomização e CRFs</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-1 h-4 w-4" /> Novo Trial
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Trials Ativos</CardTitle>
            <FlaskConical className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">4</div>
            <p className="text-xs text-gray-500">2 recrutando</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pacientes Incluídos</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">428</div>
            <p className="text-xs text-gray-500">meta: 650</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">CRFs Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">12</div>
            <p className="text-xs text-gray-500">5 com queries</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Taxa Recrutamento</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">65.8%</div>
            <p className="text-xs text-gray-500">do target global</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-gray-800 bg-[#12121a]">
          <TabsTrigger value="trials" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FlaskConical className="mr-1 h-4 w-4" /> Trials Ativos
          </TabsTrigger>
          <TabsTrigger value="eligibility" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Users className="mr-1 h-4 w-4" /> Elegibilidade
          </TabsTrigger>
          <TabsTrigger value="randomization" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Shuffle className="mr-1 h-4 w-4" /> Randomização
          </TabsTrigger>
          <TabsTrigger value="crfs" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileText className="mr-1 h-4 w-4" /> CRFs
          </TabsTrigger>
        </TabsList>

        {/* Trials Tab */}
        <TabsContent value="trials" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar trial por título ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-700 bg-[#12121a] text-gray-200"
            />
          </div>
          <div className="space-y-4">
            {filteredTrials.map((trial) => {
              const cfg = (TRIAL_STATUS[trial.status] ?? TRIAL_STATUS.ACTIVE)!;
              const progress = Math.round((trial.enrolled / trial.target) * 100);
              return (
                <Card key={trial.id} className="border-gray-800 bg-[#12121a]">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">{trial.id}</span>
                          <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/50">{trial.phase}</Badge>
                          <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                        </div>
                        <h3 className="font-semibold text-gray-200">{trial.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">PI: {trial.pi} — Patrocinador: {trial.sponsor}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Recrutamento: {trial.enrolled}/{trial.target}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-800">
                        <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Eligibility Tab */}
        <TabsContent value="eligibility" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Motor de Elegibilidade — NCT-2026-001
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 mb-4">Filtragem automática de pacientes elegíveis baseada em critérios do protocolo</p>
              <div className="space-y-3">
                {DEMO_ELIGIBILITY_CRITERIA.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-gray-200">{c.criterion}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono text-gray-300">{c.matchedPatients.toLocaleString('pt-BR')}</span>
                      <span className="text-xs text-gray-500 ml-2">({c.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
                <p className="text-sm text-gray-400">Pacientes elegíveis finais</p>
                <p className="text-3xl font-bold text-emerald-400">76</p>
                <p className="text-xs text-gray-500">Passaram por todos os critérios de inclusão/exclusão</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Randomization Tab */}
        <TabsContent value="randomization" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-purple-400" />
                Randomização — NCT-2026-001
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-sm text-gray-400">Braço A — Tratamento</p>
                  <p className="text-3xl font-bold text-emerald-400">44</p>
                  <p className="text-xs text-gray-500">XR-450 200mg</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-sm text-gray-400">Braço B — Controle</p>
                  <p className="text-3xl font-bold text-blue-400">43</p>
                  <p className="text-xs text-gray-500">Placebo</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-center">
                  <p className="text-sm text-gray-400">Razão</p>
                  <p className="text-3xl font-bold text-gray-200">1:1</p>
                  <p className="text-xs text-gray-500">Bloco estratificado</p>
                </div>
              </div>
              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                <p className="text-sm text-gray-400 mb-2">Estratificação</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-300">Faixa etária:</span><span className="text-gray-400">{`<65 / >=65`}</span>
                  <span className="text-gray-300">FEVE:</span><span className="text-gray-400">{`<=30% / >30%`}</span>
                  <span className="text-gray-300">Centro:</span><span className="text-gray-400">Hospital Central / Clínica Norte</span>
                </div>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Shuffle className="mr-1 h-4 w-4" /> Randomizar Próximo Paciente
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRFs Tab */}
        <TabsContent value="crfs" className="space-y-4">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-yellow-400" />
                Case Report Forms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_CRFS.map((crf) => (
                  <div key={crf.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">{crf.id}</span>
                        <span className="text-xs text-gray-600">|</span>
                        <span className="text-xs text-gray-500">{crf.trial}</span>
                      </div>
                      <p className="font-medium text-gray-200 mt-1">Paciente {crf.patient} — {crf.visit}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {crf.queries > 0 && (
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
                          <AlertTriangle className="mr-1 h-3 w-3" /> {crf.queries} queries
                        </Badge>
                      )}
                      <Badge variant="outline" className={
                        crf.status === 'Completo' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : crf.status === 'Pendente' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                      }>
                        {crf.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
