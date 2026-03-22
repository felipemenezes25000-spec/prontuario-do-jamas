import {
  Controller,
  Get,
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
import { AuditService } from './audit.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AuditAction } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(ROLES.SYSTEM_ADMIN, ROLES.TENANT_ADMIN)
  @ApiOperation({ summary: 'List audit logs (admin only, paginated with filters)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user UUID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by audit action' })
  @ApiQuery({ name: 'entity', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (ISO)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (ISO)' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationQueryDto,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('entity') entity?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.findAll(tenantId, pagination, {
      userId,
      action,
      entity,
      dateFrom,
      dateTo,
    });
  }

  @Get('user/:userId')
  @Roles(ROLES.SYSTEM_ADMIN, ROLES.TENANT_ADMIN)
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiOperation({ summary: 'Get audit logs by user' })
  @ApiResponse({ status: 200, description: 'User audit logs' })
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.auditService.findByUser(userId, pagination);
  }

  @Get('patient/:patientId')
  @Roles(ROLES.SYSTEM_ADMIN, ROLES.TENANT_ADMIN)
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get audit logs by patient' })
  @ApiResponse({ status: 200, description: 'Patient audit logs' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.auditService.findByPatient(patientId, pagination);
  }
}
