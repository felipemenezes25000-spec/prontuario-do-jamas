import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { MedCheckStatus } from '@prisma/client';

@ApiTags('Prescriptions')
@ApiBearerAuth('access-token')
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new prescription with items' })
  @ApiResponse({ status: 201, description: 'Prescription created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(tenantId, user.sub, dto);
  }

  @Get('by-encounter/:encounterId')
  @ApiOperation({ summary: 'Get prescriptions by encounter' })
  @ApiResponse({ status: 200, description: 'List of prescriptions' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.prescriptionsService.findByEncounter(encounterId);
  }

  @Get('by-patient/:patientId')
  @ApiOperation({ summary: 'Get active prescriptions by patient' })
  @ApiResponse({ status: 200, description: 'List of active prescriptions' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.prescriptionsService.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prescription by ID with items and checks' })
  @ApiResponse({ status: 200, description: 'Prescription details' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.prescriptionsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update prescription' })
  @ApiResponse({ status: 200, description: 'Prescription updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    if (dto.status) {
      return this.prescriptionsService.updateStatus(id, dto.status);
    }
    return this.prescriptionsService.findById(id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign a prescription' })
  @ApiResponse({ status: 200, description: 'Prescription signed' })
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prescriptionsService.sign(id, user.sub);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to prescription' })
  @ApiResponse({ status: 201, description: 'Item added' })
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePrescriptionItemDto,
  ) {
    return this.prescriptionsService.addItem(id, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove item from prescription' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.prescriptionsService.removeItem(id, itemId);
  }

  @Post('items/:itemId/check')
  @ApiOperation({ summary: 'Create medication check for an item' })
  @ApiResponse({ status: 201, description: 'Medication check created' })
  async checkMedication(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    data: {
      scheduledAt: string;
      status: MedCheckStatus;
      reason?: string;
      observations?: string;
      lotNumber?: string;
      expirationDate?: string;
    },
  ) {
    return this.prescriptionsService.checkMedication(itemId, user.sub, data);
  }
}
