import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
import { ProtocolsService } from './protocols.service';
import { CreateProtocolDto } from './dto/create-protocol.dto';
import { UpdateProtocolDto } from './dto/update-protocol.dto';
import { EvaluateTriggersDto } from './dto/evaluate-triggers.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Protocols')
@ApiBearerAuth('access-token')
@Controller('protocols')
export class ProtocolsController {
  constructor(private readonly protocolsService: ProtocolsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a clinical protocol' })
  @ApiResponse({ status: 201, description: 'Protocol created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProtocolDto,
  ) {
    return this.protocolsService.createProtocol(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List clinical protocols' })
  @ApiResponse({ status: 200, description: 'List of protocols' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters: { category?: string; isActive?: boolean } = {};
    if (category) filters.category = category;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    return this.protocolsService.findProtocols(tenantId, filters);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Protocol UUID' })
  @ApiOperation({ summary: 'Get a clinical protocol by ID' })
  @ApiResponse({ status: 200, description: 'Protocol details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.protocolsService.findProtocolById(tenantId, id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Protocol UUID' })
  @ApiOperation({ summary: 'Update a clinical protocol' })
  @ApiResponse({ status: 200, description: 'Protocol updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProtocolDto,
  ) {
    return this.protocolsService.updateProtocol(tenantId, id, dto);
  }

  @Patch(':id/toggle')
  @ApiParam({ name: 'id', description: 'Protocol UUID' })
  @ApiOperation({ summary: 'Toggle protocol active status' })
  @ApiResponse({ status: 200, description: 'Protocol toggled' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async toggle(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.protocolsService.toggleProtocol(tenantId, id);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate protocol triggers against encounter data' })
  @ApiResponse({ status: 200, description: 'Matched protocols' })
  async evaluate(
    @CurrentTenant() tenantId: string,
    @Body() dto: EvaluateTriggersDto,
  ) {
    return this.protocolsService.evaluateTriggers(tenantId, dto.data);
  }
}
