import {
  Controller,
  Get,
  Post,
  Body,
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
import {
  PatientsEnhancedService,
  type NewbornRegistrationDto,
  type AddressDto,
  type LegacyImportDto,
} from './patients-enhanced.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Patients Enhanced')
@ApiBearerAuth('access-token')
@Controller('patients-enhanced')
export class PatientsEnhancedController {
  constructor(private readonly service: PatientsEnhancedService) {}

  // --- MPI ---

  @Get('mpi/search')
  @ApiOperation({ summary: 'MPI probabilistic matching search' })
  @ApiQuery({ name: 'fullName', required: false })
  @ApiQuery({ name: 'cpf', required: false })
  @ApiQuery({ name: 'birthDate', required: false })
  @ApiQuery({ name: 'phone', required: false })
  @ApiResponse({ status: 200, description: 'MPI candidates with match scores' })
  async mpiSearch(
    @CurrentTenant() tenantId: string,
    @Query('fullName') fullName?: string,
    @Query('cpf') cpf?: string,
    @Query('birthDate') birthDate?: string,
    @Query('phone') phone?: string,
  ) {
    return this.service.mpiSearch(tenantId, { fullName, cpf, birthDate, phone });
  }

  // --- Phonetic Search ---

  @Get('phonetic-search')
  @ApiOperation({ summary: 'Phonetic search (Soundex pt-BR)' })
  @ApiQuery({ name: 'name', required: true })
  @ApiResponse({ status: 200, description: 'Phonetic matches' })
  async phoneticSearch(
    @CurrentTenant() tenantId: string,
    @Query('name') name: string,
  ) {
    return this.service.phoneticSearch(tenantId, name);
  }

  // --- Newborn Registration ---

  @Post('newborn')
  @ApiOperation({ summary: 'Register newborn linked to mother' })
  @ApiResponse({ status: 201, description: 'Newborn registered' })
  async registerNewborn(
    @CurrentTenant() tenantId: string,
    @Body() dto: NewbornRegistrationDto,
  ) {
    return this.service.registerNewborn(tenantId, dto);
  }

  // --- QR Code ---

  @Get(':id/qr-code')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Generate QR code data for patient' })
  @ApiResponse({ status: 200, description: 'QR code data' })
  async generateQrCode(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.generatePatientQrCode(tenantId, id);
  }

  // --- Addresses ---

  @Post('addresses')
  @ApiOperation({ summary: 'Add patient address' })
  @ApiResponse({ status: 201, description: 'Address added' })
  async addAddress(
    @CurrentTenant() tenantId: string,
    @Body() dto: AddressDto,
  ) {
    return this.service.addAddress(tenantId, dto);
  }

  @Get(':id/addresses')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List patient addresses' })
  @ApiResponse({ status: 200, description: 'Addresses' })
  async listAddresses(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listAddresses(tenantId, id);
  }

  // --- Legacy Import ---

  @Post('import/legacy')
  @ApiOperation({ summary: 'Import patients from legacy system' })
  @ApiResponse({ status: 201, description: 'Import queued' })
  async importLegacy(
    @CurrentTenant() tenantId: string,
    @Body() dto: LegacyImportDto,
  ) {
    return this.service.importLegacyData(tenantId, dto);
  }

  // --- Selfie Verification ---

  @Post(':id/verify-selfie')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Verify patient selfie with liveness check' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifySelfie(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { imageUrl: string },
  ) {
    return this.service.verifySelfie(tenantId, id, body.imageUrl);
  }

  // --- OCR ---

  @Post('ocr/extract')
  @ApiOperation({ summary: 'Extract data from document via OCR' })
  @ApiResponse({ status: 200, description: 'Extracted fields' })
  async ocrExtract(
    @CurrentTenant() tenantId: string,
    @Body() body: { documentUrl: string; documentType: 'ID_CARD' | 'INSURANCE_CARD' },
  ) {
    return this.service.ocrExtractDocument(tenantId, body.documentUrl, body.documentType);
  }
}
