import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Edit3, Plus, Trash2, X } from 'lucide-react'
import { applicationsApi, getErrorMessage } from '../lib/api.js'
import { PageHeading } from '../components/PageHeading.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, EmptyState, LoadingState, SuccessMessage } from '../components/ui/Feedback.jsx'
import { Input, Textarea } from '../components/ui/Input.jsx'

const statuses = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected']
const applicationSchema = z.object({
  company: z.string().trim().min(1, 'Enter a company name').max(160),
  jobTitle: z.string().trim().min(1, 'Enter a job title').max(160),
  appliedAt: z.string().min(1, 'Choose an application date'),
  status: z.enum(statuses),
  nextAction: z.string().trim().max(500, 'Next action must be 500 characters or fewer'),
  followUpAt: z.string(),
  notes: z.string().trim().max(4000, 'Notes must be 4,000 characters or fewer'),
})
function dateInputValue(value = new Date()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const emptyApplication = () => ({ company: '', jobTitle: '', appliedAt: dateInputValue(), status: 'Applied', nextAction: '', followUpAt: '', notes: '' })
function formatDate(value) { if (!value) return '—'; return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) }
function fetchApplicationData(page, filter, limit) {
  const params = { page, limit }
  if (filter !== 'All statuses') params.status = filter
  return Promise.all([applicationsApi.list(params), applicationsApi.statusCounts(statuses)])
}

function ApplicationForm({ initial, onSave, onCancel, saving }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(applicationSchema), defaultValues: initial })
  return <form className="application-form" onSubmit={handleSubmit(onSave)} noValidate>
    <div className="form-grid">
      <Field label="Company" name="company" register={register} error={errors.company?.message} placeholder="e.g. Acme Studio" />
      <Field label="Job title" name="jobTitle" register={register} error={errors.jobTitle?.message} placeholder="e.g. Product designer" />
      <Field label="Application date" name="appliedAt" type="date" register={register} error={errors.appliedAt?.message} />
      <div className="field-group"><label htmlFor="application-status">Status</label><select id="application-status" className="form-control" {...register('status')}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>{errors.status && <span className="field-error">Choose a valid status.</span>}</div>
      <Field label="Next action" name="nextAction" register={register} error={errors.nextAction?.message} placeholder="e.g. Follow up with recruiter" />
      <Field label="Follow-up date" name="followUpAt" type="date" register={register} error={errors.followUpAt?.message} />
      <div className="field-group field-wide"><label htmlFor="application-notes">Notes</label><Textarea id="application-notes" rows={3} placeholder="Notes for yourself" aria-invalid={Boolean(errors.notes)} {...register('notes')} />{errors.notes && <span className="field-error">{errors.notes.message}</span>}</div>
    </div>
    <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save application'}</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>
  </form>
}

function Field({ label, name, type = 'text', register, error, placeholder }) {
  return <div className="field-group"><label htmlFor={`application-${name}`}>{label}</label><Input id={`application-${name}`} type={type} maxLength={name === 'company' || name === 'jobTitle' ? 160 : undefined} placeholder={placeholder} aria-invalid={Boolean(error)} {...register(name)} />{error && <span className="field-error">{error}</span>}</div>
}

export default function ApplicationsPage() {
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({})
  const [filter, setFilter] = useState('All statuses')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editor, setEditor] = useState(null)
  const limit = 10

  const load = async () => {
    setLoading(true)
    try {
      const [listResponse, statusCounts] = await fetchApplicationData(page, filter, limit)
      setItems(listResponse.data.items || [])
      setTotal(listResponse.data.total || 0)
      setCounts(statusCounts)
      setError('')
    } catch (requestError) { setError(getErrorMessage(requestError)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let current = true
    fetchApplicationData(page, filter, limit).then(([listResponse, statusCounts]) => {
      if (!current) return
      setItems(listResponse.data.items || [])
      setTotal(listResponse.data.total || 0)
      setCounts(statusCounts)
      setError('')
    }).catch((requestError) => {
      if (current) setError(getErrorMessage(requestError))
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [filter, page])
  const retry = () => { setLoading(true); void load() }
  const openCreate = () => { setSuccess(''); setEditor({ mode: 'create', item: null }) }
  const openEdit = (item) => { setSuccess(''); setEditor({ mode: 'edit', item }) }

  const save = async (values) => {
    setSaving(true); setError(''); setSuccess('')
    const payload = { ...values, appliedAt: new Date(`${values.appliedAt}T12:00:00`).toISOString() }
    if (values.followUpAt) payload.followUpAt = new Date(`${values.followUpAt}T12:00:00`).toISOString()
    else if (editor.mode === 'edit' && editor.item.followUpAt) payload.followUpAt = editor.item.followUpAt
    else delete payload.followUpAt
    try {
      if (editor.mode === 'create') await applicationsApi.create(payload)
      else await applicationsApi.update(editor.item._id, payload)
      setSuccess(editor.mode === 'create' ? 'Application added.' : 'Application updated.')
      setEditor(null)
      setLoading(true)
      await load()
    } catch (requestError) { setError(getErrorMessage(requestError)) }
    finally { setSaving(false) }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete the ${item.jobTitle} application at ${item.company}?`)) return
    setError(''); setSuccess('')
    try {
      await applicationsApi.remove(item._id)
      setSuccess('Application deleted.')
      if (items.length === 1 && page > 1) { setLoading(true); setPage((current) => current - 1) }
      else { setLoading(true); await load() }
    } catch (requestError) { setError(getErrorMessage(requestError)) }
  }

  const shownStart = total === 0 ? 0 : (page - 1) * limit + 1
  const shownEnd = Math.min(page * limit, total)
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const editorInitial = editor?.mode === 'edit' ? {
    company: editor.item.company || '', jobTitle: editor.item.jobTitle || '', appliedAt: dateInputValue(editor.item.appliedAt), status: editor.item.status || 'Applied',
    nextAction: editor.item.nextAction || '', followUpAt: dateInputValue(editor.item.followUpAt), notes: editor.item.notes || '',
  } : emptyApplication()

  return <>
    <PageHeading eyebrow="KEEP YOUR SEARCH ORGANIZED" title="Job applications" description="Track each opportunity and keep your next action close." action={<Button onClick={editor ? () => setEditor(null) : openCreate}>{editor ? <X size={16} /> : <Plus size={16} />}{editor ? 'Close' : 'Add application'}</Button>} />
    {error && <ApiError message={error} onRetry={retry} />}{success && <SuccessMessage>{success}</SuccessMessage>}
    <section className="application-summary" aria-label="Application statuses">{statuses.map((status) => <Card className="status-summary" key={status}><span className="summary-dot" data-status={status} /><span className="summary-label">{status}</span><strong>{loading ? '—' : counts[status] ?? '—'}</strong></Card>)}</section>
    {editor && <Card className="application-editor"><CardHeader><div><CardTitle>{editor.mode === 'create' ? 'Add an application' : 'Edit application'}</CardTitle><CardDescription>Save the details you want to keep track of.</CardDescription></div></CardHeader><CardContent><ApplicationForm key={editor.item?._id || 'new-application'} initial={editorInitial} onSave={save} onCancel={() => setEditor(null)} saving={saving} /></CardContent></Card>}
    <Card className="application-table-card"><CardHeader><div><CardTitle>Your opportunities</CardTitle><CardDescription>{filter === 'All statuses' ? `${total} tracked ${total === 1 ? 'application' : 'applications'}` : `${total} ${filter.toLowerCase()} applications`}</CardDescription></div><label className="filter-control"><span>Filter</span><select aria-label="Filter applications by status" value={filter} onChange={(event) => { setLoading(true); setPage(1); setFilter(event.target.value) }}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label></CardHeader><CardContent>
      {loading ? <LoadingState label="Loading applications" /> : items.length === 0 ? <EmptyState icon={BriefcaseBusiness} title={filter === 'All statuses' ? 'No applications yet' : `No ${filter.toLowerCase()} applications`} description={filter === 'All statuses' ? 'Add an opportunity to keep your search organized.' : 'Try another status filter or add a new opportunity.'} action={filter === 'All statuses' && <Button onClick={openCreate} variant="secondary" size="sm"><Plus size={15} />Add application</Button>} /> : <>
        <div className="table-scroll"><table className="applications-table"><thead><tr><th>Company</th><th>Role</th><th>Applied</th><th>Status</th><th>Next action</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><span className="company-cell"><span className="company-avatar">{item.company?.slice(0, 1).toUpperCase()}</span><strong>{item.company}</strong></span></td><td>{item.jobTitle}</td><td>{formatDate(item.appliedAt)}</td><td><StatusBadge status={item.status} /></td><td><span className="next-action-cell">{item.nextAction || '—'}{item.followUpAt && <small><CalendarDays size={12} />{formatDate(item.followUpAt)}</small>}</span></td><td><div className="row-actions"><Button variant="ghost" size="icon" aria-label={`Edit ${item.jobTitle} at ${item.company}`} onClick={() => openEdit(item)}><Edit3 size={15} /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${item.jobTitle} at ${item.company}`} onClick={() => void remove(item)}><Trash2 size={15} /></Button></div></td></tr>)}</tbody></table></div>
        <div className="mobile-application-list">{items.map((item) => <article className="mobile-application-card" key={item._id}><div className="mobile-application-heading"><span className="company-avatar">{item.company?.slice(0, 1).toUpperCase()}</span><div><strong>{item.jobTitle}</strong><small>{item.company}</small></div><StatusBadge status={item.status} /></div><p>Applied {formatDate(item.appliedAt)}{item.followUpAt ? ` · Follow up ${formatDate(item.followUpAt)}` : ''}</p>{item.nextAction && <p className="mobile-next-action">Next: {item.nextAction}</p>}<div className="row-actions"><Button variant="secondary" size="sm" onClick={() => openEdit(item)}><Edit3 size={14} />Edit</Button><Button variant="ghost" size="sm" onClick={() => void remove(item)}><Trash2 size={14} />Delete</Button></div></article>)}</div>
        <div className="pagination"><span>Showing {shownStart}–{shownEnd} of {total}</span><div><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { setLoading(true); setPage((current) => current - 1) }}><ArrowLeft size={14} />Previous</Button><span>Page {page} of {pageCount}</span><Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => { setLoading(true); setPage((current) => current + 1) }}>Next<ArrowRight size={14} /></Button></div></div>
      </>}
    </CardContent></Card>
  </>
}
