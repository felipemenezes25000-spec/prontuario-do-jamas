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

// New AI sub-module controllers and services
import { AmbientListeningController } from './ambient-listening/ambient-listening.controller';
import { AmbientListeningService } from './ambient-listening/ambient-listening.service';
import { AgenticAiController } from './agentic-ai/agentic-ai.controller';
import { AgenticAiService } from './agentic-ai/agentic-ai.service';
import { AiCodingController } from './ai-coding/ai-coding.controller';
import { AiCodingService } from './ai-coding/ai-coding.service';
import { NlpController } from './nlp/nlp.controller';
import { NlpService } from './nlp/nlp.service';
import { AiImagingController } from './ai-imaging/ai-imaging.controller';
import { AiImagingService } from './ai-imaging/ai-imaging.service';
import { AiRevolutionaryController } from './ai-revolutionary/ai-revolutionary.controller';
import { AiRevolutionaryService } from './ai-revolutionary/ai-revolutionary.service';
import { ImagingAnalysisController } from './imaging-analysis/imaging-analysis.controller';
import { ImagingAnalysisService } from './imaging-analysis/imaging-analysis.service';
import { ClinicalDecisionController } from './clinical-decision/clinical-decision.controller';
import { ClinicalDecisionService } from './clinical-decision/clinical-decision.service';
import { PredictiveAnalyticsController } from './predictive-analytics/predictive-analytics.controller';
import { PredictiveAnalyticsService } from './predictive-analytics/predictive-analytics.service';
import { VoiceNlpController } from './voice-nlp/voice-nlp.controller';
import { VoiceNlpService } from './voice-nlp/voice-nlp.service';
import { AdvancedAiController } from './advanced/advanced-ai.controller';
import { AdvancedAiService } from './advanced/advanced-ai.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    AiController,
    VoiceTranscriptionController,
    AmbientListeningController,
    AgenticAiController,
    AiCodingController,
    NlpController,
    AiImagingController,
    AiRevolutionaryController,
    ImagingAnalysisController,
    ClinicalDecisionController,
    PredictiveAnalyticsController,
    VoiceNlpController,
    AdvancedAiController,
  ],
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
    // New AI sub-module services
    AmbientListeningService,
    AgenticAiService,
    AiCodingService,
    NlpService,
    AiImagingService,
    AiRevolutionaryService,
    ImagingAnalysisService,
    ClinicalDecisionService,
    PredictiveAnalyticsService,
    AdvancedAiService,
    VoiceNlpService,
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
    AmbientListeningService,
    AgenticAiService,
    AiCodingService,
    NlpService,
    AiImagingService,
    AiRevolutionaryService,
    ImagingAnalysisService,
    ClinicalDecisionService,
    PredictiveAnalyticsService,
    AdvancedAiService,
    VoiceNlpService,
  ],
})
export class AiModule {}
