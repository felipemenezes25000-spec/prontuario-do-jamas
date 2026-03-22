import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientSearch } from './patient-search';

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/command', () => ({
  CommandDialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="command-dialog" role="dialog">
        {children}
      </div>
    ) : null,
  CommandInput: ({ placeholder }: { placeholder?: string }) => (
    <input data-testid="command-input" placeholder={placeholder} />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading?: string;
  }) => (
    <div data-testid="command-group" data-heading={heading}>
      {children}
    </div>
  ),
  CommandItem: ({
    children,
    onSelect,
    value,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    value?: string;
    className?: string;
  }) => (
    <div
      data-testid="command-item"
      data-value={value}
      onClick={onSelect}
      role="option"
    >
      {children}
    </div>
  ),
}));

describe('PatientSearch', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the search trigger button with placeholder text', () => {
    render(<PatientSearch onSelect={mockOnSelect} />);
    expect(screen.getByText('Buscar paciente...')).toBeInTheDocument();
  });

  it('shows keyboard shortcut hint "Ctrl+K"', () => {
    render(<PatientSearch onSelect={mockOnSelect} />);
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
  });

  it('opens dialog when trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelect={mockOnSelect} />);
    const trigger = screen.getByText('Buscar paciente...');
    await user.click(trigger);
    expect(screen.getByTestId('command-dialog')).toBeInTheDocument();
  });

  it('shows search input in dialog', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelect={mockOnSelect} />);
    await user.click(screen.getByText('Buscar paciente...'));
    expect(screen.getByTestId('command-input')).toBeInTheDocument();
  });

  it('renders mock patient names in dialog', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelect={mockOnSelect} />);
    await user.click(screen.getByText('Buscar paciente...'));
    expect(screen.getByText('Maria Silva Santos')).toBeInTheDocument();
    expect(screen.getByText('João Pedro Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Ana Beatriz Costa')).toBeInTheDocument();
  });

  it('renders patient MRN badges', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelect={mockOnSelect} />);
    await user.click(screen.getByText('Buscar paciente...'));
    expect(screen.getByText('MRN-001234')).toBeInTheDocument();
  });

  it('renders patient ages', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelect={mockOnSelect} />);
    await user.click(screen.getByText('Buscar paciente...'));
    expect(screen.getByText('45 anos')).toBeInTheDocument();
    expect(screen.getByText('67 anos')).toBeInTheDocument();
  });

  it('calls onSelect with patient data when a patient is clicked', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelect={mockOnSelect} />);
    await user.click(screen.getByText('Buscar paciente...'));

    const items = screen.getAllByTestId('command-item');
    await user.click(items[0]!);

    expect(mockOnSelect).toHaveBeenCalledWith({
      id: '1',
      name: 'Maria Silva Santos',
      mrn: 'MRN-001234',
    });
  });

  it('shows voice search button with aria-label in dialog', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelect={mockOnSelect} />);
    await user.click(screen.getByText('Buscar paciente...'));
    expect(screen.getByLabelText('Busca por voz')).toBeInTheDocument();
  });

  it('renders patient initials as avatar fallback', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelect={mockOnSelect} />);
    await user.click(screen.getByText('Buscar paciente...'));
    // Maria Silva Santos -> MS
    expect(screen.getByText('MS')).toBeInTheDocument();
    // João Pedro Oliveira -> JP
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('applies custom className to trigger button', () => {
    render(
      <PatientSearch onSelect={mockOnSelect} className="my-search-class" />,
    );
    const trigger = screen.getByText('Buscar paciente...').closest('button');
    expect(trigger).toHaveClass('my-search-class');
  });
});
