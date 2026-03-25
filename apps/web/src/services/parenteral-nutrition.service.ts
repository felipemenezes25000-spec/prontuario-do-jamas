import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface Macronutrients {
  proteins: number;  // g/kg/day
  lipids: number;    // g/kg/day
  carbs: number;     // g/kg/day
  calories: number;  // kcal/day
}

export interface Electrolytes {
  sodium: number;     // mEq/L
  potassium: number;  // mEq/L
  calcium: number;    // mEq/L
  magnesium: number;  // mEq/L
  phosphorus: number; // mmol/L
}

export type NPTStatus = 'ATIVA' | 'SUSPENSA' | 'CONCLUIDA' | 'CANCELADA';

export interface ParenteralNutritionOrder {
  id: string;
  patientId: string;
  patientName: string;
  macronutrients: Macronutrients;
  electrolytes: Electrolytes;
  osmolarity: number;     // mOsm/L
  volume: number;         // mL/day
  infusionRate: number;   // mL/h
  stability: number;      // hours
  status: NPTStatus;
  prescribedBy: string;
  prescribedAt: string;
}

export interface CreateParenteralOrderDto {
  patientId: string;
  macronutrients: Macronutrients;
  electrolytes: Electrolytes;
  volume: number;
  infusionRate: number;
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const parenteralNutritionKeys = {
  all: ['parenteral-nutrition'] as const,
  orders: (params?: Record<string, unknown>) =>
    [...parenteralNutritionKeys.all, 'list', params] as const,
  order: (id: string) =>
    [...parenteralNutritionKeys.all, 'detail', id] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useParenteralOrders(params?: { status?: NPTStatus; patientId?: string }) {
  return useQuery({
    queryKey: parenteralNutritionKeys.orders(params),
    queryFn: async () => {
      const { data } = await api.get<ParenteralNutritionOrder[]>('/parenteral-nutrition', { params });
      return data;
    },
  });
}

export function useParenteralOrder(id: string) {
  return useQuery({
    queryKey: parenteralNutritionKeys.order(id),
    queryFn: async () => {
      const { data } = await api.get<ParenteralNutritionOrder>(`/parenteral-nutrition/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateParenteralOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateParenteralOrderDto) => {
      const { data } = await api.post<ParenteralNutritionOrder>('/parenteral-nutrition', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: parenteralNutritionKeys.orders() });
    },
  });
}

export function useUpdateParenteralOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<CreateParenteralOrderDto> & { id: string; status?: NPTStatus }) => {
      const { data } = await api.patch<ParenteralNutritionOrder>(`/parenteral-nutrition/${id}`, dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: parenteralNutritionKeys.order(variables.id) });
      qc.invalidateQueries({ queryKey: parenteralNutritionKeys.orders() });
    },
  });
}
