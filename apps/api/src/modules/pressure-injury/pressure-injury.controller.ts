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
import { PressureInjuryService } from './pressure-injury.service';
import {
  CreateSkinAssessmentDto,
  RegisterWoundDto,
  UpdateWoundEvolutionDto,
  CreateRepositioningScheduleDto,
} from './dto/create-pressure-injury.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Pressure Injury')
@ApiBearerAuth('access-token')
@Controller('pressure-injury')
export class PressureInjuryController {
  constructor(private readonly pressureInjuryService: PressureInjuryService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Create skin assessment with Braden Scale' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createSkinAssessment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSkinAssessmentDto,
  ) {
    return this.pressureInjuryService.createSkinAssessment(tenantId, user.sub, dto);
  }

  @Post('wound')
  @ApiOperation({ summary: 'Register a pressure injury wound with classification' })
  @ApiResponse({ status: 201, description: 'Wound registered' })
  async registerWound(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterWoundDto,
  ) {
    return this.pressureInjuryService.registerWound(tenantId, user.sub, dto);
  }

  @Patch('wound/:id')
  @ApiParam({ name: 'id', description: 'Wound UUID' })
  @ApiOperation({ summary: 'Update wound evolution' })
  @ApiResponse({ status: 200, description: 'Wound evolution updated' })
  async updateWoundEvolution(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWoundEvolutionDto,
  ) {
    return this.pressureInjuryService.updateWoundEvolution(tenantId, user.sub, id, dto);
  }

  @Post('repositioning-schedule')
  @ApiOperation({ summary: 'Create repositioning schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createRepositioningSchedule(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRepositioningScheduleDto,
  ) {
    return this.pressureInjuryService.createRepositioningSchedule(tenantId, user.sub, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get pressure injury history for a patient' })
  @ApiResponse({ status: 200, description: 'LPP history' })
  async getPatientHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.pressureInjuryService.getPatientHistory(tenantId, patientId);
  }
}
