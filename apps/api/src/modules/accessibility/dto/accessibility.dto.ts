import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum ContrastMode {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  DARK = 'DARK',
}

export class UpdateAccessibilitySettingsDto {
  @ApiPropertyOptional({ description: 'Font size in pixels', minimum: 12, maximum: 32 })
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(32)
  fontSize?: number;

  @ApiPropertyOptional({ description: 'Contrast mode', enum: ContrastMode })
  @IsOptional()
  @IsEnum(ContrastMode)
  contrastMode?: ContrastMode;

  @ApiPropertyOptional({ description: 'Enable screen reader mode' })
  @IsOptional()
  @IsBoolean()
  screenReaderMode?: boolean;

  @ApiPropertyOptional({ description: 'Enable reduced motion' })
  @IsOptional()
  @IsBoolean()
  reducedMotion?: boolean;

  @ApiPropertyOptional({ description: 'Preferred language for accessibility labels' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class AccessibilitySettingsResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  fontSize: number;

  @ApiProperty({ enum: ContrastMode })
  contrastMode: ContrastMode;

  @ApiProperty()
  screenReaderMode: boolean;

  @ApiProperty()
  reducedMotion: boolean;

  @ApiProperty()
  language: string;

  @ApiProperty()
  updatedAt: string;
}
