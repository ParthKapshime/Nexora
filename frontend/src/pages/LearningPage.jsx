import { useState } from 'react'
import { CalendarRange, Sparkles, Wand2 } from 'lucide-react'
import { aiApi, getErrorMessage, resourcesApi } from '../lib/api.js'
import { ResourceCollectionPage } from '../components/ResourceCollectionPage.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, LoadingState, SuccessMessage } from '../components/ui/Feedback.jsx'
import { Input } from '../components/ui/Input.jsx'

const weekOptions = [2, 3, 4, 6, 8, 12]

function RoadmapGenerator({ onImported }) {
  const [weeks, setWeeks] = useState(4)
  const [hoursPerWeek, setHoursPerWeek] = useState(5)
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const generate = async () => {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await aiApi.generateRoadmap({ weeks: Number(weeks), hoursPerWeek: Number(hoursPerWeek) })
      setPlan(data.roadmap)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const savePlan = async () => {
    if (!plan) return
    const tasks = plan.weeks.flatMap((week) => week.tasks.map((task) => ({
      title: task.title,
      week: `Week ${week.week}`,
      resource: [week.focus, task.description, task.resource].filter(Boolean).join(' · '),
      completed: false
    })))
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      for (const task of tasks) await resourcesApi.create('roadmaps', task)
      setSuccess(`Added ${tasks.length} ${tasks.length === 1 ? 'milestone' : 'milestones'} to your learning roadmap.`)
      setPlan(null)
      onImported()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return <Card className="ai-feature-card">
    <CardHeader>
      <div><CardTitle><Wand2 size={16} />Generate a learning roadmap</CardTitle><CardDescription>Uses your saved target role and skills to suggest weekly milestones.</CardDescription></div>
    </CardHeader>
    <CardContent>
      <div className="ai-generator-controls">
        <div className="field-group"><label htmlFor="roadmap-weeks">Weeks</label><select id="roadmap-weeks" className="form-control" value={weeks} onChange={(event) => setWeeks(event.target.value)}>{weekOptions.map((option) => <option key={option} value={option}>{option} weeks</option>)}</select></div>
        <div className="field-group"><label htmlFor="roadmap-hours">Hours per week</label><Input id="roadmap-hours" type="number" min="1" max="40" step="1" value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)} /></div>
        <Button onClick={() => void generate()} disabled={busy}>{busy ? 'Generating…' : plan ? 'Regenerate plan' : 'Generate roadmap'}</Button>
      </div>
      {error && <ApiError title="Roadmap generation could not be completed" message={error} onRetry={() => void generate()} />}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {busy && <LoadingState label="Planning your weekly milestones" />}
      {plan && !busy && <div className="ai-plan">
        <div className="ai-plan-head"><span className="eyebrow"><Sparkles size={13} /> GENERATED PLAN</span><h3>{plan.title}</h3><p>{plan.summary}</p></div>
        <div className="plan-weeks">{plan.weeks.map((week) => <section className="plan-week" key={week.week}><span className="plan-week-number"><CalendarRange size={14} />Week {week.week}</span><div><h4>{week.focus}</h4><ul>{week.tasks.map((task) => <li key={`${week.week}-${task.title}`}><strong>{task.title}</strong><span>{task.description}</span><small>{task.resource}</small></li>)}</ul></div></section>)}</div>
        <div className="form-actions"><Button onClick={() => void savePlan()} disabled={saving}>{saving ? 'Saving milestones…' : 'Save to my roadmap'}</Button><Button variant="ghost" onClick={() => void generate()} disabled={saving}>Try another plan</Button></div>
        <p className="muted-caption">AI suggestions are based only on your saved profile and skills. Review and edit them after saving.</p>
      </div>}
    </CardContent>
  </Card>
}

export default function LearningPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  return <>
    <RoadmapGenerator onImported={() => setRefreshKey((current) => current + 1)} />
    <ResourceCollectionPage key={refreshKey} kind="roadmaps" eyebrow="MAKE ROOM TO GROW" title="Learning roadmap" description="Organize the learning milestones and resources you choose to work on." fields={[{ name: 'title', label: 'Milestone or topic', placeholder: 'e.g. Practice SQL joins' }, { name: 'week', label: 'Target week', placeholder: 'e.g. Week 1' }, { name: 'resource', label: 'Resource', placeholder: 'A course, article, or your notes', type: 'textarea' }]} emptyTitle="Your learning plan starts here" emptyDescription="Add a milestone you want to work toward." doneKey="completed" notice="Your roadmap contains milestones you add or save from AI suggestions. Progress reflects the items you mark complete." />
  </>
}
