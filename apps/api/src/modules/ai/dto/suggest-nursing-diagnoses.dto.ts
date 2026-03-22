import { IsString, IsUUID, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuggestNursingDiagnosesDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ type: [String], description: 'List of symptoms' })
  @IsArray()
  @IsString({ each: true })
  symptoms!: string[];

  @ApiPropertyOptional({ description: 'Vital signs as key-value pairs' })
  @IsOptional()
  @IsObject()
  vitalSigns?: Record<string, number>;
}

export class NursingDiagnosisItemDto {
  @ApiProperty({ description: 'NANDA diagnosis code' })
  code!: string;

  @ApiProperty({ description: 'Diagnosis label' })
  label!: string;

  @ApiProperty({ description: 'Priority: HIGH, MEDIUM, LOW' })
  priority!: string;
}

export class SuggestNursingDiagnosesResponseDto {
  @ApiProperty({ type: [NursingDiagnosisItemDto], description: 'Suggested nursing diagnoses' })
  diagnoses!: NursingDiagnosisItemDto[];
}
