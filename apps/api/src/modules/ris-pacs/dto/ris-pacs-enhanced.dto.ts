import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ImagingModality {
  CT = 'CT',
  MRI = 'MRI',
  US = 'US',
  XR = 'XR',
  MG = 'MG',        // Mammography
  NM = 'NM',        // Nuclear Medicine
  PET = 'PET',
  PET_CT = 'PET_CT',
  ANGIO = 'ANGIO',
  FLUORO = 'FLUORO',
  ECHO = 'ECHO',
}

export enum StructuredReportTemplate {
  BIRADS = 'BIRADS',       // Breast Imaging
  LUNGRRADS = 'LUNGRRADS', // Lung nodule
  TIRADS = 'TIRADS',       // Thyroid
  PIRADS = 'PIRADS',       // Prostate
  LIRADS = 'LIRADS',       // Liver
  NIRADS = 'NIRADS',       // Head/neck
  CAD_RADS = 'CAD_RADS',  // Coronary
  O_RADS = 'O_RADS',      // Ovarian
  FREE_TEXT = 'FREE_TEXT',
}

/** BI-RADS 0–6, Lung-RADS 1–4X, TI-RADS 1–5, PI-RADS 1–5 */
export enum ClassificationCategory {
  CAT_0 = '0',
  CAT_1 = '1',
  CAT_2 = '2',
  CAT_3 = '3',
  CAT_4 = '4',
  CAT_4A = '4A',
  CAT_4B = '4B',
  CAT_4C = '4C',
  CAT_4X = '4X',
  CAT_5 = '5',
  CAT_6 = '6',
}

export enum IncidentalFindingStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  PATIENT_REFUSED = 'PATIENT_REFUSED',
  CLINICALLY_MANAGED = 'CLINICALLY_MANAGED',
}

export enum RadiologyPriority {
  STAT = 'STAT',
  URGENT = 'URGENT',
  ROUTINE = 'ROUTINE',
  ELECTIVE = 'ELECTIVE',
}

// ─── DICOM Viewer ─────────────────────────────────────────────────────────────

export class DicomViewerDto {
  @ApiProperty({ description: 'Study UUID' })
  @IsUUID()
  studyId: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Imaging modality', enum: ImagingModality })
  @IsEnum(ImagingModality)
  modality: ImagingModality;

  @ApiPropertyOptional({ description: 'Number of series in the study' })
  @IsOptional()
  @IsInt()
  @Min(1)
  seriesCount?: number;

  @ApiPropertyOptional({ description: 'Total DICOM instances (images)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  instanceCount?: number;

  @ApiPropertyOptional({ description: 'DICOM Study Instance UID' })
  @IsOptional()
  @IsString()
  studyInstanceUid?: string;
}

// ─── Exam Prep Protocols ─────────────────────────────────────────────────────

export class PrepProtocolRequestDto {
  @ApiProperty({ description: 'Exam type to get preparation instructions' })
  @IsString()
  @IsNotEmpty()
  examType: string;

  @ApiPropertyOptional({ description: 'Patient UUID — used to check allergy contraindications' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Contrast required for this exam' })
  @IsOptional()
  @IsBoolean()
  contrastRequired?: boolean;

  @ApiPropertyOptional({ description: 'Known contrast allergy — triggers premedication protocol' })
  @IsOptional()
  @IsBoolean()
  contrastAllergy?: boolean;
}

// ─── Structured Radiology Report ─────────────────────────────────────────────

export class MeasurementItemDto {
  @ApiProperty({ description: 'Measurement label (e.g. Lesão principal)' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Value in mm or cm' })
  @IsNumber()
  @IsPositive()
  value: number;

  @ApiProperty({ description: 'Unit (mm or cm)' })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class StructuredReportDto {
  @ApiProperty({ description: 'Imaging modality', enum: ImagingModality })
  @IsEnum(ImagingModality)
  modality: ImagingModality;

  @ApiProperty({ description: 'Structured report template', enum: StructuredReportTemplate })
  @IsEnum(StructuredReportTemplate)
  template: StructuredReportTemplate;

  @ApiProperty({ description: 'Detailed findings (structured text)' })
  @IsString()
  @IsNotEmpty()
  findings: string;

  @ApiProperty({ description: 'Radiologist impression / conclusion' })
  @IsString()
  @IsNotEmpty()
  impression: string;

  @ApiPropertyOptional({ description: 'Classification category (BI-RADS, Lung-RADS, etc.)', enum: ClassificationCategory })
  @IsOptional()
  @IsEnum(ClassificationCategory)
  classification?: ClassificationCategory;

  @ApiPropertyOptional({ description: 'Key measurements', type: [MeasurementItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeasurementItemDto)
  measurements?: MeasurementItemDto[];

  @ApiPropertyOptional({ description: 'Recommended follow-up action' })
  @IsOptional()
  @IsString()
  recommendation?: string;

  @ApiPropertyOptional({ description: 'Comparison with prior study date (ISO date)' })
  @IsOptional()
  @IsDateString()
  comparisonDate?: string;

  @ApiPropertyOptional({ description: 'Study technique / protocol used' })
  @IsOptional()
  @IsString()
  technique?: string;
}

export class CreateStructuredReportDto extends StructuredReportDto {
  @ApiProperty({ description: 'Radiology order UUID this report belongs to' })
  @IsUUID()
  orderId: string;
}

// ─── Radiologist Worklist ─────────────────────────────────────────────────────

export class RadiologistWorklistQueryDto {
  @ApiPropertyOptional({ description: 'Filter by modality', enum: ImagingModality })
  @IsOptional()
  @IsEnum(ImagingModality)
  modality?: ImagingModality;

  @ApiPropertyOptional({ description: 'Filter by priority', enum: RadiologyPriority })
  @IsOptional()
  @IsEnum(RadiologyPriority)
  priority?: RadiologyPriority;

  @ApiPropertyOptional({ description: 'Filter by requesting doctor UUID' })
  @IsOptional()
  @IsUUID()
  requestingDoctorId?: string;

  @ApiPropertyOptional({ description: 'Assigned radiologist UUID' })
  @IsOptional()
  @IsUUID()
  radiologistId?: string;
}

// ─── Incidental Finding Follow-up ─────────────────────────────────────────────

export class CreateIncidentalFollowUpDto {
  @ApiProperty({ description: 'Report UUID where the incidental finding was noted' })
  @IsUUID()
  reportId: string;

  @ApiProperty({ description: 'Description of the incidental finding' })
  @IsString()
  @IsNotEmpty()
  finding: string;

  @ApiProperty({ description: 'Clinical recommendation for follow-up' })
  @IsString()
  @IsNotEmpty()
  recommendation: string;

  @ApiProperty({ description: 'Recommended follow-up exam type (e.g. US abdome)' })
  @IsString()
  @IsNotEmpty()
  followUpExam: string;

  @ApiPropertyOptional({ description: 'Target follow-up date (ISO date)' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ description: 'Physician responsible for follow-up' })
  @IsOptional()
  @IsUUID()
  assignedPhysicianId?: string;

  @ApiPropertyOptional({ description: 'Urgency / priority', enum: RadiologyPriority })
  @IsOptional()
  @IsEnum(RadiologyPriority)
  priority?: RadiologyPriority;
}

export class UpdateIncidentalFollowUpDto {
  @ApiProperty({ description: 'New status', enum: IncidentalFindingStatus })
  @IsEnum(IncidentalFindingStatus)
  status: IncidentalFindingStatus;

  @ApiPropertyOptional({ description: 'Notes on resolution or next steps' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Completion exam UUID (if performed)' })
  @IsOptional()
  @IsUUID()
  completionExamId?: string;
}

// ─── Image Comparison ─────────────────────────────────────────────────────────

export class ImageComparisonDto {
  @ApiProperty({ description: 'Current (more recent) study UUID' })
  @IsUUID()
  currentStudyId: string;

  @ApiPropertyOptional({ description: 'Prior study UUID (if known)' })
  @IsOptional()
  @IsUUID()
  priorStudyId?: string;

  @ApiPropertyOptional({ description: 'Comparison findings narrative' })
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional({ description: 'Radiologist UUID performing comparison' })
  @IsOptional()
  @IsUUID()
  radiologistId?: string;
}
