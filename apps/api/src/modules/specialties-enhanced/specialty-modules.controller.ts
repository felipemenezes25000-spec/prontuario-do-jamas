import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { SpecialtyModulesService } from './specialty-modules.service';
import {
  PartogramDto,
  CardiologyDto,
  NephrologyDto,
  NeurologyDto,
  OrthopedicsDto,
  DermatologyDto,
  OphthalmologyDto,
  EndocrinologyDto,
  PulmonologyDto,
} from './dto/specialty-modules.dto';

@ApiTags('Specialties — Clinical Modules')
@ApiBearerAuth('access-token')
@Controller('specialties')
export class SpecialtyModulesController {
  constructor(private readonly service: SpecialtyModulesService) {}

  // =========================================================================
  // Obstetrics / Partogram
  // =========================================================================

  @Post('obstetrics/partogram')
  @ApiOperation({ summary: 'Record digital partogram (dilation, descent, contractions, FHR)' })
  @ApiResponse({ status: 201, description: 'Partogram recorded with alerts' })
  async createPartogram(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PartogramDto,
  ) {
    return this.service.createPartogram(tenantId, user.sub, dto);
  }

  @Get('obstetrics/partogram/:patientId/history')
  @ApiOperation({ summary: 'Get partogram history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getPartogramHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getPartogramHistory(tenantId, patientId);
  }

  // =========================================================================
  // Cardiology
  // =========================================================================

  @Post('cardiology/module')
  @ApiOperation({ summary: 'Record cardiology module (ECG, echo, cath, Framingham/ASCVD/CHA2DS2-VASc)' })
  @ApiResponse({ status: 201, description: 'Cardiology record created' })
  async createCardiologyModule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CardiologyDto,
  ) {
    return this.service.createCardiologyModule(tenantId, user.sub, dto);
  }

  @Get('cardiology/:patientId/history')
  @ApiOperation({ summary: 'Get cardiology module history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getCardiologyHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyHistory(tenantId, patientId, '[SPECIALTY:CARDIOLOGY:MODULE]');
  }

  // =========================================================================
  // Nephrology
  // =========================================================================

  @Post('nephrology/module')
  @ApiOperation({ summary: 'Record nephrology module (CKD-EPI GFR, dialysis, access, Kt/V)' })
  @ApiResponse({ status: 201, description: 'Nephrology record with calculated GFR and Kt/V check' })
  async createNephrologyModule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NephrologyDto,
  ) {
    return this.service.createNephrologyModule(tenantId, user.sub, dto);
  }

  @Get('nephrology/:patientId/history')
  @ApiOperation({ summary: 'Get nephrology history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getNephrologyHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyHistory(tenantId, patientId, '[SPECIALTY:NEPHROLOGY:MODULE]');
  }

  // =========================================================================
  // Neurology
  // =========================================================================

  @Post('neurology/module')
  @ApiOperation({ summary: 'Record neurology module (NIHSS, mRankin, EDSS, EEG, seizure log)' })
  @ApiResponse({ status: 201, description: 'Neurology record created with score interpretations' })
  async createNeurologyModule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NeurologyDto,
  ) {
    return this.service.createNeurologyModule(tenantId, user.sub, dto);
  }

  @Get('neurology/:patientId/history')
  @ApiOperation({ summary: 'Get neurology history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getNeurologyHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyHistory(tenantId, patientId, '[SPECIALTY:NEUROLOGY:MODULE]');
  }

  // =========================================================================
  // Orthopedics
  // =========================================================================

  @Post('orthopedics/module')
  @ApiOperation({ summary: 'Record orthopedics module (AO classification, immobilization, DVT prophylaxis)' })
  @ApiResponse({ status: 201, description: 'Orthopedics record created' })
  async createOrthopedicsModule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: OrthopedicsDto,
  ) {
    return this.service.createOrthopedicsModule(tenantId, user.sub, dto);
  }

  @Get('orthopedics/:patientId/history')
  @ApiOperation({ summary: 'Get orthopedics history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getOrthopedicsHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyHistory(tenantId, patientId, '[SPECIALTY:ORTHOPEDICS:MODULE]');
  }

  // =========================================================================
  // Dermatology
  // =========================================================================

  @Post('dermatology/module')
  @ApiOperation({ summary: 'Record dermatology module (photo atlas, dermoscopy, nevus mapping, temporal tracking)' })
  @ApiResponse({ status: 201, description: 'Dermatology record created with flagged nevi count' })
  async createDermatologyModule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DermatologyDto,
  ) {
    return this.service.createDermatologyModule(tenantId, user.sub, dto);
  }

  @Get('dermatology/:patientId/history')
  @ApiOperation({ summary: 'Get dermatology history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getDermatologyHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyHistory(tenantId, patientId, '[SPECIALTY:DERMATOLOGY:MODULE]');
  }

  // =========================================================================
  // Ophthalmology
  // =========================================================================

  @Post('ophthalmology/module')
  @ApiOperation({ summary: 'Record ophthalmology module (Snellen, tonometry, OCT, visual fields)' })
  @ApiResponse({ status: 201, description: 'Ophthalmology record created with IOP alerts' })
  async createOphthalmologyModule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: OphthalmologyDto,
  ) {
    return this.service.createOphthalmologyModule(tenantId, user.sub, dto);
  }

  @Get('ophthalmology/:patientId/history')
  @ApiOperation({ summary: 'Get ophthalmology history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getOphthalmologyHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyHistory(tenantId, patientId, '[SPECIALTY:OPHTHALMOLOGY:MODULE]');
  }

  // =========================================================================
  // Endocrinology
  // =========================================================================

  @Post('endocrinology/module')
  @ApiOperation({ summary: 'Record endocrinology module (insulin protocol, sliding scale, HbA1c, thyroid)' })
  @ApiResponse({ status: 201, description: 'Endocrinology record created with alerts' })
  async createEndocrinologyModule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EndocrinologyDto,
  ) {
    return this.service.createEndocrinologyModule(tenantId, user.sub, dto);
  }

  @Get('endocrinology/:patientId/history')
  @ApiOperation({ summary: 'Get endocrinology history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getEndocrinologyHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyHistory(tenantId, patientId, '[SPECIALTY:ENDOCRINOLOGY:MODULE]');
  }

  // =========================================================================
  // Pulmonology
  // =========================================================================

  @Post('pulmonology/module')
  @ApiOperation({ summary: 'Record pulmonology module (spirometry, GOLD, CAT/ACT, home oxygen)' })
  @ApiResponse({ status: 201, description: 'Pulmonology record created with staging interpretations' })
  async createPulmonologyModule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PulmonologyDto,
  ) {
    return this.service.createPulmonologyModule(tenantId, user.sub, dto);
  }

  @Get('pulmonology/:patientId/history')
  @ApiOperation({ summary: 'Get pulmonology history for patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getPulmonologyHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyHistory(tenantId, patientId, '[SPECIALTY:PULMONOLOGY:MODULE]');
  }

  // =========================================================================
  // Generic history endpoint
  // =========================================================================

  @Get(':specialty/:patientId/records')
  @ApiOperation({ summary: 'Get all specialty module records for patient by specialty tag' })
  @ApiParam({ name: 'specialty', description: 'Specialty slug (cardiology, nephrology, etc.)' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'tag', required: false, description: 'Custom tag filter prefix' })
  async getSpecialtyRecords(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('specialty') specialty: string,
    @Query('tag') tag?: string,
  ) {
    const specialtyTag = tag ?? `[SPECIALTY:${specialty.toUpperCase()}:]`;
    return this.service.getSpecialtyHistory(tenantId, patientId, specialtyTag);
  }
}
