import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { VoiceEngineService } from './voice-engine.service';
import { MedicalNerService } from './medical-ner.service';
import { SoapGeneratorService } from './soap-generator.service';
import { PrescriptionAiService } from './prescription-ai.service';
import { TriageAiService } from './triage-ai.service';
import { DischargeAiService } from './discharge-ai.service';
import { ClinicalCopilotService } from './clinical-copilot.service';
import { PatientSummaryAiService } from './patient-summary-ai.service';
import { CodingAiService } from './coding-ai.service';
import { HandoffAiService } from './handoff-ai.service';
import { PredictiveAiService } from './predictive-ai.service';
import { AiController } from './ai.controller';
import { VoiceTranscriptionController } from './voice-transcription.controller';
import { VoiceTranscriptionService } from './voice-transcription.service';
import { PatientContextBuilder } from './patient-context.builder';
import { AiCacheService } from './ai-cache.service';
import { VoiceCommandService } from './voice-command.service';
import { ExamRequestAiService } from './exam-request-ai.service';
import { CertificateAiService } from './certificate-ai.service';
import { ReferralAiService } from './referral-ai.service';
import { VitalsAiService } from './vitals-ai.service';
import { DischargeVoiceService } from './discharge-voice.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiController, VoiceTranscriptionController],
  providers: [
    OpenAiProvider,
    GeminiProvider,
    VoiceEngineService,
    MedicalNerService,
    SoapGeneratorService,
    PrescriptionAiService,
    TriageAiService,
    DischargeAiService,
    ClinicalCopilotService,
    PatientSummaryAiService,
    CodingAiService,
    HandoffAiService,
    PredictiveAiService,
    VoiceTranscriptionService,
    PatientContextBuilder,
    AiCacheService,
    VoiceCommandService,
    ExamRequestAiService,
    CertificateAiService,
    ReferralAiService,
    VitalsAiService,
    DischargeVoiceService,
  ],
  exports: [
    GeminiProvider,
    VoiceEngineService,
    MedicalNerService,
    SoapGeneratorService,
    PrescriptionAiService,
    TriageAiService,
    DischargeAiService,
    ClinicalCopilotService,
    PatientSummaryAiService,
    CodingAiService,
    HandoffAiService,
    PredictiveAiService,
    VoiceTranscriptionService,
    PatientContextBuilder,
    AiCacheService,
    VoiceCommandService,
    ExamRequestAiService,
    CertificateAiService,
    ReferralAiService,
    VitalsAiService,
    DischargeVoiceService,
  ],
})
export class AiModule {}
