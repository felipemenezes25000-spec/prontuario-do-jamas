import { useEffect, useRef, useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { RealtimeProvider } from '@/components/realtime/realtime-provider';
import { SkipNav } from '@/components/accessibility/SkipNav';
import { LiveRegion } from '@/components/accessibility/LiveRegion';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Breadcrumbs } from './breadcrumbs';

// ---------------------------------------------------------------------------
// Route transition progress bar (NProgress-style, triggered on route change)
// ---------------------------------------------------------------------------

function RouteProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Only trigger on actual path changes, not on initial mount
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;

    // Start progress animation
    setProgress(0);
    setVisible(true);

    // Quickly animate to ~30% then slow down
    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      currentProgress += Math.max(1, (90 - currentProgress) * 0.15);
      if (currentProgress >= 90) {
        currentProgress = 90;
      }
      setProgress(currentProgress);
    }, 50);

    // After a short delay (simulating load), complete the bar
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    const completeTimeout = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setProgress(100);

      hideTimeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }, 300);

    return () => {
      clearTimeout(completeTimeout);
      if (hideTimeout) clearTimeout(hideTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Carregando pagina"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2.5px]"
    >
      <div
        className={cn(
          'h-full rounded-r-full',
          'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400',
          'shadow-[0_0_12px_rgba(16,185,129,0.6),0_0_4px_rgba(16,185,129,0.4)]',
          progress >= 100
            ? 'transition-[width,opacity] duration-200 ease-out opacity-0'
            : 'transition-[width] duration-200 ease-out opacity-100',
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated page wrapper (fade-in-up on route change)
// ---------------------------------------------------------------------------

function AnimatedOutlet() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const prevKeyRef = useRef(location.key);

  useEffect(() => {
    if (location.key === prevKeyRef.current) return;

    prevKeyRef.current = location.key;
    // Trigger entrance animation
    setVisible(false);
    const raf = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [location.key]);

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-2 opacity-0',
      )}
    >
      <Outlet />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scroll-to-top on route change
// ---------------------------------------------------------------------------

function useScrollToTop(): React.RefCallback<HTMLElement> {
  const { pathname } = useLocation();
  const nodeRef = useRef<HTMLElement | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      nodeRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname]);

  return useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);
}

// ---------------------------------------------------------------------------
// Dot pattern background for premium feel
// ---------------------------------------------------------------------------

function DotPatternBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Dot pattern */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.03] dark:opacity-[0.04]">
        <defs>
          <pattern
            id="dot-pattern"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-pattern)" />
      </svg>

      {/* Gradient mesh overlay for depth */}
      <div
        className={cn(
          'absolute -top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full',
          'bg-emerald-500/[0.03] blur-[120px]',
          'dark:bg-emerald-500/[0.02]',
        )}
      />
      <div
        className={cn(
          'absolute -bottom-1/4 -left-1/4 h-[500px] w-[500px] rounded-full',
          'bg-teal-500/[0.03] blur-[100px]',
          'dark:bg-teal-500/[0.02]',
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Layout
// ---------------------------------------------------------------------------

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore();
  const scrollRefCallback = useScrollToTop();

  // Manage keyboard focus on route change for accessibility
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const isFirstRender = useRef(true);

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      mainRef.current = node;
      scrollRefCallback(node);
    },
    [scrollRefCallback],
  );

  useEffect(() => {
    // Don't steal focus on initial page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Move focus to main content on navigation for screen readers
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <RealtimeProvider>
      <SkipNav />
      <LiveRegion />
      <RouteProgressBar />

      <div className="relative min-h-screen bg-background">
        {/* Sidebar navigation landmark */}
        <Sidebar />

        {/* Main shell: smooth padding transition on sidebar toggle */}
        <div
          className={cn(
            'flex min-h-screen flex-col',
            'transition-[padding-left] duration-300 ease-out',
            sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64',
          )}
        >
          {/* Header landmark */}
          <Header />

          {/* Main content area */}
          <main
            ref={setRefs}
            id="main-content"
            role="main"
            aria-label="Conteudo principal"
            tabIndex={-1}
            className={cn(
              'relative flex-1 overflow-y-auto scroll-smooth',
              'p-4 lg:p-6',
              'outline-none focus-visible:outline-none',
            )}
          >
            {/* Premium dot pattern background */}
            <DotPatternBackground />

            {/* Content sits above the background */}
            <div className="relative z-10">
              {/* Breadcrumbs below the header */}
              <Breadcrumbs />

              {/* Page content with fade-in-up animation */}
              <AnimatedOutlet />
            </div>
          </main>
        </div>

        {/* Mobile bottom safe area spacer */}
        <div
          className="h-[env(safe-area-inset-bottom,0px)] lg:hidden"
          aria-hidden="true"
        />
      </div>
    </RealtimeProvider>
  );
}
