import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './empty-state';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Nenhum paciente encontrado" />);
    expect(screen.getByText('Nenhum paciente encontrado')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(
      <EmptyState
        title="Sem dados"
        description="Tente buscar com outros termos"
      />,
    );
    expect(
      screen.getByText('Tente buscar com outros termos'),
    ).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="Sem dados" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('renders default Inbox icon when no custom icon provided', () => {
    const { container } = render(<EmptyState title="Vazio" />);
    // Lucide icons render as SVGs
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(
      <EmptyState
        title="Customizado"
        icon={<span data-testid="custom-icon">Custom</span>}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders action button when action is provided', () => {
    const mockClick = vi.fn();
    render(
      <EmptyState
        title="Vazio"
        action={{ label: 'Adicionar Paciente', onClick: mockClick }}
      />,
    );
    expect(screen.getByText('Adicionar Paciente')).toBeInTheDocument();
  });

  it('calls action onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const mockClick = vi.fn();
    render(
      <EmptyState
        title="Vazio"
        action={{ label: 'Criar Novo', onClick: mockClick }}
      />,
    );
    await user.click(screen.getByText('Criar Novo'));
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('does not render action button when action is not provided', () => {
    render(<EmptyState title="Vazio" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-empty" />,
    );
    expect(container.firstElementChild).toHaveClass('custom-empty');
  });
});
