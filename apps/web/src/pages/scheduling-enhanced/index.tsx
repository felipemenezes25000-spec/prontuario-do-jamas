import { useState } from 'react';
import {
  Clock,
  Users,
  CalendarOff,
  QrCode,
  BarChart3,
  Phone,
  UserPlus,
  Monitor,
  ArrowRight,
  RefreshCw,
  BrainCircuit,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  useCallQueue,
  useCallNextPatient,
  useWaitTimeStats,
  useWaitlist,
  useSendConfirmations,
  useCreateRecurringSchedule,
  useSmartSchedulingSuggestion,
  type RecurringSchedulePayload,
  type SmartSchedulingPayload,
} from '@/services/scheduling-enhanced.service';

export default function SchedulingEnhancedPage() {
  const [activeTab, setActiveTab] = useState('call-queue');

  const { data: callQueue = [] } = useCallQueue();
  const callNext = useCallNextPatient();
  const { data: waitStats } = useWaitTimeStats();
  const { data: waitlist = [] } = useWaitlist();
  const sendConfirmations = useSendConfirmations();
  const createRecurring = useCreateRecurringSchedule();
  const smartSuggestion = useSmartSchedulingSuggestion();

  const [recurringForm, setRecurringForm] = useState<RecurringSchedulePayload>({
    patientId: '', doctorId: '', type: 'RETURN', intervalMonths: 6, occurrences: 4, firstDate: '',
  });
  const [recurringResult, setRecurringResult] = useState<{ appointmentsCreated: number; appointments: Array<{ id: string; scheduledAt: string }>; reminderNote: string } | null>(null);

  const [smartForm, setSmartForm] = useState<SmartSchedulingPayload>({
    patientId: '', complexity: 'LOW',
  });
  const [smartResult, setSmartResult] = useState<{ suggestions: Array<{ date: string; time: string; estimatedDuration: number; score: number; reason: string }>; note: string } | null>(null);

  async function handleCallNext(doctorId: string, room: string) {
    try {
      const result = await callNext.mutateAsync({ doctorId, room });
      if (result.patientName) {
        toast.success(`Chamando ${result.patientName} para ${room}.`);
      } else {
        toast.info(result.message ?? 'Nenhum paciente aguardando.');
      }
    } catch {
      toast.error('Erro ao chamar próximo paciente.');
    }
  }

  async function handleSendConfirmations() {
    try {
      const result = await sendConfirmations.mutateAsync(24);
      toast.success(`${result.sent} lembretes de confirmação enviados.`);
    } catch {
      toast.error('Erro ao enviar confirmações.');
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agendamento Avançado</h1>
          <p className="text-zinc-400">Fila de chamada, lista de espera, overbooking, check-in QR e painel de tempos</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSendConfirmations}>
          <Phone className="h-4 w-4 mr-2" />
          Enviar Confirmações
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-white">{callQueue.length}</p>
                <p className="text-xs text-zinc-400">Aguardando atendimento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {waitStats?.stats?.[0]?.avgWaitMinutes ?? '—'}
                </p>
                <p className="text-xs text-zinc-400">Min espera média</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{Array.isArray(waitlist) ? waitlist.length : 0}</p>
                <p className="text-xs text-zinc-400">Na lista de espera</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">{waitStats?.totalDoctors ?? 0}</p>
                <p className="text-xs text-zinc-400">Médicos monitorados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800">
          <TabsTrigger value="call-queue">Fila de Chamada</TabsTrigger>
          <TabsTrigger value="waitlist">Lista de Espera</TabsTrigger>
          <TabsTrigger value="wait-times">Tempos de Espera</TabsTrigger>
          <TabsTrigger value="blocking">Bloqueio de Agenda</TabsTrigger>
          <TabsTrigger value="walkin">Encaixes</TabsTrigger>
          <TabsTrigger value="checkin">Check-in QR</TabsTrigger>
          <TabsTrigger value="recurring">Recorrente</TabsTrigger>
          <TabsTrigger value="smart">IA: Smart</TabsTrigger>
        </TabsList>

        <TabsContent value="call-queue" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Monitor className="h-5 w-5 text-emerald-500" />
                Painel de Chamada — Recepção / TV
              </CardTitle>
            </CardHeader>
            <CardContent>
              {callQueue.length === 0 ? (
                <p className="text-zinc-400 text-center py-8">Nenhum paciente aguardando chamada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">#</TableHead>
                      <TableHead className="text-zinc-400">Paciente</TableHead>
                      <TableHead className="text-zinc-400">Médico(a)</TableHead>
                      <TableHead className="text-zinc-400">Sala</TableHead>
                      <TableHead className="text-zinc-400">Horário</TableHead>
                      <TableHead className="text-zinc-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callQueue.map((entry) => (
                      <TableRow key={entry.appointmentId} className="border-zinc-800">
                        <TableCell className="text-white font-bold">{entry.position}</TableCell>
                        <TableCell className="text-white">{entry.patientName ?? '—'}</TableCell>
                        <TableCell className="text-zinc-300">{entry.doctorName ?? '—'}</TableCell>
                        <TableCell className="text-zinc-300">{entry.room}</TableCell>
                        <TableCell className="text-zinc-300">
                          {new Date(entry.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleCallNext(entry.appointmentId, entry.room)}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Chamar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waitlist" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-500" />
                Lista de Espera
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!Array.isArray(waitlist) || waitlist.length === 0 ? (
                <p className="text-zinc-400 text-center py-8">Lista de espera vazia.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">#</TableHead>
                      <TableHead className="text-zinc-400">Paciente</TableHead>
                      <TableHead className="text-zinc-400">Especialidade</TableHead>
                      <TableHead className="text-zinc-400">Prioridade</TableHead>
                      <TableHead className="text-zinc-400">Desde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.map((entry) => (
                      <TableRow key={entry.waitlistId} className="border-zinc-800">
                        <TableCell className="text-white font-bold">{entry.position}</TableCell>
                        <TableCell className="text-white">{entry.patientName ?? '—'}</TableCell>
                        <TableCell className="text-zinc-300">{entry.specialty ?? 'Geral'}</TableCell>
                        <TableCell>
                          <Badge className={entry.priority <= 3 ? 'bg-red-600' : entry.priority <= 6 ? 'bg-yellow-600' : 'bg-blue-600'}>
                            {entry.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {new Date(entry.waitingSince).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wait-times" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Dashboard de Tempos de Espera
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!waitStats?.stats || waitStats.stats.length === 0) ? (
                <p className="text-zinc-400 text-center py-8">Sem dados de tempo de espera disponíveis.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Médico(a)</TableHead>
                      <TableHead className="text-zinc-400">Média (min)</TableHead>
                      <TableHead className="text-zinc-400">Manhã</TableHead>
                      <TableHead className="text-zinc-400">Tarde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitStats.stats.map((s) => (
                      <TableRow key={s.doctorId} className="border-zinc-800">
                        <TableCell className="text-white">{s.doctorName}</TableCell>
                        <TableCell>
                          <Badge className={s.avgWaitMinutes > 30 ? 'bg-red-600' : s.avgWaitMinutes > 15 ? 'bg-yellow-600' : 'bg-emerald-600'}>
                            {s.avgWaitMinutes} min
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300">{s.byShift.morning ?? '—'} min</TableCell>
                        <TableCell className="text-zinc-300">{s.byShift.afternoon ?? '—'} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocking" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CalendarOff className="h-5 w-5 text-red-500" />
                Bloqueio de Agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-center py-8">
                Bloqueie agendas para férias, congressos ou afastamentos. Pacientes afetados são automaticamente notificados e reagendados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="walkin" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-500" />
                Encaixes e Walk-in
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-center py-8">
                Gerencie pacientes sem agendamento (encaixes). Overbooking controlado baseado na taxa de no-show por médico.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkin" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-500" />
                Check-in por QR Code / NFC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-center py-8">
                Paciente escaneia QR Code na recepção e o status muda automaticamente para "Aguardando". Sem filas no balcão.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring Schedule */}
        <TabsContent value="recurring" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-emerald-500" />
                Agendamento Recorrente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-zinc-400 text-xs">ID do Paciente *</Label>
                  <Input className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="UUID" value={recurringForm.patientId} onChange={(e) => setRecurringForm((f) => ({ ...f, patientId: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">ID do Médico *</Label>
                  <Input className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="UUID" value={recurringForm.doctorId} onChange={(e) => setRecurringForm((f) => ({ ...f, doctorId: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Primeira Consulta *</Label>
                  <Input type="date" className="bg-zinc-800 border-zinc-700 text-white mt-1" value={recurringForm.firstDate} onChange={(e) => setRecurringForm((f) => ({ ...f, firstDate: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Intervalo (meses)</Label>
                  <select className="mt-1 w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm" value={recurringForm.intervalMonths} onChange={(e) => setRecurringForm((f) => ({ ...f, intervalMonths: Number(e.target.value) as 3 | 6 | 12 }))}>
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses (anual)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Número de Consultas</Label>
                  <Input type="number" min={1} max={24} className="bg-zinc-800 border-zinc-700 text-white mt-1" value={recurringForm.occurrences} onChange={(e) => setRecurringForm((f) => ({ ...f, occurrences: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Duração (min)</Label>
                  <Input type="number" className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="30" value={recurringForm.duration ?? ''} onChange={(e) => setRecurringForm((f) => ({ ...f, duration: parseInt(e.target.value) || undefined }))} />
                </div>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={createRecurring.isPending}
                onClick={() => {
                  if (!recurringForm.patientId || !recurringForm.doctorId || !recurringForm.firstDate) {
                    toast.error('Preencha paciente, médico e primeira data.');
                    return;
                  }
                  createRecurring.mutate(recurringForm, {
                    onSuccess: (r) => { toast.success(`${r.appointmentsCreated} consultas agendadas para ${r.patientName}.`); setRecurringResult(r); },
                    onError: () => toast.error('Erro ao criar agendamento recorrente.'),
                  });
                }}
              >
                {createRecurring.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Criar Agendamento Recorrente
              </Button>

              {recurringResult && (
                <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 space-y-2">
                  <p className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {recurringResult.appointmentsCreated} consultas criadas com sucesso
                  </p>
                  <p className="text-zinc-400 text-xs">{recurringResult.reminderNote}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recurringResult.appointments.map((a) => (
                      <Badge key={a.id} className="bg-zinc-800 text-xs">
                        {new Date(a.scheduledAt).toLocaleDateString('pt-BR')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Scheduling AI */}
        <TabsContent value="smart" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-purple-400" />
                IA: Smart Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-zinc-400 text-xs">ID do Paciente *</Label>
                  <Input className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="UUID" value={smartForm.patientId} onChange={(e) => setSmartForm((f) => ({ ...f, patientId: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">ID do Médico (opcional)</Label>
                  <Input className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="UUID" value={smartForm.doctorId ?? ''} onChange={(e) => setSmartForm((f) => ({ ...f, doctorId: e.target.value || undefined }))} />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Complexidade</Label>
                  <select className="mt-1 w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm" value={smartForm.complexity} onChange={(e) => setSmartForm((f) => ({ ...f, complexity: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}>
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>
              </div>
              <Button
                className="bg-purple-700 hover:bg-purple-600"
                disabled={smartSuggestion.isPending}
                onClick={() => {
                  if (!smartForm.patientId) { toast.error('Informe o ID do paciente.'); return; }
                  smartSuggestion.mutate(smartForm, {
                    onSuccess: (r) => { toast.success(`${r.suggestions.length} sugestões geradas pela IA.`); setSmartResult(r); },
                    onError: () => toast.error('Erro ao obter sugestões.'),
                  });
                }}
              >
                {smartSuggestion.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BrainCircuit className="h-4 w-4 mr-2" />}
                Gerar Sugestões
              </Button>

              {smartResult && (
                <div className="space-y-3">
                  <p className="text-zinc-400 text-xs">{smartResult.note}</p>
                  {smartResult.suggestions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                      <div>
                        <p className="text-white font-medium">
                          {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {s.time}
                        </p>
                        <p className="text-zinc-400 text-xs mt-0.5">{s.reason}</p>
                        <p className="text-zinc-500 text-xs">Duração estimada: {s.estimatedDuration} min</p>
                      </div>
                      <div className="text-right">
                        <Badge className={s.score >= 80 ? 'bg-emerald-700' : s.score >= 60 ? 'bg-blue-700' : 'bg-zinc-600'}>
                          Score {s.score}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
