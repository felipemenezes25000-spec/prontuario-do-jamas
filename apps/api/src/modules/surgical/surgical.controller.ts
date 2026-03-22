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

  @Get('by-date')
  @ApiOperation({ summary: 'Get surgical procedures by date' })
  @ApiResponse({ status: 200, description: 'List of surgical procedures' })
  async findByDate(
    @CurrentTenant() tenantId: string,
    @Query('date') date: string,
  ) {
    return this.surgicalService.findByDate(tenantId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get surgical procedure by ID' })
  @ApiResponse({ status: 200, description: 'Surgical procedure details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.surgicalService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update surgical procedure status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: SurgicalStatus,
  ) {
    return this.surgicalService.updateStatus(id, status);
  }

  @Patch(':id/checklist/:phase')
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
  @ApiOperation({ summary: 'Complete a surgical procedure' })
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
