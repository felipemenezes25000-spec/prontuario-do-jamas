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
import { BloodBankService } from './blood-bank.service';
import {
  BloodTypingDto,
  CrossmatchDto,
  RecordTransfusionDto,
  TransfusionReactionDto,
} from './dto/blood-bank.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Blood Bank — Hemoterapia')
@ApiBearerAuth('access-token')
@Controller('blood-bank')
export class BloodBankController {
  constructor(private readonly bloodBankService: BloodBankService) {}

  @Post('typing')
  @ApiOperation({ summary: 'Record blood typing result' })
  @ApiResponse({ status: 201, description: 'Blood typing recorded' })
  async bloodTyping(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: BloodTypingDto,
  ) {
    return this.bloodBankService.bloodTyping(tenantId, user.sub, dto);
  }

  @Post('crossmatch')
  @ApiOperation({ summary: 'Record crossmatch test' })
  @ApiResponse({ status: 201, description: 'Crossmatch recorded' })
  async crossmatch(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CrossmatchDto,
  ) {
    return this.bloodBankService.crossmatch(tenantId, user.sub, dto);
  }

  @Post('transfusion')
  @ApiOperation({ summary: 'Record a blood transfusion' })
  @ApiResponse({ status: 201, description: 'Transfusion recorded' })
  async recordTransfusion(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordTransfusionDto,
  ) {
    return this.bloodBankService.recordTransfusion(tenantId, user.sub, dto);
  }

  @Post('transfusion/:id/reaction')
  @ApiParam({ name: 'id', description: 'Transfusion UUID' })
  @ApiOperation({ summary: 'Report transfusion reaction' })
  @ApiResponse({ status: 200, description: 'Reaction reported' })
  async reportReaction(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransfusionReactionDto,
  ) {
    return this.bloodBankService.reportReaction(tenantId, user.sub, id, dto);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Blood product inventory' })
  @ApiQuery({ name: 'product', required: false })
  @ApiQuery({ name: 'bloodType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Blood inventory' })
  async getInventory(
    @CurrentTenant() tenantId: string,
    @Query('product') product?: string,
    @Query('bloodType') bloodType?: string,
    @Query('status') status?: string,
  ) {
    return this.bloodBankService.getInventory(tenantId, { product, bloodType, status });
  }

  @Get('patient/:patientId')
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiOperation({ summary: 'Patient transfusion history' })
  @ApiResponse({ status: 200, description: 'Transfusion history' })
  async getPatientHistory(
    @CurrentTenant() tenantId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.bloodBankService.getPatientTransfusionHistory(tenantId, patientId);
  }
}
