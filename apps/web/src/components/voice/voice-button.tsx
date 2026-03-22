'use client';

import * as React from 'react';
import { Mic, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceStore } from '@/stores/voice.store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type VoiceState = 'idle' | 'listening' | 'processing' | 'complete' | 'error';

interface VoiceButtonProps {
  context?:
    | 'anamnesis'
    | 'evolution'
    | 'prescription'
    | 'triage'
    | 'soap'
    | 'nursing'
    | 'general';
  size?: 'sm' | 'md' | 'lg';
  onTranscriptionUpdate?: (text: string) => void;
  onTranscriptionComplete?: (text: string) => void;
  className?: string;
  showTranscript?: boolean;
}

const sizeMap = {
  sm: { button: 'h-10 w-10', icon: 'h-4 w-4', bars: 'h-3', ring: 'h-12 w-12' },
  md: { button: 'h-14 w-14', icon: 'h-6 w-6', bars: 'h-4', ring: 'h-18 w-18' },
  lg: { button: 'h-20 w-20', icon: 'h-8 w-8', bars: 'h-6', ring: 'h-24 w-24' },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceButton({
  context: _context = 'general',
  size = 'md',
  onTranscriptionUpdate,
  onTranscriptionComplete,
  className,
  showTranscript = false,
}: VoiceButtonProps) {
  const {
    isRecording,
    isProcessing,
    currentTranscription,
    partialText,
    error,
    duration,
    startRecording,
    stopRecording,
    setProcessing,
    setTranscription,
    setError: _setError,
    setDuration,
    reset,
  } = useVoiceStore();

  const [voiceState, setVoiceState] = React.useState<VoiceState>('idle');
  const durationRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const s = sizeMap[size];

  // Derive visual state from store
  React.useEffect(() => {
    if (error) {
      setVoiceState('error');
    } else if (isProcessing) {
      setVoiceState('processing');
    } else if (isRecording) {
      setVoiceState('listening');
    } else if (currentTranscription && voiceState === 'processing') {
      setVoiceState('complete');
      onTranscriptionComplete?.(currentTranscription);
      completeTimeoutRef.current = setTimeout(() => {
        setVoiceState('idle');
      }, 2000);
    }
    return () => {
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
      }
    };
  }, [isRecording, isProcessing, error, currentTranscription]);

  // Partial text callback
  React.useEffect(() => {
    if (partialText) {
      onTranscriptionUpdate?.(partialText);
    }
  }, [partialText, onTranscriptionUpdate]);

  // Duration timer
  React.useEffect(() => {
    if (isRecording) {
      durationRef.current = setInterval(() => {
        setDuration(duration + 1);
      }, 1000);
    } else if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [isRecording, duration, setDuration]);

  // Keyboard shortcut: Space to toggle recording
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        handleToggle();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, voiceState]);

  function handleToggle() {
    if (voiceState === 'error') {
      reset();
      setVoiceState('idle');
      return;
    }
    if (isRecording) {
      stopRecording();
      setProcessing(true);
      // Simulate processing completion (replace with real API call)
      setTimeout(() => {
        setTranscription(
          partialText || 'Paciente relata dor epigástrica há 3 dias...',
        );
      }, 1500);
    } else if (!isProcessing) {
      startRecording();
    }
  }

  const stateConfig: Record<
    VoiceState,
    { bg: string; text: string; label: string; shadow: string }
  > = {
    idle: {
      bg: 'bg-muted-foreground/60 hover:bg-muted-foreground/50 dark:bg-muted dark:hover:bg-muted-foreground',
      text: 'text-white',
      label: '',
      shadow: 'shadow-lg shadow-black/10 dark:shadow-black/50',
    },
    listening: {
      bg: 'bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400',
      text: 'text-white',
      label: 'Escutando...',
      shadow: 'shadow-lg shadow-teal-500/30',
    },
    processing: {
      bg: 'bg-teal-600',
      text: 'text-white',
      label: 'Processando...',
      shadow: 'shadow-lg shadow-teal-500/20',
    },
    complete: {
      bg: 'bg-teal-500',
      text: 'text-white',
      label: 'Pronto!',
      shadow: 'shadow-lg shadow-teal-500/30',
    },
    error: {
      bg: 'bg-red-600 hover:bg-red-700',
      text: 'text-white',
      label: 'Erro — toque para tentar',
      shadow: 'shadow-lg shadow-red-500/30',
    },
  };

  const config = stateConfig[voiceState];

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* CSS animations injected via style tag */}
      <style>{voiceButtonStyles}</style>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center">
              {/* Expanding ring animation for listening state */}
              {voiceState === 'listening' && (
                <>
                  <span
                    className={cn(
                      'voice-ring absolute rounded-full border-2 border-red-500',
                      s.ring,
                    )}
                  />
                  <span
                    className={cn(
                      'voice-ring voice-ring-delay absolute rounded-full border-2 border-red-500',
                      s.ring,
                    )}
                  />
                </>
              )}

              {/* Glow for listening */}
              {voiceState === 'listening' && (
                <span
                  className={cn(
                    'absolute rounded-full bg-red-500/20 blur-xl',
                    size === 'sm' ? 'h-16 w-16' : size === 'md' ? 'h-24 w-24' : 'h-32 w-32',
                  )}
                />
              )}

              <button
                type="button"
                onClick={handleToggle}
                className={cn(
                  'relative z-10 flex items-center justify-center rounded-full shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer',
                  s.button,
                  config.bg,
                  config.text,
                  voiceState === 'idle' && 'voice-idle-pulse',
                )}
                aria-label={
                  isRecording ? 'Parar gravação' : 'Iniciar gravação por voz'
                }
              >
                {voiceState === 'idle' && <Mic className={s.icon} />}
                {voiceState === 'listening' && (
                  <div className="voice-bars flex items-center gap-[2px]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          'voice-bar inline-block w-[3px] rounded-full bg-white',
                          s.bars,
                        )}
                        style={{
                          animationDelay: `${i * 0.12}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                {voiceState === 'processing' && (
                  <Loader2 className={cn(s.icon, 'animate-spin')} />
                )}
                {voiceState === 'complete' && <Check className={s.icon} />}
                {voiceState === 'error' && <X className={s.icon} />}
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Espaço para gravar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* State label */}
      {config.label && (
        <span
          className={cn(
            'text-xs font-medium',
            voiceState === 'listening' && 'text-red-400',
            voiceState === 'processing' && 'text-teal-500 dark:text-teal-400',
            voiceState === 'complete' && 'text-teal-500 dark:text-teal-400',
            voiceState === 'error' && 'text-red-400',
          )}
        >
          {config.label}
        </span>
      )}

      {/* Duration timer for listening */}
      {voiceState === 'listening' && (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDuration(duration)}
        </span>
      )}

      {/* Inline transcript preview */}
      {showTranscript && partialText && voiceState === 'listening' && (
        <div className="mt-2 max-w-xs rounded-lg border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
          {partialText}
        </div>
      )}
    </div>
  );
}

const voiceButtonStyles = `
  @keyframes voice-ring-expand {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  @keyframes voice-bar-bounce {
    0%, 100% {
      transform: scaleY(0.3);
    }
    50% {
      transform: scaleY(1);
    }
  }

  @keyframes voice-idle-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .voice-ring {
    animation: voice-ring-expand 1.5s ease-out infinite;
  }

  .voice-ring-delay {
    animation-delay: 0.75s;
  }

  .voice-bar {
    animation: voice-bar-bounce 0.6s ease-in-out infinite;
    transform-origin: center bottom;
  }

  .voice-idle-pulse {
    animation: voice-idle-pulse 3s ease-in-out infinite;
  }
`;
