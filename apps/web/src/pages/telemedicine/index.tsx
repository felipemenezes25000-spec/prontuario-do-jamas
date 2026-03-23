import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppointments } from '@/services/appointments.service';
import { useCreateRoom } from '@/services/telemedicine.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Appointment } from '@/types';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  SCHEDULED: { label: 'Agendado', variant: 'secondary' },
  CONFIRMED: { label: 'Confirmado', variant: 'default' },
  WAITING: { label: 'Aguardando', variant: 'outline' },
  IN_PROGRESS: { label: 'Em andamento', variant: 'default' },
};

export default function TelemedicinePage() {
  const navigate = useNavigate();
  const [startingRoomFor, setStartingRoomFor] = useState<string | null>(null);

  const { data: appointmentsData, isLoading, error } = useAppointments({
    type: 'TELEMEDICINE',
    status: 'CONFIRMED',
    limit: 50,
  });

  const createRoom = useCreateRoom();

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message="Erro ao carregar teleconsultas." />;

  const appointments = appointmentsData?.data ?? [];

  async function handleStartCall(appointment: Appointment) {
    if (!appointment.doctorId || !appointment.patientId) {
      toast.error('Consulta sem paciente ou m\u00e9dico associado.');
      return;
    }

    setStartingRoomFor(appointment.id);
    try {
      const room = await createRoom.mutateAsync({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      });
      navigate(`/telemedicina/${room.roomName}`);
    } catch {
      toast.error('Erro ao criar sala de teleconsulta.');
    } finally {
      setStartingRoomFor(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Telemedicina</h1>
          <p className="text-muted-foreground">
            Consultas por v\u00eddeo agendadas
          </p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma teleconsulta agendada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              As consultas do tipo telemedicina aparecer\u00e3o aqui quando confirmadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appointments.map((appointment) => {
            const isStarting = startingRoomFor === appointment.id;
            const statusInfo = statusConfig[appointment.status] ?? {
              label: appointment.status,
              variant: 'secondary' as const,
            };

            return (
              <Card key={appointment.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {appointment.patient?.name ?? 'Paciente'}
                    </CardTitle>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(appointment.scheduledAt), "dd/MM/yyyy '\u00e0s' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span>{appointment.duration} min</span>
                    </div>
                    {appointment.doctor && (
                      <p>
                        Dr(a). {appointment.doctor.name}
                      </p>
                    )}
                    {appointment.notes && (
                      <div className="flex items-start gap-2 pt-1">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{appointment.notes}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleStartCall(appointment)}
                    disabled={isStarting}
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando sala...
                      </>
                    ) : (
                      <>
                        <Video className="mr-2 h-4 w-4" />
                        Iniciar Consulta
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
