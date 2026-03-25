import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { CmeService } from './cme.service';
import {
  RegisterInstrumentDto,
  RecordSterilizationDto,
  PrepareSurgicalKitDto,
  InstrumentSetResponseDto,
  SterilizationCycleResponseDto,
  SurgicalKitResponseDto,
  InstrumentTraceabilityResponseDto,
  BiologicalIndicatorResponseDto,
  CmeDashboardResponseDto,
} from './dto/cme.dto';

@ApiTags('CME — Central de Material e Esterilização')
@ApiBearerAuth('access-token')
@Controller('cme')
export class CmeController {
  constructor(private readonly cmeService: CmeService) {}

  @Post('instruments')
  @ApiOperation({ summary: 'Register instrument set' })
  @ApiResponse({ status: 201, description: 'Instrument set registered', type: InstrumentSetResponseDto })
  async registerInstrument(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterInstrumentDto,
  ): Promise<InstrumentSetResponseDto> {
    return this.cmeService.registerInstrument(
      tenantId,
      user.sub,
      dto.name,
      dto.instruments,
      dto.category,
      dto.serialNumber,
      dto.manufacturer,
    );
  }

  @Post('sterilization')
  @ApiOperation({ summary: 'Record sterilization cycle' })
  @ApiResponse({ status: 201, description: 'Sterilization recorded', type: SterilizationCycleResponseDto })
  async recordSterilization(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: RecordSterilizationDto,
  ): Promise<SterilizationCycleResponseDto> {
    return this.cmeService.recordSterilization(
      tenantId,
      user.sub,
      dto.instrumentSetId,
      dto.method,
      dto.cycleNumber,
      dto.temperature,
      dto.durationMinutes,
      dto.biologicalIndicatorLot,
      dto.chemicalIndicatorResult,
      dto.result,
    );
  }

  @Post('surgical-kits')
  @ApiOperation({ summary: 'Prepare surgical kit' })
  @ApiResponse({ status: 201, description: 'Kit prepared', type: SurgicalKitResponseDto })
  async prepareSurgicalKit(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: PrepareSurgicalKitDto,
  ): Promise<SurgicalKitResponseDto> {
    return this.cmeService.prepareSurgicalKit(
      tenantId,
      user.sub,
      dto.surgicalProcedureId,
      dto.instrumentSetIds,
      dto.additionalItems,
      dto.scheduledFor,
    );
  }

  @Get('tracking/:instrumentId')
  @ApiOperation({ summary: 'Get instrument traceability history' })
  @ApiParam({ name: 'instrumentId', description: 'Instrument set UUID' })
  @ApiResponse({ status: 200, description: 'Traceability data', type: InstrumentTraceabilityResponseDto })
  async getTracking(
    @CurrentTenant() tenantId: string,
    @Param('instrumentId', ParseUUIDPipe) instrumentId: string,
  ): Promise<InstrumentTraceabilityResponseDto> {
    return this.cmeService.getInstrumentTracking(tenantId, instrumentId);
  }

  @Get('biological-indicators')
  @ApiOperation({ summary: 'Get biological indicator results' })
  @ApiResponse({ status: 200, description: 'Biological indicators', type: [BiologicalIndicatorResponseDto] })
  async getBiologicalIndicators(
    @CurrentTenant() tenantId: string,
  ): Promise<BiologicalIndicatorResponseDto[]> {
    return this.cmeService.getBiologicalIndicators(tenantId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'CME dashboard with key metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard data', type: CmeDashboardResponseDto })
  async getDashboard(
    @CurrentTenant() tenantId: string,
  ): Promise<CmeDashboardResponseDto> {
    return this.cmeService.getDashboard(tenantId);
  }
}
