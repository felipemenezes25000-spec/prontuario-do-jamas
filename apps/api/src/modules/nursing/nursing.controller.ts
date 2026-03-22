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
import { NursingService } from './nursing.service';
import { CreateNursingProcessDto } from './dto/create-nursing-process.dto';
import {
  CreateNursingDiagnosisDto,
  CreateNursingOutcomeDto,
  CreateNursingInterventionDto,
} from './dto/create-nursing-diagnosis.dto';
import { CreateNursingNoteDto } from './dto/create-nursing-note.dto';
import { CreateFluidBalanceDto } from './dto/create-fluid-balance.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Nursing')
@ApiBearerAuth('access-token')
@Controller('nursing')
export class NursingController {
  constructor(private readonly nursingService: NursingService) {}

  // --- Nursing Processes ---

  @Post('processes')
  @ApiOperation({ summary: 'Create a nursing process' })
  @ApiResponse({ status: 201, description: 'Nursing process created' })
  async createProcess(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNursingProcessDto,
  ) {
    return this.nursingService.createProcess(user.sub, dto);
  }

  @Get('processes/:id')
  @ApiParam({ name: 'id', description: 'Nursing process UUID' })
  @ApiOperation({ summary: 'Get nursing process by ID' })
  @ApiResponse({ status: 200, description: 'Nursing process details' })
  async findProcessById(@Param('id', ParseUUIDPipe) id: string) {
    return this.nursingService.findProcessById(id);
  }

  @Get('processes/patient/:patientId/active')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get active nursing processes for a patient' })
  @ApiResponse({ status: 200, description: 'Active nursing processes' })
  async getActiveProcesses(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.nursingService.getActiveProcesses(patientId);
  }

  // --- Diagnoses ---

  @Post('processes/:processId/diagnoses')
  @ApiParam({ name: 'processId', description: 'Nursing process UUID' })
  @ApiOperation({ summary: 'Add nursing diagnosis to a process' })
  @ApiResponse({ status: 201, description: 'Diagnosis added' })
  async addDiagnosis(
    @Param('processId', ParseUUIDPipe) processId: string,
    @Body() dto: CreateNursingDiagnosisDto,
  ) {
    return this.nursingService.addDiagnosis(processId, dto);
  }

  // --- Outcomes ---

  @Post('diagnoses/:diagnosisId/outcomes')
  @ApiParam({ name: 'diagnosisId', description: 'Nursing diagnosis UUID' })
  @ApiOperation({ summary: 'Add outcome to a nursing diagnosis' })
  @ApiResponse({ status: 201, description: 'Outcome added' })
  async addOutcome(
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Body() dto: CreateNursingOutcomeDto,
  ) {
    return this.nursingService.addOutcome(diagnosisId, dto);
  }

  // --- Interventions ---

  @Post('diagnoses/:diagnosisId/interventions')
  @ApiParam({ name: 'diagnosisId', description: 'Nursing diagnosis UUID' })
  @ApiOperation({ summary: 'Add intervention to a nursing diagnosis' })
  @ApiResponse({ status: 201, description: 'Intervention added' })
  async addIntervention(
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Body() dto: CreateNursingInterventionDto,
  ) {
    return this.nursingService.addIntervention(diagnosisId, dto);
  }

  // --- Nursing Notes ---

  @Post('notes')
  @ApiOperation({ summary: 'Create a nursing note' })
  @ApiResponse({ status: 201, description: 'Nursing note created' })
  async createNote(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNursingNoteDto,
  ) {
    return this.nursingService.createNote(user.sub, dto);
  }

  // --- Fluid Balance ---

  @Post('fluid-balance')
  @ApiOperation({ summary: 'Record fluid balance' })
  @ApiResponse({ status: 201, description: 'Fluid balance recorded' })
  async createFluidBalance(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFluidBalanceDto,
  ) {
    return this.nursingService.createFluidBalance(user.sub, dto);
  }

  // --- Queries ---

  @Get('by-encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get all nursing data for an encounter' })
  @ApiResponse({ status: 200, description: 'Nursing data for encounter' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.nursingService.findByEncounter(encounterId);
  }

  @Get('by-patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get all nursing processes for a patient' })
  @ApiResponse({ status: 200, description: 'Nursing processes for patient' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.nursingService.findByPatient(patientId);
  }
}
