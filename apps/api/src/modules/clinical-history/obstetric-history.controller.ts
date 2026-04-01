import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ObstetricHistoryService } from './obstetric-history.service';
import { CreateObstetricHistoryDto, UpdateObstetricHistoryDto } from './dto/obstetric-history.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Obstetric History')
@ApiBearerAuth('access-token')
@Controller('patients/:patientId/obstetric-history')
export class ObstetricHistoryController {
  constructor(private readonly service: ObstetricHistoryService) {}

  @Post()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Create obstetric history (GPAC, deliveries, complications)' })
  @ApiResponse({ status: 201, description: 'Obstetric history created' })
  @ApiResponse({ status: 409, description: 'Already exists — use PATCH' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateObstetricHistoryDto,
  ) {
    return this.service.create(tenantId, patientId, dto, user.sub);
  }

  @Get()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Get obstetric history (GPAC summary, previous deliveries, complications)' })
  @ApiResponse({ status: 200, description: 'Obstetric history' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.findOne(tenantId, patientId);
  }

  @Patch()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Update obstetric history' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdateObstetricHistoryDto,
  ) {
    return this.service.update(tenantId, patientId, dto);
  }

  @Delete()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Delete obstetric history record' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.remove(tenantId, patientId);
  }
}
