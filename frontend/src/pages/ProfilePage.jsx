import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FileText, Plus, Save, Trash2, Upload, UserRound } from 'lucide-react'
import { getErrorMessage, profileApi } from '../lib/api.js'
import { useAuth } from '../context/useAuth.js'
import { PageHeading } from '../components/PageHeading.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, LoadingState, SuccessMessage } from '../components/ui/Feedback.jsx'
import { Input } from '../components/ui/Input.jsx'

const profileSchema = z.object({
  fullName: z.string().trim().max(120, 'Name must be 120 characters or fewer'),
  targetRole: z.string().trim().max(120, 'Target role must be 120 characters or fewer'),
  yearsOfExperience: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), z.number().min(0).max(80).optional()),
})
const educationSchema = z.object({
  institution: z.string().trim().max(160), degree: z.string().trim().max(120), field: z.string().trim().max(120),
  graduationYear: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), z.number().int().min(1950).max(2100).optional()),
})

function emptyEducation() { return { institution: '', degree: '', field: '', graduationYear: '' } }
function completionCount(profile, education, resume) {
  return [Boolean(profile.fullName?.trim()), Boolean(profile.targetRole?.trim()), profile.yearsOfExperience !== undefined && profile.yearsOfExperience !== null, education.length > 0, Boolean(resume)].filter(Boolean).length
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({})
  const [education, setEducation] = useState([])
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const schema = useMemo(() => profileSchema, [])
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { fullName: '', targetRole: '', yearsOfExperience: '' } })

  const load = useCallback(async () => {
    try {
      const { data } = await profileApi.get()
      const current = data.profile || {}
      setProfile(current)
      setEducation(Array.isArray(current.education) ? current.education.map((entry) => ({ ...emptyEducation(), ...entry, graduationYear: entry.graduationYear ?? '' })) : [])
      setResume(current.resume || null)
      reset({ fullName: current.fullName || '', targetRole: current.targetRole || '', yearsOfExperience: current.yearsOfExperience ?? '' })
      setError('')
    } catch (requestError) { setError(getErrorMessage(requestError)) }
    finally { setLoading(false) }
  }, [reset])

  useEffect(() => {
    let current = true
    profileApi.get().then(({ data }) => {
      if (!current) return
      const currentProfile = data.profile || {}
      setProfile(currentProfile)
      setEducation(Array.isArray(currentProfile.education) ? currentProfile.education.map((entry) => ({ ...emptyEducation(), ...entry, graduationYear: entry.graduationYear ?? '' })) : [])
      setResume(currentProfile.resume || null)
      reset({ fullName: currentProfile.fullName || '', targetRole: currentProfile.targetRole || '', yearsOfExperience: currentProfile.yearsOfExperience ?? '' })
      setError('')
    }).catch((requestError) => {
      if (current) setError(getErrorMessage(requestError))
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [reset])
  const retry = () => { setLoading(true); void load() }

  const save = async (values) => {
    const normalizedEducation = []
    for (const entry of education) {
      const hasValue = Object.values(entry).some((value) => value !== '' && value !== undefined)
      if (!hasValue) continue
      const result = educationSchema.safeParse(entry)
      if (!result.success) {
        setError('Check the education details and graduation years, then try again.')
        return
      }
      normalizedEducation.push(Object.fromEntries(Object.entries(result.data).filter(([, value]) => value !== undefined)))
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload = { fullName: values.fullName, targetRole: values.targetRole, education: normalizedEducation }
      if (values.yearsOfExperience !== undefined) payload.yearsOfExperience = values.yearsOfExperience
      const { data } = await profileApi.update(payload)
      const next = data.profile || {}
      setProfile(next)
      setEducation(Array.isArray(next.education) ? next.education.map((entry) => ({ ...emptyEducation(), ...entry, graduationYear: entry.graduationYear ?? '' })) : [])
      setSuccess('Your profile details were saved.')
    } catch (requestError) { setError(getErrorMessage(requestError)) }
    finally { setSaving(false) }
  }

  const uploadResume = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const isPdfName = file.name.toLowerCase().endsWith('.pdf')
    if (!isPdfName || file.type !== 'application/pdf') {
      setError('Choose a PDF file. The server accepts PDF resumes only.')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('This file is over the 5 MiB upload limit.')
      event.target.value = ''
      return
    }
    setUploading(true); setError(''); setSuccess('')
    try {
      const { data } = await profileApi.uploadResume(file)
      setResume(data.resume)
      setSuccess('Your PDF resume was uploaded.')
    } catch (requestError) { setError(getErrorMessage(requestError)) }
    finally { setUploading(false); event.target.value = '' }
  }

  const deleteResume = async () => {
    if (!window.confirm('Remove the saved resume from your profile?')) return
    setUploading(true); setError(''); setSuccess('')
    try {
      await profileApi.removeResume()
      setResume(null)
      setSuccess('Your resume was removed.')
    } catch (requestError) { setError(getErrorMessage(requestError)) }
    finally { setUploading(false) }
  }

  const updateEducation = (index, key, value) => setEducation((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  const completion = completionCount(profile, education, resume)
  if (loading) return <LoadingState label="Loading your profile" />

  return <>
    <PageHeading eyebrow="YOUR STORY" title="Profile & resume" description="Keep the experience and goals that guide your next step up to date." action={<span className="completion-chip"><UserRound size={15} />{completion} of 5 profile details</span>} />
    {error && <ApiError message={error} onRetry={retry} />}
    {success && <SuccessMessage>{success}</SuccessMessage>}
    <div className="profile-grid">
      <Card><CardHeader><div><CardTitle>Personal details</CardTitle><CardDescription>Information saved with your Nexora account.</CardDescription></div></CardHeader><CardContent>
        <form onSubmit={handleSubmit(save)} noValidate>
          <div className="form-grid">
            <div className="field-group"><label htmlFor="fullName">Full name</label><Input id="fullName" maxLength={120} placeholder="Your name" aria-invalid={Boolean(errors.fullName)} {...register('fullName')} />{errors.fullName && <span className="field-error">{errors.fullName.message}</span>}</div>
            <div className="field-group"><label htmlFor="email">Email address</label><Input id="email" type="email" value={user?.email || ''} readOnly disabled aria-describedby="email-help" /><span className="field-hint" id="email-help">Your account email can’t be changed here.</span></div>
            <div className="field-group"><label htmlFor="targetRole">Target job role</label><Input id="targetRole" maxLength={120} placeholder="e.g. Product designer" aria-invalid={Boolean(errors.targetRole)} {...register('targetRole')} />{errors.targetRole && <span className="field-error">{errors.targetRole.message}</span>}</div>
            <div className="field-group"><label htmlFor="yearsOfExperience">Years of experience</label><Input id="yearsOfExperience" type="number" min="0" max="80" step="0.5" placeholder="e.g. 2" aria-invalid={Boolean(errors.yearsOfExperience)} {...register('yearsOfExperience')} />{errors.yearsOfExperience && <span className="field-error">Enter a value from 0 to 80.</span>}</div>
          </div>

          <div className="education-section"><div className="section-subheading"><div><h3>Education</h3><p>Add the education information you want associated with your profile.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => setEducation((current) => [...current, emptyEducation()])}><Plus size={14} />Add education</Button></div>
            {education.length === 0 && <p className="field-hint">No education details saved yet.</p>}
            {education.map((entry, index) => <fieldset className="education-entry" key={index}><legend>Education {index + 1}</legend><div className="form-grid"><div className="field-group"><label htmlFor={`institution-${index}`}>Institution</label><Input id={`institution-${index}`} maxLength={160} value={entry.institution} onChange={(e) => updateEducation(index, 'institution', e.target.value)} /></div><div className="field-group"><label htmlFor={`degree-${index}`}>Degree</label><Input id={`degree-${index}`} maxLength={120} value={entry.degree} onChange={(e) => updateEducation(index, 'degree', e.target.value)} /></div><div className="field-group"><label htmlFor={`field-${index}`}>Field of study</label><Input id={`field-${index}`} maxLength={120} value={entry.field} onChange={(e) => updateEducation(index, 'field', e.target.value)} /></div><div className="field-group"><label htmlFor={`graduation-${index}`}>Graduation year</label><Input id={`graduation-${index}`} type="number" min="1950" max="2100" value={entry.graduationYear} onChange={(e) => updateEducation(index, 'graduationYear', e.target.value)} /></div></div><Button type="button" size="sm" variant="ghost" onClick={() => setEducation((current) => current.filter((_, i) => i !== index))}>Remove education</Button></fieldset>)}
          </div>
          <Button type="submit" disabled={saving}><Save size={15} />{saving ? 'Saving…' : 'Save profile'}</Button>
        </form>
      </CardContent></Card>

      <div className="profile-side-column"><Card><CardHeader><div><CardTitle>Resume</CardTitle><CardDescription>Upload a PDF to keep it with your profile.</CardDescription></div></CardHeader><CardContent>
        <label className={`resume-dropzone ${uploading ? 'is-disabled' : ''}`} htmlFor="resume-file"><span className="upload-icon"><Upload size={20} /></span><strong>Choose a PDF resume</strong><small>PDF only · up to 5 MiB</small><span className="button button-secondary">Browse files</span><input id="resume-file" type="file" accept="application/pdf,.pdf" onChange={uploadResume} disabled={uploading} /></label>
        {uploading && <LoadingState label="Updating your resume" />}
        {resume && <div className="resume-summary"><span className="resume-file-icon"><FileText size={18} /></span><span className="resume-meta"><strong>{resume.originalName || 'Saved resume'}</strong><small>{resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : 'Uploaded'} · {resume.size ? `${(resume.size / 1024 / 1024).toFixed(1)} MB` : 'PDF'}</small></span><Button variant="ghost" size="icon" aria-label="Remove resume" onClick={() => void deleteResume()} disabled={uploading}><Trash2 size={15} /></Button></div>}
        <div className="inline-notice">Upload status is available. Resume analysis or processing status is not returned by the current API.</div>
      </CardContent></Card>
      <Card className="profile-completion"><CardHeader><div><CardTitle>Profile details</CardTitle><CardDescription>Based on the information you’ve saved.</CardDescription></div></CardHeader><CardContent><div className="progress-caption"><strong>{completion}/5 details present</strong><span>{completion * 20}%</span></div><div className="progress-track" role="progressbar" aria-label="Profile details present" aria-valuemin="0" aria-valuemax="5" aria-valuenow={completion}><span style={{ width: `${completion * 20}%` }} /></div><ul className="completion-list">{[
        ['Full name', Boolean(profile.fullName)], ['Target role', Boolean(profile.targetRole)], ['Experience', profile.yearsOfExperience !== undefined && profile.yearsOfExperience !== null], ['Education', education.length > 0], ['Resume', Boolean(resume)],
      ].map(([label, done]) => <li key={label}><span className={`completion-dot ${done ? 'is-complete' : ''}`} />{label}<span>{done ? 'Added' : 'Not added'}</span></li>)}</ul></CardContent></Card></div>
    </div>
  </>
}
