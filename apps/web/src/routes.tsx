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
        <Route path="agenda" element={<SuspenseWrap><AppointmentsPage /></SuspenseWrap>} />
        <Route path="centro-cirurgico" element={<SuspenseWrap><SurgicalPage /></SuspenseWrap>} />
        <Route path="exames" element={<SuspenseWrap><ExamsPage /></SuspenseWrap>} />
        <Route path="prescricoes" element={<SuspenseWrap><PrescriptionsPage /></SuspenseWrap>} />
        <Route path="farmacia" element={<SuspenseWrap><PharmacyPage /></SuspenseWrap>} />
        <Route path="quimioterapia" element={<SuspenseWrap><ChemotherapyPage /></SuspenseWrap>} />
        <Route path="telemedicina" element={<SuspenseWrap><TelemedicinePage /></SuspenseWrap>} />
        <Route path="telemedicina/:roomName" element={<SuspenseWrap><TelemedicineRoomPage /></SuspenseWrap>} />
        <Route path="faturamento" element={<SuspenseWrap><BillingPage /></SuspenseWrap>} />
        <Route path="relatorios" element={<SuspenseWrap><ReportsPage /></SuspenseWrap>} />
        <Route path="configuracoes" element={<SuspenseWrap><SettingsPage /></SuspenseWrap>} />
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
