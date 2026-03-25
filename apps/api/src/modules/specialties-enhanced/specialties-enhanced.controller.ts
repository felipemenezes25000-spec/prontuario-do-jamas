import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { SpecialtiesEnhancedService } from './specialties-enhanced.service';

@ApiTags('Specialties — Enhanced Scores & Tools')
@ApiBearerAuth('access-token')
@Controller('specialties')
export class SpecialtiesEnhancedController {
  constructor(private readonly service: SpecialtiesEnhancedService) {}

  // ─── Nephrology ────────────────────────────────────────────────────────

  @Post('nephrology/ckd-epi')
  @ApiOperation({ summary: 'Calculate CKD-EPI GFR' })
  async ckdEpi(@CurrentTenant() t: string, @Body() p: { creatinine: number; age: number; gender: string; race?: string }) {
    return this.service.calculateCkdEpi(t, p);
  }

  @Get('nephrology/dialysis-access/:patientId')
  @ApiOperation({ summary: 'Get dialysis access tracking for patient' })
  @ApiParam({ name: 'patientId' })
  async dialysisAccess(@CurrentTenant() t: string, @Param('patientId', ParseUUIDPipe) pid: string) {
    return this.service.getDialysisAccessTracking(t, pid);
  }

  // ─── Neurology ─────────────────────────────────────────────────────────

  @Post('neurology/mrankin')
  @ApiOperation({ summary: 'Calculate modified Rankin Scale' })
  async mRankin(@CurrentTenant() t: string, @Body() p: { score: number }) {
    return this.service.calculateMRankin(t, p);
  }

  @Post('neurology/edss')
  @ApiOperation({ summary: 'Calculate EDSS (Expanded Disability Status Scale)' })
  async edss(@CurrentTenant() t: string, @Body() p: { pyramidal: number; cerebellar: number; brainstem: number; sensory: number; bowelBladder: number; visual: number; cerebral: number; ambulation: number }) {
    return this.service.calculateEdss(t, p);
  }

  // ─── Orthopedics ───────────────────────────────────────────────────────

  @Post('orthopedics/ao-classification')
  @ApiOperation({ summary: 'AO fracture classification with DVT prophylaxis' })
  async aoClassification(@CurrentTenant() t: string, @Body() p: { bone: string; segment: string; type: string; group?: string }) {
    return this.service.classifyFractureAO(t, p);
  }

  // ─── Gynecology ────────────────────────────────────────────────────────

  @Post('gynecology/papanicolaou')
  @ApiOperation({ summary: 'Classify Papanicolaou result (Bethesda system)' })
  async papanicolaou(@CurrentTenant() t: string, @Body() p: { result: string }) {
    return this.service.classifyPapanicolaou(t, p);
  }

  // ─── Ophthalmology ─────────────────────────────────────────────────────

  @Post('ophthalmology/snellen')
  @ApiOperation({ summary: 'Record Snellen visual acuity' })
  async snellen(@CurrentTenant() t: string, @Body() p: { patientId: string; rightEye: string; leftEye: string; corrected: boolean }) {
    return this.service.recordSnellenAcuity(t, p);
  }

  // ─── ENT ───────────────────────────────────────────────────────────────

  @Post('ent/audiometry')
  @ApiOperation({ summary: 'Record audiometry results' })
  async audiometry(@CurrentTenant() t: string, @Body() p: { patientId: string; rightEar: number[]; leftEar: number[]; frequencies: number[] }) {
    return this.service.recordAudiometry(t, p);
  }

  // ─── Endocrinology ─────────────────────────────────────────────────────

  @Post('endocrinology/insulin-protocol')
  @ApiOperation({ summary: 'Generate insulin protocol with sliding scale' })
  async insulinProtocol(@CurrentTenant() t: string, @Body() p: { patientId: string; currentGlycemia: number; weight: number; type: string }) {
    return this.service.getInsulinProtocol(t, p);
  }

  // ─── Rheumatology ──────────────────────────────────────────────────────

  @Post('rheumatology/das28')
  @ApiOperation({ summary: 'Calculate DAS28 (Disease Activity Score)' })
  async das28(@CurrentTenant() t: string, @Body() p: { tenderJoints: number; swollenJoints: number; esr: number; patientGlobalAssessment: number }) {
    return this.service.calculateDas28(t, p);
  }

  // ─── Pulmonology ───────────────────────────────────────────────────────

  @Post('pulmonology/spirometry')
  @ApiOperation({ summary: 'Interpret spirometry with GOLD staging' })
  async spirometry(@CurrentTenant() t: string, @Body() p: { fev1: number; fvc: number; fev1Predicted: number; age: number }) {
    return this.service.calculateSpirometry(t, p);
  }

  // ─── Dermatology ───────────────────────────────────────────────────────

  @Get('dermatology/nevus-mapping/:patientId')
  @ApiOperation({ summary: 'Get patient nevus mapping (mole map)' })
  @ApiParam({ name: 'patientId' })
  async nevusMapping(@CurrentTenant() t: string, @Param('patientId', ParseUUIDPipe) pid: string) {
    return this.service.getNevusMapping(t, pid);
  }
}
