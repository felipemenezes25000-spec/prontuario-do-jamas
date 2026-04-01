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
import { NewbornRegistryService } from './newborn-registry.service';
import { RegisterNewbornDto } from './dto/newborn-registry.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Newborn Registry')
@ApiBearerAuth('access-token')
@Controller('patients/newborn')
export class NewbornRegistryController {
  constructor(private readonly service: NewbornRegistryService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a newborn linked to mother — auto-creates patient record and MRN' })
  @ApiResponse({ status: 201, description: 'Newborn registered' })
  @ApiResponse({ status: 404, description: 'Mother patient not found' })
  async register(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterNewbornDto,
  ) {
    return this.service.register(tenantId, dto, user.sub);
  }

  @Get(':id/mother-link')
  @ApiParam({ name: 'id', description: 'Newborn patient UUID' })
  @ApiOperation({ summary: 'Get mother-newborn link for a newborn patient' })
  @ApiResponse({ status: 200, description: 'Mother-newborn link data' })
  @ApiResponse({ status: 404, description: 'No mother link found' })
  async getMotherLink(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getMotherLink(tenantId, id);
  }
}
