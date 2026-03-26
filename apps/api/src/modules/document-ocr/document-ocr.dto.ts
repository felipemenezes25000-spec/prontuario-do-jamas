import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsEnum,
} from 'class-validator';

export enum OcrDocumentType {
  RG = 'RG',
  CPF = 'CPF',
  CNH = 'CNH',
  CARTEIRINHA_CONVENIO = 'CARTEIRINHA_CONVENIO',
  CERTIDAO_NASCIMENTO = 'CERTIDAO_NASCIMENTO',
  COMPROVANTE_ENDERECO = 'COMPROVANTE_ENDERECO',
  OTHER = 'OTHER',
}

export enum ImageFormat {
  JPEG = 'JPEG',
  PNG = 'PNG',
  PDF = 'PDF',
}

export class ProcessOcrDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Document type for OCR', enum: OcrDocumentType })
  @IsEnum(OcrDocumentType)
  documentType!: OcrDocumentType;

  @ApiProperty({ description: 'Base64-encoded image data' })
  @IsString()
  @IsNotEmpty()
  imageBase64!: string;

  @ApiProperty({ description: 'Image format', enum: ImageFormat })
  @IsEnum(ImageFormat)
  imageFormat!: ImageFormat;
}
