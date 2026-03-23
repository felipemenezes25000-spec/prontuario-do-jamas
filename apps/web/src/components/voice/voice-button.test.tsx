import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceButton } from './voice-button';

// Mock the useVoice hook
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockCancelRecording = vi.fn();
const mockClearTranscription = vi.fn();

let mockVoiceState = {
  status: 'idle' as string,
  isRecording: false,
  isProcessing: false,
  currentTranscription: '',
  partialTranscription: '',
  structuredData: null as Record<string, unknown> | null,
  error: null as string | null,
  duration: 0,
  startRecording: mockStartRecording,
  stopRecording: mockStopRecording,
  cancelRecording: mockCancelRecording,
  clearTranscription: mockClearTranscription,
};

vi.mock('@/hooks/use-voice', () => ({
  useVoice: () => mockVoiceState,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function resetVoiceState() {
  mockVoiceState = {
    status: 'idle',
    isRecording: false,
    isProcessing: false,
    currentTranscription: '',
    partialTranscription: '',
    structuredData: null,
    error: null,
    duration: 0,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    cancelRecording: mockCancelRecording,
    clearTranscription: mockClearTranscription,
  };
}

describe('VoiceButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVoiceState();
  });

  it('renders in idle state with mic icon and correct aria-label', () => {
    render(<VoiceButton />);
    const button = screen.getByRole('button', { name: 'Iniciar gravação por voz' });
    expect(button).toBeInTheDocument();
  });

  it('calls startRecording when clicked in idle state', () => {
    render(<VoiceButton />);
    const button = screen.getByRole('button', { name: 'Iniciar gravação por voz' });
    fireEvent.click(button);
    expect(mockStartRecording).toHaveBeenCalledOnce();
  });

  it('renders listening label when isRecording is true', () => {
    mockVoiceState.isRecording = true;
    render(<VoiceButton />);
    expect(screen.getByText('Escutando...')).toBeInTheDocument();
  });

  it('shows duration timer in listening state', () => {
    mockVoiceState.isRecording = true;
    mockVoiceState.duration = 65;
    render(<VoiceButton />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('shows aria-label "Parar gravação" when recording', () => {
    mockVoiceState.isRecording = true;
    render(<VoiceButton />);
    expect(
      screen.getByRole('button', { name: 'Parar gravação' }),
    ).toBeInTheDocument();
  });

  it('calls stopRecording when clicked while recording', () => {
    mockVoiceState.isRecording = true;
    render(<VoiceButton />);
    const button = screen.getByRole('button', { name: 'Parar gravação' });
    fireEvent.click(button);
    expect(mockStopRecording).toHaveBeenCalledOnce();
  });

  it('renders processing label when isProcessing is true', () => {
    mockVoiceState.isProcessing = true;
    render(<VoiceButton />);
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('renders error label when error exists', () => {
    mockVoiceState.error = 'Microphone failed';
    render(<VoiceButton />);
    expect(screen.getByText('Erro — toque para tentar')).toBeInTheDocument();
  });

  it('calls clearTranscription when clicked in error state', () => {
    mockVoiceState.error = 'Microphone failed';
    render(<VoiceButton />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockClearTranscription).toHaveBeenCalledOnce();
  });

  it('shows partial transcript when showTranscript is true and listening', () => {
    mockVoiceState.isRecording = true;
    mockVoiceState.partialTranscription = 'Paciente relata dor...';
    render(<VoiceButton showTranscript />);
    expect(screen.getByText('Paciente relata dor...')).toBeInTheDocument();
  });

  it('does not show partial transcript when showTranscript is false', () => {
    mockVoiceState.isRecording = true;
    mockVoiceState.partialTranscription = 'Paciente relata dor...';
    render(<VoiceButton showTranscript={false} />);
    expect(screen.queryByText('Paciente relata dor...')).not.toBeInTheDocument();
  });

  it('formats duration correctly for 0 seconds', () => {
    mockVoiceState.isRecording = true;
    mockVoiceState.duration = 0;
    render(<VoiceButton />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<VoiceButton className="my-custom-class" />);
    expect(container.firstElementChild).toHaveClass('my-custom-class');
  });
});
