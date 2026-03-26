import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Enums
// ============================================================================

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  MORNING_SNACK = 'MORNING_SNACK',
  LUNCH = 'LUNCH',
  AFTERNOON_SNACK = 'AFTERNOON_SNACK',
  DINNER = 'DINNER',
  NIGHT_SNACK = 'NIGHT_SNACK',
}

export enum DietType {
  REGULAR = 'REGULAR',
  SOFT = 'SOFT',
  LIQUID = 'LIQUID',
  LOW_SODIUM = 'LOW_SODIUM',
  DIABETIC = 'DIABETIC',
  RENAL = 'RENAL',
  GLUTEN_FREE = 'GLUTEN_FREE',
  LACTOSE_FREE = 'LACTOSE_FREE',
  ENTERAL = 'ENTERAL',
  PARENTERAL = 'PARENTERAL',
  NPO = 'NPO',
}

// ============================================================================
// Nested classes
// ============================================================================

export class MacroNutrients {
  @ApiProperty({ description: 'Protein in grams' })
  @IsNumber()
  @Min(0)
  protein!: number;

  @ApiProperty({ description: 'Carbohydrates in grams' })
  @IsNumber()
  @Min(0)
  carbs!: number;

  @ApiProperty({ description: 'Fat in grams' })
  @IsNumber()
  @Min(0)
  fat!: number;

  @ApiPropertyOptional({ description: 'Fiber in grams' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;
}

export class MenuItemDto {
  @ApiProperty({ description: 'Food item name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Calories (kcal)' })
  @IsNumber()
  @Min(0)
  calories!: number;

  @ApiProperty({ description: 'Macronutrients', type: MacroNutrients })
  @ValidateNested()
  @Type(() => MacroNutrients)
  macros!: MacroNutrients;
}

// ============================================================================
// DTOs
// ============================================================================

export class CreateMenuDto {
  @ApiProperty({ description: 'Date for the menu (YYYY-MM-DD)' })
  @IsString()
  date!: string;

  @ApiProperty({ enum: MealType, description: 'Meal type' })
  @IsEnum(MealType)
  mealType!: MealType;

  @ApiProperty({ type: [MenuItemDto], description: 'Menu items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items!: MenuItemDto[];
}

export class AssignDietDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: DietType, description: 'Diet type' })
  @IsEnum(DietType)
  dietType!: DietType;

  @ApiProperty({ type: [String], description: 'Dietary restrictions' })
  @IsArray()
  @IsString({ each: true })
  restrictions!: string[];

  @ApiProperty({ type: [String], description: 'Food allergies' })
  @IsArray()
  @IsString({ each: true })
  allergies!: string[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MealDeliveryDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: MealType, description: 'Meal type' })
  @IsEnum(MealType)
  mealType!: MealType;

  @ApiProperty({ description: 'Was the meal delivered?' })
  @IsBoolean()
  delivered!: boolean;

  @ApiProperty({ description: 'Was the meal refused?' })
  @IsBoolean()
  refused!: boolean;

  @ApiPropertyOptional({ description: 'Reason for refusal' })
  @IsOptional()
  @IsString()
  refusalReason?: string;

  @ApiPropertyOptional({ description: 'Portion consumed (%)', enum: [25, 50, 75, 100] })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  portionConsumed?: number;
}
