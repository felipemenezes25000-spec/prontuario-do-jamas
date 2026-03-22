import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllergyBadge } from './allergy-badge';

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AllergyBadge', () => {
  it('renders the substance name', () => {
    render(<AllergyBadge substance="Penicilina" severity="MILD" />);
    // Substance appears in both badge and tooltip
    const matches = screen.getAllByText('Penicilina');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders severity label in tooltip for MILD', () => {
    render(<AllergyBadge substance="Dipirona" severity="MILD" />);
    expect(screen.getByText('Gravidade: Leve')).toBeInTheDocument();
  });

  it('renders severity label in tooltip for MODERATE', () => {
    render(<AllergyBadge substance="AAS" severity="MODERATE" />);
    expect(screen.getByText('Gravidade: Moderada')).toBeInTheDocument();
  });

  it('renders severity label in tooltip for SEVERE', () => {
    render(<AllergyBadge substance="Iodo" severity="SEVERE" />);
    expect(screen.getByText('Gravidade: Grave')).toBeInTheDocument();
  });

  it('renders severity label in tooltip for ANAPHYLAXIS', () => {
    render(<AllergyBadge substance="Penicilina" severity="ANAPHYLAXIS" />);
    expect(screen.getByText('Gravidade: Anafilaxia')).toBeInTheDocument();
  });

  it('shows warning icon for SEVERE severity', () => {
    const { container } = render(
      <AllergyBadge substance="Iodo" severity="SEVERE" showIcon />,
    );
    // AlertTriangle renders an svg
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows warning icon for ANAPHYLAXIS severity', () => {
    const { container } = render(
      <AllergyBadge substance="Penicilina" severity="ANAPHYLAXIS" showIcon />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('does not show warning icon for MILD severity even with showIcon', () => {
    const { container } = render(
      <AllergyBadge substance="Dipirona" severity="MILD" showIcon />,
    );
    // The badge span is the inline-flex span containing the substance text
    const badgeSpan = container.querySelector('span.inline-flex');
    const svg = badgeSpan?.querySelector('svg');
    expect(svg).toBeNull();
  });

  it('does not show warning icon for MODERATE severity', () => {
    const { container } = render(
      <AllergyBadge substance="AAS" severity="MODERATE" showIcon />,
    );
    const badgeSpan = container.querySelector('span.inline-flex');
    const svg = badgeSpan?.querySelector('svg');
    expect(svg).toBeNull();
  });

  it('shows type in tooltip when provided', () => {
    render(
      <AllergyBadge
        substance="Penicilina"
        severity="SEVERE"
        type="Medicamento"
      />,
    );
    expect(screen.getByText('Tipo: Medicamento')).toBeInTheDocument();
  });

  it('does not show type line in tooltip when type is not provided', () => {
    render(<AllergyBadge substance="Penicilina" severity="SEVERE" />);
    expect(screen.queryByText(/Tipo:/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AllergyBadge
        substance="Dipirona"
        severity="MILD"
        className="custom-badge"
      />,
    );
    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('custom-badge');
  });
});
