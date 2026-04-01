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
import { TransfusionHistoryService } from './transfusion-history.service';
import { CreateTransfusionHistoryDto, UpdateTransfusionHistoryDto } from './dto/transfusion-history.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Transfusion History')
@ApiBearerAuth('access-token')
@Controller('patients/:patientId/transfusion-history')
export class TransfusionHistoryController {
  constructor(private readonly service: TransfusionHistoryService) {}

  @Post()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Record a transfusion event (product type, reactions, irregular antibodies)' })
  @ApiResponse({ status: 201, description: 'Transfusion record created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateTransfusionHistoryDto,
  ) {
    return this.service.create(tenantId, patientId, dto, user.sub);
  }

  @Get()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'List all transfusion history records for a patient' })
  @ApiResponse({ status: 200, description: 'Transfusion history list' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.findAll(tenantId, patientId);
  }

  @Get('irregular-antibodies')
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Get aggregated list of all known irregular antibodies for a patient' })
  @ApiResponse({ status: 200, description: 'Antibody list' })
  async getIrregularAntibodies(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getIrregularAntibodies(tenantId, patientId);
  }

  @Get(':transfusionId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'transfusionId' })
  @ApiOperation({ summary: 'Get a single transfusion record' })
  @ApiResponse({ status: 200, description: 'Transfusion detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('transfusionId', ParseUUIDPipe) transfusionId: string,
  ) {
    return this.service.findOne(tenantId, patientId, transfusionId);
  }

  @Patch(':transfusionId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'transfusionId' })
  @ApiOperation({ summary: 'Update a transfusion record' })
  @ApiResponse({ status: 200, description: 'Updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('transfusionId', ParseUUIDPipe) transfusionId: string,
    @Body() dto: UpdateTransfusionHistoryDto,
  ) {
    return this.service.update(tenantId, patientId, transfusionId, dto);
  }

  @Delete(':transfusionId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'transfusionId' })
  @ApiOperation({ summary: 'Delete a transfusion record' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('transfusionId', ParseUUIDPipe) transfusionId: string,
  ) {
    return this.service.remove(tenantId, patientId, transfusionId);
  }
}
