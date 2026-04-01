import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { SpecialtiesEnhancedService } from './specialties-enhanced.service';

@ApiTags('Specialties — Enhanced Clinical Assessments')
@ApiBearerAuth('access-token')
@Controller('specialties')
export class SpecialtiesEnhancedController {
  constructor(private readonly service: SpecialtiesEnhancedService) {}

  // ─── Cardiology ──────────────────────────────────────────────────────

  @Post('cardiology/assessment')
  @ApiOperation({ summary: 'Create cardiology assessment (ECG, Echo, Cath, risk scores)' })
  async cardiologyAssessment(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      assessmentType: 'ECG' | 'ECHO' | 'CATH' | 'RISK_SCORE';
      ecg?: Record<string, unknown>;
      echo?: Record<string, unknown>;
      cath?: Record<string, unknown>;
      framinghamRisk?: Record<string, unknown>;
      ascvdRisk?: Record<string, unknown>;
      chads2vasc?: Record<string, unknown>;
    },
  ) {
    return this.service.createCardiologyAssessment(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createCardiologyAssessment>[1]);
  }

  // ─── Nephrology ──────────────────────────────────────────────────────

  @Post('nephrology/record')
  @ApiOperation({ summary: 'Create nephrology record (CKD-EPI, dialysis, access, Kt/V)' })
  async nephrologyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      creatinine: number;
      age: number;
      gender: string;
      race?: string;
      dialysis?: Record<string, unknown>;
      access?: Record<string, unknown>;
    },
  ) {
    return this.service.createNephrologyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createNephrologyRecord>[1]);
  }

  // ─── Neurology ───────────────────────────────────────────────────────

  @Post('neurology/assessment')
  @ApiOperation({ summary: 'Create neurology assessment (NIHSS, mRankin, EDSS, EEG/EMG)' })
  async neurologyAssessment(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      assessmentType: 'NIHSS' | 'MRANKIN' | 'EDSS' | 'EEG' | 'EMG';
      nihss?: Record<string, unknown>;
      mRankinScore?: number;
      edss?: Record<string, unknown>;
      eeg?: Record<string, unknown>;
      emg?: Record<string, unknown>;
    },
  ) {
    return this.service.createNeurologyAssessment(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createNeurologyAssessment>[1]);
  }

  // ─── Orthopedics ─────────────────────────────────────────────────────

  @Post('orthopedics/record')
  @ApiOperation({ summary: 'Create orthopedics record (AO classification, immobilization, DVT prophylaxis)' })
  async orthopedicsRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      bone: string;
      segment: string;
      type: string;
      group?: string;
      immobilization?: Record<string, unknown>;
      dvtProphylaxis?: Record<string, unknown>;
    },
  ) {
    return this.service.createOrthopedicsRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createOrthopedicsRecord>[1]);
  }

  // ─── Gynecology ──────────────────────────────────────────────────────

  @Post('gynecology/record')
  @ApiOperation({ summary: 'Create gynecology record (Pap smear, colposcopy, Bethesda)' })
  async gynecologyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      recordType: 'PAP_SMEAR' | 'COLPOSCOPY' | 'BOTH';
      papResult?: string;
      colposcopy?: Record<string, unknown>;
    },
  ) {
    return this.service.createGynecologyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createGynecologyRecord>[1]);
  }

  // ─── Prenatal ────────────────────────────────────────────────────────

  @Post('prenatal/record')
  @ApiOperation({ summary: 'Create digital prenatal card (LMP, EDD, GA, visits, US, vaccines)' })
  async prenatalRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      lmp: string;
      edd?: string;
      currentGA?: { weeks: number; days: number };
      visits: Array<Record<string, unknown>>;
      ultrasounds?: Array<Record<string, unknown>>;
      vaccines?: Array<Record<string, unknown>>;
      labs?: Array<Record<string, unknown>>;
      riskClassification: 'HABITUAL' | 'HIGH_RISK';
      riskFactors?: string[];
    },
  ) {
    return this.service.createPrenatalRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createPrenatalRecord>[1]);
  }

  // ─── Partogram ───────────────────────────────────────────────────────

  @Post('partogram')
  @ApiOperation({ summary: 'Create digital partogram (dilation, descent, contractions, FHR)' })
  async partogram(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      entries: Array<Record<string, unknown>>;
      laborStart: string;
      membraneRupture?: string;
      amniotiFluidType?: string;
    },
  ) {
    return this.service.createPartogram(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createPartogram>[1]);
  }

  // ─── Pediatrics ──────────────────────────────────────────────────────

  @Post('pediatrics/assessment')
  @ApiOperation({ summary: 'Create pediatrics assessment (Denver II, growth curves, vaccines)' })
  async pediatricsAssessment(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      ageMonths: number;
      weight: number;
      height: number;
      headCircumference?: number;
      denverII?: Record<string, unknown>;
      growthPercentiles?: Record<string, unknown>;
      vaccines?: Array<Record<string, unknown>>;
    },
  ) {
    return this.service.createPediatricsAssessment(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createPediatricsAssessment>[1]);
  }

  // ─── Neonatology ─────────────────────────────────────────────────────

  @Post('neonatology/record')
  @ApiOperation({ summary: 'Create neonatology record (Apgar, Capurro/Ballard, Fenton, phototherapy, NPT)' })
  async neonatologyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      apgar: { min1: number; min5: number; min10?: number };
      gestationalAge?: Record<string, unknown>;
      birthWeight: number;
      birthLength: number;
      headCircumference: number;
      classification?: string;
      phototherapy?: Record<string, unknown>;
      npt?: Record<string, unknown>;
      complications?: string[];
    },
  ) {
    return this.service.createNeonatologyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createNeonatologyRecord>[1]);
  }

  // ─── Psychiatry ──────────────────────────────────────────────────────

  @Post('psychiatry/assessment')
  @ApiOperation({ summary: 'Create psychiatry assessment (PHQ-9, GAD-7, MINI, Columbia, PTSD)' })
  async psychiatryAssessment(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      phq9?: Record<string, unknown>;
      gad7?: Record<string, unknown>;
      mini?: Record<string, unknown>;
      csrs?: Record<string, unknown>;
      ptsd?: Record<string, unknown>;
      mentalStatusExam?: Record<string, unknown>;
    },
  ) {
    return this.service.createPsychiatryAssessment(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createPsychiatryAssessment>[1]);
  }

  // ─── Dermatology ─────────────────────────────────────────────────────

  @Post('dermatology/record')
  @ApiOperation({ summary: 'Create dermatology record (photos, dermoscopy, nevus mapping)' })
  async dermatologyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      photoDocumentation?: Array<Record<string, unknown>>;
      dermoscopy?: Array<Record<string, unknown>>;
      nevusMapping?: Record<string, unknown>;
    },
  ) {
    return this.service.createDermatologyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createDermatologyRecord>[1]);
  }

  // ─── Ophthalmology ───────────────────────────────────────────────────

  @Post('ophthalmology/record')
  @ApiOperation({ summary: 'Create ophthalmology record (Snellen, tonometry, OCT, visual fields)' })
  async ophthalmologyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      snellen?: Record<string, unknown>;
      tonometry?: Record<string, unknown>;
      oct?: Record<string, unknown>;
      visualFields?: Record<string, unknown>;
    },
  ) {
    return this.service.createOphthalmologyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createOphthalmologyRecord>[1]);
  }

  // ─── ENT ─────────────────────────────────────────────────────────────

  @Post('ent/record')
  @ApiOperation({ summary: 'Create ENT record (audiometry, impedance, BERA, nasofibroscopy)' })
  async entRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      audiometry?: Record<string, unknown>;
      impedance?: Record<string, unknown>;
      bera?: Record<string, unknown>;
      nasofibroscopy?: Record<string, unknown>;
    },
  ) {
    return this.service.createENTRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createENTRecord>[1]);
  }

  // ─── Endocrinology ───────────────────────────────────────────────────

  @Post('endocrinology/record')
  @ApiOperation({ summary: 'Create endocrinology record (insulin protocol, HbA1c, thyroid)' })
  async endocrinologyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      insulinProtocol?: Record<string, unknown>;
      hba1cTracking?: Array<Record<string, unknown>>;
      thyroid?: Record<string, unknown>;
    },
  ) {
    return this.service.createEndocrinologyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createEndocrinologyRecord>[1]);
  }

  // ─── Rheumatology ────────────────────────────────────────────────────

  @Post('rheumatology/record')
  @ApiOperation({ summary: 'Create rheumatology record (DAS28, HAQ, BASDAI, joint homunculus)' })
  async rheumatologyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      das28?: Record<string, unknown>;
      haq?: Record<string, unknown>;
      basdai?: Record<string, unknown>;
      jointHomunculus?: Array<Record<string, unknown>>;
    },
  ) {
    return this.service.createRheumatologyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createRheumatologyRecord>[1]);
  }

  // ─── Pulmonology ─────────────────────────────────────────────────────

  @Post('pulmonology/record')
  @ApiOperation({ summary: 'Create pulmonology record (spirometry/GOLD, CAT, ACT)' })
  async pulmonologyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      spirometry?: Record<string, unknown>;
      catScore?: number;
      actScore?: number;
    },
  ) {
    return this.service.createPulmonologyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createPulmonologyRecord>[1]);
  }

  // ─── Nutrition ───────────────────────────────────────────────────────

  @Post('nutrition/assessment')
  @ApiOperation({ summary: 'Create nutrition assessment (NRS-2002, SGA, meal plan, calories)' })
  async nutritionAssessment(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      nrs2002?: Record<string, unknown>;
      sga?: Record<string, unknown>;
      mealPlan?: Record<string, unknown>;
      anthropometry?: Record<string, unknown>;
    },
  ) {
    return this.service.createNutritionAssessment(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createNutritionAssessment>[1]);
  }

  // ─── Physiotherapy ───────────────────────────────────────────────────

  @Post('physiotherapy/record')
  @ApiOperation({ summary: 'Create physiotherapy record (MRC, goniometry, 6MWT, Barthel, FIM)' })
  async physiotherapyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      mrc?: Array<Record<string, unknown>>;
      goniometry?: Array<Record<string, unknown>>;
      sixMinWalk?: Record<string, unknown>;
      barthel?: Record<string, unknown>;
      fim?: Record<string, unknown>;
      rehabPlan?: Record<string, unknown>;
    },
  ) {
    return this.service.createPhysiotherapyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createPhysiotherapyRecord>[1]);
  }

  // ─── Speech Therapy ──────────────────────────────────────────────────

  @Post('speech-therapy/record')
  @ApiOperation({ summary: 'Create speech therapy record (swallowing, FOIS, voice/language therapy)' })
  async speechTherapyRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      swallowingAssessment?: Record<string, unknown>;
      fois?: number;
      voiceTherapy?: Record<string, unknown>;
      languageTherapy?: Record<string, unknown>;
    },
  ) {
    return this.service.createSpeechTherapyRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createSpeechTherapyRecord>[1]);
  }

  // ─── Occupational Therapy ────────────────────────────────────────────

  @Post('ot/record')
  @ApiOperation({ summary: 'Create OT record (ADL, Katz index, assistive tech, home adaptation)' })
  async otRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      adlAssessment?: Array<Record<string, unknown>>;
      katzIndex?: Record<string, unknown>;
      assistiveTechnology?: Array<Record<string, unknown>>;
      homeAdaptation?: Array<Record<string, unknown>>;
    },
  ) {
    return this.service.createOTRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createOTRecord>[1]);
  }

  // ─── Social Work ─────────────────────────────────────────────────────

  @Post('social-work/record')
  @ApiOperation({ summary: 'Create social work record (socioeconomic, vulnerability, CRAS/CREAS)' })
  async socialWorkRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      socioeconomic?: Record<string, unknown>;
      supportNetwork?: Record<string, unknown>;
      vulnerability?: Record<string, unknown>;
      referrals?: Array<Record<string, unknown>>;
    },
  ) {
    return this.service.createSocialWorkRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createSocialWorkRecord>[1]);
  }

  // ─── Palliative Care ─────────────────────────────────────────────────

  @Post('palliative-care/record')
  @ApiOperation({ summary: 'Create palliative care record (PPS, ESAS, Karnofsky, advance directives)' })
  async palliativeCareRecord(
    @CurrentTenant() t: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      patientId: string;
      encounterId?: string;
      pps?: number;
      esas?: Record<string, unknown>;
      karnofsky?: number;
      advanceDirectives?: Record<string, unknown>;
      endOfLifePlan?: Record<string, unknown>;
    },
  ) {
    return this.service.createPalliativeCareRecord(t, { ...dto, authorId: user.sub } as Parameters<typeof this.service.createPalliativeCareRecord>[1]);
  }

  // ─── Query records ───────────────────────────────────────────────────

  @Get(':specialty/patient/:patientId')
  @ApiOperation({ summary: 'Get all specialty records for a patient' })
  @ApiParam({ name: 'specialty', description: 'Specialty name (e.g., CARDIOLOGY, NEPHROLOGY)' })
  @ApiParam({ name: 'patientId' })
  async getSpecialtyRecords(
    @CurrentTenant() t: string,
    @Param('specialty') specialty: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyRecords(t, patientId, specialty);
  }

  @Get('all/patient/:patientId')
  @ApiOperation({ summary: 'Get all specialty records across all specialties for a patient' })
  @ApiParam({ name: 'patientId' })
  async getAllSpecialtyRecords(
    @CurrentTenant() t: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getSpecialtyRecords(t, patientId);
  }
}
