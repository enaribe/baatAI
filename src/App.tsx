import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from './contexts/auth-context'
import { ToastProvider } from './contexts/toast-context'
import { ToastContainer } from './components/ui/toast'
import { ProtectedRoute } from './components/protected-route'
import { AppLayout } from './components/layout/app-layout'
import { SpeakerLayout } from './components/layout/speaker-layout'
import { AdminLayout } from './components/layout/admin-layout'

// Pages chargées immédiatement (chemins critiques d'auth)
import { LoginPage } from './pages/login-page'
import { RegisterPage } from './pages/register-page'

// Pages lazy-loadées par route (réduit le bundle initial de ~856 kB → ~400 kB)
const LandingPage = lazy(() => import('./pages/landing-page').then(m => ({ default: m.LandingPage })))
const DashboardPage = lazy(() => import('./pages/dashboard-page').then(m => ({ default: m.DashboardPage })))
const NewProjectPage = lazy(() => import('./pages/new-project-page').then(m => ({ default: m.NewProjectPage })))
const ProjectPage = lazy(() => import('./pages/project-page').then(m => ({ default: m.ProjectPage })))
const SubtopicEditPage = lazy(() => import('./pages/subtopic-edit-page').then(m => ({ default: m.SubtopicEditPage })))
const RecordPage = lazy(() => import('./pages/record-page').then(m => ({ default: m.RecordPage })))
const SpeakersPage = lazy(() => import('./pages/speakers-page').then(m => ({ default: m.SpeakersPage })))
const SpeakerDetailPage = lazy(() => import('./pages/speaker-detail-page').then(m => ({ default: m.SpeakerDetailPage })))
const SpeakerRegisterPage = lazy(() => import('./pages/speaker-register-page').then(m => ({ default: m.SpeakerRegisterPage })))
const RequestAccessPage = lazy(() => import('./pages/request-access-page').then(m => ({ default: m.RequestAccessPage })))
const SpeakerOnboardingPage = lazy(() => import('./pages/speaker-onboarding-page').then(m => ({ default: m.SpeakerOnboardingPage })))
const SpeakerDashboardPage = lazy(() => import('./pages/speaker-dashboard-page').then(m => ({ default: m.SpeakerDashboardPage })))
const SpeakerProjectsPage = lazy(() => import('./pages/speaker-projects-page').then(m => ({ default: m.SpeakerProjectsPage })))
const SpeakerInvitationsPage = lazy(() => import('./pages/speaker-invitations-page').then(m => ({ default: m.SpeakerInvitationsPage })))
const SpeakerInvitationDetailPage = lazy(() => import('./pages/speaker-invitation-detail-page').then(m => ({ default: m.SpeakerInvitationDetailPage })))
const SpeakerNotificationsPage = lazy(() => import('./pages/speaker-notifications-page').then(m => ({ default: m.SpeakerNotificationsPage })))
const AccountPage = lazy(() => import('./pages/account-page').then(m => ({ default: m.AccountPage })))
const SpeakerWalletPage = lazy(() => import('./pages/speaker-wallet-page').then(m => ({ default: m.SpeakerWalletPage })))
const SpeakerValidatePage = lazy(() => import('./pages/speaker-validate-page').then(m => ({ default: m.SpeakerValidatePage })))
const SpeakerProfilePage = lazy(() => import('./pages/speaker-profile-page').then(m => ({ default: m.SpeakerProfilePage })))
const SpeakerRecordPage = lazy(() => import('./pages/speaker-record-page').then(m => ({ default: m.SpeakerRecordPage })))
const AdminWithdrawalsPage = lazy(() => import('./pages/admin-withdrawals-page').then(m => ({ default: m.AdminWithdrawalsPage })))
const AdminDashboardPage = lazy(() => import('./pages/admin/admin-dashboard-page').then(m => ({ default: m.AdminDashboardPage })))
const AdminRequestsPage = lazy(() => import('./pages/admin/admin-requests-page').then(m => ({ default: m.AdminRequestsPage })))
const AdminWhitelistPage = lazy(() => import('./pages/admin/admin-whitelist-page').then(m => ({ default: m.AdminWhitelistPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/admin-users-page').then(m => ({ default: m.AdminUsersPage })))
const AdminEmailsPage = lazy(() => import('./pages/admin/admin-emails-page').then(m => ({ default: m.AdminEmailsPage })))

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--t-bg)' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--t-fg-3)' }} />
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ToastContainer />
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ── Public routes (chaque page gère son propre PublicLayout) ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/speaker/register" element={<SpeakerRegisterPage />} />
            <Route path="/request-access" element={<RequestAccessPage />} />

            {/* ── Record token anonyme (compat rétro) ── */}
            <Route path="/record/:token" element={<RecordPage />} />

            {/* ── Locuteur — onboarding (post-inscription, avant validation) ── */}
            <Route
              path="/speaker/onboarding"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerOnboardingPage />
                </ProtectedRoute>
              }
            />
            {/* ── Locuteur — enregistrement fullscreen (pas de layout) ── */}
            <Route
              path="/speaker/record/:sessionId"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerRecordPage />
                </ProtectedRoute>
              }
            />

            {/* ── Locuteur — espace principal avec SpeakerLayout ── */}
            <Route
              path="/speaker/dashboard"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerLayout><SpeakerDashboardPage /></SpeakerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speaker/projects"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerLayout><SpeakerProjectsPage /></SpeakerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speaker/invitations"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerLayout><SpeakerInvitationsPage /></SpeakerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speaker/invitations/:id"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerLayout><SpeakerInvitationDetailPage /></SpeakerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speaker/notifications"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerLayout><SpeakerNotificationsPage /></SpeakerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speaker/wallet"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerLayout><SpeakerWalletPage /></SpeakerLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speaker/validate"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerValidatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/speaker/profile"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerLayout><SpeakerProfilePage /></SpeakerLayout>
                </ProtectedRoute>
              }
            />

            {/* ── Client — dashboard et projets ── */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['client', 'admin']}>
                  <AppLayout><DashboardPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/new"
              element={
                <ProtectedRoute allowedRoles={['client', 'admin']}>
                  <AppLayout><NewProjectPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:id"
              element={
                <ProtectedRoute allowedRoles={['client', 'admin']}>
                  <AppLayout><ProjectPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:id/subtopic/:subId"
              element={
                <ProtectedRoute allowedRoles={['client', 'admin']}>
                  <AppLayout><SubtopicEditPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speakers"
              element={
                <ProtectedRoute allowedRoles={['client', 'admin']}>
                  <AppLayout><SpeakersPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/speakers/:id"
              element={
                <ProtectedRoute allowedRoles={['client', 'admin']}>
                  <AppLayout><SpeakerDetailPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute allowedRoles={['client', 'admin']}>
                  <AppLayout><AccountPage /></AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ── Admin ── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout><AdminDashboardPage /></AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/requests"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout><AdminRequestsPage /></AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/whitelist"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout><AdminWhitelistPage /></AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout><AdminUsersPage /></AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/emails"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout><AdminEmailsPage /></AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/withdrawals"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout><AdminWithdrawalsPage /></AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* ── Landing + fallback ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
