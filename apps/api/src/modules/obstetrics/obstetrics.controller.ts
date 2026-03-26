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
  CreateObstetricHistoryDto,
} from './dto/create-obstetrics.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
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

  // --- GPAC Obstetric History ---

  @Post('obstetric-history')
  @ApiOperation({ summary: 'Save GPAC obstetric history (Gestações, Partos, Abortos, Cesáreas)' })
  @ApiResponse({ status: 201, description: 'Obstetric history saved' })
  async saveObstetricHistory(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateObstetricHistoryDto,
  ) {
    return this.obstetricsService.saveObstetricHistory(tenantId, user.email, dto);
  }

  @Get('obstetric-history/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get GPAC obstetric history for patient' })
  @ApiResponse({ status: 200, description: 'Obstetric history with GPAC data' })
  async getObstetricHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.obstetricsService.getObstetricHistory(tenantId, patientId);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get all obstetric records for patient' })
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
