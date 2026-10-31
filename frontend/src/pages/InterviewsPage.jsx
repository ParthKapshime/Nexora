import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Mic, Sparkles } from 'lucide-react'
import { getErrorMessage, resourcesApi } from '../lib/api.js'
import { PageHeading } from '../components/PageHeading.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, EmptyState, LoadingState } from '../components/ui/Feedback.jsx'

function textValue(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ')
  return ''
}

export default function InterviewsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { const { data } = await resourcesApi.list('interviews'); setItems(data.items || []); setError('') }
    catch (requestError) { setError(getErrorMessage(requestError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let current = true
    resourcesApi.list('interviews').then(({ data }) => {
      if (!current) return
      setItems(data.items || [])
      setError('')
    }).catch((requestError) => {
      if (current) setError(getErrorMessage(requestError))
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [])
  const retry = () => { setLoading(true); void load() }

  return <>
    <PageHeading eyebrow="PRACTICE WITH PURPOSE" title="AI mock interviews" description="Review interview records available in your account." />
    <Card className="unsupported-interview"><span className="unsupported-icon"><Mic size={19} /></span><div><h2>Live interview practice isn’t available yet</h2><p>The current backend does not provide question generation, answer submission, or interview feedback. No practice session or evaluation is simulated here.</p></div><Sparkles className="unsupported-spark" size={20} /></Card>
    {error && <ApiError message={error} onRetry={retry} />}
    <Card><CardHeader><div><CardTitle>Previous sessions</CardTitle><CardDescription>Interview records returned by the backend.</CardDescription></div></CardHeader><CardContent>
      {loading ? <LoadingState label="Loading interview records" /> : items.length === 0 ? <EmptyState icon={MessageCircle} title="No interview sessions" description="Saved interview records will appear here if they’re available through the API." /> : <div className="saved-items">{items.map((item, index) => {
        const values = item.data || {}
        const title = textValue(values.role || values.title || values.jobTitle) || 'Interview session'
        const details = Object.entries(values).filter(([key]) => !['role', 'title', 'jobTitle'].includes(key)).map(([key, value]) => { const text = textValue(value); return text ? `${key.replace(/([A-Z])/g, ' $1')}: ${text}` : '' }).filter(Boolean).join(' · ')
        return <article className="saved-item interview-record" key={item._id || index}><span className="stat-icon lavender"><MessageCircle size={17} /></span><div className="saved-item-copy"><h3>{title}</h3><p>{details || 'User-saved interview record'}</p></div></article>
      })}</div>}
    </CardContent></Card>
  </>
}
