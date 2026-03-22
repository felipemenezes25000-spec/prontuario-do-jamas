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
  ApiParam,
} from '@nestjs/swagger';
import { DrugDatabaseService } from './drug-database.service';
import {
  SearchDrugsDto,
  CheckInteractionsDto,
  CheckAllergyDto,
  CheckDoseDto,
  ComprehensiveCheckDto,
} from './dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Drugs')
@ApiBearerAuth('access-token')
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugDatabaseService: DrugDatabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Search drugs with filters' })
  @ApiResponse({ status: 200, description: 'Paginated drug list' })
  async search(
    @CurrentTenant() _tenantId: string,
    @Query() dto: SearchDrugsDto,
  ) {
    const filters = {
      isControlled: dto.isControlled,
      isAntimicrobial: dto.isAntimicrobial,
      isHighAlert: dto.isHighAlert,
      therapeuticClass: dto.class,
    };

    return this.drugDatabaseService.searchDrugs(
      dto.q,
      filters,
      dto.page ?? 1,
      dto.limit ?? 20,
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Drug UUID' })
  @ApiOperation({ summary: 'Get drug details with interactions' })
  @ApiResponse({ status: 200, description: 'Drug details' })
  @ApiResponse({ status: 404, description: 'Drug not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.drugDatabaseService.findDrugById(id);
  }

  @Post('check-interactions')
  @ApiOperation({ summary: 'Check drug-drug interactions' })
  @ApiResponse({ status: 200, description: 'Interaction check result' })
  async checkInteractions(@Body() dto: CheckInteractionsDto) {
    return this.drugDatabaseService.checkInteractions(dto.drugIds);
  }

  @Post('check-allergy')
  @ApiOperation({ summary: 'Check drug-allergy conflicts for a patient' })
  @ApiResponse({ status: 200, description: 'Allergy conflict result' })
  async checkAllergy(@Body() dto: CheckAllergyDto) {
    return this.drugDatabaseService.checkAllergyConflict(dto.drugId, dto.patientId);
  }

  @Post('check-dose')
  @ApiOperation({ summary: 'Check dose limits and safety' })
  @ApiResponse({ status: 200, description: 'Dose check result' })
  async checkDose(@Body() dto: CheckDoseDto) {
    return this.drugDatabaseService.checkDoseLimits(
      dto.drugId,
      dto.dose,
      dto.unit,
      dto.frequency,
      dto.patientWeight,
      dto.patientAge,
    );
  }

  @Post('comprehensive-check')
  @ApiOperation({ summary: 'Run all safety checks for a set of drugs and patient' })
  @ApiResponse({ status: 200, description: 'Comprehensive check result' })
  async comprehensiveCheck(@Body() dto: ComprehensiveCheckDto) {
    return this.drugDatabaseService.getComprehensiveCheck(dto.drugIds, dto.patientId);
  }
}
