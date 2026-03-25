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
import { NeonatologyService } from './neonatology.service';
import {
  CreateNicuAdmissionDto,
  RecordNeonatalWeightDto,
  RecordPhototherapyDto,
} from './dto/create-neonatology.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Neonatology')
@ApiBearerAuth('access-token')
@Controller('neonatology')
export class NeonatologyController {
  constructor(private readonly neonatologyService: NeonatologyService) {}

  @Post('admission')
  @ApiOperation({ summary: 'NICU admission with Apgar/Capurro' })
  @ApiResponse({ status: 201, description: 'Admission created' })
  async createAdmission(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateNicuAdmissionDto,
  ) {
    return this.neonatologyService.createAdmission(tenantId, dto);
  }

  @Post(':id/weight')
  @ApiParam({ name: 'id', description: 'Neonatology record UUID' })
  @ApiOperation({ summary: 'Record daily weight' })
  @ApiResponse({ status: 201, description: 'Weight recorded' })
  async recordWeight(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordNeonatalWeightDto,
  ) {
    return this.neonatologyService.recordWeight(tenantId, id, dto);
  }

  @Post(':id/phototherapy')
  @ApiParam({ name: 'id', description: 'Neonatology record UUID' })
  @ApiOperation({ summary: 'Record phototherapy session' })
  @ApiResponse({ status: 201, description: 'Phototherapy recorded' })
  async recordPhototherapy(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPhototherapyDto,
  ) {
    return this.neonatologyService.recordPhototherapy(tenantId, id, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get neonatal history' })
  @ApiResponse({ status: 200, description: 'Neonatal history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.neonatologyService.findByPatient(tenantId, patientId);
  }
}
