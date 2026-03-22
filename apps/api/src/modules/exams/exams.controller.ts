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
import { ExamsService } from './exams.service';
import { CreateExamRequestDto } from './dto/create-exam-request.dto';
import { AddExamResultDto } from './dto/add-exam-result.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Exams')
@ApiBearerAuth('access-token')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @ApiOperation({ summary: 'Request an exam' })
  @ApiResponse({ status: 201, description: 'Exam requested' })
  async request(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExamRequestDto,
  ) {
    return this.examsService.request(user.sub, dto);
  }

  @Post(':id/results')
  @ApiParam({ name: 'id', description: 'Exam request UUID' })
  @ApiOperation({ summary: 'Add results to an exam' })
  @ApiResponse({ status: 200, description: 'Results added' })
  async addResults(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddExamResultDto,
  ) {
    return this.examsService.addResults(id, user.sub, dto);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending exams' })
  @ApiResponse({ status: 200, description: 'Pending exams' })
  async getPending(@CurrentTenant() tenantId: string) {
    return this.examsService.getPending(tenantId);
  }

  @Get('by-patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get exams by patient' })
  @ApiResponse({ status: 200, description: 'Patient exams' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.examsService.findByPatient(patientId);
  }

  @Get('by-encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get exams by encounter' })
  @ApiResponse({ status: 200, description: 'Encounter exams' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.examsService.findByEncounter(encounterId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Exam request UUID' })
  @ApiOperation({ summary: 'Get exam by ID' })
  @ApiResponse({ status: 200, description: 'Exam details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.findById(id);
  }
}
