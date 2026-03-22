import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VitalSignsCard } from './vital-signs-card';

// Mock the Card UI component
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
}));

describe('VitalSignsCard', () => {
  it('renders the "Sinais Vitais" heading', () => {
    render(<VitalSignsCard vitals={{}} />);
    expect(screen.getByText('Sinais Vitais')).toBeInTheDocument();
  });

  it('renders blood pressure when provided', () => {
    render(
      <VitalSignsCard vitals={{ systolicBP: 120, diastolicBP: 80 }} />,
    );
    expect(screen.getByText('120/80')).toBeInTheDocument();
    expect(screen.getByText('PA')).toBeInTheDocument();
    expect(screen.getByText('mmHg')).toBeInTheDocument();
  });

  it('renders heart rate when provided', () => {
    render(<VitalSignsCard vitals={{ heartRate: 72 }} />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('FC')).toBeInTheDocument();
    expect(screen.getByText('bpm')).toBeInTheDocument();
  });

  it('renders temperature with one decimal place', () => {
    render(<VitalSignsCard vitals={{ temperature: 36.5 }} />);
    expect(screen.getByText('36.5')).toBeInTheDocument();
  });

  it('renders oxygen saturation', () => {
    render(<VitalSignsCard vitals={{ oxygenSaturation: 98 }} />);
    expect(screen.getByText('98')).toBeInTheDocument();
    expect(screen.getByText('SpO2')).toBeInTheDocument();
  });

  it('renders pain scale with /10 suffix', () => {
    render(<VitalSignsCard vitals={{ painScale: 5 }} />);
    expect(screen.getByText('5/10')).toBeInTheDocument();
    expect(screen.getByText('Dor')).toBeInTheDocument();
  });

  it('renders glucose level', () => {
    render(<VitalSignsCard vitals={{ glucoseLevel: 110 }} />);
    expect(screen.getByText('110')).toBeInTheDocument();
    expect(screen.getByText('Glicemia')).toBeInTheDocument();
    expect(screen.getByText('mg/dL')).toBeInTheDocument();
  });

  it('does not render vitals that are not provided', () => {
    render(<VitalSignsCard vitals={{ heartRate: 72 }} />);
    expect(screen.queryByText('PA')).not.toBeInTheDocument();
    expect(screen.queryByText('SpO2')).not.toBeInTheDocument();
    expect(screen.queryByText('Temp')).not.toBeInTheDocument();
  });

  it('marks abnormal high blood pressure with red styling', () => {
    const { container } = render(
      <VitalSignsCard vitals={{ systolicBP: 160, diastolicBP: 95 }} />,
    );
    const abnormalCell = container.querySelector('.border-red-500\\/30');
    expect(abnormalCell).toBeInTheDocument();
  });

  it('marks normal vitals without red styling', () => {
    const { container } = render(
      <VitalSignsCard vitals={{ systolicBP: 120, diastolicBP: 80 }} />,
    );
    const abnormalCell = container.querySelector('.border-red-500\\/30');
    expect(abnormalCell).not.toBeInTheDocument();
  });

  it('marks low oxygen saturation as abnormal', () => {
    const { container } = render(
      <VitalSignsCard vitals={{ oxygenSaturation: 88 }} />,
    );
    const abnormalCell = container.querySelector('.border-red-500\\/30');
    expect(abnormalCell).toBeInTheDocument();
  });

  it('marks high pain scale as abnormal', () => {
    const { container } = render(
      <VitalSignsCard vitals={{ painScale: 8 }} />,
    );
    const abnormalCell = container.querySelector('.border-red-500\\/30');
    expect(abnormalCell).toBeInTheDocument();
  });

  it('renders multiple vitals simultaneously', () => {
    render(
      <VitalSignsCard
        vitals={{
          systolicBP: 120,
          diastolicBP: 80,
          heartRate: 72,
          temperature: 36.8,
          oxygenSaturation: 97,
        }}
      />,
    );
    expect(screen.getByText('PA')).toBeInTheDocument();
    expect(screen.getByText('FC')).toBeInTheDocument();
    expect(screen.getByText('Temp')).toBeInTheDocument();
    expect(screen.getByText('SpO2')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<VitalSignsCard vitals={{}} className="my-class" />);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('my-class');
  });
});
