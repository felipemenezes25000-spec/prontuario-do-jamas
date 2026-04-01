import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types — Enhanced Scheduling
// ============================================================================

export interface ScheduleSlot {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  type: 'REGULAR' | 'RETURN' | 'TELEMEDICINE';
  location?: string;
}

export interface SlotFilters {
  doctorId?: string;
  specialty?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  type?: ScheduleSlot['type'];
  onlyAvailable?: boolean;
}

export interface BookAppointmentDto {
  slotId: string;
  patientId: string;
  reason: string;
  notes?: string;
  isTelemedicine?: boolean;
}

export interface RescheduleDto {
  appointmentId: string;
  newSlotId: string;
  reason: string;
}

export interface CancelAppointmentDto {
  appointmentId: string;
  reason: string;
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
  status: 'WAITING' | 'NOTIFIED' | 'SCHEDULED' | 'CANCELLED';
}

export interface JoinWaitlistDto {
  patientId: string;
  doctorId?: string;
  specialty: string;
  priority: WaitlistEntry['priority'];
  preferredDays?: string[];
  preferredTimes?: string[];
}

export interface RecurringAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  specialty: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  dayOfWeek?: number;
  time: string;
  startDate: string;
  endDate?: string;
  totalOccurrences?: number;
  scheduledAppointments: string[];
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}

export interface CreateRecurringDto {
  patientId: string;
  doctorId: string;
  specialty: string;
  frequency: RecurringAppointment['frequency'];
  dayOfWeek?: number;
  time: string;
  startDate: string;
  endDate?: string;
  totalOccurrences?: number;
  reason: string;
}

// ============================================================================
// Types — Digital Check-in
// ============================================================================

export interface CheckInStatus {
  appointmentId: string;
  step: 'NOT_STARTED' | 'IDENTITY' | 'DEMOGRAPHICS' | 'INSURANCE' | 'CONSENTS' | 'QUESTIONNAIRE' | 'COMPLETED';
  completedSteps: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface CheckInDemographicsDto {
  appointmentId: string;
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: { name: string; phone: string; relationship: string };
}

export interface CheckInInsuranceDto {
  appointmentId: string;
  insuranceProvider: string;
  planNumber: string;
  cardNumber: string;
  validUntil: string;
}

export interface CheckInConsentDto {
  appointmentId: string;
  consents: Array<{ consentType: string; accepted: boolean; signatureData?: string }>;
}

export interface CheckInQuestionnaireDto {
  appointmentId: string;
  answers: Record<string, string | number | boolean>;
}

// ============================================================================
// Types — Exam Results
// ============================================================================

export interface ExamResult {
  id: string;
  examType: string;
  examName: string;
  orderedBy: string;
  collectedAt: string;
  resultAt: string;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  results: Array<{
    parameter: string;
    value: string;
    unit: string;
    referenceRange: string;
    isAbnormal: boolean;
  }>;
  reportUrl?: string;
  observations?: string;
}

export interface ExamTrend {
  parameter: string;
  unit: string;
  referenceRange: string;
  dataPoints: Array<{ date: string; value: number }>;
}

// ============================================================================
// Types — Messaging
// ============================================================================

export interface PortalMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'PATIENT' | 'DOCTOR' | 'NURSE' | 'SYSTEM';
  senderName: string;
  content: string;
  attachments: Array<{ name: string; url: string; type: string }>;
  readAt?: string;
  sentAt: string;
}

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'OPEN' | 'CLOSED' | 'AWAITING_RESPONSE';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  triageCategory?: string;
}

export interface SendMessageDto {
  conversationId: string;
  content: string;
  attachments?: Array<{ name: string; data: string; type: string }>;
}

export interface CreateConversationDto {
  patientId: string;
  providerId: string;
  subject: string;
  initialMessage: string;
}

export interface MessageTriageResult {
  conversationId: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  category: string;
  suggestedAction: string;
  requiresImmediate: boolean;
}

// ============================================================================
// Types — Prescription Renewal
// ============================================================================

export interface PrescriptionRenewalRequest {
  id: string;
  patientId: string;
  patientName: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
  reviewedBy?: string;
  reviewedAt?: string;
  denialReason?: string;
  notes?: string;
}

export interface RequestRenewalDto {
  prescriptionId: string;
  patientId: string;
  notes?: string;
}

export interface ApproveRenewalDto {
  requestId: string;
  newEndDate: string;
  adjustments?: { dosage?: string; frequency?: string; notes?: string };
}

// ============================================================================
// Types — Reminders
// ============================================================================

export interface PatientReminder {
  id: string;
  patientId: string;
  type: 'APPOINTMENT' | 'MEDICATION' | 'EXAM' | 'VACCINATION' | 'FOLLOW_UP' | 'CUSTOM';
  title: string;
  message: string;
  scheduledFor: string;
  sentAt?: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP';
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
}

export interface CreateReminderDto {
  patientId: string;
  type: PatientReminder['type'];
  title: string;
  message: string;
  scheduledFor: string;
  channel: PatientReminder['channel'];
}

// ============================================================================
// Types — Health Diary
// ============================================================================

export interface HealthDiaryEntry {
  id: string;
  patientId: string;
  date: string;
  type: 'SYMPTOM' | 'VITAL' | 'ACTIVITY' | 'DIET' | 'MEDICATION' | 'MOOD' | 'NOTE';
  title: string;
  content: string;
  measurements?: Record<string, number>;
  tags?: string[];
  attachments?: string[];
  createdAt: string;
}

export interface CreateDiaryEntryDto {
  patientId: string;
  type: HealthDiaryEntry['type'];
  title: string;
  content: string;
  measurements?: Record<string, number>;
  tags?: string[];
}

// ============================================================================
// Types — Surveys
// ============================================================================

export interface NPSSurvey {
  id: string;
  patientId: string;
  encounterId?: string;
  score: number;
  comment?: string;
  submittedAt: string;
}

export interface PROMSSurvey {
  id: string;
  patientId: string;
  instrumentName: string;
  responses: Record<string, number>;
  totalScore: number;
  interpretation: string;
  submittedAt: string;
}

export interface SatisfactionDashboard {
  npsScore: number;
  npsResponses: number;
  npsTrend: Array<{ month: string; score: number }>;
  npsDistribution: { promoters: number; passives: number; detractors: number };
  satisfactionByDepartment: Array<{ department: string; score: number; responses: number }>;
  topComplaints: Array<{ category: string; count: number }>;
  topPraises: Array<{ category: string; count: number }>;
  promsMean: Array<{ instrument: string; meanScore: number; count: number }>;
}

export interface SubmitNPSDto {
  encounterId?: string;
  score: number;
  comment?: string;
}

export interface SubmitPROMSDto {
  instrumentName: string;
  responses: Record<string, number>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const portalEnhancedKeys = {
  all: ['patient-portal-enhanced'] as const,
  slots: (filters?: SlotFilters) => [...portalEnhancedKeys.all, 'slots', filters] as const,
  waitlist: (patientId?: string) => [...portalEnhancedKeys.all, 'waitlist', patientId] as const,
  recurring: (patientId: string) => [...portalEnhancedKeys.all, 'recurring', patientId] as const,
  checkInStatus: (appointmentId: string) => [...portalEnhancedKeys.all, 'checkin', appointmentId] as const,
  examResults: (patientId: string) => [...portalEnhancedKeys.all, 'exams', patientId] as const,
  examTrend: (patientId: string, parameter: string) => [...portalEnhancedKeys.all, 'exam-trend', patientId, parameter] as const,
  conversations: (patientId: string) => [...portalEnhancedKeys.all, 'conversations', patientId] as const,
  messages: (conversationId: string) => [...portalEnhancedKeys.all, 'messages', conversationId] as const,
  messageQueue: () => [...portalEnhancedKeys.all, 'message-queue'] as const,
  renewalRequests: (patientId?: string) => [...portalEnhancedKeys.all, 'renewals', patientId] as const,
  renewalQueue: () => [...portalEnhancedKeys.all, 'renewal-queue'] as const,
  reminders: (patientId: string) => [...portalEnhancedKeys.all, 'reminders', patientId] as const,
  diary: (patientId: string) => [...portalEnhancedKeys.all, 'diary', patientId] as const,
  satisfactionDashboard: (params?: Record<string, string>) => [...portalEnhancedKeys.all, 'satisfaction', params] as const,
};

// ============================================================================
// Enhanced Scheduling
// ============================================================================

export function useAvailableSlots(filters?: SlotFilters) {
  return useQuery({
    queryKey: portalEnhancedKeys.slots(filters),
    queryFn: async () => {
      const { data } = await api.get<ScheduleSlot[]>('/portal/scheduling/slots', { params: filters });
      return data;
    },
  });
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: BookAppointmentDto) => {
      const { data } = await api.post('/portal/scheduling/book', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.slots() });
    },
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: RescheduleDto) => {
      const { data } = await api.post('/portal/scheduling/reschedule', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.slots() });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CancelAppointmentDto) => {
      const { data } = await api.post('/portal/scheduling/cancel', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.slots() });
    },
  });
}

export function useWaitlist(patientId?: string) {
  return useQuery({
    queryKey: portalEnhancedKeys.waitlist(patientId),
    queryFn: async () => {
      const { data } = await api.get<WaitlistEntry[]>('/portal/scheduling/waitlist', {
        params: patientId ? { patientId } : {},
      });
      return data;
    },
  });
}

export function useJoinWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: JoinWaitlistDto) => {
      const { data } = await api.post<WaitlistEntry>('/portal/scheduling/waitlist', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.waitlist(vars.patientId) });
    },
  });
}

export function useLeaveWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, patientId: _patientId }: { entryId: string; patientId: string }) => {
      await api.delete(`/portal/scheduling/waitlist/${entryId}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.waitlist(vars.patientId) });
    },
  });
}

export function useRecurringAppointments(patientId: string) {
  return useQuery({
    queryKey: portalEnhancedKeys.recurring(patientId),
    queryFn: async () => {
      const { data } = await api.get<RecurringAppointment[]>(`/portal/scheduling/recurring/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateRecurringAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateRecurringDto) => {
      const { data } = await api.post<RecurringAppointment>('/portal/scheduling/recurring', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.recurring(vars.patientId) });
    },
  });
}

export function useCancelRecurringAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recurringId, patientId: _patientId }: { recurringId: string; patientId: string }) => {
      const { data } = await api.patch(`/portal/scheduling/recurring/${recurringId}/cancel`);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.recurring(vars.patientId) });
    },
  });
}

// ============================================================================
// Digital Check-in Flow
// ============================================================================

export function useCheckInStatus(appointmentId: string) {
  return useQuery({
    queryKey: portalEnhancedKeys.checkInStatus(appointmentId),
    queryFn: async () => {
      const { data } = await api.get<CheckInStatus>(`/portal/checkin/${appointmentId}/status`);
      return data;
    },
    enabled: !!appointmentId,
  });
}

export function useStartCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.post<CheckInStatus>(`/portal/checkin/${appointmentId}/start`);
      return data;
    },
    onSuccess: (_, appointmentId) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.checkInStatus(appointmentId) });
    },
  });
}

export function useSubmitCheckInDemographics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CheckInDemographicsDto) => {
      const { data } = await api.post(`/portal/checkin/${dto.appointmentId}/demographics`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.checkInStatus(vars.appointmentId) });
    },
  });
}

export function useSubmitCheckInInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CheckInInsuranceDto) => {
      const { data } = await api.post(`/portal/checkin/${dto.appointmentId}/insurance`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.checkInStatus(vars.appointmentId) });
    },
  });
}

export function useSubmitCheckInConsents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CheckInConsentDto) => {
      const { data } = await api.post(`/portal/checkin/${dto.appointmentId}/consents`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.checkInStatus(vars.appointmentId) });
    },
  });
}

export function useSubmitCheckInQuestionnaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CheckInQuestionnaireDto) => {
      const { data } = await api.post(`/portal/checkin/${dto.appointmentId}/questionnaire`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.checkInStatus(vars.appointmentId) });
    },
  });
}

export function useCompleteCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.post<CheckInStatus>(`/portal/checkin/${appointmentId}/complete`);
      return data;
    },
    onSuccess: (_, appointmentId) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.checkInStatus(appointmentId) });
    },
  });
}

// ============================================================================
// Exam Results with Trends
// ============================================================================

export function useExamResults(patientId: string, filters?: { examType?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [...portalEnhancedKeys.examResults(patientId), filters],
    queryFn: async () => {
      const { data } = await api.get<ExamResult[]>(`/portal/exams/${patientId}`, { params: filters });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useExamTrend(patientId: string, parameter: string) {
  return useQuery({
    queryKey: portalEnhancedKeys.examTrend(patientId, parameter),
    queryFn: async () => {
      const { data } = await api.get<ExamTrend>(`/portal/exams/${patientId}/trend/${parameter}`);
      return data;
    },
    enabled: !!(patientId && parameter),
  });
}

// ============================================================================
// Messaging
// ============================================================================

export function useConversations(patientId: string) {
  return useQuery({
    queryKey: portalEnhancedKeys.conversations(patientId),
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>(`/portal/messaging/conversations`, { params: { patientId } });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: portalEnhancedKeys.messages(conversationId),
    queryFn: async () => {
      const { data } = await api.get<PortalMessage[]>(`/portal/messaging/conversations/${conversationId}/messages`);
      return data;
    },
    enabled: !!conversationId,
    refetchInterval: 15000,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateConversationDto) => {
      const { data } = await api.post<Conversation>('/portal/messaging/conversations', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.conversations(vars.patientId) });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SendMessageDto) => {
      const { data } = await api.post<PortalMessage>(`/portal/messaging/conversations/${dto.conversationId}/messages`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.messages(vars.conversationId) });
    },
  });
}

export function useTriageMessage() {
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await api.post<MessageTriageResult>(`/portal/messaging/conversations/${conversationId}/triage`);
      return data;
    },
  });
}

export function useMessageQueue() {
  return useQuery({
    queryKey: portalEnhancedKeys.messageQueue(),
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>('/portal/messaging/queue');
      return data;
    },
  });
}

// ============================================================================
// Prescription Renewal
// ============================================================================

export function usePrescriptionRenewalRequests(patientId?: string) {
  return useQuery({
    queryKey: portalEnhancedKeys.renewalRequests(patientId),
    queryFn: async () => {
      const { data } = await api.get<PrescriptionRenewalRequest[]>('/portal/prescription-renewal', {
        params: patientId ? { patientId } : {},
      });
      return data;
    },
  });
}

export function useRequestPrescriptionRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: RequestRenewalDto) => {
      const { data } = await api.post<PrescriptionRenewalRequest>('/portal/prescription-renewal', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.renewalRequests(vars.patientId) });
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.renewalQueue() });
    },
  });
}

export function useApprovePrescriptionRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ApproveRenewalDto) => {
      const { data } = await api.post<PrescriptionRenewalRequest>(`/portal/prescription-renewal/${dto.requestId}/approve`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.renewalRequests() });
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.renewalQueue() });
    },
  });
}

export function useDenyPrescriptionRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { data } = await api.post<PrescriptionRenewalRequest>(`/portal/prescription-renewal/${requestId}/deny`, { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.renewalRequests() });
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.renewalQueue() });
    },
  });
}

export function usePrescriptionRenewalQueue() {
  return useQuery({
    queryKey: portalEnhancedKeys.renewalQueue(),
    queryFn: async () => {
      const { data } = await api.get<PrescriptionRenewalRequest[]>('/portal/prescription-renewal/queue');
      return data;
    },
  });
}

// ============================================================================
// Reminders
// ============================================================================

export function usePatientReminders(patientId: string) {
  return useQuery({
    queryKey: portalEnhancedKeys.reminders(patientId),
    queryFn: async () => {
      const { data } = await api.get<PatientReminder[]>(`/portal/reminders/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateReminderDto) => {
      const { data } = await api.post<PatientReminder>('/portal/reminders', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.reminders(vars.patientId) });
    },
  });
}

export function useCancelReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reminderId, patientId: _patientId }: { reminderId: string; patientId: string }) => {
      await api.patch(`/portal/reminders/${reminderId}/cancel`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.reminders(vars.patientId) });
    },
  });
}

// ============================================================================
// Health Diary
// ============================================================================

export function useHealthDiary(patientId: string, filters?: { type?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [...portalEnhancedKeys.diary(patientId), filters],
    queryFn: async () => {
      const { data } = await api.get<HealthDiaryEntry[]>(`/portal/health-diary/${patientId}`, { params: filters });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useCreateDiaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDiaryEntryDto) => {
      const { data } = await api.post<HealthDiaryEntry>('/portal/health-diary', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.diary(vars.patientId) });
    },
  });
}

export function useDeleteDiaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, patientId: _patientId }: { entryId: string; patientId: string }) => {
      await api.delete(`/portal/health-diary/${entryId}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.diary(vars.patientId) });
    },
  });
}

// ============================================================================
// Surveys (NPS, PROMs, Satisfaction)
// ============================================================================

export function useSubmitNPS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SubmitNPSDto) => {
      const { data } = await api.post<NPSSurvey>('/portal/surveys/nps', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.satisfactionDashboard() });
    },
  });
}

export function useSubmitPROMS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SubmitPROMSDto) => {
      const { data } = await api.post<PROMSSurvey>('/portal/surveys/proms', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalEnhancedKeys.satisfactionDashboard() });
    },
  });
}

export function useSatisfactionDashboard(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: portalEnhancedKeys.satisfactionDashboard(params as Record<string, string>),
    queryFn: async () => {
      const { data } = await api.get<SatisfactionDashboard>('/portal/surveys/satisfaction-dashboard', { params });
      return data;
    },
  });
}
