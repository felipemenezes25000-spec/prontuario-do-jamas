import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { EncountersModule } from './modules/encounters/encounters.module';
import { ClinicalNotesModule } from './modules/clinical-notes/clinical-notes.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { VitalSignsModule } from './modules/vital-signs/vital-signs.module';
import { NursingModule } from './modules/nursing/nursing.module';
import { TriageModule } from './modules/triage/triage.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { SurgicalModule } from './modules/surgical/surgical.module';
import { ExamsModule } from './modules/exams/exams.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { BillingModule } from './modules/billing/billing.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { SearchModule } from './modules/search/search.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { StorageModule } from './modules/storage/storage.module';
import { QueuesModule } from './modules/queues/queues.module';
import { LgpdModule } from './modules/lgpd/lgpd.module';
import { DigitalSignatureModule } from './modules/digital-signature/digital-signature.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ChemotherapyModule } from './modules/chemotherapy/chemotherapy.module';
import { DrugsModule } from './modules/drugs/drugs.module';
import { ProtocolsModule } from './modules/protocols/protocols.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TelemedicineModule } from './modules/telemedicine/telemedicine.module';
import { BookingModule } from './modules/booking/booking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    PatientsModule,
    EncountersModule,
    ClinicalNotesModule,
    PrescriptionsModule,
    VitalSignsModule,
    NursingModule,
    TriageModule,
    AdmissionsModule,
    SurgicalModule,
    ExamsModule,
    DocumentsModule,
    AlertsModule,
    AppointmentsModule,
    BillingModule,
    AuditModule,
    NotificationsModule,
    AiModule,
    SearchModule,
    RealtimeModule,
    StorageModule,
    QueuesModule,
    LgpdModule,
    DigitalSignatureModule,
    DashboardModule,
    ChemotherapyModule,
    DrugsModule,
    ProtocolsModule,
    IntegrationsModule,
    ReportsModule,
    TelemedicineModule,
    BookingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
