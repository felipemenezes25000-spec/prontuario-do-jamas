import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface WaitingRoomEntry {
  waitingId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  position: number;
  waitTime: number;
  joinedAt: string;
  status: 'WAITING' | 'ADMITTED' | 'LEFT';
  chiefComplaint?: string;
  triagePriority?: string;
  deviceInfo?: { browser: string; os: string; hasCamera: boolean; hasMicrophone: boolean };
}

export interface VirtualRoomConfig {
  maxWaitMinutes: number;
  autoAdmit: boolean;
  showPosition: boolean;
  waitingMessage: string;
  waitingMediaUrl?: string;
}

export interface PatientAdmissionResult {
  sessionId: string;
  roomUrl: string;
  token: string;
  patientId: string;
  doctorId: string;
  expiresAt: string;
}

export interface ScreenShareSession {
  id: string;
  sessionId: string;
  sharedBy: 'DOCTOR' | 'PATIENT';
  startedAt: string;
  stoppedAt?: string;
  status: 'ACTIVE' | 'STOPPED';
}

export interface TeleChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderType: 'DOCTOR' | 'PATIENT' | 'SYSTEM';
  senderName: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  attachmentUrl?: string;
  sentAt: string;
}

export interface SendChatMessageDto {
  sessionId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  attachmentUrl?: string;
}

export interface SessionRecording {
  id: string;
  sessionId: string;
  status: 'RECORDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  stoppedAt?: string;
  durationSeconds?: number;
  fileUrl?: string;
  fileSize?: number;
  consentObtained: boolean;
}

export interface AsyncConsultation {
  id: string;
  patientId: string;
  patientName: string;
  requestingDoctorId?: string;
  respondingDoctorId?: string;
  specialty: string;
  subject: string;
  description: string;
  attachments: Array<{ name: string; url: string; type: string }>;
  status: 'PENDING' | 'IN_REVIEW' | 'RESPONDED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  responseText?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface CreateAsyncConsultDto {
  patientId: string;
  specialty: string;
  subject: string;
  description: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
  priority: AsyncConsultation['priority'];
}

export interface RPMDevice {
  id: string;
  patientId: string;
  deviceType: string;
  deviceModel: string;
  serialNumber: string;
  metrics: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED';
  lastSyncAt?: string;
  batteryLevel?: number;
}

export interface RPMReading {
  id: string;
  patientId: string;
  deviceId: string;
  metric: string;
  value: number;
  unit: string;
  isAbnormal: boolean;
  recordedAt: string;
}

export interface RPMAlert {
  alertId: string;
  patientId: string;
  patientName: string;
  deviceId: string;
  metric: string;
  value: number;
  unit: string;
  threshold: { min?: number; max?: number };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface RPMAlertConfig {
  patientId: string;
  metric: string;
  minValue?: number;
  maxValue?: number;
  severity: RPMAlert['severity'];
  notifyDoctor: boolean;
  notifyPatient: boolean;
}

export interface Teleconsultoria {
  id: string;
  requestingDoctorId: string;
  requestingDoctorName: string;
  consultantDoctorId?: string;
  consultantDoctorName?: string;
  specialty: string;
  patientSummary: string;
  clinicalQuestion: string;
  attachments: Array<{ name: string; url: string; type: string }>;
  status: 'PENDING' | 'ASSIGNED' | 'RESPONDED' | 'CLOSED';
  response?: string;
  references?: string[];
  createdAt: string;
  respondedAt?: string;
}

export interface CreateTeleconsultoriaDto {
  specialty: string;
  patientSummary: string;
  clinicalQuestion: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
}

export interface MultiParticipantSession {
  id: string;
  hostDoctorId: string;
  participants: Array<{
    userId: string;
    name: string;
    role: 'DOCTOR' | 'PATIENT' | 'NURSE' | 'FAMILY' | 'INTERPRETER';
    joinedAt: string;
    leftAt?: string;
    status: 'CONNECTED' | 'DISCONNECTED';
  }>;
  maxParticipants: number;
  roomUrl: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'ENDED';
  startedAt: string;
  endedAt?: string;
}

export interface CreateMultiParticipantDto {
  appointmentId?: string;
  patientId: string;
  participants: Array<{ userId: string; role: string }>;
  maxParticipants?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const teleEnhancedKeys = {
  all: ['telemedicine-enhanced'] as const,
  waitingRoom: (doctorId?: string) => [...teleEnhancedKeys.all, 'waiting-room', doctorId] as const,
  waitingRoomConfig: () => [...teleEnhancedKeys.all, 'waiting-room-config'] as const,
  chat: (sessionId: string) => [...teleEnhancedKeys.all, 'chat', sessionId] as const,
  recording: (sessionId: string) => [...teleEnhancedKeys.all, 'recording', sessionId] as const,
  asyncConsults: (filters?: Record<string, unknown>) => [...teleEnhancedKeys.all, 'async-consults', filters] as const,
  asyncConsult: (id: string) => [...teleEnhancedKeys.all, 'async-consult', id] as const,
  rpmDevices: (patientId: string) => [...teleEnhancedKeys.all, 'rpm-devices', patientId] as const,
  rpmReadings: (patientId: string, metric?: string) => [...teleEnhancedKeys.all, 'rpm-readings', patientId, metric] as const,
  rpmAlerts: (filters?: Record<string, unknown>) => [...teleEnhancedKeys.all, 'rpm-alerts', filters] as const,
  rpmAlertConfig: (patientId: string) => [...teleEnhancedKeys.all, 'rpm-alert-config', patientId] as const,
  teleconsultorias: (filters?: Record<string, unknown>) => [...teleEnhancedKeys.all, 'teleconsultoria', filters] as const,
  teleconsultoria: (id: string) => [...teleEnhancedKeys.all, 'teleconsultoria-detail', id] as const,
  multiParticipant: (sessionId: string) => [...teleEnhancedKeys.all, 'multi-participant', sessionId] as const,
};

// ============================================================================
// Virtual Waiting Room (Sala de Espera Virtual)
// ============================================================================

export function useVirtualWaitingRoom(doctorId?: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.waitingRoom(doctorId),
    queryFn: async () => {
      const { data } = await api.get<WaitingRoomEntry[]>('/telemedicine/waiting-room', {
        params: doctorId ? { doctorId } : {},
      });
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useWaitingRoomConfig() {
  return useQuery({
    queryKey: teleEnhancedKeys.waitingRoomConfig(),
    queryFn: async () => {
      const { data } = await api.get<VirtualRoomConfig>('/telemedicine/waiting-room/config');
      return data;
    },
  });
}

export function useUpdateWaitingRoomConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<VirtualRoomConfig>) => {
      const { data } = await api.patch<VirtualRoomConfig>('/telemedicine/waiting-room/config', config);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.waitingRoomConfig() });
    },
  });
}

export function useJoinWaitingRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { appointmentId: string; patientId: string; deviceInfo?: { browser: string; os: string; hasCamera: boolean; hasMicrophone: boolean } }) => {
      const { data } = await api.post<WaitingRoomEntry>('/telemedicine/waiting-room/join', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.waitingRoom() });
    },
  });
}

export function useLeaveWaitingRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (waitingId: string) => {
      await api.post(`/telemedicine/waiting-room/${waitingId}/leave`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.waitingRoom() });
    },
  });
}

// ============================================================================
// Patient Admission
// ============================================================================

export function useAdmitPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (waitingId: string) => {
      const { data } = await api.post<PatientAdmissionResult>(`/telemedicine/waiting-room/${waitingId}/admit`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.waitingRoom() });
    },
  });
}

// ============================================================================
// Screen Share
// ============================================================================

export function useStartScreenShare() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<ScreenShareSession>(`/telemedicine/sessions/${sessionId}/screen-share/start`);
      return data;
    },
  });
}

export function useStopScreenShare() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<ScreenShareSession>(`/telemedicine/sessions/${sessionId}/screen-share/stop`);
      return data;
    },
  });
}

// ============================================================================
// Chat
// ============================================================================

export function useTeleChatMessages(sessionId: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.chat(sessionId),
    queryFn: async () => {
      const { data } = await api.get<TeleChatMessage[]>(`/telemedicine/sessions/${sessionId}/chat`);
      return data;
    },
    enabled: !!sessionId,
    refetchInterval: 5000,
  });
}

export function useSendTeleChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SendChatMessageDto) => {
      const { data } = await api.post<TeleChatMessage>(`/telemedicine/sessions/${dto.sessionId}/chat`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.chat(vars.sessionId) });
    },
  });
}

// ============================================================================
// Session Recording
// ============================================================================

export function useSessionRecording(sessionId: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.recording(sessionId),
    queryFn: async () => {
      const { data } = await api.get<SessionRecording>(`/telemedicine/sessions/${sessionId}/recording`);
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useStartSessionRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, consentObtained }: { sessionId: string; consentObtained: boolean }) => {
      const { data } = await api.post<SessionRecording>(`/telemedicine/sessions/${sessionId}/recording/start`, { consentObtained });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.recording(vars.sessionId) });
    },
  });
}

export function useStopSessionRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<SessionRecording>(`/telemedicine/sessions/${sessionId}/recording/stop`);
      return data;
    },
    onSuccess: (_, sessionId) => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.recording(sessionId) });
    },
  });
}

// ============================================================================
// Async Consultation (Consulta Assíncrona)
// ============================================================================

export function useAsyncConsultations(filters?: { status?: string; specialty?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: teleEnhancedKeys.asyncConsults(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: AsyncConsultation[]; total: number }>('/telemedicine/async-consults', { params: filters });
      return data;
    },
  });
}

export function useAsyncConsultation(id: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.asyncConsult(id),
    queryFn: async () => {
      const { data } = await api.get<AsyncConsultation>(`/telemedicine/async-consults/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAsyncConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAsyncConsultDto) => {
      const { data } = await api.post<AsyncConsultation>('/telemedicine/async-consults', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.asyncConsults() });
    },
  });
}

export function useRespondAsyncConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, responseText }: { id: string; responseText: string }) => {
      const { data } = await api.post<AsyncConsultation>(`/telemedicine/async-consults/${id}/respond`, { responseText });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.asyncConsult(vars.id) });
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.asyncConsults() });
    },
  });
}

// ============================================================================
// RPM — Remote Patient Monitoring
// ============================================================================

export function useRPMDevices(patientId: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.rpmDevices(patientId),
    queryFn: async () => {
      const { data } = await api.get<RPMDevice[]>(`/telemedicine/rpm/devices/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRPMReadings(patientId: string, metric?: string, days?: number) {
  return useQuery({
    queryKey: [...teleEnhancedKeys.rpmReadings(patientId, metric), days],
    queryFn: async () => {
      const { data } = await api.get<RPMReading[]>(`/telemedicine/rpm/readings/${patientId}`, {
        params: { metric, days },
      });
      return data;
    },
    enabled: !!patientId,
  });
}

export function useRPMAlerts(filters?: { patientId?: string; severity?: string; acknowledged?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: teleEnhancedKeys.rpmAlerts(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: RPMAlert[]; total: number }>('/telemedicine/rpm/alerts', { params: filters });
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useAcknowledgeRPMAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data } = await api.patch<RPMAlert>(`/telemedicine/rpm/alerts/${alertId}/acknowledge`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.rpmAlerts() });
    },
  });
}

export function useRPMAlertConfig(patientId: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.rpmAlertConfig(patientId),
    queryFn: async () => {
      const { data } = await api.get<RPMAlertConfig[]>(`/telemedicine/rpm/alert-config/${patientId}`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useUpdateRPMAlertConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (configs: RPMAlertConfig[]) => {
      const { data } = await api.put<RPMAlertConfig[]>('/telemedicine/rpm/alert-config', { configs });
      return data;
    },
    onSuccess: (_, configs) => {
      if (configs && configs.length > 0) {
        qc.invalidateQueries({ queryKey: teleEnhancedKeys.rpmAlertConfig(configs[0]!.patientId) });
      }
    },
  });
}

// ============================================================================
// Teleconsultoria (Tele-Education / Second Opinion)
// ============================================================================

export function useTeleconsultorias(filters?: { status?: string; specialty?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: teleEnhancedKeys.teleconsultorias(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: Teleconsultoria[]; total: number }>('/telemedicine/teleconsultoria', { params: filters });
      return data;
    },
  });
}

export function useTeleconsultoria(id: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.teleconsultoria(id),
    queryFn: async () => {
      const { data } = await api.get<Teleconsultoria>(`/telemedicine/teleconsultoria/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTeleconsultoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTeleconsultoriaDto) => {
      const { data } = await api.post<Teleconsultoria>('/telemedicine/teleconsultoria', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.teleconsultorias() });
    },
  });
}

export function useRespondTeleconsultoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, response, references }: { id: string; response: string; references?: string[] }) => {
      const { data } = await api.post<Teleconsultoria>(`/telemedicine/teleconsultoria/${id}/respond`, { response, references });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.teleconsultoria(vars.id) });
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.teleconsultorias() });
    },
  });
}

// ============================================================================
// Multi-Participant Session
// ============================================================================

export function useMultiParticipantSession(sessionId: string) {
  return useQuery({
    queryKey: teleEnhancedKeys.multiParticipant(sessionId),
    queryFn: async () => {
      const { data } = await api.get<MultiParticipantSession>(`/telemedicine/multi-participant/${sessionId}`);
      return data;
    },
    enabled: !!sessionId,
    refetchInterval: 10000,
  });
}

export function useCreateMultiParticipantSession() {
  return useMutation({
    mutationFn: async (dto: CreateMultiParticipantDto) => {
      const { data } = await api.post<MultiParticipantSession>('/telemedicine/multi-participant', dto);
      return data;
    },
  });
}

export function useAddParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, userId, role }: { sessionId: string; userId: string; role: string }) => {
      const { data } = await api.post(`/telemedicine/multi-participant/${sessionId}/participants`, { userId, role });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.multiParticipant(vars.sessionId) });
    },
  });
}

export function useRemoveParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      await api.delete(`/telemedicine/multi-participant/${sessionId}/participants/${userId}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.multiParticipant(vars.sessionId) });
    },
  });
}

export function useEndMultiParticipantSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post(`/telemedicine/multi-participant/${sessionId}/end`);
      return data;
    },
    onSuccess: (_, sessionId) => {
      qc.invalidateQueries({ queryKey: teleEnhancedKeys.multiParticipant(sessionId) });
    },
  });
}
