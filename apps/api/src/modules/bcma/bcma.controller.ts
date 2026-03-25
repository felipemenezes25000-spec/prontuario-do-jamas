import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BcmaService } from './bcma.service';
import { VerifyMedicationDto, AdministerMedicationDto } from './dto/create-bcma.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('BCMA')
@ApiBearerAuth('access-token')
@Controller('bcma')
export class BcmaController {
  constructor(private readonly bcmaService: BcmaService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify patient-medication-dose-route-time (5 rights)' })
  @ApiResponse({ status: 201, description: 'Verification result' })
  async verifyMedication(
    @CurrentTenant() tenantId: string,
    @Body() dto: VerifyMedicationDto,
  ) {
    return this.bcmaService.verifyMedication(tenantId, dto);
  }

  @Post('administer')
  @ApiOperation({ summary: 'Record medication administration via BCMA' })
  @ApiResponse({ status: 201, description: 'Administration recorded' })
  async administerMedication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdministerMedicationDto,
  ) {
    return this.bcmaService.administerMedication(tenantId, user.sub, dto);
  }

  @Get('pending/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get pending medications for patient' })
  @ApiResponse({ status: 200, description: 'Pending medications' })
  async getPendingMedications(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.bcmaService.getPendingMedications(tenantId, patientId);
  }

  @Get('history/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get medication administration history' })
  @ApiResponse({ status: 200, description: 'Administration history' })
  async getAdministrationHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.bcmaService.getAdministrationHistory(tenantId, patientId);
  }
}
