import { Activity, CircleHelp, Sparkles } from 'lucide-react'
import { ResourceCollectionPage } from '../components/ResourceCollectionPage.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'

function AssessmentNotice() {
  return <Card className="assessment-card"><CardHeader><div><CardTitle>Skills analysis</CardTitle><CardDescription>Skill records available from your workspace.</CardDescription></div><span className="stat-icon blue"><Activity size={18} /></span></CardHeader><CardContent><div className="capability-notice"><CircleHelp size={18} /><span>Skill analysis, career-readiness scores, and generated skill gaps aren’t supported by the current API. Nothing here is presented as an assessment.</span></div><p className="muted-caption"><Sparkles size={14} /> Skills below are self-reported entries.</p></CardContent></Card>
}

export default function SkillsPage() {
  return <><AssessmentNotice /><ResourceCollectionPage kind="skills" eyebrow="KNOW WHAT YOU BRING" title="Your skills" description="Keep a personal record of the skills you have or want to grow." fields={[{ name: 'name', label: 'Skill', placeholder: 'e.g. User research' }, { name: 'category', label: 'Category', placeholder: 'e.g. Design' }, { name: 'level', label: 'Level or note', placeholder: 'e.g. Practicing' }]} emptyTitle="No skills saved" emptyDescription="Add a skill to begin your personal list." /></>
}
