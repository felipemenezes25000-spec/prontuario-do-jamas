import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VoiceWaveformProps {
  isActive: boolean;
  stream?: MediaStream | null;
  barCount?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function VoiceWaveform({
  isActive,
  stream,
  barCount = 40,
  height = 48,
  color = 'teal',
  className,
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Real waveform from MediaStream
  useEffect(() => {
    if (!stream || !canvasRef.current || !isActive) return;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    const drawWidth = canvas.offsetWidth;
    const drawHeight = canvas.offsetHeight;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx!.clearRect(0, 0, drawWidth, drawHeight);

      const gap = 2;
      const barWidth = (drawWidth - (barCount - 1) * gap) / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i + 2) * (bufferLength / (barCount + 4)));
        const value = dataArray[dataIndex] ?? 0;
        const barHeight = Math.max(2, (value / 255) * drawHeight * 0.9);

        const x = i * (barWidth + gap);
        const y = (drawHeight - barHeight) / 2;

        const gradient = ctx!.createLinearGradient(x, drawHeight, x, 0);
        gradient.addColorStop(0, '#14b8a6'); // teal-500
        gradient.addColorStop(1, '#06b6d4'); // cyan-500

        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx!.fill();
      }
    }
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      audioCtx.close();
      audioCtxRef.current = null;
    };
  }, [stream, isActive, barCount]);

  // If we have a real stream, use canvas
  if (stream && isActive) {
    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width: '100%', maxWidth: '320px', height: `${height}px` }}
      />
    );
  }

  // Fallback: CSS-animated bars (no real audio data)
  return (
    <div
      className={cn('flex items-center justify-center gap-[2px]', className)}
      style={{ height: `${height}px` }}
      role="img"
      aria-label={isActive ? 'Captando audio' : 'Audio inativo'}
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
