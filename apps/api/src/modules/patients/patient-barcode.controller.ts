import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PatientBarcodeService } from './patient-barcode.service';
import { PrintLabelsDto } from './dto/patient-barcode.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Patient Barcode & Labels')
@ApiBearerAuth('access-token')
@Controller('patients')
export class PatientBarcodeController {
  constructor(private readonly service: PatientBarcodeService) {}

  @Get(':id/barcode')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get CODE128 barcode data for patient wristband' })
  @ApiResponse({ status: 200, description: 'Barcode data' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getBarcode(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getBarcode(tenantId, id);
  }

  @Get(':id/qrcode')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Get QR code JSON payload for patient identification (includes allergy alert)' })
  @ApiResponse({ status: 200, description: 'QR code data' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getQrCode(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getQrCode(tenantId, id);
  }

  @Post(':id/labels')
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Queue label print job (wristband, collection tubes, medication, specimen)' })
  @ApiResponse({ status: 201, description: 'Print job queued' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async printLabels(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrintLabelsDto,
  ) {
    return this.service.printLabels(tenantId, id, dto);
  }
}
