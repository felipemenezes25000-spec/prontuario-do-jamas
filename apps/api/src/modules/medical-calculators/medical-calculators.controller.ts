import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MedicalCalculatorsService } from './medical-calculators.service';
import {
  CalculateScoreDto,
  CalculatorType,
} from './dto/medical-calculators.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Medical Calculators')
@ApiBearerAuth('access-token')
@Controller('medical-calculators')
export class MedicalCalculatorsController {
  constructor(private readonly service: MedicalCalculatorsService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate a medical score' })
  @ApiResponse({ status: 200, description: 'Score calculation result' })
  async calculateScore(
    @Body() dto: CalculateScoreDto,
  ) {
    return this.service.calculateScore(dto);
  }

  @Get('available')
  @ApiOperation({ summary: 'List all available calculators with input schemas' })
  @ApiResponse({ status: 200, description: 'Available calculators' })
  async getAvailableCalculators() {
    return this.service.getAvailableCalculators();
  }

  @Get('auto-fill')
  @ApiOperation({ summary: 'Auto-fill calculator inputs from patient latest data' })
  @ApiQuery({ name: 'patientId', required: true, description: 'Patient UUID' })
  @ApiQuery({ name: 'calculator', required: true, enum: CalculatorType })
  @ApiResponse({ status: 200, description: 'Auto-filled values' })
  async getPatientAutoFill(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId: string,
    @Query('calculator') calculator: CalculatorType,
  ) {
    return this.service.getPatientAutoFill(tenantId, patientId, calculator);
  }
}
