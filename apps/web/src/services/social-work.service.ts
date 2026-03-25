import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Query Keys
// ============================================================================

export const socialWorkKeys = {
  all: ['social-work'] as const,
  assessments: (params?: Record<string, unknown>) => [...socialWorkKeys.all, 'assessments', params] as const,
  assessment: (id: string) => [...socialWorkKeys.all, 'assessment', id] as const,
  referrals: (params?: Record<string, unknown>) => [...socialWorkKeys.all, 'referrals', params] as const,
};

// ============================================================================
// Types
// ============================================================================

export type VulnerabilityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type ReferralStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface SocialAssessment {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  housingStatus: string;
  employmentStatus: string;
  familySupport: string;
  incomeRange: string;
  healthInsurance: string;
  vulnerabilityLevel: VulnerabilityLevel;
  vulnerabilityIndicators: string[];
  socialNetwork: string;
  notes: string;
  assessedBy: string;
  assessedAt: string;
}

export interface CreateSocialAssessmentDto {
  patientId: string;
  encounterId: string;
  housingStatus: string;
  employmentStatus: string;
  familySupport: string;
  incomeRange: string;
  healthInsurance: string;
  vulnerabilityLevel: VulnerabilityLevel;
  vulnerabilityIndicators: string[];
  socialNetwork: string;
  notes?: string;
}

export interface SocialReferral {
  id: string;
  patientId: string;
  patientName: string;
  assessmentId: string;
  referralType: string;
  destination: string;
  reason: string;
  status: ReferralStatus;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReferralDto {
  patientId: string;
  assessmentId: string;
  referralType: string;
  destination: string;
  reason: string;
  notes?: string;
}

// ============================================================================
// Hooks
// ============================================================================

export function useSocialAssessments(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: socialWorkKeys.assessments(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: SocialAssessment[]; total: number }>(
        '/social-work/assessments',
        { params },
      );
      return data;
    },
  });
}

export function useCreateSocialAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSocialAssessmentDto) => {
      const { data } = await api.post<SocialAssessment>('/social-work/assessments', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialWorkKeys.assessments() });
    },
  });
}

export function useSocialReferrals(params?: { page?: number; limit?: number; status?: ReferralStatus }) {
  return useQuery({
    queryKey: socialWorkKeys.referrals(params),
    queryFn: async () => {
      const { data } = await api.get<{ data: SocialReferral[]; total: number }>(
        '/social-work/referrals',
        { params },
      );
      return data;
    },
  });
}

export function useCreateReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateReferralDto) => {
      const { data } = await api.post<SocialReferral>('/social-work/referrals', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialWorkKeys.referrals() });
    },
  });
}

export function useUpdateReferralStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: ReferralStatus; notes?: string }) => {
      const { data } = await api.patch<SocialReferral>(`/social-work/referrals/${id}/status`, { status, notes });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialWorkKeys.referrals() });
    },
  });
}
