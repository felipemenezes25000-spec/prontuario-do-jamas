// ─── Base Query DTOs ────────────────────────────────────────────────────────

export interface PaginationQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  startDate: string;
  endDate: string;
}
