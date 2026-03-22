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
} from '@nestjs/swagger';
import { ChemotherapyService } from './chemotherapy.service';
import { CreateProtocolDto } from './dto/create-protocol.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleStatusDto } from './dto/update-cycle-status.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Chemotherapy')
@ApiBearerAuth('access-token')
@Controller('chemotherapy')
export class ChemotherapyController {
  constructor(private readonly chemotherapyService: ChemotherapyService) {}

  // ---------------------------------------------------------------------------
  // Protocols
  // ---------------------------------------------------------------------------

  @Post('protocols')
  @ApiOperation({ summary: 'Create a chemotherapy protocol' })
  @ApiResponse({ status: 201, description: 'Protocol created' })
  async createProtocol(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProtocolDto,
  ) {
    return this.chemotherapyService.createProtocol(tenantId, dto);
  }

  @Get('protocols')
  @ApiOperation({ summary: 'List chemotherapy protocols (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated protocols' })
  async findProtocols(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.chemotherapyService.findProtocols(tenantId, pagination);
  }

  @Get('protocols/:id')
  @ApiParam({ name: 'id', description: 'Protocol UUID' })
  @ApiOperation({ summary: 'Get chemotherapy protocol by ID' })
  @ApiResponse({ status: 200, description: 'Protocol details' })
  @ApiResponse({ status: 404, description: 'Protocol not found' })
  async findProtocolById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chemotherapyService.findProtocolById(tenantId, id);
  }

  // ---------------------------------------------------------------------------
  // Cycles
  // ---------------------------------------------------------------------------

  @Post('cycles')
  @ApiOperation({ summary: 'Create a chemotherapy cycle' })
  @ApiResponse({ status: 201, description: 'Cycle created with BSA calculation' })
  async createCycle(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCycleDto,
  ) {
    return this.chemotherapyService.createCycle(tenantId, dto);
  }

  @Get('cycles/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get chemotherapy cycles by patient' })
  @ApiResponse({ status: 200, description: 'Patient chemotherapy cycles' })
  async findCyclesByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.chemotherapyService.findCyclesByPatient(tenantId, patientId);
  }

  @Patch('cycles/:id/status')
  @ApiParam({ name: 'id', description: 'Cycle UUID' })
  @ApiOperation({ summary: 'Update chemotherapy cycle status' })
  @ApiResponse({ status: 200, description: 'Cycle status updated' })
  @ApiResponse({ status: 404, description: 'Cycle not found' })
  async updateCycleStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCycleStatusDto,
  ) {
    return this.chemotherapyService.updateCycleStatus(tenantId, id, dto);
  }
}
