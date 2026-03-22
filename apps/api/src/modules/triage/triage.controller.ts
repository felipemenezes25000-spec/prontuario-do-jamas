import {
  Controller,
  Get,
  Post,
  Patch,
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
import { TriageService } from './triage.service';
import { CreateTriageDto, UpdateTriageDto } from './dto/create-triage.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Triage')
@ApiBearerAuth('access-token')
@Controller('triage')
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a triage assessment' })
  @ApiResponse({ status: 201, description: 'Triage assessment created' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTriageDto,
  ) {
    return this.triageService.create(user.sub, dto);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get waiting queue sorted by triage level' })
  @ApiResponse({ status: 200, description: 'Waiting queue' })
  async getWaitingQueue(@CurrentTenant() tenantId: string) {
    return this.triageService.getWaitingQueue(tenantId);
  }

  @Get('encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get triage assessment by encounter' })
  @ApiResponse({ status: 200, description: 'Triage assessment details' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.triageService.findByEncounter(encounterId);
  }

  @Patch('encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Update triage assessment' })
  @ApiResponse({ status: 200, description: 'Triage assessment updated' })
  async update(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: UpdateTriageDto,
  ) {
    return this.triageService.update(encounterId, dto);
  }
}
