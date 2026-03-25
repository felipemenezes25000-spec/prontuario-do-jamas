import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';

// ─── Prep Protocols ──────────────────────────────────────────────────────────

export enum PrepProtocolExamType {
  CT_ABDOMEN = 'CT_ABDOMEN',
  CT_PELVIS = 'CT_PELVIS',
  CT_COLONOSCOPY = 'CT_COLONOSCOPY',
  MRI_BRAIN = 'MRI_BRAIN',
  MRI_ABDOMEN = 'MRI_ABDOMEN',
  MAMMOGRAPHY = 'MAMMOGRAPHY',
  PET_CT = 'PET_CT',
  NUCLEAR_MEDICINE = 'NUCLEAR_MEDICINE',
  ANGIOGRAPHY = 'ANGIOGRAPHY',
  ULTRASOUND_PELVIS = 'ULTRASOUND_PELVIS',
  BARIUM_SWALLOW = 'BARIUM_SWALLOW',
}

// ─── PACS Archive ────────────────────────────────────────────────────────────

export enum ArchiveTier {
  ONLINE = 'ONLINE',
  NEARLINE = 'NEARLINE',
  OFFLINE = 'OFFLINE',
}

export class ArchiveStudyDto {
  @ApiProperty({ description: 'Archive tier', enum: ArchiveTier })
  @IsEnum(ArchiveTier)
  tier: ArchiveTier;

  @ApiPropertyOptional({ description: 'Reason for archiving' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── 3D Reconstruction ───────────────────────────────────────────────────────

export enum Reconstruction3DType {
  VRT = 'VRT',
  MIP = 'MIP',
  MPR = 'MPR',
  CPR = 'CPR',
  CINEMATIC = 'CINEMATIC',
}

export class Request3DReconstructionDto {
  @ApiProperty({ description: 'Reconstruction type', enum: Reconstruction3DType })
  @IsEnum(Reconstruction3DType)
  reconstructionType: Reconstruction3DType;

  @ApiPropertyOptional({ description: 'Specific anatomy to reconstruct (e.g. coronary arteries)' })
  @IsOptional()
  @IsString()
  targetAnatomy?: string;

  @ApiProperty({ description: 'Clinical justification' })
  @IsString()
  @IsNotEmpty()
  clinicalJustification: string;

  @ApiPropertyOptional({ description: 'Priority: ROUTINE or URGENT' })
  @IsOptional()
  @IsString()
  priority?: string;
}

// ─── Tele-radiology ──────────────────────────────────────────────────────────

export enum TeleradiologySpecialty {
  NEURORADIOLOGY = 'NEURORADIOLOGY',
  CARDIAC = 'CARDIAC',
  PEDIATRIC = 'PEDIATRIC',
  MUSCULOSKELETAL = 'MUSCULOSKELETAL',
  INTERVENTIONAL = 'INTERVENTIONAL',
  GENERAL = 'GENERAL',
}

export class RequestTeleradiologyDto {
  @ApiProperty({ description: 'Specialty needed', enum: TeleradiologySpecialty })
  @IsEnum(TeleradiologySpecialty)
  specialty: TeleradiologySpecialty;

  @ApiProperty({ description: 'Clinical question / indication' })
  @IsString()
  @IsNotEmpty()
  clinicalQuestion: string;

  @ApiPropertyOptional({ description: 'Is this urgent?' })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @ApiPropertyOptional({ description: 'Requesting physician notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
