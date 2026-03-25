import { useState } from 'react';
import {
  Video,
  Users,
  AlertTriangle,
  Monitor,
  MessageSquare,
  Activity,
  UserPlus,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  useWaitingRoom,
  useAdmitPatient,
  useAsyncConsultations,
  useCreateAsyncConsultation,
  useRpmAlerts,
  useDetectUrgency,
  useRoomParticipants,
  useAddParticipant,
  type UrgencyDetectionResult,
} from '@/services/telemedicine-enhanced.service';

const severityColors: Record<string, string> = {
  LOW: 'bg-blue-600',
  MEDIUM: 'bg-yellow-600',
  HIGH: 'bg-orange-600',
  CRITICAL: 'bg-red-600',
};

export default function TelemedicineEnhancedPage() {
  const [activeTab, setActiveTab] = useState('waiting-room');
  const [roomName] = useState('sala-principal');
  const [showAsyncDialog, setShowAsyncDialog] = useState(false);
  const [asyncForm, setAsyncForm] = useState({ specialty: '', description: '' });

  const { data: waitingRoom = [] } = useWaitingRoom(roomName);
  const admitPatient = useAdmitPatient();
  const { data: asyncData } = useAsyncConsultations({ page: 1 });
  const createAsync = useCreateAsyncConsultation();
  const { data: alertsData } = useRpmAlerts({ page: 1 });
  const detectUrgency = useDetectUrgency();
  const { data: participants = [] } = useRoomParticipants(roomName);
  const addParticipant = useAddParticipant(roomName);

  const [urgencyResult, setUrgencyResult] = useState<UrgencyDetectionResult | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [participantForm, setParticipantForm] = useState({ participantName: '', role: 'OBSERVER', email: '' });

  async function handleAdmit(waitingId: string) {
    try {
      await admitPatient.mutateAsync(waitingId);
      toast.success('Paciente admitido na teleconsulta.');
    } catch {
      toast.error('Erro ao admitir paciente.');
    }
  }

  async function handleCreateAsync() {
    if (!asyncForm.specialty || !asyncForm.description) {
      toast.error('Preencha todos os campos.');
      return;
    }
    try {
      await createAsync.mutateAsync(asyncForm);
      toast.success('Teleconsulta assíncrona criada.');
      setShowAsyncDialog(false);
      setAsyncForm({ specialty: '', description: '' });
    } catch {
      toast.error('Erro ao criar teleconsulta.');
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Telemedicina Avançada</h1>
          <p className="text-zinc-400">Sala de espera virtual, RPM, teleconsulta assíncrona e interconsultas</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-white">{waitingRoom.length}</p>
                <p className="text-xs text-zinc-400">Na sala de espera</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{asyncData?.total ?? 0}</p>
                <p className="text-xs text-zinc-400">Consultas assíncronas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-white">{alertsData?.total ?? 0}</p>
                <p className="text-xs text-zinc-400">Alertas RPM</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Monitor className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-zinc-400">Salas ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800">
          <TabsTrigger value="waiting-room">Sala de Espera</TabsTrigger>
          <TabsTrigger value="async">Assíncrona</TabsTrigger>
          <TabsTrigger value="rpm">RPM / Alertas</TabsTrigger>
          <TabsTrigger value="d2d">Interconsulta</TabsTrigger>
          <TabsTrigger value="urgency">IA: Urgência</TabsTrigger>
          <TabsTrigger value="participants">Participantes</TabsTrigger>
        </TabsList>

        <TabsContent value="waiting-room" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                Sala de Espera Virtual — {roomName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {waitingRoom.length === 0 ? (
                <p className="text-zinc-400 text-center py-8">Nenhum paciente na sala de espera.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">#</TableHead>
                      <TableHead className="text-zinc-400">Paciente</TableHead>
                      <TableHead className="text-zinc-400">Tempo de Espera</TableHead>
                      <TableHead className="text-zinc-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitingRoom.map((entry) => (
                      <TableRow key={entry.waitingId} className="border-zinc-800">
                        <TableCell className="text-white font-bold">{entry.position}</TableCell>
                        <TableCell className="text-white">{entry.patientName}</TableCell>
                        <TableCell className="text-zinc-300">{entry.waitTime} min</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAdmit(entry.waitingId)}
                          >
                            <Video className="h-4 w-4 mr-1" />
                            Admitir
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

        <TabsContent value="async" className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAsyncDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Nova Teleconsulta Assíncrona
            </Button>
          </div>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white">Teleconsultas Assíncronas (Store-and-Forward)</CardTitle>
            </CardHeader>
            <CardContent>
              {(!asyncData?.data || asyncData.data.length === 0) ? (
                <p className="text-zinc-400 text-center py-8">Nenhuma teleconsulta assíncrona.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Especialidade</TableHead>
                      <TableHead className="text-zinc-400">Paciente</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asyncData.data.map((c) => (
                      <TableRow key={c.consultationId} className="border-zinc-800">
                        <TableCell className="text-white">{c.specialty}</TableCell>
                        <TableCell className="text-zinc-300">{c.patientName ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className={c.status === 'RESPONDED' ? 'bg-emerald-600' : 'bg-yellow-600'}>
                            {c.status === 'RESPONDED' ? 'Respondida' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rpm" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Alertas de Monitoramento Remoto (RPM)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!alertsData?.data || alertsData.data.length === 0) ? (
                <p className="text-zinc-400 text-center py-8">Nenhum alerta de RPM.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Severidade</TableHead>
                      <TableHead className="text-zinc-400">Paciente</TableHead>
                      <TableHead className="text-zinc-400">Métrica</TableHead>
                      <TableHead className="text-zinc-400">Valor</TableHead>
                      <TableHead className="text-zinc-400">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsData.data.map((alert) => (
                      <TableRow key={alert.alertId} className="border-zinc-800">
                        <TableCell>
                          <Badge className={severityColors[alert.severity] ?? 'bg-zinc-600'}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">{alert.patientName ?? '—'}</TableCell>
                        <TableCell className="text-zinc-300">{alert.metric}</TableCell>
                        <TableCell className="text-white font-bold">{alert.value}</TableCell>
                        <TableCell className="text-zinc-300">{new Date(alert.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="d2d" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-500" />
                Interconsultas Médico-Médico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-center py-8">
                Solicite tele-ECG, tele-derma, tele-AVC e outras interconsultas especializadas diretamente do atendimento.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" className="border-zinc-700">Tele-ECG</Button>
                <Button variant="outline" className="border-zinc-700">Tele-Derma</Button>
                <Button variant="outline" className="border-zinc-700">Tele-AVC</Button>
                <Button variant="outline" className="border-zinc-700">Geral</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IA: Urgency Detection */}
        <TabsContent value="urgency" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                IA: Detecção de Urgência em Teleconsulta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400 text-sm">
                A IA analisa sinais visuais (palidez, dificuldade respiratória, expressão de dor) em tempo real durante a teleconsulta.
              </p>
              <div className="flex gap-3">
                <Input
                  className="bg-zinc-800 border-zinc-700 text-white flex-1"
                  placeholder="ID da sessão / documento (UUID)"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                />
                <Button
                  className="bg-red-700 hover:bg-red-600 text-white"
                  disabled={detectUrgency.isPending || !sessionId.trim()}
                  onClick={() => {
                    detectUrgency.mutate(sessionId, {
                      onSuccess: (r) => { setUrgencyResult(r); toast.warning(`Urgência detectada: ${r.urgencyLevel}`); },
                      onError: () => toast.error('Erro ao analisar urgência.'),
                    });
                  }}
                >
                  {detectUrgency.isPending
                    ? <span className="flex items-center gap-1"><Monitor className="h-4 w-4 animate-pulse" /> Analisando...</span>
                    : <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Analisar</span>}
                </Button>
              </div>

              {urgencyResult && (
                <div className={`p-4 rounded-lg border space-y-3 ${
                  urgencyResult.urgencyLevel === 'CRITICAL' ? 'bg-red-900/30 border-red-700' :
                  urgencyResult.urgencyLevel === 'HIGH' ? 'bg-orange-900/30 border-orange-700' :
                  urgencyResult.urgencyLevel === 'MEDIUM' ? 'bg-yellow-900/30 border-yellow-700' :
                  'bg-zinc-800 border-zinc-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold text-lg">Paciente: {urgencyResult.patientName}</p>
                    <Badge className={
                      urgencyResult.urgencyLevel === 'CRITICAL' ? 'bg-red-600 text-white text-sm px-3 py-1' :
                      urgencyResult.urgencyLevel === 'HIGH' ? 'bg-orange-600 text-white text-sm px-3 py-1' :
                      urgencyResult.urgencyLevel === 'MEDIUM' ? 'bg-yellow-600 text-white text-sm px-3 py-1' :
                      'bg-zinc-600 text-white text-sm px-3 py-1'
                    }>
                      {urgencyResult.urgencyLevel} — {(urgencyResult.urgencyScore * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-white font-medium">{urgencyResult.recommendation}</p>
                  {urgencyResult.detectedSignals.length > 0 && (
                    <div>
                      <p className="text-zinc-400 text-xs mb-1">Sinais detectados:</p>
                      <div className="flex flex-wrap gap-2">
                        {urgencyResult.detectedSignals.map((s) => (
                          <Badge key={s} className="bg-red-900 text-red-200 text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-zinc-500 text-xs italic">{urgencyResult.disclaimer}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-participant */}
        <TabsContent value="participants" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-500" />
                Participantes — Sala: {roomName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-zinc-400 text-xs">Nome do Participante</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    placeholder="Dr. João Silva"
                    value={participantForm.participantName}
                    onChange={(e) => setParticipantForm((p) => ({ ...p, participantName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Papel</Label>
                  <select
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm"
                    value={participantForm.role}
                    onChange={(e) => setParticipantForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="DOCTOR">Médico</option>
                    <option value="SPECIALIST">Especialista</option>
                    <option value="NURSE">Enfermeiro(a)</option>
                    <option value="OBSERVER">Observador</option>
                    <option value="FAMILY">Familiar</option>
                    <option value="INTERPRETER">Intérprete</option>
                  </select>
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">E-mail (opcional)</Label>
                  <Input
                    type="email"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    value={participantForm.email}
                    onChange={(e) => setParticipantForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={addParticipant.isPending || !participantForm.participantName}
                onClick={() => {
                  addParticipant.mutate(
                    { participantName: participantForm.participantName, role: participantForm.role, email: participantForm.email || undefined },
                    {
                      onSuccess: (r) => { toast.success(`${r.participant} adicionado. Token: ${r.token}`); setParticipantForm({ participantName: '', role: 'OBSERVER', email: '' }); },
                      onError: () => toast.error('Erro ao adicionar participante.'),
                    },
                  );
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Participante
              </Button>

              {participants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Nome</TableHead>
                      <TableHead className="text-zinc-400">Papel</TableHead>
                      <TableHead className="text-zinc-400">Entrada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((p) => (
                      <TableRow key={p.id} className="border-zinc-800">
                        <TableCell className="text-white">{p.participantName}</TableCell>
                        <TableCell>
                          <Badge className="bg-zinc-700 text-xs">{p.role}</Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300 text-xs">
                          {new Date(p.joinedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-zinc-400 text-center py-4 text-sm">Nenhum participante adicionado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Async Consultation Dialog */}
      <Dialog open={showAsyncDialog} onOpenChange={setShowAsyncDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Teleconsulta Assíncrona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Especialidade</Label>
              <Input
                className="bg-zinc-800 border-zinc-700 text-white"
                value={asyncForm.specialty}
                onChange={(e) => setAsyncForm((p) => ({ ...p, specialty: e.target.value }))}
                placeholder="Ex: Dermatologia"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Descrição dos sintomas</Label>
              <Textarea
                className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                value={asyncForm.description}
                onChange={(e) => setAsyncForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descreva os sintomas e anexe fotos..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700" onClick={() => setShowAsyncDialog(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateAsync}>
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
