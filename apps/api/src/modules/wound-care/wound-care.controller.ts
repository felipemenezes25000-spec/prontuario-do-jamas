import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WoundCareService } from './wound-care.service';
import {
  RegisterWoundDto,
  UpdateWoundEvolutionDto,
  RegisterPhotoDto,
  CreateDressingPlanDto,
} from './dto/create-wound-care.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Wound Care')
@ApiBearerAuth('access-token')
@Controller('wound-care')
export class WoundCareController {
  constructor(private readonly woundCareService: WoundCareService) {}

  @Post('wound')
  @ApiOperation({ summary: 'Register a wound (NPUAP, Wagner classification)' })
  @ApiResponse({ status: 201, description: 'Wound registered' })
  async registerWound(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterWoundDto,
  ) {
    return this.woundCareService.registerWound(tenantId, user.sub, dto);
  }

  @Patch('wound/:id/evolution')
  @ApiParam({ name: 'id', description: 'Wound UUID' })
  @ApiOperation({ summary: 'Update wound evolution with measurements' })
  @ApiResponse({ status: 200, description: 'Evolution updated' })
  async updateEvolution(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWoundEvolutionDto,
  ) {
    return this.woundCareService.updateEvolution(tenantId, user.sub, id, dto);
  }

  @Post('wound/:id/photo')
  @ApiParam({ name: 'id', description: 'Wound UUID' })
  @ApiOperation({ summary: 'Register photo documentation for a wound' })
  @ApiResponse({ status: 201, description: 'Photo registered' })
  async registerPhoto(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterPhotoDto,
  ) {
    return this.woundCareService.registerPhoto(tenantId, user.sub, id, dto);
  }

  @Post('wound/:id/dressing-plan')
  @ApiParam({ name: 'id', description: 'Wound UUID' })
  @ApiOperation({ summary: 'Create a dressing plan for a wound' })
  @ApiResponse({ status: 201, description: 'Dressing plan created' })
  async createDressingPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDressingPlanDto,
  ) {
    return this.woundCareService.createDressingPlan(tenantId, user.sub, id, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get wound history for a patient' })
  @ApiResponse({ status: 200, description: 'Wound history' })
  async getPatientHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.woundCareService.getPatientHistory(tenantId, patientId);
  }
}
