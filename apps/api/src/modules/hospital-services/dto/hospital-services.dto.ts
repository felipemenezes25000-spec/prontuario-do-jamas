import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, IsEnum } from 'class-validator';

// ─── SND (Nutrition & Dietetics) ─────────────────────────────────────────

export enum DietType {
  REGULAR = 'REGULAR',
  HYPOSSODICA = 'HYPOSSODICA',
  DIABETICA = 'DIABETICA',
  PASTOSA = 'PASTOSA',
  LIQUIDA = 'LIQUIDA',
  BRANDA = 'BRANDA',
  ENTERAL = 'ENTERAL',
  PARENTERAL = 'PARENTERAL',
  JEJUM = 'JEJUM',
  SEM_GLUTEM = 'SEM_GLUTEM',
  SEM_LACTOSE = 'SEM_LACTOSE',
  RENAL = 'RENAL',
  HEPATICA = 'HEPATICA',
}

export class CreateDietOrderDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ enum: DietType }) @IsEnum(DietType) dietType!: DietType;
  @ApiPropertyOptional() @IsString() @IsOptional() restrictions?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() calorieTarget?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() observations?: string;
}

// ─── Laundry ─────────────────────────────────────────────────────────────

export class RecordLaundryDto {
  @ApiProperty() @IsString() sector!: string;
  @ApiProperty() @IsNumber() weightKg!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() linenType?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() lossCount?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() washCycle?: string;
}

// ─── Waste Management (PGRSS) ────────────────────────────────────────────

export enum WasteGroup {
  A = 'A', // Infectantes
  B = 'B', // Químicos
  C = 'C', // Radioativos
  D = 'D', // Comuns
  E = 'E', // Perfurocortantes
}

export class RecordWasteDto {
  @ApiProperty() @IsString() sector!: string;
  @ApiProperty({ enum: WasteGroup }) @IsEnum(WasteGroup) group!: WasteGroup;
  @ApiProperty() @IsNumber() weightKg!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() destination?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transportCompany?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() certificateNumber?: string;
}

// ─── Ombudsman ───────────────────────────────────────────────────────────

export enum ComplaintType {
  COMPLAINT = 'COMPLAINT',
  COMPLIMENT = 'COMPLIMENT',
  SUGGESTION = 'SUGGESTION',
  INFORMATION = 'INFORMATION',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class CreateComplaintDto {
  @ApiProperty({ enum: ComplaintType }) @IsEnum(ComplaintType) type!: ComplaintType;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() patientName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactInfo?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sector?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() classification?: string;
}

// ─── SAME (Medical Records Archive) ──────────────────────────────────────

export enum RecordLocationStatus {
  IN_ARCHIVE = 'IN_ARCHIVE',
  ON_LOAN = 'ON_LOAN',
  DIGITIZED = 'DIGITIZED',
  DESTROYED = 'DESTROYED',
}

export class LoanRecordDto {
  @ApiProperty() @IsString() recordNumber!: string;
  @ApiProperty() @IsString() requestedBy!: string;
  @ApiProperty() @IsString() sector!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}

export class ReturnRecordDto {
  @ApiProperty() @IsString() recordNumber!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() condition?: string;
}
