import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, BriefcaseBusiness, CircleHelp, FileUser, GraduationCap, Sparkles, Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { applicationsApi, getErrorMessage, profileApi, resourcesApi } from '../lib/api.js'
import { PageHeading } from '../components/PageHeading.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, EmptyState, LoadingState } from '../components/ui/Feedback.jsx'

const appStatuses = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected']

function fetchDashboardData() {
  return Promise.allSettled([
    profileApi.get(), resourcesApi.list('skills'), resourcesApi.list('roadmaps'), applicationsApi.list({ limit: 5 }), applicationsApi.statusCounts(appStatuses),
  ])
}

function applyDashboardData(results, setData, setFailures, setLoading) {
  const [profileResult, skillsResult, roadmapResult, appsResult, countsResult] = results
  setData({
    profile: profileResult.status === 'fulfilled' ? profileResult.value.data.profile : null,
    skills: skillsResult.status === 'fulfilled' ? skillsResult.value.data.items || [] : [],
    roadmaps: roadmapResult.status === 'fulfilled' ? roadmapResult.value.data.items || [] : [],
    applications: appsResult.status === 'fulfilled' ? appsResult.value.data.items || [] : [],
    applicationTotal: appsResult.status === 'fulfilled' ? appsResult.value.data.total || 0 : 0,
    applicationCounts: countsResult.status === 'fulfilled' ? countsResult.value : {},
  })
  setFailures(results.flatMap((result, index) => result.status === 'rejected' ? [{ index, message: getErrorMessage(result.reason) }] : []))
  setLoading(false)
}

export default function DashboardPage() {
  const [data, setData] = useState({ profile: null, skills: [], roadmaps: [], applications: [], applicationTotal: 0, applicationCounts: {} })
  const [loading, setLoading] = useState(true)
  const [failures, setFailures] = useState([])

  useEffect(() => {
    let current = true
    fetchDashboardData().then((results) => { if (current) applyDashboardData(results, setData, setFailures, setLoading) })
    return () => { current = false }
  }, [])
  const retry = () => {
    setLoading(true)
    fetchDashboardData().then((results) => applyDashboardData(results, setData, setFailures, setLoading))
  }
  const firstName = data.profile?.fullName?.trim().split(/\s+/)[0]
  const completionCount = [data.profile?.fullName, data.profile?.targetRole, data.profile?.yearsOfExperience !== undefined, data.profile?.education?.length, data.profile?.resume].filter(Boolean).length
  const doneTasks = data.roadmaps.filter((entry) => entry.data?.completed === true).length
  const statusData = useMemo(() => appStatuses.map((status) => ({ status, total: data.applicationCounts[status] || 0 })), [data.applicationCounts])
  const failed = (index) => failures.some((failure) => failure.index === index)

  return <>
    <PageHeading eyebrow="YOUR CAREER, IN FOCUS" title={`Good to see you${firstName ? `, ${firstName}` : ''}.`} description="A clear view of the steps you’re taking toward your next opportunity." action={<Button asChild><Link to="/profile"><FileUser size={16} />Your profile</Link></Button>} />
    {failures.length > 0 && <ApiError title="Some workspace data could not be loaded" message={failures[0].message} onRetry={retry} />}
    <section className="welcome-banner"><div className="welcome-copy"><span className="banner-kicker"><Sparkles size={15} /> YOUR NEXT STEP</span><h2>{data.profile?.targetRole ? `Keep moving toward ${data.profile.targetRole}` : 'Start with the role you want.'}</h2><p>{data.profile?.targetRole ? 'Your career goal is saved. Add the skills and learning steps you want to work on.' : 'Choose a target role in your profile to give your career workspace direction.'}</p><Link className="banner-link" to="/profile">{data.profile?.targetRole ? 'Review your profile' : 'Set your career goal'} <ArrowRight size={15} /></Link></div><div className="banner-motif" aria-hidden="true"><span /><Target size={36} /></div></section>

    <section className="stat-grid" aria-label="Career workspace overview">
      <Card className="stat-card"><CardContent><span className="stat-icon peach"><FileUser size={18} /></span><span className="stat-label">Profile details</span><strong className="stat-value">{loading || failed(0) ? '—' : `${completionCount}/5`}</strong><small>Details present in your profile</small></CardContent></Card>
      <Card className="stat-card"><CardContent><span className="stat-icon blue"><Activity size={18} /></span><span className="stat-label">Skills you track</span><strong className="stat-value">{loading || failed(1) ? '—' : data.skills.length}</strong><small>Self-reported skill entries</small></CardContent></Card>
      <Card className="stat-card"><CardContent><span className="stat-icon lavender"><GraduationCap size={18} /></span><span className="stat-label">Learning items done</span><strong className="stat-value">{loading || failed(2) ? '—' : `${doneTasks}/${data.roadmaps.length}`}</strong><small>Based on your saved milestones</small></CardContent></Card>
      <Card className="stat-card"><CardContent><span className="stat-icon peach"><BriefcaseBusiness size={18} /></span><span className="stat-label">Applications tracked</span><strong className="stat-value">{loading || failed(3) ? '—' : data.applicationTotal}</strong><small>Tracked opportunities</small></CardContent></Card>
    </section>

    <div className="dashboard-grid">
      <Card><CardHeader><div><CardTitle>Application progress</CardTitle><CardDescription>Status counts returned by the backend.</CardDescription></div><Link className="card-link" to="/applications">Open tracker <ArrowRight size={14} /></Link></CardHeader><CardContent className="chart-area">{loading ? <LoadingState label="Loading applications" /> : failures.some((failure) => failure.index === 4) ? <EmptyState icon={CircleHelp} title="Application totals unavailable" description="Retry to load the current status counts." /> : Object.values(data.applicationCounts).every((count) => count === 0) ? <EmptyState icon={BriefcaseBusiness} title="No applications to chart" description="Add opportunities to see their current status here." action={<Button asChild variant="secondary" size="sm"><Link to="/applications">Open tracker</Link></Button>} /> : <ResponsiveContainer width="100%" height={220}><BarChart data={statusData} margin={{ top: 8, right: 6, left: -18, bottom: 2 }}><CartesianGrid vertical={false} stroke="#f0ece7" /><XAxis dataKey="status" tick={{ fontSize: 10, fill: '#77716d' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#928a84' }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#faf7f3' }} /><Bar dataKey="total" name="Applications" fill="#a9553d" radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer>}</CardContent></Card>
      <Card><CardHeader><div><CardTitle>Your workspace</CardTitle><CardDescription>Choose a place to continue.</CardDescription></div></CardHeader><CardContent className="module-links">{[
        { title: 'Skills', detail: 'Keep a record of what you know.', to: '/skills', icon: Activity, tone: 'blue' },
        { title: 'Learning roadmap', detail: 'Organize your learning milestones.', to: '/learning', icon: GraduationCap, tone: 'lavender' },
        { title: 'Career guidance', detail: 'Talk through your next question.', to: '/guidance', icon: Sparkles, tone: 'peach' },
      ].map(({ title, detail, to, icon: Icon, tone }) => <Link className="module-link" to={to} key={to}><span className={`module-icon ${tone}`}><Icon size={17} /></span><span><b>{title}</b><small>{detail}</small></span><ArrowRight size={15} /></Link>)}</CardContent></Card>
    </div>

    <Card className="recent-applications"><CardHeader><div><CardTitle>Recent applications</CardTitle><CardDescription>Latest entries from your tracker.</CardDescription></div><Link className="card-link" to="/applications">View all <ArrowRight size={14} /></Link></CardHeader><CardContent>{loading ? <LoadingState label="Loading your applications" /> : failures.some((failure) => failure.index === 3) ? <EmptyState icon={CircleHelp} title="Application data unavailable" description="Retry to connect to your application tracker." /> : data.applications.length ? <div className="recent-list">{data.applications.map((item) => <div className="recent-row" key={item._id}><span className="company-avatar">{item.company?.slice(0, 1).toUpperCase()}</span><span className="recent-label"><b>{item.jobTitle}</b><small>{item.company}</small></span><StatusBadge status={item.status} /></div>)}</div> : <EmptyState icon={BriefcaseBusiness} title="No applications yet" description="Add an opportunity to keep your search organized." action={<Button asChild variant="secondary" size="sm"><Link to="/applications">Add an application</Link></Button>} />}</CardContent></Card>
    {typeof data.profile?.readiness?.score === 'number' ? <Card className="readiness-card"><CardContent><div className="progress-caption"><strong><Target size={15} /> Career readiness estimate</strong><span>{data.profile.readiness.score}%</span></div><div className="progress-track" role="progressbar" aria-label="Career readiness estimate" aria-valuemin="0" aria-valuemax="100" aria-valuenow={data.profile.readiness.score}><span style={{ width: `${data.profile.readiness.score}%` }} /></div><p className="readiness-summary-text">{data.profile.readiness.summary}</p><div className="readiness-footer"><span>AI-assisted estimate based on your saved profile and skills{data.profile.readiness.updatedAt ? ` · Updated ${new Date(data.profile.readiness.updatedAt).toLocaleDateString()}` : ''}</span><Link className="card-link" to="/skills">Review skills analysis <ArrowRight size={14} /></Link></div></CardContent></Card> : <div className="readiness-note"><Target size={15} /><span>Career readiness has not been assessed yet. Analyze your saved skills to get an AI-assisted estimate.</span><Link to="/skills">Analyze skills <ArrowRight size={14} /></Link></div>}
  </>
}
