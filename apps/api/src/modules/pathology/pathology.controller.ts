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
import { PathologyService } from './pathology.service';
import {
  CreateBiopsyRequestDto,
  MacroscopyDto,
  MicroscopyDto,
  ImmunohistochemistryDto,
  FinalPathologyReportDto,
} from './dto/pathology.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Pathology — Anatomia Patologica')
@ApiBearerAuth('access-token')
@Controller('pathology')
export class PathologyController {
  constructor(private readonly pathologyService: PathologyService) {}

  @Post('biopsy')
  @ApiOperation({ summary: 'Create biopsy request' })
  @ApiResponse({ status: 201, description: 'Biopsy request created' })
  async createBiopsy(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBiopsyRequestDto,
  ) {
    return this.pathologyService.createBiopsy(tenantId, user.sub, dto);
  }

  @Post(':id/macroscopy')
  @ApiParam({ name: 'id', description: 'Pathology case UUID' })
  @ApiOperation({ summary: 'Add macroscopy description' })
  @ApiResponse({ status: 200, description: 'Macroscopy added' })
  async addMacroscopy(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MacroscopyDto,
  ) {
    return this.pathologyService.addMacroscopy(tenantId, id, dto);
  }

  @Post(':id/microscopy')
  @ApiParam({ name: 'id', description: 'Pathology case UUID' })
  @ApiOperation({ summary: 'Add microscopy description' })
  @ApiResponse({ status: 200, description: 'Microscopy added' })
  async addMicroscopy(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MicroscopyDto,
  ) {
    return this.pathologyService.addMicroscopy(tenantId, id, dto);
  }

  @Post(':id/immunohistochemistry')
  @ApiParam({ name: 'id', description: 'Pathology case UUID' })
  @ApiOperation({ summary: 'Add immunohistochemistry (IHC) results' })
  @ApiResponse({ status: 200, description: 'IHC results added' })
  async addImmunohistochemistry(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImmunohistochemistryDto,
  ) {
    return this.pathologyService.addImmunohistochemistry(tenantId, id, dto);
  }

  @Post(':id/report')
  @ApiParam({ name: 'id', description: 'Pathology case UUID' })
  @ApiOperation({ summary: 'Create final pathology report' })
  @ApiResponse({ status: 200, description: 'Final report created' })
  async createFinalReport(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalPathologyReportDto,
  ) {
    return this.pathologyService.createFinalReport(tenantId, user.sub, id, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient pathology history' })
  @ApiResponse({ status: 200, description: 'Pathology history' })
  async getPatientHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.pathologyService.getPatientHistory(tenantId, patientId);
  }
}
