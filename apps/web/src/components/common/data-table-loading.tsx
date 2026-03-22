import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableLoadingProps {
  /** Number of columns */
  columns?: number;
  /** Number of rows to show */
  rows?: number;
  /** Column header labels (optional - if omitted, skeleton headers are used) */
  headers?: string[];
}

export function DataTableLoading({
  columns = 5,
  rows = 8,
  headers,
}: DataTableLoadingProps) {
  const colCount = headers ? headers.length : columns;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: colCount }).map((_, i) => (
              <TableHead key={i}>
                {headers?.[i] ?? <Skeleton className="h-4 w-20" />}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {Array.from({ length: colCount }).map((_, colIdx) => (
                <TableCell key={colIdx}>
                  <Skeleton
                    className={`h-4 ${colIdx === 0 ? 'w-32' : 'w-20'}`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between border-t border-border p-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  );
}
