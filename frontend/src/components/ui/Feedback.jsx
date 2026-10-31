import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button.jsx'

export function LoadingState({ label = 'Loading', fullScreen = false }) {
  return <div className={`loading-state ${fullScreen ? 'loading-screen' : ''}`} role="status" aria-live="polite">
    <LoaderCircle className="spin" size={19} aria-hidden="true" /><span>{label}…</span>
  </div>
}

export function ApiError({ title = 'Could not load this information', message, onRetry }) {
  return <div className="alert alert-error" role="alert">
    <AlertCircle size={18} aria-hidden="true" />
    <div className="alert-copy"><strong>{title}</strong><p>{message}</p></div>
    {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}><RefreshCw size={14} />Retry</Button>}
  </div>
}

export function SuccessMessage({ children }) {
  return <p className="success-message" role="status"><CheckCircle2 size={15} aria-hidden="true" />{children}</p>
}

export function EmptyState({ icon: Icon = CheckCircle2, title, description, action }) {
  return <div className="empty-state">
    <span className="empty-icon"><Icon size={20} aria-hidden="true" /></span>
    <h3>{title}</h3><p>{description}</p>{action}
  </div>
}
