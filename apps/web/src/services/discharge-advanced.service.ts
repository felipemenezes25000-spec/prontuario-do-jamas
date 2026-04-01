import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const dischargeAdvancedKeys = {
  all: ['discharge-advanced'] as const,
  bedRegulations: (params?: BedRegulationListParams) =>
    [...dischargeAdvancedKeys.all, 'bed-regulation', params] as const,
  barriers: (patientId: string) =>
    [...dischargeAdvancedKeys.all, 'barriers', patientId] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface DischargeInstructionsPayload {
  patientId: string;
  encounterId: string;
  authorId: string;
  diagnosis: string[];
  activityRestrictions: string[];
  dietInstructions?: string;
  woundCareInstructions?: string;
  followUpAppointments: Array<{
    specialty: string;
    urgency: 'ROUTINE' | 'PRIORITY' | 'URGENT';
    intervalDays: number;
    notes?: string;
  }>;
  returnToEdCriteria: string[];
  emergencyContactPhone: string;
  language?: string;
}

export interface DischargeInstructions {
  id: string;
  patientId: string;
  encounterId: string;
  diagnosis: string[];
  activityRestrictions: string[];
  dietInstructions?: string;
  followUpAppointments: Array<{
    specialty: string;
    urgency: string;
    intervalDays: number;
    notes?: string;
  }>;
  returnToEdCriteria: string[];
  pdfUrl: string | null;
  createdAt: string;
}

export interface DischargePrescriptionPayload {
  patientId: string;
  encounterId: string;
  prescriberId: string;
  medications: Array<{
    medicationId: string;
    medicationName: string;
    dose: string;
    route: string;
    frequency: string;
    durationDays: number;
    quantity: number;
    refills?: number;
    instructions?: string;
    newMedication: boolean;
  }>;
  printFormat?: 'PATIENT' | 'PHARMACY' | 'BOTH';
}

export interface DischargePrescription {
  id: string;
  patientId: string;
  encounterId: string;
  medications: Array<{
    medicationName: string;
    dose: string;
    route: string;
    frequency: string;
    durationDays: number;
    quantity: number;
  }>;
  printUrl: string | null;
  createdAt: string;
}

export interface SafeDischargePayload {
  patientId: string;
  encounterId: string;
  evaluatorId: string;
  transportArranged: boolean;
  caregiverPresent: boolean;
  instructionsProvided: boolean;
  medicationsReconciled: boolean;
  followUpScheduled: boolean;
  patientUnderstandsInstructions: boolean;
  teachBackCompleted: boolean;
  specialEquipmentArranged?: boolean;
  homeHealthOrdered?: boolean;
  notes?: string;
}

export interface SafeDischargeResult {
  id: string;
  patientId: string;
  encounterId: string;
  safeToDischarge: boolean;
  score: number;
  blockers: string[];
  recommendations: string[];
  evaluatedAt: string;
}

export interface BedRegulationPayload {
  patientId: string;
  encounterId: string;
  originUnit: string;
  destinationUnit: string;
  clinicalJustification: string;
  urgencyLevel: 'ROUTINE' | 'PRIORITY' | 'URGENT';
  requestedBy: string;
  estimatedTransferHours?: number;
}

export interface BedRegulation {
  id: string;
  patientId: string;
  encounterId: string;
  originUnit: string;
  destinationUnit: string;
  urgencyLevel: 'ROUTINE' | 'PRIORITY' | 'URGENT';
  status: 'PENDING' | 'APPROVED' | 'ALLOCATED' | 'TRANSFERRED' | 'CANCELLED';
  requestedAt: string;
  allocatedBed?: string;
  allocatedAt?: string;
  transferredAt?: string;
}

export type BedRegulationListParams = {
  status?: BedRegulation['status'];
  urgencyLevel?: BedRegulation['urgencyLevel'];
  originUnit?: string;
  destinationUnit?: string;
};

export interface UpdateBedRegulationPayload {
  status?: BedRegulation['status'];
  allocatedBed?: string;
  notes?: string;
  transferredAt?: string;
}

export interface DischargeBarrierPayload {
  patientId: string;
  encounterId: string;
  reportedBy: string;
  barrierType:
    | 'CLINICAL'
    | 'SOCIAL'
    | 'INSURANCE'
    | 'FAMILY'
    | 'TRANSPORT'
    | 'HOME_SETUP'
    | 'OTHER';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  actionPlan?: string;
  expectedResolutionDate?: string;
}

export interface DischargeBarrier {
  id: string;
  patientId: string;
  encounterId: string;
  barrierType: DischargeBarrierPayload['barrierType'];
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  actionPlan?: string;
  reportedAt: string;
  resolvedAt: string | null;
}

export interface MdtRoundPayload {
  encounterId: string;
  patientId: string;
  facilitatorId: string;
  attendees: Array<{ providerId: string; role: string; specialty?: string }>;
  clinicalSummary: string;
  dischargeGoal: string;
  estimatedDischargeDatetime?: string;
  actionItems: Array<{ description: string; assignedTo: string; dueDate?: string }>;
  barriers?: string[];
  notes?: string;
}

export interface MdtRoundRecord {
  id: string;
  encounterId: string;
  patientId: string;
  facilitatorId: string;
  attendeeCount: number;
  dischargeGoal: string;
  estimatedDischargeDatetime?: string;
  actionItemCount: number;
  roundedAt: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useCreateDischargeInstructions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DischargeInstructionsPayload) => {
      const { data } = await api.post<DischargeInstructions>(
        '/discharge/advanced/instructions',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dischargeAdvancedKeys.all });
    },
  });
}

export function useCreateDischargePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DischargePrescriptionPayload) => {
      const { data } = await api.post<DischargePrescription>(
        '/discharge/advanced/prescription',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dischargeAdvancedKeys.all });
    },
  });
}

export function useEvaluateSafeDischarge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SafeDischargePayload) => {
      const { data } = await api.post<SafeDischargeResult>(
        '/discharge/advanced/safe-checklist',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dischargeAdvancedKeys.all });
    },
  });
}

export function useRequestBedRegulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BedRegulationPayload) => {
      const { data } = await api.post<BedRegulation>('/discharge/advanced/bed-regulation', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dischargeAdvancedKeys.bedRegulations() });
    },
  });
}

export function useBedRegulations(params?: BedRegulationListParams) {
  return useQuery({
    queryKey: dischargeAdvancedKeys.bedRegulations(params),
    queryFn: async () => {
      const { data } = await api.get<BedRegulation[]>('/discharge/advanced/bed-regulation', {
        params,
      });
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useUpdateBedRegulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateBedRegulationPayload & { id: string }) => {
      const { data } = await api.patch<BedRegulation>(
        `/discharge/advanced/bed-regulation/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dischargeAdvancedKeys.bedRegulations() });
    },
  });
}

export function useRecordDischargeBarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DischargeBarrierPayload) => {
      const { data } = await api.post<DischargeBarrier>('/discharge/advanced/barriers', payload);
      return data;
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({
        queryKey: dischargeAdvancedKeys.barriers(variables.patientId),
      });
    },
  });
}

export function useDischargeBarriers(patientId: string) {
  return useQuery({
    queryKey: dischargeAdvancedKeys.barriers(patientId),
    queryFn: async () => {
      const { data } = await api.get<DischargeBarrier[]>(
        `/discharge/advanced/barriers/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRecordMdtRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MdtRoundPayload) => {
      const { data } = await api.post<MdtRoundRecord>('/discharge/advanced/mdt-round', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dischargeAdvancedKeys.all });
    },
  });
}
