import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ParenteralNutritionService } from './parenteral-nutrition.service';
import { CalculateNptDto, CreateNptOrderDto } from './dto/create-parenteral-nutrition.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Parenteral Nutrition')
@ApiBearerAuth('access-token')
@Controller('parenteral-nutrition')
export class ParenteralNutritionController {
  constructor(private readonly nptService: ParenteralNutritionService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate NPT formulation based on patient parameters' })
  @ApiResponse({ status: 201, description: 'NPT formulation calculated' })
  async calculateFormulation(@Body() dto: CalculateNptDto) {
    return this.nptService.calculateFormulation(dto);
  }

  @Post('order')
  @ApiOperation({ summary: 'Create NPT order' })
  @ApiResponse({ status: 201, description: 'NPT order created' })
  async createOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNptOrderDto,
  ) {
    return this.nptService.createOrder(tenantId, user.sub, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get NPT history for a patient' })
  @ApiResponse({ status: 200, description: 'NPT history' })
  async getPatientHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.nptService.getPatientHistory(tenantId, patientId);
  }

  @Get(':id/stability')
  @ApiParam({ name: 'id', description: 'NPT Order UUID' })
  @ApiOperation({ summary: 'Check NPT stability (calcium-phosphate precipitation, etc.)' })
  @ApiResponse({ status: 200, description: 'Stability check result' })
  async checkStability(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.nptService.checkStability(tenantId, id);
  }
}
