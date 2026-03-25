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
import { CardiologyService } from './cardiology.service';
import {
  RecordEcgDto,
  EchocardiogramDto,
  CatheterizationDto,
  HolterDto,
  StressTestDto,
} from './dto/cardiology.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Cardiology — ECG/Cardiologia')
@ApiBearerAuth('access-token')
@Controller('cardiology')
export class CardiologyController {
  constructor(private readonly cardiologyService: CardiologyService) {}

  @Post('ecg')
  @ApiOperation({ summary: 'Record ECG result' })
  @ApiResponse({ status: 201, description: 'ECG recorded' })
  async recordEcg(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordEcgDto,
  ) {
    return this.cardiologyService.recordEcg(tenantId, user.sub, dto);
  }

  @Post('echo')
  @ApiOperation({ summary: 'Record echocardiogram report' })
  @ApiResponse({ status: 201, description: 'Echocardiogram recorded' })
  async recordEcho(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EchocardiogramDto,
  ) {
    return this.cardiologyService.recordEcho(tenantId, user.sub, dto);
  }

  @Post('catheterization')
  @ApiOperation({ summary: 'Record catheterization report' })
  @ApiResponse({ status: 201, description: 'Catheterization recorded' })
  async recordCatheterization(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CatheterizationDto,
  ) {
    return this.cardiologyService.recordCatheterization(tenantId, user.sub, dto);
  }

  @Post('holter')
  @ApiOperation({ summary: 'Record Holter results' })
  @ApiResponse({ status: 201, description: 'Holter results recorded' })
  async recordHolter(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: HolterDto,
  ) {
    return this.cardiologyService.recordHolter(tenantId, user.sub, dto);
  }

  @Post('stress-test')
  @ApiOperation({ summary: 'Record stress test results' })
  @ApiResponse({ status: 201, description: 'Stress test recorded' })
  async recordStressTest(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: StressTestDto,
  ) {
    return this.cardiologyService.recordStressTest(tenantId, user.sub, dto);
  }

  @Post('scores/framingham')
  @ApiOperation({ summary: 'Calculate Framingham Risk Score' })
  async framingham(
    @CurrentTenant() tenantId: string,
    @Body() params: { age: number; gender: string; totalCholesterol: number; hdl: number; systolicBP: number; smoker: boolean; diabetic: boolean; bpTreated: boolean },
  ) {
    return this.cardiologyService.calculateFramingham(tenantId, params);
  }

  @Post('scores/ascvd')
  @ApiOperation({ summary: 'Calculate ASCVD Pooled Cohort Risk' })
  async ascvd(
    @CurrentTenant() tenantId: string,
    @Body() params: { age: number; gender: string; race: string; totalCholesterol: number; hdl: number; systolicBP: number; bpTreated: boolean; diabetic: boolean; smoker: boolean },
  ) {
    return this.cardiologyService.calculateAscvd(tenantId, params);
  }

  @Post('scores/chads-vasc')
  @ApiOperation({ summary: 'Calculate CHA2DS2-VASc Score for AF' })
  async chadsVasc(
    @CurrentTenant() tenantId: string,
    @Body() params: { chf: boolean; hypertension: boolean; age: number; diabetes: boolean; stroke: boolean; vascularDisease: boolean; gender: string },
  ) {
    return this.cardiologyService.calculateChadsVasc(tenantId, params);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Patient cardiology history' })
  @ApiResponse({ status: 200, description: 'Cardiology history' })
  async getPatientHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.cardiologyService.getPatientHistory(tenantId, patientId);
  }
}
