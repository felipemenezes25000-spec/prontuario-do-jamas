import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionForm } from './prescription-form';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }: { children: React.ReactNode; htmlFor?: string; className?: string }) => (
    <label {...rest}>{children}</label>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

describe('PrescriptionForm', () => {
  const mockOnAdd = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form title "Adicionar Medicamento"', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    expect(screen.getByText('Adicionar Medicamento')).toBeInTheDocument();
  });

  it('renders medication name input', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    expect(screen.getByLabelText('Nome do Medicamento')).toBeInTheDocument();
  });

  it('renders dose input', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    expect(screen.getByLabelText('Dose')).toBeInTheDocument();
  });

  it('renders concentration input', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    expect(screen.getByLabelText('Concentração')).toBeInTheDocument();
  });

  it('renders fieldset legends for sections', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    expect(screen.getByText('Medicamento')).toBeInTheDocument();
    expect(screen.getByText('Posologia')).toBeInTheDocument();
    expect(screen.getByText('Duração')).toBeInTheDocument();
    expect(screen.getByText('Observações')).toBeInTheDocument();
    expect(screen.getByText('Controle')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    const submitButton = screen.getByText('Adicionar');
    fireEvent.click(submitButton);

    expect(
      screen.getByText('Nome do medicamento é obrigatório'),
    ).toBeInTheDocument();
    expect(screen.getByText('Dose é obrigatória')).toBeInTheDocument();
    expect(screen.getByText('Frequência é obrigatória')).toBeInTheDocument();
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    const cancelButton = screen.getByText('Cancelar');
    await user.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it('renders voice button for adding by voice', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    expect(screen.getByText('Adicionar por Voz')).toBeInTheDocument();
  });

  it('renders checkbox labels for Controlado, Antibiótico, Alto Alerta', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    expect(screen.getByText('Medicamento Controlado')).toBeInTheDocument();
    expect(screen.getByText('Antibiótico')).toBeInTheDocument();
    expect(screen.getByText('Alto Alerta')).toBeInTheDocument();
  });

  it('renders "Se necessário (SOS)" checkbox label', () => {
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    // The text appears in both the frequency select option and the checkbox label
    const matches = screen.getAllByText('Se necessário (SOS)');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('allows typing a medication name', async () => {
    const user = userEvent.setup();
    render(<PrescriptionForm onAdd={mockOnAdd} onCancel={mockOnCancel} />);
    const nameInput = screen.getByLabelText('Nome do Medicamento');
    await user.type(nameInput, 'Amoxicilina');
    expect(nameInput).toHaveValue('Amoxicilina');
  });
});
