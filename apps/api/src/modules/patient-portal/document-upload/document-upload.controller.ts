import {
  Controller,
  Get,
  Post,
  Patch,
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
import { DocumentUploadService } from './document-upload.service';
import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { CurrentUser, type JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../common/pipes/parse-uuid.pipe';
import { UploadDocumentDto, ReviewDocumentDto } from './document-upload.dto';

@ApiTags('Patient Portal — Document Upload')
@ApiBearerAuth('access-token')
@Controller('patient-portal/documents')
export class DocumentUploadController {
  constructor(private readonly service: DocumentUploadService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload external document' })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async uploadDocument(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.service.uploadDocument(tenantId, user.email, dto);
  }

  @Get('uploads')
  @ApiOperation({ summary: 'List patient uploaded documents' })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Paginated uploads' })
  async listUploads(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('documentType') documentType?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listUploads(tenantId, user.email, {
      documentType,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Delete('upload/:id')
  @ApiOperation({ summary: 'Delete uploaded document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async deleteUpload(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteUpload(tenantId, user.email, id);
  }

  @Patch('upload/:id/review')
  @ApiOperation({ summary: 'Doctor reviews an uploaded document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Review saved' })
  async reviewUpload(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.service.reviewUpload(tenantId, user.email, id, dto);
  }

  @Get('pending-reviews')
  @ApiOperation({ summary: 'List documents pending doctor review' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: 'Pending reviews' })
  async getPendingReviews(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getPendingReviews(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
