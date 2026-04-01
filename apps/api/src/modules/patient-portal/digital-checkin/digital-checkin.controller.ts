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
import { DigitalCheckinService } from './digital-checkin.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { CreateCheckinDto, SubmitAnamnesisDto, SubmitConsentDto, UploadCheckinDocumentDto } from './digital-checkin.dto';

@ApiTags('Patient Portal — Digital Check-in')
@ApiBearerAuth('access-token')
@Controller('patient-portal')
export class DigitalCheckinController {
  constructor(private readonly service: DigitalCheckinService) {}

  @Post('checkin')
  @ApiOperation({ summary: 'Digital pre-consultation check-in' })
  @ApiResponse({ status: 201, description: 'Check-in created' })
  async createCheckin(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCheckinDto,
  ) {
    return this.service.createCheckin(tenantId, user.email, dto);
  }

  @Post('checkin/:id/anamnesis')
  @ApiOperation({ summary: 'Submit pre-consultation anamnesis form' })
  @ApiParam({ name: 'id', description: 'Checkin UUID' })
  @ApiResponse({ status: 201, description: 'Anamnesis submitted' })
  async submitAnamnesis(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnamnesisDto,
  ) {
    return this.service.submitAnamnesis(tenantId, user.email, id, dto);
  }

  @Post('checkin/:id/consent')
  @ApiOperation({ summary: 'Submit consent/terms acceptance' })
  @ApiParam({ name: 'id', description: 'Checkin UUID' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async submitConsent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitConsentDto,
  ) {
    return this.service.submitConsent(tenantId, user.email, id, dto);
  }

  @Get('checkin/:id/status')
  @ApiOperation({ summary: 'Get check-in status' })
  @ApiParam({ name: 'id', description: 'Checkin UUID' })
  @ApiResponse({ status: 200, description: 'Check-in status returned' })
  async getCheckinStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getCheckinStatus(tenantId, user.email, id);
  }

  @Post('checkin/:id/document')
  @ApiOperation({ summary: 'Upload document during check-in (ID, insurance card, referral, external exam)' })
  @ApiParam({ name: 'id', description: 'Checkin UUID' })
  @ApiResponse({ status: 201, description: 'Document attached to check-in' })
  async uploadCheckinDocument(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadCheckinDocumentDto,
  ) {
    return this.service.uploadCheckinDocument(tenantId, user.email, id, dto);
  }

  @Get('checkin/:id/documents')
  @ApiOperation({ summary: 'List documents attached to a check-in' })
  @ApiParam({ name: 'id', description: 'Checkin UUID' })
  @ApiResponse({ status: 200, description: 'Check-in documents' })
  async listCheckinDocuments(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listCheckinDocuments(tenantId, user.email, id);
  }
}
