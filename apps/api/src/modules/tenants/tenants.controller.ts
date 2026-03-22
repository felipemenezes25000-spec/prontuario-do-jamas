import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/create-tenant.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Tenants')
@ApiBearerAuth('access-token')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(ROLES.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Create a new tenant (system admin only)' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles(ROLES.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'List all tenants (system admin only)' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  async findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles(ROLES.SYSTEM_ADMIN, ROLES.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findById(id);
  }

  @Patch(':id')
  @Roles(ROLES.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Update tenant (system admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Delete tenant (system admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant deleted' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.delete(id);
  }
}
