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
import { VitalSignsService } from './vital-signs.service';
import { CreateVitalSignsDto } from './dto/create-vital-signs.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Vital Signs')
@ApiBearerAuth('access-token')
@Controller('vital-signs')
export class VitalSignsController {
  constructor(private readonly vitalSignsService: VitalSignsService) {}

  @Post()
  @ApiOperation({ summary: 'Record vital signs' })
  @ApiResponse({ status: 201, description: 'Vital signs recorded' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVitalSignsDto,
  ) {
    return this.vitalSignsService.create(user.sub, dto);
  }

  @Get('by-encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get vital signs by encounter' })
  @ApiResponse({ status: 200, description: 'List of vital signs' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.vitalSignsService.findByEncounter(encounterId);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get vital signs by patient (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated vital signs' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.vitalSignsService.findByPatient(patientId, pagination);
  }

  @Get('patient/:patientId/latest')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get latest vital signs for a patient' })
  @ApiResponse({ status: 200, description: 'Latest vital signs' })
  async getLatest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.vitalSignsService.getLatest(patientId);
  }

  @Get('patient/:patientId/trends')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'count', required: false, type: Number, description: 'Number of records to return (default 20)' })
  @ApiOperation({ summary: 'Get vital signs trends for charting' })
  @ApiResponse({ status: 200, description: 'Vital signs trends' })
  async getTrends(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('count') count?: string,
  ) {
    return this.vitalSignsService.getTrends(
      patientId,
      count ? parseInt(count, 10) : 20,
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Vital signs UUID' })
  @ApiOperation({ summary: 'Get vital signs by ID' })
  @ApiResponse({ status: 200, description: 'Vital signs details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vitalSignsService.findById(id);
  }

  // ─── Enhanced Vitals Endpoints ──────────────────────────────────────────

  @Post('rass')
  @ApiOperation({ summary: 'Record RASS sedation scale (-5 to +4)' })
  @ApiResponse({ status: 201, description: 'RASS assessment recorded' })
  async createRassAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: { patientId: string; encounterId?: string; rass: number; observations?: string },
  ) {
    return this.vitalSignsService.createRassAssessment(tenantId, user.sub, dto);
  }

  @Post('cam-icu')
  @ApiOperation({ summary: 'Record CAM-ICU delirium assessment' })
  @ApiResponse({ status: 201, description: 'CAM-ICU assessment recorded' })
  async createCamIcuAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      rassScore: number;
      feature1AcuteOnset: boolean;
      feature1Fluctuating: boolean;
      feature2Inattention: boolean;
      feature2Score?: number;
      feature3AlteredConsciousness: boolean;
      feature4DisorganizedThinking: boolean;
      observations?: string;
    },
  ) {
    return this.vitalSignsService.createCamIcuAssessment(tenantId, user.sub, dto);
  }

  @Post('bis')
  @ApiOperation({ summary: 'Record BIS (bispectral index) for anesthesia depth' })
  @ApiResponse({ status: 201, description: 'BIS record created' })
  async createBisRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      bisValue: number;
      emg?: number;
      sr?: number;
      observations?: string;
    },
  ) {
    return this.vitalSignsService.createBisRecord(tenantId, user.sub, dto);
  }

  @Post('icp')
  @ApiOperation({ summary: 'Record ICP with CPP calculation' })
  @ApiResponse({ status: 201, description: 'ICP record created' })
  async createIcpRecord(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      icp: number;
      meanArterialPressure: number;
      observations?: string;
    },
  ) {
    return this.vitalSignsService.createIcpRecord(tenantId, user.sub, dto);
  }

  @Post('invasive-hemodynamics')
  @ApiOperation({ summary: 'Record invasive hemodynamics (PAM, PVC, POAP, CO, CI, SVR)' })
  @ApiResponse({ status: 201, description: 'Hemodynamics record created' })
  async createInvasiveHemodynamics(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      pam: number;
      pvc?: number;
      poap?: number;
      cardiacOutput?: number;
      cardiacIndex?: number;
      svr?: number;
      svri?: number;
      pvr?: number;
      svo2?: number;
      observations?: string;
    },
  ) {
    return this.vitalSignsService.createInvasiveHemodynamics(tenantId, user.sub, dto);
  }

  @Post('ventilator-params')
  @ApiOperation({ summary: 'Record full ventilator parameters' })
  @ApiResponse({ status: 201, description: 'Ventilator params recorded' })
  async createVentilatorParams(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      mode: string;
      tidalVolume?: number;
      respiratoryRate?: number;
      fio2?: number;
      peep?: number;
      pressureSupport?: number;
      plateauPressure?: number;
      peakPressure?: number;
      meanAirwayPressure?: number;
      compliance?: number;
      resistance?: number;
      autopeep?: number;
      ieRatio?: string;
      observations?: string;
    },
  ) {
    return this.vitalSignsService.createVentilatorParams(tenantId, user.sub, dto);
  }

  @Get('patient/:patientId/trend-charts')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'period', required: false, enum: ['24h', '7d', '30d'], description: 'Time period (default 24h)' })
  @ApiOperation({ summary: 'Get vital signs trend charts data' })
  @ApiResponse({ status: 200, description: 'Trend charts data' })
  async getTrendCharts(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('period') period?: '24h' | '7d' | '30d',
  ) {
    return this.vitalSignsService.getTrendCharts(patientId, period ?? '24h');
  }

  @Get('patient/:patientId/cardiac-arrest-risk')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Calculate cardiac arrest prediction risk score' })
  @ApiResponse({ status: 200, description: 'Risk score calculated' })
  async calculateCardiacArrestRisk(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.vitalSignsService.calculateCardiacArrestRisk(patientId);
  }
}
