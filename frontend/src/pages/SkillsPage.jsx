import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CircleHelp, Sparkles, Target } from 'lucide-react'
import { aiApi, getErrorMessage } from '../lib/api.js'
import { ResourceCollectionPage } from '../components/ResourceCollectionPage.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, LoadingState } from '../components/ui/Feedback.jsx'

function priorityTone(priority) {
  if (priority === 'high') return 'peach'
  if (priority === 'medium') return 'blue'
  return 'lavender'
}

function AnalysisPanel() {
  const [analysis, setAnalysis] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await aiApi.analyzeSkills()
      setAnalysis(data.analysis)
      setReadiness(data.readiness)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return <Card className="assessment-card ai-feature-card">
    <CardHeader>
      <div><CardTitle><Sparkles size={16} />AI skills analysis</CardTitle><CardDescription>An AI-assisted readiness estimate based on your saved target role and skills.</CardDescription></div>
      <Button onClick={() => void run()} disabled={busy}>{busy ? 'Analyzing…' : analysis ? 'Refresh analysis' : 'Analyze my skills'}</Button>
    </CardHeader>
    <CardContent>
      {error && <ApiError title="Analysis could not be completed" message={error} onRetry={() => void run()} />}
      {busy && <LoadingState label="Reviewing your saved profile and skills" />}
      {!analysis && !busy && !error && <div className="capability-notice"><CircleHelp size={18} /><span>Add a target role and at least one skill before running the analysis. Extracted resume text is included when available.</span></div>}
      {analysis && !busy && <>
        <div className="readiness-summary">
          <div className="progress-caption"><strong>Career readiness estimate</strong><span>{analysis.readinessScore}%</span></div>
          <div className="progress-track" role="progressbar" aria-label="Career readiness estimate" aria-valuemin="0" aria-valuemax="100" aria-valuenow={analysis.readinessScore}><span style={{ width: `${analysis.readinessScore}%` }} /></div>
          <p>{analysis.summary}</p>
          {readiness?.updatedAt && <span className="analysis-updated">Updated {new Date(readiness.updatedAt).toLocaleString()}</span>}
        </div>

        {analysis.categories?.length > 0 && <div className="analysis-tags">{analysis.categories.map((category) => <span className="analysis-category" key={category.name}><Target size={13} /><b>{category.name}</b><span>{category.score}%</span></span>)}</div>}

        <div className="analysis-columns">
          <section className="analysis-block">
            <h3>Strengths</h3>
            {analysis.strengths?.length ? <ul className="analysis-list">{analysis.strengths.map((item) => <li key={`${item.skill}-${item.evidence}`}><b>{item.skill}</b> — {item.evidence}</li>)}</ul> : <p className="field-hint">No strengths were identified from the supplied data.</p>}
          </section>
          <section className="analysis-block">
            <h3>Skill gaps</h3>
            {analysis.gaps?.length ? <ul className="analysis-list">{analysis.gaps.map((item) => <li key={`${item.skill}-${item.priority}`}><span className="gap-heading"><b>{item.skill}</b><Badge tone={priorityTone(item.priority)}>{item.priority} priority</Badge></span><span>{item.recommendation}</span></li>)}</ul> : <p className="field-hint">No gaps were identified from the supplied data.</p>}
          </section>
        </div>

        <section className="analysis-block analysis-next">
          <h3>Recommended next steps</h3>
          <ol>{analysis.nextSteps?.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        <p className="muted-caption"><Sparkles size={14} />This is an AI-assisted estimate, not a verified assessment. It uses your saved profile, skills, and extracted resume text when available.</p>
      </>}
    </CardContent>
  </Card>
}

export default function SkillsPage() {
  return <>
    <AnalysisPanel />
    <ResourceCollectionPage kind="skills" eyebrow="KNOW WHAT YOU BRING" title="Your skills" description="Keep a personal record of the skills you have or want to grow." fields={[{ name: 'name', label: 'Skill', placeholder: 'e.g. User research' }, { name: 'category', label: 'Category', placeholder: 'e.g. Design' }, { name: 'level', label: 'Level or note', placeholder: 'e.g. Practicing' }]} emptyTitle="No skills saved" emptyDescription="Add a skill to begin your personal list." notice="Skills below are your saved entries. They are the same records used for AI analysis." />
    <p className="muted-caption"><Activity size={14} />Need to update the target role used for analysis? <Link to="/profile">Edit your profile</Link></p>
  </>
}
