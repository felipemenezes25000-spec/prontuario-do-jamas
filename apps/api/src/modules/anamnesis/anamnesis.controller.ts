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
import { AnamnesisService } from './anamnesis.service';
import {
  CreateProblemDto,
  UpdateProblemDto,
  CreateHomeMedicationDto,
  UpsertObstetricHistoryDto,
  CreateTransfusionHistoryDto,
  CreateImplantedDeviceDto,
  UpsertGenogramDto,
  TimelineFilterDto,
  CreateSpecialtyAnamnesisDto,
  ImportFhirHistoryDto,
  AiInconsistencyCheckDto,
  AiAnamnesisSuggestionsDto,
} from './dto/anamnesis.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Anamnesis & Clinical History')
@ApiBearerAuth('access-token')
@Controller('anamnesis')
export class AnamnesisController {
  constructor(private readonly service: AnamnesisService) {}

  // --- Problem List ---

  @Post('problems')
  @ApiOperation({ summary: 'Add problem to patient problem list' })
  @ApiResponse({ status: 201, description: 'Problem added' })
  async createProblem(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProblemDto,
  ) {
    return this.service.createProblem(tenantId, user.sub, dto);
  }

  @Get('problems/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({ summary: 'List patient problems' })
  @ApiResponse({ status: 200, description: 'Problem list' })
  async listProblems(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('status') status?: string,
  ) {
    return this.service.listProblems(tenantId, patientId, status);
  }

  @Patch('problems/:id')
  @ApiParam({ name: 'id', description: 'Problem document UUID' })
  @ApiOperation({ summary: 'Update a problem' })
  @ApiResponse({ status: 200, description: 'Problem updated' })
  async updateProblem(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProblemDto,
  ) {
    return this.service.updateProblem(tenantId, id, dto);
  }

  // --- Home Medications ---

  @Post('home-medications')
  @ApiOperation({ summary: 'Add home medication' })
  @ApiResponse({ status: 201, description: 'Medication added' })
  async createHomeMedication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateHomeMedicationDto,
  ) {
    return this.service.createHomeMedication(tenantId, user.sub, dto);
  }

  @Get('home-medications/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List patient home medications' })
  @ApiResponse({ status: 200, description: 'Home medications' })
  async listHomeMedications(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.listHomeMedications(tenantId, patientId);
  }

  // --- Obstetric History ---

  @Post('obstetric-history')
  @ApiOperation({ summary: 'Create or update obstetric history (GPAC)' })
  @ApiResponse({ status: 200, description: 'Obstetric history saved' })
  async upsertObstetricHistory(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertObstetricHistoryDto,
  ) {
    return this.service.upsertObstetricHistory(tenantId, user.sub, dto);
  }

  @Get('obstetric-history/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get obstetric history' })
  @ApiResponse({ status: 200, description: 'Obstetric history' })
  async getObstetricHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getObstetricHistory(tenantId, patientId);
  }

  // --- Transfusion History ---

  @Post('transfusion-history')
  @ApiOperation({ summary: 'Add transfusion record' })
  @ApiResponse({ status: 201, description: 'Transfusion record added' })
  async createTransfusionHistory(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTransfusionHistoryDto,
  ) {
    return this.service.createTransfusionHistory(tenantId, user.sub, dto);
  }

  @Get('transfusion-history/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List transfusion history' })
  @ApiResponse({ status: 200, description: 'Transfusion history' })
  async listTransfusionHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.listTransfusionHistory(tenantId, patientId);
  }

  // --- Implanted Devices ---

  @Post('implanted-devices')
  @ApiOperation({ summary: 'Add implanted device record' })
  @ApiResponse({ status: 201, description: 'Device record added' })
  async createImplantedDevice(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateImplantedDeviceDto,
  ) {
    return this.service.createImplantedDevice(tenantId, user.sub, dto);
  }

  @Get('implanted-devices/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List implanted devices with MRI alerts' })
  @ApiResponse({ status: 200, description: 'Device list' })
  async listImplantedDevices(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.listImplantedDevices(tenantId, patientId);
  }

  // --- Genogram ---

  @Post('genogram')
  @ApiOperation({ summary: 'Create or update interactive genogram' })
  @ApiResponse({ status: 200, description: 'Genogram saved' })
  async upsertGenogram(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertGenogramDto,
  ) {
    return this.service.upsertGenogram(tenantId, user.sub, dto);
  }

  @Get('genogram/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get genogram' })
  @ApiResponse({ status: 200, description: 'Genogram data' })
  async getGenogram(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getGenogram(tenantId, patientId);
  }

  // --- Visual Clinical Timeline ---

  @Get('timeline/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get visual clinical timeline' })
  @ApiResponse({ status: 200, description: 'Timeline events' })
  async getVisualTimeline(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() filters: TimelineFilterDto,
  ) {
    return this.service.getVisualTimeline(tenantId, patientId, filters);
  }

  // --- Specialty Anamnesis ---

  @Post('specialty')
  @ApiOperation({ summary: 'Create specialty-specific anamnesis' })
  @ApiResponse({ status: 201, description: 'Specialty anamnesis created' })
  async createSpecialtyAnamnesis(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSpecialtyAnamnesisDto,
  ) {
    return this.service.createSpecialtyAnamnesis(tenantId, user.sub, dto);
  }

  @Get('specialty/template/:specialty')
  @ApiParam({ name: 'specialty', description: 'Specialty name' })
  @ApiOperation({ summary: 'Get specialty anamnesis template questions' })
  @ApiResponse({ status: 200, description: 'Template questions' })
  async getSpecialtyAnamnesisTemplate(
    @Param('specialty') specialty: string,
  ) {
    return this.service.getSpecialtyAnamnesisTemplate(specialty);
  }

  // --- Import History ---

  @Post('import/fhir')
  @ApiOperation({ summary: 'Import clinical history from FHIR/RNDS' })
  @ApiResponse({ status: 201, description: 'History imported' })
  async importFhirHistory(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ImportFhirHistoryDto,
  ) {
    return this.service.importFhirHistory(tenantId, user.sub, dto);
  }

  // --- AI Features ---

  @Post('ai/inconsistency-check')
  @ApiOperation({ summary: 'AI inconsistency detection in patient records' })
  @ApiResponse({ status: 200, description: 'Inconsistency analysis' })
  async aiInconsistencyCheck(
    @CurrentTenant() tenantId: string,
    @Body() dto: AiInconsistencyCheckDto,
  ) {
    return this.service.aiInconsistencyCheck(tenantId, dto);
  }

  @Post('ai/anamnesis-suggestions')
  @ApiOperation({ summary: 'AI-powered anamnesis question suggestions' })
  @ApiResponse({ status: 200, description: 'Question suggestions' })
  async aiAnamnesisSuggestions(
    @CurrentTenant() tenantId: string,
    @Body() dto: AiAnamnesisSuggestionsDto,
  ) {
    return this.service.aiAnamnesisSuggestions(tenantId, dto);
  }
}
