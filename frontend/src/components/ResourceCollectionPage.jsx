import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { ArrowUpRight, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useResourceCollection } from '../hooks/useResourceCollection.js'
import { PageHeading } from './PageHeading.jsx'
import { Button } from './ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card.jsx'
import { ApiError, EmptyState, LoadingState, SuccessMessage } from './ui/Feedback.jsx'
import { Input, Textarea } from './ui/Input.jsx'

function makeSchema(fields) {
  return z.object(Object.fromEntries(fields.map(({ name, label }, index) => [name, index === 0
    ? z.string().trim().min(1, `${label} is required`).max(1000, `${label} is too long`)
    : z.string().trim().max(1000, `${label} is too long`)])))
}

function ResourceForm({ fields, initial, onSubmit, onCancel, saving }) {
  const schema = useMemo(() => makeSchema(fields), [fields])
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: initial })
  const submit = async (values) => {
    const cleaned = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()))
    if (!Object.keys(cleaned).length) return
    const success = await onSubmit(cleaned)
    if (success) reset(Object.fromEntries(fields.map((field) => [field.name, ''])))
  }
  return <form className="resource-form" onSubmit={handleSubmit(submit)}>
    <div className="form-grid">{fields.map((field) => <div className="field-group" key={field.name}>
      <label htmlFor={`resource-${field.name}`}>{field.label}</label>
      {field.type === 'textarea' ? <Textarea id={`resource-${field.name}`} rows={3} placeholder={field.placeholder} aria-invalid={Boolean(errors[field.name])} {...register(field.name)} /> : <Input id={`resource-${field.name}`} placeholder={field.placeholder} aria-invalid={Boolean(errors[field.name])} {...register(field.name)} />}
      {errors[field.name] && <span className="field-error">{errors[field.name].message}</span>}
    </div>)}</div>
    <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save item'}</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>
  </form>
}

function displayName(data, kind) {
  return data.title || data.name || data.skill || (kind === 'skill' ? 'Skill entry' : kind === 'roadmap' ? 'Learning milestone' : 'Project idea')
}

export function ResourceCollectionPage({ kind, eyebrow, title, description, fields, emptyTitle, emptyDescription, notice, doneKey }) {
  const { items, loading, saving, error, setError, success, create, update, remove, refresh } = useResourceCollection(kind)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const doneCount = items.filter((item) => item.data?.[doneKey] === true).length
  const onSubmit = async (values) => {
    const success = editing
      ? await update(editing, { ...editing.data, ...values }, 'Your changes were saved.')
      : await create(doneKey ? { ...values, [doneKey]: false } : values)
    if (success) { setFormOpen(false); setEditing(null) }
    return success
  }
  const startEdit = (item) => {
    setError('')
    setEditing(item)
    setFormOpen(true)
  }
  const deleteItem = async (item) => {
    if (!window.confirm(`Delete “${displayName(item.data || {}, kind)}”? This cannot be undone.`)) return
    await remove(item)
  }
  const updateDone = async (item) => update(item, { ...item.data, [doneKey]: !item.data?.[doneKey] }, item.data?.[doneKey] ? 'Milestone reopened.' : 'Milestone marked complete.')
  const initial = editing ? Object.fromEntries(fields.map((field) => [field.name, String(editing.data?.[field.name] ?? '')])) : Object.fromEntries(fields.map((field) => [field.name, '']))

  return <>
    <PageHeading eyebrow={eyebrow} title={title} description={description} action={<Button onClick={() => { setEditing(null); setFormOpen(!formOpen); setError('') }}>{formOpen ? <X size={16} /> : <Plus size={16} />}{formOpen ? 'Close form' : 'Add item'}</Button>} />
    {notice && <div className="capability-notice"><SparkleIcon /> <span>{notice}</span></div>}
    {error && <ApiError message={error} onRetry={() => void refresh()} />}
    {success && <SuccessMessage>{success}</SuccessMessage>}
    {doneKey && <Card className="roadmap-progress"><div><div className="progress-caption"><strong>Your saved milestones</strong><span>{doneCount} of {items.length} completed</span></div><div className="progress-track" role="progressbar" aria-label="Saved roadmap completion" aria-valuemin="0" aria-valuemax={items.length || 1} aria-valuenow={doneCount}><span style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} /></div></div></Card>}
    {formOpen && <Card className="resource-editor"><CardHeader><div><CardTitle>{editing ? 'Edit item' : 'Add to your workspace'}</CardTitle><CardDescription>These are notes you provide and save to your account.</CardDescription></div></CardHeader><CardContent><ResourceForm key={editing?._id || 'new'} fields={fields} initial={initial} onSubmit={onSubmit} onCancel={() => { setEditing(null); setFormOpen(false) }} saving={saving} /></CardContent></Card>}
    <Card><CardHeader><div><CardTitle>{kind === 'skill' ? 'Skills you’re tracking' : kind === 'roadmap' ? 'Your learning plan' : 'Your project ideas'}</CardTitle><CardDescription>{items.length} {items.length === 1 ? 'saved item' : 'saved items'}</CardDescription></div></CardHeader><CardContent>
      {loading ? <LoadingState label="Loading your saved items" /> : items.length === 0 ? <EmptyState title={emptyTitle} description={emptyDescription} action={<Button onClick={() => setFormOpen(true)} variant="secondary" size="sm"><Plus size={15} />Add your first item</Button>} /> : <div className="saved-items">{items.map((item) => {
        const data = item.data || {}
        const name = displayName(data, kind)
        const detail = fields.filter((field) => field.name !== 'title' && field.name !== 'name' && field.name !== 'skill').map((field) => data[field.name] ? `${field.label}: ${data[field.name]}` : '').filter(Boolean).join(' · ')
        return <article className={`saved-item ${doneKey && data[doneKey] ? 'saved-item-done' : ''}`} key={item._id}>
          {doneKey && <button className="check-button" aria-label={`${data[doneKey] ? 'Reopen' : 'Complete'} ${name}`} aria-pressed={Boolean(data[doneKey])} onClick={() => void updateDone(item)} disabled={saving}>{data[doneKey] ? <Check size={15} /> : null}</button>}
          <div className="saved-item-copy"><div className="saved-item-title"><h3>{name}</h3>{doneKey && <span className={`item-state ${data[doneKey] ? 'item-state-done' : ''}`}>{data[doneKey] ? 'Complete' : 'In progress'}</span>}</div>{detail && <p>{detail}</p>}</div>
          <div className="saved-item-actions"><Button variant="ghost" size="icon" aria-label={`Edit ${name}`} onClick={() => startEdit(item)}><Pencil size={15} /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${name}`} onClick={() => void deleteItem(item)}><Trash2 size={15} /></Button></div>
        </article>
      })}</div>}
    </CardContent></Card>
  </>
}

function SparkleIcon() { return <ArrowUpRight size={16} aria-hidden="true" /> }
