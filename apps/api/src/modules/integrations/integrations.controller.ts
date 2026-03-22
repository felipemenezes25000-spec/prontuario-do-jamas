import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { FhirMapperService } from './fhir/fhir-mapper.service';
import { Hl7ParserService } from './hl7/hl7-parser.service';
import { PacsStubService } from './pacs/pacs-stub.service';
import { LisStubService } from './lis/lis-stub.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Integrations')
@ApiBearerAuth('access-token')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirMapper: FhirMapperService,
    private readonly hl7Parser: Hl7ParserService,
    private readonly pacsService: PacsStubService,
    private readonly lisService: LisStubService,
  ) {}

  // ==================== FHIR R4 ====================

  @Get('fhir/Patient/:id')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get patient as FHIR R4 Patient resource' })
  @ApiResponse({ status: 200, description: 'FHIR Patient resource' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getFhirPatient(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${id}" not found`);
    }
    return this.fhirMapper.mapPatientToFhir(patient as unknown as Record<string, unknown>);
  }

  @Get('fhir/Encounter/:id')
  @ApiParam({ name: 'id', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get encounter as FHIR R4 Encounter resource' })
  @ApiResponse({ status: 200, description: 'FHIR Encounter resource' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  async getFhirEncounter(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, tenantId },
    });
    if (!encounter) {
      throw new NotFoundException(`Encounter with ID "${id}" not found`);
    }
    return this.fhirMapper.mapEncounterToFhir(encounter as unknown as Record<string, unknown>);
  }

  @Get('fhir/Bundle/patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get full FHIR R4 Bundle for a patient' })
  @ApiResponse({ status: 200, description: 'FHIR Bundle resource' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getFhirPatientBundle(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      include: {
        allergies: true,
        encounters: { take: 10, orderBy: { createdAt: 'desc' } },
        vitalSigns: { take: 5, orderBy: { recordedAt: 'desc' } },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    const patientData = patient as unknown as Record<string, unknown>;
    const resources = [];

    // Patient resource
    resources.push(this.fhirMapper.mapPatientToFhir(patientData));

    // Allergy resources
    const allergies = (patientData.allergies as Record<string, unknown>[]) ?? [];
    for (const allergy of allergies) {
      resources.push(this.fhirMapper.mapAllergyToFhir(allergy));
    }

    // Encounter resources
    const encounters = (patientData.encounters as Record<string, unknown>[]) ?? [];
    for (const encounter of encounters) {
      resources.push(this.fhirMapper.mapEncounterToFhir(encounter));
    }

    // VitalSigns resources
    const vitalSigns = (patientData.vitalSigns as Record<string, unknown>[]) ?? [];
    for (const vitals of vitalSigns) {
      resources.push(this.fhirMapper.mapVitalSignsToFhir(vitals));
    }

    return this.fhirMapper.createBundle(resources);
  }

  // ==================== HL7 v2 ====================

  @Post('hl7/parse')
  @ApiOperation({ summary: 'Parse an HL7 v2.x message' })
  @ApiBody({ schema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } })
  @ApiResponse({ status: 200, description: 'Parsed HL7 message' })
  async parseHl7(@Body('message') message: string) {
    return this.hl7Parser.parseMessage(message);
  }

  @Post('hl7/adt')
  @ApiOperation({ summary: 'Generate HL7 ADT^A01 admission message' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
        encounterId: { type: 'string' },
      },
      required: ['patientId', 'encounterId'],
    },
  })
  @ApiResponse({ status: 201, description: 'HL7 ADT message generated' })
  async generateAdt(
    @CurrentTenant() tenantId: string,
    @Body('patientId') patientId: string,
    @Body('encounterId') encounterId: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
    });
    if (!encounter) {
      throw new NotFoundException(`Encounter with ID "${encounterId}" not found`);
    }

    const message = this.hl7Parser.buildADT_A01(
      patient as unknown as Record<string, unknown>,
      encounter as unknown as Record<string, unknown>,
    );
    return { message };
  }

  // ==================== PACS ====================

  @Get('pacs/studies')
  @ApiOperation({ summary: 'Query PACS studies (stub)' })
  @ApiQuery({ name: 'patientId', required: true, description: 'Patient ID' })
  @ApiQuery({ name: 'modality', required: false, description: 'DICOM modality filter (CR, CT, MR, US, etc.)' })
  @ApiResponse({ status: 200, description: 'List of DICOM studies' })
  async queryPacsStudies(
    @Query('patientId') patientId: string,
    @Query('modality') modality?: string,
  ) {
    return this.pacsService.queryStudies(patientId, modality);
  }

  // ==================== LIS ====================

  @Post('lis/orders')
  @ApiOperation({ summary: 'Send lab order to LIS (stub)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
        encounterId: { type: 'string' },
        exams: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              name: { type: 'string' },
              material: { type: 'string' },
            },
          },
        },
        priority: { type: 'string', enum: ['ROUTINE', 'URGENT', 'STAT'] },
        orderedBy: { type: 'string' },
      },
      required: ['patientId', 'encounterId', 'exams', 'priority', 'orderedBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Lab order created' })
  async sendLabOrder(
    @Body()
    body: {
      patientId: string;
      encounterId: string;
      exams: Array<{ code: string; name: string; material: string }>;
      priority: 'ROUTINE' | 'URGENT' | 'STAT';
      orderedBy: string;
    },
  ) {
    return this.lisService.sendOrder(body);
  }

  @Get('lis/results/:orderId')
  @ApiParam({ name: 'orderId', description: 'Lab order ID' })
  @ApiOperation({ summary: 'Get lab results from LIS (stub)' })
  @ApiResponse({ status: 200, description: 'Lab results' })
  async getLabResults(@Param('orderId') orderId: string) {
    return this.lisService.getResults(orderId);
  }

  // ==================== Health Check ====================

  @Get('status')
  @ApiOperation({ summary: 'Health check for all integration endpoints' })
  @ApiResponse({ status: 200, description: 'Integration status' })
  async getStatus() {
    return {
      fhir: { status: 'active', version: 'R4', mode: 'mapper' },
      hl7: { status: 'active', version: '2.5', mode: 'parser' },
      pacs: { status: 'stub', protocol: 'DICOM/WADO', mode: 'mock' },
      lis: { status: 'stub', protocol: 'HL7/LIS', mode: 'mock' },
      timestamp: new Date().toISOString(),
    };
  }
}
