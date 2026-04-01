import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

// ── Supplies (Almoxarifado) ──────────────────────────────────────────────────

export interface Supply {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  location?: string;
  supplier?: string;
  unitCost?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplyDto {
  name: string;
  code: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  location?: string;
  supplier?: string;
  unitCost?: number;
}

export interface UpdateSupplyDto {
  name?: string;
  category?: string;
  unit?: string;
  currentStock?: number;
  minimumStock?: number;
  maximumStock?: number;
  location?: string;
  supplier?: string;
  unitCost?: number;
  active?: boolean;
}

export interface SupplyParams {
  category?: string;
  lowStock?: boolean;
  active?: boolean;
  limit?: number;
  offset?: number;
}

// ── SND — Nutrition & Dietetics (Serviço de Nutrição e Dietética) ────────────

export interface DietOrder {
  id: string;
  patientId: string;
  encounterId?: string;
  dietType: string;
  texture?: string;
  consistency?: string;
  restrictions: string[];
  supplements?: string[];
  caloricTarget?: number;
  proteinTarget?: number;
  fluidRestriction?: number;
  startDate: string;
  endDate?: string;
  notes?: string;
  prescribedById: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateDietOrderDto {
  patientId: string;
  encounterId?: string;
  dietType: string;
  texture?: string;
  consistency?: string;
  restrictions?: string[];
  supplements?: string[];
  caloricTarget?: number;
  proteinTarget?: number;
  fluidRestriction?: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateDietOrderDto {
  dietType?: string;
  texture?: string;
  consistency?: string;
  restrictions?: string[];
  supplements?: string[];
  caloricTarget?: number;
  proteinTarget?: number;
  fluidRestriction?: number;
  endDate?: string;
  notes?: string;
  status?: DietOrder['status'];
}

export interface DietParams {
  patientId?: string;
  status?: DietOrder['status'];
  date?: string;
}

// ── Laundry (Lavanderia) ──────────────────────────────────────────────────────

export interface LaundryRecord {
  id: string;
  itemType: string;
  quantity: number;
  unit: string;
  sourceUnit: string;
  sentAt: string;
  returnedAt?: string;
  status: 'SENT' | 'PROCESSING' | 'RETURNED' | 'LOST';
  notes?: string;
  createdAt: string;
}

export interface CreateLaundryRecordDto {
  itemType: string;
  quantity: number;
  unit: string;
  sourceUnit: string;
  notes?: string;
}

export interface LaundryParams {
  status?: LaundryRecord['status'];
  sourceUnit?: string;
  from?: string;
  to?: string;
}

// ── Waste Management (Gestão de Resíduos) ────────────────────────────────────

export interface WasteRecord {
  id: string;
  wasteType: 'INFECTIOUS' | 'CHEMICAL' | 'RADIOACTIVE' | 'COMMON' | 'RECYCLABLE' | 'SHARPS';
  quantity: number;
  unit: string;
  collectionPoint: string;
  disposalDate: string;
  vendor?: string;
  manifestNumber?: string;
  status: 'COLLECTED' | 'IN_TRANSIT' | 'DISPOSED';
  notes?: string;
  createdAt: string;
}

export interface CreateWasteRecordDto {
  wasteType: WasteRecord['wasteType'];
  quantity: number;
  unit: string;
  collectionPoint: string;
  disposalDate: string;
  vendor?: string;
  manifestNumber?: string;
  notes?: string;
}

export interface WasteParams {
  wasteType?: WasteRecord['wasteType'];
  status?: WasteRecord['status'];
  from?: string;
  to?: string;
}

// ── Procurement (Compras) ─────────────────────────────────────────────────────

export interface ProcurementOrder {
  id: string;
  requestNumber: string;
  requestedById: string;
  requestedAt: string;
  items: Array<{ supplyId: string; name: string; quantity: number; unit: string; estimatedCost?: number }>;
  totalEstimatedCost?: number;
  justification: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  approvedById?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProcurementDto {
  items: Array<{ supplyId: string; quantity: number; estimatedCost?: number }>;
  justification: string;
  priority: ProcurementOrder['priority'];
  notes?: string;
}

export interface UpdateProcurementDto {
  status?: ProcurementOrder['status'];
  items?: Array<{ supplyId: string; quantity: number; estimatedCost?: number }>;
  priority?: ProcurementOrder['priority'];
  notes?: string;
}

export interface ProcurementParams {
  status?: ProcurementOrder['status'];
  priority?: ProcurementOrder['priority'];
  from?: string;
  to?: string;
}

// ── Contracts (Contratos) ─────────────────────────────────────────────────────

export interface Contract {
  id: string;
  contractNumber: string;
  vendor: string;
  description: string;
  type: 'SERVICE' | 'SUPPLY' | 'EQUIPMENT' | 'MAINTENANCE' | 'OTHER';
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  autoRenewal: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  responsibleId: string;
  attachments?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractDto {
  vendor: string;
  description: string;
  type: Contract['type'];
  value: number;
  currency?: string;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  autoRenewal?: boolean;
  responsibleId: string;
  notes?: string;
}

export interface UpdateContractDto {
  value?: number;
  endDate?: string;
  renewalDate?: string;
  autoRenewal?: boolean;
  status?: Contract['status'];
  notes?: string;
}

export interface ContractParams {
  type?: Contract['type'];
  status?: Contract['status'];
  expiringDays?: number;
}

// ── Ombudsman / Ouvidoria ─────────────────────────────────────────────────────

export interface OmbudsmanTicket {
  id: string;
  protocolNumber: string;
  type: 'COMPLAINT' | 'COMPLIMENT' | 'SUGGESTION' | 'REQUEST' | 'DENUNCIATION';
  category: string;
  description: string;
  anonymous: boolean;
  reporterName?: string;
  reporterContact?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedToId?: string;
  resolution?: string;
  resolvedAt?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketDto {
  type: OmbudsmanTicket['type'];
  category: string;
  description: string;
  anonymous?: boolean;
  reporterName?: string;
  reporterContact?: string;
  priority?: OmbudsmanTicket['priority'];
}

export interface UpdateTicketDto {
  status?: OmbudsmanTicket['status'];
  assignedToId?: string;
  resolution?: string;
  priority?: OmbudsmanTicket['priority'];
}

export interface TicketParams {
  type?: OmbudsmanTicket['type'];
  status?: OmbudsmanTicket['status'];
  priority?: OmbudsmanTicket['priority'];
  from?: string;
  to?: string;
}

// ── SAME (Serviço de Arquivo Médico e Estatística) ────────────────────────────

export interface MedicalRecord {
  id: string;
  patientId: string;
  recordNumber: string;
  type: 'PHYSICAL' | 'DIGITAL' | 'HYBRID';
  status: 'ACTIVE' | 'ARCHIVED' | 'REQUESTED' | 'CHECKED_OUT' | 'LOST';
  location?: string;
  checkedOutBy?: string;
  checkedOutAt?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicalRecordDto {
  patientId: string;
  recordNumber: string;
  type: MedicalRecord['type'];
  location?: string;
  notes?: string;
}

export interface UpdateMedicalRecordDto {
  status?: MedicalRecord['status'];
  location?: string;
  checkedOutBy?: string;
  checkedOutAt?: string;
  dueDate?: string;
  notes?: string;
}

export interface MedicalRecordParams {
  patientId?: string;
  status?: MedicalRecord['status'];
  type?: MedicalRecord['type'];
  limit?: number;
  offset?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const hospitalManagementKeys = {
  all: ['hospital-management'] as const,
  supplies: (params?: SupplyParams) => [...hospitalManagementKeys.all, 'supplies', params] as const,
  diets: (params?: DietParams) => [...hospitalManagementKeys.all, 'snd', params] as const,
  laundry: (params?: LaundryParams) => [...hospitalManagementKeys.all, 'laundry', params] as const,
  waste: (params?: WasteParams) => [...hospitalManagementKeys.all, 'waste', params] as const,
  procurements: (params?: ProcurementParams) => [...hospitalManagementKeys.all, 'procurement', params] as const,
  contracts: (params?: ContractParams) => [...hospitalManagementKeys.all, 'contracts', params] as const,
  tickets: (params?: TicketParams) => [...hospitalManagementKeys.all, 'ombudsman', params] as const,
  medicalRecords: (params?: MedicalRecordParams) => [...hospitalManagementKeys.all, 'same', params] as const,
};

// ============================================================================
// Supplies (Almoxarifado)
// ============================================================================

export function useSupplies(params?: SupplyParams) {
  return useQuery({
    queryKey: hospitalManagementKeys.supplies(params),
    queryFn: async () => {
      const { data } = await api.get<Supply[]>('/hospital-management/supplies', { params });
      return data;
    },
  });
}

export function useCreateSupply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSupplyDto) => {
      const { data } = await api.post<Supply>('/hospital-management/supplies', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.supplies() });
    },
  });
}

export function useUpdateSupply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateSupplyDto & { id: string }) => {
      const { data } = await api.patch<Supply>(`/hospital-management/supplies/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.supplies() });
    },
  });
}

// ============================================================================
// SND — Diets (Dietoterapia)
// ============================================================================

export function useDiets(params?: DietParams) {
  return useQuery({
    queryKey: hospitalManagementKeys.diets(params),
    queryFn: async () => {
      const { data } = await api.get<DietOrder[]>('/hospital-management/snd', { params });
      return data;
    },
  });
}

export function useCreateDiet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDietOrderDto) => {
      const { data } = await api.post<DietOrder>('/hospital-management/snd', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.diets() });
    },
  });
}

export function useUpdateDiet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateDietOrderDto & { id: string }) => {
      const { data } = await api.patch<DietOrder>(`/hospital-management/snd/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.diets() });
    },
  });
}

// ============================================================================
// Laundry (Lavanderia)
// ============================================================================

export function useLaundryRecords(params?: LaundryParams) {
  return useQuery({
    queryKey: hospitalManagementKeys.laundry(params),
    queryFn: async () => {
      const { data } = await api.get<LaundryRecord[]>('/hospital-management/laundry', { params });
      return data;
    },
  });
}

export function useCreateLaundryRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateLaundryRecordDto) => {
      const { data } = await api.post<LaundryRecord>('/hospital-management/laundry', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.laundry() });
    },
  });
}

// ============================================================================
// Waste Management (Gerenciamento de Resíduos)
// ============================================================================

export function useWasteRecords(params?: WasteParams) {
  return useQuery({
    queryKey: hospitalManagementKeys.waste(params),
    queryFn: async () => {
      const { data } = await api.get<WasteRecord[]>('/hospital-management/waste', { params });
      return data;
    },
  });
}

export function useCreateWasteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateWasteRecordDto) => {
      const { data } = await api.post<WasteRecord>('/hospital-management/waste', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.waste() });
    },
  });
}

// ============================================================================
// Procurement (Compras)
// ============================================================================

export function useProcurements(params?: ProcurementParams) {
  return useQuery({
    queryKey: hospitalManagementKeys.procurements(params),
    queryFn: async () => {
      const { data } = await api.get<ProcurementOrder[]>('/hospital-management/procurement', { params });
      return data;
    },
  });
}

export function useCreateProcurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateProcurementDto) => {
      const { data } = await api.post<ProcurementOrder>('/hospital-management/procurement', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.procurements() });
    },
  });
}

export function useUpdateProcurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateProcurementDto & { id: string }) => {
      const { data } = await api.patch<ProcurementOrder>(`/hospital-management/procurement/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.procurements() });
    },
  });
}

// ============================================================================
// Contracts (Contratos)
// ============================================================================

export function useContracts(params?: ContractParams) {
  return useQuery({
    queryKey: hospitalManagementKeys.contracts(params),
    queryFn: async () => {
      const { data } = await api.get<Contract[]>('/hospital-management/contracts', { params });
      return data;
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateContractDto) => {
      const { data } = await api.post<Contract>('/hospital-management/contracts', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.contracts() });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateContractDto & { id: string }) => {
      const { data } = await api.patch<Contract>(`/hospital-management/contracts/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.contracts() });
    },
  });
}

// ============================================================================
// Ombudsman / Ouvidoria
// ============================================================================

export function useTickets(params?: TicketParams) {
  return useQuery({
    queryKey: hospitalManagementKeys.tickets(params),
    queryFn: async () => {
      const { data } = await api.get<OmbudsmanTicket[]>('/hospital-management/ombudsman', { params });
      return data;
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTicketDto) => {
      const { data } = await api.post<OmbudsmanTicket>('/hospital-management/ombudsman', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.tickets() });
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateTicketDto & { id: string }) => {
      const { data } = await api.patch<OmbudsmanTicket>(`/hospital-management/ombudsman/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.tickets() });
    },
  });
}

// ============================================================================
// SAME — Medical Records Archive
// ============================================================================

export function useMedicalRecords(params?: MedicalRecordParams) {
  return useQuery({
    queryKey: hospitalManagementKeys.medicalRecords(params),
    queryFn: async () => {
      const { data } = await api.get<MedicalRecord[]>('/hospital-management/same', { params });
      return data;
    },
  });
}

export function useCreateMedicalRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMedicalRecordDto) => {
      const { data } = await api.post<MedicalRecord>('/hospital-management/same', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.medicalRecords() });
    },
  });
}

export function useUpdateMedicalRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateMedicalRecordDto & { id: string }) => {
      const { data } = await api.patch<MedicalRecord>(`/hospital-management/same/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hospitalManagementKeys.medicalRecords() });
    },
  });
}
