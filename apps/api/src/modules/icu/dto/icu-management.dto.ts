import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum InvasiveDeviceType {
  CVC                    = 'CVC',
  SVD                    = 'SVD',           // Sonda vesical de demora
  TOT                    = 'TOT',           // Tubo oro-traqueal
  ARTERIAL_LINE          = 'ARTERIAL_LINE',
  DRAIN                  = 'DRAIN',
  CHEST_TUBE             = 'CHEST_TUBE',
  PICC                   = 'PICC',
  NASOGASTRIC_TUBE       = 'NASOGASTRIC_TUBE',
  TRACHEOSTOMY           = 'TRACHEOSTOMY',
  DIALYSIS_CATHETER      = 'DIALYSIS_CATHETER',
  EXTERNAL_VENTRICULAR_DRAIN = 'EXTERNAL_VENTRICULAR_DRAIN',
  SWAN_GANZ              = 'SWAN_GANZ',
}

export enum InsertionSiteEnum {
  SUBCLAVIAN_RIGHT  = 'SUBCLAVIAN_RIGHT',
  SUBCLAVIAN_LEFT   = 'SUBCLAVIAN_LEFT',
  JUGULAR_RIGHT     = 'JUGULAR_RIGHT',
  JUGULAR_LEFT      = 'JUGULAR_LEFT',
  FEMORAL_RIGHT     = 'FEMORAL_RIGHT',
  FEMORAL_LEFT      = 'FEMORAL_LEFT',
  RADIAL_RIGHT      = 'RADIAL_RIGHT',
  RADIAL_LEFT       = 'RADIAL_LEFT',
  ANTECUBITAL       = 'ANTECUBITAL',
  OTHER             = 'OTHER',
}

export enum PreventionBundleType {
  CVC   = 'CVC',
  VAP   = 'VAP',
  CAUTI = 'CAUTI',
}

export enum NutritionFormulaType {
  STANDARD_1_0       = 'STANDARD_1_0',
  STANDARD_1_5       = 'STANDARD_1_5',
  HIGH_PROTEIN       = 'HIGH_PROTEIN',
  RENAL              = 'RENAL',
  HEPATIC            = 'HEPATIC',
  DIABETIC           = 'DIABETIC',
  PULMONARY          = 'PULMONARY',
  IMMUNE_MODULATING  = 'IMMUNE_MODULATING',
  SEMI_ELEMENTAL     = 'SEMI_ELEMENTAL',
  FIBER_ENRICHED     = 'FIBER_ENRICHED',
}

// ─── Invasive Device ──────────────────────────────────────────────────────────

export class BundleChecklistItemDto {
  @ApiProperty({ description: 'Checklist item description' })
  @IsString()
  item!: string;

  @ApiProperty({ description: 'Compliant / performed' })
  @IsBoolean()
  compliant!: boolean;
}

export class InvasiveDeviceDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: InvasiveDeviceType, description: 'Device type' })
  @IsEnum(InvasiveDeviceType)
  type!: InvasiveDeviceType;

  @ApiProperty({ description: 'Insertion date (ISO 8601 date)' })
  @IsDateString()
  insertionDate!: string;

  @ApiProperty({ enum: InsertionSiteEnum, description: 'Insertion site' })
  @IsEnum(InsertionSiteEnum)
  insertionSite!: InsertionSiteEnum;

  @ApiPropertyOptional({ description: 'Responsible clinician UUID' })
  @IsOptional()
  @IsUUID()
  insertedById?: string;

  @ApiPropertyOptional({ description: 'Indication / reason for device' })
  @IsOptional()
  @IsString()
  indication?: string;

  @ApiPropertyOptional({
    description: 'Daily bundle checklist items',
    type: [BundleChecklistItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleChecklistItemDto)
  bundleChecklist?: BundleChecklistItemDto[];

  @ApiPropertyOptional({ description: 'Device active (false = removed)' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Removal date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  removalDate?: string;

  @ApiPropertyOptional({ description: 'Removal reason' })
  @IsOptional()
  @IsString()
  removalReason?: string;
}

// ─── Prevention Bundle ────────────────────────────────────────────────────────

export class PreventionBundleDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: PreventionBundleType, description: 'Bundle type (CVC, VAP, CAUTI)' })
  @IsEnum(PreventionBundleType)
  type!: PreventionBundleType;

  @ApiProperty({ description: 'Assessment date (ISO 8601 date)' })
  @IsDateString()
  assessmentDate!: string;

  @ApiProperty({
    description: 'Checklist items',
    type: [BundleChecklistItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => BundleChecklistItemDto)
  checklistItems!: BundleChecklistItemDto[];

  @ApiPropertyOptional({ description: 'Overall bundle compliance (auto-computed if not provided)' })
  @IsOptional()
  @IsBoolean()
  compliant?: boolean;

  @ApiPropertyOptional({ description: 'Non-compliance reasons / corrective actions' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Pronation Session ────────────────────────────────────────────────────────

export class PronationSessionDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Prone session start time (ISO 8601)' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ description: 'Prone session end time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'PaO2/FiO2 ratio before pronation' })
  @IsOptional()
  @IsNumber() @Min(0)
  pfRatioBefore?: number;

  @ApiPropertyOptional({ description: 'PaO2/FiO2 ratio after pronation' })
  @IsOptional()
  @IsNumber() @Min(0)
  pfRatioAfter?: number;

  @ApiPropertyOptional({ description: 'Complications during or after session (free text)' })
  @IsOptional()
  @IsString()
  complications?: string;

  @ApiPropertyOptional({ description: 'Response: responder if PF improved >= 20 mmHg' })
  @IsOptional()
  @IsBoolean()
  responder?: boolean;

  @ApiPropertyOptional({ description: 'Nursing team members involved' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamMembers?: string[];

  @ApiPropertyOptional({ description: 'Session notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Daily Goals ──────────────────────────────────────────────────────────────

export class DailyGoalsDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Date of goals (ISO 8601 date)' })
  @IsDateString()
  goalsDate!: string;

  @ApiPropertyOptional({ description: 'Sedation / analgesia goal (RASS target, pain target)' })
  @IsOptional()
  @IsString()
  sedationGoal?: string;

  @ApiPropertyOptional({ description: 'Ventilation goal (mode, FiO2 target, weaning plan)' })
  @IsOptional()
  @IsString()
  ventilationGoal?: string;

  @ApiPropertyOptional({ description: 'Nutrition goal (caloric target, route, formula)' })
  @IsOptional()
  @IsString()
  nutritionGoal?: string;

  @ApiPropertyOptional({ description: 'DVT/stress ulcer prophylaxis performed' })
  @IsOptional()
  @IsBoolean()
  prophylaxis?: boolean;

  @ApiPropertyOptional({ description: 'Lab / imaging orders for the day' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labs?: string[];

  @ApiProperty({ description: 'Overall clinical plan / goals narrative' })
  @IsString()
  plan!: string;

  @ApiPropertyOptional({ description: 'Expected ICU discharge date (ISO 8601 date)' })
  @IsOptional()
  @IsDateString()
  expectedDischarge?: string;

  @ApiPropertyOptional({ description: 'Family communication performed today' })
  @IsOptional()
  @IsBoolean()
  familyCommunication?: boolean;

  @ApiPropertyOptional({ description: 'Resuscitation status reviewed' })
  @IsOptional()
  @IsBoolean()
  resuscitationStatusReviewed?: boolean;
}

// ─── ICU Flowsheet ────────────────────────────────────────────────────────────

export class FlowsheetVitalsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() heartRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() systolicBP?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() diastolicBP?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() map?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() respiratoryRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() temperature?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() oxygenSaturation?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cvp?: number;
}

export class FlowsheetFluidBalanceDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalInput?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalOutput?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() balance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() urineOutput?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() drainOutput?: number;
}

export class IcuFlowsheetDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Flowsheet timestamp (ISO 8601)' })
  @IsDateString()
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Vital signs snapshot', type: FlowsheetVitalsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FlowsheetVitalsDto)
  vitals?: FlowsheetVitalsDto;

  @ApiPropertyOptional({ description: 'Fluid balance snapshot', type: FlowsheetFluidBalanceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FlowsheetFluidBalanceDto)
  fluidBalance?: FlowsheetFluidBalanceDto;

  @ApiPropertyOptional({
    description: 'Active medications (names and doses)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiPropertyOptional({ description: 'Ventilation summary (free text)' })
  @IsOptional()
  @IsString()
  ventilation?: string;

  @ApiPropertyOptional({ description: 'Recent lab results (free text or key=value)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentLabs?: string[];

  @ApiPropertyOptional({ description: 'Active devices (list of device type strings)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  devices?: string[];

  @ApiPropertyOptional({ description: 'Nursing notes / overall assessment' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Enteral Nutrition ────────────────────────────────────────────────────────

export class EnteralNutritionDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: NutritionFormulaType, description: 'Enteral formula' })
  @IsEnum(NutritionFormulaType)
  formula!: NutritionFormulaType;

  @ApiProperty({ description: 'Infusion rate (mL/h)' })
  @IsNumber() @Min(0) @Max(300)
  ratePerHour!: number;

  @ApiProperty({ description: 'Target daily volume (mL)' })
  @IsNumber() @Min(0)
  targetVolume!: number;

  @ApiPropertyOptional({ description: 'Gastric residual volume (mL) at last check' })
  @IsOptional()
  @IsNumber() @Min(0)
  gastricResidue?: number;

  @ApiPropertyOptional({ description: 'Reason for nutrition pause (if applicable)' })
  @IsOptional()
  @IsString()
  pauseReason?: string;

  @ApiPropertyOptional({ description: 'Route (NGT, OGT, jejunal, PEG)' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ description: 'Nutritionist recommendation reference UUID' })
  @IsOptional()
  @IsUUID()
  nutritionistId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
