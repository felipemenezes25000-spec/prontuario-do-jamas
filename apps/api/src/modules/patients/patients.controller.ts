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
import { PatientsService } from './patients.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientQueryDto,
} from './dto/create-patient.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Patients')
@ApiBearerAuth('access-token')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

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
  @ApiOperation({ summary: 'Soft delete patient' })
  @ApiResponse({ status: 200, description: 'Patient soft-deleted' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.softDelete(id, tenantId);
  }

  // --- Allergies sub-routes ---

  @Get(':id/allergies')
  @ApiOperation({ summary: 'Get patient allergies' })
  @ApiResponse({ status: 200, description: 'List of allergies' })
  async getAllergies(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getAllergies(id, tenantId);
  }

  @Post(':id/allergies')
  @ApiOperation({ summary: 'Add allergy to patient' })
  @ApiResponse({ status: 201, description: 'Allergy added' })
  async addAllergy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: { substance: string; reaction?: string; severity?: string; notes?: string },
  ) {
    return this.patientsService.addAllergy(id, tenantId, data as any);
  }

  @Delete(':id/allergies/:allergyId')
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
  @ApiOperation({ summary: 'Get patient conditions' })
  @ApiResponse({ status: 200, description: 'List of conditions' })
  async getConditions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getConditions(id, tenantId);
  }

  @Post(':id/conditions')
  @ApiOperation({ summary: 'Add condition to patient' })
  @ApiResponse({ status: 201, description: 'Condition added' })
  async addCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: { name: string; icdCode?: string; status?: string; diagnosedAt?: string; notes?: string },
  ) {
    return this.patientsService.addCondition(id, tenantId, data as any);
  }

  // --- Family History sub-routes ---

  @Get(':id/family-history')
  @ApiOperation({ summary: 'Get patient family history' })
  @ApiResponse({ status: 200, description: 'List of family history entries' })
  async getFamilyHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getFamilyHistory(id, tenantId);
  }

  @Post(':id/family-history')
  @ApiOperation({ summary: 'Add family history entry' })
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
  @ApiOperation({ summary: 'Get patient surgical history' })
  @ApiResponse({ status: 200, description: 'List of surgical history entries' })
  async getSurgicalHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getSurgicalHistory(id, tenantId);
  }

  @Post(':id/surgical-history')
  @ApiOperation({ summary: 'Add surgical history entry' })
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
  @ApiOperation({ summary: 'Get patient social history' })
  @ApiResponse({ status: 200, description: 'Social history' })
  async getSocialHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getSocialHistory(id, tenantId);
  }

  @Post(':id/social-history')
  @ApiOperation({ summary: 'Create or update social history' })
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
  @ApiOperation({ summary: 'Get patient vaccinations' })
  @ApiResponse({ status: 200, description: 'List of vaccinations' })
  async getVaccinations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.getVaccinations(id, tenantId);
  }

  @Post(':id/vaccinations')
  @ApiOperation({ summary: 'Add vaccination record' })
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
