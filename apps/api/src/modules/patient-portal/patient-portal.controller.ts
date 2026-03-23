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
} from '@nestjs/swagger';
import { PatientPortalService } from './patient-portal.service';
import { QueryPortalDto, RequestAppointmentDto } from './dto/query-portal.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Patient Portal')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class PatientPortalController {
  constructor(private readonly portalService: PatientPortalService) {}

  @Get('my-encounters')
  @ApiOperation({ summary: 'List patient own encounters' })
  @ApiResponse({ status: 200, description: 'Paginated encounters for the current patient' })
  async getMyEncounters(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryPortalDto,
  ) {
    return this.portalService.getMyEncounters(tenantId, user.email, query);
  }

  @Get('my-results')
  @ApiOperation({ summary: 'List patient lab/exam results' })
  @ApiResponse({ status: 200, description: 'Paginated exam results' })
  async getMyResults(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryPortalDto,
  ) {
    return this.portalService.getMyResults(tenantId, user.email, query);
  }

  @Get('my-prescriptions')
  @ApiOperation({ summary: 'List patient active prescriptions' })
  @ApiResponse({ status: 200, description: 'Paginated prescriptions' })
  async getMyPrescriptions(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryPortalDto,
  ) {
    return this.portalService.getMyPrescriptions(tenantId, user.email, query);
  }

  @Get('my-appointments')
  @ApiOperation({ summary: 'List patient upcoming appointments' })
  @ApiResponse({ status: 200, description: 'Paginated appointments' })
  async getMyAppointments(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryPortalDto,
  ) {
    return this.portalService.getMyAppointments(tenantId, user.email, query);
  }

  @Post('request-appointment')
  @ApiOperation({ summary: 'Request a new appointment' })
  @ApiResponse({ status: 201, description: 'Appointment request created' })
  async requestAppointment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestAppointmentDto,
  ) {
    return this.portalService.requestAppointment(tenantId, user.email, dto);
  }

  @Get('my-vitals')
  @ApiOperation({ summary: 'List patient vitals history' })
  @ApiResponse({ status: 200, description: 'Paginated vital signs' })
  async getMyVitals(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryPortalDto,
  ) {
    return this.portalService.getMyVitals(tenantId, user.email, query);
  }

  @Get('my-documents')
  @ApiOperation({ summary: 'List patient clinical documents' })
  @ApiResponse({ status: 200, description: 'Paginated clinical documents' })
  async getMyDocuments(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryPortalDto,
  ) {
    return this.portalService.getMyDocuments(tenantId, user.email, query);
  }
}
