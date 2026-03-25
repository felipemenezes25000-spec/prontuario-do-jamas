import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
// ─── APACHE II / SAPS 3 / SOFA / TISS-28 ─────────────────────────────────

export class CalculateApacheIIDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsNumber() temperature: number;
  @ApiProperty() @IsNumber() meanArterialPressure: number;
  @ApiProperty() @IsNumber() heartRate: number;
  @ApiProperty() @IsNumber() respiratoryRate: number;
  @ApiProperty() @IsNumber() fio2: number;
  @ApiProperty() @IsNumber() pao2: number;
  @ApiProperty() @IsNumber() arterialPh: number;
  @ApiProperty() @IsNumber() sodium: number;
  @ApiProperty() @IsNumber() potassium: number;
  @ApiProperty() @IsNumber() creatinine: number;
  @ApiProperty() @IsBoolean() acuteRenalFailure: boolean;
  @ApiProperty() @IsNumber() hematocrit: number;
  @ApiProperty() @IsNumber() wbc: number;
  @ApiProperty() @IsNumber() @Min(3) @Max(15) gcs: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) age: number;
  @ApiProperty() @IsNumber() chronicHealthPoints: number;
}

export class CalculateSofaDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ description: 'PaO2/FiO2 ratio' }) @IsNumber() pao2fio2: number;
  @ApiProperty({ description: 'Platelets x10^3/uL' }) @IsNumber() platelets: number;
  @ApiProperty({ description: 'Bilirubin mg/dL' }) @IsNumber() bilirubin: number;
  @ApiProperty({ description: 'MAP or vasopressors' }) @IsNumber() cardiovascular: number;
  @ApiProperty({ description: 'GCS' }) @IsNumber() @Min(3) @Max(15) gcs: number;
  @ApiProperty({ description: 'Creatinine mg/dL or urine output' }) @IsNumber() creatinine: number;
  @ApiProperty({ description: 'Urine output mL/day' }) @IsOptional() @IsNumber() urineOutput?: number;
  @ApiPropertyOptional({ description: 'Norepinephrine dose mcg/kg/min' }) @IsOptional() @IsNumber() norepinephrineDose?: number;
  @ApiPropertyOptional({ description: 'Dobutamine dose mcg/kg/min' }) @IsOptional() @IsNumber() dobutamineDose?: number;
  @ApiPropertyOptional({ description: 'Dopamine dose mcg/kg/min' }) @IsOptional() @IsNumber() dopamineDose?: number;
  @ApiPropertyOptional({ description: 'Epinephrine dose mcg/kg/min' }) @IsOptional() @IsNumber() epinephrineDose?: number;
}

export class CalculateSaps3Dto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) age: number;
  @ApiProperty() @IsNumber() heartRate: number;
  @ApiProperty() @IsNumber() systolicBp: number;
  @ApiProperty() @IsNumber() @Min(3) @Max(15) gcs: number;
  @ApiProperty() @IsNumber() temperature: number;
  @ApiProperty() @IsNumber() creatinine: number;
  @ApiProperty() @IsNumber() bilirubin: number;
  @ApiProperty() @IsNumber() platelets: number;
  @ApiProperty() @IsNumber() pao2fio2: number;
  @ApiProperty() @IsBoolean() mechanicalVentilation: boolean;
  @ApiProperty() @IsBoolean() scheduledAdmission: boolean;
  @ApiProperty() @IsNumber() comorbiditiesScore: number;
  @ApiProperty() @IsString() admissionSource: string;
}

export class CalculateTiss28Dto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ description: 'Array of TISS-28 item scores' })
  @IsArray()
  @IsNumber({}, { each: true })
  items: number[];
}

// ─── Vasoactive Drugs Calculator ──────────────────────────────────────────

export class VasoactiveDrugCalculatorDto {
  @ApiProperty({ enum: ['norepinephrine', 'dobutamine', 'dopamine', 'epinephrine', 'vasopressin', 'milrinone'] })
  @IsString() @IsNotEmpty()
  drug: string;

  @ApiProperty({ description: 'Patient weight in kg' }) @IsNumber() weightKg: number;
  @ApiProperty({ description: 'Target dose mcg/kg/min' }) @IsNumber() targetDoseMcgKgMin: number;
  @ApiProperty({ description: 'Dilution concentration mg/mL' }) @IsNumber() concentrationMgMl: number;
}

// ─── Sedation Protocol ────────────────────────────────────────────────────

export class CreateSedationAssessmentDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ description: 'RASS score (-5 to +4)' }) @IsNumber() @Min(-5) @Max(4) rass: number;
  @ApiProperty({ description: 'RASS target' }) @IsNumber() @Min(-5) @Max(4) rassTarget: number;
  @ApiPropertyOptional({ description: 'BPS pain score (3-12)' }) @IsOptional() @IsNumber() @Min(3) @Max(12) bps?: number;
  @ApiPropertyOptional({ description: 'CPOT pain score (0-8)' }) @IsOptional() @IsNumber() @Min(0) @Max(8) cpot?: number;
  @ApiProperty() @IsBoolean() satPerformed: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() satOutcome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sedativeDrug?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sedativeDose?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() analgesicDrug?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() analgesicDose?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Mechanical Ventilation ───────────────────────────────────────────────

export class CreateVentilationRecordDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ enum: ['VCV', 'PCV', 'PSV', 'SIMV', 'CPAP', 'BIPAP', 'HFNC', 'PRVC'] })
  @IsString() @IsNotEmpty() mode: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tidalVolume?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() respiratoryRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fio2?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() peep?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pressureSupport?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pressureControl?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() plateauPressure?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() peakPressure?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() meanAirwayPressure?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() compliance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() resistance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pao2?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paco2?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() spo2?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Dialysis / CRRT ──────────────────────────────────────────────────────

export class CreateDialysisPrescriptionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ enum: ['HD', 'CRRT_CVVH', 'CRRT_CVVHD', 'CRRT_CVVHDF', 'PD', 'SLED'] })
  @IsString() @IsNotEmpty() modality: string;
  @ApiProperty() @IsString() @IsNotEmpty() accessType: string;
  @ApiProperty() @IsString() @IsNotEmpty() accessSite: string;
  @ApiPropertyOptional({ enum: ['heparin', 'citrate', 'none'] }) @IsOptional() @IsString() anticoagulation?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() anticoagulationDose?: number;
  @ApiProperty({ description: 'Blood flow rate mL/min' }) @IsNumber() qb: number;
  @ApiPropertyOptional({ description: 'Dialysate flow rate mL/h' }) @IsOptional() @IsNumber() qd?: number;
  @ApiPropertyOptional({ description: 'Replacement fluid rate mL/h' }) @IsOptional() @IsNumber() qr?: number;
  @ApiProperty({ description: 'Net ultrafiltration mL/h' }) @IsNumber() uf: number;
  @ApiPropertyOptional({ description: 'Duration in hours' }) @IsOptional() @IsNumber() durationHours?: number;
  @ApiPropertyOptional({ description: 'Target Kt/V' }) @IsOptional() @IsNumber() targetKtV?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Invasive Devices ─────────────────────────────────────────────────────

export class CreateInvasiveDeviceDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ enum: ['CVC', 'PICC', 'ARTERIAL_LINE', 'SVD', 'SVA', 'TOT', 'TQT', 'CHEST_DRAIN', 'ABDOMINAL_DRAIN', 'EVD', 'NGT', 'NJT', 'SWAN_GANZ'] })
  @IsString() @IsNotEmpty() deviceType: string;
  @ApiProperty() @IsString() @IsNotEmpty() site: string;
  @ApiProperty() @IsDateString() insertedAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insertedById?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class UpdateDeviceBundleChecklistDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() deviceDocumentId: string;
  @ApiProperty({ description: 'Checklist items with boolean values' })
  checklist: Record<string, boolean>;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Prevention Bundles ───────────────────────────────────────────────────

export class CreateBundleChecklistDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ enum: ['CVC_BUNDLE', 'VAP_BUNDLE', 'CAUTI_BUNDLE'] })
  @IsString() @IsNotEmpty() bundleType: string;
  @ApiProperty({ description: 'Checklist items' })
  items: Record<string, boolean>;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Prone Positioning ────────────────────────────────────────────────────

export class CreateProneSessionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsDateString() startedAt: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endedAt?: string;
  @ApiProperty({ description: 'P/F ratio before prone' }) @IsNumber() pfBefore: number;
  @ApiPropertyOptional({ description: 'P/F ratio after prone' }) @IsOptional() @IsNumber() pfAfter?: number;
  @ApiProperty({ description: 'Safety checklist before prone' })
  safetyChecklist: Record<string, boolean>;
  @ApiPropertyOptional() @IsOptional() @IsString() complications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Daily Goals ──────────────────────────────────────────────────────────

export class CreateDailyGoalsDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() sedationGoal: string;
  @ApiProperty() ventilationGoal: string;
  @ApiProperty() nutritionGoal: string;
  @ApiProperty() prophylaxisGoal: string;
  @ApiProperty() examsGoal: string;
  @ApiProperty() mobilityGoal: string;
  @ApiProperty() planForDay: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dvtProphylaxis?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() stressUlcerProphylaxis?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() headOfBed30?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() glycemicControl?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() additionalNotes?: string;
}

// ─── ECMO ─────────────────────────────────────────────────────────────────

export class CreateEcmoRecordDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty({ enum: ['VV', 'VA'] }) @IsString() @IsNotEmpty() ecmoType: string;
  @ApiProperty({ description: 'Blood flow L/min' }) @IsNumber() flow: number;
  @ApiProperty({ description: 'Sweep gas flow L/min' }) @IsNumber() sweep: number;
  @ApiProperty({ description: 'FdO2 (%)' }) @IsNumber() fdo2: number;
  @ApiPropertyOptional({ description: 'RPM' }) @IsOptional() @IsNumber() rpm?: number;
  @ApiPropertyOptional({ description: 'ACT or APTT value' }) @IsOptional() @IsNumber() anticoagulationValue?: number;
  @ApiPropertyOptional({ description: 'Heparin dose IU/h' }) @IsOptional() @IsNumber() heparinDose?: number;
  @ApiPropertyOptional({ description: 'Pre-membrane pressure' }) @IsOptional() @IsNumber() preMembranePressure?: number;
  @ApiPropertyOptional({ description: 'Post-membrane pressure' }) @IsOptional() @IsNumber() postMembranePressure?: number;
  @ApiPropertyOptional({ description: 'Transmembrane pressure' }) @IsOptional() @IsNumber() transmembranePressure?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── Enteral Nutrition ────────────────────────────────────────────────────

export class CreateEnteralNutritionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() formula: string;
  @ApiProperty({ description: 'Rate mL/h' }) @IsNumber() rateMlH: number;
  @ApiProperty({ description: 'Target volume mL/24h' }) @IsNumber() targetVolume24h: number;
  @ApiPropertyOptional({ description: 'Current volume infused mL' }) @IsOptional() @IsNumber() currentVolumeInfused?: number;
  @ApiPropertyOptional({ description: 'Gastric residual mL' }) @IsOptional() @IsNumber() gastricResidual?: number;
  @ApiPropertyOptional({ description: 'Route: NGT, NJT, gastrostomy, jejunostomy' }) @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() paused?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() pauseReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

// ─── ICU Flowsheet ────────────────────────────────────────────────────────

export class GetFlowsheetDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() encounterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
}
