import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface EducationContent {
  id: string;
  title: string;
  summary: string;
  category: string;
  imageUrl: string | null;
  content: string;
  author: string;
  publishedAt: string;
  readTimeMinutes: number;
  tags: string[];
  recommended: boolean;
}

export interface EducationCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface EducationFilters {
  category?: string;
  search?: string;
  recommended?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const educationKeys = {
  all: ['portal-education'] as const,
  list: (filters?: EducationFilters) => [...educationKeys.all, 'list', filters] as const,
  detail: (id: string) => [...educationKeys.all, 'detail', id] as const,
  categories: () => [...educationKeys.all, 'categories'] as const,
  recommended: () => [...educationKeys.all, 'recommended'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useEducationContents(filters?: EducationFilters) {
  return useQuery({
    queryKey: educationKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<EducationContent[]>(
        '/patient-portal/education',
        { params: filters },
      );
      return data;
    },
  });
}

export function useEducationDetail(id: string) {
  return useQuery({
    queryKey: educationKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<EducationContent>(
        `/patient-portal/education/${id}`,
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useEducationCategories() {
  return useQuery({
    queryKey: educationKeys.categories(),
    queryFn: async () => {
      const { data } = await api.get<EducationCategory[]>(
        '/patient-portal/education/categories',
      );
      return data;
    },
  });
}

export function useRecommendedContent() {
  return useQuery({
    queryKey: educationKeys.recommended(),
    queryFn: async () => {
      const { data } = await api.get<EducationContent[]>(
        '/patient-portal/education',
        { params: { recommended: true } },
      );
      return data;
    },
  });
}
