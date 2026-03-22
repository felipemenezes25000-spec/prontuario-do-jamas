'use client';

import { cn } from '@/lib/utils';

interface VoiceWaveformProps {
  isActive: boolean;
  barCount?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function VoiceWaveform({
  isActive,
  barCount = 40,
  height = 48,
  color = 'teal',
  className,
}: VoiceWaveformProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-[2px]', className)}
      style={{ height: `${height}px` }}
      role="img"
      aria-label={isActive ? 'Captando áudio' : 'Áudio inativo'}
    >
      <style>{waveformStyles}</style>
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'waveform-bar inline-block rounded-full transition-all duration-300',
            isActive ? 'waveform-bar-active' : 'waveform-bar-inactive',
          )}
          style={{
            width: '2px',
            height: isActive ? undefined : '4px',
            animationDelay: isActive ? `${(i * 0.08) % 1.2}s` : undefined,
            background: isActive
              ? `linear-gradient(to top, var(--color-${color}-600, #059669), var(--color-${color}-400, #34d399))`
              : `var(--color-${color}-800, #065f46)`,
          }}
        />
      ))}
    </div>
  );
}

const waveformStyles = `
  @keyframes waveform-bounce {
    0%, 100% {
      height: 4px;
    }
    25% {
      height: var(--waveform-max-h, 32px);
    }
    50% {
      height: 8px;
    }
    75% {
      height: calc(var(--waveform-max-h, 32px) * 0.6);
    }
  }

  .waveform-bar-active {
    animation: waveform-bounce 0.8s ease-in-out infinite;
    --waveform-max-h: 32px;
  }

  .waveform-bar-active:nth-child(odd) {
    --waveform-max-h: 40px;
    animation-duration: 0.7s;
  }

  .waveform-bar-active:nth-child(3n) {
    --waveform-max-h: 24px;
    animation-duration: 0.9s;
  }

  .waveform-bar-active:nth-child(5n) {
    --waveform-max-h: 36px;
    animation-duration: 0.65s;
  }

  .waveform-bar-inactive {
    height: 4px;
  }
`;
