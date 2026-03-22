import {
  Controller,
  Get,
  Post,
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
import { VitalSignsService } from './vital-signs.service';
import { CreateVitalSignsDto } from './dto/create-vital-signs.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Vital Signs')
@ApiBearerAuth('access-token')
@Controller('vital-signs')
export class VitalSignsController {
  constructor(private readonly vitalSignsService: VitalSignsService) {}

  @Post()
  @ApiOperation({ summary: 'Record vital signs' })
  @ApiResponse({ status: 201, description: 'Vital signs recorded' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVitalSignsDto,
  ) {
    return this.vitalSignsService.create(user.sub, dto);
  }

  @Get('by-encounter/:encounterId')
  @ApiOperation({ summary: 'Get vital signs by encounter' })
  @ApiResponse({ status: 200, description: 'List of vital signs' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.vitalSignsService.findByEncounter(encounterId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get vital signs by patient (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated vital signs' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.vitalSignsService.findByPatient(patientId, pagination);
  }

  @Get('patient/:patientId/latest')
  @ApiOperation({ summary: 'Get latest vital signs for a patient' })
  @ApiResponse({ status: 200, description: 'Latest vital signs' })
  async getLatest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.vitalSignsService.getLatest(patientId);
  }

  @Get('patient/:patientId/trends')
  @ApiOperation({ summary: 'Get vital signs trends for charting' })
  @ApiResponse({ status: 200, description: 'Vital signs trends' })
  async getTrends(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('count') count?: string,
  ) {
    return this.vitalSignsService.getTrends(
      patientId,
      count ? parseInt(count, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vital signs by ID' })
  @ApiResponse({ status: 200, description: 'Vital signs details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vitalSignsService.findById(id);
  }
}
