import { Controller, Get, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { DashboardService, DashboardStats } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly auditService: AuditService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics',
    schema: {
      type: 'object',
      properties: {
        totalPatients: { type: 'number' },
        totalPatientsChange: { type: 'number', description: '% change from last month' },
        encountersToday: { type: 'number' },
        encountersTodayChange: { type: 'number', description: '% change from yesterday' },
        occupiedBeds: { type: 'number' },
        totalBeds: { type: 'number' },
        occupancyRate: { type: 'number', description: 'Percentage 0-100' },
        activeAlerts: { type: 'number' },
        criticalAlerts: { type: 'number' },
        scheduledAppointments: { type: 'number' },
        completedAppointments: { type: 'number' },
        pendingPrescriptions: { type: 'number' },
        waitingTriage: { type: 'number' },
        averageWaitTime: { type: 'number', description: 'Minutes' },
        revenueThisMonth: { type: 'number' },
      },
    },
  })
  async getStats(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DashboardStats> {
    this.logger.log(`getStats called by user ${user.sub} for tenant ${tenantId}`);

    const stats = await this.dashboardService.getStats(tenantId);

    await this.auditService.log({
      tenantId: user.tenantId,
      userId: user.sub,
      action: 'READ',
      entity: 'Dashboard',
      newData: { action: 'view_stats' },
    }).catch((err: unknown) => {
      this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    return stats;
  }
}
