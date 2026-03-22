'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VoiceTranscriptOverlayProps {
  isVisible: boolean;
  text: string;
  onClose: () => void;
  className?: string;
}

export function VoiceTranscriptOverlay({
  isVisible,
  text,
  onClose,
  className,
}: VoiceTranscriptOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm',
        'animate-in fade-in-0 duration-200',
        className,
      )}
    >
      <style>{overlayStyles}</style>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute right-4 top-4 text-white/70 hover:text-white hover:bg-white/10"
        aria-label="Fechar"
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6">
        {/* Listening indicator */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-teal-400">
            Escutando
          </span>
          <span className="transcript-dots text-teal-400">
            <span className="transcript-dot">.</span>
            <span className="transcript-dot">.</span>
            <span className="transcript-dot">.</span>
          </span>
        </div>

        {/* Transcript text */}
        <ScrollArea className="max-h-[60vh]">
          <p className="transcript-text text-center text-2xl font-light leading-relaxed text-white">
            {text || (
              <span className="text-white/40">
                Comece a falar...
              </span>
            )}
          </p>
        </ScrollArea>

        {/* Subtle hint */}
        <p className="text-xs text-white/30">
          Pressione Espaço para parar a gravação
        </p>
      </div>
    </div>
  );
}

const overlayStyles = `
  @keyframes transcript-dot-blink {
    0%, 20% { opacity: 0; }
    40% { opacity: 1; }
    60%, 100% { opacity: 0; }
  }

  .transcript-dot {
    display: inline-block;
    animation: transcript-dot-blink 1.4s ease-in-out infinite;
    font-size: 1.25rem;
    line-height: 1;
  }

  .transcript-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .transcript-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  .transcript-text {
    animation: transcript-fade-in 0.3s ease-out;
  }

  @keyframes transcript-fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
