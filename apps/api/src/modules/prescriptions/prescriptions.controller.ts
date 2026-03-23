import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { PdfGeneratorService } from '../documents/pdf-generator.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { ValidateSafetyDto } from './dto/validate-safety.dto';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { MedCheckStatus } from '@prisma/client';

@ApiTags('Prescriptions')
@ApiBearerAuth('access-token')
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly prescriptionSafetyService: PrescriptionSafetyService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

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

  @Get()
  @ApiOperation({ summary: 'List prescriptions with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of prescriptions' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.prescriptionsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      patientId,
    });
  }

  @Get('medication-checks')
  @ApiOperation({ summary: 'List medication checks (for nursing dashboard)' })
  @ApiResponse({ status: 200, description: 'Paginated medication checks' })
  async findMedicationChecks(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('wardId') wardId?: string,
    @Query('nurseId') nurseId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.prescriptionsService.findMedicationChecks(tenantId, {
      status,
      wardId,
      nurseId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('by-encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get prescriptions by encounter' })
  @ApiResponse({ status: 200, description: 'List of prescriptions' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.prescriptionsService.findByEncounter(encounterId);
  }

  @Get('by-patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get active prescriptions by patient' })
  @ApiResponse({ status: 200, description: 'List of active prescriptions' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.prescriptionsService.findByPatient(patientId);
  }

  @Get(':id/pdf')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Generate prescription PDF' })
  @ApiResponse({ status: 200, description: 'Prescription PDF file' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async generatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfGeneratorService.generatePrescriptionPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receita_${id}.pdf"`,
    });
    res.send(buffer);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Get prescription by ID with items and checks' })
  @ApiResponse({ status: 200, description: 'Prescription details' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.prescriptionsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
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

  @Post(':id/duplicate')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Duplicate a prescription as a new DRAFT' })
  @ApiResponse({ status: 201, description: 'Prescription duplicated' })
  @ApiResponse({ status: 404, description: 'Original prescription not found' })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prescriptionsService.duplicate(id, tenantId, user.sub);
  }

  @Post(':id/sign')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Sign a prescription' })
  @ApiResponse({ status: 200, description: 'Prescription signed' })
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prescriptionsService.sign(id, user.sub);
  }

  @Post(':id/items')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Add item to prescription' })
  @ApiResponse({ status: 201, description: 'Item added' })
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePrescriptionItemDto,
  ) {
    return this.prescriptionsService.addItem(id, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiParam({ name: 'itemId', description: 'Prescription item UUID' })
  @ApiOperation({ summary: 'Remove item from prescription' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.prescriptionsService.removeItem(id, itemId);
  }

  @Post('items/:itemId/check')
  @ApiParam({ name: 'itemId', description: 'Prescription item UUID' })
  @ApiOperation({ summary: 'Create medication check for an item' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        scheduledAt: { type: 'string', format: 'date-time', description: 'Scheduled administration time' },
        status: { type: 'string', description: 'Medication check status' },
        reason: { type: 'string', description: 'Reason (if not administered)' },
        observations: { type: 'string', description: 'Observations' },
        lotNumber: { type: 'string', description: 'Medication lot number' },
        expirationDate: { type: 'string', description: 'Medication expiration date' },
      },
      required: ['scheduledAt', 'status'],
    },
  })
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

  // ──────────────────────────────────────────────────────────────────────────
  // Block 5 — Prescription Safety Rules
  // ──────────────────────────────────────────────────────────────────────────

  @Post('validate-safety')
  @ApiOperation({ summary: 'Validate prescription against all safety rules (Portaria 344/98, RDC 471/2021, high-alert)' })
  @ApiResponse({ status: 200, description: 'Safety validation result' })
  async validateSafety(
    @Body() dto: ValidateSafetyDto,
  ) {
    return this.prescriptionSafetyService.validateSafety(dto);
  }

  @Post('generate-schedule')
  @ApiOperation({ summary: 'Generate automatic medication schedule (aprazamento) for next 24h' })
  @ApiResponse({ status: 200, description: 'Generated schedule' })
  async generateSchedule(
    @Body() dto: GenerateScheduleDto,
  ) {
    return this.prescriptionSafetyService.generateSchedule(dto);
  }

  @Post(':id/first-check')
  @UseGuards(RolesGuard)
  @Roles('NURSE', 'NURSE_TECH', 'PHARMACIST')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Mark prescription as first-checked (enfermeiro)' })
  @ApiResponse({ status: 200, description: 'First check completed' })
  @ApiResponse({ status: 403, description: 'Only nurses/pharmacists allowed' })
  async firstCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prescriptionSafetyService.firstCheck(id, user.sub, user.role);
  }

  @Post(':id/double-check')
  @UseGuards(RolesGuard)
  @Roles('NURSE', 'NURSE_TECH', 'PHARMACIST')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({ summary: 'Mark prescription as double-checked by second nurse/pharmacist' })
  @ApiResponse({ status: 200, description: 'Double check completed' })
  @ApiResponse({ status: 403, description: 'Only nurses/pharmacists allowed' })
  @ApiResponse({ status: 400, description: 'First check must be done first / Same person cannot double-check' })
  async doubleCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prescriptionSafetyService.doubleCheck(id, user.sub, user.role);
  }
}
