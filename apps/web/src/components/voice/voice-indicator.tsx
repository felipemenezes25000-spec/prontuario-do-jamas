'use client';

import { cn } from '@/lib/utils';

interface VoiceIndicatorProps {
  isRecording: boolean;
  duration?: number;
  className?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceIndicator({
  isRecording,
  duration = 0,
  className,
}: VoiceIndicatorProps) {
  if (!isRecording) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1',
        className,
      )}
    >
      <style>{indicatorStyles}</style>
      <span className="voice-indicator-dot h-2 w-2 rounded-full bg-red-500" />
      <span className="text-xs font-semibold text-red-400">REC</span>
      {duration > 0 && (
        <span className="font-mono text-xs text-red-400/70">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}

const indicatorStyles = `
  @keyframes voice-indicator-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .voice-indicator-dot {
    animation: voice-indicator-pulse 1s ease-in-out infinite;
  }
`;
