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
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { DocumentReplicationService } from './document-replication.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SuggestFromHistoryDto } from './dto/suggest-from-history.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly replicationService: DocumentReplicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List documents with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of documents' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('patientId') patientId?: string,
    @Query('encounterId') encounterId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const resolvedPageSize = limit ? parseInt(limit, 10) : pageSize ? parseInt(pageSize, 10) : 20;
    return this.documentsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: resolvedPageSize,
      patientId,
      encounterId,
      type,
      status,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a clinical document' })
  @ApiResponse({ status: 201, description: 'Document created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(tenantId, user.sub, dto);
  }

  // ===========================================================================
  // Document Replication Endpoints
  // ===========================================================================

  @Get('replicate/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({
    name: 'type',
    enum: DocumentType,
    description: 'Document type to replicate metadata from',
  })
  @ApiOperation({ summary: 'Get last document metadata for pre-filling' })
  @ApiResponse({ status: 200, description: 'Document metadata template' })
  async getLastDocumentMetadata(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('type') type: DocumentType,
  ) {
    return this.replicationService.getLastDocumentMetadata(
      tenantId,
      patientId,
      type,
    );
  }

  @Get('patient-data/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get aggregated patient common data' })
  @ApiResponse({ status: 200, description: 'Patient common data' })
  async getPatientCommonData(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.replicationService.getPatientCommonData(tenantId, patientId);
  }

  @Post('suggest')
  @ApiOperation({ summary: 'Get suggestions from patient document history' })
  @ApiResponse({ status: 200, description: 'History-based suggestions' })
  async suggestFromHistory(
    @CurrentTenant() tenantId: string,
    @Body() dto: SuggestFromHistoryDto,
  ) {
    return this.replicationService.suggestFromHistory(
      tenantId,
      dto.patientId,
      dto.context,
    );
  }

  // ===========================================================================
  // Existing Endpoints
  // ===========================================================================

  @Get('by-patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get documents by patient' })
  @ApiResponse({ status: 200, description: 'Patient documents' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.documentsService.findByPatient(patientId);
  }

  @Get('by-encounter/:encounterId')
  @ApiParam({ name: 'encounterId', description: 'Encounter UUID' })
  @ApiOperation({ summary: 'Get documents by encounter' })
  @ApiResponse({ status: 200, description: 'Encounter documents' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.documentsService.findByEncounter(encounterId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findById(id);
  }

  @Post(':id/sign')
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiOperation({ summary: 'Sign a document' })
  @ApiResponse({ status: 200, description: 'Document signed' })
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentsService.sign(id, user.sub);
  }

  @Post('generate-from-template')
  @ApiOperation({ summary: 'Generate document from template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', format: 'uuid', description: 'Template UUID' },
        patientId: { type: 'string', format: 'uuid', description: 'Patient UUID' },
        encounterId: { type: 'string', format: 'uuid', description: 'Encounter UUID (optional)' },
        variables: { type: 'object', additionalProperties: { type: 'string' }, description: 'Template variable values' },
      },
      required: ['templateId', 'patientId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document generated' })
  async generateFromTemplate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      templateId: string;
      patientId: string;
      encounterId?: string;
      variables?: Record<string, string>;
    },
  ) {
    return this.documentsService.generateFromTemplate(
      tenantId,
      user.sub,
      body.templateId,
      body.patientId,
      body.encounterId,
      body.variables,
    );
  }
}
