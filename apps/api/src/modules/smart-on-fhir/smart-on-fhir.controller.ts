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
import { SmartOnFhirService } from './smart-on-fhir.service';
import { RegisterSmartAppDto, SmartLaunchDto } from './dto/smart-on-fhir.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Interop — SMART on FHIR')
@ApiBearerAuth('access-token')
@Controller('interop/smart')
export class SmartOnFhirController {
  constructor(private readonly smartService: SmartOnFhirService) {}

  @Post('apps')
  @ApiOperation({ summary: 'Register a SMART on FHIR app' })
  @ApiResponse({ status: 201, description: 'App registered' })
  async registerApp(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterSmartAppDto,
  ) {
    return this.smartService.registerApp(tenantId, user.sub, dto);
  }

  @Get('apps')
  @ApiOperation({ summary: 'List registered SMART apps' })
  @ApiResponse({ status: 200, description: 'List of SMART apps' })
  async listApps(@CurrentTenant() tenantId: string) {
    return this.smartService.listApps(tenantId);
  }

  @Post('launch')
  @ApiOperation({ summary: 'SMART app EHR launch flow' })
  @ApiResponse({ status: 200, description: 'Launch context' })
  async launchApp(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SmartLaunchDto,
  ) {
    return this.smartService.launchApp(tenantId, user.sub, dto);
  }

  @Delete('apps/:id')
  @ApiParam({ name: 'id', description: 'App UUID' })
  @ApiOperation({ summary: 'Unregister a SMART app' })
  @ApiResponse({ status: 200, description: 'App unregistered' })
  async unregisterApp(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.smartService.unregisterApp(tenantId, id);
  }

  @Get('apps/:id/context')
  @ApiParam({ name: 'id', description: 'App UUID' })
  @ApiOperation({ summary: 'Get app launch context and SMART configuration' })
  @ApiResponse({ status: 200, description: 'App context' })
  async getAppContext(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.smartService.getAppContext(tenantId, id);
  }
}
