import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface EligibilityCheckDto {
  patientId: string;
  insuranceProvider: string;
  procedureCode?: string;
  planId?: string;
}

export interface EligibilityCheckResult {
  eligible: boolean;
  patientId: string;
  insuranceProvider: string;
  planName: string;
  planType: string;
  validFrom: string;
  validTo: string;
  copay?: number;
  deductible?: number;
  coverageDetails: Record<string, boolean>;
  restrictions: string[];
  checkedAt: string;
}

export interface PriceTable {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  unitPrice: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePriceTableDto {
  name: string;
  code: string;
  description: string;
  category: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface HospitalBillDto {
  patientId: string;
  admissionId: string;
  items: Array<{ code: string; description: string; quantity: number; unitPrice: number; dateOfService: string }>;
  insuranceProvider?: string;
  notes?: string;
}

export interface HospitalBill {
  id: string;
  patientId: string;
  admissionId: string;
  billNumber: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'PAID';
  totalAmount: number;
  items: Array<{ code: string; description: string; quantity: number; unitPrice: number; totalPrice: number; dateOfService: string }>;
  createdAt: string;
}

export interface BudgetDto {
  patientId: string;
  procedures: Array<{ code: string; name: string; price: number }>;
  discount?: number;
  paymentTerms: string;
  validDays: number;
  notes?: string;
}

export interface Budget {
  id: string;
  patientId: string;
  budgetNumber: string;
  procedures: Array<{ code: string; name: string; price: number }>;
  totalAmount: number;
  discount?: number;
  finalAmount: number;
  paymentTerms: string;
  validUntil: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

export interface PreBillingAuditDto {
  accountId: string;
  auditType?: 'FULL' | 'SPOT_CHECK';
  auditorId?: string;
}

export interface PreBillingAuditResult {
  accountId: string;
  findings: Array<{
    type: 'OVERCHARGE' | 'UNDERCHARGE' | 'DUPLICATE' | 'MISSING_ITEM' | 'CODING_ERROR' | 'OK';
    description: string;
    itemCode?: string;
    originalAmount?: number;
    correctedAmount?: number;
  }>;
  totalFindings: number;
  estimatedImpact: number;
  auditedAt: string;
}

export interface TissGuideDto {
  guideType: 'SP_SADT' | 'INTERNACAO' | 'CONSULTA' | 'HONORARIOS' | 'RESUMO_INTERNACAO';
  encounterId: string;
  insuranceProvider: string;
  items: Array<{ code: string; quantity: number; unitPrice: number }>;
}

export interface TissGuide {
  id: string;
  guideType: string;
  guideNumber: string;
  patientId: string;
  encounterId?: string;
  insuranceProvider: string;
  xml: string;
  status: 'DRAFT' | 'GENERATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  errors: string[];
  generatedAt: string;
  submittedAt?: string;
}

export interface TissBatchDto {
  insuranceProvider: string;
  guideIds: string[];
  competenceMonth?: string;
}

export interface TissBatch {
  id: string;
  batchNumber: string;
  insuranceProvider: string;
  guidesCount: number;
  totalAmount: number;
  status: 'PENDING' | 'SUBMITTED' | 'PARTIALLY_ACCEPTED' | 'ACCEPTED' | 'REJECTED';
  submittedAt?: string;
  responseAt?: string;
  responseProtocol?: string;
}

export interface Glosa {
  id: string;
  guideId: string;
  guideNumber: string;
  insuranceProvider: string;
  patientName: string;
  itemCode: string;
  itemDescription: string;
  amount: number;
  reason: string;
  reasonCode: string;
  status: 'OPEN' | 'APPEALED' | 'RESOLVED' | 'WRITTEN_OFF';
  appealDeadline: string;
  appealedAt?: string;
  resolvedAt?: string;
  recoveredAmount?: number;
}

export interface RegisterGlosaDto {
  guideId: string;
  itemCode: string;
  itemDescription: string;
  amount: number;
  reason: string;
  reasonCode: string;
  appealDeadline: string;
}

export interface AppealGlosaDto {
  glosaId: string;
  justification: string;
  supportingDocs?: string[];
}

export interface GlosaFilters {
  status?: Glosa['status'];
  insuranceProvider?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SusBillingDto {
  patientId: string;
  encounterId: string;
  procedureCode: string;
  type: 'BPA' | 'AIH' | 'APAC';
  competenceMonth: string;
}

export interface SusBillingRecord {
  id: string;
  patientId: string;
  encounterId: string;
  procedureCode: string;
  aihNumber?: string;
  apacNumber?: string;
  type: 'BPA' | 'AIH' | 'APAC';
  amount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  competenceMonth: string;
  submittedAt?: string;
}

export interface CostPerCaseResult {
  admissionId: string;
  patientName: string;
  diagnosis: string;
  totalCost: number;
  directCosts: { medications: number; supplies: number; procedures: number; lab: number; imaging: number };
  indirectCosts: { nursing: number; overhead: number; equipment: number };
  reimbursement: number;
  profitMargin: number;
  benchmark: number;
  variance: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const billingInsuranceKeys = {
  all: ['billing-insurance'] as const,
  priceTables: () => [...billingInsuranceKeys.all, 'price-tables'] as const,
  glosas: (filters?: GlosaFilters) => [...billingInsuranceKeys.all, 'glosas', filters] as const,
  costPerCase: (admissionId: string) => [...billingInsuranceKeys.all, 'cost-per-case', admissionId] as const,
};

// ============================================================================
// Eligibility Check
// ============================================================================

export function useCheckEligibility() {
  return useMutation({
    mutationFn: async (data: EligibilityCheckDto) => {
      const { data: res } = await api.post<EligibilityCheckResult>('/billing/eligibility-check', data);
      return res;
    },
  });
}

// ============================================================================
// Price Tables
// ============================================================================

export function useGetPriceTables() {
  return useQuery({
    queryKey: billingInsuranceKeys.priceTables(),
    queryFn: async () => {
      const { data } = await api.get<PriceTable[]>('/billing/price-tables');
      return data;
    },
  });
}

export function useCreatePriceTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePriceTableDto) => {
      const { data } = await api.post<PriceTable>('/billing/price-tables', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingInsuranceKeys.priceTables() });
    },
  });
}

// ============================================================================
// Hospital Bill
// ============================================================================

export function useCreateHospitalBill() {
  return useMutation({
    mutationFn: async (data: HospitalBillDto) => {
      const { data: res } = await api.post<HospitalBill>('/billing/hospital-bill', data);
      return res;
    },
  });
}

// ============================================================================
// Private Pay Budget
// ============================================================================

export function useCreateBudget() {
  return useMutation({
    mutationFn: async (data: BudgetDto) => {
      const { data: res } = await api.post<Budget>('/billing/private-pay/budget', data);
      return res;
    },
  });
}

// ============================================================================
// Pre-Billing Audit
// ============================================================================

export function useRunAudit() {
  return useMutation({
    mutationFn: async (data: PreBillingAuditDto) => {
      const { data: res } = await api.post<PreBillingAuditResult>('/billing/pre-billing-audit', data);
      return res;
    },
  });
}

// ============================================================================
// TISS Guide
// ============================================================================

export function useGenerateTissGuide() {
  return useMutation({
    mutationFn: async (data: TissGuideDto) => {
      const { data: res } = await api.post<TissGuide>('/billing/tiss-guide', data);
      return res;
    },
  });
}

// ============================================================================
// TISS Batch
// ============================================================================

export function useSubmitTissBatch() {
  return useMutation({
    mutationFn: async (data: TissBatchDto) => {
      const { data: res } = await api.post<TissBatch>('/billing/tiss-batch', data);
      return res;
    },
  });
}

// ============================================================================
// Glosas
// ============================================================================

export function useListGlosas(filters?: GlosaFilters) {
  return useQuery({
    queryKey: billingInsuranceKeys.glosas(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: Glosa[]; total: number }>('/billing/glosas', { params: filters });
      return data;
    },
  });
}

export function useRegisterGlosa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: RegisterGlosaDto) => {
      const { data } = await api.post<Glosa>('/billing/glosas', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingInsuranceKeys.glosas() });
    },
  });
}

export function useSubmitAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AppealGlosaDto) => {
      const { data } = await api.post<Glosa>(`/billing/glosas/${dto.glosaId}/appeal`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingInsuranceKeys.glosas() });
    },
  });
}

// ============================================================================
// SUS Billing
// ============================================================================

export function useGenerateSusBilling() {
  return useMutation({
    mutationFn: async (data: SusBillingDto) => {
      const { data: res } = await api.post<SusBillingRecord>('/billing/sus-billing', data);
      return res;
    },
  });
}

// ============================================================================
// Cost Per Case
// ============================================================================

export function useGetCostPerCase(admissionId: string) {
  return useQuery({
    queryKey: billingInsuranceKeys.costPerCase(admissionId),
    queryFn: async () => {
      const { data } = await api.get<CostPerCaseResult>(`/billing/cost-per-case/${admissionId}`);
      return data;
    },
    enabled: !!admissionId,
  });
}
