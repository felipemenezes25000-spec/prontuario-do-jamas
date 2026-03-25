import { Module } from '@nestjs/common';
import { PatientPortalService } from './patient-portal.service';
import { PatientPortalController } from './patient-portal.controller';
import { OnlineSchedulingModule } from './online-scheduling/online-scheduling.module';
import { DigitalCheckinModule } from './digital-checkin/digital-checkin.module';
import { ExamResultsPortalModule } from './exam-results-portal/exam-results-portal.module';
import { PatientMessagingModule } from './patient-messaging/patient-messaging.module';
import { PrescriptionRenewalModule } from './prescription-renewal/prescription-renewal.module';
import { ProxyAccessModule } from './proxy-access/proxy-access.module';
import { PatientSurveysModule } from './patient-surveys/patient-surveys.module';
import { PatientEducationModule } from './patient-education/patient-education.module';
import { OnlinePaymentModule } from './online-payment/online-payment.module';
// New sub-modules
import { HealthDiaryModule } from './health-diary/health-diary.module';
import { DocumentUploadModule } from './document-upload/document-upload.module';
import { RemindersModule } from './reminders/reminders.module';
import { AiFeaturesModule } from './ai-features/ai-features.module';

@Module({
  imports: [
    OnlineSchedulingModule,
    DigitalCheckinModule,
    ExamResultsPortalModule,
    PatientMessagingModule,
    PrescriptionRenewalModule,
    ProxyAccessModule,
    PatientSurveysModule,
    PatientEducationModule,
    OnlinePaymentModule,
    // New portal features
    HealthDiaryModule,
    DocumentUploadModule,
    RemindersModule,
    AiFeaturesModule,
  ],
  controllers: [PatientPortalController],
  providers: [PatientPortalService],
  exports: [PatientPortalService],
})
export class PatientPortalModule {}
