import { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  FileText,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useEncountersForCoding,
  useCodingSuggestions,
  useGenerateSuggestions,
  useAcceptCoding,
  useRejectCoding,
  type EncounterForCoding,
  type CodingSuggestion,
} from '@/services/billing-coding.service';

// ─── helpers ───────────────────────────────────────────────────────────────

function systemBadge(system: CodingSuggestion['system']) {
  const map: Record<string, string> = {
    CID10: 'bg-blue-900/40 text-blue-300 border-blue-700',
    CBHPM: 'bg-purple-900/40 text-purple-300 border-purple-700',
    TUSS: 'bg-amber-900/40 text-amber-300 border-amber-700',
  };
  return map[system] ?? '';
}

function statusBadge(status: CodingSuggestion['status']) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    ACCEPTED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    REJECTED: 'bg-red-900/40 text-red-300 border-red-700',
    MODIFIED: 'bg-blue-900/40 text-blue-300 border-blue-700',
  };
  return map[status] ?? '';
}

function statusLabel(status: CodingSuggestion['status']) {
  const map: Record<string, string> = {
    PENDING: 'Pendente',
    ACCEPTED: 'Aceita',
    REJECTED: 'Rejeitada',
    MODIFIED: 'Modificada',
  };
  return map[status] ?? status;
}

function codingStatusLabel(s: EncounterForCoding['codingStatus']) {
  return { PENDING: 'Pendente', IN_PROGRESS: 'Em progresso', COMPLETED: 'Concluído' }[s] ?? s;
}

// ─── Suggestions Panel ─────────────────────────────────────────────────────

function SuggestionsPanel({
  encounter,
  onClose,
}: {
  encounter: EncounterForCoding;
  onClose: () => void;
}) {
  const { data: suggestions = [], isLoading } = useCodingSuggestions(encounter.id);
  const generate = useGenerateSuggestions();
  const accept = useAcceptCoding();
  const reject = useRejectCoding();

  function handleAccept(s: CodingSuggestion) {
    accept.mutate(
      { suggestionId: s.id, encounterId: encounter.id },
      { onSuccess: () => toast.success(`Código ${s.code} aceito`) },
    );
  }

  function handleReject(s: CodingSuggestion) {
    reject.mutate(
      { suggestionId: s.id, encounterId: encounter.id },
      { onSuccess: () => toast.success(`Código ${s.code} rejeitado`) },
    );
  }

  return (
    <DialogContent className="max-w-3xl bg-gray-900 border-gray-700">
      <DialogHeader>
        <DialogTitle className="text-white">
          Sugestões de Codificação — {encounter.patientName}
        </DialogTitle>
      </DialogHeader>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          Dr. {encounter.doctorName} · {new Date(encounter.date).toLocaleDateString('pt-BR')}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/30"
          onClick={() =>
            generate.mutate(encounter.id, {
              onSuccess: () => toast.success('Sugestões geradas pela IA'),
            })
          }
          disabled={generate.isPending}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {generate.isPending ? 'Gerando…' : 'Gerar com IA'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">Carregando…</p>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma sugestão. Clique em "Gerar com IA".</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Sistema</TableHead>
              <TableHead className="text-gray-400">Código</TableHead>
              <TableHead className="text-gray-400">Descrição</TableHead>
              <TableHead className="text-gray-400">Conf.</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions.map((s) => (
              <TableRow key={s.id} className="border-gray-700">
                <TableCell>
                  <Badge className={cn('text-xs border', systemBadge(s.system))}>{s.system}</Badge>
                </TableCell>
                <TableCell className="font-mono text-white">{s.code}</TableCell>
                <TableCell className="text-gray-300 text-sm">{s.description}</TableCell>
                <TableCell className="text-gray-300">{Math.round(s.confidence * 100)}%</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', statusBadge(s.status))}>
                    {statusLabel(s.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {s.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-400 hover:bg-emerald-900/30"
                        onClick={() => handleAccept(s)}
                        disabled={accept.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:bg-red-900/30"
                        onClick={() => handleReject(s)}
                        disabled={reject.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex justify-end mt-4">
        <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Encounters List ────────────────────────────────────────────────────────

function EncountersList({ status }: { status?: string }) {
  const [selected, setSelected] = useState<EncounterForCoding | null>(null);
  const [search, setSearch] = useState('');
  const { data: encounters = [], isLoading } = useEncountersForCoding({ status });

  const filtered = encounters.filter(
    (e) =>
      e.patientName.toLowerCase().includes(search.toLowerCase()) ||
      e.doctorName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            placeholder="Buscar por paciente ou médico…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum atendimento encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Paciente</TableHead>
              <TableHead className="text-gray-400">Médico</TableHead>
              <TableHead className="text-gray-400">Tipo</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Sugestões</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((enc) => (
              <TableRow key={enc.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-medium">{enc.patientName}</TableCell>
                <TableCell className="text-gray-300">Dr. {enc.doctorName}</TableCell>
                <TableCell className="text-gray-300">{enc.type}</TableCell>
                <TableCell className="text-gray-300">
                  {new Date(enc.date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      'text-xs border',
                      enc.codingStatus === 'COMPLETED'
                        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                        : enc.codingStatus === 'IN_PROGRESS'
                          ? 'bg-blue-900/40 text-blue-300 border-blue-700'
                          : 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
                    )}
                  >
                    {codingStatusLabel(enc.codingStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300">{enc.suggestionsCount}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-emerald-400 hover:bg-emerald-900/30"
                    onClick={() => setSelected(enc)}
                  >
                    Ver <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <SuggestionsPanel encounter={selected} onClose={() => setSelected(null)} />
        )}
      </Dialog>
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CodingPage() {
  const [tab, setTab] = useState('pending');

  const statusMap: Record<string, string | undefined> = {
    pending: 'PENDING',
    accepted: 'ACCEPTED',
    rejected: 'REJECTED',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Codificação Automática</h1>
          <p className="text-sm text-gray-400">
            Sugestões de CID-10, CBHPM e TUSS geradas por IA a partir das notas clínicas
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="pending" className="data-[state=active]:bg-gray-700 text-gray-300">
            Sugestões Pendentes
          </TabsTrigger>
          <TabsTrigger value="accepted" className="data-[state=active]:bg-gray-700 text-gray-300">
            Aceitas
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-gray-700 text-gray-300">
            Rejeitadas
          </TabsTrigger>
        </TabsList>

        {(['pending', 'accepted', 'rejected'] as const).map((t) => (
          <TabsContent key={t} value={t}>
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  {t === 'pending' && <RefreshCw className="w-4 h-4 text-yellow-400" />}
                  {t === 'accepted' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {t === 'rejected' && <XCircle className="w-4 h-4 text-red-400" />}
                  {t === 'pending' ? 'Pendentes' : t === 'accepted' ? 'Aceitas' : 'Rejeitadas'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EncountersList status={statusMap[t]} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
