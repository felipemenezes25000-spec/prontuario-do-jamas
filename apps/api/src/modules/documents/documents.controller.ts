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
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

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

  @Get('by-patient/:patientId')
  @ApiOperation({ summary: 'Get documents by patient' })
  @ApiResponse({ status: 200, description: 'Patient documents' })
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.documentsService.findByPatient(patientId);
  }

  @Get('by-encounter/:encounterId')
  @ApiOperation({ summary: 'Get documents by encounter' })
  @ApiResponse({ status: 200, description: 'Encounter documents' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.documentsService.findByEncounter(encounterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findById(id);
  }

  @Post(':id/sign')
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
