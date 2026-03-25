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
import { EmergencyService } from './emergency.service';
import { CreateTriageDto, UpdateEmergencyStatusDto, ActivateProtocolDto } from './dto/create-triage.dto';
import { ReclassifyRiskDto, CalculateNedocsDto } from './dto/emergency-advanced.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Emergency')
@ApiBearerAuth('access-token')
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post('triage')
  @ApiOperation({ summary: 'Create triage with Manchester protocol + door-time tracking' })
  @ApiResponse({ status: 201, description: 'Triage created' })
  async createTriage(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTriageDto,
  ) {
    return this.emergencyService.createTriage(tenantId, dto);
  }

  @Get('board')
  @ApiOperation({ summary: 'Patient flow board (waiting, in-treatment, observation)' })
  @ApiResponse({ status: 200, description: 'Emergency board' })
  async getBoard(@CurrentTenant() tenantId: string) {
    return this.emergencyService.getBoard(tenantId);
  }

  @Patch(':id/status')
  @ApiParam({ name: 'id', description: 'Emergency record UUID' })
  @ApiOperation({ summary: 'Update patient status in PS' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmergencyStatusDto,
  ) {
    return this.emergencyService.updateStatus(tenantId, id, dto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Door-to-doctor time, occupancy, wait times' })
  @ApiResponse({ status: 200, description: 'Emergency metrics' })
  async getMetrics(@CurrentTenant() tenantId: string) {
    return this.emergencyService.getMetrics(tenantId);
  }

  @Post(':id/protocol')
  @ApiParam({ name: 'id', description: 'Emergency record UUID' })
  @ApiOperation({ summary: 'Activate AVC/IAM/SEPSIS protocol' })
  @ApiResponse({ status: 201, description: 'Protocol activated' })
  async activateProtocol(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateProtocolDto,
  ) {
    return this.emergencyService.activateProtocol(tenantId, id, dto);
  }

  @Post(':id/reclassify')
  @ApiParam({ name: 'id', description: 'Emergency record UUID' })
  @ApiOperation({ summary: 'Reclassify Manchester triage level with justification and audit trail' })
  @ApiResponse({ status: 200, description: 'Risk reclassified' })
  async reclassifyRisk(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReclassifyRiskDto,
  ) {
    return this.emergencyService.reclassifyRisk(tenantId, id, dto);
  }

  @Post(':id/fast-track')
  @ApiParam({ name: 'id', description: 'Emergency record UUID' })
  @ApiOperation({ summary: 'Divert green/blue patient to Fast Track lane' })
  @ApiResponse({ status: 200, description: 'Fast Track assigned' })
  async assignFastTrack(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emergencyService.assignFastTrack(tenantId, id);
  }

  @Post('nedocs')
  @ApiOperation({ summary: 'Calculate NEDOCS overcrowding score' })
  @ApiResponse({ status: 201, description: 'NEDOCS score calculated' })
  async calculateNedocs(
    @CurrentTenant() tenantId: string,
    @Body() dto: CalculateNedocsDto,
  ) {
    return this.emergencyService.calculateNedocs(tenantId, dto);
  }
}
