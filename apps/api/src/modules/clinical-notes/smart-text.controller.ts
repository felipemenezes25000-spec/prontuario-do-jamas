import {
  Controller,
  Get,
  Post,
  Put,
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
import { SmartTextService } from './smart-text.service';
import {
  SmartPhraseDto,
  UpdateSmartPhraseTextDto,
  ExpandSmartPhraseTextDto,
  SmartLinkDto,
  ResolveSmartLinkTextDto,
  ExamMacroDto,
  ApplyExamMacroDto,
  NoteDiffDto,
} from './dto/smart-text.dto';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Clinical Notes - Smart Text')
@ApiBearerAuth('access-token')
@Controller('clinical-notes')
export class SmartTextController {
  constructor(private readonly smartTextService: SmartTextService) {}

  // ─── SmartPhrases ─────────────────────────────────────────────────────────

  @Post('smart-phrases')
  @ApiOperation({
    summary: 'Create SmartPhrase',
    description:
      'Creates a doctor-personalized or shared SmartPhrase. ' +
      'Example: ".normalexfisico" expands to a complete normal physical exam.',
  })
  @ApiResponse({ status: 201, description: 'SmartPhrase created successfully' })
  @ApiResponse({ status: 409, description: 'Abbreviation already exists' })
  async createSmartPhrase(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SmartPhraseDto,
  ) {
    return this.smartTextService.createSmartPhrase(user.sub, dto);
  }

  @Get('smart-phrases')
  @ApiOperation({ summary: 'List SmartPhrases with optional filters' })
  @ApiQuery({ name: 'abbreviation', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of SmartPhrases' })
  async listSmartPhrases(
    @CurrentUser() user: JwtPayload,
    @Query('abbreviation') abbreviation?: string,
    @Query('category') category?: string,
  ) {
    return this.smartTextService.listSmartPhrases({
      userId: user.sub,
      abbreviation,
      category,
    });
  }

  @Put('smart-phrases/:id')
  @ApiOperation({ summary: 'Update SmartPhrase by ID' })
  @ApiParam({ name: 'id', description: 'SmartPhrase UUID' })
  @ApiResponse({ status: 200, description: 'SmartPhrase updated' })
  @ApiResponse({ status: 404, description: 'SmartPhrase not found' })
  async updateSmartPhrase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSmartPhraseTextDto,
  ) {
    return this.smartTextService.updateSmartPhrase(id, dto);
  }

  @Delete('smart-phrases/:id')
  @ApiOperation({ summary: 'Delete SmartPhrase by ID' })
  @ApiParam({ name: 'id', description: 'SmartPhrase UUID' })
  @ApiResponse({ status: 200, description: 'SmartPhrase deleted' })
  @ApiResponse({ status: 404, description: 'SmartPhrase not found' })
  async deleteSmartPhrase(@Param('id', ParseUUIDPipe) id: string) {
    return this.smartTextService.deleteSmartPhrase(id);
  }

  @Post('smart-phrases/expand')
  @ApiOperation({
    summary: 'Expand SmartPhrase abbreviation',
    description:
      'Replaces abbreviation with full expansion, resolving patient-data and ' +
      'lab-result variables automatically when patientId is provided.',
  })
  @ApiResponse({ status: 200, description: 'Expanded text with unresolved variable list' })
  @ApiResponse({ status: 404, description: 'Abbreviation not found' })
  async expandSmartPhrase(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ExpandSmartPhraseTextDto,
  ) {
    return this.smartTextService.expandSmartPhrase(user.sub, dto);
  }

  // ─── SmartLinks ───────────────────────────────────────────────────────────

  @Post('smart-links')
  @ApiOperation({
    summary: 'Register a SmartLink keyword',
    description:
      'Registers an @-keyword (e.g. "@labrecente") linked to a live data source. ' +
      'Default keywords (lab/vitals/meds/diagnoses) are auto-resolved without registration.',
  })
  @ApiResponse({ status: 201, description: 'SmartLink registered' })
  @ApiResponse({ status: 409, description: 'Keyword already registered' })
  async createSmartLink(@Body() dto: SmartLinkDto) {
    return this.smartTextService.createSmartLink(dto);
  }

  @Get('smart-links')
  @ApiOperation({ summary: 'List all registered SmartLink keywords' })
  @ApiResponse({ status: 200, description: 'List of SmartLinks' })
  async listSmartLinks() {
    return this.smartTextService.listSmartLinks();
  }

  @Delete('smart-links/:id')
  @ApiOperation({ summary: 'Remove a SmartLink registration' })
  @ApiParam({ name: 'id', description: 'SmartLink UUID' })
  @ApiResponse({ status: 200, description: 'SmartLink removed' })
  @ApiResponse({ status: 404, description: 'SmartLink not found' })
  async deleteSmartLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.smartTextService.deleteSmartLink(id);
  }

  @Post('smart-links/resolve')
  @ApiOperation({
    summary: 'Resolve SmartLink to live patient data',
    description:
      'Returns formatted text ready for note insertion, e.g. ' +
      '"@sinaisvitais" → "PA: 120/80 mmHg | FC: 72 bpm | ..."',
  })
  @ApiResponse({ status: 200, description: 'Resolved data with formatted text' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async resolveSmartLink(@Body() dto: ResolveSmartLinkTextDto) {
    return this.smartTextService.resolveSmartLink(dto);
  }

  // ─── Exam Macros ──────────────────────────────────────────────────────────

  @Get('exam-macros')
  @ApiOperation({
    summary: 'List exam macros by system',
    description:
      'Returns normal-exam templates for each body system. ' +
      'Doctor clicks a system card → normal text fills in; only abnormals need editing.',
  })
  @ApiQuery({ name: 'system', required: false, description: 'Filter by body system' })
  @ApiResponse({ status: 200, description: 'List of exam macros' })
  async listExamMacros(@Query('system') system?: string) {
    return this.smartTextService.listExamMacros(system);
  }

  @Post('exam-macros')
  @ApiOperation({ summary: 'Create a new exam macro for a body system' })
  @ApiResponse({ status: 201, description: 'Exam macro created' })
  async createExamMacro(@Body() dto: ExamMacroDto) {
    return this.smartTextService.createExamMacro(dto);
  }

  @Put('exam-macros/:id')
  @ApiOperation({ summary: 'Update an exam macro' })
  @ApiParam({ name: 'id', description: 'ExamMacro UUID' })
  @ApiResponse({ status: 200, description: 'Exam macro updated' })
  @ApiResponse({ status: 404, description: 'Exam macro not found' })
  async updateExamMacro(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExamMacroDto,
  ) {
    return this.smartTextService.updateExamMacro(id, dto);
  }

  @Post('exam-macros/apply')
  @ApiOperation({
    summary: 'Apply exam macro — merge normal template with selected findings',
    description:
      'Produces ready-to-insert exam text. Pass selectedFindings to append ' +
      'abnormal findings to the normal template.',
  })
  @ApiResponse({ status: 200, description: 'Merged exam text' })
  @ApiResponse({ status: 404, description: 'No macro for given system' })
  async applyExamMacro(@Body() dto: ApplyExamMacroDto) {
    return this.smartTextService.applyExamMacro(dto);
  }

  // ─── Note Diff ────────────────────────────────────────────────────────────

  @Post('diff')
  @ApiOperation({
    summary: 'Side-by-side note diff',
    description:
      'Compares two clinical notes field-by-field and returns a structured ' +
      'diff with change type (added/removed/modified/unchanged) per SOAP section.',
  })
  @ApiResponse({ status: 200, description: 'Structured diff between the two notes' })
  @ApiResponse({ status: 404, description: 'One or both notes not found' })
  async diffNotes(@Body() dto: NoteDiffDto) {
    return this.smartTextService.diffNotes(dto);
  }
}
