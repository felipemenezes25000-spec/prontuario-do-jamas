import {
  Controller,
  Get,
  Post,
  Delete,
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
import { CdsHooksService } from './cds-hooks.service';
import { RegisterCdsServiceDto, EvaluateCdsHookDto } from './dto/cds-hooks.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Interop — CDS Hooks')
@ApiBearerAuth('access-token')
@Controller('interop/cds-hooks')
export class CdsHooksController {
  constructor(private readonly cdsHooksService: CdsHooksService) {}

  @Get('services')
  @ApiOperation({ summary: 'CDS Hooks discovery endpoint' })
  @ApiResponse({ status: 200, description: 'Available CDS services' })
  async getServices(@CurrentTenant() tenantId: string) {
    return this.cdsHooksService.getDiscovery(tenantId);
  }

  @Post('services')
  @ApiOperation({ summary: 'Register a CDS service' })
  @ApiResponse({ status: 201, description: 'CDS service registered' })
  async registerService(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterCdsServiceDto,
  ) {
    return this.cdsHooksService.registerService(tenantId, dto);
  }

  @Post('evaluate/:hookId')
  @ApiParam({ name: 'hookId', description: 'Hook type (e.g., patient-view, order-select)' })
  @ApiOperation({ summary: 'Evaluate CDS hook and get decision support cards' })
  @ApiResponse({ status: 200, description: 'CDS response with cards' })
  async evaluateHook(
    @CurrentTenant() tenantId: string,
    @Param('hookId') hookId: string,
    @Body() dto: EvaluateCdsHookDto,
  ) {
    return this.cdsHooksService.evaluateHook(tenantId, hookId, dto);
  }

  @Delete('services/:id')
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiOperation({ summary: 'Remove a CDS service' })
  @ApiResponse({ status: 200, description: 'Service removed' })
  async removeService(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cdsHooksService.removeService(tenantId, id);
  }
}
