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
import { CodingAutomationService } from './coding-automation.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { SuggestCodingDto, ValidateCodingDto } from './coding-automation.dto';

@ApiTags('Billing — Coding Automation')
@ApiBearerAuth('access-token')
@Controller('billing/coding')
export class CodingAutomationController {
  constructor(private readonly service: CodingAutomationService) {}

  @Post('suggest')
  @ApiOperation({ summary: 'AI suggest CID-10/CBHPM/TUSS codes from clinical notes' })
  @ApiResponse({ status: 201, description: 'Coding suggestions returned' })
  async suggestCoding(
    @CurrentTenant() tenantId: string,
    @Body() dto: SuggestCodingDto,
  ) {
    return this.service.suggestCoding(tenantId, dto);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate coding' })
  @ApiResponse({ status: 201, description: 'Validation results' })
  async validateCoding(
    @CurrentTenant() tenantId: string,
    @Body() dto: ValidateCodingDto,
  ) {
    return this.service.validateCoding(tenantId, dto);
  }

  @Get('encounter/:encounterId')
  @ApiOperation({ summary: 'Get coding for encounter' })
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiResponse({ status: 200, description: 'Encounter coding data' })
  async getCodingForEncounter(
    @CurrentTenant() tenantId: string,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.service.getCodingForEncounter(tenantId, encounterId);
  }
}
