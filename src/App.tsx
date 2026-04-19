import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import { ToastProvider } from './contexts/toast-context'
import { ToastContainer } from './components/ui/toast'
import { ProtectedRoute } from './components/protected-route'
import { AppLayout } from './components/layout/app-layout'
import { PublicLayout } from './components/layout/public-layout'
import { SpeakerLayout } from './components/layout/speaker-layout'
import { LoginPage } from './pages/login-page'
import { RegisterPage } from './pages/register-page'
import { DashboardPage } from './pages/dashboard-page'
import { NewProjectPage } from './pages/new-project-page'
import { ProjectPage } from './pages/project-page'
import { RecordPage } from './pages/record-page'
import { LandingPage } from './pages/landing-page'
// Locuteur — public
import { SpeakerRegisterPage } from './pages/speaker-register-page'
import { SpeakerOnboardingPage } from './pages/speaker-onboarding-page'
import { SpeakerPendingPage } from './pages/speaker-pending-page'
// Locuteur — espace authentifié
import { SpeakerDashboardPage } from './pages/speaker-dashboard-page'
import { SpeakerProjectsPage } from './pages/speaker-projects-page'
import { SpeakerInvitationsPage } from './pages/speaker-invitations-page'
import { SpeakerInvitationDetailPage } from './pages/speaker-invitation-detail-page'
import { SpeakerNotificationsPage } from './pages/speaker-notifications-page'
import { AccountPage } from './pages/account-page'
import { SpeakerWalletPage } from './pages/speaker-wallet-page'
import { SpeakerValidatePage } from './pages/speaker-validate-page'
import { SpeakerProfilePage } from './pages/speaker-profile-page'
import { SpeakerRecordPage } from './pages/speaker-record-page'
// Admin
import { AdminSpeakersPage } from './pages/admin-speakers-page'
import { AdminWithdrawalsPage } from './pages/admin-withdrawals-page'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ToastContainer />
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
            <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
            <Route path="/speaker/register" element={<PublicLayout><SpeakerRegisterPage /></PublicLayout>} />

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
            <Route
              path="/speaker/pending"
              element={
                <ProtectedRoute allowedRoles={['speaker']}>
                  <SpeakerPendingPage />
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
              path="/account"
              element={
                <ProtectedRoute allowedRoles={['client', 'admin']}>
                  <AppLayout><AccountPage /></AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ── Admin ── */}
            <Route
              path="/admin/speakers"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppLayout><AdminSpeakersPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/withdrawals"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppLayout><AdminWithdrawalsPage /></AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ── Landing + fallback ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
