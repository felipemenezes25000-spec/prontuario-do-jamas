import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum, IsArray, IsDateString, IsNumber } from 'class-validator';

export enum SterilizationMethod {
  AUTOCLAVE_STEAM = 'AUTOCLAVE_STEAM',
  ETHYLENE_OXIDE = 'ETHYLENE_OXIDE',
  HYDROGEN_PEROXIDE = 'HYDROGEN_PEROXIDE',
  GLUTARALDEHYDE = 'GLUTARALDEHYDE',
  PERACETIC_ACID = 'PERACETIC_ACID',
}

export enum SterilizationResult {
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export enum InstrumentStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  STERILIZING = 'STERILIZING',
  DAMAGED = 'DAMAGED',
  RETIRED = 'RETIRED',
}

export class RegisterInstrumentDto {
  @ApiProperty({ description: 'Instrument set name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'List of instruments in the set' })
  @IsArray()
  @IsString({ each: true })
  instruments!: string[];

  @ApiPropertyOptional({ description: 'Instrument category (e.g., cirúrgico, ortopédico)' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Serial number or barcode' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Manufacturer' })
  @IsString()
  @IsOptional()
  manufacturer?: string;
}

export class RecordSterilizationDto {
  @ApiProperty({ description: 'Instrument set ID' })
  @IsUUID()
  instrumentSetId!: string;

  @ApiProperty({ enum: SterilizationMethod })
  @IsEnum(SterilizationMethod)
  method!: SterilizationMethod;

  @ApiProperty({ description: 'Cycle number' })
  @IsString()
  cycleNumber!: string;

  @ApiProperty({ description: 'Temperature in Celsius' })
  @IsNumber()
  temperature!: number;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  durationMinutes!: number;

  @ApiPropertyOptional({ description: 'Biological indicator lot number' })
  @IsString()
  @IsOptional()
  biologicalIndicatorLot?: string;

  @ApiPropertyOptional({ description: 'Chemical indicator result' })
  @IsString()
  @IsOptional()
  chemicalIndicatorResult?: string;

  @ApiPropertyOptional({ enum: SterilizationResult })
  @IsEnum(SterilizationResult)
  @IsOptional()
  result?: SterilizationResult;
}

export class PrepareSurgicalKitDto {
  @ApiProperty({ description: 'Surgical procedure ID' })
  @IsUUID()
  surgicalProcedureId!: string;

  @ApiProperty({ description: 'Instrument set IDs to include in kit' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  instrumentSetIds!: string[];

  @ApiPropertyOptional({ description: 'Additional items needed' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalItems?: string[];

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
}

export class InstrumentSetResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() instruments!: string[];
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional() serialNumber?: string;
  @ApiProperty({ enum: InstrumentStatus }) status!: InstrumentStatus;
  @ApiPropertyOptional() lastSterilizedAt?: Date;
  @ApiPropertyOptional() lastSterilizationCycle?: string;
  @ApiProperty() createdAt!: Date;
}

export class SterilizationCycleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() instrumentSetId!: string;
  @ApiProperty({ enum: SterilizationMethod }) method!: SterilizationMethod;
  @ApiProperty() cycleNumber!: string;
  @ApiProperty() temperature!: number;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty({ enum: SterilizationResult }) result!: SterilizationResult;
  @ApiPropertyOptional() biologicalIndicatorLot?: string;
  @ApiPropertyOptional() chemicalIndicatorResult?: string;
  @ApiProperty() operatorId!: string;
  @ApiProperty() performedAt!: Date;
}

export class SurgicalKitResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() surgicalProcedureId!: string;
  @ApiProperty({ type: [InstrumentSetResponseDto] }) instrumentSets!: InstrumentSetResponseDto[];
  @ApiPropertyOptional() additionalItems?: string[];
  @ApiProperty() preparedById!: string;
  @ApiProperty() preparedAt!: Date;
  @ApiPropertyOptional() scheduledFor?: Date;
}

export class InstrumentTraceabilityResponseDto {
  @ApiProperty() instrumentSetId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() currentStatus!: InstrumentStatus;
  @ApiProperty() history!: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    details?: string;
  }>;
}

export class BiologicalIndicatorResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() lot!: string;
  @ApiProperty() cycleId!: string;
  @ApiProperty() incubationStartedAt!: Date;
  @ApiPropertyOptional() incubationCompletedAt?: Date;
  @ApiProperty() result!: string;
  @ApiProperty() readById!: string;
}

export class CmeDashboardResponseDto {
  @ApiProperty() totalInstrumentSets!: number;
  @ApiProperty() sterilizationCyclesToday!: number;
  @ApiProperty() pendingBiologicalIndicators!: number;
  @ApiProperty() failedCyclesThisWeek!: number;
  @ApiProperty() kitsReadyForSurgery!: number;
  @ApiProperty() instrumentsByStatus!: Record<string, number>;
}
