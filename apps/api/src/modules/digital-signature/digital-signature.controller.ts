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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { DigitalSignatureService } from './digital-signature.service';
import { SignDocumentDto } from './dto/sign-document.dto';
import { ValidateCertificateDto } from './dto/validate-certificate.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

/**
 * Digital Signature Controller — ICP-Brasil PKI Endpoints
 *
 * Provides endpoints for signing, verifying, and managing digital signatures
 * on clinical documents, notes, and prescriptions per CFM Resolution 2.299/2021.
 */
@ApiTags('Digital Signature')
@ApiBearerAuth('access-token')
@Controller('digital-signature')
export class DigitalSignatureController {
  constructor(
    private readonly digitalSignatureService: DigitalSignatureService,
  ) {}

  @Post('sign/document/:id')
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiOperation({
    summary: 'Sign a clinical document with ICP-Brasil certificate',
    description:
      'Creates a digital signature on a clinical document using an ICP-Brasil A1/A3 certificate. Compliant with CFM Resolution 2.299/2021.',
  })
  @ApiResponse({ status: 201, description: 'Document signed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid certificate or document' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async signDocument(
    @Param('id', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: SignDocumentDto,
  ) {
    return this.digitalSignatureService.signDocument(
      user.sub,
      tenantId,
      documentId,
      dto.certificateBase64,
      dto.certificatePassword,
      dto.signatureStandard,
    );
  }

  @Post('sign/clinical-note/:id')
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiOperation({
    summary: 'Sign a clinical note with ICP-Brasil certificate',
    description:
      'Creates a digital signature on a clinical note (SOAP). CFM Resolution 2.299/2021.',
  })
  @ApiResponse({ status: 201, description: 'Clinical note signed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid certificate' })
  @ApiResponse({ status: 404, description: 'Clinical note not found' })
  async signClinicalNote(
    @Param('id', ParseUUIDPipe) noteId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: SignDocumentDto,
  ) {
    return this.digitalSignatureService.signClinicalNote(
      user.sub,
      tenantId,
      noteId,
      dto.certificateBase64,
      dto.certificatePassword,
      dto.signatureStandard,
    );
  }

  @Post('sign/prescription/:id')
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiOperation({
    summary: 'Sign a prescription with ICP-Brasil certificate',
    description:
      'Creates a digital signature on a prescription. Required for electronic prescriptions per CFM Resolution 2.299/2021.',
  })
  @ApiResponse({ status: 201, description: 'Prescription signed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid certificate' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async signPrescription(
    @Param('id', ParseUUIDPipe) prescriptionId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Body() dto: SignDocumentDto,
  ) {
    return this.digitalSignatureService.signPrescription(
      user.sub,
      tenantId,
      prescriptionId,
      dto.certificateBase64,
      dto.certificatePassword,
      dto.signatureStandard,
    );
  }

  @Get('verify/:signatureId')
  @ApiParam({ name: 'signatureId', description: 'Signature UUID' })
  @ApiOperation({
    summary: 'Verify a digital signature',
    description:
      'Verifies the integrity and validity of a digital signature against the ICP-Brasil certificate chain.',
  })
  @ApiResponse({ status: 200, description: 'Verification result' })
  @ApiResponse({ status: 404, description: 'Signature not found' })
  async verifySignature(
    @Param('signatureId', ParseUUIDPipe) signatureId: string,
  ) {
    return this.digitalSignatureService.verifySignature(signatureId);
  }

  @Get('document/:documentId')
  @ApiParam({ name: 'documentId', description: 'Document UUID' })
  @ApiOperation({
    summary: 'List all signatures for a document',
    description: 'Returns all digital signatures associated with a clinical document.',
  })
  @ApiResponse({ status: 200, description: 'List of signatures' })
  async getDocumentSignatures(
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.digitalSignatureService.getDocumentSignatures(documentId);
  }

  @Get('user/:userId')
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiOperation({
    summary: 'List all signatures by a user',
    description: 'Returns all digital signatures created by a specific user.',
  })
  @ApiResponse({ status: 200, description: 'List of user signatures' })
  async getUserSignatures(
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.digitalSignatureService.getUserSignatures(userId);
  }

  @Post('validate-certificate')
  @ApiOperation({
    summary: 'Validate an ICP-Brasil certificate',
    description:
      'Validates a certificate without signing. Checks expiry, chain of trust, and revocation status.',
  })
  @ApiResponse({ status: 200, description: 'Certificate validation result' })
  @ApiResponse({ status: 400, description: 'Invalid certificate data' })
  async validateCertificate(@Body() dto: ValidateCertificateDto) {
    return this.digitalSignatureService.validateCertificate(
      dto.certificateBase64,
      dto.certificatePassword,
    );
  }

  @Get('report')
  @ApiOperation({
    summary: 'Signature report for a tenant',
    description:
      'Returns a report of all digital signatures within a date range. Used for audit compliance per CFM Resolution 2.299/2021.',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2025-12-31' })
  @ApiResponse({ status: 200, description: 'Signature report' })
  async getSignatureReport(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.digitalSignatureService.getSignatureReport(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
