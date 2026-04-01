import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const prescriptionAlertsKeys = {
  all: ['prescription-alerts'] as const,
  genericEquivalences: (medicationId: string) =>
    [...prescriptionAlertsKeys.all, 'generic-equivalences', medicationId] as const,
};

// ============================================================================
// Types
// ============================================================================

export type AlertSeverity = 'INFO' | 'WARNING' | 'CONTRAINDICATED';

export interface PregnancyAlertPayload {
  patientId: string;
  medicationId: string;
  medicationName: string;
  gestationalAgeWeeks?: number;
  trimester?: 1 | 2 | 3;
}

export interface PregnancyAlertResult {
  medicationId: string;
  medicationName: string;
  fdaCategory: 'A' | 'B' | 'C' | 'D' | 'X';
  severity: AlertSeverity;
  message: string;
  alternatives: string[];
  references: string[];
}

export interface LactationAlertPayload {
  patientId: string;
  medicationId: string;
  medicationName: string;
  infantAgeWeeks?: number;
}

export interface LactationAlertResult {
  medicationId: string;
  medicationName: string;
  lriskCategory: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  severity: AlertSeverity;
  message: string;
  infantRisk: string;
  alternatives: string[];
  references: string[];
}

export interface RenalAdjustmentPayload {
  patientId: string;
  medicationId: string;
  medicationName: string;
  originalDose: string;
  originalFrequency: string;
  creatinineClearanceMlMin: number;
  gfrMlMin?: number;
  hdPatient?: boolean;
}

export interface RenalAdjustmentResult {
  medicationId: string;
  medicationName: string;
  creatinineClearanceMlMin: number;
  ckdStage: 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';
  adjustmentRequired: boolean;
  adjustedDose: string | null;
  adjustedFrequency: string | null;
  avoidIfBelow?: number;
  message: string;
  references: string[];
}

export interface HepaticAdjustmentPayload {
  patientId: string;
  medicationId: string;
  medicationName: string;
  originalDose: string;
  originalFrequency: string;
  childPughScore?: number;
  childPughClass?: 'A' | 'B' | 'C';
  meldScore?: number;
}

export interface HepaticAdjustmentResult {
  medicationId: string;
  medicationName: string;
  childPughClass: 'A' | 'B' | 'C' | null;
  adjustmentRequired: boolean;
  adjustedDose: string | null;
  adjustedFrequency: string | null;
  avoidInClass?: string;
  message: string;
  references: string[];
}

export interface DrugFoodInteractionPayload {
  medications: Array<{ id: string; name: string }>;
  foods?: string[];
}

export interface DrugFoodInteraction {
  medicationId: string;
  medicationName: string;
  foodItem: string;
  severity: AlertSeverity;
  mechanism: string;
  clinicalEffect: string;
  management: string;
}

export interface DrugFoodInteractionResult {
  interactions: DrugFoodInteraction[];
  noInteractionsFound: boolean;
}

export interface GenericEquivalence {
  id: string;
  brandName: string;
  genericName: string;
  activeIngredient: string;
  concentration: string;
  pharmaceuticalForm: string;
  manufacturer: string;
  anvisaCode: string;
  bioequivalent: boolean;
  estimatedSavingsPercent?: number;
}

export interface EPrescribingPayload {
  encounterId: string;
  patientId: string;
  prescriberId: string;
  medications: Array<{
    medicationId: string;
    medicationName: string;
    dose: string;
    route: string;
    frequency: string;
    durationDays?: number;
    quantity?: number;
    instructions?: string;
    controlled?: boolean;
  }>;
  deliveryMethod: 'EMAIL' | 'SMS' | 'PHARMACY_DIRECT' | 'PRINT';
  pharmacyId?: string;
  patientEmail?: string;
  patientPhone?: string;
}

export interface EPrescribingResult {
  prescriptionId: string;
  encounterId: string;
  transmissionId: string;
  status: 'SENT' | 'RECEIVED' | 'PENDING';
  sentAt: string;
  deliveryMethod: EPrescribingPayload['deliveryMethod'];
  trackingCode: string;
}

export interface ProtocolValidationPayload {
  patientId: string;
  encounterId: string;
  protocolCode: string;
  prescribedMedications: Array<{
    medicationId: string;
    dose: string;
    frequency: string;
    route: string;
  }>;
}

export interface ProtocolValidationResult {
  protocolCode: string;
  compliant: boolean;
  deviations: Array<{ field: string; expected: string; actual: string; severity: AlertSeverity }>;
  missingMedications: string[];
  message: string;
}

export interface PcaPrescriptionPayload {
  patientId: string;
  encounterId: string;
  prescriberId: string;
  opioidId: string;
  opioidName: string;
  concentration: string;
  continuousRateMlH?: number;
  bolusDoseMl: number;
  lockoutMinutes: number;
  maxDoseHourMl: number;
  maxDose4hMl?: number;
  pumpModel?: string;
  monitoringInstructions?: string;
  notes?: string;
}

export interface PcaPrescriptionRecord {
  id: string;
  patientId: string;
  encounterId: string;
  opioidName: string;
  concentration: string;
  bolusDoseMl: number;
  lockoutMinutes: number;
  maxDoseHourMl: number;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'DISCONTINUED';
  createdAt: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useCheckPregnancyAlert() {
  return useMutation({
    mutationFn: async (payload: PregnancyAlertPayload) => {
      const { data } = await api.post<PregnancyAlertResult>(
        '/prescriptions/alerts/pregnancy',
        payload,
      );
      return data;
    },
  });
}

export function useCheckLactationAlert() {
  return useMutation({
    mutationFn: async (payload: LactationAlertPayload) => {
      const { data } = await api.post<LactationAlertResult>(
        '/prescriptions/alerts/lactation',
        payload,
      );
      return data;
    },
  });
}

export function useCalculateRenalAdjustment() {
  return useMutation({
    mutationFn: async (payload: RenalAdjustmentPayload) => {
      const { data } = await api.post<RenalAdjustmentResult>(
        '/prescriptions/alerts/renal-adjustment',
        payload,
      );
      return data;
    },
  });
}

export function useCalculateHepaticAdjustment() {
  return useMutation({
    mutationFn: async (payload: HepaticAdjustmentPayload) => {
      const { data } = await api.post<HepaticAdjustmentResult>(
        '/prescriptions/alerts/hepatic-adjustment',
        payload,
      );
      return data;
    },
  });
}

export function useCheckDrugFoodInteraction() {
  return useMutation({
    mutationFn: async (payload: DrugFoodInteractionPayload) => {
      const { data } = await api.post<DrugFoodInteractionResult>(
        '/prescriptions/alerts/drug-food',
        payload,
      );
      return data;
    },
  });
}

export function useGenericEquivalences(medicationId: string) {
  return useQuery({
    queryKey: prescriptionAlertsKeys.genericEquivalences(medicationId),
    queryFn: async () => {
      const { data } = await api.get<GenericEquivalence[]>(
        `/prescriptions/generic-equivalences/${medicationId}`,
      );
      return data;
    },
    enabled: !!medicationId,
  });
}

export function useSendEPrescription() {
  return useMutation({
    mutationFn: async (payload: EPrescribingPayload) => {
      const { data } = await api.post<EPrescribingResult>('/prescriptions/e-prescribing', payload);
      return data;
    },
  });
}

export function useValidateProtocolPrescription() {
  return useMutation({
    mutationFn: async (payload: ProtocolValidationPayload) => {
      const { data } = await api.post<ProtocolValidationResult>(
        '/prescriptions/protocol-validation',
        payload,
      );
      return data;
    },
  });
}

export function useCreatePCAPrescription() {
  return useMutation({
    mutationFn: async (payload: PcaPrescriptionPayload) => {
      const { data } = await api.post<PcaPrescriptionRecord>('/prescriptions/pca', payload);
      return data;
    },
  });
}
