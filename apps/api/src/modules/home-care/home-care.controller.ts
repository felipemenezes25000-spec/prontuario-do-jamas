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
import { HomeCareService } from './home-care.service';
import { CreateHomeVisitDto, UpdateHomeVisitDto } from './dto/create-home-care.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Home Care')
@ApiBearerAuth('access-token')
@Controller('home-care')
export class HomeCareController {
  constructor(private readonly homeCareService: HomeCareService) {}

  @Post('visit')
  @ApiOperation({ summary: 'Schedule/record home visit' })
  @ApiResponse({ status: 201, description: 'Visit created' })
  async createVisit(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateHomeVisitDto,
  ) {
    return this.homeCareService.createVisit(tenantId, dto);
  }

  @Get('visits')
  @ApiOperation({ summary: 'List visits with routing' })
  @ApiResponse({ status: 200, description: 'List of visits' })
  async listVisits(@CurrentTenant() tenantId: string) {
    return this.homeCareService.listVisits(tenantId);
  }

  @Patch('visit/:id')
  @ApiParam({ name: 'id', description: 'Visit UUID' })
  @ApiOperation({ summary: 'Update home visit' })
  @ApiResponse({ status: 200, description: 'Visit updated' })
  async updateVisit(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHomeVisitDto,
  ) {
    return this.homeCareService.updateVisit(tenantId, id, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get home care history' })
  @ApiResponse({ status: 200, description: 'Home care history' })
  async findByPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.homeCareService.findByPatient(tenantId, patientId);
  }
}
