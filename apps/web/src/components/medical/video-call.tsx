import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface VideoCallProps {
  patientName: string;
  roomUrl?: string;
  onEnd?: () => void;
}

export default function VideoCall({ patientName, roomUrl, onEnd }: VideoCallProps) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <CardTitle className="text-lg">Teleconsulta</CardTitle>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Paciente: <span className="font-medium text-foreground">{patientName}</span>
          </span>
          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
            {formatTime(elapsed)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Video area */}
        <div className="relative bg-zinc-900 aspect-video flex items-center justify-center">
          {cameraOn ? (
            <div className="text-center text-zinc-400">
              <svg
                className="mx-auto h-20 w-20 mb-4 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
              <p className="text-sm">
                {roomUrl
                  ? 'Conectando ao vídeo...'
                  : 'Modo demonstração — vídeo não conectado'}
              </p>
              {roomUrl && (
                <p className="text-xs text-zinc-500 mt-1">{roomUrl}</p>
              )}
            </div>
          ) : (
            <div className="text-center text-zinc-500">
              <svg
                className="mx-auto h-16 w-16 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25v-9a2.25 2.25 0 012.25-2.25H12M3.67 3.67l16.66 16.66"
                />
              </svg>
              <p className="text-sm">Camera desligada</p>
            </div>
          )}

          {/* Mini self-view */}
          <div className="absolute bottom-4 right-4 w-40 h-28 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center">
            <span className="text-xs text-zinc-500">Você</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 p-4 bg-zinc-950">
          <Button
            variant={micOn ? 'secondary' : 'destructive'}
            size="lg"
            className="rounded-full h-12 w-12 p-0"
            onClick={() => setMicOn((v) => !v)}
            title={micOn ? 'Desligar microfone' : 'Ligar microfone'}
          >
            {micOn ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3.67 3.67l16.66 16.66" />
              </svg>
            )}
          </Button>

          <Button
            variant={cameraOn ? 'secondary' : 'destructive'}
            size="lg"
            className="rounded-full h-12 w-12 p-0"
            onClick={() => setCameraOn((v) => !v)}
            title={cameraOn ? 'Desligar câmera' : 'Ligar câmera'}
          >
            {cameraOn ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25v-9a2.25 2.25 0 012.25-2.25H12M3.67 3.67l16.66 16.66" />
              </svg>
            )}
          </Button>

          <Button
            variant={screenSharing ? 'default' : 'secondary'}
            size="lg"
            className="rounded-full h-12 w-12 p-0"
            onClick={() => setScreenSharing((v) => !v)}
            title={screenSharing ? 'Parar compartilhamento' : 'Compartilhar tela'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
            </svg>
          </Button>

          <div className="w-px h-8 bg-zinc-700 mx-2" />

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full px-6"
            onClick={onEnd}
          >
            Encerrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
