import { useState } from 'react';
import {
  Dna,
  Plus,
  AlertTriangle,
  Microscope,
  Pill,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { PageLoading } from '@/components/common/page-loading';
import { cn } from '@/lib/utils';
import {
  useGeneticVariants,
  usePharmacogenomics,
  useGeneDrugInteractions,
  useRegisterVariant,
  type GeneticVariant,
  type PharmacogenomicSummary,
  type GeneDrugInteraction,
  type RiskLevel,
  type MetabolizerStatus,
} from '@/services/genomics.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const CLASSIFICATION_CONFIG: Record<GeneticVariant['classification'], { label: string; color: string }> = {
  PATOGENICA: { label: 'Patogênica', color: 'bg-red-500/20 text-red-400' },
  PROVAVEL_PATOGENICA: { label: 'Provável Patogênica', color: 'bg-orange-500/20 text-orange-400' },
  VUS: { label: 'VUS', color: 'bg-amber-500/20 text-amber-400' },
  PROVAVEL_BENIGNA: { label: 'Provável Benigna', color: 'bg-blue-500/20 text-blue-400' },
  BENIGNA: { label: 'Benigna', color: 'bg-emerald-500/20 text-emerald-400' },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  ALTO: { label: 'Alto', color: 'border-red-500 text-red-400' },
  MODERADO: { label: 'Moderado', color: 'border-amber-500 text-amber-400' },
  BAIXO: { label: 'Baixo', color: 'border-blue-500 text-blue-400' },
  NORMAL: { label: 'Normal', color: 'border-emerald-500 text-emerald-400' },
};

const METABOLIZER_CONFIG: Record<MetabolizerStatus, { label: string; color: string; description: string }> = {
  ULTRARAPIDO: { label: 'Ultra-rápido', color: 'bg-red-500/20 text-red-400', description: 'Metabolismo muito acelerado — risco de subdosagem' },
  EXTENSIVO: { label: 'Extensivo (Normal)', color: 'bg-emerald-500/20 text-emerald-400', description: 'Metabolismo normal' },
  INTERMEDIARIO: { label: 'Intermediário', color: 'bg-blue-500/20 text-blue-400', description: 'Metabolismo levemente reduzido' },
  LENTO: { label: 'Lento', color: 'bg-amber-500/20 text-amber-400', description: 'Metabolismo reduzido — risco de acúmulo e toxicidade' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function GenomicsPage() {
  const [activeTab, setActiveTab] = useState('variants');
  const [patientId, setPatientId] = useState('');
  const [submittedPatientId, setSubmittedPatientId] = useState('');
  const [showNewVariant, setShowNewVariant] = useState(false);
  const [variantForm, setVariantForm] = useState({
    gene: '',
    variant: '',
    zygosity: '' as GeneticVariant['zygosity'] | '',
    classification: '' as GeneticVariant['classification'] | '',
    clinicalSignificance: '',
    dbSnpId: '',
  });

  const { data: variants = [], isLoading: loadingVariants } = useGeneticVariants(submittedPatientId);
  const { data: pgx = [], isLoading: loadingPgx } = usePharmacogenomics(submittedPatientId);
  const { data: interactions = [], isLoading: loadingInteractions } = useGeneDrugInteractions(submittedPatientId);
  const registerVariant = useRegisterVariant();

  const highRiskInteractions = interactions.filter((i: GeneDrugInteraction) => i.riskLevel === 'ALTO');

  const handleSearch = () => {
    if (!patientId.trim()) {
      toast.error('Informe o ID do paciente.');
      return;
    }
    setSubmittedPatientId(patientId.trim());
  };

  const handleRegisterVariant = async () => {
    if (!submittedPatientId || !variantForm.gene || !variantForm.variant || !variantForm.zygosity || !variantForm.classification || !variantForm.clinicalSignificance) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await registerVariant.mutateAsync({
        patientId: submittedPatientId,
        gene: variantForm.gene,
        variant: variantForm.variant,
        zygosity: variantForm.zygosity as GeneticVariant['zygosity'],
        classification: variantForm.classification as GeneticVariant['classification'],
        clinicalSignificance: variantForm.clinicalSignificance,
        dbSnpId: variantForm.dbSnpId || undefined,
      });
      toast.success('Variante genética registrada.');
      setShowNewVariant(false);
      setVariantForm({ gene: '', variant: '', zygosity: '', classification: '', clinicalSignificance: '', dbSnpId: '' });
    } catch {
      toast.error('Erro ao registrar variante.');
    }
  };

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setVariantForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dna className="h-6 w-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Genômica e Medicina de Precisão</h1>
            <p className="text-sm text-muted-foreground">Variantes genéticas, farmacogenômica e alertas gene-droga</p>
          </div>
        </div>
        {submittedPatientId && (
          <Button onClick={() => setShowNewVariant(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Registrar Variante
          </Button>
        )}
      </div>

      {/* Patient search bar */}
      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">ID do Paciente</Label>
              <Input
                placeholder="UUID do paciente..."
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <Button onClick={handleSearch} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Search className="h-4 w-4" />
              Buscar Perfil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* High-risk alert */}
      {highRiskInteractions.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            {highRiskInteractions.length} interação(ões) gene-droga de ALTO risco identificada(s) para este paciente
          </span>
        </div>
      )}

      {!submittedPatientId ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center py-16">
            <Dna className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Insira o ID do paciente para visualizar o perfil genômico</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="variants" className="text-xs data-[state=active]:bg-emerald-600">
              <Microscope className="mr-1.5 h-3.5 w-3.5" />
              Variantes Genéticas ({variants.length})
            </TabsTrigger>
            <TabsTrigger value="pgx" className="text-xs data-[state=active]:bg-emerald-600">
              <Pill className="mr-1.5 h-3.5 w-3.5" />
              Farmacogenômica ({pgx.length})
            </TabsTrigger>
            <TabsTrigger value="interactions" className="text-xs data-[state=active]:bg-emerald-600">
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              Alertas Gene-Droga
              {highRiskInteractions.length > 0 && (
                <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-red-600">{highRiskInteractions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Variantes ───────────────────────────────────────────── */}
          <TabsContent value="variants" className="space-y-4 mt-4">
            {loadingVariants ? (
              <PageLoading cards={0} showTable />
            ) : variants.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Dna className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhuma variante genética registrada para este paciente</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowNewVariant(true)}>
                    Registrar Variante
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Variantes Identificadas ({variants.length})</CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gene</TableHead>
                      <TableHead>Variante</TableHead>
                      <TableHead>Zigosidade</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Significância Clínica</TableHead>
                      <TableHead>dbSNP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v: GeneticVariant) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-emerald-400">
                            {v.gene}
                          </code>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{v.variant}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {v.zygosity === 'HOMOZIGOTO' ? 'Homozigoto' : 'Heterozigoto'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', CLASSIFICATION_CONFIG[v.classification].color)}
                          >
                            {CLASSIFICATION_CONFIG[v.classification].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-56 truncate">{v.clinicalSignificance}</TableCell>
                        <TableCell>
                          {v.dbSnpId ? (
                            <code className="text-xs text-blue-400">{v.dbSnpId}</code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: Farmacogenômica ─────────────────────────────────────── */}
          <TabsContent value="pgx" className="space-y-4 mt-4">
            {loadingPgx ? (
              <PageLoading cards={3} />
            ) : pgx.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <Pill className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhum dado farmacogenômico disponível</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {pgx.map((item: PharmacogenomicSummary) => {
                  const cfg = METABOLIZER_CONFIG[item.phenotype];
                  return (
                    <Card key={item.id} className="border-border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            <code className="text-emerald-400">{item.gene}</code>
                          </CardTitle>
                          <Badge variant="secondary" className={cn('text-xs', cfg.color)}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{cfg.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Medicamentos Afetados</p>
                          <div className="flex flex-wrap gap-1">
                            {item.affectedDrugs.map((drug) => (
                              <Badge key={drug} variant="outline" className="text-xs">{drug}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="rounded border border-border bg-background p-2 text-xs">
                          <span className="text-muted-foreground">Recomendação: </span>
                          {item.recommendation}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Alertas Gene-Droga ──────────────────────────────────── */}
          <TabsContent value="interactions" className="space-y-4 mt-4">
            {loadingInteractions ? (
              <PageLoading cards={0} showTable />
            ) : interactions.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center py-12">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhuma interação gene-droga identificada</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Interações Gene-Droga ({interactions.length})
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gene / Variante</TableHead>
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Evidência</TableHead>
                      <TableHead>Recomendação</TableHead>
                      <TableHead>Fonte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interactions.map((i: GeneDrugInteraction) => {
                      const riskCfg = RISK_CONFIG[i.riskLevel];
                      return (
                        <TableRow key={i.id}>
                          <TableCell>
                            <div>
                              <code className="text-emerald-400 text-xs">{i.gene}</code>
                              <p className="text-xs text-muted-foreground font-mono">{i.variant}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{i.drug}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs', riskCfg.color)}>
                              {riskCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{i.evidenceLevel}</TableCell>
                          <TableCell className="text-sm max-w-48 truncate">{i.recommendation}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{i.source}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ── Register Variant Dialog ────────────────────────────────────────── */}
      <Dialog open={showNewVariant} onOpenChange={setShowNewVariant}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Variante Genética</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gene *</Label>
                <Input
                  placeholder="Ex: BRCA1, CYP2D6"
                  value={variantForm.gene}
                  onChange={setField('gene')}
                  className="bg-background border-border font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Variante *</Label>
                <Input
                  placeholder="Ex: c.5266dupC"
                  value={variantForm.variant}
                  onChange={setField('variant')}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Zigosidade *</Label>
                <Select
                  value={variantForm.zygosity}
                  onValueChange={(v) => setVariantForm((p) => ({ ...p, zygosity: v as GeneticVariant['zygosity'] }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOMOZIGOTO">Homozigoto</SelectItem>
                    <SelectItem value="HETEROZIGOTO">Heterozigoto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Classificação *</Label>
                <Select
                  value={variantForm.classification}
                  onValueChange={(v) => setVariantForm((p) => ({ ...p, classification: v as GeneticVariant['classification'] }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLASSIFICATION_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Significância Clínica *</Label>
              <Input
                placeholder="Ex: Associada a risco aumentado de câncer de mama..."
                value={variantForm.clinicalSignificance}
                onChange={setField('clinicalSignificance')}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ID dbSNP</Label>
              <Input
                placeholder="Ex: rs80357906"
                value={variantForm.dbSnpId}
                onChange={setField('dbSnpId')}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewVariant(false)}>Cancelar</Button>
            <Button
              onClick={handleRegisterVariant}
              disabled={registerVariant.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {registerVariant.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
