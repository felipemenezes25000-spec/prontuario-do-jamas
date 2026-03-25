import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PediatricsService } from './pediatrics.service';
import { RecordGrowthDto, RecordVaccinationDto, RecordDevelopmentDto } from './dto/create-pediatrics.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Pediatrics')
@ApiBearerAuth('access-token')
@Controller('pediatrics')
export class PediatricsController {
  constructor(private readonly pediatricsService: PediatricsService) {}

  @Post('growth')
  @ApiOperation({ summary: 'Record growth data (weight, height, head circumference)' })
  @ApiResponse({ status: 201, description: 'Growth data recorded' })
  async recordGrowth(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordGrowthDto,
  ) {
    return this.pediatricsService.recordGrowth(tenantId, dto);
  }

  @Get('growth-chart/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get WHO/CDC growth charts data' })
  @ApiResponse({ status: 200, description: 'Growth chart data' })
  async getGrowthChart(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.pediatricsService.getGrowthChart(tenantId, patientId);
  }

  @Post('vaccination')
  @ApiOperation({ summary: 'Record vaccination (PNI)' })
  @ApiResponse({ status: 201, description: 'Vaccination recorded' })
  async recordVaccination(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordVaccinationDto,
  ) {
    return this.pediatricsService.recordVaccination(tenantId, dto);
  }

  @Post('development')
  @ApiOperation({ summary: 'Record developmental milestones' })
  @ApiResponse({ status: 201, description: 'Development recorded' })
  async recordDevelopment(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordDevelopmentDto,
  ) {
    return this.pediatricsService.recordDevelopment(tenantId, dto);
  }

  @Get('dose-calculator')
  @ApiOperation({ summary: 'Calculate pediatric dose by weight' })
  @ApiQuery({ name: 'medication', required: true })
  @ApiQuery({ name: 'weightKg', required: true })
  @ApiQuery({ name: 'ageInMonths', required: false })
  @ApiResponse({ status: 200, description: 'Dose calculation' })
  async calculateDose(
    @Query('medication') medication: string,
    @Query('weightKg') weightKg: string,
    @Query('ageInMonths') ageInMonths?: string,
  ) {
    return this.pediatricsService.calculateDose(
      medication,
      parseFloat(weightKg),
      ageInMonths ? parseInt(ageInMonths, 10) : undefined,
    );
  }
}
