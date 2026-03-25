import {
  UtensilsCrossed, Shirt, Trash2, Archive,
  Plus, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useSndDashboard, useLaundryDashboard, useWasteDashboard,
  useOmbudsmanDashboard, useComplaints, useSameDashboard,
} from '@/services/hospital-services.service';

// ─── SND ─────────────────────────────────────────────────────────────────

function SndTab() {
  const { data } = useSndDashboard();
  const d = data as Record<string, unknown> | undefined;
  const totalActive = (d?.totalActive as number) ?? 0;
  const portioningPending = (d?.portioningPending as number) ?? 0;
  const byType = (d?.byType as Array<{ type: string; count: number }>) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Dietas Ativas</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{totalActive}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Porcionamento Pendente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-400">{portioningPending}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Tipos de Dieta</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{byType.filter((t) => t.count > 0).length}</div></CardContent>
        </Card>
      </div>
      {byType.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader><CardTitle className="text-white">Distribuicao por Tipo de Dieta</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              {byType.filter((t) => t.count > 0).map((t) => (
                <div key={t.type} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
                  <span className="text-sm text-zinc-300">{t.type}</span>
                  <Badge variant="outline">{t.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Laundry ─────────────────────────────────────────────────────────────

function LaundryTab() {
  const { data } = useLaundryDashboard();
  const d = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Total Processado (kg)</CardTitle>
            <Shirt className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{d?.totalKg ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Pecas Extraviadas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-400">{d?.totalLoss ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Registros</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{d?.totalRecords ?? 0}</div></CardContent>
        </Card>
      </div>
      {d?.bySector && d.bySector.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader><CardTitle className="text-white">Kg por Setor</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">Setor</TableHead>
                  <TableHead className="text-zinc-400 text-right">Kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.bySector.map((s: { sector: string; kg: number }) => (
                  <TableRow key={s.sector} className="border-zinc-800">
                    <TableCell className="text-white">{s.sector}</TableCell>
                    <TableCell className="text-right text-zinc-300">{s.kg}</TableCell>
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

// ─── Waste ───────────────────────────────────────────────────────────────

function WasteTab() {
  const { data } = useWasteDashboard();
  const d = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Total Residuos (kg)</CardTitle>
            <Trash2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{d?.totalKg ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Conformidade ANVISA</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={d?.anvisaCompliant ? 'default' : 'destructive'} className="text-sm">
              {d?.anvisaCompliant ? 'CONFORME' : 'NAO CONFORME'}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">RDC 222</CardTitle></CardHeader>
          <CardContent><Badge variant="default" className="text-sm">CONFORME</Badge></CardContent>
        </Card>
      </div>
      {d?.byGroup && d.byGroup.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader><CardTitle className="text-white">Residuos por Grupo (ANVISA RDC 222)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-zinc-400">Grupo</TableHead>
                  <TableHead className="text-zinc-400">Descricao</TableHead>
                  <TableHead className="text-zinc-400 text-right">Kg</TableHead>
                  <TableHead className="text-zinc-400 text-right">Registros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.byGroup.map((g) => (
                  <TableRow key={g.group} className="border-zinc-800">
                    <TableCell><Badge variant={g.group === 'A' || g.group === 'E' ? 'destructive' : 'outline'}>Grupo {g.group}</Badge></TableCell>
                    <TableCell className="text-zinc-300">{g.label}</TableCell>
                    <TableCell className="text-right text-white">{g.totalKg}</TableCell>
                    <TableCell className="text-right text-zinc-400">{g.records}</TableCell>
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

// ─── Ombudsman ───────────────────────────────────────────────────────────

function OmbudsmanTab() {
  const { data: dashboard } = useOmbudsmanDashboard();
  const { data: complaintsData } = useComplaints();
  const d = dashboard;
  const complaints = complaintsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{d?.total ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Abertas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-400">{d?.open ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Resolvidas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-400">{d?.resolved ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Fora do SLA</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-400">{d?.overSla ?? 0}</div></CardContent>
        </Card>
      </div>
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Manifestacoes Recentes</CardTitle>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nova</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700">
                <TableHead className="text-zinc-400">Tipo</TableHead>
                <TableHead className="text-zinc-400">Descricao</TableHead>
                <TableHead className="text-zinc-400">Setor</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={5} className="text-center text-zinc-500 py-8">Nenhuma manifestacao</TableCell>
                </TableRow>
              ) : complaints.map((c) => (
                <TableRow key={c.id} className="border-zinc-800">
                  <TableCell>
                    <Badge variant={c.type === 'COMPLAINT' ? 'destructive' : c.type === 'COMPLIMENT' ? 'default' : 'secondary'}>
                      {c.type === 'COMPLAINT' ? 'Reclamacao' : c.type === 'COMPLIMENT' ? 'Elogio' : c.type === 'SUGGESTION' ? 'Sugestao' : c.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-300 max-w-xs truncate">{c.description}</TableCell>
                  <TableCell className="text-zinc-400">{c.sector ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                  <TableCell className="text-zinc-400">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SAME ────────────────────────────────────────────────────────────────

function SameTab() {
  const { data } = useSameDashboard();
  const d = data as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-zinc-400">Total Prontuarios</CardTitle>
            <Archive className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{(d?.totalRecords as number) ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">No Arquivo</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-400">{(d?.inArchive as number) ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Emprestados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-400">{(d?.onLoan as number) ?? 0}</div></CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Emprestimo Atrasado</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-400">{(d?.overdueLoan as number) ?? 0}</div></CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function HospitalServicesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Servicos Hospitalares</h1>
        <p className="text-zinc-400 mt-1">SND, Lavanderia, Residuos, Ouvidoria e SAME</p>
      </div>

      <Tabs defaultValue="snd" className="space-y-4">
        <TabsList className="bg-zinc-800/50">
          <TabsTrigger value="snd">SND</TabsTrigger>
          <TabsTrigger value="laundry">Lavanderia</TabsTrigger>
          <TabsTrigger value="waste">Residuos (PGRSS)</TabsTrigger>
          <TabsTrigger value="ombudsman">Ouvidoria</TabsTrigger>
          <TabsTrigger value="same">SAME</TabsTrigger>
        </TabsList>

        <TabsContent value="snd"><SndTab /></TabsContent>
        <TabsContent value="laundry"><LaundryTab /></TabsContent>
        <TabsContent value="waste"><WasteTab /></TabsContent>
        <TabsContent value="ombudsman"><OmbudsmanTab /></TabsContent>
        <TabsContent value="same"><SameTab /></TabsContent>
      </Tabs>
    </div>
  );
}
