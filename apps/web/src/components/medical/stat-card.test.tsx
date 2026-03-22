import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './stat-card';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

describe('StatCard', () => {
  it('renders the title', () => {
    render(
      <StatCard
        title="Pacientes Hoje"
        value={42}
        icon={<span data-testid="icon">IC</span>}
      />,
    );
    expect(screen.getByText('Pacientes Hoje')).toBeInTheDocument();
  });

  it('renders numeric value', () => {
    render(
      <StatCard
        title="Atendimentos"
        value={128}
        icon={<span>IC</span>}
      />,
    );
    expect(screen.getByText('128')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(
      <StatCard
        title="Taxa Ocupação"
        value="85%"
        icon={<span>IC</span>}
      />,
    );
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(
      <StatCard
        title="Test"
        value={1}
        icon={<span data-testid="my-icon">IC</span>}
      />,
    );
    expect(screen.getByTestId('my-icon')).toBeInTheDocument();
  });

  it('renders positive trend with + prefix', () => {
    render(
      <StatCard
        title="Pacientes"
        value={42}
        icon={<span>IC</span>}
        trend={{ value: 12, isPositive: true }}
      />,
    );
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders negative trend without + prefix', () => {
    render(
      <StatCard
        title="Alertas"
        value={5}
        icon={<span>IC</span>}
        trend={{ value: -3, isPositive: false }}
      />,
    );
    expect(screen.getByText('-3%')).toBeInTheDocument();
  });

  it('does not render trend when not provided', () => {
    render(
      <StatCard title="Test" value={1} icon={<span>IC</span>} />,
    );
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <StatCard
        title="Test"
        value={1}
        icon={<span>IC</span>}
        className="my-stat"
      />,
    );
    expect(screen.getByTestId('card')).toHaveClass('my-stat');
  });
});
