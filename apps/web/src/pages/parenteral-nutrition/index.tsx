import { useState } from 'react';
import {
  Droplets,
  Plus,
  Calculator,
  Activity,
  AlertTriangle,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { cn } from '@/lib/utils';
import {
  useParenteralOrders,
  useCreateParenteralOrder,
  type ParenteralNutritionOrder,
  type NPTStatus,
} from '@/services/parenteral-nutrition.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<NPTStatus, { label: string; color: string }> = {
  ATIVA: { label: 'Ativa', color: 'bg-emerald-500/20 text-emerald-400' },
  SUSPENSA: { label: 'Suspensa', color: 'bg-amber-500/20 text-amber-400' },
  CONCLUIDA: { label: 'Concluída', color: 'bg-blue-500/20 text-blue-400' },
  CANCELADA: { label: 'Cancelada', color: 'bg-zinc-500/20 text-zinc-400' },
};

// Osmolarity threshold for peripheral vs central line
const OSMOLARITY_LIMIT_PERIPHERAL = 900; // mOsm/L
const OSMOLARITY_SAFE_LIMIT = 1800; // mOsm/L

// ─── NPT Calculator helpers ─────────────────────────────────────────────────

function calcOsmolarity(
  proteins: number,
  carbs: number,
  sodium: number,
  potassium: number,
  volume: number,
): number {
  if (volume <= 0) return 0;
  // Simplified formula: each g/L amino acid ≈ 10 mOsm, each g/L dextrose ≈ 5 mOsm
  // electrolytes: mEq/L * 1
  const aminoOsm = (proteins / volume) * 1000 * 10;
  const dextroseOsm = (carbs / volume) * 1000 * 5;
  const electrolyteOsm = sodium + potassium;
  return Math.round(aminoOsm + dextroseOsm + electrolyteOsm);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ParenteralNutritionPage() {
  const [activeTab, setActiveTab] = useState('active');

  // Create form state
  const [form, setForm] = useState({
    patientId: '',
    // macronutrients
    proteins: '',
    lipids: '',
    carbs: '',
    calories: '',
    // electrolytes
    sodium: '',
    potassium: '',
    calcium: '',
    magnesium: '',
    phosphorus: '',
    // infusion
    volume: '',
    infusionRate: '',
  });

  const { data: orders = [], isLoading, isError, refetch } = useParenteralOrders({ status: 'ATIVA' });
  const createOrder = useCreateParenteralOrder();

  // Live osmolarity calculation
  const estimatedOsmolarity = calcOsmolarity(
    parseFloat(form.proteins) || 0,
    parseFloat(form.carbs) || 0,
    parseFloat(form.sodium) || 0,
    parseFloat(form.potassium) || 0,
    parseFloat(form.volume) || 0,
  );

  const osmolarityOk = estimatedOsmolarity === 0 || estimatedOsmolarity <= OSMOLARITY_SAFE_LIMIT;
  const requiresCentralLine = estimatedOsmolarity > OSMOLARITY_LIMIT_PERIPHERAL;

  const handleCreate = async () => {
    if (!form.patientId || !form.volume || !form.infusionRate) {
      toast.error('Preencha os campos obrigatórios: paciente, volume e velocidade de infusão.');
      return;
    }
    try {
      await createOrder.mutateAsync({
        patientId: form.patientId,
        macronutrients: {
          proteins: parseFloat(form.proteins) || 0,
          lipids: parseFloat(form.lipids) || 0,
          carbs: parseFloat(form.carbs) || 0,
          calories: parseFloat(form.calories) || 0,
        },
        electrolytes: {
          sodium: parseFloat(form.sodium) || 0,
          potassium: parseFloat(form.potassium) || 0,
          calcium: parseFloat(form.calcium) || 0,
          magnesium: parseFloat(form.magnesium) || 0,
          phosphorus: parseFloat(form.phosphorus) || 0,
        },
        volume: parseFloat(form.volume),
        infusionRate: parseFloat(form.infusionRate),
      });
      toast.success('Prescrição de NPT criada com sucesso.');
      setActiveTab('active');
      setForm({
        patientId: '', proteins: '', lipids: '', carbs: '', calories: '',
        sodium: '', potassium: '', calcium: '', magnesium: '', phosphorus: '',
        volume: '', infusionRate: '',
      });
    } catch {
      toast.error('Erro ao criar prescrição de NPT.');
    }
  };

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Droplets className="h-6 w-6 text-emerald-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nutrição Parenteral Total</h1>
          <p className="text-sm text-muted-foreground">Cálculo automático de NPT, eletrólitos e verificação de osmolaridade</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="active" className="text-xs data-[state=active]:bg-emerald-600">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Prescrições Ativas ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="new" className="text-xs data-[state=active]:bg-emerald-600">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova NPT
          </TabsTrigger>
          <TabsTrigger value="calculations" className="text-xs data-[state=active]:bg-emerald-600">
            <Calculator className="mr-1.5 h-3.5 w-3.5" />
            Cálculos de Referência
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Prescrições Ativas ─────────────────────────────────────── */}
        <TabsContent value="active" className="space-y-4 mt-4">
          {isLoading ? (
            <PageLoading cards={2} showTable />
          ) : orders.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Droplets className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma prescrição de NPT ativa</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab('new')}>
                  Nova Prescrição
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order: ParenteralNutritionOrder) => (
                <Card key={order.id} className="border-border bg-card">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{order.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Prescrito por: {order.prescribedBy} • {new Date(order.prescribedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={cn('text-xs', STATUS_CONFIG[order.status].color)}>
                          {STATUS_CONFIG[order.status].label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            order.osmolarity > OSMOLARITY_SAFE_LIMIT
                              ? 'border-red-500 text-red-400'
                              : order.osmolarity > OSMOLARITY_LIMIT_PERIPHERAL
                                ? 'border-amber-500 text-amber-400'
                                : 'border-emerald-500 text-emerald-400',
                          )}
                        >
                          {order.osmolarity} mOsm/L
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded border border-border bg-background p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Macronutrientes</p>
                        <p className="text-xs">Prot: <span className="font-medium">{order.macronutrients.proteins}g</span></p>
                        <p className="text-xs">Lip: <span className="font-medium">{order.macronutrients.lipids}g</span></p>
                        <p className="text-xs">CHO: <span className="font-medium">{order.macronutrients.carbs}g</span></p>
                        <p className="text-xs text-emerald-400 font-semibold mt-1">{order.macronutrients.calories} kcal</p>
                      </div>
                      <div className="rounded border border-border bg-background p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Eletrólitos</p>
                        <p className="text-xs">Na: <span className="font-medium">{order.electrolytes.sodium} mEq</span></p>
                        <p className="text-xs">K: <span className="font-medium">{order.electrolytes.potassium} mEq</span></p>
                        <p className="text-xs">Ca: <span className="font-medium">{order.electrolytes.calcium} mEq</span></p>
                        <p className="text-xs">Mg: <span className="font-medium">{order.electrolytes.magnesium} mEq</span></p>
                      </div>
                      <div className="rounded border border-border bg-background p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Infusão</p>
                        <p className="text-xs">Volume: <span className="font-medium">{order.volume} mL</span></p>
                        <p className="text-xs">Velocidade: <span className="font-medium">{order.infusionRate} mL/h</span></p>
                        <p className="text-xs">Duração: <span className="font-medium">~{Math.round(order.volume / order.infusionRate)}h</span></p>
                      </div>
                      <div className="rounded border border-border bg-background p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Estabilidade</p>
                        <p className="text-lg font-bold text-emerald-500">{order.stability}h</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.osmolarity > OSMOLARITY_LIMIT_PERIPHERAL
                            ? 'Acesso central obrigatório'
                            : 'Pode usar acesso periférico'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Nova NPT ───────────────────────────────────────────────── */}
        <TabsContent value="new" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Form */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Identificação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    <Label className="text-xs">ID do Paciente *</Label>
                    <Input
                      placeholder="UUID do paciente"
                      value={form.patientId}
                      onChange={setField('patientId')}
                      className="bg-background border-border font-mono text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Macronutrientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Proteínas (g)', field: 'proteins' },
                      { label: 'Lipídeos (g)', field: 'lipids' },
                      { label: 'Carboidratos (g)', field: 'carbs' },
                      { label: 'Calorias (kcal)', field: 'calories' },
                    ].map(({ label, field }) => (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={form[field as keyof typeof form]}
                          onChange={setField(field)}
                          className="bg-background border-border"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Eletrólitos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      { label: 'Na (mEq)', field: 'sodium' },
                      { label: 'K (mEq)', field: 'potassium' },
                      { label: 'Ca (mEq)', field: 'calcium' },
                      { label: 'Mg (mEq)', field: 'magnesium' },
                      { label: 'P (mmol)', field: 'phosphorus' },
                    ].map(({ label, field }) => (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={form[field as keyof typeof form]}
                          onChange={setField(field)}
                          className="bg-background border-border"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Parâmetros de Infusão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Volume Total (mL) *</Label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={form.volume}
                        onChange={setField('volume')}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Velocidade de Infusão (mL/h) *</Label>
                      <Input
                        type="number"
                        placeholder="42"
                        value={form.infusionRate}
                        onChange={setField('infusionRate')}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveTab('active')}>Cancelar</Button>
                <Button
                  onClick={handleCreate}
                  disabled={createOrder.isPending || !osmolarityOk}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {createOrder.isPending ? 'Salvando...' : 'Prescrever NPT'}
                </Button>
              </div>
            </div>

            {/* Osmolarity panel */}
            <div className="space-y-4">
              <Card className={cn(
                'border sticky top-4',
                estimatedOsmolarity === 0 ? 'border-border' :
                  !osmolarityOk ? 'border-red-500 bg-red-500/5' :
                    requiresCentralLine ? 'border-amber-500 bg-amber-500/5' :
                      'border-emerald-500 bg-emerald-500/5',
              )}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Osmolaridade Estimada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <p className={cn(
                      'text-4xl font-bold',
                      estimatedOsmolarity === 0 ? 'text-muted-foreground' :
                        !osmolarityOk ? 'text-red-400' :
                          requiresCentralLine ? 'text-amber-400' :
                            'text-emerald-400',
                    )}>
                      {estimatedOsmolarity}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">mOsm/L</p>
                  </div>

                  {estimatedOsmolarity > 0 && (
                    <div className="space-y-2 text-xs">
                      <div className={cn(
                        'flex items-center gap-2 rounded px-2 py-1.5',
                        estimatedOsmolarity <= OSMOLARITY_LIMIT_PERIPHERAL
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-muted text-muted-foreground line-through',
                      )}>
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        Via periférica ≤ {OSMOLARITY_LIMIT_PERIPHERAL} mOsm/L
                      </div>
                      <div className={cn(
                        'flex items-center gap-2 rounded px-2 py-1.5',
                        requiresCentralLine && osmolarityOk
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-muted text-muted-foreground',
                      )}>
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        Via central até {OSMOLARITY_SAFE_LIMIT} mOsm/L
                      </div>
                      {!osmolarityOk && (
                        <div className="flex items-center gap-2 rounded px-2 py-1.5 bg-red-500/10 text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Osmolaridade excede limite seguro!
                        </div>
                      )}
                      {requiresCentralLine && osmolarityOk && (
                        <p className="text-amber-400 text-center">
                          Acesso central obrigatório
                        </p>
                      )}
                    </div>
                  )}

                  {form.volume && form.infusionRate && (
                    <div className="border-t border-border pt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duração prevista</span>
                        <span className="font-medium">
                          {Math.round(parseFloat(form.volume) / parseFloat(form.infusionRate))}h
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Cálculos de Referência ──────────────────────────────────── */}
        <TabsContent value="calculations" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Necessidades Calóricas por Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Perfil</TableHead>
                      <TableHead className="text-right">kcal/kg/dia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { profile: 'Normal', range: '20–25' },
                      { profile: 'Pós-operatório', range: '25–30' },
                      { profile: 'Hipercatabólico', range: '30–35' },
                      { profile: 'Queimados graves', range: '35–45' },
                      { profile: 'Obeso (BMI > 30)', range: '11–14 kcal/kg real' },
                    ].map((row) => (
                      <TableRow key={row.profile}>
                        <TableCell className="text-sm">{row.profile}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-400">{row.range}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Proteínas por Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Perfil</TableHead>
                      <TableHead className="text-right">g/kg/dia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { profile: 'Manutenção', range: '0.8–1.0' },
                      { profile: 'Estresse moderado', range: '1.2–1.5' },
                      { profile: 'Estresse grave / UTI', range: '1.5–2.0' },
                      { profile: 'Queimados', range: '1.5–2.5' },
                      { profile: 'Insuficiência renal aguda', range: '1.2–1.5' },
                    ].map((row) => (
                      <TableRow key={row.profile}>
                        <TableCell className="text-sm">{row.profile}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-blue-400">{row.range}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border bg-card md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Limites de Osmolaridade por Via de Acesso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="text-2xl font-bold text-emerald-400">≤ 900</p>
                    <p className="text-xs text-muted-foreground mt-1">mOsm/L</p>
                    <p className="text-sm font-medium mt-2">Via Periférica</p>
                    <p className="text-xs text-muted-foreground">Segura, sem risco de tromboflebite</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-2xl font-bold text-amber-400">901–1800</p>
                    <p className="text-xs text-muted-foreground mt-1">mOsm/L</p>
                    <p className="text-sm font-medium mt-2">Via Central</p>
                    <p className="text-xs text-muted-foreground">CVC obrigatório (PICC, subclávia, jugular)</p>
                  </div>
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                    <p className="text-2xl font-bold text-red-400">&gt; 1800</p>
                    <p className="text-xs text-muted-foreground mt-1">mOsm/L</p>
                    <p className="text-sm font-medium mt-2">Contraindicado</p>
                    <p className="text-xs text-muted-foreground">Risco de lesão vascular grave</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
