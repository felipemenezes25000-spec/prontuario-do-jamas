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
import { SmartDocumentationService } from './smart-documentation.service';
import {
  CreateSmartPhraseDto,
  ExpandSmartPhraseDto,
  ResolveSmartLinkDto,
  CopyForwardDto,
  LockNoteDto,
  AddendumDto,
} from './dto/smart-documentation.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Clinical Notes - Smart Documentation')
@ApiBearerAuth('access-token')
@Controller('clinical-notes')
export class SmartDocumentationController {
  constructor(
    private readonly smartDocService: SmartDocumentationService,
  ) {}

  // ─── SmartPhrases ─────────────────────────────────────────────────────

  @Post('smart-phrases')
  @ApiOperation({ summary: 'Create a new SmartPhrase' })
  @ApiResponse({ status: 201, description: 'SmartPhrase created' })
  @ApiResponse({ status: 409, description: 'Abbreviation already exists' })
  async createSmartPhrase(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSmartPhraseDto,
  ) {
    return this.smartDocService.createSmartPhrase(user.sub, dto);
  }

  @Get('smart-phrases')
  @ApiOperation({ summary: 'List SmartPhrases with optional filters' })
  @ApiResponse({ status: 200, description: 'List of SmartPhrases' })
  @ApiQuery({ name: 'abbreviation', required: false, description: 'Filter by abbreviation (partial match)' })
  @ApiQuery({ name: 'specialty', required: false, description: 'Filter by medical specialty' })
  @ApiQuery({ name: 'shared', required: false, type: Boolean, description: 'Include shared phrases' })
  async getSmartPhrases(
    @CurrentUser() user: JwtPayload,
    @Query('abbreviation') abbreviation?: string,
    @Query('specialty') specialty?: string,
    @Query('shared') shared?: string,
  ) {
    return this.smartDocService.getSmartPhrases({
      userId: user.sub,
      abbreviation,
      specialty,
      shared: shared === 'true',
    });
  }

  @Post('smart-phrases/expand')
  @ApiOperation({ summary: 'Expand a SmartPhrase abbreviation with variable substitution' })
  @ApiResponse({ status: 200, description: 'Expanded text with resolved variables' })
  @ApiResponse({ status: 404, description: 'SmartPhrase not found' })
  async expandSmartPhrase(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ExpandSmartPhraseDto,
  ) {
    return this.smartDocService.expandSmartPhrase(user.sub, dto);
  }

  // ─── SmartLinks ───────────────────────────────────────────────────────

  @Post('smart-links/resolve')
  @ApiOperation({ summary: 'Resolve a SmartLink keyword to live patient data' })
  @ApiResponse({ status: 200, description: 'Resolved data with formatted text' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async resolveSmartLink(@Body() dto: ResolveSmartLinkDto) {
    return this.smartDocService.resolveSmartLink(dto);
  }

  // ─── CopyForward ─────────────────────────────────────────────────────

  @Post('copy-forward')
  @ApiOperation({ summary: 'Copy a previous clinical note as a template for a new encounter' })
  @ApiResponse({ status: 200, description: 'Copied content with change markers' })
  @ApiResponse({ status: 404, description: 'Source note or target encounter not found' })
  async copyForward(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CopyForwardDto,
  ) {
    return this.smartDocService.copyForwardNote(user.sub, dto);
  }

  // ─── NoteLocking ──────────────────────────────────────────────────────

  @Post(':id/lock')
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiOperation({ summary: 'Lock a clinical note after digital signature (immutable)' })
  @ApiResponse({ status: 200, description: 'Note locked successfully' })
  @ApiResponse({ status: 400, description: 'Note already locked or invalid signature' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async lockNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: LockNoteDto,
  ) {
    return this.smartDocService.lockNote(id, user.sub, dto);
  }

  @Post(':id/locked-addendum')
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiOperation({ summary: 'Add an addendum to a locked/signed clinical note (requires reason)' })
  @ApiResponse({ status: 201, description: 'Addendum created' })
  @ApiResponse({ status: 400, description: 'Note is not signed/locked' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async addAddendum(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddendumDto,
  ) {
    return this.smartDocService.addAddendum(id, user.sub, dto);
  }

  @Get(':id/history')
  @ApiParam({ name: 'id', description: 'Clinical note UUID' })
  @ApiOperation({ summary: 'Get full version history of a clinical note including addenda' })
  @ApiResponse({ status: 200, description: 'Note version history' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async getNoteHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.smartDocService.getNoteHistory(id);
  }
}
