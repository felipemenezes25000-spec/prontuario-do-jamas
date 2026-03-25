import { useState } from 'react';
import {
  ClipboardCheck,
  Calculator,
  ListOrdered,
  Route,
  AlertTriangle,
  BookOpen,
  Brain,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  usePathways,
  useOrderSets,
  useComplianceDashboard,
  useDeviations,
  useGuidelines,
  useCalculateScore,
  useRecommendProtocol,
  useComplianceMonitor,
  type CalculatorType,
} from '@/services/clinical-pathways.service';

// ─── helpers ─────────────────────────────────────────────────────────────────

function riskBadge(level: string) {
  const colors: Record<string, string> = {
    LOW: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    MODERATE: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    HIGH: 'bg-red-900/40 text-red-300 border-red-700',
    CRITICAL: 'bg-red-900/60 text-red-200 border-red-600',
    VERY_LOW: 'bg-blue-900/40 text-blue-300 border-blue-700',
  };
  return (
    <Badge className={cn('text-xs border', colors[level] ?? 'bg-gray-800 text-gray-300 border-gray-600')}>
      {level}
    </Badge>
  );
}

// ─── Calculator Section ──────────────────────────────────────────────────────

function CalculatorsTab() {
  const [calcType, setCalcType] = useState<CalculatorType>('CHADS2_VASC');
  const [patientId, setPatientId] = useState('');
  const calcMutation = useCalculateScore();

  const calculators: Array<{ value: CalculatorType; label: string }> = [
    { value: 'CHADS2_VASC', label: 'CHA2DS2-VASc (FA)' },
    { value: 'MELD', label: 'MELD-Na (Hepatico)' },
    { value: 'CHILD_PUGH', label: 'Child-Pugh (Cirrose)' },
    { value: 'APACHE_II', label: 'APACHE II (UTI)' },
    { value: 'WELLS_DVT', label: 'Wells TVP' },
    { value: 'WELLS_PE', label: 'Wells TEP' },
    { value: 'GENEVA', label: 'Geneva Revisado' },
    { value: 'CURB_65', label: 'CURB-65 (Pneumonia)' },
    { value: 'CAPRINI', label: 'Caprini (VTE Cirurgico)' },
    { value: 'PADUA', label: 'Padua (VTE Clinico)' },
  ];

  const handleCalculate = () => {
    if (!patientId) return;
    // Demo parameters based on calculator type
    const demoParams: Record<string, Record<string, number | boolean>> = {
      CHADS2_VASC: { chf: true, hypertension: true, age75OrOlder: false, diabetes: false, stroke: false, vascularDisease: false, age65to74: true, female: false },
      CURB_65: { confusion: false, bun: 22, respiratoryRate: 28, systolicBP: 95, age: 68 },
      WELLS_DVT: { activeCancer: false, paralysis: false, recentImmobilization: true, localizedTenderness: true, entireLegSwollen: false, calfSwelling: true, pittingEdema: false, collateralVeins: false, previousDVT: false, alternativeDiagnosis: false },
      MELD: { bilirubin: 2.5, creatinine: 1.8, inr: 1.5, sodium: 132 },
    };

    calcMutation.mutate({
      calculator: calcType,
      patientId,
      parameters: demoParams[calcType] ?? {},
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-700 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              Selecionar Calculadora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-400 text-xs">Calculadora</Label>
              <Select value={calcType} onValueChange={(v) => setCalcType(v as CalculatorType)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calculators.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">UUID do Paciente</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Colar UUID do paciente"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCalculate}
              disabled={!patientId || calcMutation.isPending}
            >
              {calcMutation.isPending ? 'Calculando...' : 'Calcular'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            {calcMutation.data ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-bold text-emerald-400">{calcMutation.data.score}</span>
                  {riskBadge(calcMutation.data.riskLevel)}
                </div>
                <p className="text-gray-300">{calcMutation.data.interpretation}</p>
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <p className="text-sm font-medium text-emerald-400 mb-1">Recomendacao</p>
                  <p className="text-sm text-gray-300">{calcMutation.data.recommendation}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Selecione uma calculadora e insira o ID do paciente para calcular.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Order Sets Tab ──────────────────────────────────────────────────────────

function OrderSetsTab() {
  const { data: orderSets, isLoading } = useOrderSets();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando order sets...</p>;

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-emerald-400" />
            Order Sets Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderSets && orderSets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">CIDs</TableHead>
                  <TableHead className="text-gray-400">Itens</TableHead>
                  <TableHead className="text-gray-400">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderSets.map((os) => (
                  <TableRow key={os.docId} className="border-gray-700">
                    <TableCell className="text-white font-medium">{os.name}</TableCell>
                    <TableCell className="text-gray-300">{os.diagnosisCodes?.join(', ')}</TableCell>
                    <TableCell>
                      <Badge className="bg-gray-800 text-gray-300 border-gray-600">{os.totalItems} itens</Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum order set cadastrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pathways Tab ────────────────────────────────────────────────────────────

function PathwaysTab() {
  const { data: pathways, isLoading } = usePathways();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando protocolos...</p>;

  return (
    <div className="space-y-4">
      {pathways && pathways.length > 0 ? (
        pathways.map((pw) => (
          <Card key={pw.docId} className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Route className="w-4 h-4 text-emerald-400" />
                  {pw.name}
                </CardTitle>
                <Badge className="bg-emerald-900/40 text-emerald-300 border-emerald-700">
                  {pw.expectedDays} dias
                </Badge>
              </div>
              {pw.diagnosisCodes?.length > 0 && (
                <p className="text-gray-400 text-sm mt-1">CIDs: {pw.diagnosisCodes.join(', ')}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {pw.days?.map((day) => (
                  <div
                    key={day.dayNumber}
                    className="min-w-48 bg-gray-800 rounded-lg p-3 border border-gray-700 flex-shrink-0"
                  >
                    <p className="text-emerald-400 font-bold mb-2">D{day.dayNumber}</p>
                    <div className="space-y-1">
                      {day.goals?.map((g, i) => (
                        <p key={i} className="text-xs text-gray-300 flex items-start gap-1">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-emerald-500 flex-shrink-0" />
                          {g}
                        </p>
                      ))}
                    </div>
                    {day.dischargeCriteria && day.dischargeCriteria.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-xs text-yellow-400 font-medium">Criterios de alta:</p>
                        {day.dischargeCriteria.map((c, i) => (
                          <p key={i} className="text-xs text-gray-400">{c}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="py-8">
            <p className="text-gray-500 text-center">Nenhum protocolo clinico cadastrado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Compliance Tab ──────────────────────────────────────────────────────────

function ComplianceTab() {
  const { data: compliance, isLoading } = useComplianceDashboard();
  const { data: monitor } = useComplianceMonitor();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando dados de aderencia...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-5">
            <p className="text-sm text-gray-400">Aderencia Geral</p>
            <p className={cn(
              'text-4xl font-bold',
              (compliance?.avgCompliance ?? 0) >= 80 ? 'text-emerald-400' : 'text-yellow-400',
            )}>
              {compliance?.avgCompliance ?? 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Meta: 80%</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-5">
            <p className="text-sm text-gray-400">Registros (30d)</p>
            <p className="text-4xl font-bold text-white">{compliance?.totalRecords ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-5">
            <p className="text-sm text-gray-400">Protocolos Monitorados</p>
            <p className="text-4xl font-bold text-white">{compliance?.byPathway?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Alerts */}
      {monitor?.alerts && monitor.alerts.length > 0 && (
        <Card className="bg-gray-900 border-gray-700 border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-yellow-400" />
              Alertas de IA - Monitoramento de Aderencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monitor.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className={cn('w-4 h-4 mt-0.5', alert.severity === 'HIGH' ? 'text-red-400' : 'text-yellow-400')} />
                <p className="text-sm text-gray-300">{alert.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-pathway compliance */}
      {compliance?.byPathway && compliance.byPathway.length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Aderencia por Protocolo</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Protocolo</TableHead>
                  <TableHead className="text-gray-400">Registros</TableHead>
                  <TableHead className="text-gray-400">Aderencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compliance.byPathway.map((pw) => (
                  <TableRow key={pw.pathwayId} className="border-gray-700">
                    <TableCell className="text-white">{pw.pathwayId}</TableCell>
                    <TableCell className="text-gray-300">{pw.count}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        'text-xs border',
                        pw.avgCompliance >= 80
                          ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                          : pw.avgCompliance >= 60
                            ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700'
                            : 'bg-red-900/40 text-red-300 border-red-700',
                      )}>
                        {pw.avgCompliance}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Deviations Tab ──────────────────────────────────────────────────────────

function DeviationsTab() {
  const { data: deviations, isLoading } = useDeviations();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando desvios...</p>;

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Desvios de Protocolo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deviations?.data && deviations.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-400">Paciente</TableHead>
                <TableHead className="text-gray-400">Protocolo</TableHead>
                <TableHead className="text-gray-400">Desvio</TableHead>
                <TableHead className="text-gray-400">Justificativa</TableHead>
                <TableHead className="text-gray-400">Gravidade</TableHead>
                <TableHead className="text-gray-400">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviations.data.map((dev) => (
                <TableRow key={dev.docId} className="border-gray-700">
                  <TableCell className="text-white">{dev.patient?.fullName ?? 'N/A'}</TableCell>
                  <TableCell className="text-gray-300 text-sm">{dev.pathwayId}</TableCell>
                  <TableCell className="text-gray-300 text-sm max-w-48 truncate">{dev.deviationDescription}</TableCell>
                  <TableCell className="text-gray-300 text-sm max-w-48 truncate">{dev.justification}</TableCell>
                  <TableCell>{riskBadge(dev.severity)}</TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {new Date(dev.recordedAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-gray-500 text-center py-8">Nenhum desvio registrado.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Guidelines Tab ──────────────────────────────────────────────────────────

function GuidelinesTab() {
  const [cidCode, setCidCode] = useState('');
  const { data: guidelinesData } = useGuidelines(cidCode);
  const recommendMutation = useRecommendProtocol();

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Biblioteca de Diretrizes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-gray-400 text-xs">Codigo CID-10</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Ex: I21, A41, J18"
                value={cidCode}
                onChange={(e) => setCidCode(e.target.value)}
              />
            </div>
            <div className="pt-5">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => recommendMutation.mutate({ diagnosisCodes: [cidCode] })}
                disabled={!cidCode || cidCode.length < 3}
              >
                <Brain className="w-4 h-4 mr-1" />
                IA Recomendar
              </Button>
            </div>
          </div>

          {guidelinesData && guidelinesData.guidelinesFound > 0 && (
            <div className="space-y-3">
              {guidelinesData.guidelines.map((g, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium">{g.title}</p>
                    <Badge className="bg-blue-900/40 text-blue-300 border-blue-700 text-xs">{g.source}</Badge>
                  </div>
                  <p className="text-gray-300 text-sm">{g.summary}</p>
                </div>
              ))}
            </div>
          )}

          {recommendMutation.data && (
            <div className="mt-4">
              <p className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-1">
                <Brain className="w-4 h-4" />
                Recomendacoes de IA (confianca: {(recommendMutation.data.aiConfidence * 100).toFixed(0)}%)
              </p>
              <div className="space-y-2">
                {recommendMutation.data.recommendations.map((rec, i) => (
                  <div key={i} className="bg-gray-800 rounded p-3 border border-emerald-900/40">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm font-medium">{rec.protocolName}</p>
                      <Badge className="bg-emerald-900/40 text-emerald-300 border-emerald-700 text-xs">
                        {(rec.relevance * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">Order Set: {rec.orderSetSuggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProtocolsPage() {
  const [tab, setTab] = useState('calculators');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Protocolos e Vias Clinicas</h1>
          <p className="text-sm text-gray-400">Calculadoras, order sets, pathways e monitoramento de aderencia</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700 flex-wrap">
          <TabsTrigger value="calculators" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Calculator className="w-4 h-4 mr-1" /> Calculadoras
          </TabsTrigger>
          <TabsTrigger value="ordersets" className="data-[state=active]:bg-gray-700 text-gray-300">
            <ListOrdered className="w-4 h-4 mr-1" /> Order Sets
          </TabsTrigger>
          <TabsTrigger value="pathways" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Route className="w-4 h-4 mr-1" /> Vias Clinicas
          </TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Activity className="w-4 h-4 mr-1" /> Aderencia
          </TabsTrigger>
          <TabsTrigger value="deviations" className="data-[state=active]:bg-gray-700 text-gray-300">
            <AlertTriangle className="w-4 h-4 mr-1" /> Desvios
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="data-[state=active]:bg-gray-700 text-gray-300">
            <BookOpen className="w-4 h-4 mr-1" /> Diretrizes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculators"><CalculatorsTab /></TabsContent>
        <TabsContent value="ordersets"><OrderSetsTab /></TabsContent>
        <TabsContent value="pathways"><PathwaysTab /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab /></TabsContent>
        <TabsContent value="deviations"><DeviationsTab /></TabsContent>
        <TabsContent value="guidelines"><GuidelinesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
