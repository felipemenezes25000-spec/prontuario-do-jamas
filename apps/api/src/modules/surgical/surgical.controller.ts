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
  ApiBody,
} from '@nestjs/swagger';
import { SurgicalService } from './surgical.service';
import { CreateSurgicalProcedureDto } from './dto/create-surgical-procedure.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { SurgicalStatus } from '@prisma/client';

@ApiTags('Surgical')
@ApiBearerAuth('access-token')
@Controller('surgical')
export class SurgicalController {
  constructor(private readonly surgicalService: SurgicalService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a surgical procedure' })
  @ApiResponse({ status: 201, description: 'Surgical procedure scheduled' })
  async schedule(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSurgicalProcedureDto,
  ) {
    return this.surgicalService.schedule(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List surgical procedures with filters' })
  @ApiResponse({ status: 200, description: 'Paginated surgical procedures' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('surgeonId') surgeonId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.surgicalService.findAll(tenantId, {
      patientId,
      surgeonId,
      status,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('by-date')
  @ApiOperation({ summary: 'Get surgical procedures by date' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in ISO format (YYYY-MM-DD)', example: '2026-03-22' })
  @ApiResponse({ status: 200, description: 'List of surgical procedures' })
  async findByDate(
    @CurrentTenant() tenantId: string,
    @Query('date') date: string,
  ) {
    return this.surgicalService.findByDate(tenantId, date);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Get surgical procedure by ID' })
  @ApiResponse({ status: 200, description: 'Surgical procedure details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.surgicalService.findById(id);
  }

  @Patch(':id/status')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Update surgical procedure status' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', description: 'New surgical status' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: SurgicalStatus,
  ) {
    return this.surgicalService.updateStatus(id, status);
  }

  @Patch(':id/checklist/:phase')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiParam({ name: 'phase', description: 'Checklist phase', enum: ['before', 'during', 'after'] })
  @ApiOperation({ summary: 'Update safety checklist for a phase' })
  @ApiResponse({ status: 200, description: 'Checklist updated' })
  async updateChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phase') phase: 'before' | 'during' | 'after',
    @Body() checklist: Record<string, unknown>,
  ) {
    return this.surgicalService.updateChecklist(id, phase, checklist);
  }

  @Post(':id/complete')
  @ApiParam({ name: 'id', description: 'Surgical procedure UUID' })
  @ApiOperation({ summary: 'Complete a surgical procedure' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        surgicalDescription: { type: 'string', description: 'Surgical description' },
        complications: { type: 'string', description: 'Complications encountered' },
        bloodLoss: { type: 'number', description: 'Estimated blood loss in mL' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Procedure completed' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    data: {
      surgicalDescription?: string;
      complications?: string;
      bloodLoss?: number;
    },
  ) {
    return this.surgicalService.complete(id, data);
  }
}
