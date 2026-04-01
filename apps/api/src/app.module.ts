import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './common/cache/cache.module';
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
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { PopulationHealthModule } from './modules/population-health/population-health.module';
import { InfectionControlModule } from './modules/infection-control/infection-control.module';
import { PatientPortalModule } from './modules/patient-portal/patient-portal.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { PhysiotherapyModule } from './modules/physiotherapy/physiotherapy.module';
import { PsychologyModule } from './modules/psychology/psychology.module';
import { SocialWorkModule } from './modules/social-work/social-work.module';
import { OccupationalTherapyModule } from './modules/occupational-therapy/occupational-therapy.module';
import { SpeechTherapyModule } from './modules/speech-therapy/speech-therapy.module';
import { PalliativeCareModule } from './modules/palliative-care/palliative-care.module';
import { HomeCareModule } from './modules/home-care/home-care.module';
import { PediatricsModule } from './modules/pediatrics/pediatrics.module';
import { ObstetricsModule } from './modules/obstetrics/obstetrics.module';
import { NeonatologyModule } from './modules/neonatology/neonatology.module';
// Patient Safety Modules
import { FallRiskModule } from './modules/fall-risk/fall-risk.module';
import { PressureInjuryModule } from './modules/pressure-injury/pressure-injury.module';
import { WoundCareModule } from './modules/wound-care/wound-care.module';
import { SepsisModule } from './modules/sepsis/sepsis.module';
import { StrokeProtocolModule } from './modules/stroke-protocol/stroke-protocol.module';
import { ChestPainModule } from './modules/chest-pain/chest-pain.module';
import { IncidentReportingModule } from './modules/incident-reporting/incident-reporting.module';
import { BcmaModule } from './modules/bcma/bcma.module';
import { CdsEngineModule } from './modules/cds-engine/cds-engine.module';
// Pharmacy Modules
import { MedicationReconciliationModule } from './modules/medication-reconciliation/medication-reconciliation.module';
import { ClinicalPharmacyModule } from './modules/clinical-pharmacy/clinical-pharmacy.module';
import { PyxisIntegrationModule } from './modules/pyxis-integration/pyxis-integration.module';
import { ParenteralNutritionModule } from './modules/parenteral-nutrition/parenteral-nutrition.module';
import { AntimicrobialStewardshipModule } from './modules/antimicrobial-stewardship/antimicrobial-stewardship.module';
// Analytics Modules
import { AnalyticsModule } from './modules/analytics/analytics.module';
// Diagnostics Modules
import { LisModule } from './modules/lis/lis.module';
import { RisPacsModule } from './modules/ris-pacs/ris-pacs.module';
import { GenomicsModule } from './modules/genomics/genomics.module';
import { PathologyModule } from './modules/pathology/pathology.module';
import { MicrobiologyModule } from './modules/microbiology/microbiology.module';
import { BloodBankModule } from './modules/blood-bank/blood-bank.module';
import { CardiologyModule } from './modules/cardiology/cardiology.module';
// Interoperability Modules
import { RndsModule } from './modules/rnds/rnds.module';
import { SmartOnFhirModule } from './modules/smart-on-fhir/smart-on-fhir.module';
import { CdsHooksModule } from './modules/cds-hooks/cds-hooks.module';
import { BulkFhirModule } from './modules/bulk-fhir/bulk-fhir.module';
import { IheProfilesModule } from './modules/ihe-profiles/ihe-profiles.module';
// Hospital Operations Modules
import { CmeModule } from './modules/cme/cme.module';
import { EquipmentMaintenanceModule } from './modules/equipment-maintenance/equipment-maintenance.module';
import { HospitalityModule } from './modules/hospitality/hospitality.module';
import { QueueManagementModule } from './modules/queue-management/queue-management.module';
import { TransferCenterModule } from './modules/transfer-center/transfer-center.module';
// Compliance & Governance Modules
import { SbisComplianceModule } from './modules/sbis-compliance/sbis-compliance.module';
import { CredentialingModule } from './modules/credentialing/credentialing.module';
import { BreakTheGlassModule } from './modules/break-the-glass/break-the-glass.module';
// Advanced Analytics Modules
import { DataWarehouseModule } from './modules/data-warehouse/data-warehouse.module';
import { SelfServiceAnalyticsModule } from './modules/self-service-analytics/self-service-analytics.module';
import { ClinicalResearchModule } from './modules/clinical-research/clinical-research.module';
// Clinical Documentation & Anamnesis Modules
import { ClinicalDocumentationModule } from './modules/clinical-documentation/clinical-documentation.module';
import { AnamnesisModule } from './modules/anamnesis/anamnesis.module';
// ICU & Discharge Modules
import { IcuModule } from './modules/icu/icu.module';
import { IcuMonitoringModule } from './modules/icu-monitoring/icu-monitoring.module';
import { DischargePlanningModule } from './modules/discharge-planning/discharge-planning.module';
// Enhanced Modules
import { TelemedicineEnhancedModule } from './modules/telemedicine-enhanced/telemedicine-enhanced.module';
import { SchedulingEnhancedModule } from './modules/scheduling-enhanced/scheduling-enhanced.module';
import { InteropBrazilModule } from './modules/interop-brazil/interop-brazil.module';
// Clinical Pathways & Protocols
import { ClinicalPathwaysModule } from './modules/clinical-pathways/clinical-pathways.module';
// Backup & Disaster Recovery
import { BackupRecoveryModule } from './modules/backup-recovery/backup-recovery.module';
// New Modules (Supply Chain, Hospital Services, Governance, Specialties)
import { SupplyChainModule } from './modules/supply-chain/supply-chain.module';
import { HospitalServicesModule } from './modules/hospital-services/hospital-services.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { SpecialtiesEnhancedModule } from './modules/specialties-enhanced/specialties-enhanced.module';
// Hospital Management Modules
import { WasteManagementModule } from './modules/waste-management/waste-management.module';
import { OmbudsmanModule } from './modules/ombudsman/ombudsman.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { ContractsModule } from './modules/contracts/contracts.module';
// Medical Records, Calculators, Food Service
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { MedicalCalculatorsModule } from './modules/medical-calculators/medical-calculators.module';
import { FoodServiceModule } from './modules/food-service/food-service.module';
// Emergency Protocols
import { CardiacArrestModule } from './modules/cardiac-arrest/cardiac-arrest.module';
// Identity Verification & Accreditation
import { IdentityVerificationModule } from './modules/identity-verification/identity-verification.module';
import { AccreditationModule } from './modules/accreditation/accreditation.module';
// Device Integration (IEEE 11073 & Remote Exam Devices)
import { DeviceIntegrationModule } from './modules/device-integration/device-integration.module';
// Clinical History & Anamnesis
import { ClinicalHistoryModule } from './modules/clinical-history/clinical-history.module';
// Patient Safety Advanced & Hospital Management Consolidated Modules
import { PatientSafetyModule } from './modules/patient-safety/patient-safety.module';
import { HospitalManagementModule } from './modules/hospital-management/hospital-management.module';
// Document OCR & Trauma Protocol
import { DocumentOcrModule } from './modules/document-ocr/document-ocr.module';
import { TraumaProtocolModule } from './modules/trauma-protocol/trauma-protocol.module';
// Accessibility
import { AccessibilityModule } from './modules/accessibility/accessibility.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    CacheModule,
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
    PharmacyModule,
    PopulationHealthModule,
    InfectionControlModule,
    PatientPortalModule,
    // Clinical Specialty Modules
    EmergencyModule,
    NutritionModule,
    PhysiotherapyModule,
    PsychologyModule,
    SocialWorkModule,
    OccupationalTherapyModule,
    SpeechTherapyModule,
    PalliativeCareModule,
    HomeCareModule,
    PediatricsModule,
    ObstetricsModule,
    NeonatologyModule,
    // Patient Safety Modules
    FallRiskModule,
    PressureInjuryModule,
    WoundCareModule,
    SepsisModule,
    StrokeProtocolModule,
    ChestPainModule,
    IncidentReportingModule,
    BcmaModule,
    CdsEngineModule,
    // Pharmacy Modules
    MedicationReconciliationModule,
    ClinicalPharmacyModule,
    PyxisIntegrationModule,
    ParenteralNutritionModule,
    AntimicrobialStewardshipModule,
    // Analytics Modules
    AnalyticsModule,
    // Diagnostics Modules
    LisModule,
    RisPacsModule,
    GenomicsModule,
    PathologyModule,
    MicrobiologyModule,
    BloodBankModule,
    CardiologyModule,
    // Interoperability Modules
    RndsModule,
    SmartOnFhirModule,
    CdsHooksModule,
    BulkFhirModule,
    IheProfilesModule,
    // Hospital Operations
    CmeModule,
    EquipmentMaintenanceModule,
    HospitalityModule,
    QueueManagementModule,
    TransferCenterModule,
    // Compliance & Governance
    SbisComplianceModule,
    CredentialingModule,
    BreakTheGlassModule,
    // Advanced Analytics
    DataWarehouseModule,
    SelfServiceAnalyticsModule,
    ClinicalResearchModule,
    // Clinical Documentation & Anamnesis
    ClinicalDocumentationModule,
    AnamnesisModule,
    // ICU & Discharge Planning
    IcuModule,
    IcuMonitoringModule,
    DischargePlanningModule,
    // Enhanced Modules
    TelemedicineEnhancedModule,
    SchedulingEnhancedModule,
    InteropBrazilModule,
    // Clinical Pathways & Protocols
    ClinicalPathwaysModule,
    // Backup & Disaster Recovery
    BackupRecoveryModule,
    // New Modules
    SupplyChainModule,
    HospitalServicesModule,
    GovernanceModule,
    SpecialtiesEnhancedModule,
    // Hospital Management
    WasteManagementModule,
    OmbudsmanModule,
    ProcurementModule,
    ContractsModule,
    // Medical Records, Calculators, Food Service
    MedicalRecordsModule,
    MedicalCalculatorsModule,
    FoodServiceModule,
    // Emergency Protocols
    CardiacArrestModule,
    // Identity Verification & Accreditation
    IdentityVerificationModule,
    AccreditationModule,
    // Device Integration (IEEE 11073 & Remote Exam Devices)
    DeviceIntegrationModule,
    // Clinical History & Anamnesis
    ClinicalHistoryModule,
    // Patient Safety Advanced (adverse events, near-miss, positive ID, RCA, VTE, SSI)
    PatientSafetyModule,
    // Hospital Management (supply, SND, laundry, waste, procurement, contracts, ombudsman, SAME)
    HospitalManagementModule,
    // Document OCR & Trauma Protocol
    DocumentOcrModule,
    TraumaProtocolModule,
    // Accessibility
    AccessibilityModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
