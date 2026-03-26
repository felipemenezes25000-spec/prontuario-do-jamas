import { useState, useCallback } from 'react';
import {
  Search,
  Pill,
  AlertTriangle,
  ShieldCheck,
  Baby,
  Stethoscope,
  ArrowLeftRight,
  Upload,
  X,
  Loader2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useDrugSearch,
  useDrug,
  useCheckInteractions,
  type Drug,
  type DrugWithInteractions,
  type InteractionResult,
} from '@/services/drugs.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { label: string; className: string }> = {
  MILD: { label: 'Leve', className: 'bg-green-900/40 text-green-300 border-green-700' },
  MODERATE: { label: 'Moderada', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-700' },
  SEVERE: { label: 'Grave', className: 'bg-red-900/40 text-red-300 border-red-700' },
  CONTRAINDICATED: { label: 'Contraindicada', className: 'bg-red-900/60 text-red-200 border-red-600' },
};

const PREGNANCY_CATEGORIES: Record<string, { label: string; className: string; description: string }> = {
  A: { label: 'A', className: 'bg-green-900/40 text-green-300 border-green-700', description: 'Sem risco em estudos controlados' },
  B: { label: 'B', className: 'bg-blue-900/40 text-blue-300 border-blue-700', description: 'Sem evidência de risco em humanos' },
  C: { label: 'C', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-700', description: 'Risco não pode ser descartado' },
  D: { label: 'D', className: 'bg-orange-900/40 text-orange-300 border-orange-700', description: 'Evidência positiva de risco' },
  X: { label: 'X', className: 'bg-red-900/40 text-red-300 border-red-700', description: 'Contraindicado na gestação' },
};

// ─── Drug Detail Modal ─────────────────────────────────────────────────────

function DrugDetailModal({
  drugId,
  open,
  onClose,
}: {
  drugId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: drug, isLoading } = useDrug(drugId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-400" />
            {isLoading ? 'Carregando...' : drug?.name ?? 'Medicamento'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Detalhes, interações e informações de segurança
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : drug ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Princípio Ativo" value={drug.activeIngredient} />
              <InfoField label="Classe Terapêutica" value={drug.therapeuticClass} />
              <InfoField label="Forma Farmacêutica" value={drug.pharmaceuticalForm} />
              <InfoField label="Concentração" value={drug.concentration} />
              <InfoField label="Via Padrão" value={drug.defaultRoute ?? '—'} />
              <InfoField label="Frequência Padrão" value={drug.defaultFrequency ?? '—'} />
              <InfoField label="Dose Máx./Dia" value={drug.maxDosePerDay ?? '—'} />
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-2">
              {drug.isControlled && (
                <Badge className="bg-red-900/40 text-red-300 border border-red-700">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Controlado {drug.controlType ? `(${drug.controlType})` : ''}
                </Badge>
              )}
              {drug.isAntimicrobial && (
                <Badge className="bg-purple-900/40 text-purple-300 border border-purple-700">
                  Antimicrobiano
                </Badge>
              )}
              {drug.isHighAlert && (
                <Badge className="bg-orange-900/40 text-orange-300 border border-orange-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Alta Vigilância
                </Badge>
              )}
              {drug.geriatricCaution && (
                <Badge className="bg-yellow-900/40 text-yellow-300 border border-yellow-700">
                  Cautela Geriátrica
                </Badge>
              )}
              {drug.pediatricUse && (
                <Badge className="bg-blue-900/40 text-blue-300 border border-blue-700">
                  <Baby className="w-3 h-3 mr-1" />
                  Uso Pediátrico
                </Badge>
              )}
            </div>

            {/* Adjustments */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-gray-300">Ajuste Renal</span>
                  </div>
                  <span className={cn('text-sm', drug.renalAdjustment ? 'text-yellow-400' : 'text-gray-500')}>
                    {drug.renalAdjustment ? 'Necessário' : 'Não necessário'}
                  </span>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-gray-300">Ajuste Hepático</span>
                  </div>
                  <span className={cn('text-sm', drug.hepaticAdjustment ? 'text-yellow-400' : 'text-gray-500')}>
                    {drug.hepaticAdjustment ? 'Necessário' : 'Não necessário'}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Pregnancy Category */}
            {drug.pregnancyCategory && PREGNANCY_CATEGORIES[drug.pregnancyCategory] && (() => {
              const pregCat = PREGNANCY_CATEGORIES[drug.pregnancyCategory as string];
              if (!pregCat) return null;
              return (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Baby className="w-5 h-5 text-pink-400" />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">Categoria Gestação: </span>
                        <Badge className={cn('border ml-1', pregCat.className)}>
                          {pregCat.label}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {pregCat.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Beers List */}
            {drug.beersListCriteria && (
              <Card className="bg-yellow-900/20 border-yellow-700/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-yellow-300">Critérios de Beers</span>
                      <p className="text-sm text-yellow-200/70 mt-1">{drug.beersListCriteria}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interactions */}
            {(drug as DrugWithInteractions).interactions && (drug as DrugWithInteractions).interactions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-orange-400" />
                  Interações Medicamentosas ({(drug as DrugWithInteractions).interactions.length})
                </h3>
                <div className="space-y-2">
                  {(drug as DrugWithInteractions).interactions.map((interaction) => {
                    const sev = SEVERITY_CONFIG[interaction.severity] ?? { label: 'Moderada', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-700' };
                    return (
                      <Card key={interaction.id} className="bg-gray-800 border-gray-700">
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">
                              {interaction.otherDrug.name}
                            </span>
                            <Badge className={cn('border text-xs', sev.className)}>
                              {sev.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400">{interaction.effect}</p>
                          {interaction.mechanism && (
                            <p className="text-xs text-gray-500 mt-1">
                              <span className="text-gray-400">Mecanismo:</span> {interaction.mechanism}
                            </p>
                          )}
                          {interaction.management && (
                            <p className="text-xs text-emerald-400/80 mt-1">
                              <span className="font-medium">Conduta:</span> {interaction.management}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Medicamento não encontrado.</p>
        )}

        <DialogFooter>
          <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs text-gray-500">{label}</Label>
      <p className="text-sm text-gray-200">{value}</p>
    </div>
  );
}

// ─── Interaction Checker ───────────────────────────────────────────────────

function InteractionChecker() {
  const checkMutation = useCheckInteractions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const { data: searchResults } = useDrugSearch(searchQ);
  const [result, setResult] = useState<InteractionResult | null>(null);

  const handleAddDrug = useCallback((drug: Drug) => {
    if (selectedIds.includes(drug.id)) return;
    setSelectedIds((prev) => [...prev, drug.id]);
    setSearchQ('');
    setResult(null);
  }, [selectedIds]);

  const handleRemoveDrug = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((d) => d !== id));
    setResult(null);
  }, []);

  const handleCheck = useCallback(() => {
    if (selectedIds.length < 2) {
      toast.error('Selecione pelo menos 2 medicamentos.');
      return;
    }
    checkMutation.mutate(selectedIds, {
      onSuccess: (data) => setResult(data),
      onError: () => toast.error('Erro ao verificar interações.'),
    });
  }, [selectedIds, checkMutation]);

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-5 h-5 text-orange-400" />
            Verificar Interações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10 bg-gray-800 border-gray-700 text-white"
              placeholder="Buscar medicamento para adicionar..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            {searchQ.length >= 2 && searchResults?.data && searchResults.data.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md max-h-48 overflow-y-auto">
                {searchResults.data.slice(0, 8).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                    onClick={() => handleAddDrug(d)}
                  >
                    {d.name} — <span className="text-gray-400">{d.activeIngredient}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedIds.map((id) => (
                <Badge
                  key={id}
                  className="bg-gray-800 text-gray-200 border border-gray-600 gap-1 cursor-pointer hover:bg-gray-700"
                  onClick={() => handleRemoveDrug(id)}
                >
                  {id.slice(0, 8)}...
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}

          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            disabled={selectedIds.length < 2 || checkMutation.isPending}
            onClick={handleCheck}
          >
            {checkMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Verificar Interações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={cn(
          'border',
          result.hasSevere
            ? 'bg-red-900/20 border-red-700'
            : 'bg-gray-900 border-gray-700',
        )}>
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              {result.hasSevere && <AlertTriangle className="w-5 h-5 text-red-400" />}
              Resultado: {result.interactions.length} interação(ões) encontrada(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.interactions.length === 0 ? (
              <p className="text-emerald-400 text-sm">Nenhuma interação conhecida entre os medicamentos selecionados.</p>
            ) : (
              <div className="space-y-3">
                {result.interactions.map((inter, idx) => {
                  const sev = SEVERITY_CONFIG[inter.severity] ?? { label: 'Moderada', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-700' };
                  return (
                    <div key={idx} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-medium">
                          {inter.drug1.name} + {inter.drug2.name}
                        </span>
                        <Badge className={cn('border text-xs', sev.className)}>{sev.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-400">{inter.effect}</p>
                      {inter.management && (
                        <p className="text-xs text-emerald-400/80 mt-1">Conduta: {inter.management}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Equivalence Table ─────────────────────────────────────────────────────

function EquivalenceTab() {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useDrugSearch(query, { limit: 50 });

  const grouped = (results?.data ?? []).reduce<Record<string, Drug[]>>((acc, drug) => {
    const key = drug.activeIngredient;
    if (!acc[key]) acc[key] = [];
    acc[key].push(drug);
    return acc;
  }, {});

  const groupEntries = Object.entries(grouped).filter(([, drugs]) => drugs.length > 1);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-10 bg-gray-800 border-gray-700 text-white"
          placeholder="Buscar por princípio ativo para ver equivalências..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading && query.length >= 2 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      )}

      {query.length >= 2 && !isLoading && groupEntries.length === 0 && (
        <div className="text-center py-8">
          <Info className="w-8 h-8 mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">Nenhuma equivalência encontrada.</p>
        </div>
      )}

      {groupEntries.map(([ingredient, drugs]) => (
        <Card key={ingredient} className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald-400 text-sm font-semibold">{ingredient}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Nome Comercial</TableHead>
                  <TableHead className="text-gray-400">Forma</TableHead>
                  <TableHead className="text-gray-400">Concentração</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drugs.map((d) => (
                  <TableRow key={d.id} className="border-gray-800">
                    <TableCell className="text-gray-200 font-medium">{d.name}</TableCell>
                    <TableCell className="text-gray-400">{d.pharmaceuticalForm}</TableCell>
                    <TableCell className="text-gray-400">{d.concentration}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        'border text-xs',
                        d.isActive
                          ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                          : 'bg-gray-800 text-gray-400 border-gray-600',
                      )}>
                        {d.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Import Tab ────────────────────────────────────────────────────────────

function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const stored = localStorage.getItem('voxpep-auth');
      const token = stored ? JSON.parse(stored)?.state?.accessToken : null;
      const res = await fetch('/api/v1/drugs/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Falha no import');
      const data = await res.json() as { imported: number };
      toast.success(`${data.imported} medicamentos importados com sucesso!`);
      setFile(null);
    } catch {
      toast.error('Erro ao importar banco de dados.');
    } finally {
      setImporting(false);
    }
  }, [file]);

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Upload className="w-5 h-5 text-emerald-400" />
          Importar Banco de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-400">
          Importe um arquivo CSV ou JSON contendo o banco de dados de medicamentos.
          O arquivo deve conter: nome, princípio ativo, classe terapêutica, forma farmacêutica e concentração.
        </p>
        <div>
          <Label className="text-gray-300">Arquivo</Label>
          <Input
            type="file"
            accept=".csv,.json"
            className="bg-gray-800 border-gray-700 text-white mt-1 file:bg-gray-700 file:text-gray-200 file:border-0 file:mr-4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!file || importing}
          onClick={handleImport}
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function DrugsPage() {
  const [search, setSearch] = useState('');
  const [filterControlled, setFilterControlled] = useState<string>('all');
  const [filterHighAlert, setFilterHighAlert] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [detailDrugId, setDetailDrugId] = useState<string | null>(null);

  const filters = {
    isControlled: filterControlled === 'yes' ? true : filterControlled === 'no' ? false : undefined,
    isHighAlert: filterHighAlert === 'yes' ? true : filterHighAlert === 'no' ? false : undefined,
    page,
    limit: 20,
  };

  const { data: drugsData, isLoading } = useDrugSearch(search, filters);
  const drugs = drugsData?.data ?? [];
  const totalPages = drugsData?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Pill className="w-7 h-7 text-emerald-400" />
          Banco de Medicamentos
        </h1>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="search" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Search className="w-4 h-4 mr-2" />
            Busca
          </TabsTrigger>
          <TabsTrigger value="interactions" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Interações
          </TabsTrigger>
          <TabsTrigger value="equivalence" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Equivalências
          </TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10 bg-gray-800 border-gray-700 text-white"
                placeholder="Buscar por nome ou princípio ativo..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={filterControlled} onValueChange={(v) => { setFilterControlled(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44 bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue placeholder="Controlado" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">Todos</SelectItem>
                <SelectItem value="yes" className="text-white">Controlados</SelectItem>
                <SelectItem value="no" className="text-white">Não controlados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterHighAlert} onValueChange={(v) => { setFilterHighAlert(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44 bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue placeholder="Alta Vigilância" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">Todos</SelectItem>
                <SelectItem value="yes" className="text-white">Alta Vigilância</SelectItem>
                <SelectItem value="no" className="text-white">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : drugs.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="w-10 h-10 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">
                    {search.length >= 2 ? 'Nenhum medicamento encontrado.' : 'Digite pelo menos 2 caracteres para buscar.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Nome</TableHead>
                      <TableHead className="text-gray-400">Princípio Ativo</TableHead>
                      <TableHead className="text-gray-400">Classe</TableHead>
                      <TableHead className="text-gray-400">Forma</TableHead>
                      <TableHead className="text-gray-400">Flags</TableHead>
                      <TableHead className="text-gray-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drugs.map((drug) => (
                      <TableRow key={drug.id} className="border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={() => setDetailDrugId(drug.id)}>
                        <TableCell className="text-gray-200 font-medium">{drug.name}</TableCell>
                        <TableCell className="text-gray-400">{drug.activeIngredient}</TableCell>
                        <TableCell className="text-gray-400">{drug.therapeuticClass}</TableCell>
                        <TableCell className="text-gray-400">{drug.pharmaceuticalForm}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {drug.isControlled && (
                              <Badge className="bg-red-900/40 text-red-300 border border-red-700 text-xs">C</Badge>
                            )}
                            {drug.isHighAlert && (
                              <Badge className="bg-orange-900/40 text-orange-300 border border-orange-700 text-xs">AV</Badge>
                            )}
                            {drug.isAntimicrobial && (
                              <Badge className="bg-purple-900/40 text-purple-300 border border-purple-700 text-xs">ATM</Badge>
                            )}
                            {drug.renalAdjustment && (
                              <Badge className="bg-blue-900/40 text-blue-300 border border-blue-700 text-xs">R</Badge>
                            )}
                            {drug.hepaticAdjustment && (
                              <Badge className="bg-amber-900/40 text-amber-300 border border-amber-700 text-xs">H</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            onClick={(e) => { e.stopPropagation(); setDetailDrugId(drug.id); }}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-400">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Interactions Tab */}
        <TabsContent value="interactions">
          <InteractionChecker />
        </TabsContent>

        {/* Equivalence Tab */}
        <TabsContent value="equivalence">
          <EquivalenceTab />
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <ImportTab />
        </TabsContent>
      </Tabs>

      {/* Drug Detail Modal */}
      {detailDrugId && (
        <DrugDetailModal
          drugId={detailDrugId}
          open={!!detailDrugId}
          onClose={() => setDetailDrugId(null)}
        />
      )}
    </div>
  );
}
