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
import { LisLabEnhancedService } from './lis-lab-enhanced.service';
import {
  CreatePhlebotomyItemDto,
  UpdateCollectionStatusDto,
  CreateReflexRuleEnhancedDto,
  EvaluateReflexDto,
  ABGInputDto,
  RecordPOCTestDto,
} from './dto/lis-lab-enhanced.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('LIS — Lab Enhanced (Phlebotomy, Reflex, ABG, POC)')
@ApiBearerAuth('access-token')
@Controller('lis')
export class LisLabEnhancedController {
  constructor(private readonly service: LisLabEnhancedService) {}

  // ─── Phlebotomy Worklist ──────────────────────────────────────────────────

  @Get('phlebotomy-worklist')
  @ApiOperation({ summary: 'Generate phlebotomy worklist by unit and date, sorted by priority' })
  @ApiQuery({ name: 'unit', required: false, description: 'Unit/floor filter' })
  @ApiQuery({ name: 'date', required: false, description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Phlebotomy worklist' })
  async getPhlebotomyWorklist(
    @CurrentTenant() tenantId: string,
    @Query('unit') unit?: string,
    @Query('date') date?: string,
  ) {
    return this.service.generatePhlebotomyWorklist(tenantId, unit, date);
  }

  @Post('phlebotomy')
  @ApiOperation({ summary: 'Add item to phlebotomy worklist' })
  @ApiResponse({ status: 201, description: 'Item added' })
  async addPhlebotomyItem(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePhlebotomyItemDto,
  ) {
    return this.service.addPhlebotomyItem(tenantId, dto);
  }

  @Patch('phlebotomy/:id/collect')
  @ApiParam({ name: 'id', description: 'Phlebotomy item UUID' })
  @ApiOperation({ summary: 'Mark phlebotomy item as collected' })
  @ApiResponse({ status: 200, description: 'Marked as collected' })
  async markCollected(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.markCollected(tenantId, id, user.sub);
  }

  @Patch('phlebotomy/:id/status')
  @ApiParam({ name: 'id', description: 'Phlebotomy item UUID' })
  @ApiOperation({ summary: 'Update phlebotomy collection status (COLLECTED, FAILED, CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateCollectionStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollectionStatusDto,
  ) {
    return this.service.updateCollectionStatus(tenantId, id, dto);
  }

  // ─── Reflex Testing ───────────────────────────────────────────────────────

  @Get('reflex-rules-enhanced')
  @ApiOperation({ summary: 'List enhanced reflex testing rules' })
  @ApiResponse({ status: 200, description: 'Reflex rules list' })
  async getReflexRules(@CurrentTenant() tenantId: string) {
    return this.service.getReflexRules(tenantId);
  }

  @Post('reflex-rules-enhanced')
  @ApiOperation({ summary: 'Create enhanced reflex rule (e.g. TSH > 4.0 → order Free T4)' })
  @ApiResponse({ status: 201, description: 'Reflex rule created' })
  async createReflexRule(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateReflexRuleEnhancedDto,
  ) {
    return this.service.createReflexRule(tenantId, dto);
  }

  @Post('reflex-evaluate')
  @ApiOperation({ summary: 'Evaluate a test result against reflex rules and auto-order if triggered' })
  @ApiResponse({ status: 200, description: 'Triggered reflex tests (may be empty)' })
  async evaluateReflex(
    @CurrentTenant() tenantId: string,
    @Body() dto: EvaluateReflexDto,
  ) {
    return this.service.evaluateReflexTrigger(tenantId, dto);
  }

  // ─── ABG Interpretation ───────────────────────────────────────────────────

  @Post('abg-interpretation')
  @ApiOperation({
    summary: 'Full ABG interpretation: primary disorder, compensation (Winter\'s formula), anion gap, delta ratio, oxygenation (P/F, A-a gradient)',
  })
  @ApiResponse({ status: 200, description: 'ABG interpretation result' })
  async interpretABG(@Body() dto: ABGInputDto) {
    return this.service.interpretABG(dto);
  }

  // ─── POC Testing ──────────────────────────────────────────────────────────

  @Post('poc-test')
  @ApiOperation({ summary: 'Record a point-of-care test result' })
  @ApiResponse({ status: 201, description: 'POC test recorded' })
  async recordPOCTest(
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordPOCTestDto,
  ) {
    return this.service.recordPOCTest(tenantId, dto);
  }

  @Get('poc-tests/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get POC test history for a patient' })
  @ApiResponse({ status: 200, description: 'POC test history' })
  async getPOCHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getPOCHistory(tenantId, patientId);
  }

  @Get('poc-qc/:deviceId')
  @ApiParam({ name: 'deviceId', description: 'POC device ID' })
  @ApiOperation({ summary: 'Validate QC status for a POC device' })
  @ApiResponse({ status: 200, description: 'QC validation result' })
  async validatePOCQC(
    @CurrentTenant() tenantId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.service.validatePOCQualityControl(tenantId, deviceId);
  }
}
