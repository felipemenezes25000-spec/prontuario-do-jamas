import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum AbcCurve {
  A = 'A', // high-value, critical — tight stock control
  B = 'B', // medium value
  C = 'C', // low value, high volume
}

export enum SupplyCategory {
  MEDICATION = 'MEDICATION',
  MEDICAL_MATERIAL = 'MEDICAL_MATERIAL',
  SURGICAL = 'SURGICAL',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  NUTRITION = 'NUTRITION',
  CLEANING = 'CLEANING',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  OTHER = 'OTHER',
}

export enum DietType {
  REGULAR = 'REGULAR',
  SOFT = 'SOFT',
  LIQUID = 'LIQUID',
  THICK_LIQUID = 'THICK_LIQUID',
  PUREE = 'PUREE',
  ENTERAL = 'ENTERAL',
  PARENTERAL = 'PARENTERAL',
  NPO = 'NPO',
  LOW_SODIUM = 'LOW_SODIUM',
  DIABETIC = 'DIABETIC',
  LOW_FAT = 'LOW_FAT',
  RENAL = 'RENAL',
  OTHER = 'OTHER',
}

export enum WasteTypeManagement {
  INFECTIOUS = 'INFECTIOUS',
  SHARP = 'SHARP',
  CHEMICAL = 'CHEMICAL',
  RADIOACTIVE = 'RADIOACTIVE',
  COMMON = 'COMMON',
  RECYCLABLE = 'RECYCLABLE',
}

export enum ProcurementStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  RECEIVED = 'RECEIVED',
  INVOICED = 'INVOICED',
  COMPLETE = 'COMPLETE',
}

export enum ContractType {
  INSURANCE = 'INSURANCE',
  SUPPLIER = 'SUPPLIER',
  SERVICE = 'SERVICE',
  EQUIPMENT_LEASE = 'EQUIPMENT_LEASE',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER',
}

export enum OmbudsmanTicketType {
  COMPLAINT = 'COMPLAINT',
  COMPLIMENT = 'COMPLIMENT',
  SUGGESTION = 'SUGGESTION',
  INFORMATION_REQUEST = 'INFORMATION_REQUEST',
  DENOUNCEMENT = 'DENOUNCEMENT',
}

export enum OmbudsmanTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_RESPONSE = 'PENDING_RESPONSE',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
}

export enum SameDocumentType {
  MEDICAL_RECORD = 'MEDICAL_RECORD',
  IMAGING = 'IMAGING',
  LABORATORY = 'LABORATORY',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  LEGAL = 'LEGAL',
  RESEARCH = 'RESEARCH',
}

// ============================================================================
// SupplyInventoryDto
// ============================================================================

export class SupplyInventoryDto {
  @ApiPropertyOptional({ description: 'Item UUID (omit for new item creation)' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiProperty({ description: 'Item name', example: 'Seringa 10 mL' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Item description or specification' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SupplyCategory }) @IsEnum(SupplyCategory) category!: SupplyCategory;

  @ApiProperty({ description: 'Current stock quantity' })
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiProperty({ description: 'Unit of measure', example: 'unidade' })
  @IsString()
  @IsNotEmpty()
  unitOfMeasure!: string;

  @ApiProperty({ description: 'Reorder point — alert when stock reaches this level' })
  @IsNumber()
  @Min(0)
  reorderPoint!: number;

  @ApiPropertyOptional({ description: 'Maximum stock level' })
  @IsOptional()
  @IsNumber()
  maxStock?: number;

  @ApiPropertyOptional({ description: 'Lot/batch number' })
  @IsOptional()
  @IsString()
  lot?: string;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ enum: AbcCurve, description: 'ABC curve classification' })
  @IsEnum(AbcCurve)
  abcCurve!: AbcCurve;

  @ApiPropertyOptional({ description: 'Unit cost (R$)' })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional({ description: 'Supplier name' })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional({ description: 'ANVISA registration number for medical supplies' })
  @IsOptional()
  @IsString()
  anvisaRegistration?: string;

  @ApiPropertyOptional({ description: 'Storage location', example: 'Almoxarifado A - Prateleira 3' })
  @IsOptional()
  @IsString()
  storageLocation?: string;
}

// ============================================================================
// SndDto (Nutrition & Dietetics Service)
// ============================================================================

export class SndMenuItemDto {
  @ApiProperty({ description: 'Meal time', example: 'Café da manhã' }) @IsString() @IsNotEmpty() meal!: string;
  @ApiProperty({ description: 'Menu items', type: [String] })
  @IsArray()
  @IsString({ each: true })
  items!: string[];

  @ApiPropertyOptional({ description: 'Caloric content kcal' }) @IsOptional() @IsNumber() caloriesKcal?: number;
  @ApiPropertyOptional({ description: 'Protein grams' }) @IsOptional() @IsNumber() proteinG?: number;
  @ApiPropertyOptional({ description: 'Carbohydrate grams' }) @IsOptional() @IsNumber() carbsG?: number;
  @ApiPropertyOptional({ description: 'Fat grams' }) @IsOptional() @IsNumber() fatG?: number;
}

export class SndDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: DietType }) @IsEnum(DietType) dietType!: DietType;

  @ApiPropertyOptional({ description: 'Special restrictions', type: [String], example: ['Sem lactose', 'Baixo sódio'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRestrictions?: string[];

  @ApiPropertyOptional({ description: 'Allergies and intolerances', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  foodAllergies?: string[];

  @ApiPropertyOptional({ description: 'Daily menu', type: [SndMenuItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SndMenuItemDto)
  menu?: SndMenuItemDto[];

  @ApiPropertyOptional({ description: 'Portioning instructions', example: 'Porção reduzida — 70% do padrão' })
  @IsOptional()
  @IsString()
  portioning?: string;

  @ApiPropertyOptional({ description: 'Quality control notes (APPCC compliance)' })
  @IsOptional()
  @IsString()
  qualityControl?: string;

  @ApiPropertyOptional({ description: 'Total daily caloric goal kcal' })
  @IsOptional()
  @IsNumber()
  totalCaloriesKcal?: number;

  @ApiPropertyOptional({ description: 'Dietitian responsible' })
  @IsOptional()
  @IsUUID()
  dietitianId?: string;

  @ApiPropertyOptional({ description: 'Valid from date' }) @IsOptional() @IsDateString() validFrom?: string;
  @ApiPropertyOptional({ description: 'Valid until date' }) @IsOptional() @IsDateString() validUntil?: string;
}

// ============================================================================
// LaundryDto
// ============================================================================

export class LaundryDto {
  @ApiProperty({ description: 'Unit/ward name', example: 'Clínica Médica A' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty({ description: 'Total kg processed in the period' })
  @IsNumber()
  @Min(0)
  kgProcessed!: number;

  @ApiProperty({ description: 'Loss rate percentage (0–100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  lossRatePercent!: number;

  @ApiProperty({ description: 'Current linen stock level (sets)' })
  @IsInt()
  @Min(0)
  stockLevel!: number;

  @ApiProperty({ description: 'Minimum stock level before alert' })
  @IsInt()
  @Min(0)
  minStockLevel!: number;

  @ApiPropertyOptional({ description: 'Wash cycle description', example: 'Ciclo 75°C - 10min (padrão hospitalar)' })
  @IsOptional()
  @IsString()
  washCycle?: string;

  @ApiPropertyOptional({ description: 'Period date', example: '2025-01-31' })
  @IsOptional()
  @IsDateString()
  periodDate?: string;

  @ApiPropertyOptional({ description: 'Chemical detergent used (ANVISA compliance)' })
  @IsOptional()
  @IsString()
  detergent?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// WasteManagementDto
// ============================================================================

export class WasteManagementDto {
  @ApiProperty({ enum: WasteTypeManagement, description: 'Waste type per ANVISA RDC 222/2018' })
  @IsEnum(WasteTypeManagement)
  wasteType!: WasteTypeManagement;

  @ApiProperty({ description: 'Weight in kg' }) @IsNumber() @Min(0) weightKg!: number;
  @ApiProperty({ description: 'Originating unit', example: 'UTI Adulto' }) @IsString() @IsNotEmpty() originUnit!: string;
  @ApiProperty({ description: 'Destination/treatment method', example: 'Autoclave + Aterro Classe II' })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @ApiPropertyOptional({ description: 'Treatment certificate number (MTR)' })
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional({ description: 'Waste transporter company name' })
  @IsOptional()
  @IsString()
  transporter?: string;

  @ApiPropertyOptional({ description: 'IBAMA license number of transporter' })
  @IsOptional()
  @IsString()
  ibamaLicense?: string;

  @ApiPropertyOptional({ description: 'Collection date' }) @IsOptional() @IsDateString() collectionDate?: string;
  @ApiPropertyOptional({ description: 'Notes' }) @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// ProcurementDto
// ============================================================================

export class ProcurementItemDto {
  @ApiProperty({ description: 'Item name' }) @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ description: 'Quantity requested' }) @IsNumber() @Min(1) quantity!: number;
  @ApiProperty({ description: 'Unit of measure' }) @IsString() @IsNotEmpty() unitOfMeasure!: string;
  @ApiPropertyOptional({ description: 'Estimated unit price R$' }) @IsOptional() @IsNumber() estimatedUnitPrice?: number;
  @ApiPropertyOptional({ description: 'Technical specification' }) @IsOptional() @IsString() specification?: string;
}

export class ProcurementQuotationDto {
  @ApiProperty({ description: 'Supplier name' }) @IsString() @IsNotEmpty() supplier!: string;
  @ApiProperty({ description: 'Quoted unit price R$' }) @IsNumber() @Min(0) unitPrice!: number;
  @ApiPropertyOptional({ description: 'Lead time days' }) @IsOptional() @IsInt() leadTimeDays?: number;
  @ApiPropertyOptional({ description: 'Quotation validity date' }) @IsOptional() @IsDateString() validUntil?: string;
  @ApiPropertyOptional({ description: 'Selected as winner' }) @IsOptional() @IsBoolean() selected?: boolean;
}

export class ProcurementDto {
  @ApiPropertyOptional({ description: 'Requisition UUID (omit for new)' })
  @IsOptional()
  @IsUUID()
  requisitionId?: string;

  @ApiProperty({ description: 'Requesting department', example: 'UTI Adulto' })
  @IsString()
  @IsNotEmpty()
  requestingDepartment!: string;

  @ApiProperty({ description: 'Requested by user UUID' }) @IsUUID() requestedBy!: string;
  @ApiProperty({ description: 'Justification/reason' }) @IsString() @IsNotEmpty() justification!: string;

  @ApiProperty({ description: 'Items requested', type: [ProcurementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcurementItemDto)
  items!: ProcurementItemDto[];

  @ApiPropertyOptional({ description: 'Received quotations', type: [ProcurementQuotationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcurementQuotationDto)
  quotations?: ProcurementQuotationDto[];

  @ApiProperty({ enum: ProcurementStatus }) @IsEnum(ProcurementStatus) status!: ProcurementStatus;

  @ApiPropertyOptional({ description: 'Approver user UUID' }) @IsOptional() @IsUUID() approvedBy?: string;
  @ApiPropertyOptional({ description: 'Approval date' }) @IsOptional() @IsDateString() approvedAt?: string;
  @ApiPropertyOptional({ description: 'Purchase order number' }) @IsOptional() @IsString() purchaseOrderNumber?: string;
  @ApiPropertyOptional({ description: 'Receiving date' }) @IsOptional() @IsDateString() receivedAt?: string;
  @ApiPropertyOptional({ description: 'Invoice/NF number' }) @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional({ description: 'Total value R$' }) @IsOptional() @IsNumber() totalValueBrl?: number;
  @ApiPropertyOptional({ description: 'Notes' }) @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// ContractManagementDto
// ============================================================================

export class ContractSlaDto {
  @ApiProperty({ description: 'SLA metric name', example: 'Prazo de entrega' }) @IsString() metric!: string;
  @ApiProperty({ description: 'Target value', example: '48 horas' }) @IsString() target!: string;
  @ApiPropertyOptional({ description: 'Penalty for non-compliance' }) @IsOptional() @IsString() penalty?: string;
}

export class ContractManagementDto {
  @ApiPropertyOptional({ description: 'Contract UUID' }) @IsOptional() @IsUUID() contractId?: string;

  @ApiProperty({ enum: ContractType }) @IsEnum(ContractType) type!: ContractType;
  @ApiProperty({ description: 'Contract title', example: 'Contrato de Fornecimento — Reagentes Hematologia' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Counterparty (insurance company or supplier name)' })
  @IsString()
  @IsNotEmpty()
  counterparty!: string;

  @ApiPropertyOptional({ description: 'CNPJ of counterparty', example: '12.345.678/0001-99' })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiProperty({ description: 'Contract start date' }) @IsDateString() startDate!: string;
  @ApiProperty({ description: 'Contract end date' }) @IsDateString() endDate!: string;

  @ApiPropertyOptional({ description: 'SLA terms', type: [ContractSlaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractSlaDto)
  slaTerms?: ContractSlaDto[];

  @ApiPropertyOptional({ description: 'Days before expiry to trigger renewal alert', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  renewalAlertDays?: number;

  @ApiPropertyOptional({ description: 'Total contract value R$' }) @IsOptional() @IsNumber() totalValueBrl?: number;
  @ApiPropertyOptional({ description: 'Monthly value R$' }) @IsOptional() @IsNumber() monthlyValueBrl?: number;
  @ApiPropertyOptional({ description: 'Responsible internal manager' }) @IsOptional() @IsUUID() managerId?: string;
  @ApiPropertyOptional({ description: 'Contract document S3 key' }) @IsOptional() @IsString() documentKey?: string;
  @ApiPropertyOptional({ description: 'Notes' }) @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// OmbudsmanDto (Ouvidoria)
// ============================================================================

export class OmbudsmanDto {
  @ApiPropertyOptional({ description: 'Ticket UUID (omit for new)' }) @IsOptional() @IsUUID() ticketId?: string;

  @ApiProperty({ enum: OmbudsmanTicketType }) @IsEnum(OmbudsmanTicketType) type!: OmbudsmanTicketType;
  @ApiProperty({ description: 'Description of complaint, compliment or suggestion' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Category/area (e.g. Assistência, Higiene, Atendimento)' })
  @IsOptional()
  @IsString()
  classification?: string;

  @ApiPropertyOptional({ description: 'Unit or service area related', example: 'Pronto-socorro' })
  @IsOptional()
  @IsString()
  relatedUnit?: string;

  @ApiPropertyOptional({ description: 'Assigned team or user UUID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiProperty({ enum: OmbudsmanTicketStatus }) @IsEnum(OmbudsmanTicketStatus) status!: OmbudsmanTicketStatus;

  @ApiPropertyOptional({ description: 'SLA response deadline hours', example: 72 })
  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;

  @ApiPropertyOptional({ description: 'Resolution description' }) @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional({ description: 'Resolution date' }) @IsOptional() @IsDateString() resolvedAt?: string;

  @ApiPropertyOptional({ description: 'Complainant is anonymous' }) @IsOptional() @IsBoolean() anonymous?: boolean;
  @ApiPropertyOptional({ description: 'Contact email for response' }) @IsOptional() @IsString() contactEmail?: string;
  @ApiPropertyOptional({ description: 'Contact phone' }) @IsOptional() @IsString() contactPhone?: string;
}

// ============================================================================
// SameDto (Medical Records Archive — Serviço de Arquivo Médico e Estatístico)
// ============================================================================

export class SameDto {
  @ApiPropertyOptional({ description: 'Record UUID' }) @IsOptional() @IsUUID() recordId?: string;

  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;

  @ApiProperty({ enum: SameDocumentType }) @IsEnum(SameDocumentType) documentType!: SameDocumentType;

  @ApiProperty({ description: 'Physical archive location', example: 'Módulo A — Estante 12 — Caixa 034' })
  @IsString()
  @IsNotEmpty()
  physicalLocation!: string;

  @ApiPropertyOptional({ description: 'Currently borrowed by user UUID' })
  @IsOptional()
  @IsUUID()
  borrowedBy?: string;

  @ApiPropertyOptional({ description: 'Borrow date' }) @IsOptional() @IsDateString() borrowDate?: string;
  @ApiPropertyOptional({ description: 'Expected return date' }) @IsOptional() @IsDateString() returnDate?: string;
  @ApiPropertyOptional({ description: 'Actual return date' }) @IsOptional() @IsDateString() actualReturnDate?: string;

  @ApiPropertyOptional({ description: 'Record has been digitized' }) @IsOptional() @IsBoolean() digitized?: boolean;
  @ApiPropertyOptional({ description: 'Digital document S3 key' }) @IsOptional() @IsString() digitalKey?: string;

  @ApiProperty({ description: 'Retention period years (CFM 1821/2007: minimum 20 years)', example: 20 })
  @IsInt()
  @Min(1)
  retentionPeriodYears!: number;

  @ApiPropertyOptional({ description: 'Document creation date' }) @IsOptional() @IsDateString() documentDate?: string;
  @ApiPropertyOptional({ description: 'Notes' }) @IsOptional() @IsString() notes?: string;
}

// ============================================================================
// SupplyRequisitionDto
// ============================================================================

export class SupplyRequisitionItemDto {
  @ApiProperty({ description: 'Item name' }) @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ description: 'Quantity requested' }) @IsNumber() @Min(1) quantity!: number;
  @ApiProperty({ description: 'Unit of measure' }) @IsString() @IsNotEmpty() unitOfMeasure!: string;
  @ApiPropertyOptional({ description: 'Priority (URGENT, NORMAL, LOW)', example: 'NORMAL' })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class SupplyRequisitionDto {
  @ApiProperty({ description: 'Requesting department/unit', example: 'UTI Adulto' })
  @IsString()
  @IsNotEmpty()
  department!: string;

  @ApiProperty({ description: 'Justification for requisition' })
  @IsString()
  @IsNotEmpty()
  justification!: string;

  @ApiProperty({ description: 'Items requested', type: [SupplyRequisitionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplyRequisitionItemDto)
  items!: SupplyRequisitionItemDto[];

  @ApiPropertyOptional({ description: 'Delivery deadline' })
  @IsOptional()
  @IsDateString()
  neededBy?: string;
}

// ============================================================================
// EquipmentWorkOrderDto
// ============================================================================

export enum WorkOrderType {
  CORRECTIVE = 'CORRECTIVE',
  PREVENTIVE = 'PREVENTIVE',
  CALIBRATION = 'CALIBRATION',
  INSTALLATION = 'INSTALLATION',
}

export enum WorkOrderPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

export class EquipmentWorkOrderDto {
  @ApiProperty({ description: 'Equipment name/identifier', example: 'Ventilador Mecânico — Leito 12' })
  @IsString()
  @IsNotEmpty()
  equipmentName!: string;

  @ApiPropertyOptional({ description: 'Equipment asset tag/serial' })
  @IsOptional()
  @IsString()
  assetTag?: string;

  @ApiProperty({ description: 'Location (unit/room)', example: 'UTI Adulto — Leito 12' })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({ enum: WorkOrderType }) @IsEnum(WorkOrderType) type!: WorkOrderType;
  @ApiProperty({ enum: WorkOrderPriority }) @IsEnum(WorkOrderPriority) priority!: WorkOrderPriority;

  @ApiProperty({ description: 'Problem description or maintenance reason' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Assigned technician UUID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Scheduled date for maintenance' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

// ============================================================================
// Query DTOs
// ============================================================================

export class SupplyLowStockQueryDto {
  @ApiPropertyOptional({ enum: SupplyCategory }) @IsOptional() @IsEnum(SupplyCategory) category?: SupplyCategory;
  @ApiPropertyOptional({ enum: AbcCurve }) @IsOptional() @IsEnum(AbcCurve) abcCurve?: AbcCurve;
}

export class ProcurementListQueryDto {
  @ApiPropertyOptional({ enum: ProcurementStatus }) @IsOptional() @IsEnum(ProcurementStatus) status?: ProcurementStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
}

export class ContractExpiryQueryDto {
  @ApiPropertyOptional({ description: 'Days ahead to check for expiry', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  daysAhead?: number;
}
