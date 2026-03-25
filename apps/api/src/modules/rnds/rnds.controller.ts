import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RndsService } from './rnds.service';
import {
  SendEncounterSummaryDto,
  SendVaccinationDto,
  SendLabResultDto,
} from './dto/rnds.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Interop — RNDS (Rede Nacional de Dados em Saude)')
@ApiBearerAuth('access-token')
@Controller('interop/rnds')
export class RndsController {
  constructor(private readonly rndsService: RndsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send encounter summary to RNDS' })
  @ApiResponse({ status: 201, description: 'Encounter summary sent' })
  async sendEncounterSummary(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendEncounterSummaryDto,
  ) {
    return this.rndsService.sendEncounterSummary(tenantId, user.sub, dto);
  }

  @Post('vaccination')
  @ApiOperation({ summary: 'Send vaccination record to RNDS' })
  @ApiResponse({ status: 201, description: 'Vaccination sent' })
  async sendVaccination(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendVaccinationDto,
  ) {
    return this.rndsService.sendVaccination(tenantId, user.sub, dto);
  }

  @Post('lab-result')
  @ApiOperation({ summary: 'Send lab result to RNDS' })
  @ApiResponse({ status: 201, description: 'Lab result sent' })
  async sendLabResult(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendLabResultDto,
  ) {
    return this.rndsService.sendLabResult(tenantId, user.sub, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'RNDS connection status' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  async getStatus(@CurrentTenant() tenantId: string) {
    return this.rndsService.getConnectionStatus(tenantId);
  }

  @Get('submissions')
  @ApiOperation({ summary: 'RNDS submission history' })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Submission history' })
  async getSubmissions(
    @CurrentTenant() tenantId: string,
    @Query('resourceType') resourceType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.rndsService.getSubmissions(tenantId, {
      resourceType,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
