import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Enums
// ============================================================================

export enum PhoneticAlgorithm {
  SOUNDEX = 'SOUNDEX',
  METAPHONE = 'METAPHONE',
  DOUBLE_METAPHONE = 'DOUBLE_METAPHONE',
}

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  PROBABLE = 'PROBABLE',
  POSSIBLE = 'POSSIBLE',
}

export enum LabelType {
  WRISTBAND = 'WRISTBAND',
  SPECIMEN = 'SPECIMEN',
  CHART = 'CHART',
  MEDICATION = 'MEDICATION',
  MATERIAL = 'MATERIAL',
}

export enum BarcodeFormat {
  QR_CODE = 'QR_CODE',
  CODE128 = 'CODE128',
  DATAMATRIX = 'DATAMATRIX',
}

export enum LabelField {
  NAME = 'NAME',
  MRN = 'MRN',
  BIRTH_DATE = 'BIRTH_DATE',
  ALLERGIES = 'ALLERGIES',
  BLOOD_TYPE = 'BLOOD_TYPE',
}

export enum DeliveryType {
  VAGINAL = 'VAGINAL',
  CESAREAN = 'CESAREAN',
  FORCEPS = 'FORCEPS',
  VACUUM = 'VACUUM',
}

export enum DocumentOCRType {
  RG = 'RG',
  CPF = 'CPF',
  CNH = 'CNH',
  INSURANCE_CARD = 'INSURANCE_CARD',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
}

export enum LivenessCheckResult {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  INCONCLUSIVE = 'INCONCLUSIVE',
}

// ============================================================================
// 1. MPI / Duplicate Detection
// ============================================================================

export class FindDuplicatesDto {
  @ApiPropertyOptional({ description: 'Patient name to match' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'CPF number to match' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ description: 'Birth date to match' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Mother name to match' })
  @IsOptional()
  @IsString()
  motherName?: string;
}

export class DuplicateCandidateDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ nullable: true }) cpf!: string | null;
  @ApiProperty({ nullable: true }) birthDate!: string | null;
  @ApiProperty() mrn!: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) matchScore!: number;
  @ApiProperty({ type: [String] }) matchedFields!: string[];
  @ApiProperty({ enum: ConfidenceLevel }) confidenceLevel!: ConfidenceLevel;
}

export class MergePatientDto {
  @ApiProperty({ description: 'ID of the patient record to keep (survivor)' })
  @IsUUID()
  survivorId!: string;

  @ApiProperty({ description: 'ID of the duplicate record to merge and deactivate' })
  @IsUUID()
  duplicateId!: string;

  @ApiProperty({
    description: 'Map of field name to which record to use: "survivor" or "duplicate"',
    example: { fullName: 'survivor', phone: 'duplicate', email: 'duplicate' },
  })
  @IsObject()
  fieldsToKeep!: Record<string, 'survivor' | 'duplicate'>;

  @ApiProperty({ description: 'Reason for the merge' })
  @IsString()
  reason!: string;
}

// ============================================================================
// 2. Phonetic Search
// ============================================================================

export class PhoneticSearchDto {
  @ApiProperty({ description: 'Search query (patient name)' })
  @IsString()
  query!: string;

  @ApiPropertyOptional({
    enum: PhoneticAlgorithm,
    default: PhoneticAlgorithm.SOUNDEX,
  })
  @IsOptional()
  @IsEnum(PhoneticAlgorithm)
  algorithm?: PhoneticAlgorithm;
}

// ============================================================================
// 3. Newborn Registration
// ============================================================================

export class NewbornRegistrationDto {
  @ApiProperty({ description: 'Mother patient ID' })
  @IsUUID()
  motherId!: string;

  @ApiProperty({ description: 'Birth date of the newborn' })
  @IsDateString()
  birthDate!: string;

  @ApiPropertyOptional({ description: 'Birth time (HH:mm)' })
  @IsOptional()
  @IsString()
  birthTime?: string;

  @ApiProperty({ description: 'Gender of the newborn' })
  @IsString()
  gender!: string;

  @ApiPropertyOptional({ description: 'Birth weight in grams' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  birthWeight?: number;

  @ApiPropertyOptional({ description: 'Birth length in cm' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(80)
  birthLength?: number;

  @ApiPropertyOptional({ description: 'Head circumference in cm' })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(50)
  headCircumference?: number;

  @ApiPropertyOptional({ description: 'APGAR score at 1 minute (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  apgar1?: number;

  @ApiPropertyOptional({ description: 'APGAR score at 5 minutes (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  apgar5?: number;

  @ApiPropertyOptional({ description: 'APGAR score at 10 minutes (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  apgar10?: number;

  @ApiPropertyOptional({ description: 'Gestational age in weeks' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(45)
  gestationalAge?: number;

  @ApiPropertyOptional({ enum: DeliveryType })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ description: 'Birth order (for multiple births)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  birthOrder?: number;

  @ApiPropertyOptional({ description: 'List of birth complications', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complications?: string[];

  @ApiPropertyOptional({ description: 'Attending pediatrician user ID' })
  @IsOptional()
  @IsUUID()
  pediatricianId?: string;
}

// ============================================================================
// 4. QR Code / Barcode Label Generation
// ============================================================================

export class GenerateLabelDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: LabelType })
  @IsEnum(LabelType)
  labelType!: LabelType;

  @ApiPropertyOptional({ enum: BarcodeFormat, default: BarcodeFormat.QR_CODE })
  @IsOptional()
  @IsEnum(BarcodeFormat)
  format?: BarcodeFormat;

  @ApiPropertyOptional({
    description: 'Fields to include in the label',
    enum: LabelField,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LabelField, { each: true })
  includeFields?: LabelField[];
}

export class LabelResultDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() labelType!: string;
  @ApiProperty() format!: string;
  @ApiProperty({ description: 'Base64-encoded image data' }) imageBase64!: string;
  @ApiProperty({ description: 'Text content on the label' }) textContent!: string;
  @ApiProperty() generatedAt!: string;
}

// ============================================================================
// 5. Address Geolocation
// ============================================================================

export class GeocodeAddressDto {
  @ApiProperty() @IsString() street!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() neighborhood?: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() state!: string;
  @ApiProperty() @IsString() zipCode!: string;
}

export class GeocodeResultDto {
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty() formattedAddress!: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) confidence!: number;
}

// ============================================================================
// 6. Document OCR
// ============================================================================

export class DocumentOCRDto {
  @ApiProperty({ enum: DocumentOCRType })
  @IsEnum(DocumentOCRType)
  documentType!: DocumentOCRType;

  @ApiProperty({ description: 'Base64-encoded document image' })
  @IsString()
  imageBase64!: string;
}

export class OCRExtractedField {
  @ApiProperty() fieldName!: string;
  @ApiProperty() value!: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) confidence!: number;
}

export class OCRResultDto {
  @ApiProperty({ type: [OCRExtractedField] }) extractedFields!: OCRExtractedField[];
  @ApiProperty({ minimum: 0, maximum: 100 }) overallConfidence!: number;
  @ApiProperty() rawText!: string;
  @ApiProperty() documentType!: string;
}

export class MapOCRToPatientDto {
  @ApiProperty({ description: 'OCR result to map to patient fields' })
  @ValidateNested()
  @Type(() => OCRResultDto)
  ocrResult!: OCRResultDto;

  @ApiPropertyOptional({ description: 'Existing patient ID to update' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

// ============================================================================
// 7. Identity Verification (Selfie + Liveness)
// ============================================================================

export class IdentityVerificationDto {
  @ApiProperty({ description: 'Patient ID to verify' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ description: 'Base64-encoded selfie image' })
  @IsString()
  selfieBase64!: string;

  @ApiProperty({ description: 'Base64-encoded document photo for comparison' })
  @IsString()
  documentPhotoBase64!: string;
}

export class VerificationResultDto {
  @ApiProperty() isMatch!: boolean;
  @ApiProperty({ minimum: 0, maximum: 100 }) matchConfidence!: number;
  @ApiProperty({ enum: LivenessCheckResult }) livenessCheck!: LivenessCheckResult;
  @ApiProperty({ type: [String] }) fraudIndicators!: string[];
  @ApiProperty() verifiedAt!: string;
  @ApiProperty() patientId!: string;
}
