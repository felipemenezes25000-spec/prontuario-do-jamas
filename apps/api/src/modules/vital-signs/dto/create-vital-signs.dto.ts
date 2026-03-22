import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import {
  HeartRhythm,
  TemperatureMethod,
  OxygenSupplementation,
  GlucoseContext,
  Edema,
  VitalSource,
} from '@prisma/client';

export class CreateVitalSignsDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Recorded at' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @ApiPropertyOptional({ description: 'Systolic blood pressure (mmHg)' })
  @IsOptional()
  @IsInt()
  @Min(40)
  @Max(300)
  systolicBP?: number;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure (mmHg)' })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(200)
  diastolicBP?: number;

  @ApiPropertyOptional({ description: 'Heart rate (bpm)' })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  heartRate?: number;

  @ApiPropertyOptional({ description: 'Heart rhythm', enum: HeartRhythm })
  @IsOptional()
  @IsEnum(HeartRhythm)
  heartRhythm?: HeartRhythm;

  @ApiPropertyOptional({ description: 'Respiratory rate (breaths/min)' })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(60)
  respiratoryRate?: number;

  @ApiPropertyOptional({ description: 'Respiratory pattern' })
  @IsOptional()
  @IsString()
  respiratoryPattern?: string;

  @ApiPropertyOptional({ description: 'Temperature (Celsius)' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Temperature method', enum: TemperatureMethod })
  @IsOptional()
  @IsEnum(TemperatureMethod)
  temperatureMethod?: TemperatureMethod;

  @ApiPropertyOptional({ description: 'Oxygen saturation (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @ApiPropertyOptional({ description: 'Oxygen supplementation', enum: OxygenSupplementation })
  @IsOptional()
  @IsEnum(OxygenSupplementation)
  oxygenSupplementation?: OxygenSupplementation;

  @ApiPropertyOptional({ description: 'FiO2' })
  @IsOptional()
  @IsNumber()
  fiO2?: number;

  @ApiPropertyOptional({ description: 'Pain scale (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScale?: number;

  @ApiPropertyOptional({ description: 'Pain location' })
  @IsOptional()
  @IsString()
  painLocation?: string;

  @ApiPropertyOptional({ description: 'Pain type' })
  @IsOptional()
  @IsString()
  painType?: string;

  @ApiPropertyOptional({ description: 'Weight (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weight?: number;

  @ApiPropertyOptional({ description: 'Height (cm)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ description: 'Head circumference (cm)' })
  @IsOptional()
  @IsNumber()
  headCircumference?: number;

  @ApiPropertyOptional({ description: 'Abdominal circumference (cm)' })
  @IsOptional()
  @IsNumber()
  abdominalCircumference?: number;

  @ApiPropertyOptional({ description: 'Glucose level (mg/dL)' })
  @IsOptional()
  @IsNumber()
  glucoseLevel?: number;

  @ApiPropertyOptional({ description: 'Glucose context', enum: GlucoseContext })
  @IsOptional()
  @IsEnum(GlucoseContext)
  glucoseContext?: GlucoseContext;

  @ApiPropertyOptional({ description: 'GCS Eye (1-4)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  gcsEye?: number;

  @ApiPropertyOptional({ description: 'GCS Verbal (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  gcsVerbal?: number;

  @ApiPropertyOptional({ description: 'GCS Motor (1-6)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  gcsMotor?: number;

  @ApiPropertyOptional({ description: 'Pupil left' })
  @IsOptional()
  @IsString()
  pupilLeft?: string;

  @ApiPropertyOptional({ description: 'Pupil right' })
  @IsOptional()
  @IsString()
  pupilRight?: string;

  @ApiPropertyOptional({ description: 'Pupil reactivity' })
  @IsOptional()
  @IsString()
  pupilReactivity?: string;

  @ApiPropertyOptional({ description: 'Capillary refill' })
  @IsOptional()
  @IsString()
  capillaryRefill?: string;

  @ApiPropertyOptional({ description: 'Edema', enum: Edema })
  @IsOptional()
  @IsEnum(Edema)
  edema?: Edema;

  @ApiPropertyOptional({ description: 'Edema location' })
  @IsOptional()
  @IsString()
  edemaLocation?: string;

  @ApiPropertyOptional({ description: 'Diuresis 24h (mL)' })
  @IsOptional()
  @IsNumber()
  diuresis24h?: number;

  @ApiPropertyOptional({ description: 'Source', enum: VitalSource })
  @IsOptional()
  @IsEnum(VitalSource)
  source?: VitalSource;

  @ApiPropertyOptional({ description: 'Device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
