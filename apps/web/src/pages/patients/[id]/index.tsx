import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Activity,
  Pill,
  TestTube,
  Shield,
  User,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, getInitials, calculateAge, formatCPF, formatPhone } from '@/lib/utils';
import { riskLevelInfo, encounterStatusLabels, encounterTypeLabels, triageLevelColors } from '@/lib/constants';
import { usePatient } from '@/services/patients.service';
import { useAllergies, useConditions } from '@/services/patient-details.service';
import { useEncounters } from '@/services/encounters.service';
import { usePrescriptions } from '@/services/prescriptions.service';
import { useVitalSigns } from '@/services/vital-signs.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { PdfDownloadButton } from '@/components/pdf-download-button';
import { PatientTimeline } from '@/components/medical/patient-timeline';
import type { RiskLevel } from '@/types';

function riskLevelFromScore(score?: number): RiskLevel | undefined {
  if (score == null) return undefined;
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

const severityLabels: Record<string, string> = {
  MILD: 'Leve',
  MODERATE: 'Moderada',
  SEVERE: 'Grave',
  LIFE_THREATENING: 'Risco de Vida',
};

const conditionStatusLabels: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativo', className: 'bg-blue-500/20 text-blue-400' },
  INACTIVE: { label: 'Inativo', className: 'bg-amber-500/20 text-amber-400' },
  RESOLVED: { label: 'Resolvido', className: 'bg-green-500/20 text-green-400' },
  REMISSION: { label: 'Remissão', className: 'bg-green-500/20 text-green-400' },
};

const prescriptionStatusLabels: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'bg-yellow-500/20 text-yellow-400' },
  ACTIVE: { label: 'Ativa', className: 'bg-green-500/20 text-green-400' },
  COMPLETED: { label: 'Concluída', className: 'bg-muted text-foreground' },
  CANCELLED: { label: 'Cancelada', className: 'bg-red-500/20 text-red-400' },
  SUSPENDED: { label: 'Suspensa', className: 'bg-amber-500/20 text-amber-400' },
  EXPIRED: { label: 'Expirada', className: 'bg-muted text-foreground' },
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resumo');

  const { data: patient, isLoading, isError, refetch } = usePatient(id ?? '');
  const { data: allergies = [] } = useAllergies(id ?? '');
  const { data: conditions = [] } = useConditions(id ?? '');
  const { data: encountersData } = useEncounters({ patientId: id });
  const encounters = encountersData?.data ?? [];
  const { data: prescriptionsData } = usePrescriptions({ patientId: id });
  const prescriptions = prescriptionsData?.data ?? [];
  const { data: vitalSigns = [] } = useVitalSigns(id ?? '');

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Paciente não encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">O registro solicitado não existe.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/pacientes')}>
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  const patientName = patient.name ?? patient.fullName;
  const riskLevel = riskLevelFromScore(patient.riskScore);
  const risk = riskLevel ? riskLevelInfo[riskLevel] : undefined;
  const age = calculateAge(patient.birthDate);

  const vitalChartData = vitalSigns
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((v) => ({
      time: new Date(v.recordedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      PA: v.systolicBP,
      FC: v.heartRate,
      SpO2: v.oxygenSaturation,
    }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-500/5 via-transparent to-transparent p-3 -mx-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pacientes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-teal-500/20">
            <AvatarFallback className="bg-teal-500/20 text-base text-teal-600 dark:text-teal-400">
              {getInitials(patientName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{patientName}</h1>
              {risk && (
                <Badge variant="secondary" className={cn('text-xs', risk.color, 'bg-secondary')}>
                  Risco {risk.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{age} anos</span>
              <span>{patient.gender === 'F' ? 'Feminino' : patient.gender === 'M' ? 'Masculino' : 'Outro'}</span>
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-teal-600 dark:text-teal-400">
                {patient.mrn}
              </code>
            </div>
          </div>
        </div>

        {/* Allergy badges always visible */}
        <div className="hidden items-center gap-1 md:flex">
          {allergies.map((allergy) => (
            <Badge
              key={allergy.id}
              className={cn(
                'text-xs transition-all',
                allergy.severity === 'LIFE_THREATENING' || allergy.severity === 'SEVERE'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30',
              )}
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              {allergy.substance}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="resumo" className="text-xs data-[state=active]:bg-teal-600">Resumo</TabsTrigger>
          <TabsTrigger value="dados" className="text-xs data-[state=active]:bg-teal-600">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="alergias" className="text-xs data-[state=active]:bg-teal-600">Alergias</TabsTrigger>
          <TabsTrigger value="condicoes" className="text-xs data-[state=active]:bg-teal-600">Condições</TabsTrigger>
          <TabsTrigger value="atendimentos" className="text-xs data-[state=active]:bg-teal-600">Atendimentos</TabsTrigger>
          <TabsTrigger value="prescricoes" className="text-xs data-[state=active]:bg-teal-600">Prescrições</TabsTrigger>
          <TabsTrigger value="sinais" className="text-xs data-[state=active]:bg-teal-600">Sinais Vitais</TabsTrigger>
          <TabsTrigger value="exames" className="text-xs data-[state=active]:bg-teal-600">Exames</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs data-[state=active]:bg-teal-600">Historico</TabsTrigger>
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Resumo Clínico (IA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Paciente {patient.gender === 'F' ? 'feminina' : 'masculino'}, {age} anos,
                com histórico de {conditions.map((c) => c.cidDescription).filter(Boolean).join(', ') || 'sem condições crônicas registradas'}.
                {allergies.length > 0
                  ? ` Alergias conhecidas: ${allergies.map((a) => `${a.substance} (${severityLabels[a.severity] ?? a.severity})`).join(', ')}.`
                  : ' Sem alergias conhecidas.'}
                {' '}Acompanhamento regular com {encounters.length} atendimentos registrados.
                {riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
                  ? ' Paciente de alto risco — monitoramento intensificado recomendado.'
                  : ''}
              </p>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-blue-400" />
                Linha do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {encounters.map((enc, idx) => {
                  const statusInfo = encounterStatusLabels[enc.status];
                  return (
                    <div key={enc.id} className="animate-fade-in-up flex gap-3" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className="flex flex-col items-center">
                        <div className={cn('h-3 w-3 rounded-full ring-2 ring-offset-2 ring-offset-background', enc.triageLevel ? `${triageLevelColors[enc.triageLevel]?.bg} ring-${triageLevelColors[enc.triageLevel]?.bg}/30` : 'bg-muted-foreground ring-zinc-600/30')} />
                        {idx < encounters.length - 1 && (
                          <div className="w-px flex-1 bg-gradient-to-b from-zinc-700 to-zinc-800/50" />
                        )}
                      </div>
                      <div
                        className="flex-1 cursor-pointer rounded-lg border border-border p-3 transition-all hover:bg-secondary/50 hover:border-teal-500/20 hover:translate-x-0.5"
                        onClick={() => navigate(`/atendimentos/${enc.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{enc.chiefComplaint}</p>
                          <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                            {statusInfo?.label}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{encounterTypeLabels[enc.type]}</span>
                          <span>{enc.startedAt ? new Date(enc.startedAt).toLocaleDateString('pt-BR') : new Date(enc.createdAt).toLocaleDateString('pt-BR')}</span>
                          <span>{enc.primaryDoctor?.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados Pessoais */}
        <TabsContent value="dados">
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  { label: 'Nome Completo', value: patientName },
                  { label: 'CPF', value: patient.cpf ? formatCPF(patient.cpf) : 'Não informado' },
                  { label: 'Data de Nascimento', value: new Date(patient.birthDate).toLocaleDateString('pt-BR') },
                  { label: 'Idade', value: `${age} anos` },
                  { label: 'Sexo', value: patient.gender === 'F' ? 'Feminino' : patient.gender === 'M' ? 'Masculino' : 'Outro' },
                  { label: 'Telefone', value: patient.phone ? formatPhone(patient.phone) : 'Não informado' },
                  { label: 'Email', value: patient.email ?? 'Não informado' },
                  { label: 'Convênio', value: patient.insuranceProvider ? `${patient.insuranceProvider} — ${patient.insurancePlan}` : 'Particular' },
                  { label: 'Nº Convênio', value: patient.insuranceNumber ?? 'N/A' },
                  { label: 'Endereço', value: patient.address ? `${patient.address}${patient.addressNumber ? `, ${patient.addressNumber}` : ''} — ${patient.neighborhood ?? ''}, ${patient.city ?? ''}/${patient.state ?? ''}` : 'Não informado' },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                    <p className="mt-1 text-sm">{field.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alergias */}
        <TabsContent value="alergias" className="space-y-3">
          {allergies.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Shield className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma alergia registrada</p>
              </CardContent>
            </Card>
          ) : (
            allergies.map((allergy) => (
              <Card
                key={allergy.id}
                className={cn(
                  'border',
                  allergy.severity === 'LIFE_THREATENING' || allergy.severity === 'SEVERE'
                    ? 'border-red-500/30 bg-red-500/5'
                    : allergy.severity === 'MODERATE'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-border bg-card',
                )}
              >
                <CardContent className="flex items-start gap-3 py-4">
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-5 w-5 shrink-0',
                      allergy.severity === 'LIFE_THREATENING' || allergy.severity === 'SEVERE'
                        ? 'text-red-400'
                        : 'text-amber-400',
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{allergy.substance}</h3>
                      <Badge
                        className={cn(
                          'text-[10px]',
                          allergy.severity === 'LIFE_THREATENING'
                            ? 'bg-red-600 text-white'
                            : allergy.severity === 'SEVERE'
                              ? 'bg-red-500/20 text-red-400'
                              : allergy.severity === 'MODERATE'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-muted text-foreground',
                        )}
                      >
                        {severityLabels[allergy.severity] ?? allergy.severity}
                      </Badge>
                    </div>
                    {allergy.reaction && (
                      <p className="mt-1 text-sm text-muted-foreground">{allergy.reaction}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Relatado em {new Date(allergy.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          <Button variant="outline" className="border-border">
            <PlusIcon className="mr-2 h-4 w-4" />
            Adicionar Alergia
          </Button>
        </TabsContent>

        {/* Condições */}
        <TabsContent value="condicoes" className="space-y-3">
          {conditions.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Activity className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma condição registrada</p>
              </CardContent>
            </Card>
          ) : (
            conditions.map((cond) => {
              const condStatus = conditionStatusLabels[cond.status] ?? { label: cond.status, className: 'bg-muted text-foreground' };
              return (
                <Card key={cond.id} className="border-border bg-card">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-teal-600 dark:text-teal-400">
                          {cond.cidCode ?? '—'}
                        </code>
                        <h3 className="text-sm font-medium">{cond.cidDescription ?? 'Sem descrição'}</h3>
                      </div>
                      {cond.diagnosedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Desde {new Date(cond.diagnosedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px]', condStatus.className)}
                    >
                      {condStatus.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Atendimentos */}
        <TabsContent value="atendimentos">
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Queixa</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Médico</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {encounters.map((enc) => {
                    const statusInfo = encounterStatusLabels[enc.status];
                    return (
                      <tr
                        key={enc.id}
                        className="cursor-pointer transition-colors hover:bg-accent/30"
                        onClick={() => navigate(`/atendimentos/${enc.id}`)}
                      >
                        <td className="px-4 py-3 text-sm">{enc.startedAt ? new Date(enc.startedAt).toLocaleDateString('pt-BR') : new Date(enc.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-sm">{encounterTypeLabels[enc.type]}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">{enc.chiefComplaint}</td>
                        <td className="px-4 py-3 text-sm">{enc.primaryDoctor?.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={cn('text-[10px] text-white', statusInfo?.color)}>
                            {statusInfo?.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Prescrições */}
        <TabsContent value="prescricoes" className="space-y-3">
          {prescriptions.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Pill className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma prescrição registrada</p>
              </CardContent>
            </Card>
          ) : (
            prescriptions.map((presc) => {
              const prescStatus = prescriptionStatusLabels[presc.status] ?? { label: presc.status, className: 'bg-muted text-foreground' };
              return (
                <Card key={presc.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Prescrição — {new Date(presc.createdAt).toLocaleDateString('pt-BR')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <PdfDownloadButton
                          endpoint={`prescriptions/${presc.id}/pdf`}
                          label="PDF"
                          size="sm"
                        />
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px]', prescStatus.className)}
                        >
                          {prescStatus.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(presc.items ?? []).map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border p-2.5 text-sm',
                            item.isHighAlert
                              ? 'border-red-500/30 bg-red-500/5'
                              : 'border-border bg-card/30',
                          )}
                        >
                          <Pill className={cn('h-4 w-4 shrink-0', item.isHighAlert ? 'text-red-400' : 'text-muted-foreground')} />
                          <div className="flex-1">
                            <span className="font-medium">{item.medicationName}</span>
                            <span className="ml-2 text-muted-foreground">
                              {item.dose} — {item.route} — {item.frequency}
                            </span>
                          </div>
                          {item.isHighAlert && (
                            <Badge className="bg-red-500/20 text-[10px] text-red-400">Alto Alerta</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Sinais Vitais */}
        <TabsContent value="sinais" className="space-y-4">
          {vitalSigns.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tendência de Sinais Vitais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitalChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
                      />
                      <Line type="monotone" dataKey="PA" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="PA Sistólica" />
                      <Line type="monotone" dataKey="FC" stroke="#0D9488" strokeWidth={2} dot={{ fill: '#0D9488' }} name="FC" />
                      <Line type="monotone" dataKey="SpO2" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="SpO2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vital Signs Table */}
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data/Hora</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">PA</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">FC</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">FR</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Temp</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">SpO2</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Dor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {vitalSigns.map((vs) => (
                    <tr key={vs.id}>
                      <td className="px-4 py-3 text-sm">
                        {new Date(vs.recordedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn(vs.systolicBP && vs.systolicBP > 140 ? 'text-red-400 font-medium' : '')}>
                          {vs.systolicBP}/{vs.diastolicBP}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{vs.heartRate} bpm</td>
                      <td className="px-4 py-3 text-sm">{vs.respiratoryRate} irpm</td>
                      <td className="px-4 py-3 text-sm">{vs.temperature}°C</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn(vs.oxygenSaturation && vs.oxygenSaturation < 95 ? 'text-red-400 font-medium' : '')}>
                          {vs.oxygenSaturation}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn(vs.painScale && vs.painScale >= 7 ? 'text-red-400 font-medium' : vs.painScale && vs.painScale >= 4 ? 'text-amber-400' : '')}>
                          {vs.painScale ?? '—'}/10
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Exames placeholder */}
        <TabsContent value="exames">
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center py-12">
              <TestTube className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Resultados de exames serão exibidos aqui</p>
              <Button variant="outline" className="mt-4 border-border">
                <TestTube className="mr-2 h-4 w-4" />
                Solicitar Exame
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historico / Timeline (A9) */}
        <TabsContent value="historico">
          {id ? (
            <PatientTimeline patientId={id} />
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Paciente nao encontrado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}
