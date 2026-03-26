import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  cnpj?: string;
  plan: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  isActive: boolean;
  maxUsers: number;
  currentUsers: number;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantStats {
  totalPatients: number;
  totalEncounters: number;
  totalUsers: number;
  storageUsedMb: number;
  activeEncountersToday: number;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  cnpj?: string;
  plan: Tenant['plan'];
  maxUsers: number;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateTenantDto extends Partial<CreateTenantDto> {
  isActive?: boolean;
  settings?: Record<string, unknown>;
}

export interface TenantFilters {
  search?: string;
  plan?: Tenant['plan'];
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedTenants {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters?: TenantFilters) => [...tenantKeys.lists(), filters] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
  stats: (id: string) => [...tenantKeys.all, 'stats', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useTenants(filters?: TenantFilters) {
  return useQuery({
    queryKey: tenantKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedTenants>('/tenants', { params: filters });
      return data;
    },
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Tenant>(`/tenants/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useTenantStats(id: string) {
  return useQuery({
    queryKey: tenantKeys.stats(id),
    queryFn: async () => {
      const { data } = await api.get<TenantStats>(`/tenants/${id}/stats`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTenantDto) => {
      const { data } = await api.post<Tenant>('/tenants', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateTenantDto & { id: string }) => {
      const { data } = await api.patch<Tenant>(`/tenants/${id}`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}
