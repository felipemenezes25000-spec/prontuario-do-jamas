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
import { PatientRegistryEnhancedService } from './patient-registry-enhanced.service';
import {
  FindDuplicatesDto,
  MergePatientDto,
  PhoneticAlgorithm,
  NewbornRegistrationDto,
  GenerateLabelDto,
  GeocodeAddressDto,
  DocumentOCRDto,
  IdentityVerificationDto,
  LivenessCheckResult,
} from './dto/patient-registry-enhanced.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Patient Registry Enhanced')
@ApiBearerAuth('access-token')
@Controller('patient-registry-enhanced')
export class PatientRegistryEnhancedController {
  constructor(
    private readonly service: PatientRegistryEnhancedService,
  ) {}

  // ─── 1. MPI / Duplicate Detection ─────────────────────────────────────

  @Post('find-duplicates')
  @ApiOperation({ summary: 'Find duplicate patients using probabilistic matching (MPI)' })
  @ApiResponse({ status: 200, description: 'List of duplicate candidates with match scores and confidence levels' })
  async findDuplicates(
    @CurrentTenant() tenantId: string,
    @Body() dto: FindDuplicatesDto,
  ) {
    return this.service.findDuplicates(tenantId, dto);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge duplicate patients — reassign all records to survivor, field-level control' })
  @ApiResponse({ status: 200, description: 'Patients merged successfully' })
  @ApiResponse({ status: 400, description: 'Invalid merge request' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async mergePatients(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MergePatientDto,
  ) {
    return this.service.mergePatients(tenantId, dto, user.sub);
  }

  // ─── 2. Phonetic Search ───────────────────────────────────────────────

  @Get('phonetic-search')
  @ApiQuery({ name: 'query', required: true, description: 'Patient name to search phonetically' })
  @ApiQuery({ name: 'algorithm', required: false, enum: PhoneticAlgorithm, description: 'Phonetic algorithm to use' })
  @ApiOperation({ summary: 'Phonetic search with selectable algorithm (Soundex, Metaphone, Double Metaphone pt-BR)' })
  @ApiResponse({ status: 200, description: 'Phonetic search results' })
  async phoneticSearch(
    @CurrentTenant() tenantId: string,
    @Query('query') query: string,
    @Query('algorithm') algorithm?: PhoneticAlgorithm,
  ) {
    return this.service.phoneticSearch(tenantId, { query, algorithm });
  }

  @Get('phonetic-code')
  @ApiQuery({ name: 'name', required: true })
  @ApiQuery({ name: 'algorithm', required: false, enum: PhoneticAlgorithm })
  @ApiOperation({ summary: 'Generate phonetic code for a given name' })
  @ApiResponse({ status: 200, description: 'Phonetic code' })
  generatePhoneticCode(
    @Query('name') name: string,
    @Query('algorithm') algorithm?: PhoneticAlgorithm,
  ) {
    return this.service.generatePhoneticCode(
      name,
      algorithm ?? PhoneticAlgorithm.SOUNDEX,
    );
  }

  // ─── 3. Newborn Registration ──────────────────────────────────────────

  @Post('newborn')
  @ApiOperation({ summary: 'Register newborn linked to mother — auto MRN, copy insurance, create encounter' })
  @ApiResponse({ status: 201, description: 'Newborn registered and linked to mother' })
  @ApiResponse({ status: 404, description: 'Mother not found' })
  async registerNewborn(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: NewbornRegistrationDto,
  ) {
    return this.service.registerNewborn(tenantId, dto, user.sub);
  }

  // ─── 4. Label Generation (QR Code / Barcode) ─────────────────────────

  @Post('labels')
  @ApiOperation({ summary: 'Generate patient label (wristband, specimen, chart, medication, material)' })
  @ApiResponse({ status: 200, description: 'Label with base64 image and text content' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async generateLabel(
    @CurrentTenant() tenantId: string,
    @Body() dto: GenerateLabelDto,
  ) {
    return this.service.generatePatientLabel(tenantId, dto);
  }

  @Get(':id/specimen-label')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiQuery({ name: 'specimenType', required: true })
  @ApiQuery({ name: 'collectionDate', required: true })
  @ApiOperation({ summary: 'Generate specimen collection label' })
  @ApiResponse({ status: 200, description: 'Specimen label data' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async generateSpecimenLabel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('specimenType') specimenType: string,
    @Query('collectionDate') collectionDate: string,
  ) {
    return this.service.generateSpecimenLabel(tenantId, id, specimenType, collectionDate);
  }

  @Get(':id/medication-label')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiQuery({ name: 'medicationName', required: true })
  @ApiQuery({ name: 'dose', required: true })
  @ApiQuery({ name: 'route', required: true })
  @ApiOperation({ summary: 'Generate medication administration label' })
  @ApiResponse({ status: 200, description: 'Medication label data' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async generateMedicationLabel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('medicationName') medicationName: string,
    @Query('dose') dose: string,
    @Query('route') route: string,
  ) {
    return this.service.generateMedicationLabel(tenantId, id, medicationName, dose, route);
  }

  // ─── 5. Address Geolocation ───────────────────────────────────────────

  @Post('geocode')
  @ApiOperation({ summary: 'Geocode a Brazilian address (stub for external API)' })
  @ApiResponse({ status: 200, description: 'Geocode result with lat/lng' })
  async geocodeAddress(
    @CurrentTenant() tenantId: string,
    @Body() dto: GeocodeAddressDto,
  ) {
    return this.service.geocodeAddress(tenantId, dto);
  }

  @Get('distance')
  @ApiQuery({ name: 'lat1', required: true, type: Number })
  @ApiQuery({ name: 'lon1', required: true, type: Number })
  @ApiQuery({ name: 'lat2', required: true, type: Number })
  @ApiQuery({ name: 'lon2', required: true, type: Number })
  @ApiOperation({ summary: 'Calculate Haversine distance between two coordinates (for home care routing)' })
  @ApiResponse({ status: 200, description: 'Distance in km and miles' })
  calculateDistance(
    @Query('lat1') lat1: string,
    @Query('lon1') lon1: string,
    @Query('lat2') lat2: string,
    @Query('lon2') lon2: string,
  ) {
    return this.service.calculateDistance(
      parseFloat(lat1),
      parseFloat(lon1),
      parseFloat(lat2),
      parseFloat(lon2),
    );
  }

  // ─── 6. Document OCR ──────────────────────────────────────────────────

  @Post('ocr')
  @ApiOperation({ summary: 'Process document image with OCR — extract patient data (stub for external API)' })
  @ApiResponse({ status: 200, description: 'OCR extraction result' })
  async processDocument(
    @CurrentTenant() tenantId: string,
    @Body() dto: DocumentOCRDto,
  ) {
    return this.service.processDocument(tenantId, dto);
  }

  @Post('ocr/map-to-patient')
  @ApiOperation({ summary: 'Map OCR-extracted fields to patient registration form fields' })
  @ApiResponse({ status: 200, description: 'Mapped patient fields' })
  async mapOCRToPatient(
    @Body() body: { ocrResult: { extractedFields: Array<{ fieldName: string; value: string; confidence: number }>; overallConfidence: number; rawText: string; documentType: string } },
  ) {
    return this.service.mapExtractedToPatient(body.ocrResult as Parameters<typeof this.service.mapExtractedToPatient>[0]);
  }

  // ─── 7. Identity Verification ─────────────────────────────────────────

  @Post('verify-identity')
  @ApiOperation({ summary: 'Verify patient identity via selfie + document photo comparison (stub for biometric API)' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyIdentity(
    @CurrentTenant() tenantId: string,
    @Body() dto: IdentityVerificationDto,
  ) {
    const result = await this.service.verifyIdentity(tenantId, dto);
    return result;
  }

  @Post(':id/record-verification')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Record identity verification result in patient record' })
  @ApiResponse({ status: 201, description: 'Verification recorded' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async recordVerification(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() result: { isMatch: boolean; matchConfidence: number; livenessCheck: string; fraudIndicators: string[] },
  ) {
    return this.service.recordVerification(
      tenantId,
      id,
      {
        isMatch: result.isMatch,
        matchConfidence: result.matchConfidence,
        livenessCheck: result.livenessCheck as LivenessCheckResult,
        fraudIndicators: result.fraudIndicators,
        verifiedAt: new Date().toISOString(),
        patientId: id,
      },
      user.sub,
    );
  }
}
