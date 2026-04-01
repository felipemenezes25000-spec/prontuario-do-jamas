import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface AutoConfirmationDto {
  appointmentId: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  message?: string;
  scheduledAt?: string;
}

export interface AutoConfirmationResult {
  appointmentId: string;
  channel: string;
  status: 'SENT' | 'QUEUED' | 'ERROR';
  sentAt: string;
}

export interface WaitlistEntry {
  id: string;
  patientId: string;
  patientName: string;
  specialtyId: string;
  specialtyName: string;
  doctorId?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requestedDate?: string;
  addedAt: string;
  estimatedWait?: number;
  notes?: string;
  status: 'WAITING' | 'SCHEDULED' | 'CANCELLED';
}

export interface AddToWaitlistDto {
  patientId: string;
  specialtyId: string;
  doctorId?: string;
  priority: WaitlistEntry['priority'];
  requestedDate?: string;
  notes?: string;
}

export interface RecurringAppointmentDto {
  patientId: string;
  doctorId: string;
  specialtyId: string;
  startDate: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  occurrences: number;
  timeSlot: string;
  notes?: string;
}

export interface RecurringAppointmentResult {
  seriesId: string;
  appointments: Array<{ id: string; scheduledAt: string; status: string }>;
  totalCreated: number;
}

export interface AgendaBlockDto {
  doctorId: string;
  startDate: string;
  endDate: string;
  reason: string;
  blockType: 'VACATION' | 'MEETING' | 'TRAINING' | 'SURGERY' | 'OTHER';
  affectedSlots?: string[];
}

export interface AgendaBlock {
  id: string;
  doctorId: string;
  startDate: string;
  endDate: string;
  reason: string;
  blockType: string;
  createdAt: string;
}

export interface QueueCallDto {
  queueId: string;
  doctorId: string;
  roomId?: string;
}

export interface QueueCallResult {
  appointmentId: string;
  patientId: string;
  patientName: string;
  calledAt: string;
  roomId?: string;
  queuePosition: number;
}

export interface WalkInDto {
  patientId: string;
  doctorId?: string;
  specialtyId: string;
  chiefComplaint: string;
  triageLevel?: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

export interface WalkInResult {
  id: string;
  patientId: string;
  queueNumber: number;
  estimatedWait: number;
  triageLevel?: string;
  registeredAt: string;
}

export interface OverbookingCalculateDto {
  doctorId: string;
  date: string;
  targetOccupancy: number;
  historicalNoShowRate?: number;
}

export interface OverbookingCalculateResult {
  recommendedSlots: number;
  overbookingFactor: number;
  estimatedNoShows: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedBuffer: number;
}

export interface MultiResourceCheckDto {
  resources: Array<{ type: 'ROOM' | 'EQUIPMENT' | 'DOCTOR' | 'NURSE'; id: string }>;
  startTime: string;
  endTime: string;
  procedureCode?: string;
}

export interface MultiResourceCheckResult {
  available: boolean;
  conflicts: Array<{ resourceId: string; resourceType: string; conflictDescription: string }>;
  nextAvailable?: string;
}

export interface QrCheckinDto {
  qrCode: string;
  locationId?: string;
  scannedAt?: string;
}

export interface QrCheckinResult {
  appointmentId: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  doctorName: string;
  checkedInAt: string;
  status: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'NOT_FOUND' | 'CANCELLED';
}

export interface WaitTimeDashboard {
  currentDate: string;
  totalPatients: number;
  averageWait: number;
  byDoctor: Array<{
    doctorId: string;
    doctorName: string;
    currentPatients: number;
    averageWait: number;
    nextAvailable: string;
  }>;
  bySpecialty: Array<{ specialtyId: string; specialtyName: string; averageWait: number; queueSize: number }>;
  updatedAt: string;
}

export interface WaitTimeDashboardParams {
  specialtyId?: string;
  date?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const schedulingAdvancedKeys = {
  all: ['scheduling-advanced'] as const,
  waitlist: () => [...schedulingAdvancedKeys.all, 'waitlist'] as const,
  waitTimeDashboard: (params?: WaitTimeDashboardParams) => [...schedulingAdvancedKeys.all, 'wait-time-dashboard', params] as const,
};

// ============================================================================
// Auto-Confirmation
// ============================================================================

export function useSendAutoConfirmation() {
  return useMutation({
    mutationFn: async (data: AutoConfirmationDto) => {
      const { data: res } = await api.post<AutoConfirmationResult>('/appointments/auto-confirmation', data);
      return res;
    },
  });
}

// ============================================================================
// Waitlist
// ============================================================================

export function useGetWaitlist() {
  return useQuery({
    queryKey: schedulingAdvancedKeys.waitlist(),
    queryFn: async () => {
      const { data } = await api.get<WaitlistEntry[]>('/appointments/waitlist');
      return data;
    },
  });
}

export function useAddToWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AddToWaitlistDto) => {
      const { data } = await api.post<WaitlistEntry>('/appointments/waitlist', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: schedulingAdvancedKeys.waitlist() });
    },
  });
}

// ============================================================================
// Recurring Appointments
// ============================================================================

export function useCreateRecurringAppointment() {
  return useMutation({
    mutationFn: async (data: RecurringAppointmentDto) => {
      const { data: res } = await api.post<RecurringAppointmentResult>('/appointments/recurring', data);
      return res;
    },
  });
}

// ============================================================================
// Agenda Block
// ============================================================================

export function useBlockAgenda() {
  return useMutation({
    mutationFn: async (data: AgendaBlockDto) => {
      const { data: res } = await api.post<AgendaBlock>('/appointments/agenda-block', data);
      return res;
    },
  });
}

// ============================================================================
// Queue Call
// ============================================================================

export function useCallNextPatient() {
  return useMutation({
    mutationFn: async (data: QueueCallDto) => {
      const { data: res } = await api.post<QueueCallResult>('/appointments/queue-call', data);
      return res;
    },
  });
}

// ============================================================================
// Walk-In
// ============================================================================

export function useRegisterWalkIn() {
  return useMutation({
    mutationFn: async (data: WalkInDto) => {
      const { data: res } = await api.post<WalkInResult>('/appointments/walk-in', data);
      return res;
    },
  });
}

// ============================================================================
// Overbooking Calculator
// ============================================================================

export function useCalculateOverbooking() {
  return useMutation({
    mutationFn: async (data: OverbookingCalculateDto) => {
      const { data: res } = await api.post<OverbookingCalculateResult>('/appointments/overbooking/calculate', data);
      return res;
    },
  });
}

// ============================================================================
// Multi-Resource Check
// ============================================================================

export function useCheckMultiResource() {
  return useMutation({
    mutationFn: async (data: MultiResourceCheckDto) => {
      const { data: res } = await api.post<MultiResourceCheckResult>('/appointments/multi-resource/check', data);
      return res;
    },
  });
}

// ============================================================================
// QR Check-In
// ============================================================================

export function useProcessQrCheckin() {
  return useMutation({
    mutationFn: async (data: QrCheckinDto) => {
      const { data: res } = await api.post<QrCheckinResult>('/appointments/qr-checkin', data);
      return res;
    },
  });
}

// ============================================================================
// Wait Time Dashboard
// ============================================================================

export function useGetWaitTimeDashboard(params?: WaitTimeDashboardParams) {
  return useQuery({
    queryKey: schedulingAdvancedKeys.waitTimeDashboard(params),
    queryFn: async () => {
      const { data } = await api.get<WaitTimeDashboard>('/appointments/wait-time-dashboard', { params });
      return data;
    },
    refetchInterval: 30_000,
  });
}
