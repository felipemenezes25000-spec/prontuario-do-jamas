import { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  BarChart3,
  Search,
  Brain,
  Pill,
  Fingerprint,
  Stethoscope,
  Cog,
  Target,
  ClipboardList,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  useSafetyIndicators,
  useAllergyAlerts,
  useReportNearMiss,
  useRecordTimeout,
  useVerifyIdentification,
  usePredictReadmission,
  useDetectMedicationErrors,
  useCreateFMEA,
} from '@/services/safety-enhanced.service';
import type {
  SafetyIndicator,
  FMEAResult,
} from '@/services/safety-enhanced.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEMO_PATIENT_ID = 'demo-patient-1';

const RISK_COLOR: Record<string, string> = {
  LOW: 'bg-green-500/20 text-green-400 border-green-500/50',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  HIGH: 'bg-red-500/20 text-red-400 border-red-500/50',
  CRITICAL: 'bg-red-700/30 text-red-300 border-red-700/50',
};

const NCC_MERP_CATEGORIES = [
  { code: 'A', label: 'Circunstancias que podem causar erro', color: 'text-blue-400' },
  { code: 'B', label: 'Erro ocorreu, nao atingiu o paciente', color: 'text-blue-300' },
  { code: 'C', label: 'Erro atingiu o paciente, sem dano', color: 'text-green-400' },
  { code: 'D', label: 'Erro requereu monitoramento', color: 'text-yellow-400' },
  { code: 'E', label: 'Contribuiu para dano temporario, necessitou intervencao', color: 'text-yellow-300' },
  { code: 'F', label: 'Contribuiu para dano temporario, hospitalizacao', color: 'text-orange-400' },
  { code: 'G', label: 'Contribuiu para dano permanente', color: 'text-red-400' },
  { code: 'H', label: 'Necessitou suporte de vida', color: 'text-red-500' },
  { code: 'I', label: 'Contribuiu para o obito', color: 'text-red-600' },
];

function RiskBadge({ level }: { level: string }) {
  const cls = RISK_COLOR[level.toUpperCase()] ?? RISK_COLOR.LOW;
  return (
    <Badge variant="outline" className={cls}>
      {level}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 1 — Patient Identification Verification
// ═══════════════════════════════════════════════════════════════════════════

function IdentificationTab() {
  const verify = useVerifyIdentification();
  const [form, setForm] = useState({
    patientId: DEMO_PATIENT_ID,
    procedureType: 'MEDICATION',
    identifier1Type: 'NAME',
    identifier1Value: '',
    identifier2Type: 'MRN',
    identifier2Value: '',
    verified: false,
  });

  const handleSubmit = () => {
    if (!form.identifier1Value || !form.identifier2Value) {
      toast.error('Preencha ambos os identificadores');
      return;
    }
    verify.mutate(
      { ...form, verified: true },
      {
        onSuccess: () => toast.success('Identificacao verificada com sucesso'),
        onError: () => toast.error('Erro ao verificar identificacao'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fingerprint className="h-5 w-5 text-emerald-400" />
            Verificacao de Identificacao Positiva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Protocolo de identificacao segura do paciente — minimo 2 identificadores antes de qualquer procedimento.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Procedimento</Label>
              <Select
                value={form.procedureType}
                onValueChange={(v) => setForm((p) => ({ ...p, procedureType: v }))}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICATION">Medicacao</SelectItem>
                  <SelectItem value="BLOOD_TRANSFUSION">Hemotransfusao</SelectItem>
                  <SelectItem value="SURGERY">Cirurgia</SelectItem>
                  <SelectItem value="EXAM">Exame</SelectItem>
                  <SelectItem value="PROCEDURE">Procedimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ID do Paciente</Label>
              <Input
                className="border-zinc-700 bg-zinc-800"
                value={form.patientId}
                onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Identificador 1</Label>
              <Select
                value={form.identifier1Type}
                onValueChange={(v) => setForm((p) => ({ ...p, identifier1Type: v }))}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NAME">Nome Completo</SelectItem>
                  <SelectItem value="DOB">Data de Nascimento</SelectItem>
                  <SelectItem value="MRN">Prontuario</SelectItem>
                  <SelectItem value="CPF">CPF</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Valor do identificador 1"
                value={form.identifier1Value}
                onChange={(e) => setForm((p) => ({ ...p, identifier1Value: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Identificador 2</Label>
              <Select
                value={form.identifier2Type}
                onValueChange={(v) => setForm((p) => ({ ...p, identifier2Type: v }))}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NAME">Nome Completo</SelectItem>
                  <SelectItem value="DOB">Data de Nascimento</SelectItem>
                  <SelectItem value="MRN">Prontuario</SelectItem>
                  <SelectItem value="CPF">CPF</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Valor do identificador 2"
                value={form.identifier2Value}
                onChange={(e) => setForm((p) => ({ ...p, identifier2Value: e.target.value }))}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={verify.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {verify.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Confirmar Identificacao
          </Button>

          {verify.isSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Identificacao positiva registrada com sucesso
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 2 — Allergy Verification
// ═══════════════════════════════════════════════════════════════════════════

function AllergyTab() {
  const [patientId, setPatientId] = useState(DEMO_PATIENT_ID);
  const [searchId, setSearchId] = useState(DEMO_PATIENT_ID);
  const { data, isLoading, isError } = useAllergyAlerts(searchId);

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Verificacao de Alergias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              className="border-zinc-700 bg-zinc-800"
              placeholder="ID do Paciente"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
            <Button
              onClick={() => setSearchId(patientId)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Search className="mr-2 h-4 w-4" />
              Verificar
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando alertas de alergia...
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              Erro ao carregar alertas de alergia
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">Paciente:</span>
                <span className="font-medium text-zinc-100">{data.patientName}</span>
                <Badge
                  variant="outline"
                  className={
                    data.hasAllergies
                      ? 'bg-red-500/20 text-red-400 border-red-500/50'
                      : 'bg-green-500/20 text-green-400 border-green-500/50'
                  }
                >
                  {data.hasAllergies ? 'Alergias Registradas' : 'Sem Alergias'}
                </Badge>
              </div>

              {data.hasAllergies && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Nivel de Alerta:</span>
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                      {data.alertLevel}
                    </Badge>
                    <span className="text-sm text-zinc-400">Pulseira:</span>
                    <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
                      {data.wristbandColor}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Alergias:</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {data.allergies.map((a) => (
                        <Badge key={a} variant="outline" className="bg-red-500/10 text-red-300 border-red-500/30">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {data.prescriptionPopup && (
                    <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-300">
                      <AlertTriangle className="mr-2 inline h-4 w-4" />
                      Pop-up de alerta ativo: toda prescricao exigira confirmacao de alergia
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 3 — Root Cause Analysis (RCA)
// ═══════════════════════════════════════════════════════════════════════════

function RcaTab() {
  const nearMiss = useReportNearMiss();
  const [form, setForm] = useState({
    description: '',
    location: '',
    interceptedBy: '',
    howIntercepted: '',
    potentialConsequence: '',
    patientId: '',
    anonymous: false,
  });

  const handleSubmit = () => {
    if (!form.description || !form.howIntercepted || !form.potentialConsequence) {
      toast.error('Preencha os campos obrigatorios');
      return;
    }
    nearMiss.mutate(form, {
      onSuccess: () => {
        toast.success('Near-miss reportado com sucesso');
        setForm({ description: '', location: '', interceptedBy: '', howIntercepted: '', potentialConsequence: '', patientId: '', anonymous: false });
      },
      onError: () => toast.error('Erro ao reportar near-miss'),
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-blue-400" />
            Analise de Causa Raiz (RCA) — Reporte de Near-Miss
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Registre quase-erros (near-miss) para analise de causa raiz e prevencao de incidentes futuros.
          </p>

          <div className="space-y-2">
            <Label>Descricao do Evento *</Label>
            <Textarea
              className="border-zinc-700 bg-zinc-800"
              rows={3}
              placeholder="Descreva o que aconteceu..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Local</Label>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Ex: UTI, Enfermaria 3B"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Interceptado por</Label>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Nome do profissional"
                value={form.interceptedBy}
                onChange={(e) => setForm((p) => ({ ...p, interceptedBy: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Como foi interceptado *</Label>
            <Textarea
              className="border-zinc-700 bg-zinc-800"
              rows={2}
              placeholder="Descreva como o erro foi detectado..."
              value={form.howIntercepted}
              onChange={(e) => setForm((p) => ({ ...p, howIntercepted: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Consequencia Potencial *</Label>
            <Textarea
              className="border-zinc-700 bg-zinc-800"
              rows={2}
              placeholder="O que poderia ter acontecido..."
              value={form.potentialConsequence}
              onChange={(e) => setForm((p) => ({ ...p, potentialConsequence: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={form.anonymous}
                onChange={(e) => setForm((p) => ({ ...p, anonymous: e.target.checked }))}
                className="rounded border-zinc-700 bg-zinc-800"
              />
              <Label htmlFor="anonymous" className="text-sm text-zinc-400">
                Reporte anonimo
              </Label>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={nearMiss.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {nearMiss.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ClipboardList className="mr-2 h-4 w-4" />
            )}
            Registrar Near-Miss
          </Button>

          {nearMiss.isSuccess && nearMiss.data && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-400">
                Near-miss registrado — ID: {nearMiss.data.id} | Status: {nearMiss.data.status}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 4 — NCC MERP Classification
// ═══════════════════════════════════════════════════════════════════════════

function NccMerpTab() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-purple-400" />
            Classificacao NCC MERP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            National Coordinating Council for Medication Error Reporting and Prevention — Taxonomia de classificacao de erros de medicacao.
          </p>

          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Categoria</TableHead>
                <TableHead className="text-zinc-400">Descricao</TableHead>
                <TableHead className="text-zinc-400">Selecionar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NCC_MERP_CATEGORIES.map((cat) => (
                <TableRow
                  key={cat.code}
                  className={cn(
                    'border-zinc-800 cursor-pointer transition-colors',
                    selected === cat.code ? 'bg-zinc-800' : 'hover:bg-zinc-800/50',
                  )}
                  onClick={() => setSelected(cat.code)}
                >
                  <TableCell>
                    <span className={cn('text-lg font-bold', cat.color)}>{cat.code}</span>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-300">{cat.label}</TableCell>
                  <TableCell>
                    {selected === cat.code ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-zinc-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {selected && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="text-sm text-zinc-300">
                <strong>Categoria Selecionada:</strong>{' '}
                <span className={NCC_MERP_CATEGORIES.find((c) => c.code === selected)?.color}>
                  {selected}
                </span>{' '}
                — {NCC_MERP_CATEGORIES.find((c) => c.code === selected)?.label}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Utilize esta classificacao ao registrar incidentes de medicacao para padronizar a gravidade.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 5 — Medical Device Tracking
// ═══════════════════════════════════════════════════════════════════════════

function DeviceTrackingTab() {
  const timeout = useRecordTimeout();
  const [form, setForm] = useState({
    patientId: DEMO_PATIENT_ID,
    procedureName: '',
    procedureType: 'SURGERY',
    teamMembers: '',
    site: '',
    laterality: '',
    checklist: [
      { item: 'Identificacao do paciente confirmada', confirmed: false },
      { item: 'Dispositivo verificado e dentro da validade', confirmed: false },
      { item: 'Rastreabilidade do dispositivo registrada', confirmed: false },
      { item: 'Consentimento informado obtido', confirmed: false },
      { item: 'Equipe confirma procedimento e lateralidade', confirmed: false },
    ],
  });

  const toggleCheck = (idx: number) => {
    setForm((p) => ({
      ...p,
      checklist: p.checklist.map((c, i) => (i === idx ? { ...c, confirmed: !c.confirmed } : c)),
    }));
  };

  const confirmedCount = form.checklist.filter((c) => c.confirmed).length;
  const allConfirmed = confirmedCount === form.checklist.length;

  const handleSubmit = () => {
    if (!form.procedureName) {
      toast.error('Informe o nome do procedimento');
      return;
    }
    if (!allConfirmed) {
      toast.error('Confirme todos os itens do checklist');
      return;
    }
    timeout.mutate(
      {
        patientId: form.patientId,
        procedureName: form.procedureName,
        procedureType: form.procedureType,
        teamMembers: form.teamMembers.split(',').map((s) => s.trim()).filter(Boolean),
        site: form.site || undefined,
        laterality: form.laterality || undefined,
        checklist: form.checklist,
      },
      {
        onSuccess: () => toast.success('Timeout cirurgico registrado com sucesso'),
        onError: () => toast.error('Erro ao registrar timeout'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cog className="h-5 w-5 text-cyan-400" />
            Rastreamento de Dispositivos Medicos / Timeout Cirurgico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Procedimento *</Label>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Nome do procedimento"
                value={form.procedureName}
                onChange={(e) => setForm((p) => ({ ...p, procedureName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.procedureType}
                onValueChange={(v) => setForm((p) => ({ ...p, procedureType: v }))}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SURGERY">Cirurgia</SelectItem>
                  <SelectItem value="INVASIVE_PROCEDURE">Procedimento Invasivo</SelectItem>
                  <SelectItem value="IMPLANT">Implante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Equipe (separado por virgula)</Label>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Dr. Silva, Enf. Costa"
                value={form.teamMembers}
                onChange={(e) => setForm((p) => ({ ...p, teamMembers: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Sitio</Label>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Ex: Joelho"
                value={form.site}
                onChange={(e) => setForm((p) => ({ ...p, site: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Lateralidade</Label>
              <Select
                value={form.laterality}
                onValueChange={(v) => setForm((p) => ({ ...p, laterality: v }))}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEFT">Esquerdo</SelectItem>
                  <SelectItem value="RIGHT">Direito</SelectItem>
                  <SelectItem value="BILATERAL">Bilateral</SelectItem>
                  <SelectItem value="NA">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Checklist de Seguranca ({confirmedCount}/{form.checklist.length})</Label>
            <Progress value={(confirmedCount / form.checklist.length) * 100} className="mb-3 h-2" />
            <div className="space-y-2">
              {form.checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    item.confirmed
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-750',
                  )}
                  onClick={() => toggleCheck(idx)}
                >
                  {item.confirmed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-zinc-600 shrink-0" />
                  )}
                  <span className="text-sm text-zinc-300">{item.item}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={timeout.isPending || !allConfirmed}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {timeout.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Registrar Timeout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 6 — Safety Dashboard with KPIs
// ═══════════════════════════════════════════════════════════════════════════

function DashboardTab() {
  const { data, isLoading, isError } = useSafetyIndicators();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 p-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando indicadores de seguranca...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Erro ao carregar dashboard de seguranca
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Periodo</div>
            <div className="text-2xl font-bold text-zinc-100">{data.period}</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Pacientes-Dia (Est.)</div>
            <div className="text-2xl font-bold text-emerald-400">{data.estimatedPatientDays.toLocaleString('pt-BR')}</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Total de Incidentes</div>
            <div className="text-2xl font-bold text-orange-400">{data.totalIncidents}</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Indicadores</div>
            <div className="text-2xl font-bold text-blue-400">{data.indicators.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Indicadores de Seguranca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Indicador</TableHead>
                <TableHead className="text-zinc-400">Valor</TableHead>
                <TableHead className="text-zinc-400">Unidade</TableHead>
                <TableHead className="text-zinc-400">Contagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.indicators.map((ind: SafetyIndicator) => (
                <TableRow key={ind.name} className="border-zinc-800">
                  <TableCell className="font-medium text-zinc-200">{ind.name}</TableCell>
                  <TableCell>
                    <span className="font-mono text-emerald-400">{ind.value.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="text-zinc-400">{ind.unit}</TableCell>
                  <TableCell className="text-zinc-400">{ind.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 7 — TEV Risk Assessment
// ═══════════════════════════════════════════════════════════════════════════

function TevTab() {
  const [score, setScore] = useState(0);
  const [factors, setFactors] = useState([
    { label: 'Cirurgia recente (< 30 dias)', points: 2, checked: false },
    { label: 'Imobilizacao prolongada', points: 2, checked: false },
    { label: 'Cancer ativo', points: 3, checked: false },
    { label: 'Historia previa de TEV', points: 3, checked: false },
    { label: 'Idade > 60 anos', points: 1, checked: false },
    { label: 'Obesidade (IMC > 30)', points: 1, checked: false },
    { label: 'Uso de estrogenos/contraceptivos', points: 1, checked: false },
    { label: 'Insuficiencia cardiaca', points: 1, checked: false },
    { label: 'Trombofilia conhecida', points: 3, checked: false },
    { label: 'Cateter venoso central', points: 2, checked: false },
  ]);

  const toggleFactor = (idx: number) => {
    setFactors((prev) => {
      const updated = prev.map((f, i) => (i === idx ? { ...f, checked: !f.checked } : f));
      const newScore = updated.filter((f) => f.checked).reduce((sum, f) => sum + f.points, 0);
      setScore(newScore);
      return updated;
    });
  };

  const getRiskLevel = () => {
    if (score >= 7) return { label: 'Muito Alto', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
    if (score >= 4) return { label: 'Alto', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
    if (score >= 2) return { label: 'Moderado', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
    return { label: 'Baixo', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  };

  const risk = getRiskLevel();

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-red-400" />
            Avaliacao de Risco TEV (Tromboembolismo Venoso)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Escala de Caprini modificada — selecione os fatores de risco presentes.
          </p>

          <div className="grid gap-2 md:grid-cols-2">
            {factors.map((f, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  f.checked
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-750',
                )}
                onClick={() => toggleFactor(idx)}
              >
                {f.checked ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-zinc-600 shrink-0" />
                )}
                <span className="text-sm text-zinc-300 flex-1">{f.label}</span>
                <Badge variant="outline" className="bg-zinc-700/50 text-zinc-400 border-zinc-600">
                  +{f.points}
                </Badge>
              </div>
            ))}
          </div>

          <div className={cn('rounded-lg border p-4', risk.bg)}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-zinc-400">Pontuacao Total:</span>
                <span className={cn('ml-2 text-2xl font-bold', risk.color)}>{score}</span>
              </div>
              <div>
                <span className="text-sm text-zinc-400 mr-2">Risco:</span>
                <Badge variant="outline" className={RISK_COLOR[score >= 7 ? 'CRITICAL' : score >= 4 ? 'HIGH' : score >= 2 ? 'MODERATE' : 'LOW']}>
                  {risk.label}
                </Badge>
              </div>
            </div>
            {score >= 4 && (
              <p className="mt-2 text-sm text-zinc-300">
                Recomendacao: Profilaxia farmacologica com heparina + meias compressivas.
              </p>
            )}
            {score >= 2 && score < 4 && (
              <p className="mt-2 text-sm text-zinc-300">
                Recomendacao: Meias compressivas + deambulacao precoce.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 8 — FMEA (Failure Mode and Effects Analysis)
// ═══════════════════════════════════════════════════════════════════════════

interface FailureModeRow {
  step: string;
  failureMode: string;
  effect: string;
  severity: number;
  occurrence: number;
  detection: number;
  currentControls: string;
  recommendedActions: string;
  responsible: string;
}

const EMPTY_FM: FailureModeRow = {
  step: '', failureMode: '', effect: '', severity: 1, occurrence: 1, detection: 1,
  currentControls: '', recommendedActions: '', responsible: '',
};

function FmeaTab() {
  const create = useCreateFMEA();
  const [processName, setProcessName] = useState('');
  const [teamMembers, setTeamMembers] = useState('');
  const [rows, setRows] = useState<FailureModeRow[]>([{ ...EMPTY_FM }]);
  const [result, setResult] = useState<FMEAResult | null>(null);

  const updateRow = (idx: number, field: keyof FailureModeRow, value: string | number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_FM }]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!processName) {
      toast.error('Informe o nome do processo');
      return;
    }
    if (rows.some((r) => !r.step || !r.failureMode)) {
      toast.error('Preencha etapa e modo de falha em todas as linhas');
      return;
    }
    create.mutate(
      {
        processName,
        teamMembers: teamMembers.split(',').map((s) => s.trim()).filter(Boolean),
        failureModes: rows.map((r) => ({
          ...r,
          currentControls: r.currentControls || undefined,
          recommendedActions: r.recommendedActions || undefined,
          responsible: r.responsible || undefined,
        })),
      },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success('FMEA criada com sucesso');
        },
        onError: () => toast.error('Erro ao criar FMEA'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="h-5 w-5 text-amber-400" />
            FMEA — Analise de Modo e Efeito de Falha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Processo *</Label>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Ex: Administracao de Medicamentos"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Equipe (separado por virgula)</Label>
              <Input
                className="border-zinc-700 bg-zinc-800"
                placeholder="Dr. Silva, Enf. Costa"
                value={teamMembers}
                onChange={(e) => setTeamMembers(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Etapa</TableHead>
                  <TableHead className="text-zinc-400">Modo de Falha</TableHead>
                  <TableHead className="text-zinc-400">Efeito</TableHead>
                  <TableHead className="text-zinc-400 text-center">S</TableHead>
                  <TableHead className="text-zinc-400 text-center">O</TableHead>
                  <TableHead className="text-zinc-400 text-center">D</TableHead>
                  <TableHead className="text-zinc-400 text-center">RPN</TableHead>
                  <TableHead className="text-zinc-400" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const rpn = row.severity * row.occurrence * row.detection;
                  return (
                    <TableRow key={idx} className="border-zinc-800">
                      <TableCell>
                        <Input
                          className="border-zinc-700 bg-zinc-800 h-8 text-xs"
                          value={row.step}
                          onChange={(e) => updateRow(idx, 'step', e.target.value)}
                          placeholder="Etapa"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="border-zinc-700 bg-zinc-800 h-8 text-xs"
                          value={row.failureMode}
                          onChange={(e) => updateRow(idx, 'failureMode', e.target.value)}
                          placeholder="Modo de falha"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="border-zinc-700 bg-zinc-800 h-8 text-xs"
                          value={row.effect}
                          onChange={(e) => updateRow(idx, 'effect', e.target.value)}
                          placeholder="Efeito"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="border-zinc-700 bg-zinc-800 h-8 w-14 text-center text-xs"
                          type="number" min={1} max={10}
                          value={row.severity}
                          onChange={(e) => updateRow(idx, 'severity', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="border-zinc-700 bg-zinc-800 h-8 w-14 text-center text-xs"
                          type="number" min={1} max={10}
                          value={row.occurrence}
                          onChange={(e) => updateRow(idx, 'occurrence', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="border-zinc-700 bg-zinc-800 h-8 w-14 text-center text-xs"
                          type="number" min={1} max={10}
                          value={row.detection}
                          onChange={(e) => updateRow(idx, 'detection', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'font-mono font-bold',
                            rpn >= 200 ? 'text-red-400' : rpn >= 100 ? 'text-orange-400' : rpn >= 50 ? 'text-yellow-400' : 'text-green-400',
                          )}
                        >
                          {rpn}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rows.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeRow(idx)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={addRow} className="border-zinc-700">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Linha
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={create.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Analisar FMEA
            </Button>
          </div>

          {result && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <p className="text-sm text-emerald-400 font-medium">
                FMEA: {result.processName} — {result.totalFailureModes} modos de falha, {result.criticalItems} criticos
              </p>
              {result.topRisks.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-zinc-400 mb-1">Top Riscos:</p>
                  {result.topRisks.map((r, i) => (
                    <div key={i} className="text-xs text-zinc-300">
                      {r.step}: {r.failureMode} — RPN {r.rpn}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 9 — AI Readmission Risk
// ═══════════════════════════════════════════════════════════════════════════

function ReadmissionTab() {
  const [patientId, setPatientId] = useState(DEMO_PATIENT_ID);
  const [searchId, setSearchId] = useState('');
  const { data, isLoading, isError } = usePredictReadmission(searchId);

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-violet-400" />
            IA — Predicao de Risco de Readmissao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Modelo preditivo baseado em IA para estimar o risco de readmissao hospitalar em 30 dias.
          </p>

          <div className="flex gap-2">
            <Input
              className="border-zinc-700 bg-zinc-800"
              placeholder="ID do Paciente"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
            <Button
              onClick={() => setSearchId(patientId)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Brain className="mr-2 h-4 w-4" />
              Predizer
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando predicao de readmissao...
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              Erro ao processar predicao
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">Paciente:</span>
                <span className="font-medium text-zinc-100">{data.patientName}</span>
                <RiskBadge level={data.riskLevel} />
              </div>

              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Risco de Readmissao (30d)</span>
                  <span className={cn(
                    'text-2xl font-bold',
                    data.readmissionRisk >= 70 ? 'text-red-400' :
                    data.readmissionRisk >= 40 ? 'text-yellow-400' : 'text-green-400',
                  )}>
                    {data.readmissionRisk}%
                  </span>
                </div>
                <Progress value={data.readmissionRisk} className="h-3" />
              </div>

              {data.riskFactors.length > 0 && (
                <div>
                  <Label className="text-zinc-400">Fatores de Risco:</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {data.riskFactors.map((f) => (
                      <Badge key={f} variant="outline" className="bg-red-500/10 text-red-300 border-red-500/30">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {data.recommendations.length > 0 && (
                <div>
                  <Label className="text-zinc-400">Recomendacoes:</Label>
                  <ul className="mt-1 space-y-1">
                    {data.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 10 — AI Medication Error Detection
// ═══════════════════════════════════════════════════════════════════════════

function MedicationErrorTab() {
  const { data, isLoading, isError } = useDetectMedicationErrors();

  const severityColor: Record<string, string> = {
    LOW: 'bg-green-500/20 text-green-400 border-green-500/50',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/50',
    CRITICAL: 'bg-red-700/30 text-red-300 border-red-700/50',
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 p-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando deteccao de erros de medicacao...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Erro ao carregar deteccao de erros de medicacao
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Periodo</div>
            <div className="text-2xl font-bold text-zinc-100">{data.period}</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Verificacoes</div>
            <div className="text-2xl font-bold text-emerald-400">{data.totalChecks}</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Doses Perdidas</div>
            <div className="text-2xl font-bold text-red-400">{data.missedDoses}</div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Adm. Atrasadas</div>
            <div className="text-2xl font-bold text-orange-400">{data.lateAdministrations}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pill className="h-5 w-5 text-pink-400" />
            Alertas de IA — Erros de Medicacao ({data.alertCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.alerts.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum alerta no periodo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Tipo</TableHead>
                  <TableHead className="text-zinc-400">Severidade</TableHead>
                  <TableHead className="text-zinc-400">Paciente</TableHead>
                  <TableHead className="text-zinc-400">Medicamento</TableHead>
                  <TableHead className="text-zinc-400">Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.alerts.map((alert, idx) => (
                  <TableRow key={idx} className="border-zinc-800">
                    <TableCell className="text-sm text-zinc-300">{alert.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={severityColor[alert.severity.toUpperCase()] ?? severityColor.LOW}
                      >
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-200">{alert.patientName}</TableCell>
                    <TableCell className="text-sm text-zinc-300">{alert.medication}</TableCell>
                    <TableCell className="text-sm text-zinc-400">{alert.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function SafetyPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Seguranca do Paciente</h1>
          <p className="text-sm text-zinc-400">
            Nucleo de Seguranca — Ferramentas de prevencao, monitoramento e analise de riscos
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 bg-zinc-900 border border-zinc-800 p-1 h-auto">
          <TabsTrigger value="dashboard" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <BarChart3 className="mr-1 h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="identification" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Fingerprint className="mr-1 h-3.5 w-3.5" />
            Identificacao
          </TabsTrigger>
          <TabsTrigger value="allergy" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
            Alergias
          </TabsTrigger>
          <TabsTrigger value="rca" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Target className="mr-1 h-3.5 w-3.5" />
            RCA
          </TabsTrigger>
          <TabsTrigger value="ncc-merp" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ClipboardList className="mr-1 h-3.5 w-3.5" />
            NCC MERP
          </TabsTrigger>
          <TabsTrigger value="devices" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Cog className="mr-1 h-3.5 w-3.5" />
            Dispositivos
          </TabsTrigger>
          <TabsTrigger value="tev" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Activity className="mr-1 h-3.5 w-3.5" />
            TEV
          </TabsTrigger>
          <TabsTrigger value="fmea" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Stethoscope className="mr-1 h-3.5 w-3.5" />
            FMEA
          </TabsTrigger>
          <TabsTrigger value="readmission" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Brain className="mr-1 h-3.5 w-3.5" />
            IA Readmissao
          </TabsTrigger>
          <TabsTrigger value="medication-errors" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Pill className="mr-1 h-3.5 w-3.5" />
            IA Medicacao
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="identification"><IdentificationTab /></TabsContent>
        <TabsContent value="allergy"><AllergyTab /></TabsContent>
        <TabsContent value="rca"><RcaTab /></TabsContent>
        <TabsContent value="ncc-merp"><NccMerpTab /></TabsContent>
        <TabsContent value="devices"><DeviceTrackingTab /></TabsContent>
        <TabsContent value="tev"><TevTab /></TabsContent>
        <TabsContent value="fmea"><FmeaTab /></TabsContent>
        <TabsContent value="readmission"><ReadmissionTab /></TabsContent>
        <TabsContent value="medication-errors"><MedicationErrorTab /></TabsContent>
      </Tabs>
    </div>
  );
}
