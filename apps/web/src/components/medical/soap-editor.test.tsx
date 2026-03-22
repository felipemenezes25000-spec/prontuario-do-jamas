import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SOAPEditor } from './soap-editor';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
    variant,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
    variant?: string;
    className?: string;
  }) => (
    <button type={type as 'button' | 'submit'} onClick={onClick} className={className} data-variant={variant} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    disabled,
    ...rest
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...rest}
    />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

describe('SOAPEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnSign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four SOAP sections', () => {
    render(<SOAPEditor onSave={mockOnSave} onSign={mockOnSign} />);
    expect(screen.getByText('Subjetivo')).toBeInTheDocument();
    expect(screen.getByText('Objetivo')).toBeInTheDocument();
    expect(screen.getByText('Avaliação')).toBeInTheDocument();
    expect(screen.getByText('Plano')).toBeInTheDocument();
  });

  it('renders section letters S, O, A, P', () => {
    render(<SOAPEditor onSave={mockOnSave} onSign={mockOnSign} />);
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('O')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('renders initial data in textareas', () => {
    render(
      <SOAPEditor
        initialData={{
          subjective: 'Dor abdominal',
          objective: 'Exame normal',
          assessment: 'Dispepsia',
          plan: 'Omeprazol',
        }}
        onSave={mockOnSave}
        onSign={mockOnSign}
      />,
    );
    const textareas = screen.getAllByRole('textbox');
    expect(textareas[0]).toHaveValue('Dor abdominal');
    expect(textareas[1]).toHaveValue('Exame normal');
    expect(textareas[2]).toHaveValue('Dispepsia');
    expect(textareas[3]).toHaveValue('Omeprazol');
  });

  it('allows editing textareas', async () => {
    const user = userEvent.setup();
    render(<SOAPEditor onSave={mockOnSave} onSign={mockOnSign} />);
    const textareas = screen.getAllByRole('textbox');
    await user.type(textareas[0]!, 'Paciente relata dor');
    expect(textareas[0]!).toHaveValue('Paciente relata dor');
  });

  it('calls onSave with data when "Salvar Rascunho" is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SOAPEditor
        initialData={{ subjective: 'teste' }}
        onSave={mockOnSave}
        onSign={mockOnSign}
      />,
    );
    const saveButton = screen.getByText('Salvar Rascunho');
    await user.click(saveButton);
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({ subjective: 'teste' }),
    );
  });

  it('calls onSign with data when "Assinar" is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SOAPEditor
        initialData={{ subjective: 'teste' }}
        onSave={mockOnSave}
        onSign={mockOnSign}
      />,
    );
    const signButton = screen.getByText('Assinar');
    await user.click(signButton);
    expect(mockOnSign).toHaveBeenCalledWith(
      expect.objectContaining({ subjective: 'teste' }),
    );
  });

  it('renders signed state banner when signedBy and signedAt are provided', () => {
    render(
      <SOAPEditor
        onSave={mockOnSave}
        onSign={mockOnSign}
        signedBy="Dr. Carlos"
        signedAt="2026-03-21 14:30"
      />,
    );
    expect(screen.getByText(/Assinado por Dr. Carlos/)).toBeInTheDocument();
    expect(screen.getByText(/2026-03-21 14:30/)).toBeInTheDocument();
  });

  it('hides save and sign buttons when signed', () => {
    render(
      <SOAPEditor
        onSave={mockOnSave}
        onSign={mockOnSign}
        signedBy="Dr. Carlos"
        signedAt="2026-03-21 14:30"
      />,
    );
    expect(screen.queryByText('Salvar Rascunho')).not.toBeInTheDocument();
    expect(screen.queryByText('Assinar')).not.toBeInTheDocument();
  });

  it('disables textareas in readOnly mode', () => {
    render(
      <SOAPEditor onSave={mockOnSave} onSign={mockOnSign} isReadOnly />,
    );
    const textareas = screen.getAllByRole('textbox');
    textareas.forEach((textarea) => {
      expect(textarea).toBeDisabled();
    });
  });

  it('shows voice buttons when showVoiceButtons is true and not readOnly', () => {
    render(
      <SOAPEditor
        onSave={mockOnSave}
        onSign={mockOnSign}
        showVoiceButtons
      />,
    );
    const voiceButtons = screen.getAllByLabelText(/Ditar .+ por voz/);
    expect(voiceButtons).toHaveLength(4);
  });

  it('hides voice buttons in readOnly mode', () => {
    render(
      <SOAPEditor
        onSave={mockOnSave}
        onSign={mockOnSign}
        showVoiceButtons
        isReadOnly
      />,
    );
    expect(screen.queryByLabelText(/Ditar .+ por voz/)).not.toBeInTheDocument();
  });

  it('shows character count for each section', () => {
    render(
      <SOAPEditor
        initialData={{ subjective: 'Hello' }}
        onSave={mockOnSave}
        onSign={mockOnSign}
      />,
    );
    expect(screen.getByText('5 caracteres')).toBeInTheDocument();
    // The other three sections have 0 chars
    expect(screen.getAllByText('0 caracteres')).toHaveLength(3);
  });
});
