import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateEducationContentDto {
  @ApiProperty({ description: 'Title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Content body (HTML or markdown)' })
  @IsString()
  body!: string;

  @ApiProperty({ description: 'Content type: ARTICLE, VIDEO, INFOGRAPHIC, FAQ' })
  @IsIn(['ARTICLE', 'VIDEO', 'INFOGRAPHIC', 'FAQ'])
  contentType!: string;

  @ApiProperty({ description: 'Related CID-10 codes or conditions', type: [String] })
  @IsArray()
  @IsString({ each: true })
  relatedConditions!: string[];

  @ApiPropertyOptional({ description: 'Language code (default pt-BR)' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Media URL (video, image)' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Difficulty level: BASIC, INTERMEDIATE, ADVANCED' })
  @IsOptional()
  @IsIn(['BASIC', 'INTERMEDIATE', 'ADVANCED'])
  difficultyLevel?: string;
}
