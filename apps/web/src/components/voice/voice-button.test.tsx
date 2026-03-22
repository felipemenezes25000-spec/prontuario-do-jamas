import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceButton } from './voice-button';

// Mock the voice store
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockSetProcessing = vi.fn();
const mockSetTranscription = vi.fn();
const mockSetError = vi.fn();
const mockSetDuration = vi.fn();
const mockReset = vi.fn();

let mockStoreState = {
  isRecording: false,
  isProcessing: false,
  currentTranscription: '',
  partialText: '',
  error: null as string | null,
  duration: 0,
  startRecording: mockStartRecording,
  stopRecording: mockStopRecording,
  setProcessing: mockSetProcessing,
  setTranscription: mockSetTranscription,
  setError: mockSetError,
  setDuration: mockSetDuration,
  reset: mockReset,
};

vi.mock('@/stores/voice.store', () => ({
  useVoiceStore: () => mockStoreState,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function resetStore() {
  mockStoreState = {
    isRecording: false,
    isProcessing: false,
    currentTranscription: '',
    partialText: '',
    error: null,
    duration: 0,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    setProcessing: mockSetProcessing,
    setTranscription: mockSetTranscription,
    setError: mockSetError,
    setDuration: mockSetDuration,
    reset: mockReset,
  };
}

describe('VoiceButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
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
    mockStoreState.isRecording = true;
    render(<VoiceButton />);
    expect(screen.getByText('Escutando...')).toBeInTheDocument();
  });

  it('shows duration timer in listening state', () => {
    mockStoreState.isRecording = true;
    mockStoreState.duration = 65;
    render(<VoiceButton />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('shows aria-label "Parar gravação" when recording', () => {
    mockStoreState.isRecording = true;
    render(<VoiceButton />);
    expect(
      screen.getByRole('button', { name: 'Parar gravação' }),
    ).toBeInTheDocument();
  });

  it('calls stopRecording and setProcessing when clicked while recording', () => {
    mockStoreState.isRecording = true;
    render(<VoiceButton />);
    const button = screen.getByRole('button', { name: 'Parar gravação' });
    fireEvent.click(button);
    expect(mockStopRecording).toHaveBeenCalledOnce();
    expect(mockSetProcessing).toHaveBeenCalledWith(true);
  });

  it('renders processing label when isProcessing is true', () => {
    mockStoreState.isProcessing = true;
    render(<VoiceButton />);
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('renders error label when error exists', () => {
    mockStoreState.error = 'Microphone failed';
    render(<VoiceButton />);
    expect(screen.getByText('Erro — toque para tentar')).toBeInTheDocument();
  });

  it('calls reset when clicked in error state', () => {
    mockStoreState.error = 'Microphone failed';
    render(<VoiceButton />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('shows partial transcript when showTranscript is true and listening', () => {
    mockStoreState.isRecording = true;
    mockStoreState.partialText = 'Paciente relata dor...';
    render(<VoiceButton showTranscript />);
    expect(screen.getByText('Paciente relata dor...')).toBeInTheDocument();
  });

  it('does not show partial transcript when showTranscript is false', () => {
    mockStoreState.isRecording = true;
    mockStoreState.partialText = 'Paciente relata dor...';
    render(<VoiceButton showTranscript={false} />);
    expect(screen.queryByText('Paciente relata dor...')).not.toBeInTheDocument();
  });

  it('formats duration correctly for 0 seconds', () => {
    mockStoreState.isRecording = true;
    mockStoreState.duration = 0;
    render(<VoiceButton />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<VoiceButton className="my-custom-class" />);
    expect(container.firstElementChild).toHaveClass('my-custom-class');
  });
});
