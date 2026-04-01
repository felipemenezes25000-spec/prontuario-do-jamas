import {
  Controller,
  Get,
  Post,
  Delete,
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
import { PatientRegistryService } from './patient-registry.service';
import {
  MergePatientsDto,
  AddPatientAddressDto,
  LinkNewbornDto,
} from './dto/patient-registry.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Patient Registry')
@ApiBearerAuth('access-token')
@Controller('patient-registry')
export class PatientRegistryController {
  constructor(private readonly service: PatientRegistryService) {}

  // --- Phonetic Search ---

  @Get('phonetic-search')
  @ApiQuery({ name: 'query', required: true, description: 'Name to search phonetically (pt-BR)' })
  @ApiOperation({ summary: 'Phonetic search for patient names (Soundex + Metaphone pt-BR)' })
  @ApiResponse({ status: 200, description: 'Phonetic search results with similarity scores' })
  async searchPhonetic(
    @CurrentTenant() tenantId: string,
    @Query('query') query: string,
  ) {
    return this.service.searchPhonetic(tenantId, query);
  }

  // --- Duplicate Detection ---

  @Get(':id/duplicates')
  @ApiParam({ name: 'id', description: 'Patient UUID to check for duplicates' })
  @ApiOperation({ summary: 'Find potential duplicate patients using MPI matching (name, CPF, birth date, phone, email)' })
  @ApiResponse({ status: 200, description: 'List of potential duplicates with match scores' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async findDuplicates(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findDuplicates(tenantId, id);
  }

  // --- Merge Patients ---

  @Post('merge')
  @ApiOperation({ summary: 'Merge duplicate patient records (secondary into primary)' })
  @ApiResponse({ status: 200, description: 'Patients merged successfully' })
  @ApiResponse({ status: 400, description: 'Invalid merge request' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async mergePatients(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MergePatientsDto,
  ) {
    return this.service.mergePatients(
      tenantId,
      dto.primaryId,
      dto.secondaryId,
      user.sub,
    );
  }

  // --- Barcode / QR Code ---

  @Get(':id/barcode')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Generate barcode and QR code data for patient wristband/labels' })
  @ApiResponse({ status: 200, description: 'Barcode and QR code data' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async generateBarcode(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.generateBarcode(tenantId, id);
  }

  // --- Addresses ---

  @Post(':id/addresses')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Add address to patient (supports multiple addresses with geolocation)' })
  @ApiResponse({ status: 201, description: 'Address added' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async addAddress(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPatientAddressDto,
  ) {
    return this.service.addAddress(tenantId, id, dto);
  }

  @Get(':id/addresses')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'List all patient addresses' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async listAddresses(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listAddresses(tenantId, id);
  }

  @Delete(':id/addresses/:addressId')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiParam({ name: 'addressId', description: 'Address document UUID' })
  @ApiOperation({ summary: 'Delete a patient address' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteAddress(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.service.deleteAddress(tenantId, id, addressId);
  }

  // --- Link Newborn ---

  @Post('link-newborn')
  @ApiOperation({ summary: 'Link mother and newborn patient records' })
  @ApiResponse({ status: 201, description: 'Mother-newborn link created' })
  @ApiResponse({ status: 400, description: 'Invalid link request' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  @ApiResponse({ status: 409, description: 'Link already exists' })
  async linkNewborn(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: LinkNewbornDto,
  ) {
    return this.service.linkNewborn(
      tenantId,
      dto.motherId,
      dto.newbornId,
      user.sub,
    );
  }

  @Get(':id/mother-newborn-links')
  @ApiParam({ name: 'id', description: 'Patient UUID (mother or newborn)' })
  @ApiOperation({ summary: 'List mother-newborn links for a patient' })
  @ApiResponse({ status: 200, description: 'List of mother-newborn links' })
  async getMotherNewbornLinks(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getMotherNewbornLinks(tenantId, id);
  }
}
