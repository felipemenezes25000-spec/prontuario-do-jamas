import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface CallQueueEntry {
  position: number;
  patientName?: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  room: string;
  scheduledAt: string;
  appointmentId: string;
  status: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW';
  checkedInAt?: string;
  calledAt?: string;
}

export interface WaitTimeStats {
  doctorId: string;
  doctorName: string;
  avgWaitMinutes: number;
  medianWaitMinutes: number;
  maxWaitMinutes: number;
  currentQueueSize: number;
  byShift: Record<string, number>;
  byDayOfWeek: Record<string, number>;
}

export interface AutoConfirmationConfig {
  id: string;
  doctorId?: string;
  specialty?: string;
  enabled: boolean;
  hoursBeforeAppointment: number;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH';
  reminderMessage: string;
  confirmationDeadlineHours: number;
  autoCancelOnNoConfirm: boolean;
}

export interface UpdateAutoConfirmationDto {
  enabled?: boolean;
  hoursBeforeAppointment?: number;
  channel?: AutoConfirmationConfig['channel'];
  reminderMessage?: string;
  confirmationDeadlineHours?: number;
  autoCancelOnNoConfirm?: boolean;
}

export interface WaitlistEntry {
  id: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  specialty: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  preferredDays: string[];
  preferredTimes: string[];
  addedAt: string;
  notifiedAt?: string;
  status: 'WAITING' | 'NOTIFIED' | 'SCHEDULED' | 'EXPIRED' | 'CANCELLED';
  expiresAt?: string;
}

export interface WaitlistFilters {
  specialty?: string;
  doctorId?: string;
  status?: WaitlistEntry['status'];
  priority?: WaitlistEntry['priority'];
  page?: number;
  limit?: number;
}

export interface ScheduleBlock {
  id: string;
  doctorId: string;
  doctorName: string;
  startAt: string;
  endAt: string;
  reason: string;
  type: 'VACATION' | 'MEETING' | 'SURGERY' | 'PERSONAL' | 'OTHER';
  recurring: boolean;
  recurrenceRule?: string;
  createdBy: string;
}

export interface CreateScheduleBlockDto {
  doctorId: string;
  startAt: string;
  endAt: string;
  reason: string;
  type: ScheduleBlock['type'];
  recurring?: boolean;
  recurrenceRule?: string;
}

export interface WalkInEntry {
  id: string;
  patientId: string;
  patientName: string;
  specialty: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  chiefComplaint: string;
  arrivedAt: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  status: 'WAITING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface CreateWalkInDto {
  patientId: string;
  specialty: string;
  priority: WalkInEntry['priority'];
  chiefComplaint: string;
}

export interface OverbookingInfo {
  doctorId: string;
  date: string;
  totalSlots: number;
  bookedSlots: number;
  overbookingLimit: number;
  canOverbook: boolean;
  noShowRate: number;
  suggestedOverbookSlots: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MultiResourceAvailability {
  available: boolean;
  conflicts: Array<{ resource: string; type: string; conflictDescription: string }>;
  suggestedAlternatives: Array<{ date: string; startTime: string; endTime: string }>;
}

export interface QRCheckInResult {
  success: boolean;
  appointmentId: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  position?: number;
  message: string;
}

export interface WaitTimeDashboard {
  overall: { avgWaitMinutes: number; medianWaitMinutes: number; patientsWaiting: number };
  byDoctor: WaitTimeStats[];
  bySpecialty: Array<{ specialty: string; avgWaitMinutes: number; patientsWaiting: number }>;
  hourlyTrend: Array<{ hour: number; avgWaitMinutes: number }>;
  alerts: Array<{ doctorId: string; doctorName: string; waitMinutes: number; patientsWaiting: number }>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const schedEnhancedKeys = {
  all: ['scheduling-enhanced'] as const,
  callQueue: (filters?: Record<string, unknown>) => [...schedEnhancedKeys.all, 'call-queue', filters] as const,
  waitTimeStats: (filters?: Record<string, unknown>) => [...schedEnhancedKeys.all, 'wait-stats', filters] as const,
  waitTimeDashboard: () => [...schedEnhancedKeys.all, 'wait-dashboard'] as const,
  waitlist: (filters?: WaitlistFilters) => [...schedEnhancedKeys.all, 'waitlist', filters] as const,
  autoConfirmation: (doctorId?: string) => [...schedEnhancedKeys.all, 'auto-confirm', doctorId] as const,
  blocks: (doctorId: string) => [...schedEnhancedKeys.all, 'blocks', doctorId] as const,
  walkIns: () => [...schedEnhancedKeys.all, 'walk-ins'] as const,
  overbooking: (doctorId: string, date: string) => [...schedEnhancedKeys.all, 'overbooking', doctorId, date] as const,
  multiResource: () => [...schedEnhancedKeys.all, 'multi-resource'] as const,
  noShowRate: (doctorId: string) => [...schedEnhancedKeys.all, 'no-show', doctorId] as const,
};

// ============================================================================
// Auto Confirmation
// ============================================================================

export function useAutoConfirmationConfig(doctorId?: string) {
  return useQuery({
    queryKey: schedEnhancedKeys.autoConfirmation(doctorId),
    queryFn: async () => {
      const { data } = await api.get<AutoConfirmationConfig>('/scheduling/auto-confirmation', {
        params: doctorId ? { doctorId } : {},
      });
      return data;
    },
  });
}

export function useUpdateAutoConfirmation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ configId, ...updates }: UpdateAutoConfirmationDto & { configId: string }) => {
      const { data } = await api.patch<AutoConfirmationConfig>(`/scheduling/auto-confirmation/${configId}`, updates);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.autoConfirmation() });
    },
  });
}

export function useTriggerAutoConfirmation() {
  return useMutation({
    mutationFn: async (dto: { doctorId?: string; date?: string }) => {
      const { data } = await api.post('/scheduling/auto-confirmation/trigger', dto);
      return data as { sent: number; errors: number };
    },
  });
}

// ============================================================================
// Waitlist Management
// ============================================================================

export function useWaitlistEntries(filters?: WaitlistFilters) {
  return useQuery({
    queryKey: schedEnhancedKeys.waitlist(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: WaitlistEntry[]; total: number }>('/scheduling/waitlist', { params: filters });
      return data;
    },
  });
}

export function useAddToWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { patientId: string; doctorId?: string; specialty: string; priority: WaitlistEntry['priority']; preferredDays?: string[]; preferredTimes?: string[] }) => {
      const { data } = await api.post<WaitlistEntry>('/scheduling/waitlist', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.waitlist() });
    },
  });
}

export function useNotifyWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, slotId }: { entryId: string; slotId: string }) => {
      const { data } = await api.post(`/scheduling/waitlist/${entryId}/notify`, { slotId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.waitlist() });
    },
  });
}

export function useRemoveFromWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      await api.delete(`/scheduling/waitlist/${entryId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.waitlist() });
    },
  });
}

// ============================================================================
// Schedule Blocking (Bloqueio de Agenda)
// ============================================================================

export function useScheduleBlocks(doctorId: string) {
  return useQuery({
    queryKey: schedEnhancedKeys.blocks(doctorId),
    queryFn: async () => {
      const { data } = await api.get<ScheduleBlock[]>(`/scheduling/blocks/${doctorId}`);
      return data;
    },
    enabled: !!doctorId,
  });
}

export function useCreateScheduleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateScheduleBlockDto) => {
      const { data } = await api.post<ScheduleBlock>('/scheduling/blocks', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.blocks(vars.doctorId) });
    },
  });
}

export function useDeleteScheduleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ blockId, doctorId: _doctorId }: { blockId: string; doctorId: string }) => {
      await api.delete(`/scheduling/blocks/${blockId}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.blocks(vars.doctorId) });
    },
  });
}

// ============================================================================
// Call Panel (Painel de Chamadas)
// ============================================================================

export function useCallQueue(filters?: { doctorId?: string; room?: string }) {
  return useQuery({
    queryKey: schedEnhancedKeys.callQueue(filters),
    queryFn: async () => {
      const { data } = await api.get<CallQueueEntry[]>('/scheduling/call-queue', { params: filters });
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useCallNextPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { doctorId: string; room: string }) => {
      const { data } = await api.post<CallQueueEntry>('/scheduling/call-queue/next', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.callQueue() });
    },
  });
}

export function useCallSpecificPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.post<CallQueueEntry>(`/scheduling/call-queue/call/${appointmentId}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.callQueue() });
    },
  });
}

export function useMarkNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.patch(`/scheduling/call-queue/${appointmentId}/no-show`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.callQueue() });
    },
  });
}

// ============================================================================
// Walk-in Handling (Demanda Espontânea)
// ============================================================================

export function useWalkIns() {
  return useQuery({
    queryKey: schedEnhancedKeys.walkIns(),
    queryFn: async () => {
      const { data } = await api.get<WalkInEntry[]>('/scheduling/walk-ins');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useCreateWalkIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateWalkInDto) => {
      const { data } = await api.post<WalkInEntry>('/scheduling/walk-ins', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.walkIns() });
    },
  });
}

export function useAssignWalkIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ walkInId, doctorId }: { walkInId: string; doctorId: string }) => {
      const { data } = await api.patch<WalkInEntry>(`/scheduling/walk-ins/${walkInId}/assign`, { doctorId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.walkIns() });
    },
  });
}

// ============================================================================
// Overbooking Calculation
// ============================================================================

export function useOverbookingInfo(doctorId: string, date: string) {
  return useQuery({
    queryKey: schedEnhancedKeys.overbooking(doctorId, date),
    queryFn: async () => {
      const { data } = await api.get<OverbookingInfo>(`/scheduling/overbooking/${doctorId}`, { params: { date } });
      return data;
    },
    enabled: !!(doctorId && date),
  });
}

export function useNoShowRate(doctorId: string) {
  return useQuery({
    queryKey: schedEnhancedKeys.noShowRate(doctorId),
    queryFn: async () => {
      const { data } = await api.get<{ rate: number; total: number; noShows: number }>(`/scheduling/no-show-rate/${doctorId}`);
      return data;
    },
    enabled: !!doctorId,
  });
}

// ============================================================================
// Multi-Resource Availability Check
// ============================================================================

export function useCheckMultiResourceAvailability() {
  return useMutation({
    mutationFn: async (dto: { doctorId: string; roomId?: string; equipmentIds?: string[]; date: string; startTime: string; endTime: string }) => {
      const { data } = await api.post<MultiResourceAvailability>('/scheduling/multi-resource/check', dto);
      return data;
    },
  });
}

// ============================================================================
// QR Check-in
// ============================================================================

export function useQRCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { qrCode: string; patientId?: string }) => {
      const { data } = await api.post<QRCheckInResult>('/scheduling/qr-checkin', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedEnhancedKeys.callQueue() });
    },
  });
}

// ============================================================================
// Recurring Schedule
// ============================================================================

export interface RecurringSchedulePayload {
  patientId: string;
  doctorId: string;
  type: 'RETURN' | 'FOLLOWUP' | 'CHRONIC' | 'PREVENTIVE';
  intervalMonths: 3 | 6 | 12;
  occurrences: number;
  firstDate: string;
  duration?: number;
}

export interface RecurringScheduleResult {
  appointmentsCreated: number;
  appointments: Array<{ id: string; scheduledAt: string }>;
  reminderNote: string;
}

export function useCreateRecurringSchedule() {
  return useMutation({
    mutationFn: async (dto: RecurringSchedulePayload) => {
      const { data } = await api.post<RecurringScheduleResult>('/scheduling/recurring', dto);
      return data;
    },
  });
}

// ============================================================================
// Smart Scheduling (AI)
// ============================================================================

export interface SmartSchedulingPayload {
  patientId: string;
  doctorId?: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SmartSchedulingResult {
  suggestions: Array<{
    date: string;
    time: string;
    estimatedDuration: number;
    score: number;
    reason: string;
  }>;
  note: string;
}

export function useSmartSchedulingSuggestion() {
  return useMutation({
    mutationFn: async (dto: SmartSchedulingPayload) => {
      const { data } = await api.post<SmartSchedulingResult>('/scheduling/smart-suggestion', dto);
      return data;
    },
  });
}

// ============================================================================
// Send Confirmations
// ============================================================================

export function useSendConfirmations() {
  return useMutation({
    mutationFn: async (hoursAhead: number) => {
      const { data } = await api.post<{ sent: number; errors: number }>('/scheduling/confirmations/send', { hoursAhead });
      return data;
    },
  });
}

// ============================================================================
// Waitlist (alias for useWaitlistEntries returning flat array)
// ============================================================================

export function useWaitlist(filters?: WaitlistFilters) {
  return useQuery({
    queryKey: schedEnhancedKeys.waitlist(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: WaitlistEntry[]; total: number }>('/scheduling/waitlist', { params: filters });
      return data.data;
    },
  });
}

// ============================================================================
// Wait Time Dashboard
// ============================================================================

export function useWaitTimeDashboard() {
  return useQuery({
    queryKey: schedEnhancedKeys.waitTimeDashboard(),
    queryFn: async () => {
      const { data } = await api.get<WaitTimeDashboard>('/scheduling/wait-time/dashboard');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useWaitTimeStats(filters?: { doctorId?: string; specialty?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: schedEnhancedKeys.waitTimeStats(filters),
    queryFn: async () => {
      const { data } = await api.get<WaitTimeStats[]>('/scheduling/wait-time/stats', { params: filters });
      return data;
    },
  });
}
