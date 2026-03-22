// Re-export from patients.service for backward compatibility
// Consumers that import useAllergies/useConditions from this file
// should migrate to patients.service.ts

import { usePatientAllergies, usePatientConditions } from './patients.service';

/**
 * @deprecated Use `usePatientAllergies` from `@/services/patients.service` instead.
 */
export function useAllergies(patientId: string) {
  return usePatientAllergies(patientId);
}

/**
 * @deprecated Use `usePatientConditions` from `@/services/patients.service` instead.
 */
export function useConditions(patientId: string) {
  return usePatientConditions(patientId);
}
