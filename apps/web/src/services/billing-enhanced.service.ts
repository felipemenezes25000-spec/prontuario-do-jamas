import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

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

export interface PriorAuth {
  id: string;
  patientId: string;
  encounterId?: string;
  insuranceProvider: string;
  procedureCode: string;
  procedureName: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CANCELLED';
  requestedAt: string;
  respondedAt?: string;
  authorizationNumber?: string;
  validUntil?: string;
  denialReason?: string;
  clinicalJustification: string;
  supportingDocs: string[];
  requestedBy: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
}

export interface CreatePriorAuthDto {
  patientId: string;
  encounterId?: string;
  insuranceProvider: string;
  procedureCode: string;
  procedureName: string;
  clinicalJustification: string;
  supportingDocs?: string[];
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
}

export interface PriorAuthFilters {
  status?: PriorAuth['status'];
  insuranceProvider?: string;
  patientId?: string;
  priority?: PriorAuth['priority'];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PriceTableEntry {
  id: string;
  code: string;
  description: string;
  category: string;
  basePrice: number;
  currency: string;
  table: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface PriceTableFilters {
  table?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreatePriceTableEntryDto {
  code: string;
  description: string;
  category: string;
  basePrice: number;
  table: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface HospitalAccount {
  id: string;
  patientId: string;
  admissionId: string;
  accountNumber: string;
  status: 'OPEN' | 'CLOSED' | 'AUDITED' | 'BILLED' | 'PAID';
  items: HospitalAccountItem[];
  totalAmount: number;
  insuranceCoverage: number;
  patientResponsibility: number;
  openedAt: string;
  closedAt?: string;
}

export interface HospitalAccountItem {
  id: string;
  code: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  dateOfService: string;
  coveredByInsurance: boolean;
}

export interface AddAccountItemDto {
  accountId: string;
  code: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  dateOfService: string;
}

export interface PrivateQuote {
  id: string;
  patientId: string;
  procedures: Array<{ code: string; name: string; price: number }>;
  totalAmount: number;
  discount?: number;
  finalAmount: number;
  paymentTerms: string;
  validUntil: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

export interface CreatePrivateQuoteDto {
  patientId: string;
  procedures: Array<{ code: string; name: string; price: number }>;
  discount?: number;
  paymentTerms: string;
  validDays: number;
}

export interface AccountAuditEntry {
  id: string;
  accountId: string;
  auditorId: string;
  findingType: 'OVERCHARGE' | 'UNDERCHARGE' | 'DUPLICATE' | 'MISSING_ITEM' | 'CODING_ERROR' | 'OK';
  description: string;
  originalAmount?: number;
  correctedAmount?: number;
  status: 'OPEN' | 'RESOLVED' | 'DISPUTED';
  createdAt: string;
}

export interface TISSGuide {
  id: string;
  guideType: 'SP_SADT' | 'INTERNACAO' | 'CONSULTA' | 'HONORARIOS' | 'RESUMO_INTERNACAO';
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

export interface GenerateTISSDto {
  guideType: TISSGuide['guideType'];
  encounterId: string;
  insuranceProvider: string;
  items: Array<{ code: string; quantity: number; unitPrice: number }>;
}

export interface TISSBatch {
  id: string;
  batchNumber: string;
  insuranceProvider: string;
  guides: string[];
  guidesCount: number;
  totalAmount: number;
  status: 'PENDING' | 'SUBMITTED' | 'PARTIALLY_ACCEPTED' | 'ACCEPTED' | 'REJECTED';
  submittedAt?: string;
  responseAt?: string;
  responseProtocol?: string;
}

export interface CreateTISSBatchDto {
  insuranceProvider: string;
  guideIds: string[];
}

export interface Disallowance {
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

export interface DisallowanceFilters {
  status?: Disallowance['status'];
  insuranceProvider?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DisallowanceMetrics {
  totalDisallowed: number;
  totalRecovered: number;
  recoveryRate: number;
  openCount: number;
  appealedCount: number;
  byInsurer: Array<{ insurer: string; amount: number; count: number }>;
  byReason: Array<{ reason: string; amount: number; count: number }>;
  trend: Array<{ month: string; disallowed: number; recovered: number }>;
}

export interface CodingSuggestion {
  procedureDescription: string;
  suggestedCodes: Array<{
    code: string;
    description: string;
    table: string;
    confidence: number;
    rationale: string;
  }>;
  diagnosisCodes: Array<{
    code: string;
    description: string;
    type: 'PRIMARY' | 'SECONDARY';
  }>;
}

export interface SUSBillingRecord {
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

export interface CreateSUSBillingDto {
  patientId: string;
  encounterId: string;
  procedureCode: string;
  type: 'BPA' | 'AIH' | 'APAC';
  competenceMonth: string;
}

export interface FinancialDashboard {
  revenue: { total: number; trend: Array<{ month: string; amount: number }> };
  receivables: { total: number; overdue: number; aging: Array<{ range: string; amount: number }> };
  collections: { total: number; rate: number; byInsurer: Array<{ insurer: string; collected: number; pending: number }> };
  disallowances: { total: number; recovered: number; rate: number };
  susBilling: { total: number; accepted: number; rejected: number };
  privatePay: { total: number; collected: number };
  costPerCase: { average: number; byDepartment: Array<{ department: string; average: number }> };
}

export interface DRGResult {
  encounterId: string;
  drgCode: string;
  drgDescription: string;
  weight: number;
  expectedLOS: number;
  actualLOS: number;
  baseRate: number;
  adjustedPayment: number;
  outlierStatus: 'NORMAL' | 'SHORT_STAY' | 'LONG_STAY';
  comorbidityLevel: 'NONE' | 'CC' | 'MCC';
  primaryDiagnosis: string;
  procedures: string[];
}

export interface ChargeCaptureItem {
  id: string;
  encounterId: string;
  detectedFrom: string;
  code: string;
  description: string;
  suggestedQuantity: number;
  suggestedPrice: number;
  status: 'DETECTED' | 'CONFIRMED' | 'REJECTED';
  confidence: number;
  source: string;
}

export interface CostPerCaseResult {
  encounterId: string;
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

export const billingEnhancedKeys = {
  all: ['billing-enhanced'] as const,
  eligibility: (patientId: string) => [...billingEnhancedKeys.all, 'eligibility', patientId] as const,
  priorAuth: () => [...billingEnhancedKeys.all, 'prior-auth'] as const,
  priorAuthList: (filters?: PriorAuthFilters) => [...billingEnhancedKeys.priorAuth(), 'list', filters] as const,
  priorAuthDetail: (id: string) => [...billingEnhancedKeys.priorAuth(), 'detail', id] as const,
  priorAuthQueue: () => [...billingEnhancedKeys.priorAuth(), 'queue'] as const,
  priceTables: (filters?: PriceTableFilters) => [...billingEnhancedKeys.all, 'price-tables', filters] as const,
  hospitalAccount: (id: string) => [...billingEnhancedKeys.all, 'hospital-account', id] as const,
  hospitalAccountByAdmission: (admissionId: string) => [...billingEnhancedKeys.all, 'hospital-account-admission', admissionId] as const,
  privateQuotes: (patientId?: string) => [...billingEnhancedKeys.all, 'private-quotes', patientId] as const,
  privateQuote: (id: string) => [...billingEnhancedKeys.all, 'private-quote', id] as const,
  accountAudit: (accountId: string) => [...billingEnhancedKeys.all, 'account-audit', accountId] as const,
  tissGuides: (filters?: Record<string, unknown>) => [...billingEnhancedKeys.all, 'tiss-guides', filters] as const,
  tissBatches: (filters?: Record<string, unknown>) => [...billingEnhancedKeys.all, 'tiss-batches', filters] as const,
  disallowances: (filters?: DisallowanceFilters) => [...billingEnhancedKeys.all, 'disallowances', filters] as const,
  disallowanceMetrics: (params?: Record<string, string>) => [...billingEnhancedKeys.all, 'disallowance-metrics', params] as const,
  susBilling: (filters?: Record<string, unknown>) => [...billingEnhancedKeys.all, 'sus-billing', filters] as const,
  financialDashboard: (params?: Record<string, string>) => [...billingEnhancedKeys.all, 'financial-dashboard', params] as const,
  drg: (encounterId: string) => [...billingEnhancedKeys.all, 'drg', encounterId] as const,
  chargeCapture: (encounterId: string) => [...billingEnhancedKeys.all, 'charge-capture', encounterId] as const,
  costPerCase: (encounterId: string) => [...billingEnhancedKeys.all, 'cost-per-case', encounterId] as const,
};

// ============================================================================
// Eligibility Check (Verificação de Elegibilidade)
// ============================================================================

export function useCheckEligibility() {
  return useMutation({
    mutationFn: async (payload: { patientId: string; insuranceProvider: string; procedureCode?: string }) => {
      const { data } = await api.post<EligibilityCheckResult>('/billing/eligibility/check', payload);
      return data;
    },
  });
}

// ============================================================================
// Prior Authorization (Autorização Prévia)
// ============================================================================

export function usePriorAuthList(filters?: PriorAuthFilters) {
  return useQuery({
    queryKey: billingEnhancedKeys.priorAuthList(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: PriorAuth[]; total: number; page: number; totalPages: number }>('/billing/prior-auth', { params: filters });
      return data;
    },
  });
}

export function usePriorAuthDetail(id: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.priorAuthDetail(id),
    queryFn: async () => {
      const { data } = await api.get<PriorAuth>(`/billing/prior-auth/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePriorAuthQueue() {
  return useQuery({
    queryKey: billingEnhancedKeys.priorAuthQueue(),
    queryFn: async () => {
      const { data } = await api.get<PriorAuth[]>('/billing/prior-auth/queue');
      return data;
    },
  });
}

export function useCreatePriorAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePriorAuthDto) => {
      const { data } = await api.post<PriorAuth>('/billing/prior-auth', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.priorAuth() });
    },
  });
}

export function useUpdatePriorAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreatePriorAuthDto> & { id: string }) => {
      const { data } = await api.patch<PriorAuth>(`/billing/prior-auth/${id}`, updates);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.priorAuthDetail(vars.id) });
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.priorAuth() });
    },
  });
}

export function useCancelPriorAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<PriorAuth>(`/billing/prior-auth/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.priorAuth() });
    },
  });
}

// ============================================================================
// Price Tables (Tabelas de Preço)
// ============================================================================

export function usePriceTables(filters?: PriceTableFilters) {
  return useQuery({
    queryKey: billingEnhancedKeys.priceTables(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: PriceTableEntry[]; total: number }>('/billing/price-tables', { params: filters });
      return data;
    },
  });
}

export function useCreatePriceTableEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePriceTableEntryDto) => {
      const { data } = await api.post<PriceTableEntry>('/billing/price-tables', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.priceTables() });
    },
  });
}

export function useUpdatePriceTableEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreatePriceTableEntryDto> & { id: string }) => {
      const { data } = await api.patch<PriceTableEntry>(`/billing/price-tables/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.priceTables() });
    },
  });
}

// ============================================================================
// Hospital Account (Conta Hospitalar)
// ============================================================================

export function useHospitalAccount(id: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.hospitalAccount(id),
    queryFn: async () => {
      const { data } = await api.get<HospitalAccount>(`/billing/hospital-accounts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useHospitalAccountByAdmission(admissionId: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.hospitalAccountByAdmission(admissionId),
    queryFn: async () => {
      const { data } = await api.get<HospitalAccount>(`/billing/hospital-accounts/admission/${admissionId}`);
      return data;
    },
    enabled: !!admissionId,
  });
}

export function useAddAccountItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AddAccountItemDto) => {
      const { data } = await api.post<HospitalAccount>(`/billing/hospital-accounts/${dto.accountId}/items`, dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.hospitalAccount(vars.accountId) });
    },
  });
}

export function useCloseHospitalAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data } = await api.patch<HospitalAccount>(`/billing/hospital-accounts/${accountId}/close`);
      return data;
    },
    onSuccess: (_, accountId) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.hospitalAccount(accountId) });
    },
  });
}

// ============================================================================
// Private Quotes (Orçamentos Particulares)
// ============================================================================

export function usePrivateQuotes(patientId?: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.privateQuotes(patientId),
    queryFn: async () => {
      const { data } = await api.get<PrivateQuote[]>('/billing/private-quotes', {
        params: patientId ? { patientId } : {},
      });
      return data;
    },
  });
}

export function usePrivateQuote(id: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.privateQuote(id),
    queryFn: async () => {
      const { data } = await api.get<PrivateQuote>(`/billing/private-quotes/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePrivateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePrivateQuoteDto) => {
      const { data } = await api.post<PrivateQuote>('/billing/private-quotes', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.privateQuotes() });
    },
  });
}

export function useSendPrivateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<PrivateQuote>(`/billing/private-quotes/${id}/send`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.privateQuote(id) });
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.privateQuotes() });
    },
  });
}

// ============================================================================
// Account Audit (Auditoria de Contas)
// ============================================================================

export function useAccountAuditEntries(accountId: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.accountAudit(accountId),
    queryFn: async () => {
      const { data } = await api.get<AccountAuditEntry[]>(`/billing/audit/${accountId}`);
      return data;
    },
    enabled: !!accountId,
  });
}

export function useCreateAccountAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { accountId: string; findingType: AccountAuditEntry['findingType']; description: string; originalAmount?: number; correctedAmount?: number }) => {
      const { data } = await api.post<AccountAuditEntry>(`/billing/audit/${payload.accountId}`, payload);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.accountAudit(vars.accountId) });
    },
  });
}

export function useResolveAuditFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ findingId, accountId: _accountId, resolution }: { findingId: string; accountId: string; resolution: string }) => {
      const { data } = await api.patch<AccountAuditEntry>(`/billing/audit/${findingId}/resolve`, { resolution });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.accountAudit(vars.accountId) });
    },
  });
}

// ============================================================================
// TISS Guide Generation (Guias TISS)
// ============================================================================

export function useTISSGuides(filters?: { guideType?: string; status?: string; insuranceProvider?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: billingEnhancedKeys.tissGuides(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: TISSGuide[]; total: number }>('/billing/tiss/guides', { params: filters });
      return data;
    },
  });
}

export function useGenerateTISSGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: GenerateTISSDto) => {
      const { data } = await api.post<TISSGuide>('/billing/tiss/guides/generate', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.tissGuides() });
    },
  });
}

export function useValidateTISSGuide() {
  return useMutation({
    mutationFn: async (guideId: string) => {
      const { data } = await api.post<{ valid: boolean; errors: string[] }>(`/billing/tiss/guides/${guideId}/validate`);
      return data;
    },
  });
}

// ============================================================================
// TISS Batch Submission (Lotes TISS)
// ============================================================================

export function useTISSBatches(filters?: { status?: string; insuranceProvider?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: billingEnhancedKeys.tissBatches(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: TISSBatch[]; total: number }>('/billing/tiss/batches', { params: filters });
      return data;
    },
  });
}

export function useCreateTISSBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTISSBatchDto) => {
      const { data } = await api.post<TISSBatch>('/billing/tiss/batches', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.tissBatches() });
    },
  });
}

export function useSubmitTISSBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data } = await api.post<TISSBatch>(`/billing/tiss/batches/${batchId}/submit`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.tissBatches() });
    },
  });
}

// ============================================================================
// Disallowance Management (Gestão de Glosas)
// ============================================================================

export function useDisallowances(filters?: DisallowanceFilters) {
  return useQuery({
    queryKey: billingEnhancedKeys.disallowances(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: Disallowance[]; total: number }>('/billing/disallowances', { params: filters });
      return data;
    },
  });
}

export function useAppealDisallowance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, justification, supportingDocs }: { id: string; justification: string; supportingDocs?: string[] }) => {
      const { data } = await api.post<Disallowance>(`/billing/disallowances/${id}/appeal`, { justification, supportingDocs });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.disallowances() });
    },
  });
}

export function useWriteOffDisallowance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.patch<Disallowance>(`/billing/disallowances/${id}/write-off`, { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.disallowances() });
    },
  });
}

export function useDisallowanceMetrics(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: billingEnhancedKeys.disallowanceMetrics(params as Record<string, string>),
    queryFn: async () => {
      const { data } = await api.get<DisallowanceMetrics>('/billing/disallowances/metrics', { params });
      return data;
    },
  });
}

// ============================================================================
// Coding Suggestion (Sugestão de Codificação)
// ============================================================================

export function useCodingSuggestion() {
  return useMutation({
    mutationFn: async (payload: { encounterId: string; procedureDescription: string; diagnosisText?: string }) => {
      const { data } = await api.post<CodingSuggestion>('/billing/coding/suggest', payload);
      return data;
    },
  });
}

// ============================================================================
// SUS Billing (Faturamento SUS)
// ============================================================================

export function useSUSBillingRecords(filters?: { type?: string; status?: string; competenceMonth?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: billingEnhancedKeys.susBilling(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: SUSBillingRecord[]; total: number }>('/billing/sus', { params: filters });
      return data;
    },
  });
}

export function useCreateSUSBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSUSBillingDto) => {
      const { data } = await api.post<SUSBillingRecord>('/billing/sus', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.susBilling() });
    },
  });
}

export function useSubmitSUSBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.post('/billing/sus/submit', { ids });
      return data as { submitted: number; errors: Array<{ id: string; error: string }> };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.susBilling() });
    },
  });
}

// ============================================================================
// Financial Dashboard
// ============================================================================

export function useFinancialDashboard(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: billingEnhancedKeys.financialDashboard(params as Record<string, string>),
    queryFn: async () => {
      const { data } = await api.get<FinancialDashboard>('/billing/dashboard/financial', { params });
      return data;
    },
  });
}

// ============================================================================
// DRG Calculation
// ============================================================================

export function useDRGCalculation(encounterId: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.drg(encounterId),
    queryFn: async () => {
      const { data } = await api.get<DRGResult>(`/billing/drg/${encounterId}`);
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useCalculateDRG() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (encounterId: string) => {
      const { data } = await api.post<DRGResult>(`/billing/drg/${encounterId}/calculate`);
      return data;
    },
    onSuccess: (_, encounterId) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.drg(encounterId) });
    },
  });
}

// ============================================================================
// Charge Capture Detection
// ============================================================================

export function useChargeCaptureItems(encounterId: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.chargeCapture(encounterId),
    queryFn: async () => {
      const { data } = await api.get<ChargeCaptureItem[]>(`/billing/charge-capture/${encounterId}`);
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useDetectCharges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (encounterId: string) => {
      const { data } = await api.post<ChargeCaptureItem[]>(`/billing/charge-capture/${encounterId}/detect`);
      return data;
    },
    onSuccess: (_, encounterId) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.chargeCapture(encounterId) });
    },
  });
}

export function useConfirmChargeCaptureItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, encounterId: _encounterId }: { itemId: string; encounterId: string }) => {
      const { data } = await api.patch<ChargeCaptureItem>(`/billing/charge-capture/items/${itemId}/confirm`);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.chargeCapture(vars.encounterId) });
    },
  });
}

export function useRejectChargeCaptureItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, encounterId: _encounterId2 }: { itemId: string; encounterId: string }) => {
      const { data } = await api.patch<ChargeCaptureItem>(`/billing/charge-capture/items/${itemId}/reject`);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.chargeCapture(vars.encounterId) });
    },
  });
}

// ============================================================================
// Cost Per Case
// ============================================================================

export function useCostPerCase(encounterId: string) {
  return useQuery({
    queryKey: billingEnhancedKeys.costPerCase(encounterId),
    queryFn: async () => {
      const { data } = await api.get<CostPerCaseResult>(`/billing/cost-per-case/${encounterId}`);
      return data;
    },
    enabled: !!encounterId,
  });
}

export function useCalculateCostPerCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (encounterId: string) => {
      const { data } = await api.post<CostPerCaseResult>(`/billing/cost-per-case/${encounterId}/calculate`);
      return data;
    },
    onSuccess: (_, encounterId) => {
      qc.invalidateQueries({ queryKey: billingEnhancedKeys.costPerCase(encounterId) });
    },
  });
}
