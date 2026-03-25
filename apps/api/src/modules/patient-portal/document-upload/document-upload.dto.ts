import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn, IsBoolean } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Document type: EXTERNAL_EXAM, REPORT, PHOTO, REFERRAL, OTHER' })
  @IsIn(['EXTERNAL_EXAM', 'REPORT', 'PHOTO', 'REFERRAL', 'OTHER'])
  documentType!: string;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  fileName!: string;

  @ApiProperty({ description: 'S3/storage file URL' })
  @IsString()
  fileUrl!: string;

  @ApiProperty({ description: 'MIME type (e.g. application/pdf, image/jpeg)' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize!: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ReviewDocumentDto {
  @ApiPropertyOptional({ description: 'Doctor review notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Whether to incorporate into patient chart' })
  @IsBoolean()
  incorporated!: boolean;
}
