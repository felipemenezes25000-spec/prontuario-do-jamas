import { useState } from 'react';
import {
  Route,
  Target,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  usePathways,
  useComplianceDashboard,
  useDeviations,
  type ClinicalPathway,
} from '@/services/clinical-pathways.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function complianceColor(value: number): string {
  if (value >= 90) return 'text-emerald-400';
  if (value >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

function severityBadge(severity: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    LOW: { label: 'Baixa', variant: 'outline' },
    MEDIUM: { label: 'Média', variant: 'secondary' },
    HIGH: { label: 'Alta', variant: 'default' },
    CRITICAL: { label: 'Crítica', variant: 'destructive' },
  };
  const cfg = map[severity] ?? { label: severity, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Pathway Detail View ────────────────────────────────────────────────────

function PathwayDetail({ pathway, onBack }: { pathway: ClinicalPathway; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <div>
          <h2 className="text-xl font-bold">{pathway.name}</h2>
          <div className="flex gap-2 mt-1">
            {pathway.diagnosisCodes.map((code) => (
              <Badge key={code} variant="outline">{code}</Badge>
            ))}
            <Badge variant="secondary">{pathway.expectedDays} dias</Badge>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {pathway.days.map((day) => (
          <Card key={day.dayNumber}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  D{day.dayNumber}
                </div>
                Dia {day.dayNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Goals */}
              {day.goals.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Metas
                  </h4>
                  <ul className="space-y-1">
                    {day.goals.map((goal, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Orders */}
              {day.orders.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Ordens
                  </h4>
                  <ul className="space-y-1">
                    {day.orders.map((order, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground ml-5">
                        {order}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nursing interventions */}
              {day.nursingInterventions && day.nursingInterventions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Intervenções de Enfermagem
                  </h4>
                  <ul className="space-y-1">
                    {day.nursingInterventions.map((intervention, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground ml-5">
                        {intervention}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Discharge criteria */}
              {day.dischargeCriteria && day.dischargeCriteria.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Critérios de Alta
                  </h4>
                  <ul className="space-y-1">
                    {day.dischargeCriteria.map((crit, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground ml-5">
                        {crit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Pathways List Tab ──────────────────────────────────────────────────────

function PathwaysTab() {
  const { data: pathways, isLoading } = usePathways();
  const [selectedPathway, setSelectedPathway] = useState<ClinicalPathway | null>(null);

  if (selectedPathway) {
    return <PathwayDetail pathway={selectedPathway} onBack={() => setSelectedPathway(null)} />;
  }

  const items = pathways ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando pathways...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum pathway cadastrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((pw) => (
            <Card
              key={pw.id}
              className="cursor-pointer hover:border-emerald-500/50 transition-colors"
              onClick={() => setSelectedPathway(pw)}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{pw.name}</h3>
                    <div className="flex flex-wrap gap-1">
                      {pw.diagnosisCodes.map((code) => (
                        <Badge key={code} variant="outline" className="text-xs">{code}</Badge>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {pw.expectedDays} dias
                  </span>
                  <span>{pw.days.length} etapas</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Deviations Tab ─────────────────────────────────────────────────────────

function DeviationsTab() {
  const { data: pathways } = usePathways();
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>('ALL');

  const pathwayFilter = selectedPathwayId === 'ALL' ? undefined : selectedPathwayId;
  const { data: deviationsData, isLoading } = useDeviations(pathwayFilter);

  const deviations = deviationsData?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={selectedPathwayId} onValueChange={setSelectedPathwayId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por Pathway" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Pathways</SelectItem>
            {(pathways ?? []).map((pw) => (
              <SelectItem key={pw.id} value={pw.id}>{pw.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando variâncias...</div>
      ) : deviations.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p>Nenhuma variância registrada</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Justificativa</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviations.map((dev) => (
                <TableRow key={dev.id}>
                  <TableCell className="text-sm max-w-xs truncate">{dev.deviationDescription}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {dev.justification}
                  </TableCell>
                  <TableCell>{severityBadge(dev.severity)}</TableCell>
                  <TableCell className="text-sm">{dev.patient?.fullName ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dev.author?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(dev.recordedAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Compliance Tab ─────────────────────────────────────────────────────────

function ComplianceTab() {
  const { data: dashboard, isLoading } = useComplianceDashboard();
  const { data: pathways } = usePathways();

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando compliance...</div>;
  if (!dashboard) return <div className="text-center py-12 text-muted-foreground">Dashboard indisponível</div>;

  const pathwayMap = new Map((pathways ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className={`text-4xl font-bold ${complianceColor(dashboard.avgCompliance)}`}>
              {dashboard.avgCompliance.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Compliance Médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-emerald-400">{dashboard.totalRecords}</p>
            <p className="text-sm text-muted-foreground mt-1">Total de Registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold">{dashboard.byPathway.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Pathways Monitorados</p>
          </CardContent>
        </Card>
      </div>

      {/* By pathway chart (CSS bars) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Compliance por Pathway
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.byPathway.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Sem dados de compliance</div>
          ) : (
            <div className="space-y-3">
              {dashboard.byPathway.map((item) => {
                const name = pathwayMap.get(item.pathwayId) ?? item.pathwayId;
                return (
                  <div key={item.pathwayId} className="flex items-center gap-3">
                    <span className="w-40 truncate text-sm text-right text-muted-foreground" title={name}>
                      {name}
                    </span>
                    <div className="flex-1 h-7 bg-gray-800 rounded-md overflow-hidden relative">
                      <div
                        className={`h-full rounded-md transition-all duration-500 ${
                          item.avgCompliance >= 90 ? 'bg-emerald-500' :
                          item.avgCompliance >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.avgCompliance}%` }}
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-gray-200">
                        {item.avgCompliance.toFixed(1)}% ({item.count})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {dashboard.alerts && dashboard.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-md border text-sm ${
                    alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                      ? 'border-red-500/30 bg-red-500/5 text-red-300'
                      : 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300'
                  }`}
                >
                  <span className="font-medium">[{alert.type}]</span> {alert.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function ClinicalPathwaysPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Route className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Clinical Pathways</h1>
          <p className="text-sm text-muted-foreground">
            Protocolos clínicos com timeline dia-a-dia, tracking de variância e compliance
          </p>
        </div>
      </div>

      <Tabs defaultValue="pathways" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pathways" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Pathways
          </TabsTrigger>
          <TabsTrigger value="deviations" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Variâncias
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pathways">
          <PathwaysTab />
        </TabsContent>
        <TabsContent value="deviations">
          <DeviationsTab />
        </TabsContent>
        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
