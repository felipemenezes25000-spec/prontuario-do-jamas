import { useState } from 'react';
import {
  Cpu,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Eye,
  AlertTriangle,
  Info,
  ShieldAlert,
  Filter,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useCdsRules,
  useCdsAlertPreview,
  useCreateCdsRule,
  useToggleCdsRule,
  useDeleteCdsRule,
} from '@/services/cds-engine.service';
import type { CdsRule, RuleCategory, RuleSeverity } from '@/services/cds-engine.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<RuleCategory, { label: string; className: string }> = {
  MEDICATION: { label: 'Medicação', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  LAB: { label: 'Laboratório', className: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  CLINICAL: { label: 'Clínico', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
  PREVENTIVE: { label: 'Preventivo', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
};

const SEVERITY_CONFIG: Record<RuleSeverity, { label: string; className: string; icon: typeof Info }> = {
  INFO: { label: 'Informação', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Info },
  WARNING: { label: 'Aviso', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: AlertTriangle },
  CRITICAL: { label: 'Crítico', className: 'bg-red-500/20 text-red-400 border-red-500/50', icon: ShieldAlert },
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  ALERT: 'Alerta', BLOCK: 'Bloquear', SUGGEST: 'Sugestão', AUTO_ORDER: 'Pedido Automático',
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  ALERT: 'text-yellow-400', BLOCK: 'text-red-400', SUGGEST: 'text-blue-400', AUTO_ORDER: 'text-emerald-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── New Rule Dialog ─────────────────────────────────────────────────────────

function NewRuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateCdsRule();
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'CLINICAL' as RuleCategory,
    severity: 'WARNING' as RuleSeverity,
    conditionExpression: '',
    actionType: 'ALERT',
    actionMessage: '',
  });

  const handleSubmit = () => {
    if (!form.name || !form.description || !form.conditionExpression || !form.actionMessage) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    create.mutate(form, {
      onSuccess: () => {
        toast.success('Regra criada com sucesso!');
        onClose();
        setForm({ name: '', description: '', category: 'CLINICAL', severity: 'WARNING', conditionExpression: '', actionType: 'ALERT', actionMessage: '' });
      },
      onError: () => toast.error('Erro ao criar regra.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Regra CDS</DialogTitle>
          <DialogDescription>Criar regra de suporte à decisão clínica</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Nome da Regra *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ex: Alerta de Interação Medicamentosa" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva quando e como esta regra deve ser ativada" className="bg-zinc-950 border-zinc-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as RuleCategory })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {(Object.entries(CATEGORY_CONFIG) as [RuleCategory, { label: string }][]).map(([v, { label }]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Severidade</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as RuleSeverity })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {(Object.entries(SEVERITY_CONFIG) as [RuleSeverity, { label: string }][]).map(([v, { label }]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Tipo de Ação</Label>
            <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v })}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {Object.entries(ACTION_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Expressão de Condição *</Label>
            <Input value={form.conditionExpression} onChange={(e) => setForm({ ...form, conditionExpression: e.target.value })}
              placeholder="ex: patient.creatinine > 2.0 AND order.medication == 'metformin'"
              className="bg-zinc-950 border-zinc-700 font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label>Mensagem da Ação *</Label>
            <Input value={form.actionMessage} onChange={(e) => setForm({ ...form, actionMessage: e.target.value })}
              placeholder="Mensagem exibida ao profissional quando a regra for ativada"
              className="bg-zinc-950 border-zinc-700" />
          </div>
          {form.actionType === 'BLOCK' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">Regras de bloqueio impedem a ação do usuário até que o alerta seja reconhecido.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? 'Criando...' : 'Criar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview Panel ───────────────────────────────────────────────────────────

function PreviewPanel({ ruleId }: { ruleId: string }) {
  const { data: preview, isLoading } = useCdsAlertPreview(ruleId);
  const severityCfg = preview ? SEVERITY_CONFIG[preview.severity] : null;
  const SeverityIcon = severityCfg?.icon ?? Info;

  if (isLoading) return <p className="text-xs text-zinc-500 text-center py-2">Carregando...</p>;
  if (!preview) return <p className="text-xs text-zinc-500 text-center py-2">Nenhum dado de preview disponível</p>;

  return (
    <div className={cn('mt-2 rounded-lg border p-3 space-y-2', severityCfg?.className.replace('text-', 'border-').replace('bg-', ''))}>
      <div className="flex items-center gap-2">
        <SeverityIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{preview.ruleName}</span>
        <Badge variant="outline" className={cn('ml-auto text-xs', severityCfg?.className)}>
          {severityCfg?.label}
        </Badge>
      </div>
      <p className="text-sm text-zinc-300">{preview.message}</p>
      <p className="text-xs text-zinc-500">{preview.affectedPatients} paciente(s) afetado(s) atualmente</p>
    </div>
  );
}

// ─── Rule Row ────────────────────────────────────────────────────────────────

function RuleRow({ rule }: { rule: CdsRule }) {
  const [showPreview, setShowPreview] = useState(false);
  const toggle = useToggleCdsRule();
  const deleteRule = useDeleteCdsRule();
  const catCfg = CATEGORY_CONFIG[rule.category];
  const sevCfg = SEVERITY_CONFIG[rule.severity];
  const SevIcon = sevCfg.icon;

  const handleToggle = () => {
    toggle.mutate({ id: rule.id, active: !rule.active }, {
      onSuccess: () => toast.success(`Regra ${rule.active ? 'desativada' : 'ativada'}.`),
      onError: () => toast.error('Erro ao alterar status da regra.'),
    });
  };

  const handleDelete = () => {
    if (!confirm(`Excluir a regra "${rule.name}"? Esta ação não pode ser desfeita.`)) return;
    deleteRule.mutate(rule.id, {
      onSuccess: () => toast.success('Regra excluída.'),
      onError: () => toast.error('Erro ao excluir regra.'),
    });
  };

  return (
    <>
      <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
        <TableCell>
          <div className="flex items-center gap-2">
            <SevIcon className={cn('h-4 w-4 shrink-0', sevCfg.className.split(' ').find((c) => c.startsWith('text-')))} />
            <div>
              <p className="font-medium text-sm">{rule.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-xs truncate">{rule.description}</p>
            </div>
          </div>
        </TableCell>
        <TableCell><Badge variant="outline" className={catCfg.className}>{catCfg.label}</Badge></TableCell>
        <TableCell><Badge variant="outline" className={sevCfg.className}>{sevCfg.label}</Badge></TableCell>
        <TableCell>
          <span className={cn('text-sm font-medium', ACTION_TYPE_COLORS[rule.actionType])}>
            {ACTION_TYPE_LABELS[rule.actionType] ?? rule.actionType}
          </span>
        </TableCell>
        <TableCell className="text-zinc-400 text-sm">{rule.triggerCount.toLocaleString('pt-BR')}</TableCell>
        <TableCell className="text-zinc-400 text-sm">{rule.lastTriggeredAt ? formatDate(rule.lastTriggeredAt) : '—'}</TableCell>
        <TableCell>
          <Badge variant="outline" className={rule.active
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
            : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50'}>
            {rule.active ? 'Ativa' : 'Inativa'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200"
              onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-400"
              onClick={handleToggle} disabled={toggle.isPending}>
              {rule.active
                ? <ToggleRight className="h-4 w-4 text-emerald-400" />
                : <ToggleLeft className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
              onClick={handleDelete} disabled={deleteRule.isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {showPreview && (
        <TableRow className="border-zinc-800">
          <TableCell colSpan={8} className="py-0 pb-3 px-4">
            <PreviewPanel ruleId={rule.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CdsEnginePage() {
  const [newRuleDialog, setNewRuleDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const { data: rules = [], isLoading } = useCdsRules(
    Object.fromEntries(
      Object.entries({ category: categoryFilter, active: activeFilter !== '' ? activeFilter === 'true' : undefined })
        .filter(([, v]) => v !== undefined && v !== ''),
    ),
  );

  const activeCount = rules.filter((r) => r.active).length;
  const criticalCount = rules.filter((r) => r.severity === 'CRITICAL' && r.active).length;
  const totalTriggers = rules.reduce((sum, r) => sum + r.triggerCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold">Motor de Decisão Clínica</h1>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/50">CDS Engine</Badge>
        </div>
        <Button onClick={() => setNewRuleDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Nova Regra
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <div><p className="text-xs text-zinc-400">Regras Ativas</p><p className="text-2xl font-bold text-emerald-400">{activeCount}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <div><p className="text-xs text-zinc-400">Críticas Ativas</p><p className="text-2xl font-bold text-red-400">{criticalCount}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-yellow-400" />
            <div><p className="text-xs text-zinc-400">Total Disparos</p><p className="text-2xl font-bold">{totalTriggers.toLocaleString('pt-BR')}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Filter className="h-5 w-5 text-blue-400" />
            <div><p className="text-xs text-zinc-400">Total de Regras</p><p className="text-2xl font-bold">{rules.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="rules">Regras Ativas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        {/* Regras Ativas */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="">Todas as categorias</SelectItem>
                {(Object.entries(CATEGORY_CONFIG) as [RuleCategory, { label: string }][]).map(([v, { label }]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700"><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="">Todos os status</SelectItem>
                <SelectItem value="true">Ativas</SelectItem>
                <SelectItem value="false">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {rules.length === 0 ? (
                <div className="py-10 text-center">
                  <Cpu className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500">Nenhuma regra encontrada</p>
                  <Button variant="outline" className="border-zinc-700 mt-4" onClick={() => setNewRuleDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Criar primeira regra
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Regra</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Disparos</TableHead>
                      <TableHead>Último Disparo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => <RuleRow key={rule.id} rule={rule} />)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alerts" className="mt-4">
          <div className="space-y-3">
            {rules.filter((r) => r.active).length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-10 text-center text-zinc-500">Nenhuma regra ativa para exibir alertas</CardContent>
              </Card>
            ) : (
              rules.filter((r) => r.active).map((rule) => {
                const sevCfg = SEVERITY_CONFIG[rule.severity];
                const SevIcon = sevCfg.icon;
                return (
                  <Card key={rule.id} className={cn('bg-zinc-900 border-zinc-800',
                    rule.severity === 'CRITICAL' && 'border-red-500/30',
                    rule.severity === 'WARNING' && 'border-yellow-500/20')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <SevIcon className={cn('h-5 w-5 shrink-0 mt-0.5', sevCfg.className.split(' ').find((c) => c.startsWith('text-')))} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{rule.name}</p>
                              <Badge variant="outline" className={sevCfg.className}>{sevCfg.label}</Badge>
                              <Badge variant="outline" className={CATEGORY_CONFIG[rule.category].className}>
                                {CATEGORY_CONFIG[rule.category].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-zinc-400">{rule.actionMessage}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                              {ACTION_TYPE_LABELS[rule.actionType]} · {rule.triggerCount.toLocaleString('pt-BR')} disparos
                              {rule.lastTriggeredAt && ` · Último: ${formatDate(rule.lastTriggeredAt)}`}
                            </p>
                          </div>
                        </div>
                        <PreviewPanel ruleId={rule.id} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Configuração */}
        <TabsContent value="config" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Categorias de Regras</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(Object.entries(CATEGORY_CONFIG) as [RuleCategory, { label: string; className: string }][]).map(([cat, { label, className }]) => {
                  const count = rules.filter((r) => r.category === cat).length;
                  const activeInCat = rules.filter((r) => r.category === cat && r.active).length;
                  return (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={className}>{label}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{activeInCat} ativas</p>
                        <p className="text-xs text-zinc-500">{count} total</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Tipos de Ação</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(ACTION_TYPE_LABELS).map(([type, label]) => {
                  const count = rules.filter((r) => r.actionType === type).length;
                  const descriptions: Record<string, string> = {
                    ALERT: 'Exibe um aviso informativo ao profissional.',
                    BLOCK: 'Impede a ação até que o alerta seja resolvido.',
                    SUGGEST: 'Sugere uma alternativa ou melhor prática.',
                    AUTO_ORDER: 'Cria automaticamente um pedido clínico.',
                  };
                  return (
                    <div key={type} className="p-3 rounded-lg bg-zinc-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('font-medium text-sm', ACTION_TYPE_COLORS[type])}>{label}</span>
                        <Badge variant="outline" className="bg-zinc-700 text-zinc-300 border-zinc-600">{count} regras</Badge>
                      </div>
                      <p className="text-xs text-zinc-500">{descriptions[type]}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
              <CardHeader><CardTitle className="text-base">Sobre o Motor CDS</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-400">
                  O Motor de Decisão Clínica (CDS) avalia regras configuráveis em tempo real durante o atendimento,
                  gerando alertas, sugestões e ordens automáticas com base nas condições clínicas do paciente.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Interações Medicamentosas', icon: ShieldAlert, color: 'text-red-400' },
                    { label: 'Alertas de Laboratório', icon: AlertTriangle, color: 'text-yellow-400' },
                    { label: 'Boas Práticas Clínicas', icon: Info, color: 'text-blue-400' },
                    { label: 'Prevenção e Rastreamento', icon: Zap, color: 'text-emerald-400' },
                  ].map(({ label, icon: Icon, color }) => (
                    <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800 text-center">
                      <Icon className={cn('h-6 w-6', color)} />
                      <p className="text-xs text-zinc-400">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <NewRuleDialog open={newRuleDialog} onClose={() => setNewRuleDialog(false)} />
    </div>
  );
}
