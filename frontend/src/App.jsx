import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { AppLayout } from './components/layout/AppLayout.jsx'
import { LoadingState } from './components/ui/Feedback.jsx'

const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const SkillsPage = lazy(() => import('./pages/SkillsPage.jsx'))
const LearningPage = lazy(() => import('./pages/LearningPage.jsx'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'))
const InterviewsPage = lazy(() => import('./pages/InterviewsPage.jsx'))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage.jsx'))
const GuidancePage = lazy(() => import('./pages/GuidancePage.jsx'))

function ProtectedLayout() {
  return <ProtectedRoute><AppLayout /></ProtectedRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingState label="Opening Nexora" fullScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/learning" element={<LearningPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/interviews" element={<InterviewsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/guidance" element={<GuidancePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
