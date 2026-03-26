import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsIn,
  IsNumber,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// =========================================================================
// IEEE 11073 Multiparametric Monitor
// =========================================================================

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Device type: MONITOR, VENTILATOR, INFUSION_PUMP, ECG, OXIMETER' })
  @IsIn(['MONITOR', 'VENTILATOR', 'INFUSION_PUMP', 'ECG', 'OXIMETER'])
  deviceType!: string;

  @ApiProperty({ description: 'Serial number' })
  @IsString()
  serialNumber!: string;

  @ApiProperty({ description: 'IEEE 11073 device identifier' })
  @IsString()
  ieee11073DeviceId!: string;

  @ApiProperty({ description: 'Bed UUID where device is installed' })
  @IsUUID()
  bedId!: string;

  @ApiProperty({ description: 'Device manufacturer' })
  @IsString()
  manufacturer!: string;
}

export class VitalMetricDto {
  @ApiProperty({ description: 'IEEE 11073 metric code (e.g., MDC_PULS_OXIM_SAT_O2)' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Numeric value' })
  @IsNumber()
  value!: number;

  @ApiProperty({ description: 'Unit (e.g., %, bpm, mmHg)' })
  @IsString()
  unit!: string;

  @ApiProperty({ description: 'Timestamp of measurement' })
  @IsDateString()
  timestamp!: string;
}

export class ReceiveVitalsDto {
  @ApiProperty({ description: 'Vital sign metrics array', type: [VitalMetricDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VitalMetricDto)
  metrics!: VitalMetricDto[];
}

export class ListDevicesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Filter by bed UUID' })
  @IsOptional()
  @IsUUID()
  bedId?: string;

  @ApiPropertyOptional({ description: 'Filter by status: ACTIVE, DISCONNECTED, ERROR' })
  @IsOptional()
  @IsIn(['ACTIVE', 'DISCONNECTED', 'ERROR'])
  status?: string;
}

// =========================================================================
// Remote Exam Devices (Tyto Care / Eko)
// =========================================================================

export class RegisterRemoteDeviceDto {
  @ApiProperty({ description: 'Platform: TYTO_CARE, EKO, OTHER' })
  @IsIn(['TYTO_CARE', 'EKO', 'OTHER'])
  platform!: string;

  @ApiProperty({ description: 'Device model name' })
  @IsString()
  deviceModel!: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;
}

export class ReceiveRemoteExamDataDto {
  @ApiProperty({ description: 'Exam type: HEART, LUNGS, SKIN, EAR, THROAT, TEMPERATURE, ECG' })
  @IsIn(['HEART', 'LUNGS', 'SKIN', 'EAR', 'THROAT', 'TEMPERATURE', 'ECG'])
  examType!: string;

  @ApiProperty({ description: 'Raw exam data (base64 or JSON string)' })
  @IsString()
  rawData!: string;

  @ApiPropertyOptional({ description: 'AI interpretation of the exam' })
  @IsOptional()
  @IsString()
  interpretation?: string;
}
