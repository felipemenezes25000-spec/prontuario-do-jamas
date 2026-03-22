import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TriageBadge } from './triage-badge';

describe('TriageBadge', () => {
  it('renders RED level with first letter "R"', () => {
    render(<TriageBadge level="RED" />);
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('renders RED level label "Emergência"', () => {
    render(<TriageBadge level="RED" showLabel />);
    expect(screen.getByText('Emergência')).toBeInTheDocument();
  });

  it('renders ORANGE level with label "Muito Urgente"', () => {
    render(<TriageBadge level="ORANGE" showLabel />);
    expect(screen.getByText('O')).toBeInTheDocument();
    expect(screen.getByText('Muito Urgente')).toBeInTheDocument();
  });

  it('renders YELLOW level with label "Urgente"', () => {
    render(<TriageBadge level="YELLOW" showLabel />);
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('renders GREEN level with label "Pouco Urgente"', () => {
    render(<TriageBadge level="GREEN" showLabel />);
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('Pouco Urgente')).toBeInTheDocument();
  });

  it('renders BLUE level with label "Não Urgente"', () => {
    render(<TriageBadge level="BLUE" showLabel />);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Não Urgente')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<TriageBadge level="RED" showLabel={false} />);
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.queryByText('Emergência')).not.toBeInTheDocument();
  });

  it('shows wait time when showWaitTime is true for RED', () => {
    render(<TriageBadge level="RED" showWaitTime />);
    expect(screen.getByText('Espera: 0min')).toBeInTheDocument();
  });

  it('shows wait time of 120min for GREEN', () => {
    render(<TriageBadge level="GREEN" showWaitTime />);
    expect(screen.getByText('Espera: 120min')).toBeInTheDocument();
  });

  it('shows wait time of 240min for BLUE', () => {
    render(<TriageBadge level="BLUE" showWaitTime />);
    expect(screen.getByText('Espera: 240min')).toBeInTheDocument();
  });

  it('does not show wait time by default', () => {
    render(<TriageBadge level="RED" />);
    expect(screen.queryByText(/Espera:/)).not.toBeInTheDocument();
  });

  it('applies correct background color via inline style', () => {
    const { container } = render(<TriageBadge level="RED" />);
    const circle = container.querySelector('.rounded-full.font-bold');
    expect(circle).toHaveStyle({ backgroundColor: '#DC2626' });
  });

  it('applies glow class for RED and ORANGE levels', () => {
    const { container: redContainer } = render(<TriageBadge level="RED" />);
    expect(redContainer.querySelector('.triage-glow')).toBeInTheDocument();

    const { container: orangeContainer } = render(<TriageBadge level="ORANGE" />);
    expect(orangeContainer.querySelector('.triage-glow')).toBeInTheDocument();
  });

  it('does not apply glow class for GREEN level', () => {
    const { container } = render(<TriageBadge level="GREEN" />);
    expect(container.querySelector('.triage-glow')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <TriageBadge level="RED" className="test-class" />,
    );
    expect(container.firstElementChild).toHaveClass('test-class');
  });
});
