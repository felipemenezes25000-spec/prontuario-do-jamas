import {
  Controller,
  Get,
  Post,
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
import { ObstetricsService } from './obstetrics.service';
import {
  CreatePrenatalCardDto,
  RecordPartogramDto,
  RecordUltrasoundDto,
} from './dto/create-obstetrics.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Obstetrics')
@ApiBearerAuth('access-token')
@Controller('obstetrics')
export class ObstetricsController {
  constructor(private readonly obstetricsService: ObstetricsService) {}

  @Post('prenatal-card')
  @ApiOperation({ summary: 'Create prenatal card' })
  @ApiResponse({ status: 201, description: 'Prenatal card created' })
  async createPrenatalCard(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePrenatalCardDto,
  ) {
    return this.obstetricsService.createPrenatalCard(tenantId, dto);
  }

  @Post('partogram')
  @ApiOperation({ summary: 'Record partogram data' })
  @ApiResponse({ status: 201, description: 'Partogram recorded' })
  async recordPartogram(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordPartogramDto,
  ) {
    return this.obstetricsService.recordPartogram(tenantId, dto);
  }

  @Post('ultrasound')
  @ApiOperation({ summary: 'Record obstetric ultrasound' })
  @ApiResponse({ status: 201, description: 'Ultrasound recorded' })
  async recordUltrasound(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordUltrasoundDto,
  ) {
    return this.obstetricsService.recordUltrasound(tenantId, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get obstetric history' })
  @ApiResponse({ status: 200, description: 'Obstetric history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.obstetricsService.findByPatient(tenantId, patientId);
  }

  @Get('risk-classification/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get gestational risk classification' })
  @ApiResponse({ status: 200, description: 'Risk classification' })
  async getRiskClassification(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.obstetricsService.getRiskClassification(tenantId, patientId);
  }
}
