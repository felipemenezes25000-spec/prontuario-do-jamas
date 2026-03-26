import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsDateString,
} from 'class-validator';

export enum IheProfile {
  XDS_B = 'XDS.b',
  XCA = 'XCA',
  PIX = 'PIXv3',
  PDQ = 'PDQv3',
  ATNA = 'ATNA',
  CT = 'CT',
  BPPC = 'BPPC',
  XDR = 'XDR',
  XDM = 'XDM',
  MHD = 'MHD',
}

export enum DocumentClassCode {
  CONSULTATION_NOTE = '11488-4',
  DISCHARGE_SUMMARY = '18842-5',
  HISTORY_AND_PHYSICAL = '34117-2',
  OPERATIVE_NOTE = '11504-8',
  PROGRESS_NOTE = '11506-3',
  PROCEDURE_NOTE = '28570-0',
  REFERRAL_NOTE = '57133-1',
  TRANSFER_SUMMARY = '18761-7',
  IMAGING_REPORT = '18748-4',
  LABORATORY_REPORT = '11502-2',
  PATHOLOGY_REPORT = '11526-1',
}

export class XdsProvideRegisterDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Document title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Document class code (LOINC)', enum: DocumentClassCode })
  @IsOptional()
  @IsEnum(DocumentClassCode)
  classCode?: DocumentClassCode;

  @ApiPropertyOptional({ description: 'Content (base64 or text)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'MIME type' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Author institution OID' })
  @IsOptional()
  @IsString()
  authorInstitution?: string;

  @ApiPropertyOptional({ description: 'Source patient info' })
  @IsOptional()
  sourcePatientInfo?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Clinical document ID reference' })
  @IsOptional()
  @IsUUID()
  clinicalDocumentId?: string;
}

export class XdsQueryDto {
  @ApiPropertyOptional({ description: 'Patient ID' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Document class code' })
  @IsOptional()
  @IsString()
  classCode?: string;

  @ApiPropertyOptional({ description: 'Date from' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Document status' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class PixQueryDto {
  @ApiProperty({ description: 'Patient identifier value' })
  @IsString()
  @IsNotEmpty()
  patientIdentifier: string;

  @ApiPropertyOptional({ description: 'Source domain OID' })
  @IsOptional()
  @IsString()
  sourceDomain?: string;

  @ApiPropertyOptional({ description: 'Target domain OIDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetDomains?: string[];
}

// ─── PDQ (Patient Demographics Query) DTOs ────────────────────────────────

export class PdqSearchDto {
  @ApiPropertyOptional({ description: 'Patient family name' })
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiPropertyOptional({ description: 'Patient given name' })
  @IsOptional()
  @IsString()
  givenName?: string;

  @ApiPropertyOptional({ description: 'Patient birth date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Patient gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Identifier domain OID' })
  @IsOptional()
  @IsString()
  identifierDomain?: string;

  @ApiPropertyOptional({ description: 'Identifier value (e.g. CPF)' })
  @IsOptional()
  @IsString()
  identifierValue?: string;
}

// ─── MHD (Mobile access to Health Documents) DTOs ─────────────────────────

export class MhdDocumentDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Document type identifier' })
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @ApiProperty({ description: 'Document content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'MIME type of the document' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'Document title' })
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class MhdFindDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Search from date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Search to date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Document type filter' })
  @IsOptional()
  @IsString()
  type?: string;
}

// ─── XCA (Cross-Community Access) DTOs ────────────────────────────────────

export class XcaQueryDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Community ID (OID)' })
  @IsString()
  @IsNotEmpty()
  communityId: string;

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class XcaRetrieveDto {
  @ApiProperty({ description: 'Unique document ID from the external community' })
  @IsString()
  @IsNotEmpty()
  documentUniqueId: string;

  @ApiProperty({ description: 'Community ID (OID) of the source community' })
  @IsString()
  @IsNotEmpty()
  communityId: string;
}
