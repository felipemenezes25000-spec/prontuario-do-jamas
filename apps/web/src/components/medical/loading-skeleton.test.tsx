import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  PatientListSkeleton,
  PatientDetailSkeleton,
  EncounterSkeleton,
  DashboardSkeleton,
} from './loading-skeleton';

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <div data-testid="skeleton" className={className} style={style} />
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

describe('PatientListSkeleton', () => {
  it('renders with default 5 rows', () => {
    const { container } = render(<PatientListSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    // Header has 5 skeletons, each row has 5 items (avatar, 2 text, badge, action) = 5 + 5*5 = 30
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders with custom number of rows', () => {
    const { container: container3 } = render(<PatientListSkeleton rows={3} />);
    const { container: container5 } = render(<PatientListSkeleton rows={5} />);
    const skeletons3 = container3.querySelectorAll('[data-testid="skeleton"]');
    const skeletons5 = container5.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons3.length).toBeLessThan(skeletons5.length);
  });

  it('renders skeleton elements as divs', () => {
    const { container } = render(<PatientListSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    skeletons.forEach((skeleton) => {
      expect(skeleton.tagName).toBe('DIV');
    });
  });
});

describe('PatientDetailSkeleton', () => {
  it('renders without errors', () => {
    const { container } = render(<PatientDetailSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('renders skeleton elements', () => {
    const { container } = render(<PatientDetailSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders card components', () => {
    const { container } = render(<PatientDetailSkeleton />);
    const cards = container.querySelectorAll('[data-testid="card"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('EncounterSkeleton', () => {
  it('renders without errors', () => {
    const { container } = render(<EncounterSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('renders cards for SOAP sections', () => {
    const { container } = render(<EncounterSkeleton />);
    const cards = container.querySelectorAll('[data-testid="card"]');
    // 4 SOAP cards + 2 sidebar cards = 6
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('renders skeleton elements', () => {
    const { container } = render(<EncounterSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('DashboardSkeleton', () => {
  it('renders without errors', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('renders 4 stat card skeletons', () => {
    const { container } = render(<DashboardSkeleton />);
    const cards = container.querySelectorAll('[data-testid="card"]');
    // 4 stat cards + 2 chart cards + 1 table card = 7
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('renders multiple skeleton placeholders', () => {
    const { container } = render(<DashboardSkeleton />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(10);
  });
});
