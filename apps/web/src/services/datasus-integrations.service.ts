import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface SinanNotificationDto {
  patientId: string;
  diseaseCode: string;
  diseaseName: string;
  notificationDate: string;
  symptoms: string[];
  municipalityCode: string;
  unitCode: string;
  professionalId: string;
}

export interface SinanNotificationResult {
  id: string;
  protocol: string;
  status: 'SENT' | 'PENDING' | 'ERROR';
  sentAt: string;
  message?: string;
}

export interface CadsusQueryDto {
  cpf?: string;
  cns?: string;
  name?: string;
  birthDate?: string;
}

export interface CadsusQueryResult {
  cns: string;
  cpf: string;
  name: string;
  birthDate: string;
  gender: string;
  motherName?: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
  foundAt: string;
}

export interface CnesValidateDto {
  cnesCode: string;
  facilityName?: string;
}

export interface CnesValidateResult {
  valid: boolean;
  cnesCode: string;
  facilityName: string;
  facilityType: string;
  municipalityCode: string;
  active: boolean;
  checkedAt: string;
}

export interface EsusApsDto {
  encounterId: string;
  patientCns: string;
  professionalCns: string;
  procedureCodes: string[];
  competenceDate: string;
  teamCode: string;
}

export interface EsusApsResult {
  id: string;
  status: 'EXPORTED' | 'PENDING' | 'ERROR';
  exportedAt: string;
  errors: string[];
}

export interface DeathCertificateDto {
  patientId: string;
  deathDate: string;
  deathTime?: string;
  causeOfDeath: string;
  secondaryCauses?: string[];
  attendingPhysicianId: string;
  deathType: 'NATURAL' | 'EXTERNAL' | 'UNDETERMINED';
  deathPlace: string;
}

export interface DeathCertificateResult {
  id: string;
  declarationNumber: string;
  patientId: string;
  status: 'ISSUED' | 'PENDING' | 'ERROR';
  issuedAt: string;
  documentUrl?: string;
}

export interface BirthCertificateDto {
  patientId: string;
  birthDate: string;
  birthTime?: string;
  weight: number;
  apgar1: number;
  apgar5: number;
  gestationalAge: number;
  birthType: 'VAGINAL' | 'CESAREAN' | 'FORCEPS';
  attendingPhysicianId: string;
  motherCns?: string;
}

export interface BirthCertificateResult {
  id: string;
  declarationNumber: string;
  patientId: string;
  status: 'ISSUED' | 'PENDING' | 'ERROR';
  issuedAt: string;
  documentUrl?: string;
}

export interface NotiVisaDto {
  patientId: string;
  productType: string;
  productDescription: string;
  incidentDate: string;
  incidentDescription: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'DEATH';
  reportingUnitCode: string;
  professionalId: string;
}

export interface NotiVisaResult {
  id: string;
  protocol: string;
  status: 'SENT' | 'PENDING' | 'ERROR';
  sentAt: string;
  message?: string;
}

export interface MemedPrescriptionDto {
  patientId: string;
  encounterId: string;
  prescriptionId: string;
  physicianId: string;
}

export interface MemedPrescriptionResult {
  id: string;
  externalId: string;
  link: string;
  status: 'SENT' | 'ERROR';
  sentAt: string;
}

export interface WhatsappMessageDto {
  to: string;
  patientId?: string;
  templateName: string;
  templateParams: Record<string, string>;
  encounterId?: string;
}

export interface WhatsappMessageResult {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'ERROR';
  sentAt: string;
  to: string;
}

export interface BulkWhatsappDto {
  messages: WhatsappMessageDto[];
  scheduledAt?: string;
}

export interface BulkWhatsappResult {
  batchId: string;
  total: number;
  queued: number;
  errors: number;
  createdAt: string;
}

// ============================================================================
// SINAN — Notificação Compulsória
// ============================================================================

export function useCreateSinanNotification() {
  return useMutation({
    mutationFn: async (data: SinanNotificationDto) => {
      const { data: res } = await api.post<SinanNotificationResult>('/interop-brazil/sinan', data);
      return res;
    },
  });
}

// ============================================================================
// CADSUS — Consulta de Paciente
// ============================================================================

export function useQueryCadsus() {
  return useMutation({
    mutationFn: async (data: CadsusQueryDto) => {
      const { data: res } = await api.post<CadsusQueryResult>('/interop-brazil/cadsus/query', data);
      return res;
    },
  });
}

// ============================================================================
// CNES — Validação de Estabelecimento
// ============================================================================

export function useValidateCnes() {
  return useMutation({
    mutationFn: async (data: CnesValidateDto) => {
      const { data: res } = await api.post<CnesValidateResult>('/interop-brazil/cnes/validate', data);
      return res;
    },
  });
}

// ============================================================================
// e-SUS APS — Exportação
// ============================================================================

export function useExportEsusAps() {
  return useMutation({
    mutationFn: async (data: EsusApsDto) => {
      const { data: res } = await api.post<EsusApsResult>('/interop-brazil/esus-aps', data);
      return res;
    },
  });
}

// ============================================================================
// SIM — Declaração de Óbito
// ============================================================================

export function useIssueDeathCertificate() {
  return useMutation({
    mutationFn: async (data: DeathCertificateDto) => {
      const { data: res } = await api.post<DeathCertificateResult>('/interop-brazil/sim/death-certificate', data);
      return res;
    },
  });
}

// ============================================================================
// SINASC — Declaração de Nascido Vivo
// ============================================================================

export function useIssueBirthCertificate() {
  return useMutation({
    mutationFn: async (data: BirthCertificateDto) => {
      const { data: res } = await api.post<BirthCertificateResult>('/interop-brazil/sinasc/birth-certificate', data);
      return res;
    },
  });
}

// ============================================================================
// NOTIVISA — Tecnovigilância / Hemovigilância
// ============================================================================

export function useReportNotivisa() {
  return useMutation({
    mutationFn: async (data: NotiVisaDto) => {
      const { data: res } = await api.post<NotiVisaResult>('/interop-brazil/notivisa', data);
      return res;
    },
  });
}

// ============================================================================
// Memed — Prescrição Digital
// ============================================================================

export function useSendMemedPrescription() {
  return useMutation({
    mutationFn: async (data: MemedPrescriptionDto) => {
      const { data: res } = await api.post<MemedPrescriptionResult>('/interop-brazil/memed/send', data);
      return res;
    },
  });
}

// ============================================================================
// WhatsApp — Mensagem Individual
// ============================================================================

export function useSendWhatsappMessage() {
  return useMutation({
    mutationFn: async (data: WhatsappMessageDto) => {
      const { data: res } = await api.post<WhatsappMessageResult>('/interop-brazil/whatsapp/send', data);
      return res;
    },
  });
}

// ============================================================================
// WhatsApp — Envio em Massa
// ============================================================================

export function useSendBulkWhatsapp() {
  return useMutation({
    mutationFn: async (data: BulkWhatsappDto) => {
      const { data: res } = await api.post<BulkWhatsappResult>('/interop-brazil/whatsapp/bulk', data);
      return res;
    },
  });
}
