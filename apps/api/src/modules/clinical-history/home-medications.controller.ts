import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { HomeMedicationsService } from './home-medications.service';
import { CreateHomeMedicationDto, UpdateHomeMedicationDto, HomeMedStatus } from './dto/home-medications.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Home Medications')
@ApiBearerAuth('access-token')
@Controller('patients/:patientId/home-medications')
export class HomeMedicationsController {
  constructor(private readonly service: HomeMedicationsService) {}

  @Post()
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Add a home medication (external prescription, base for reconciliation)' })
  @ApiResponse({ status: 201, description: 'Medication created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateHomeMedicationDto,
  ) {
    return this.service.create(tenantId, patientId, dto, user.sub);
  }

  @Get()
  @ApiParam({ name: 'patientId' })
  @ApiQuery({ name: 'status', enum: HomeMedStatus, required: false })
  @ApiOperation({ summary: 'List home medications — filter by status' })
  @ApiResponse({ status: 200, description: 'Home medication list' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('status') status?: HomeMedStatus,
  ) {
    return this.service.findAll(tenantId, patientId, status);
  }

  @Get(':medId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'medId' })
  @ApiOperation({ summary: 'Get a single home medication entry' })
  @ApiResponse({ status: 200, description: 'Medication detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('medId', ParseUUIDPipe) medId: string,
  ) {
    return this.service.findOne(tenantId, patientId, medId);
  }

  @Patch(':medId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'medId' })
  @ApiOperation({ summary: 'Update a home medication entry' })
  @ApiResponse({ status: 200, description: 'Updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('medId', ParseUUIDPipe) medId: string,
    @Body() dto: UpdateHomeMedicationDto,
  ) {
    return this.service.update(tenantId, patientId, medId, dto);
  }

  @Delete(':medId')
  @ApiParam({ name: 'patientId' })
  @ApiParam({ name: 'medId' })
  @ApiOperation({ summary: 'Delete a home medication entry' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('medId', ParseUUIDPipe) medId: string,
  ) {
    return this.service.remove(tenantId, patientId, medId);
  }

  @Post('reconcile')
  @ApiParam({ name: 'patientId' })
  @ApiOperation({ summary: 'Reconcile all pending home medications (mark reviewed)' })
  @ApiResponse({ status: 200, description: 'Reconciliation complete' })
  async reconcile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.reconcile(tenantId, patientId, user.sub);
  }
}
