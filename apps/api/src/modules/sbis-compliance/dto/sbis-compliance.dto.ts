import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export enum ComplianceLevel {
  NGS1 = 'NGS1',
  NGS2 = 'NGS2',
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export class SubmitEvidenceDto {
  @ApiProperty({ description: 'Requirement ID' }) @IsString() requirementId!: string;
  @ApiProperty({ description: 'Evidence description' }) @IsString() description!: string;
  @ApiPropertyOptional({ description: 'Evidence document URL' }) @IsString() @IsOptional() documentUrl?: string;
  @ApiPropertyOptional({ description: 'Additional notes' }) @IsString() @IsOptional() notes?: string;
}

export class ChecklistItemDto {
  @ApiProperty() requirementId!: string;
  @ApiProperty() category!: string;
  @ApiProperty() requirement!: string;
  @ApiProperty({ enum: ComplianceLevel }) level!: ComplianceLevel;
  @ApiProperty({ enum: ComplianceStatus }) status!: ComplianceStatus;
  @ApiPropertyOptional() evidenceDescription?: string;
  @ApiPropertyOptional() lastVerifiedAt?: Date;
  @ApiProperty() mandatory!: boolean;
}

export class SbisChecklistResponseDto {
  @ApiProperty({ type: [ChecklistItemDto] }) items!: ChecklistItemDto[];
  @ApiProperty() totalRequirements!: number;
  @ApiProperty() compliantCount!: number;
  @ApiProperty() targetLevel!: ComplianceLevel;
}

export class SbisStatusResponseDto {
  @ApiProperty() currentLevel!: string;
  @ApiProperty() targetLevel!: string;
  @ApiProperty() overallCompliance!: number;
  @ApiProperty() mandatoryCompliance!: number;
  @ApiProperty() totalRequirements!: number;
  @ApiProperty() compliant!: number;
  @ApiProperty() partiallyCompliant!: number;
  @ApiProperty() nonCompliant!: number;
  @ApiProperty() lastAuditDate?: Date;
  @ApiProperty() nextAuditDate?: Date;
}

export class ComplianceGapDto {
  @ApiProperty() requirementId!: string;
  @ApiProperty() requirement!: string;
  @ApiProperty() category!: string;
  @ApiProperty() severity!: string;
  @ApiPropertyOptional() recommendation?: string;
  @ApiPropertyOptional() estimatedEffort?: string;
}

export class ComplianceGapsResponseDto {
  @ApiProperty({ type: [ComplianceGapDto] }) gaps!: ComplianceGapDto[];
  @ApiProperty() totalGaps!: number;
  @ApiProperty() criticalGaps!: number;
}

export class CfmResolutionDto {
  @ApiProperty() resolutionNumber!: string;
  @ApiProperty() description!: string;
  @ApiProperty() status!: ComplianceStatus;
  @ApiPropertyOptional() details?: string;
  @ApiPropertyOptional() lastReviewedAt?: Date;
}

export class CfmResolutionsResponseDto {
  @ApiProperty({ type: [CfmResolutionDto] }) resolutions!: CfmResolutionDto[];
  @ApiProperty() overallCompliance!: number;
}

export class EvidenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() requirementId!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() documentUrl?: string;
  @ApiProperty() submittedById!: string;
  @ApiProperty() submittedAt!: Date;
}
