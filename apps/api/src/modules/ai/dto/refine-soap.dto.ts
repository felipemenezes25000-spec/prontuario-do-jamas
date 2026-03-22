import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefineSOAPDto {
  @ApiProperty({ description: 'Subjective section of the SOAP note' })
  @IsString()
  subjective!: string;

  @ApiProperty({ description: 'Objective section of the SOAP note' })
  @IsString()
  objective!: string;

  @ApiProperty({ description: 'Assessment section of the SOAP note' })
  @IsString()
  assessment!: string;

  @ApiProperty({ description: 'Plan section of the SOAP note' })
  @IsString()
  plan!: string;

  @ApiPropertyOptional({ description: 'Feedback or instructions for refinement' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class RefineSOAPResponseDto {
  @ApiProperty({ description: 'Refined subjective section' })
  subjective!: string;

  @ApiProperty({ description: 'Refined objective section' })
  objective!: string;

  @ApiProperty({ description: 'Refined assessment section' })
  assessment!: string;

  @ApiProperty({ description: 'Refined plan section' })
  plan!: string;

  @ApiProperty({ type: [String], description: 'List of changes made' })
  changesMade!: string[];
}
