import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum ReviewAction {
  CONTINUE = 'CONTINUE',
  DE_ESCALATE = 'DE_ESCALATE',
  ESCALATE = 'ESCALATE',
  SWITCH_ORAL = 'SWITCH_ORAL',
  DISCONTINUE = 'DISCONTINUE',
  CHANGE_AGENT = 'CHANGE_AGENT',
  ADJUST_DOSE = 'ADJUST_DOSE',
}

export class CreateReviewDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Encounter ID' })
  @IsUUID()
  @IsNotEmpty()
  encounterId: string;

  @ApiPropertyOptional({ description: 'Prescription ID' })
  @IsOptional()
  @IsUUID()
  prescriptionId?: string;

  @ApiProperty({ description: 'Antimicrobial being reviewed' })
  @IsString()
  @IsNotEmpty()
  antimicrobialName: string;

  @ApiProperty({ enum: ReviewAction })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiProperty({ description: 'Clinical justification' })
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiPropertyOptional({ description: 'Recommended alternative' })
  @IsOptional()
  @IsString()
  recommendedAlternative?: string;

  @ApiPropertyOptional({ description: 'Culture results available' })
  @IsOptional()
  @IsString()
  cultureResults?: string;

  @ApiPropertyOptional({ description: 'Sensitivity pattern' })
  @IsOptional()
  @IsString()
  sensitivityPattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
