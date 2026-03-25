import { useState } from 'react';
import {
  Database,
  Users,
  TrendingUp,
  BarChart3,
  Download,
  Plus,
  Filter,
  Search,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEMO_COHORTS = [
  { id: '1', name: 'Diabéticos Tipo 2 com HbA1c > 9%', patients: 342, created: '2026-03-10', author: 'Dr. Mendes', filters: 4 },
  { id: '2', name: 'Pacientes ICC FEVE < 40%', patients: 198, created: '2026-03-05', author: 'Dra. Santos', filters: 3 },
  { id: '3', name: 'Idosos > 80 anos com polifarmácia', patients: 567, created: '2026-02-20', author: 'Dr. Ferreira', filters: 5 },
  { id: '4', name: 'Readmissões em 30 dias — Pneumonia', patients: 89, created: '2026-03-15', author: 'Dra. Costa', filters: 6 },
  { id: '5', name: 'Sepse com mortalidade hospitalar', patients: 156, created: '2026-01-28', author: 'Dr. Lima', filters: 7 },
];

const DEMO_BENCHMARKS = [
  { indicator: 'Tempo Médio de Permanência', hospital: '4.2 dias', national: '5.1 dias', percentile: 'P25', trend: 'down' },
  { indicator: 'Taxa de Readmissão 30d', hospital: '8.3%', national: '11.2%', percentile: 'P20', trend: 'down' },
  { indicator: 'Infecção de Sítio Cirúrgico', hospital: '1.8%', national: '2.5%', percentile: 'P30', trend: 'stable' },
  { indicator: 'Mortalidade Padronizada (SMR)', hospital: '0.82', national: '1.00', percentile: 'P15', trend: 'down' },
  { indicator: 'Densidade de Incidência IRAS', hospital: '3.2/1000pd', national: '4.8/1000pd', percentile: 'P25', trend: 'up' },
  { indicator: 'Taxa de Queda', hospital: '1.1/1000pd', national: '2.0/1000pd', percentile: 'P18', trend: 'down' },
];

const EXPORT_FORMATS = [
  { format: 'CSV', description: 'Valores separados por vírgula', icon: '📊' },
  { format: 'XLSX', description: 'Microsoft Excel', icon: '📗' },
  { format: 'JSON', description: 'JavaScript Object Notation', icon: '🔧' },
  { format: 'FHIR Bundle', description: 'HL7 FHIR R4 Bundle', icon: '🏥' },
  { format: 'Parquet', description: 'Apache Parquet (Data Lake)', icon: '🗄️' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function DataWarehousePage() {
  const [activeTab, setActiveTab] = useState('cohorts');
  const [cohortSearch, setCohortSearch] = useState('');

  const filteredCohorts = DEMO_COHORTS.filter((c) =>
    c.name.toLowerCase().includes(cohortSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Data Warehouse Clínico</h1>
          <p className="text-sm text-gray-400">Coortes, análise longitudinal, benchmarking e exportação</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-1 h-4 w-4" /> Nova Coorte
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Registros</CardTitle>
            <Database className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">2.4M</div>
            <p className="text-xs text-gray-500">Atendimentos desde 2020</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Coortes Salvas</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">23</div>
            <p className="text-xs text-gray-500">5 criadas este mês</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Exportações</CardTitle>
            <Download className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">47</div>
            <p className="text-xs text-gray-500">Este mês</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-[#12121a]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Última Carga ETL</CardTitle>
            <Layers className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">2h atrás</div>
            <p className="text-xs text-gray-500">Próxima: 04:00</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-gray-800 bg-[#12121a]">
          <TabsTrigger value="cohorts" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Users className="mr-1 h-4 w-4" /> Coortes
          </TabsTrigger>
          <TabsTrigger value="longitudinal" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <TrendingUp className="mr-1 h-4 w-4" /> Análise Longitudinal
          </TabsTrigger>
          <TabsTrigger value="benchmarking" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <BarChart3 className="mr-1 h-4 w-4" /> Benchmarking
          </TabsTrigger>
          <TabsTrigger value="export" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Download className="mr-1 h-4 w-4" /> Exportação
          </TabsTrigger>
        </TabsList>

        {/* Coortes Tab */}
        <TabsContent value="cohorts" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar coortes..."
              value={cohortSearch}
              onChange={(e) => setCohortSearch(e.target.value)}
              className="pl-10 border-gray-700 bg-[#12121a] text-gray-200"
            />
          </div>
          <div className="space-y-3">
            {filteredCohorts.map((cohort) => (
              <Card key={cohort.id} className="border-gray-800 bg-[#12121a]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-200">{cohort.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Criada por {cohort.author} em {cohort.created} — {cohort.filters} filtros aplicados
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">{cohort.patients.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-gray-500">pacientes</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                        <Filter className="mr-1 h-3 w-3" /> Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cohort Builder */}
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Filter className="h-5 w-5 text-emerald-400" />
                Construtor de Coortes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-gray-300">Diagnóstico (CID-10)</Label>
                  <Input placeholder="Ex: I50, E11, J18" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
                <div>
                  <Label className="text-gray-300">Faixa Etária</Label>
                  <div className="flex gap-2 mt-1">
                    <Input placeholder="Min" className="border-gray-700 bg-[#0a0a0f] text-gray-200" />
                    <Input placeholder="Max" className="border-gray-700 bg-[#0a0a0f] text-gray-200" />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Período</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="date" className="border-gray-700 bg-[#0a0a0f] text-gray-200" />
                    <Input type="date" className="border-gray-700 bg-[#0a0a0f] text-gray-200" />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Medicamento</Label>
                  <Input placeholder="Ex: Metformina, Losartana" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
                <div>
                  <Label className="text-gray-300">Procedimento</Label>
                  <Input placeholder="Ex: Cateterismo, Hemodiálise" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
                <div>
                  <Label className="text-gray-300">Setor</Label>
                  <Input placeholder="Ex: UTI, Enfermaria" className="mt-1 border-gray-700 bg-[#0a0a0f] text-gray-200" />
                </div>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Search className="mr-1 h-4 w-4" /> Buscar Pacientes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Longitudinal Tab */}
        <TabsContent value="longitudinal" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Análise Longitudinal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-300">Coorte</Label>
                  <select className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200">
                    {DEMO_COHORTS.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300">Desfecho</Label>
                  <select className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200">
                    <option>Mortalidade</option>
                    <option>Readmissão 30 dias</option>
                    <option>Tempo de Permanência</option>
                    <option>Custo Total</option>
                    <option>HbA1c (evolução)</option>
                  </select>
                </div>
              </div>
              {/* Chart placeholder */}
              <div className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-8 text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-700 mb-3" />
                <p className="text-gray-500">Gráfico de tendência longitudinal</p>
                <p className="text-xs text-gray-600 mt-1">Selecione coorte e desfecho para visualizar</p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <BarChart3 className="mr-1 h-4 w-4" /> Gerar Análise
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benchmarking Tab */}
        <TabsContent value="benchmarking" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Benchmarking Nacional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_BENCHMARKS.map((b, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0f] p-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-200">{b.indicator}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-emerald-400 font-mono">{b.hospital}</p>
                        <p className="text-xs text-gray-500">Hospital</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 font-mono">{b.national}</p>
                        <p className="text-xs text-gray-500">Nacional</p>
                      </div>
                      <Badge variant="outline" className={
                        b.trend === 'down' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : b.trend === 'up' ? 'bg-red-500/20 text-red-400 border-red-500/50'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                      }>
                        {b.percentile}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card className="border-gray-800 bg-[#12121a]">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Download className="h-5 w-5 text-yellow-400" />
                Exportação de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-300">Coorte</Label>
                  <select className="mt-1 w-full rounded-md border border-gray-700 bg-[#0a0a0f] p-2 text-gray-200">
                    <option value="">Selecionar coorte...</option>
                    {DEMO_COHORTS.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.patients} pacientes)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300">Período</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="date" className="border-gray-700 bg-[#0a0a0f] text-gray-200" />
                    <Input type="date" className="border-gray-700 bg-[#0a0a0f] text-gray-200" />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Formato de Exportação</Label>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {EXPORT_FORMATS.map((ef) => (
                    <button key={ef.format} className="rounded-lg border border-gray-800 bg-[#0a0a0f] p-4 text-left hover:border-emerald-500/50 transition-colors">
                      <p className="font-medium text-gray-200">{ef.format}</p>
                      <p className="text-xs text-gray-500">{ef.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <label className="flex items-center gap-2 text-gray-300">
                  <input type="checkbox" className="rounded border-gray-600" />
                  Anonimizar dados (remover identificadores)
                </label>
              </div>

              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="mr-1 h-4 w-4" /> Exportar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
