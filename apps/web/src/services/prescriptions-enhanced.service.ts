import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types — Existing (Safety endpoints)
// ============================================================================

export interface PregnancyRiskResult {
  alerts: string[];
  fdaCategory: string;
  contraindicated: boolean;
}

export interface LactationRiskResult {
  alerts: string[];
  riskLevel: string;
}

export interface RenalAdjustmentResult {
  alerts: string[];
  creatinineClearance?: number;
  adjustmentNeeded: boolean;
}

export interface HepaticAdjustmentResult {
  alerts: string[];
  adjustmentNeeded: boolean;
}

export interface FoodDrugInteraction {
  food: string;
  effect: string;
  recommendation: string;
}

export interface GenericEquivalence {
  brand: string;
  generic: string;
  alternatives: Array<{ name: string; type: string; estimatedPrice: number }>;
}

export interface PCAValidation {
  valid: boolean;
  alerts: string[];
  summary: string;
}

export interface PharmacogenomicsResult {
  alerts: string[];
  doseAdjustment: string;
  metabolizerInfo: string;
}

// ============================================================================
// Types — Enhanced (New endpoints)
// ============================================================================

export interface OrderSetMedication {
  medicationName: string;
  activeIngredient: string;
  dose: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration?: string;
  durationUnit?: string;
  specialInstructions?: string;
  isHighAlert?: boolean;
  isAntibiotic?: boolean;
  sortOrder: number;
}

export interface OrderSet {
  id: string;
  name: string;
  description: string;
  category: string;
  medications: OrderSetMedication[];
}

export interface RenalCalculationResult {
  cockcroftGault: number;
  ckdEpi: number;
  stage: string;
  alerts: string[];
}

export interface ChildPughResult {
  score: number;
  classification: 'A' | 'B' | 'C';
  description: string;
  alerts: string[];
}

export interface InfusionPumpData {
  pumpBrand: 'ALARIS' | 'BBRAUN' | 'BAXTER';
  medication: string;
  totalDoseMg: number;
  diluentVolumeMl: number;
  prescribedRateMgH: number;
  concentrationMgMl: number;
  rateMlH: number;
  vtbiMl: number;
  estimatedDurationH: number;
  alerts: string[];
}

export interface PCAActivation {
  prescriptionItemId: string;
  activatedAt: string;
  doseDelivered: number;
  doseUnit: string;
  wasLocked: boolean;
  painScoreBefore?: number;
  painScoreAfter?: number;
}

export interface PCAHistoryResult {
  activations: PCAActivation[];
  summary: {
    period: string;
    totalActivations: number;
    successfulDoses: number;
    lockedAttempts: number;
    totalDoseDelivered: number;
    doseUnit: string;
  };
}

export interface CultureBasedRecommendation {
  organism: string;
  sensitivities: Array<{ antibiotic: string; mic: string; interpretation: 'S' | 'I' | 'R' }>;
  recommendedAntibiotic: string;
  recommendedDose: string;
  recommendedDuration: string;
  reasoning: string;
  deEscalationSuggestion?: string;
  alerts: string[];
}

export interface AdverseEffectPrediction {
  medication: string;
  riskFactors: string[];
  predictions: Array<{
    adverseEffect: string;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
    probability: number;
    reasoning: string;
    mitigationStrategy: string;
  }>;
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH';
  alerts: string[];
}

// ============================================================================
// Query Keys
// ============================================================================

export const prescriptionEnhancedKeys = {
  all: ['prescriptions-enhanced'] as const,
  orderSets: () => [...prescriptionEnhancedKeys.all, 'order-sets'] as const,
  orderSet: (id: string) => [...prescriptionEnhancedKeys.all, 'order-set', id] as const,
  pcaHistory: (itemId: string, hours?: number) =>
    [...prescriptionEnhancedKeys.all, 'pca-history', itemId, hours] as const,
};

// ============================================================================
// Hooks — Existing (Safety endpoints on /prescriptions/*)
// ============================================================================

export function useCheckPregnancyRisk() {
  return useMutation({
    mutationFn: async (dto: {
      medicationName: string;
      activeIngredient?: string;
      patientGender?: string;
      patientAge?: number;
      isPregnant?: boolean;
    }) => {
      const { data } = await api.post<PregnancyRiskResult>('/prescriptions/check-pregnancy-risk', dto);
      return data;
    },
  });
}

export function useCheckLactationRisk() {
  return useMutation({
    mutationFn: async (dto: { medicationName: string; activeIngredient?: string }) => {
      const { data } = await api.post<LactationRiskResult>('/prescriptions/check-lactation-risk', dto);
      return data;
    },
  });
}

export function useCheckRenalAdjustment() {
  return useMutation({
    mutationFn: async (dto: {
      medicationName: string;
      dose?: string;
      patientAge?: number;
      patientWeight?: number;
      patientGender?: string;
      serumCreatinine?: number;
    }) => {
      const { data } = await api.post<RenalAdjustmentResult>('/prescriptions/check-renal-adjustment', dto);
      return data;
    },
  });
}

export function useCheckHepaticAdjustment() {
  return useMutation({
    mutationFn: async (dto: { medicationName: string; childPughClass?: 'A' | 'B' | 'C' }) => {
      const { data } = await api.post<HepaticAdjustmentResult>('/prescriptions/check-hepatic-adjustment', dto);
      return data;
    },
  });
}

export function useCheckFoodInteractions() {
  return useMutation({
    mutationFn: async (dto: { medicationName: string }) => {
      const { data } = await api.post<{ interactions: FoodDrugInteraction[] }>(
        '/prescriptions/check-food-interactions',
        dto,
      );
      return data;
    },
  });
}

export function useGenericEquivalence() {
  return useMutation({
    mutationFn: async (dto: { medicationName: string }) => {
      const { data } = await api.post<GenericEquivalence>('/prescriptions/generic-equivalence', dto);
      return data;
    },
  });
}

export function useValidatePCA() {
  return useMutation({
    mutationFn: async (dto: {
      medication: string;
      demandDose: number;
      demandDoseUnit: string;
      lockoutMinutes: number;
      maxHourlyDose: number;
      basalRate?: number;
      concentration: string;
    }) => {
      const { data } = await api.post<PCAValidation>('/prescriptions/validate-pca', dto);
      return data;
    },
  });
}

export function usePharmacogenomics() {
  return useMutation({
    mutationFn: async (dto: {
      medicationName: string;
      cyp2d6Status?: 'POOR' | 'INTERMEDIATE' | 'NORMAL' | 'ULTRARAPID';
      cyp2c19Status?: 'POOR' | 'INTERMEDIATE' | 'NORMAL' | 'ULTRARAPID';
    }) => {
      const { data } = await api.post<PharmacogenomicsResult>('/prescriptions/pharmacogenomics', dto);
      return data;
    },
  });
}

// ============================================================================
// Hooks — Enhanced (New endpoints on /prescriptions/enhanced/*)
// ============================================================================

// ─── Order Sets ─────────────────────────────────────────────────────────────

export function useOrderSets() {
  return useQuery({
    queryKey: prescriptionEnhancedKeys.orderSets(),
    queryFn: async () => {
      const { data } = await api.get<OrderSet[]>('/prescriptions/enhanced/order-sets');
      return data;
    },
  });
}

export function useOrderSet(orderSetId: string) {
  return useQuery({
    queryKey: prescriptionEnhancedKeys.orderSet(orderSetId),
    queryFn: async () => {
      const { data } = await api.get<OrderSet>(`/prescriptions/enhanced/order-sets/${orderSetId}`);
      return data;
    },
    enabled: !!orderSetId,
  });
}

export function useActivateOrderSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      orderSetId: string;
      patientId: string;
      encounterId: string;
      patientWeight?: number;
    }) => {
      const { data } = await api.post('/prescriptions/enhanced/order-sets/activate', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}

// ─── Renal Function Calculator ──────────────────────────────────────────────

export function useCalculateRenalFunction() {
  return useMutation({
    mutationFn: async (dto: {
      patientAge: number;
      patientWeight: number;
      patientGender: string;
      serumCreatinine: number;
      isBlack?: boolean;
    }) => {
      const { data } = await api.post<RenalCalculationResult>(
        '/prescriptions/enhanced/renal-function',
        dto,
      );
      return data;
    },
  });
}

// ─── Child-Pugh Calculator ──────────────────────────────────────────────────

export function useCalculateChildPugh() {
  return useMutation({
    mutationFn: async (dto: {
      ascites: 'NONE' | 'MILD' | 'MODERATE_SEVERE';
      encephalopathy: 'NONE' | 'GRADE_1_2' | 'GRADE_3_4';
      bilirubinMgDl: number;
      albuminGDl: number;
      inr: number;
    }) => {
      const { data } = await api.post<ChildPughResult>(
        '/prescriptions/enhanced/child-pugh',
        dto,
      );
      return data;
    },
  });
}

// ─── Smart Infusion Pump ────────────────────────────────────────────────────

export function useCalculateInfusionPump() {
  return useMutation({
    mutationFn: async (dto: {
      pumpBrand: 'ALARIS' | 'BBRAUN' | 'BAXTER';
      medication: string;
      totalDoseMg: number;
      diluentVolumeMl: number;
      prescribedRateMgH: number;
      durationH?: number;
    }) => {
      const { data } = await api.post<InfusionPumpData>(
        '/prescriptions/enhanced/infusion-pump',
        dto,
      );
      return data;
    },
  });
}

// ─── PCA Activations ────────────────────────────────────────────────────────

export function useRecordPCAActivation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      prescriptionItemId: string;
      patientId: string;
      encounterId: string;
      doseDelivered: number;
      doseUnit: string;
      wasLocked: boolean;
      painScoreBefore?: number;
      painScoreAfter?: number;
    }) => {
      const { data } = await api.post('/prescriptions/enhanced/pca/activate', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: prescriptionEnhancedKeys.pcaHistory(vars.prescriptionItemId),
      });
    },
  });
}

export function usePCAHistory(prescriptionItemId: string, hours = 24) {
  return useQuery({
    queryKey: prescriptionEnhancedKeys.pcaHistory(prescriptionItemId, hours),
    queryFn: async () => {
      const { data } = await api.get<PCAHistoryResult>(
        `/prescriptions/enhanced/pca/history/${prescriptionItemId}`,
        { params: { hours } },
      );
      return data;
    },
    enabled: !!prescriptionItemId,
  });
}

// ─── AI: Culture-based Antimicrobial Optimization ───────────────────────────

export function useCultureBasedRecommendation() {
  return useMutation({
    mutationFn: async (dto: {
      organism: string;
      sensitivities: Array<{ antibiotic: string; interpretation: 'S' | 'I' | 'R' }>;
      infectionSite?: string;
      patientAllergies?: string[];
      isImmunocompromised?: boolean;
      previousAntibiotics?: string[];
    }) => {
      const { data } = await api.post<CultureBasedRecommendation>(
        '/prescriptions/enhanced/culture-recommendation',
        dto,
      );
      return data;
    },
  });
}

// ─── AI: Personalized Adverse Effect Prediction ─────────────────────────────

export function useAdverseEffectPrediction() {
  return useMutation({
    mutationFn: async (dto: {
      medicationName: string;
      patientAge: number;
      patientGender: string;
      comorbidities: string[];
      currentMedications: string[];
      geneticProfile?: Record<string, string>;
    }) => {
      const { data } = await api.post<AdverseEffectPrediction>(
        '/prescriptions/enhanced/adverse-effect-prediction',
        dto,
      );
      return data;
    },
  });
}
