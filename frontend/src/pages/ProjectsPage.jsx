import { useState } from 'react'
import { Check, Compass, Sparkles, Wand2 } from 'lucide-react'
import { aiApi, getErrorMessage, resourcesApi } from '../lib/api.js'
import { ResourceCollectionPage } from '../components/ResourceCollectionPage.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, LoadingState, SuccessMessage } from '../components/ui/Feedback.jsx'

const projectFields = [
  { name: 'title', label: 'Project name', placeholder: 'e.g. Personal finance dashboard' },
  { name: 'description', label: 'Description', placeholder: 'What would you build?', type: 'textarea' },
  { name: 'technologies', label: 'Technologies', placeholder: 'e.g. React, JavaScript, MongoDB' },
  { name: 'difficulty', label: 'Difficulty', placeholder: 'e.g. Beginner, Intermediate' },
  { name: 'skills', label: 'Skills developed', placeholder: 'e.g. Data visualization, API design' }
]

function difficultyTone(difficulty) {
  if (difficulty === 'Advanced') return 'peach'
  if (difficulty === 'Intermediate') return 'lavender'
  return 'blue'
}

function ProjectRecommendations({ onSaved }) {
  const [projects, setProjects] = useState([])
  const [saved, setSaved] = useState([])
  const [busy, setBusy] = useState(false)
  const [savingIndex, setSavingIndex] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const generate = async () => {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await aiApi.recommendProjects({ count: 3 })
      setProjects(data.projects || [])
      setSaved([])
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const saveProject = async (project, index) => {
    setSavingIndex(index)
    setError('')
    setSuccess('')
    try {
      await resourcesApi.create('projects', {
        title: project.title,
        description: [project.description, project.firstSteps?.length ? `First steps: ${project.firstSteps.join('; ')}` : ''].filter(Boolean).join('\n\n'),
        technologies: project.technologies.join(', '),
        difficulty: project.difficulty,
        skills: project.skillsDeveloped.join(', ')
      })
      setSaved((current) => [...current, index])
      setSuccess(`“${project.title}” was added to your project ideas.`)
      onSaved()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSavingIndex(null)
    }
  }

  return <Card className="ai-feature-card">
    <CardHeader>
      <div><CardTitle><Wand2 size={16} />AI project recommendations</CardTitle><CardDescription>Portfolio ideas based on your saved target role and skills.</CardDescription></div>
      <Button onClick={() => void generate()} disabled={busy}>{busy ? 'Generating…' : projects.length ? 'Refresh ideas' : 'Recommend projects'}</Button>
    </CardHeader>
    <CardContent>
      {error && <ApiError title="Project recommendations could not be completed" message={error} onRetry={() => void generate()} />}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {busy && <LoadingState label="Finding portfolio projects that fit your skills" />}
      {!busy && projects.length === 0 && !error && <div className="capability-notice"><Compass size={18} /><span>Generate project ideas from your saved profile and skills, then save the ones you want to build.</span></div>}
      {!busy && projects.length > 0 && <div className="recommendation-grid">{projects.map((project, index) => {
        const isSaved = saved.includes(index)
        return <article className="recommendation-card" key={`${project.title}-${index}`}>
          <div className="recommendation-meta"><Badge tone={difficultyTone(project.difficulty)}>{project.difficulty}</Badge><Badge tone="neutral">{project.technologies.length} technologies</Badge></div>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <div className="recommendation-detail"><strong>Technologies</strong><span>{project.technologies.join(' · ')}</span></div>
          <div className="recommendation-detail"><strong>Skills developed</strong><span>{project.skillsDeveloped.join(' · ')}</span></div>
          {project.firstSteps?.length > 0 && <div className="recommendation-detail"><strong>First steps</strong><span>{project.firstSteps.join(' · ')}</span></div>}
          <div className="recommendation-actions"><Button size="sm" variant={isSaved ? 'secondary' : 'primary'} onClick={() => void saveProject(project, index)} disabled={isSaved || savingIndex === index}>{isSaved ? <Check size={14} /> : <Sparkles size={14} />}{isSaved ? 'Saved' : savingIndex === index ? 'Saving…' : 'Save project'}</Button></div>
        </article>
      })}</div>}
      {projects.length > 0 && <p className="muted-caption"><Sparkles size={14} />Recommendations are AI-generated from your saved data. Adjust them before publishing.</p>}
    </CardContent>
  </Card>
}

export default function ProjectsPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  return <>
    <ProjectRecommendations onSaved={() => setRefreshKey((current) => current + 1)} />
    <ResourceCollectionPage key={refreshKey} kind="projects" eyebrow="SHOW WHAT YOU CAN DO" title="Projects" description="Collect portfolio ideas you plan to build or have completed." fields={projectFields} emptyTitle="No project ideas yet" emptyDescription="Add an idea you want to explore." notice="Your portfolio ideas include projects you add or save from AI recommendations." />
  </>
}
