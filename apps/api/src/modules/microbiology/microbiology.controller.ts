import {
  Controller,
  Get,
  Post,
  Patch,
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
import { MicrobiologyService } from './microbiology.service';
import {
  RegisterCultureDto,
  UpdateCultureStatusDto,
  RecordIsolateDto,
  RecordAstResultDto,
  GetInstitutionalAntibiogramDto,
} from './dto/microbiology.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Microbiology')
@ApiBearerAuth('access-token')
@Controller('microbiology')
export class MicrobiologyController {
  constructor(private readonly microbiologyService: MicrobiologyService) {}

  // ─── Culture Registration ──────────────────────────────────────────────────

  @Post('cultures')
  @ApiOperation({ summary: 'Register a new microbiology culture' })
  @ApiResponse({ status: 201, description: 'Culture registered' })
  async registerCulture(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterCultureDto,
  ) {
    return this.microbiologyService.registerCulture(tenantId, user.sub, dto);
  }

  @Patch('cultures/:id/status')
  @ApiParam({ name: 'id', description: 'Culture UUID' })
  @ApiOperation({ summary: 'Update culture status' })
  @ApiResponse({ status: 200, description: 'Culture status updated' })
  async updateCultureStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCultureStatusDto,
  ) {
    return this.microbiologyService.updateCultureStatus(tenantId, id, dto);
  }

  @Get('cultures/:id')
  @ApiParam({ name: 'id', description: 'Culture UUID' })
  @ApiOperation({ summary: 'Get full culture result with isolates and AST' })
  @ApiResponse({ status: 200, description: 'Culture result' })
  async getCultureResult(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.microbiologyService.getCultureResult(tenantId, id);
  }

  // ─── Isolates ──────────────────────────────────────────────────────────────

  @Post('isolates')
  @ApiOperation({ summary: 'Record an organism isolate found in a culture' })
  @ApiResponse({ status: 201, description: 'Isolate recorded' })
  async recordIsolate(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordIsolateDto,
  ) {
    return this.microbiologyService.recordIsolate(tenantId, dto);
  }

  // ─── AST (Antibiotic Sensitivity Testing) ──────────────────────────────────

  @Post('ast')
  @ApiOperation({ summary: 'Record antibiotic sensitivity test results for an isolate' })
  @ApiResponse({ status: 201, description: 'AST results recorded' })
  async recordAstResult(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordAstResultDto,
  ) {
    return this.microbiologyService.recordAstResult(tenantId, dto);
  }

  // ─── Resistance Detection ──────────────────────────────────────────────────

  @Get('isolates/:id/resistance')
  @ApiParam({ name: 'id', description: 'Isolate UUID' })
  @ApiOperation({ summary: 'Detect resistance mechanisms for an isolate (MRSA, ESBL, KPC, VRE)' })
  @ApiResponse({ status: 200, description: 'Resistance analysis result' })
  async detectResistanceMechanisms(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.microbiologyService.detectResistanceMechanisms(tenantId, id);
  }

  // ─── Institutional Antibiogram ─────────────────────────────────────────────

  @Post('antibiogram')
  @ApiOperation({ summary: 'Get institutional antibiogram (aggregate sensitivity data)' })
  @ApiResponse({ status: 200, description: 'Institutional antibiogram data' })
  async getInstitutionalAntibiogram(
    @CurrentTenant() tenantId: string,
    @Body() dto: GetInstitutionalAntibiogramDto,
  ) {
    return this.microbiologyService.getInstitutionalAntibiogram(tenantId, dto);
  }

  // ─── Pending Cultures ──────────────────────────────────────────────────────

  @Get('pending')
  @ApiOperation({ summary: 'List pending (non-finalized) cultures' })
  @ApiResponse({ status: 200, description: 'Pending cultures list' })
  async getPendingCultures(@CurrentTenant() tenantId: string) {
    return this.microbiologyService.getPendingCultures(tenantId);
  }

  // ─── Patient History ───────────────────────────────────────────────────────

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get all microbiology cultures for a patient' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by culture status' })
  @ApiResponse({ status: 200, description: 'Patient microbiology history' })
  async getPatientMicroHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.microbiologyService.getPatientMicroHistory(tenantId, patientId);
  }
}
