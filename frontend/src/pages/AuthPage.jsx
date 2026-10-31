import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { getErrorMessage } from '../lib/api.js'
import { useAuth } from '../context/useAuth.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { ApiError } from '../components/ui/Feedback.jsx'

const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(254, 'Email must be 254 characters or fewer'),
  password: z.string().min(10, 'Use at least 10 characters').max(128, 'Password must be 128 characters or fewer')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password must be 72 bytes or fewer'),
})

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
  const { login, register: createAccount, status, sessionMessage } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const schema = useMemo(() => credentialsSchema, [])
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), mode: 'onBlur' })

  useEffect(() => { document.title = `${isRegister ? 'Create account' : 'Sign in'} | Nexora` }, [isRegister])
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const submit = async (values) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      await (isRegister ? createAccount : login)({ email: values.email.trim(), password: values.password })
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (error) {
      setSubmitError(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-page">
    <aside className="auth-aside">
      <Link className="brand" to="/"><span className="brand-mark"><Sparkles size={17} /></span><span>Nexora</span></Link>
      <div className="auth-aside-copy"><span className="eyebrow">YOUR NEXT CHAPTER</span><h1>Make room for what’s next.</h1><p>Keep your goals, experience, and career steps in a place that feels clear and personal.</p><div className="auth-emblem"><span><Sparkles size={23} /></span><i /><i /><i /></div></div>
      <span className="auth-aside-foot">A little more clarity, every day.</span>
    </aside>
    <section className="auth-panel">
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to home</Link>
      <div className="auth-form-wrap">
        <span className="eyebrow">{isRegister ? 'GET STARTED' : 'WELCOME BACK'}</span>
        <h2>{isRegister ? 'Create your account' : 'Sign in to Nexora'}</h2>
        <p className="auth-intro">{isRegister ? 'Your career workspace starts with one small step.' : 'Pick up where you left off.'}</p>
        {sessionMessage && <div className="inline-notice" role="status">{sessionMessage}</div>}
        {submitError && <ApiError title={isRegister ? 'Account could not be created' : 'Sign in didn’t work'} message={submitError} />}
        <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
          <div className="field-group"><label htmlFor="email">Email address</label><Input id="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />{errors.email && <span className="field-error" id="email-error">{errors.email.message}</span>}</div>
          <div className="field-group"><label htmlFor="password">Password</label><Input id="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'At least 10 characters' : 'Your password'} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : 'password-hint'} {...register('password')} />{errors.password ? <span className="field-error" id="password-error">{errors.password.message}</span> : isRegister && <span className="field-hint" id="password-hint">Use 10 or more characters.</span>}</div>
          <Button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Connecting…' : isRegister ? 'Create account' : 'Sign in'}<ArrowRight size={15} /></Button>
        </form>
        <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Nexora?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
        <p className="auth-security-note">Your session is kept in this browser tab and expires when the backend token expires.</p>
      </div>
    </section>
  </main>
}
