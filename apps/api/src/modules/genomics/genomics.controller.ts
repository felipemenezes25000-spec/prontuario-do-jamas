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
import { GenomicsService } from './genomics.service';
import { RegisterVariantsDto, PrecisionMedicineDto } from './dto/genomics.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Genomics — Farmacogenomica')
@ApiBearerAuth('access-token')
@Controller('genomics')
export class GenomicsController {
  constructor(private readonly genomicsService: GenomicsService) {}

  @Post('variants')
  @ApiOperation({ summary: 'Register genetic variants for a patient' })
  @ApiResponse({ status: 201, description: 'Variants registered' })
  async registerVariants(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterVariantsDto,
  ) {
    return this.genomicsService.registerVariants(tenantId, user.sub, dto);
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient genomic profile' })
  @ApiResponse({ status: 200, description: 'Genomic profile' })
  async getPatientProfile(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.genomicsService.getPatientProfile(tenantId, patientId);
  }

  @Get('drug-gene/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Gene-drug interaction alerts for patient' })
  @ApiResponse({ status: 200, description: 'Drug-gene interactions' })
  async getDrugGeneInteractions(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.genomicsService.getDrugGeneInteractions(tenantId, patientId);
  }

  @Post('precision-medicine')
  @ApiOperation({ summary: 'Precision medicine recommendations based on genomic profile' })
  @ApiResponse({ status: 200, description: 'Precision medicine recommendations' })
  async precisionMedicine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PrecisionMedicineDto,
  ) {
    return this.genomicsService.getPrecisionMedicineRecommendations(tenantId, user.sub, dto);
  }
}
