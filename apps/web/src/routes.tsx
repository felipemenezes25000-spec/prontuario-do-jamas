import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { MainLayout } from '@/components/layout/main-layout';

// Lazy imports for code-splitting
import { lazy, Suspense, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const LoginPage = lazy(() => import('@/pages/auth/login'));
const MfaVerifyPage = lazy(() => import('@/pages/auth/mfa-verify'));
const SSOCallbackPage = lazy(() => import('@/pages/auth/sso-callback'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const PatientsListPage = lazy(() => import('@/pages/patients'));
const PatientDetailPage = lazy(() => import('@/pages/patients/[id]'));
const PatientNewPage = lazy(() => import('@/pages/patients/new'));
const EncountersListPage = lazy(() => import('@/pages/encounters'));
const EncounterPage = lazy(() => import('@/pages/encounters/[id]'));
const TriagePage = lazy(() => import('@/pages/triage'));
const TriagePanelPage = lazy(() => import('@/pages/triage/panel'));
const AdmissionsPage = lazy(() => import('@/pages/admissions'));
const NursingPage = lazy(() => import('@/pages/nursing'));
const NursingSchedulePage = lazy(() => import('@/pages/nursing/schedule'));
const SAEPage = lazy(() => import('@/pages/nursing/sae'));
const FluidBalancePage = lazy(() => import('@/pages/nursing/fluid-balance'));
const AppointmentsPage = lazy(() => import('@/pages/appointments'));
const SurgicalPage = lazy(() => import('@/pages/surgical'));
const ExamsPage = lazy(() => import('@/pages/exams'));
const BillingPage = lazy(() => import('@/pages/billing'));
const ReportsPage = lazy(() => import('@/pages/reports'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const AdminPage = lazy(() => import('@/pages/admin'));
const PharmacyPage = lazy(() => import('@/pages/pharmacy'));
const ChemotherapyPage = lazy(() => import('@/pages/chemotherapy'));
const BookingPage = lazy(() => import('@/pages/booking'));
const PrescriptionsPage = lazy(() => import('@/pages/prescriptions'));
const TelemedicinePage = lazy(() => import('@/pages/telemedicine'));
const TelemedicineRoomPage = lazy(() => import('@/pages/telemedicine/[roomName]'));
const EncounterNewPage = lazy(() => import('@/pages/encounters/new'));
const HandoffPage = lazy(() => import('@/pages/nursing/handoff'));
const PopulationHealthPage = lazy(() => import('@/pages/population-health'));
const InfectionControlPage = lazy(() => import('@/pages/infection-control'));
const PatientPortalPage = lazy(() => import('@/pages/patient-portal'));
const EmergencyPage = lazy(() => import('@/pages/emergency'));
const NutritionPage = lazy(() => import('@/pages/nutrition'));
const PhysiotherapyPage = lazy(() => import('@/pages/physiotherapy'));
const PsychologyPage = lazy(() => import('@/pages/psychology'));
const SocialWorkPage = lazy(() => import('@/pages/social-work'));
const OccupationalTherapyPage = lazy(() => import('@/pages/occupational-therapy'));
const SpeechTherapyPage = lazy(() => import('@/pages/speech-therapy'));
const PalliativeCarePage = lazy(() => import('@/pages/palliative-care'));
const HomeCarePage = lazy(() => import('@/pages/home-care'));
const PediatricsPage = lazy(() => import('@/pages/pediatrics'));
const ObstetricsPage = lazy(() => import('@/pages/obstetrics'));
const NeonatologyPage = lazy(() => import('@/pages/neonatology'));
const FallRiskPage = lazy(() => import('@/pages/fall-risk'));
const PressureInjuryPage = lazy(() => import('@/pages/pressure-injury'));
const WoundCarePage = lazy(() => import('@/pages/wound-care'));
const SepsisPage = lazy(() => import('@/pages/sepsis'));
const StrokeProtocolPage = lazy(() => import('@/pages/stroke-protocol'));
const ChestPainPage = lazy(() => import('@/pages/chest-pain'));
const IncidentReportingPage = lazy(() => import('@/pages/incident-reporting'));
const BcmaPage = lazy(() => import('@/pages/bcma'));
const CdsEnginePage = lazy(() => import('@/pages/cds-engine'));
const MedicationReconciliationPage = lazy(() => import('@/pages/medication-reconciliation'));
const ClinicalPharmacyPage = lazy(() => import('@/pages/clinical-pharmacy'));
const PyxisPage = lazy(() => import('@/pages/pyxis'));
const ParenteralNutritionPage = lazy(() => import('@/pages/parenteral-nutrition'));
const AntimicrobialStewardshipPage = lazy(() => import('@/pages/antimicrobial-stewardship'));
const RisPacsPage = lazy(() => import('@/pages/ris-pacs'));
const GenomicsPage = lazy(() => import('@/pages/genomics'));
const PathologyPage = lazy(() => import('@/pages/pathology'));
const MicrobiologyPage = lazy(() => import('@/pages/microbiology'));
const BloodBankPage = lazy(() => import('@/pages/blood-bank'));
const CardiologyPage = lazy(() => import('@/pages/cardiology'));
const BillingCodingPage = lazy(() => import('@/pages/billing/coding'));
const BillingPriorAuthPage = lazy(() => import('@/pages/billing/prior-auth'));
const BillingFinancialPage = lazy(() => import('@/pages/billing/financial'));
const InteroperabilityPage = lazy(() => import('@/pages/interoperability'));
const CmePage = lazy(() => import('@/pages/cme'));
const EquipmentPage = lazy(() => import('@/pages/equipment'));
const HospitalityPage = lazy(() => import('@/pages/hospitality'));
const QueueManagementPage = lazy(() => import('@/pages/queue-management'));
const TransferCenterPage = lazy(() => import('@/pages/transfer-center'));
const CompliancePage = lazy(() => import('@/pages/compliance'));
const CredentialingPage = lazy(() => import('@/pages/credentialing'));
const BreakTheGlassPage = lazy(() => import('@/pages/break-the-glass'));
const AiHubPage = lazy(() => import('@/pages/ai'));
const AiClinicalDecisionPage = lazy(() => import('@/pages/ai/clinical-decision'));
const VoiceNlpPage = lazy(() => import('@/pages/ai/voice-nlp'));
const AiPredictivePage = lazy(() => import('@/pages/ai/predictive'));
const AnalyticsPage = lazy(() => import('@/pages/analytics'));
const LisPage = lazy(() => import('@/pages/lis'));
const ClinicalDocumentationPage = lazy(() => import('@/pages/clinical-documentation'));
const AnamnesisPage = lazy(() => import('@/pages/anamnesis'));
const IcuPage = lazy(() => import('@/pages/icu'));
const DischargePlanningPage = lazy(() => import('@/pages/discharge-planning'));
const ProtocolsPage = lazy(() => import('@/pages/protocols'));
const TelemedicineEnhancedPage = lazy(() => import('@/pages/telemedicine/enhanced'));
const SchedulingEnhancedPage = lazy(() => import('@/pages/scheduling-enhanced'));
const InteropBrazilPage = lazy(() => import('@/pages/interoperability/brazil'));
const SupplyChainPage = lazy(() => import('@/pages/supply-chain'));
const HospitalServicesPage = lazy(() => import('@/pages/hospital-services'));
const GovernancePage = lazy(() => import('@/pages/governance'));
const SpecialtiesPage = lazy(() => import('@/pages/specialties'));
const ClinicalResearchPage = lazy(() => import('@/pages/clinical-research'));
const DataWarehousePage = lazy(() => import('@/pages/data-warehouse'));
const VitalSignsPage = lazy(() => import('@/pages/vital-signs'));
const PatientsEnhancedPage = lazy(() => import('@/pages/patients-enhanced'));
const BillingChargeCapturesPage = lazy(() => import('@/pages/billing/charge-capture'));
const SafetyPage = lazy(() => import('@/pages/safety/index'));
const BillingDrgPage = lazy(() => import('@/pages/billing/drg'));
const BillingPrivatePayPage = lazy(() => import('@/pages/billing/private-pay'));
const RegulatoryPage = lazy(() => import('@/pages/regulatory'));
const AiImagingAnalysisPage = lazy(() => import('@/pages/ai/imaging-analysis'));
const AiAdvancedPage = lazy(() => import('@/pages/ai/advanced'));
const NursingEnhancedPage = lazy(() => import('@/pages/nursing-enhanced'));
const SelfServiceAnalyticsPage = lazy(() => import('@/pages/self-service-analytics'));
const BulkFhirPage = lazy(() => import('@/pages/bulk-fhir'));
const ClinicalPathwaysPage = lazy(() => import('@/pages/clinical-pathways'));
const TelemedicineEnhancedFullPage = lazy(() => import('@/pages/telemedicine-enhanced'));
const DigitalSignaturePage = lazy(() => import('@/pages/digital-signature'));
const NotificationsPage = lazy(() => import('@/pages/notifications'));
const AlertsPage = lazy(() => import('@/pages/alerts'));
const AuditPage = lazy(() => import('@/pages/audit'));
const CDSHooksPage = lazy(() => import('@/pages/cds-hooks'));
const RNDSPage = lazy(() => import('@/pages/rnds'));
const DocumentsPage = lazy(() => import('@/pages/documents'));
const IntegrationsPage = lazy(() => import('@/pages/integrations'));
const InteropBrazilDashPage = lazy(() => import('@/pages/interop-brazil'));
const EquipmentMaintenancePage = lazy(() => import('@/pages/equipment-maintenance'));
const IHEProfilesPage = lazy(() => import('@/pages/ihe-profiles'));
const SBISCompliancePage = lazy(() => import('@/pages/sbis-compliance'));
const SMARTOnFHIRPage = lazy(() => import('@/pages/smart-on-fhir'));
const DrugsPage = lazy(() => import('@/pages/drugs'));
const ClinicalNotesPage = lazy(() => import('@/pages/clinical-notes'));
const QueuesPage = lazy(() => import('@/pages/queues'));
const GlobalSearchPage = lazy(() => import('@/pages/search'));
const UsersManagementPage = lazy(() => import('@/pages/users'));
const TenantsPage = lazy(() => import('@/pages/tenants'));
const MedicalRecordsPage = lazy(() => import('@/pages/medical-records'));
const MedicalCalculatorsPage = lazy(() => import('@/pages/medical-calculators'));
const FoodServicePage = lazy(() => import('@/pages/food-service'));
const WasteManagementPage = lazy(() => import('@/pages/waste-management'));
const OmbudsmanPage = lazy(() => import('@/pages/ombudsman'));
const ProcurementPage = lazy(() => import('@/pages/procurement'));
const ContractsPage = lazy(() => import('@/pages/contracts'));

function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function SuspenseWrap({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <SuspenseWrap>
            <LoginPage />
          </SuspenseWrap>
        }
      />
      <Route
        path="/mfa-verify"
        element={
          <SuspenseWrap>
            <MfaVerifyPage />
          </SuspenseWrap>
        }
      />
      <Route
        path="/auth/sso/callback"
        element={
          <SuspenseWrap>
            <SSOCallbackPage />
          </SuspenseWrap>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<SuspenseWrap><DashboardPage /></SuspenseWrap>} />
        <Route path="pacientes" element={<SuspenseWrap><PatientsListPage /></SuspenseWrap>} />
        <Route path="pacientes/novo" element={<SuspenseWrap><PatientNewPage /></SuspenseWrap>} />
        <Route path="pacientes/:id" element={<SuspenseWrap><PatientDetailPage /></SuspenseWrap>} />
        <Route path="atendimentos" element={<SuspenseWrap><EncountersListPage /></SuspenseWrap>} />
        <Route path="atendimentos/novo" element={<SuspenseWrap><EncounterNewPage /></SuspenseWrap>} />
        <Route path="atendimentos/:id" element={<SuspenseWrap><EncounterPage /></SuspenseWrap>} />
        <Route path="triagem" element={<SuspenseWrap><TriagePage /></SuspenseWrap>} />
        <Route path="triagem/painel" element={<SuspenseWrap><TriagePanelPage /></SuspenseWrap>} />
        <Route path="internacoes" element={<SuspenseWrap><AdmissionsPage /></SuspenseWrap>} />
        <Route path="enfermagem" element={<SuspenseWrap><NursingPage /></SuspenseWrap>} />
        <Route path="enfermagem/aprazamento" element={<SuspenseWrap><NursingSchedulePage /></SuspenseWrap>} />
        <Route path="enfermagem/sae" element={<SuspenseWrap><SAEPage /></SuspenseWrap>} />
        <Route path="enfermagem/balanco-hidrico" element={<SuspenseWrap><FluidBalancePage /></SuspenseWrap>} />
        <Route path="enfermagem/passagem-plantao" element={<SuspenseWrap><HandoffPage /></SuspenseWrap>} />
        <Route path="agenda" element={<SuspenseWrap><AppointmentsPage /></SuspenseWrap>} />
        <Route path="centro-cirurgico" element={<SuspenseWrap><SurgicalPage /></SuspenseWrap>} />
        <Route path="exames" element={<SuspenseWrap><ExamsPage /></SuspenseWrap>} />
        <Route path="prescricoes" element={<SuspenseWrap><PrescriptionsPage /></SuspenseWrap>} />
        <Route path="farmacia" element={<SuspenseWrap><PharmacyPage /></SuspenseWrap>} />
        <Route path="quimioterapia" element={<SuspenseWrap><ChemotherapyPage /></SuspenseWrap>} />
        <Route path="telemedicina" element={<SuspenseWrap><TelemedicinePage /></SuspenseWrap>} />
        <Route path="telemedicina/:roomName" element={<SuspenseWrap><TelemedicineRoomPage /></SuspenseWrap>} />
        <Route path="faturamento" element={<SuspenseWrap><BillingPage /></SuspenseWrap>} />
        <Route path="saude-populacional" element={<SuspenseWrap><PopulationHealthPage /></SuspenseWrap>} />
        <Route path="ccih" element={<SuspenseWrap><InfectionControlPage /></SuspenseWrap>} />
        <Route path="portal-paciente" element={<SuspenseWrap><PatientPortalPage /></SuspenseWrap>} />
        <Route path="relatorios" element={<SuspenseWrap><ReportsPage /></SuspenseWrap>} />
        <Route path="configuracoes" element={<SuspenseWrap><SettingsPage /></SuspenseWrap>} />
        <Route path="emergencia" element={<SuspenseWrap><EmergencyPage /></SuspenseWrap>} />
        <Route path="nutricao" element={<SuspenseWrap><NutritionPage /></SuspenseWrap>} />
        <Route path="fisioterapia" element={<SuspenseWrap><PhysiotherapyPage /></SuspenseWrap>} />
        <Route path="psicologia" element={<SuspenseWrap><PsychologyPage /></SuspenseWrap>} />
        <Route path="servico-social" element={<SuspenseWrap><SocialWorkPage /></SuspenseWrap>} />
        <Route path="terapia-ocupacional" element={<SuspenseWrap><OccupationalTherapyPage /></SuspenseWrap>} />
        <Route path="fonoaudiologia" element={<SuspenseWrap><SpeechTherapyPage /></SuspenseWrap>} />
        <Route path="cuidados-paliativos" element={<SuspenseWrap><PalliativeCarePage /></SuspenseWrap>} />
        <Route path="home-care" element={<SuspenseWrap><HomeCarePage /></SuspenseWrap>} />
        <Route path="pediatria" element={<SuspenseWrap><PediatricsPage /></SuspenseWrap>} />
        <Route path="obstetricia" element={<SuspenseWrap><ObstetricsPage /></SuspenseWrap>} />
        <Route path="neonatologia" element={<SuspenseWrap><NeonatologyPage /></SuspenseWrap>} />
        <Route path="risco-queda" element={<SuspenseWrap><FallRiskPage /></SuspenseWrap>} />
        <Route path="lesao-pressao" element={<SuspenseWrap><PressureInjuryPage /></SuspenseWrap>} />
        <Route path="feridas" element={<SuspenseWrap><WoundCarePage /></SuspenseWrap>} />
        <Route path="sepse" element={<SuspenseWrap><SepsisPage /></SuspenseWrap>} />
        <Route path="protocolo-avc" element={<SuspenseWrap><StrokeProtocolPage /></SuspenseWrap>} />
        <Route path="dor-toracica" element={<SuspenseWrap><ChestPainPage /></SuspenseWrap>} />
        <Route path="notificacao-eventos" element={<SuspenseWrap><IncidentReportingPage /></SuspenseWrap>} />
        <Route path="bcma" element={<SuspenseWrap><BcmaPage /></SuspenseWrap>} />
        <Route path="regras-clinicas" element={<SuspenseWrap><CdsEnginePage /></SuspenseWrap>} />
        <Route path="reconciliacao-medicamentosa" element={<SuspenseWrap><MedicationReconciliationPage /></SuspenseWrap>} />
        <Route path="farmacia-clinica" element={<SuspenseWrap><ClinicalPharmacyPage /></SuspenseWrap>} />
        <Route path="pyxis" element={<SuspenseWrap><PyxisPage /></SuspenseWrap>} />
        <Route path="nutricao-parenteral" element={<SuspenseWrap><ParenteralNutritionPage /></SuspenseWrap>} />
        <Route path="antimicrobianos" element={<SuspenseWrap><AntimicrobialStewardshipPage /></SuspenseWrap>} />
        <Route path="ris-pacs" element={<SuspenseWrap><RisPacsPage /></SuspenseWrap>} />
        <Route path="genomica" element={<SuspenseWrap><GenomicsPage /></SuspenseWrap>} />
        <Route path="patologia" element={<SuspenseWrap><PathologyPage /></SuspenseWrap>} />
        <Route path="microbiologia" element={<SuspenseWrap><MicrobiologyPage /></SuspenseWrap>} />
        <Route path="banco-sangue" element={<SuspenseWrap><BloodBankPage /></SuspenseWrap>} />
        <Route path="cardiologia" element={<SuspenseWrap><CardiologyPage /></SuspenseWrap>} />
        <Route path="faturamento/codificacao" element={<SuspenseWrap><BillingCodingPage /></SuspenseWrap>} />
        <Route path="faturamento/autorizacao-previa" element={<SuspenseWrap><BillingPriorAuthPage /></SuspenseWrap>} />
        <Route path="faturamento/financeiro" element={<SuspenseWrap><BillingFinancialPage /></SuspenseWrap>} />
        <Route path="interoperabilidade" element={<SuspenseWrap><InteroperabilityPage /></SuspenseWrap>} />
        <Route path="cme" element={<SuspenseWrap><CmePage /></SuspenseWrap>} />
        <Route path="equipamentos" element={<SuspenseWrap><EquipmentPage /></SuspenseWrap>} />
        <Route path="hotelaria" element={<SuspenseWrap><HospitalityPage /></SuspenseWrap>} />
        <Route path="gestao-filas" element={<SuspenseWrap><QueueManagementPage /></SuspenseWrap>} />
        <Route path="central-transferencia" element={<SuspenseWrap><TransferCenterPage /></SuspenseWrap>} />
        <Route path="conformidade" element={<SuspenseWrap><CompliancePage /></SuspenseWrap>} />
        <Route path="credenciamento" element={<SuspenseWrap><CredentialingPage /></SuspenseWrap>} />
        <Route path="break-the-glass" element={<SuspenseWrap><BreakTheGlassPage /></SuspenseWrap>} />
        <Route path="ia" element={<SuspenseWrap><AiHubPage /></SuspenseWrap>} />
        <Route path="ia/voz-nlp" element={<SuspenseWrap><VoiceNlpPage /></SuspenseWrap>} />
        <Route path="ia/decisao-clinica" element={<SuspenseWrap><AiClinicalDecisionPage /></SuspenseWrap>} />
        <Route path="ia/avancada" element={<SuspenseWrap><AiAdvancedPage /></SuspenseWrap>} />
        <Route path="ia/preditiva" element={<SuspenseWrap><AiPredictivePage /></SuspenseWrap>} />
        <Route path="analytics" element={<SuspenseWrap><AnalyticsPage /></SuspenseWrap>} />
        <Route path="laboratorio" element={<SuspenseWrap><LisPage /></SuspenseWrap>} />
        <Route path="documentacao-clinica" element={<SuspenseWrap><ClinicalDocumentationPage /></SuspenseWrap>} />
        <Route path="anamnese" element={<SuspenseWrap><AnamnesisPage /></SuspenseWrap>} />
        <Route path="uti" element={<SuspenseWrap><IcuPage /></SuspenseWrap>} />
        <Route path="planejamento-alta" element={<SuspenseWrap><DischargePlanningPage /></SuspenseWrap>} />
        <Route path="protocolos" element={<SuspenseWrap><ProtocolsPage /></SuspenseWrap>} />
        <Route path="telemedicina-avancada" element={<SuspenseWrap><TelemedicineEnhancedPage /></SuspenseWrap>} />
        <Route path="agendamento-avancado" element={<SuspenseWrap><SchedulingEnhancedPage /></SuspenseWrap>} />
        <Route path="interoperabilidade-brasil" element={<SuspenseWrap><InteropBrazilPage /></SuspenseWrap>} />
        <Route path="cadeia-suprimentos" element={<SuspenseWrap><SupplyChainPage /></SuspenseWrap>} />
        <Route path="servicos-hospitalares" element={<SuspenseWrap><HospitalServicesPage /></SuspenseWrap>} />
        <Route path="governanca" element={<SuspenseWrap><GovernancePage /></SuspenseWrap>} />
        <Route path="especialidades" element={<SuspenseWrap><SpecialtiesPage /></SuspenseWrap>} />
        <Route path="pesquisa-clinica" element={<SuspenseWrap><ClinicalResearchPage /></SuspenseWrap>} />
        <Route path="data-warehouse" element={<SuspenseWrap><DataWarehousePage /></SuspenseWrap>} />
        <Route path="sinais-vitais" element={<SuspenseWrap><VitalSignsPage /></SuspenseWrap>} />
        <Route path="pacientes-avancado" element={<SuspenseWrap><PatientsEnhancedPage /></SuspenseWrap>} />
        <Route path="faturamento/charge-capture" element={<SuspenseWrap><BillingChargeCapturesPage /></SuspenseWrap>} />
        <Route path="faturamento/drg" element={<SuspenseWrap><BillingDrgPage /></SuspenseWrap>} />
        <Route path="faturamento/particular" element={<SuspenseWrap><BillingPrivatePayPage /></SuspenseWrap>} />
        <Route path="regulatorio" element={<SuspenseWrap><RegulatoryPage /></SuspenseWrap>} />
        <Route path="ia/imagem" element={<SuspenseWrap><AiImagingAnalysisPage /></SuspenseWrap>} />
        <Route path="seguranca-paciente" element={<SuspenseWrap><SafetyPage /></SuspenseWrap>} />
        <Route path="enfermagem-avancado" element={<SuspenseWrap><NursingEnhancedPage /></SuspenseWrap>} />
        <Route path="alertas" element={<SuspenseWrap><AlertsPage /></SuspenseWrap>} />
        <Route path="auditoria" element={<SuspenseWrap><AuditPage /></SuspenseWrap>} />
        <Route path="cds-hooks" element={<SuspenseWrap><CDSHooksPage /></SuspenseWrap>} />
        <Route path="rnds" element={<SuspenseWrap><RNDSPage /></SuspenseWrap>} />
        <Route path="documentos" element={<SuspenseWrap><DocumentsPage /></SuspenseWrap>} />
        <Route path="integracoes" element={<SuspenseWrap><IntegrationsPage /></SuspenseWrap>} />
        <Route path="interop-brasil" element={<SuspenseWrap><InteropBrazilDashPage /></SuspenseWrap>} />
        <Route path="manutencao-equipamentos" element={<SuspenseWrap><EquipmentMaintenancePage /></SuspenseWrap>} />
        <Route path="ihe-profiles" element={<SuspenseWrap><IHEProfilesPage /></SuspenseWrap>} />
        <Route path="sbis-compliance" element={<SuspenseWrap><SBISCompliancePage /></SuspenseWrap>} />
        <Route path="smart-on-fhir" element={<SuspenseWrap><SMARTOnFHIRPage /></SuspenseWrap>} />
        <Route path="analytics-self-service" element={<SuspenseWrap><SelfServiceAnalyticsPage /></SuspenseWrap>} />
        <Route path="bulk-fhir" element={<SuspenseWrap><BulkFhirPage /></SuspenseWrap>} />
        <Route path="protocolos-clinicos" element={<SuspenseWrap><ClinicalPathwaysPage /></SuspenseWrap>} />
        <Route path="telemedicina-completa" element={<SuspenseWrap><TelemedicineEnhancedFullPage /></SuspenseWrap>} />
        <Route path="assinatura-digital" element={<SuspenseWrap><DigitalSignaturePage /></SuspenseWrap>} />
        <Route path="notificacoes" element={<SuspenseWrap><NotificationsPage /></SuspenseWrap>} />
        <Route path="medicamentos" element={<SuspenseWrap><DrugsPage /></SuspenseWrap>} />
        <Route path="notas-clinicas" element={<SuspenseWrap><ClinicalNotesPage /></SuspenseWrap>} />
        <Route path="filas" element={<SuspenseWrap><QueuesPage /></SuspenseWrap>} />
        <Route path="busca" element={<SuspenseWrap><GlobalSearchPage /></SuspenseWrap>} />
        <Route path="usuarios" element={<SuspenseWrap><UsersManagementPage /></SuspenseWrap>} />
        <Route path="arquivo-medico" element={<SuspenseWrap><MedicalRecordsPage /></SuspenseWrap>} />
        <Route path="calculadoras-medicas" element={<SuspenseWrap><MedicalCalculatorsPage /></SuspenseWrap>} />
        <Route path="servico-nutricao" element={<SuspenseWrap><FoodServicePage /></SuspenseWrap>} />
        <Route path="residuos" element={<SuspenseWrap><WasteManagementPage /></SuspenseWrap>} />
        <Route path="ouvidoria" element={<SuspenseWrap><OmbudsmanPage /></SuspenseWrap>} />
        <Route path="compras" element={<SuspenseWrap><ProcurementPage /></SuspenseWrap>} />
        <Route path="contratos" element={<SuspenseWrap><ContractsPage /></SuspenseWrap>} />
        <Route
          path="tenants"
          element={
            <AdminRoute>
              <SuspenseWrap><TenantsPage /></SuspenseWrap>
            </AdminRoute>
          }
        />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <SuspenseWrap><AdminPage /></SuspenseWrap>
            </AdminRoute>
          }
        />
      </Route>
      <Route path="/agendar/:tenantSlug" element={<SuspenseWrap><BookingPage /></SuspenseWrap>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
