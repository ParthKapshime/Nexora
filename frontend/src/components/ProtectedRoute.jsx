import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { ApiError, Button } from './ui/index.jsx'
import { LoadingState } from './ui/Feedback.jsx'

export function ProtectedRoute({ children }) {
  const { status, retrySession, sessionMessage } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <LoadingState label="Checking your session" fullScreen />
  if (status === 'offline') return (
    <main className="auth-wait-state">
      <ApiError title="Nexora is offline" message={sessionMessage} />
      <Button onClick={retrySession}>Try again</Button>
      <p><a href="/login">Return to sign in</a></p>
    </main>
  )
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />
  return children || <Outlet />
}
