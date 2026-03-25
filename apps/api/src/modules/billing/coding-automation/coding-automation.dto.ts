import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';

export class SuggestCodingDto {
  @ApiProperty({ description: 'Clinical notes text' })
  @IsString()
  clinicalText!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Preferred coding system: CID10, CBHPM, TUSS' })
  @IsOptional()
  @IsString()
  codingSystem?: string;
}

export class ValidateCodingDto {
  @ApiProperty({ description: 'Codes to validate', type: [Object] })
  @IsArray()
  codes!: Array<{
    system: 'CID10' | 'CBHPM' | 'TUSS';
    code: string;
    description?: string;
  }>;

  @ApiPropertyOptional({ description: 'Encounter UUID for context' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}
