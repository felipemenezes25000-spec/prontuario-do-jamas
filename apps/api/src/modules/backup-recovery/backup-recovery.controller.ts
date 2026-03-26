import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BackupRecoveryService } from './backup-recovery.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  BackupConfigDto,
  RestoreRequestDto,
  DrTestDto,
  BackupFilterDto,
} from './backup-recovery.dto';

/**
 * Backup & Disaster Recovery Controller
 *
 * Manages backup operations, restore requests, DR testing, and compliance reporting.
 * All endpoints require ADMIN role.
 */
@ApiTags('Backup & Disaster Recovery')
@ApiBearerAuth('access-token')
@Controller('backup-recovery')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class BackupRecoveryController {
  constructor(private readonly backupRecoveryService: BackupRecoveryService) {}

  // ─── Backup Status ─────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'Get backup status overview' })
  @ApiResponse({ status: 200, description: 'Backup status with RPO/RTO metrics' })
  async getBackupStatus(@CurrentTenant() tenantId: string) {
    return this.backupRecoveryService.getBackupStatus(tenantId);
  }

  // ─── List Backups ──────────────────────────────────────────────────────

  @Get('backups')
  @ApiOperation({ summary: 'List all backups with filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of backups' })
  async listBackups(
    @CurrentTenant() tenantId: string,
    @Query() filters: BackupFilterDto,
  ) {
    return this.backupRecoveryService.listBackups(tenantId, filters);
  }

  // ─── Trigger Backup ────────────────────────────────────────────────────

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger a manual backup' })
  @ApiResponse({ status: 201, description: 'Backup triggered' })
  async triggerBackup(
    @CurrentTenant() tenantId: string,
    @Body() dto: BackupConfigDto,
  ) {
    return this.backupRecoveryService.triggerBackup(tenantId, dto);
  }

  // ─── Configure Backup ──────────────────────────────────────────────────

  @Put('config')
  @ApiOperation({ summary: 'Configure backup schedule' })
  @ApiResponse({ status: 200, description: 'Backup configuration updated' })
  async configureBackup(
    @CurrentTenant() tenantId: string,
    @Body() dto: BackupConfigDto,
  ) {
    return this.backupRecoveryService.configureBackup(tenantId, dto);
  }

  // ─── Restore Request ──────────────────────────────────────────────────

  @Post('restore')
  @ApiOperation({ summary: 'Request a backup restore' })
  @ApiResponse({ status: 201, description: 'Restore request created' })
  async requestRestore(
    @CurrentTenant() tenantId: string,
    @Body() dto: RestoreRequestDto,
  ) {
    return this.backupRecoveryService.requestRestore(tenantId, dto);
  }

  // ─── DR Tests ─────────────────────────────────────────────────────────

  @Post('dr-test')
  @ApiOperation({ summary: 'Schedule a disaster recovery test' })
  @ApiResponse({ status: 201, description: 'DR test scheduled' })
  async scheduleDrTest(
    @CurrentTenant() tenantId: string,
    @Body() dto: DrTestDto,
  ) {
    return this.backupRecoveryService.scheduleDrTest(tenantId, dto);
  }

  @Get('dr-tests')
  @ApiOperation({ summary: 'List all DR tests' })
  @ApiResponse({ status: 200, description: 'DR test history' })
  async listDrTests(@CurrentTenant() tenantId: string) {
    return this.backupRecoveryService.listDrTests(tenantId);
  }

  // ─── Compliance Report ────────────────────────────────────────────────

  @Get('compliance')
  @ApiOperation({ summary: 'Get backup & DR compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report' })
  async getComplianceReport(@CurrentTenant() tenantId: string) {
    return this.backupRecoveryService.getComplianceReport(tenantId);
  }
}
