import {
  Controller,
  Get,
  Post,
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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BulkFhirService } from './bulk-fhir.service';
import { StartBulkExportDto } from './dto/bulk-fhir.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Interop — Bulk FHIR Export')
@ApiBearerAuth('access-token')
@Controller('interop/bulk-fhir')
export class BulkFhirController {
  constructor(private readonly bulkFhirService: BulkFhirService) {}

  @Post('export')
  @ApiOperation({ summary: 'Start a bulk FHIR export job' })
  @ApiResponse({ status: 202, description: 'Export job queued' })
  async startExport(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: StartBulkExportDto,
  ) {
    return this.bulkFhirService.startExport(tenantId, user.sub, dto);
  }

  @Get('export/:jobId')
  @ApiParam({ name: 'jobId', description: 'Export job UUID' })
  @ApiOperation({ summary: 'Check bulk export status' })
  @ApiResponse({ status: 200, description: 'Export status/result' })
  async getExportStatus(
    @CurrentTenant() tenantId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.bulkFhirService.getExportStatus(tenantId, jobId);
  }

  @Get('export/:jobId/download')
  @ApiParam({ name: 'jobId', description: 'Export job UUID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by resource type' })
  @ApiOperation({ summary: 'Download bulk export files' })
  @ApiResponse({ status: 200, description: 'Export files' })
  async downloadExport(
    @CurrentTenant() tenantId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('type') resourceType?: string,
  ) {
    return this.bulkFhirService.downloadExport(tenantId, jobId, resourceType);
  }

  @Delete('export/:jobId')
  @ApiParam({ name: 'jobId', description: 'Export job UUID' })
  @ApiOperation({ summary: 'Cancel a bulk export job' })
  @ApiResponse({ status: 200, description: 'Export cancelled' })
  async cancelExport(
    @CurrentTenant() tenantId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.bulkFhirService.cancelExport(tenantId, jobId);
  }
}
