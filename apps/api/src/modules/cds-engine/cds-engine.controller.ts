import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CdsEngineService } from './cds-engine.service';
import { CreateRuleDto, UpdateRuleDto, EvaluateRulesDto } from './dto/create-cds-engine.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('CDS Engine')
@ApiBearerAuth('access-token')
@Controller('cds-engine')
export class CdsEngineController {
  constructor(private readonly cdsEngineService: CdsEngineService) {}

  @Post('rules')
  @ApiOperation({ summary: 'Create a clinical decision support rule' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createRule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRuleDto,
  ) {
    return this.cdsEngineService.createRule(tenantId, user.sub, dto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List all CDS rules' })
  @ApiResponse({ status: 200, description: 'CDS rules' })
  async listRules(@CurrentTenant() tenantId: string) {
    return this.cdsEngineService.listRules(tenantId);
  }

  @Patch('rules/:id')
  @ApiParam({ name: 'id', description: 'Rule UUID' })
  @ApiOperation({ summary: 'Update a CDS rule' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  async updateRule(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.cdsEngineService.updateRule(tenantId, id, dto);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate CDS rules against patient data' })
  @ApiResponse({ status: 201, description: 'Evaluation result with alerts' })
  async evaluateRules(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EvaluateRulesDto,
  ) {
    return this.cdsEngineService.evaluateRules(tenantId, user.sub, dto);
  }

  @Get('alerts/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get active CDS alerts for a patient' })
  @ApiResponse({ status: 200, description: 'Active CDS alerts' })
  async getPatientAlerts(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.cdsEngineService.getPatientAlerts(tenantId, patientId);
  }
}
