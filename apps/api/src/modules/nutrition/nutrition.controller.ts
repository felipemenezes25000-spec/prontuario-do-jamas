import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { CreateNutritionAssessmentDto, CreateDietPlanDto, UpdateNutritionDto } from './dto/create-nutrition.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Nutrition')
@ApiBearerAuth('access-token')
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create nutritional assessment (MNA, NRS-2002)' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createAssessment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateNutritionAssessmentDto,
  ) {
    return this.nutritionService.createAssessment(tenantId, dto);
  }

  @Post('diet-plan')
  @ApiOperation({ summary: 'Create individualized diet plan' })
  @ApiResponse({ status: 201, description: 'Diet plan created' })
  async createDietPlan(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDietPlanDto,
  ) {
    return this.nutritionService.createDietPlan(tenantId, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient nutrition history' })
  @ApiResponse({ status: 200, description: 'Nutrition history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.nutritionService.findByPatient(tenantId, patientId);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Nutrition record UUID' })
  @ApiOperation({ summary: 'Update nutrition record' })
  @ApiResponse({ status: 200, description: 'Record updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNutritionDto,
  ) {
    return this.nutritionService.update(tenantId, id, dto);
  }
}
