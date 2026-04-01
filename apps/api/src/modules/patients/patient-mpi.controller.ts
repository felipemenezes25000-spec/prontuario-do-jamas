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
import { PatientMpiService } from './patient-mpi.service';
import { MpiSearchDuplicatesDto, MpiMergeDto } from './dto/patient-mpi.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';

@ApiTags('Patient MPI')
@ApiBearerAuth('access-token')
@Controller('patients/mpi')
export class PatientMpiController {
  constructor(private readonly service: PatientMpiService) {}

  @Post('search-duplicates')
  @ApiOperation({ summary: 'Probabilistic MPI duplicate search by name, CPF, birth date, phone or email' })
  @ApiResponse({ status: 200, description: 'Ranked list of candidate duplicate patients' })
  @ApiResponse({ status: 400, description: 'At least one search field required' })
  async searchDuplicates(
    @CurrentTenant() tenantId: string,
    @Body() dto: MpiSearchDuplicatesDto,
  ) {
    return this.service.searchDuplicates(tenantId, dto);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge secondary patient records into master (bulk MPI merge)' })
  @ApiResponse({ status: 200, description: 'Merge completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid merge request' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async merge(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MpiMergeDto,
  ) {
    return this.service.merge(tenantId, dto, user.sub);
  }

  @Get('potential-duplicates')
  @ApiOperation({ summary: 'Get a batch list of suspected duplicate patient pairs in the tenant' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max groups to return (default 50)' })
  @ApiResponse({ status: 200, description: 'List of duplicate groups with match scores' })
  async getPotentialDuplicates(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getPotentialDuplicates(tenantId, limit ? Number(limit) : 50);
  }
}
