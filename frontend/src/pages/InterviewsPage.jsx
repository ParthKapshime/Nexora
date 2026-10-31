import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, MessageCircle, Mic, Sparkles } from 'lucide-react'
import { aiApi, getErrorMessage, profileApi, resourcesApi } from '../lib/api.js'
import { PageHeading } from '../components/PageHeading.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, EmptyState, LoadingState, SuccessMessage } from '../components/ui/Feedback.jsx'
import { Input, Textarea } from '../components/ui/Input.jsx'

const interviewTypes = ['Behavioral', 'Technical', 'Situational']
const difficulties = ['Entry', 'Intermediate', 'Advanced']
const questionCounts = [3, 4, 5, 6, 8]

function textValue(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ')
  return ''
}

function sessionTitle(item) {
  const data = item?.data || {}
  return textValue(data.title || data.role || data.jobTitle) || 'Interview session'
}

function sessionSummary(item) {
  const data = item?.data || {}
  if (Array.isArray(data.questions)) {
    const answers = Array.isArray(data.answers) ? data.answers : []
    const status = data.status === 'completed' ? 'Completed' : 'In progress'
    const score = typeof data.averageScore === 'number' ? ` · ${data.averageScore}% average` : ''
    return `${data.type || 'Interview'} · ${data.difficulty || 'Practice'} · ${answers.length}/${data.questions.length} answered · ${status}${score}`
  }
  const details = Object.entries(data)
    .filter(([key]) => !['role', 'title', 'jobTitle'].includes(key))
    .map(([key, value]) => { const text = textValue(value); return text ? `${key.replace(/([A-Z])/g, ' $1')}: ${text}` : '' })
    .filter(Boolean)
    .join(' · ')
  return details || 'User-saved interview record'
}

function scoreTone(score) {
  if (score >= 75) return 'green'
  if (score >= 50) return 'blue'
  return 'peach'
}

export default function InterviewsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [setup, setSetup] = useState({ type: 'Behavioral', difficulty: 'Intermediate', questionCount: 5, targetRole: '' })
  const [session, setSession] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [starting, setStarting] = useState(false)
  const [submittingIndex, setSubmittingIndex] = useState(null)

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await resourcesApi.list('interviews')
      setItems(data.items || [])
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }, [])

  useEffect(() => {
    let current = true
    resourcesApi.list('interviews').then(({ data }) => {
      if (current) setItems(data.items || [])
    }).catch((requestError) => {
      if (current) setError(getErrorMessage(requestError))
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [])

  useEffect(() => {
    let current = true
    profileApi.get().then(({ data }) => {
      if (current) setSetup((value) => ({ ...value, targetRole: data.profile?.targetRole || '' }))
    }).catch(() => {})
    return () => { current = false }
  }, [])

  const updateSetup = (key, value) => setSetup((current) => ({ ...current, [key]: value }))

  const startInterview = async () => {
    setStarting(true)
    setError('')
    setSuccess('')
    try {
      const payload = { type: setup.type, difficulty: setup.difficulty, questionCount: Number(setup.questionCount) }
      if (setup.targetRole.trim()) payload.targetRole = setup.targetRole.trim()
      const { data } = await aiApi.startInterview(payload)
      setSession(data.session)
      setDrafts({})
      setSuccess('Your interview session is ready. Answer each question when you are ready.')
      await loadSessions()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setStarting(false)
    }
  }

  const submitAnswer = async (index) => {
    const answer = (drafts[index] || '').trim()
    if (!answer || !session) return
    setSubmittingIndex(index)
    setError('')
    setSuccess('')
    try {
      const { data } = await aiApi.answerInterview(session._id, { questionIndex: index, answer })
      setSession(data.session)
      setDrafts((current) => ({ ...current, [index]: '' }))
      setSuccess('Your answer was evaluated.')
      await loadSessions()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSubmittingIndex(null)
    }
  }

  const answersByIndex = new Map((session?.answers || []).map((entry) => [entry.questionIndex, entry]))
  const totalQuestions = session?.questions?.length || 0
  const answeredCount = answersByIndex.size
  const allAnswered = totalQuestions > 0 && answeredCount >= totalQuestions

  return <>
    <PageHeading eyebrow="PRACTICE WITH PURPOSE" title="AI mock interviews" description="Generate role-specific questions and get feedback on every answer." />
    <Card className="ai-feature-card">
      <CardHeader>
        <div><CardTitle><Mic size={16} />Start a practice interview</CardTitle><CardDescription>Choose the format, role, and difficulty. Questions are generated from your saved profile.</CardDescription></div>
      </CardHeader>
      <CardContent>
        <div className="interview-setup">
          <div className="field-group"><label htmlFor="interview-type">Interview type</label><select id="interview-type" className="form-control" value={setup.type} onChange={(event) => updateSetup('type', event.target.value)}>{interviewTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
          <div className="field-group"><label htmlFor="interview-difficulty">Difficulty</label><select id="interview-difficulty" className="form-control" value={setup.difficulty} onChange={(event) => updateSetup('difficulty', event.target.value)}>{difficulties.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}</select></div>
          <div className="field-group"><label htmlFor="interview-role">Target role</label><Input id="interview-role" maxLength={120} placeholder="e.g. UX designer" value={setup.targetRole} onChange={(event) => updateSetup('targetRole', event.target.value)} /></div>
          <div className="field-group"><label htmlFor="interview-count">Questions</label><select id="interview-count" className="form-control" value={setup.questionCount} onChange={(event) => updateSetup('questionCount', event.target.value)}>{questionCounts.map((count) => <option key={count} value={count}>{count} questions</option>)}</select></div>
          <Button onClick={() => void startInterview()} disabled={starting}>{starting ? 'Preparing session…' : session ? 'Start new session' : 'Start interview'}</Button>
        </div>
        {error && <ApiError title="Interview request could not be completed" message={error} onRetry={session ? undefined : () => void startInterview()} />}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        {starting && <LoadingState label="Writing your interview questions" />}
      </CardContent>
    </Card>

    {session && <Card className="ai-feature-card interview-session">
      <CardHeader>
        <div><CardTitle><Sparkles size={16} />{session.title || 'Practice session'}</CardTitle><CardDescription>{session.type} · {session.difficulty} · {session.targetRole}</CardDescription></div>
        <Badge tone={allAnswered ? 'green' : 'lavender'}>{allAnswered ? 'Completed' : `${answeredCount}/${totalQuestions} answered`}</Badge>
      </CardHeader>
      <CardContent>
        <div className="progress-caption"><strong>Interview progress</strong><span>{answeredCount} of {totalQuestions} answered{typeof session.averageScore === 'number' ? ` · ${session.averageScore}% average` : ''}</span></div>
        <div className="progress-track" role="progressbar" aria-label="Interview progress" aria-valuemin="0" aria-valuemax={totalQuestions || 1} aria-valuenow={answeredCount}><span style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }} /></div>
        {allAnswered && <div className="interview-complete"><CheckCircle2 size={18} /><span>Session complete. Review your feedback below or start a new interview.</span></div>}
        <div className="interview-question-list">{session.questions.map((question, index) => {
          const evaluation = answersByIndex.get(index)
          return <article className="interview-question" key={`${index}-${question.question}`}>
            <div className="question-head">
              <span className="question-number">{index + 1}</span>
              <div><h3>{question.question}</h3>{question.focus && <p>{question.focus}</p>}</div>
              {evaluation && <Badge tone={scoreTone(evaluation.score)}>{evaluation.score}/100</Badge>}
            </div>
            {evaluation ? <div className="answer-feedback">
              <h4>{evaluation.verdict}</h4>
              <div className="feedback-columns">
                <div><strong>Strengths</strong>{evaluation.strengths?.length ? <ul>{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="field-hint">No strengths were returned.</p>}</div>
                <div><strong>Improve</strong>{evaluation.improvements?.length ? <ul>{evaluation.improvements.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="field-hint">No improvements were returned.</p>}</div>
              </div>
              <div className="suggested-answer"><strong>Suggested answer</strong><p>{evaluation.suggestedAnswer}</p></div>
              <div className="submitted-answer"><strong>Your answer</strong><p>{evaluation.answer}</p></div>
            </div> : <div className="answer-editor">
              <label htmlFor={`interview-answer-${index}`}>Your answer</label>
              <Textarea id={`interview-answer-${index}`} rows={3} maxLength={8000} placeholder="Write your answer…" value={drafts[index] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [index]: event.target.value }))} disabled={submittingIndex === index} />
              <div className="form-actions"><Button size="sm" onClick={() => void submitAnswer(index)} disabled={submittingIndex === index || !drafts[index]?.trim()}>{submittingIndex === index ? 'Evaluating…' : 'Evaluate answer'}</Button></div>
            </div>}
          </article>
        })}</div>
      </CardContent>
    </Card>}

    <Card>
      <CardHeader><div><CardTitle>Previous sessions</CardTitle><CardDescription>Interview sessions saved to your account.</CardDescription></div></CardHeader>
      <CardContent>
        {loading ? <LoadingState label="Loading interview records" /> : items.length === 0 ? <EmptyState icon={MessageCircle} title="No interview sessions" description="Start a practice interview to see it here." /> : <div className="saved-items">{items.map((item, index) => {
          const data = item.data || {}
          return <article className="saved-item interview-record" key={item._id || index}><span className="stat-icon lavender"><MessageCircle size={17} /></span><div className="saved-item-copy"><div className="saved-item-title"><h3>{sessionTitle(item)}</h3>{Array.isArray(data.questions) && <span className={`item-state ${data.status === 'completed' ? 'item-state-done' : ''}`}>{data.status === 'completed' ? 'Completed' : 'In progress'}</span>}</div><p>{sessionSummary(item)}</p></div></article>
        })}</div>}
      </CardContent>
    </Card>
  </>
}
