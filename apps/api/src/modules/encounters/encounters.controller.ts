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
import { EncountersService } from './encounters.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { QueryEncounterDto } from './dto/query-encounter.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { EncounterStatus } from '@prisma/client';

@ApiTags('Encounters')
@ApiBearerAuth('access-token')
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new encounter' })
  @ApiResponse({ status: 201, description: 'Encounter created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateEncounterDto,
  ) {
    return this.encountersService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List encounters with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of encounters' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryEncounterDto,
  ) {
    return this.encountersService.findAll(tenantId, query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active (in-progress) encounters' })
  @ApiResponse({ status: 200, description: 'List of active encounters' })
  async findActive(@CurrentTenant() tenantId: string) {
    return this.encountersService.findActive(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get encounter by ID with all relations' })
  @ApiResponse({ status: 200, description: 'Encounter details' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.encountersService.findById(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update encounter' })
  @ApiResponse({ status: 200, description: 'Encounter updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateEncounterDto,
  ) {
    return this.encountersService.update(id, tenantId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update encounter status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body('status') status: EncounterStatus,
  ) {
    return this.encountersService.updateStatus(id, tenantId, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete encounter' })
  @ApiResponse({ status: 200, description: 'Encounter deleted' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.encountersService.delete(id, tenantId);
  }
}
