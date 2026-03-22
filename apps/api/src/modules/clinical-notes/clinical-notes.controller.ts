import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClinicalNotesService } from './clinical-notes.service';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Clinical Notes')
@ApiBearerAuth('access-token')
@Controller('clinical-notes')
export class ClinicalNotesController {
  constructor(private readonly clinicalNotesService: ClinicalNotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new clinical note' })
  @ApiResponse({ status: 201, description: 'Clinical note created' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateClinicalNoteDto,
  ) {
    return this.clinicalNotesService.create(user.sub, dto);
  }

  @Get('by-encounter/:encounterId')
  @ApiOperation({ summary: 'Get clinical notes by encounter' })
  @ApiResponse({ status: 200, description: 'List of clinical notes' })
  async findByEncounter(
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.clinicalNotesService.findByEncounter(encounterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get clinical note by ID' })
  @ApiResponse({ status: 200, description: 'Clinical note details' })
  @ApiResponse({ status: 404, description: 'Clinical note not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicalNotesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update clinical note (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'Clinical note updated' })
  @ApiResponse({ status: 400, description: 'Only DRAFT notes can be edited' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicalNoteDto,
  ) {
    return this.clinicalNotesService.update(id, dto);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign a clinical note' })
  @ApiResponse({ status: 200, description: 'Clinical note signed' })
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clinicalNotesService.sign(id, user.sub);
  }

  @Post(':id/addendum')
  @ApiOperation({ summary: 'Create an addendum to a clinical note' })
  @ApiResponse({ status: 201, description: 'Addendum created' })
  async createAddendum(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateClinicalNoteDto,
  ) {
    return this.clinicalNotesService.createAddendum(id, user.sub, dto);
  }
}
