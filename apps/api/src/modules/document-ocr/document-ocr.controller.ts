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
import { DocumentOcrService } from './document-ocr.service';
import { ProcessOcrDto } from './document-ocr.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Document OCR')
@ApiBearerAuth('access-token')
@Controller('document-ocr')
export class DocumentOcrController {
  constructor(private readonly documentOcrService: DocumentOcrService) {}

  @Post('process')
  @ApiOperation({ summary: 'Process a document image with OCR' })
  @ApiResponse({ status: 201, description: 'OCR processing completed' })
  async processDocument(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ProcessOcrDto,
  ) {
    return this.documentOcrService.processDocument(tenantId, user.sub, dto);
  }

  @Get(':patientId/history')
  @ApiOperation({ summary: 'Get OCR processing history for a patient' })
  @ApiResponse({ status: 200, description: 'OCR history list' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getOcrHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.documentOcrService.getOcrHistory(tenantId, patientId);
  }

  @Post(':patientId/apply/:ocrResultId')
  @ApiOperation({ summary: 'Apply OCR extracted data to patient record' })
  @ApiResponse({ status: 200, description: 'OCR data applied to patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiParam({ name: 'ocrResultId', description: 'OCR result UUID' })
  async applyOcrToPatient(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('ocrResultId') ocrResultId: string,
  ) {
    return this.documentOcrService.applyOcrToPatient(tenantId, patientId, ocrResultId);
  }
}
