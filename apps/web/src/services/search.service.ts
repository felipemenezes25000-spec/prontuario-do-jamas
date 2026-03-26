import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export type SearchCategory = 'patients' | 'encounters' | 'documents' | 'drugs';

export interface SearchResultItem {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle: string;
  highlight?: string;
  url: string;
  score: number;
}

export interface SearchResults {
  patients: SearchResultItem[];
  encounters: SearchResultItem[];
  documents: SearchResultItem[];
  drugs: SearchResultItem[];
  total: number;
}

export interface SearchFilters {
  q: string;
  categories?: SearchCategory[];
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const searchKeys = {
  all: ['search'] as const,
  query: (filters: SearchFilters) => [...searchKeys.all, filters] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useGlobalSearch(query: string, categories?: SearchCategory[]) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const filters: SearchFilters = {
    q: debouncedQuery,
    categories,
  };

  return useQuery({
    queryKey: searchKeys.query(filters),
    queryFn: async () => {
      const { data } = await api.get<SearchResults>('/search', { params: filters });
      return data;
    },
    enabled: debouncedQuery.length >= 2,
  });
}
