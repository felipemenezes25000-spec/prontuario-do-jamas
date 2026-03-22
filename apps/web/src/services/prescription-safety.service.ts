import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { prescriptionKeys } from './prescriptions.service';

// ============================================================================
// Types
// ============================================================================

export interface ValidateSafetyInput {
  medicationName: string;
  activeIngredient?: string;
  concentration?: string;
  route?: string;
  frequency?: string;
  durationDays?: number;
  isControlled?: boolean;
  controlType?: string;
  isAntimicrobial?: boolean;
  patientGender?: string;
  patientAge?: number;
}

export interface ControlledSubstanceResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  requiredRecipeType: string;
}

export interface AntimicrobialResult {
  valid: boolean;
  warnings: string[];
  requiresCulture: boolean;
}

export interface DoubleCheckResult {
  requiresDoubleCheck: boolean;
  reason: string;
  alertLevel: 'HIGH' | 'CRITICAL';
}

export interface SafetyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  controlledSubstance: ControlledSubstanceResult | null;
  antimicrobial: AntimicrobialResult | null;
  doubleCheck: DoubleCheckResult | null;
}

export interface GenerateScheduleInput {
  frequency: string;
  startTime: string;
  medicationName?: string;
}

export interface ScheduleResult {
  times: string[];
  intervalHours: number;
}

export interface CheckResult {
  prescriptionId: string;
  checkedBy?: string;
  checkedAt?: string;
  status: string;
  itemsChecked?: number;
  doubleCheckedBy?: { id: string; name: string };
  doubleCheckedAt?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const prescriptionSafetyKeys = {
  all: ['prescription-safety'] as const,
  validation: () => [...prescriptionSafetyKeys.all, 'validation'] as const,
  schedule: () => [...prescriptionSafetyKeys.all, 'schedule'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useValidatePrescriptionSafety() {
  return useMutation({
    mutationFn: async (input: ValidateSafetyInput) => {
      const { data } = await api.post<SafetyValidationResult>(
        '/prescriptions/validate-safety',
        input,
      );
      return data;
    },
  });
}

export function useGenerateSchedule() {
  return useMutation({
    mutationFn: async (input: GenerateScheduleInput) => {
      const { data } = await api.post<ScheduleResult>(
        '/prescriptions/generate-schedule',
        input,
      );
      return data;
    },
  });
}

export function useFirstCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { data } = await api.post<CheckResult>(
        `/prescriptions/${prescriptionId}/first-check`,
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(result.prescriptionId) });
    },
  });
}

export function useDoubleCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { data } = await api.post<CheckResult>(
        `/prescriptions/${prescriptionId}/double-check`,
      );
      return data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.all });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(result.prescriptionId) });
    },
  });
}
