import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum VerificationType {
  LIVENESS_CHECK = 'LIVENESS_CHECK',
  FACE_MATCH = 'FACE_MATCH',
  FULL_VERIFICATION = 'FULL_VERIFICATION',
}

export class VerifyIdentityDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Base64-encoded selfie image' })
  @IsString()
  @IsNotEmpty()
  selfieBase64!: string;

  @ApiPropertyOptional({ description: 'Base64-encoded photo from ID document for comparison' })
  @IsOptional()
  @IsString()
  documentPhotoBase64?: string;

  @ApiProperty({ description: 'Type of verification to perform', enum: VerificationType })
  @IsEnum(VerificationType)
  verificationType!: VerificationType;
}
