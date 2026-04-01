import { useState } from 'react';
import {
  ShieldCheck,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  Search,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useVerifyIdentification,
  useRecordTimeout,
  useSafetyDashboard,
  type VerifyIdentificationDto,
  type RecordTimeoutDto,
  type PositiveIdentificationResult,
} from '@/services/patient-safety.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Verification Result Banner ───────────────────────────────────────────────

function VerificationResultBanner({ result }: { result: PositiveIdentificationResult }) {
  const ok = result.verified;
  return (
    <div
      className={`rounded-lg border p-4 flex items-start gap-3 ${
        ok
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : 'border-red-500/40 bg-red-500/10'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <p className={`font-semibold text-base ${ok ? 'text-emerald-300' : 'text-red-300'}`}>
          {ok ? 'Identificação Confirmada' : 'Falha na Identificação'}
        </p>
        <p className="text-sm text-zinc-400 mt-1">
          {ok
            ? 'Todos os identificadores conferem. Prossiga com o procedimento.'
            : 'Discrepâncias encontradas. NÃO prossiga — acione o protocolo de segurança.'}
        </p>
        {result.discrepancies.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-red-400 font-medium">Discrepâncias:</p>
            {result.discrepancies.map((d, i) => (
              <p key={i} className="text-xs text-red-300">• {d}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-zinc-500 mt-2">
          Verificado por {result.verifiedById} em {formatDate(result.verifiedAt)}
        </p>
      </div>
    </div>
  );
}

// ─── Positive ID Panel ────────────────────────────────────────────────────────

const IDENTIFICATION_ITEMS = [
  { id: 'wristband', label: 'Pulseira de identificação' },
  { id: 'name', label: 'Nome completo (confirmado com o paciente)' },
  { id: 'dob', label: 'Data de nascimento' },
  { id: 'mr_number', label: 'Número do prontuário (MR)' },
  { id: 'cpf', label: 'CPF' },
  { id: 'photo', label: 'Foto no cadastro' },
];

function PositiveIdPanel() {
  const verify = useVerifyIdentification();
  const [patientId, setPatientId] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [verifiedById, setVerifiedById] = useState('');
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [result, setResult] = useState<PositiveIdentificationResult | null>(null);

  const toggleItem = (id: string) =>
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const handleVerify = () => {
    if (!patientId || !verifiedById) {
      toast.error('Informe o ID do paciente e do verificador.');
      return;
    }
    if (checkedItems.length < 2) {
      toast.error('Selecione ao menos 2 identificadores (regra dos 2 identificadores).');
      return;
    }

    const dto: VerifyIdentificationDto = {
      patientId,
      encounterId: encounterId || undefined,
      checkedItems,
      wristbandMatch: checkedItems.includes('wristband'),
      nameMatch: checkedItems.includes('name'),
      dateOfBirthMatch: checkedItems.includes('dob'),
      mrNumberMatch: checkedItems.includes('mr_number'),
    };

    verify.mutate(dto, {
      onSuccess: (data) => {
        setResult(data);
        if (data.verified) {
          toast.success('Identificação positiva confirmada.');
        } else {
          toast.error('Falha na identificação do paciente!');
        }
      },
      onError: () => toast.error('Erro ao verificar identificação.'),
    });
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-emerald-400" />
          Verificação de Identidade Positiva
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>ID do Paciente</Label>
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="ID ou prontuário"
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1">
            <Label>ID Atendimento (opcional)</Label>
            <Input
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Verificado por (ID do profissional)</Label>
          <Input
            value={verifiedById}
            onChange={(e) => setVerifiedById(e.target.value)}
            className="bg-zinc-950 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Identificadores verificados (mínimo 2)</Label>
          <div className="grid gap-2">
            {IDENTIFICATION_ITEMS.map(({ id, label }) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={checkedItems.includes(id)}
                  onCheckedChange={() => toggleItem(id)}
                  className="border-zinc-600"
                />
                <Label htmlFor={id} className="cursor-pointer text-zinc-300">
                  {label}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {checkedItems.length} de {IDENTIFICATION_ITEMS.length} selecionados
            {checkedItems.length >= 2 && (
              <span className="text-emerald-400 ml-2">✓ Regra dos 2 identificadores atendida</span>
            )}
          </p>
        </div>

        {result && <VerificationResultBanner result={result} />}

        <Button
          onClick={handleVerify}
          disabled={verify.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          {verify.isPending ? 'Verificando...' : 'Confirmar Identificação'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Procedure Timeout Panel ──────────────────────────────────────────────────

const TIMEOUT_CHECKS = [
  { field: 'correctPatient' as const, label: 'Paciente correto' },
  { field: 'correctSite' as const, label: 'Sítio cirúrgico/procedimento correto' },
  { field: 'correctProcedure' as const, label: 'Procedimento correto' },
  { field: 'consentVerified' as const, label: 'Consentimento informado assinado' },
  { field: 'implants' as const, label: 'Implantes / materiais especiais disponíveis' },
  { field: 'antibioticProphylaxis' as const, label: 'Antibiótico profilático administrado' },
  { field: 'imagingAvailable' as const, label: 'Imagens disponíveis e corretas' },
  { field: 'teamAgreement' as const, label: 'Equipe concorda — prosseguir com o procedimento' },
] as const;

type TimeoutChecksState = Record<typeof TIMEOUT_CHECKS[number]['field'], boolean>;

function ProcedureTimeoutPanel() {
  const recordTimeout = useRecordTimeout();
  const [procedureId, setProcedureId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<TimeoutChecksState>({
    correctPatient: false,
    correctSite: false,
    correctProcedure: false,
    consentVerified: false,
    implants: false,
    antibioticProphylaxis: false,
    imagingAvailable: false,
    teamAgreement: false,
  });
  const [done, setDone] = useState(false);

  const allCriticalChecked =
    checks.correctPatient && checks.correctSite && checks.correctProcedure && checks.teamAgreement;

  const handleRecord = () => {
    if (!procedureId || !patientId) {
      toast.error('Informe o ID do procedimento e do paciente.');
      return;
    }
    if (!allCriticalChecked) {
      toast.error('Confirme os 4 itens críticos antes de prosseguir.');
      return;
    }

    const dto: RecordTimeoutDto = {
      procedureId,
      patientId,
      ...checks,
      notes: notes || undefined,
    };

    recordTimeout.mutate(dto, {
      onSuccess: () => {
        toast.success('Time-out cirúrgico registrado com sucesso.');
        setDone(true);
      },
      onError: () => toast.error('Erro ao registrar time-out.'),
    });
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-emerald-400" />
          Time-Out Cirúrgico (WHO Checklist)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {done ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            <p className="text-emerald-300 font-medium">
              Time-out registrado. Procedimento autorizado para início.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ID do Procedimento</Label>
                <Input
                  value={procedureId}
                  onChange={(e) => setProcedureId(e.target.value)}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div className="space-y-1">
                <Label>ID do Paciente</Label>
                <Input
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              {TIMEOUT_CHECKS.map(({ field, label }) => {
                const isCritical = ['correctPatient', 'correctSite', 'correctProcedure', 'teamAgreement'].includes(field);
                return (
                  <div key={field} className="flex items-center gap-2">
                    <Checkbox
                      id={`timeout-${field}`}
                      checked={checks[field]}
                      onCheckedChange={(v) =>
                        setChecks((c) => ({ ...c, [field]: !!v }))
                      }
                      className="border-zinc-600"
                    />
                    <Label htmlFor={`timeout-${field}`} className="cursor-pointer flex items-center gap-2">
                      <span className="text-zinc-300">{label}</span>
                      {isCritical && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                          Crítico
                        </Badge>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionais da equipe..."
                className="bg-zinc-950 border-zinc-700"
              />
            </div>

            {!allCriticalChecked && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Confirme todos os itens críticos para liberar o procedimento.</span>
              </div>
            )}

            <Button
              onClick={handleRecord}
              disabled={recordTimeout.isPending || !allCriticalChecked}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {recordTimeout.isPending ? 'Registrando...' : 'Registrar Time-Out'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

function SafetyStatsPanel() {
  const dashboard = useSafetyDashboard();
  const data = dashboard.data;

  const stats = [
    { label: 'Score de Segurança', value: data?.safetyScore ?? '—', color: 'text-emerald-400' },
    { label: 'Eventos Adversos', value: data?.adverseEvents.total ?? '—', color: 'text-red-400' },
    { label: 'Quase-Erros', value: data?.nearMisses.total ?? '—', color: 'text-yellow-400' },
    { label: 'Time-outs Realizados', value: data?.timeouts.total ?? '—', color: 'text-blue-400' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map(({ label, value, color }) => (
        <Card key={label} className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{String(value)}</p>
            <p className="text-xs text-zinc-400 mt-1">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ProcedureContext =
  | 'medication'
  | 'blood_transfusion'
  | 'surgery'
  | 'exam'
  | 'procedure'
  | 'discharge';

const PROCEDURE_LABELS: Record<ProcedureContext, string> = {
  medication: 'Administração de Medicamento',
  blood_transfusion: 'Transfusão de Sangue',
  surgery: 'Procedimento Cirúrgico',
  exam: 'Coleta / Exame',
  procedure: 'Procedimento Invasivo',
  discharge: 'Alta Hospitalar',
};

export default function IdentityVerificationPage() {
  const [context, setContext] = useState<ProcedureContext>('medication');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
            Verificação de Identidade do Paciente
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Identificação positiva antes de procedimentos — regra dos 2 identificadores
          </p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <User className="h-3 w-3 mr-1" />
          Segurança do Paciente
        </Badge>
      </div>

      {/* Context Selector */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-zinc-400" />
              <Label className="text-zinc-300 whitespace-nowrap">Contexto do procedimento:</Label>
            </div>
            <Select
              value={context}
              onValueChange={(v) => setContext(v as ProcedureContext)}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-700 w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PROCEDURE_LABELS) as [ProcedureContext, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
              {PROCEDURE_LABELS[context]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <SafetyStatsPanel />

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PositiveIdPanel />
        {context === 'surgery' || context === 'procedure' ? (
          <ProcedureTimeoutPanel />
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-zinc-400" />
                Protocolo: {PROCEDURE_LABELS[context]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-zinc-400">
                Para <strong className="text-white">{PROCEDURE_LABELS[context].toLowerCase()}</strong>,
                confirme a identificação positiva com no mínimo 2 identificadores antes de prosseguir.
              </p>
              <div className="space-y-2">
                {context === 'blood_transfusion' && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    <strong>Atenção — Transfusão:</strong> Requer dupla verificação por dois
                    profissionais diferentes. Conferir hemocomponente, tipagem e validade.
                  </div>
                )}
                {context === 'medication' && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                    <strong>Regra dos 9 certos:</strong> Paciente, medicamento, dose, via, horário,
                    razão, resposta, educação, recusa.
                  </div>
                )}
                {context === 'discharge' && (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-300">
                    <strong>Alta:</strong> Confirme identidade antes de entregar documentos de alta,
                    prescrições e orientações ao paciente ou responsável.
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mt-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Use o painel ao lado para executar a verificação de identidade positiva.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
