import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User, PaginatedResponse } from '@/types';

export interface UserFilters {
  search?: string;
  role?: string;
}

async function fetchUsers(filters?: UserFilters): Promise<User[]> {
  const { data } = await api.get<PaginatedResponse<User>>('/users', { params: filters });
  return data.data;
}

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => fetchUsers(filters),
  });
}
