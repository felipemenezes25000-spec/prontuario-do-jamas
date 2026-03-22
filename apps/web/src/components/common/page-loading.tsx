import { Skeleton } from '@/components/ui/skeleton';

interface PageLoadingProps {
  /** Number of card skeletons to display (default: 4) */
  cards?: number;
  /** Whether to show a table skeleton below cards */
  showTable?: boolean;
}

export function PageLoading({ cards = 4, showTable = true }: PageLoadingProps) {
  return (
    <div className="space-y-6">
      {/* Page title skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Table/content skeleton */}
      {showTable && (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
