import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import VideoCall from '@/components/medical/video-call';
import { useRoomToken, useDeleteRoom } from '@/services/telemedicine.service';
import { PageError } from '@/components/common/page-error';

export default function TelemedicineRoomPage() {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();

  const {
    data: tokenData,
    isLoading,
    error,
  } = useRoomToken(roomName ?? '');

  const deleteRoom = useDeleteRoom();

  async function handleEndCall() {
    if (!roomName) return;

    try {
      await deleteRoom.mutateAsync(roomName);
      toast.success('Teleconsulta encerrada.');
    } catch {
      toast.error('Erro ao encerrar a sala.');
    } finally {
      navigate('/telemedicina');
    }
  }

  if (!roomName) {
    return <PageError message="Nome da sala n\u00e3o informado." />;
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Conectando \u00e0 sala...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <PageError message="N\u00e3o foi poss\u00edvel obter o token da sala. A sala pode ter sido encerrada." />
    );
  }

  return (
    <div className="space-y-4">
      <VideoCall
        patientName={tokenData?.identity ?? 'Paciente'}
        roomUrl={tokenData?.token}
        onEnd={handleEndCall}
      />
    </div>
  );
}
