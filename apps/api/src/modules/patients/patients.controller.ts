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
import { PatientsService } from './patients.service';
import { WristbandService } from './wristband.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientQueryDto,
} from './dto/create-patient.dto';
import { TimelineQueryDto } from './dto/timeline-query.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Patients')
@ApiBearerAuth('access-token')
@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly wristbandService: WristbandService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new patient' })
  @ApiResponse({ status: 201, description: 'Patient created' })
  @ApiResponse({ status: 409, description: 'CPF already registered' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List patients with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of patients' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: PatientQueryDto,
  ) {
    return this.patientsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient by ID with relations' })
  @ApiResponse({ status: 200, description: 'Patient details with history' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.findById(id, tenantId);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Update patient' })
  @ApiResponse({ status: 200, description: 'Patient updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Soft delete patient' })
  @ApiResponse({ status: 200, description: 'Patient soft-deleted' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.softDelete(id, tenantId);
  }

  // --- Wristband PDF ---

  @Get(':id/wristband-pdf')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Generate wristband PDF with QR code' })
  @ApiResponse({ status: 200, description: 'Wristband PDF' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getWristbandPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.wristbandService.generateWristbandPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="pulseira-${id}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }

  // --- Timeline ---

  @Get(':id/timeline')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient timeline with cursor-based pagination' })
  @ApiResponse({ status: 200, description: 'Timeline events' })
  async getTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Query() query: TimelineQueryDto,
  ) {
    return this.patientsService.getTimeline(id, tenantId, query);
  }

  // --- Allergies sub-routes ---

  @Get(':id/allergies')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient allergies' })
  @ApiResponse({ status: 200, description: 'List of allergies' })
  async getAllergies(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getAllergies(id, tenantId);
  }

  @Post(':id/allergies')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Add allergy to patient' })
  @ApiBody({ schema: { type: 'object', properties: { substance: { type: 'string' }, reaction: { type: 'string' }, severity: { type: 'string' }, notes: { type: 'string' } }, required: ['substance'] } })
  @ApiResponse({ status: 201, description: 'Allergy added' })
  async addAllergy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: { substance: string; reaction?: string; severity?: string; notes?: string },
  ) {
    return this.patientsService.addAllergy(id, tenantId, data as any);
  }

  @Delete(':id/allergies/:allergyId')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiParam({ name: 'allergyId', description: 'Allergy UUID' })
  @ApiOperation({ summary: 'Remove allergy' })
  @ApiResponse({ status: 200, description: 'Allergy removed' })
  async removeAllergy(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.removeAllergy(id, allergyId, tenantId);
  }

  // --- Conditions sub-routes ---

  @Get(':id/conditions')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient conditions' })
  @ApiResponse({ status: 200, description: 'List of conditions' })
  async getConditions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getConditions(id, tenantId);
  }

  @Post(':id/conditions')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Add condition to patient' })
  @ApiBody({ schema: { type: 'object', properties: { cidCode: { type: 'string' }, cidDescription: { type: 'string' }, status: { type: 'string' }, diagnosedAt: { type: 'string' }, notes: { type: 'string' } }, required: ['cidCode'] } })
  @ApiResponse({ status: 201, description: 'Condition added' })
  async addCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: { cidCode?: string; cidDescription?: string; status?: string; diagnosedAt?: string; notes?: string },
  ) {
    return this.patientsService.addCondition(id, tenantId, data);
  }

  @Patch(':id/conditions/:conditionId')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiParam({ name: 'conditionId', description: 'Condition UUID' })
  @ApiOperation({ summary: 'Update a patient condition' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string' }, notes: { type: 'string' }, cidCode: { type: 'string' }, cidDescription: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Condition updated' })
  async updateCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('conditionId', ParseUUIDPipe) conditionId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: { status?: string; notes?: string; cidCode?: string; cidDescription?: string },
  ) {
    return this.patientsService.updateCondition(id, conditionId, tenantId, data);
  }

  // --- Family History sub-routes ---

  @Get(':id/family-history')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient family history' })
  @ApiResponse({ status: 200, description: 'List of family history entries' })
  async getFamilyHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getFamilyHistory(id, tenantId);
  }

  @Post(':id/family-history')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Add family history entry' })
  @ApiBody({ schema: { type: 'object', properties: { relationship: { type: 'string' }, condition: { type: 'string' }, notes: { type: 'string' } }, required: ['relationship', 'condition'] } })
  @ApiResponse({ status: 201, description: 'Family history added' })
  async addFamilyHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: { relationship: string; condition: string; notes?: string },
  ) {
    return this.patientsService.addFamilyHistory(id, tenantId, data as any);
  }

  // --- Surgical History sub-routes ---

  @Get(':id/surgical-history')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient surgical history' })
  @ApiResponse({ status: 200, description: 'List of surgical history entries' })
  async getSurgicalHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getSurgicalHistory(id, tenantId);
  }

  @Post(':id/surgical-history')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Add surgical history entry' })
  @ApiBody({ schema: { type: 'object', properties: { procedure: { type: 'string' }, date: { type: 'string' }, notes: { type: 'string' } }, required: ['procedure'] } })
  @ApiResponse({ status: 201, description: 'Surgical history added' })
  async addSurgicalHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: { procedure: string; date?: string; notes?: string },
  ) {
    return this.patientsService.addSurgicalHistory(id, tenantId, data);
  }

  // --- Social History sub-routes ---

  @Get(':id/social-history')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient social history' })
  @ApiResponse({ status: 200, description: 'Social history' })
  async getSocialHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getSocialHistory(id, tenantId);
  }

  @Post(':id/social-history')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Create or update social history' })
  @ApiBody({ schema: { type: 'object', properties: { smoking: { type: 'string' }, alcohol: { type: 'string' }, drugs: { type: 'string' }, exercise: { type: 'string' }, diet: { type: 'string' }, occupation: { type: 'string' }, notes: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Social history saved' })
  async upsertSocialHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: {
      smoking?: string;
      alcohol?: string;
      drugs?: string;
      exercise?: string;
      diet?: string;
      occupation?: string;
      notes?: string;
    },
  ) {
    return this.patientsService.upsertSocialHistory(id, tenantId, data as any);
  }

  // --- Vaccinations sub-routes ---

  @Get(':id/vaccinations')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient vaccinations' })
  @ApiResponse({ status: 200, description: 'List of vaccinations' })
  async getVaccinations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getVaccinations(id, tenantId);
  }

  @Post(':id/vaccinations')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Add vaccination record' })
  @ApiBody({ schema: { type: 'object', properties: { vaccine: { type: 'string' }, dose: { type: 'string' }, lot: { type: 'string' }, administeredAt: { type: 'string' }, notes: { type: 'string' } }, required: ['vaccine'] } })
  @ApiResponse({ status: 201, description: 'Vaccination added' })
  async addVaccination(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: {
      vaccine: string;
      dose?: string;
      lot?: string;
      administeredAt?: string;
      notes?: string;
    },
  ) {
    return this.patientsService.addVaccination(id, tenantId, {
      ...data,
      applicationDate: data.administeredAt,
    });
  }
}
