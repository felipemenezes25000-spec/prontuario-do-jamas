import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Video,
  Users,
  Activity,
  MessageSquare,
  Clock,
  CheckCircle2,
  Phone,
  UserPlus,
  Mic,
  Send,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useWaitingRoom,
  useAdmitPatient,
  useAsyncConsultations,
  useCreateAsyncConsultation,
  useRpmAlerts,
  useRequestDoctorConsult,
  type RpmAlert,
} from '@/services/telemedicine-enhanced.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const URGENCY_COLORS: Record<string, string> = {
  LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const URGENCY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const SPECIALTIES = [
  'Cardiologia',
  'Neurologia',
  'Dermatologia',
  'Ortopedia',
  'Psiquiatria',
  'Endocrinologia',
  'Pneumologia',
  'Nefrologia',
];

// ─── Waiting Room Tab ───────────────────────────────────────────────────────

function WaitingRoomTab() {
  const [roomName] = useState('default');
  const { data: entries, isLoading } = useWaitingRoom(roomName);
  const admitPatient = useAdmitPatient();
  const [recordingConsent, setRecordingConsent] = useState<Record<string, boolean>>({});

  const handleAdmit = useCallback((waitingId: string) => {
    admitPatient.mutate(waitingId, {
      onSuccess: () => toast.success('Paciente admitido na teleconsulta'),
      onError: () => toast.error('Erro ao admitir paciente'),
    });
  }, [admitPatient]);

  const toggleConsent = useCallback((waitingId: string) => {
    setRecordingConsent((prev) => ({ ...prev, [waitingId]: !prev[waitingId] }));
  }, []);

  const waitingList = entries ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">{waitingList.length}</p>
            <p className="text-sm text-muted-foreground">Pacientes Aguardando</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">
              {waitingList.length > 0
                ? Math.round(waitingList.reduce((sum, e) => sum + e.waitTime, 0) / waitingList.length)
                : 0}
              min
            </p>
            <p className="text-sm text-muted-foreground">Tempo Médio de Espera</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold text-blue-400">{roomName}</p>
            <p className="text-sm text-muted-foreground">Sala Virtual</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando sala de espera...</div>
      ) : waitingList.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <Users className="h-10 w-10 text-emerald-400" />
          <p>Nenhum paciente na sala de espera</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Tempo de Espera</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Gravação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waitingList.map((entry) => (
                <TableRow key={entry.waitingId}>
                  <TableCell className="font-mono text-sm">{entry.position}</TableCell>
                  <TableCell className="font-medium text-sm">{entry.patientName}</TableCell>
                  <TableCell>
                    <Badge variant={entry.waitTime > 30 ? 'destructive' : 'secondary'}>
                      <Clock className="h-3 w-3 mr-1" />
                      {entry.waitTime} min
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(entry.joinedAt).toLocaleTimeString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={recordingConsent[entry.waitingId] ? 'default' : 'outline'}
                      onClick={() => toggleConsent(entry.waitingId)}
                    >
                      <Mic className="h-3 w-3 mr-1" />
                      {recordingConsent[entry.waitingId] ? 'Consentimento OK' : 'Gravar Consulta'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleAdmit(entry.waitingId)}
                      disabled={admitPatient.isPending}
                    >
                      <Video className="h-3 w-3 mr-1" />
                      Iniciar Consulta
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── RPM Tab ────────────────────────────────────────────────────────────────

function RpmTab() {
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const { data: alertsData, isLoading } = useRpmAlerts({ acknowledged: showAcknowledged ? undefined : false });

  const alerts: RpmAlert[] = alertsData?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Remote Patient Monitoring</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAcknowledged(!showAcknowledged)}
        >
          {showAcknowledged ? 'Mostrar Pendentes' : 'Mostrar Todos'}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando alertas RPM...</div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p>Nenhum alerta pendente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const urgency = URGENCY_COLORS[alert.severity] ?? URGENCY_COLORS.LOW;
            return (
              <Card key={alert.alertId} className={`border ${urgency}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{alert.patientName ?? 'Paciente'}</span>
                          <Badge variant="outline" className="text-xs">
                            {URGENCY_LABELS[alert.severity] ?? alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <strong>{alert.metric}:</strong> {alert.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {alert.acknowledged && (
                      <Badge variant="default">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Reconhecido
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Teleconsultoria D2D Tab ────────────────────────────────────────────────

function TeleconsultoriaTab() {
  const { data: consultData, isLoading } = useAsyncConsultations();
  const createConsult = useCreateAsyncConsultation();
  const requestD2D = useRequestDoctorConsult();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [d2dDialogOpen, setD2dDialogOpen] = useState(false);
  const [d2dSpecialty, setD2dSpecialty] = useState('');
  const [d2dQuestion, setD2dQuestion] = useState('');
  const [d2dUrgency, setD2dUrgency] = useState('MEDIUM');

  const consultations = consultData?.data ?? [];

  const handleCreateConsult = useCallback(() => {
    if (!specialty || !description.trim()) {
      toast.warning('Preencha todos os campos');
      return;
    }
    createConsult.mutate(
      { specialty, description: description.trim() },
      {
        onSuccess: () => {
          toast.success('Consulta assíncrona criada');
          setDialogOpen(false);
          setSpecialty('');
          setDescription('');
        },
        onError: () => toast.error('Erro ao criar consulta'),
      },
    );
  }, [specialty, description, createConsult]);

  const handleRequestD2D = useCallback(() => {
    if (!d2dSpecialty || !d2dQuestion.trim()) {
      toast.warning('Preencha todos os campos');
      return;
    }
    requestD2D.mutate(
      {
        encounterId: '',
        targetSpecialty: d2dSpecialty,
        consultType: 'ASYNC',
        urgency: d2dUrgency,
        clinicalQuestion: d2dQuestion.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Solicitação de parecer enviada');
          setD2dDialogOpen(false);
          setD2dSpecialty('');
          setD2dQuestion('');
          setD2dUrgency('MEDIUM');
        },
        onError: () => toast.error('Erro ao solicitar parecer'),
      },
    );
  }, [d2dSpecialty, d2dQuestion, d2dUrgency, requestD2D]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <MessageSquare className="h-4 w-4 mr-1" />
              Nova Consulta Assíncrona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Consulta Assíncrona</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Especialidade</Label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Descrição Clínica</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o caso clínico..."
                  rows={4}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateConsult}
                disabled={createConsult.isPending}
              >
                {createConsult.isPending ? 'Criando...' : 'Criar Consulta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={d2dDialogOpen} onOpenChange={setD2dDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-1" />
              Solicitar Parecer (D2D)
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Teleconsultoria Médico-Médico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Especialidade Alvo</Label>
                <Select value={d2dSpecialty} onValueChange={setD2dSpecialty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Urgência</Label>
                <Select value={d2dUrgency} onValueChange={setD2dUrgency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="MEDIUM">Média</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Pergunta Clínica</Label>
                <Textarea
                  value={d2dQuestion}
                  onChange={(e) => setD2dQuestion(e.target.value)}
                  placeholder="Qual a sua dúvida clínica?"
                  rows={4}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleRequestD2D}
                disabled={requestD2D.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                {requestD2D.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando consultas...</div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma consulta assíncrona</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Especialidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resposta</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultations.map((c) => (
                <TableRow key={c.consultationId}>
                  <TableCell className="font-medium text-sm">{c.specialty}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{c.description}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {c.status === 'COMPLETED' ? 'Respondida' : c.status === 'PENDING' ? 'Pendente' : c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.hasResponse ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function TelemedicineEnhancedPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Video className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Telemedicina Avançada</h1>
          <p className="text-sm text-muted-foreground">
            Sala de espera virtual, teleconsulta com gravação, RPM e teleconsultoria D2D
          </p>
        </div>
      </div>

      <Tabs defaultValue="waiting-room" className="space-y-4">
        <TabsList>
          <TabsTrigger value="waiting-room" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sala de Espera
          </TabsTrigger>
          <TabsTrigger value="rpm" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            RPM
          </TabsTrigger>
          <TabsTrigger value="teleconsultoria" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Teleconsultoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waiting-room">
          <WaitingRoomTab />
        </TabsContent>
        <TabsContent value="rpm">
          <RpmTab />
        </TabsContent>
        <TabsContent value="teleconsultoria">
          <TeleconsultoriaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
