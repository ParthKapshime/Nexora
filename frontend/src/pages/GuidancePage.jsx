import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, RotateCcw, Send, Sparkles, UserRound } from 'lucide-react'
import { aiApi, getErrorMessage } from '../lib/api.js'
import { PageHeading } from '../components/PageHeading.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { ApiError, EmptyState } from '../components/ui/Feedback.jsx'
import { Textarea } from '../components/ui/Input.jsx'

function responseText(data) {
  const value = data?.choices?.[0]?.message?.content
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    const text = value.filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('\n').trim()
    if (text) return text
  }
  throw new Error('Unexpected AI response')
}

export default function GuidancePage() {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, busy])

  const request = async (conversation, isRetry = false) => {
    setBusy(true); setError('')
    if (!isRetry) setMessages(conversation)
    try {
      const { data } = await aiApi.complete(conversation.slice(-20))
      const answer = responseText(data)
      setMessages((current) => [...current, { role: 'assistant', content: answer }])
      setDraft('')
    } catch (requestError) { setError(getErrorMessage(requestError)) }
    finally { setBusy(false); textareaRef.current?.focus() }
  }

  const submit = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || busy) return
    await request([...messages, { role: 'user', content }])
  }

  const retry = () => {
    if (!messages.length || messages[messages.length - 1].role !== 'user') return
    void request(messages, true)
  }

  const clearConversation = () => {
    if (messages.length && !window.confirm('Clear this conversation from the current view?')) return
    setMessages([]); setError(''); setDraft('')
  }

  return <>
    <PageHeading eyebrow="A MOMENT OF CLARITY" title="Career guidance" description="Talk through a career question with Nexora." action={messages.length > 0 && <Button variant="secondary" onClick={clearConversation} disabled={busy}><RotateCcw size={15} />Clear conversation</Button>} />
    <Card className="chat-card"><CardHeader><div><CardTitle><span className="chat-title-icon"><Sparkles size={16} /></span>Career conversation</CardTitle><CardDescription>Ask a question about your goals, job search, or learning plans.</CardDescription></div></CardHeader><CardContent>
      <div className="chat-transcript" aria-live="polite" aria-label="Conversation">
        {messages.length === 0 && !busy ? <EmptyState icon={MessageCircle} title="What’s on your mind?" description="Start with a question about the next step you’re considering." /> : messages.map((message, index) => <article className={`chat-message chat-${message.role}`} key={`${message.role}-${index}`}><span className="chat-avatar">{message.role === 'user' ? <UserRound size={15} /> : <Bot size={15} />}</span><div className="chat-bubble"><strong>{message.role === 'user' ? 'You' : 'Nexora'}</strong><p>{message.content}</p></div></article>)}
        {busy && <div className="chat-message chat-assistant" role="status"><span className="chat-avatar"><Bot size={15} /></span><div className="chat-bubble"><strong>Nexora</strong><p className="typing-dots">Thinking<span>·</span><span>·</span><span>·</span></p></div></div>}
        <div ref={endRef} />
      </div>
      {error && <ApiError title="Nexora couldn’t respond" message={error} onRetry={retry} />}
      <form className="chat-composer" onSubmit={submit}><label className="sr-only" htmlFor="career-message">Your career question</label><Textarea ref={textareaRef} id="career-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={20000} rows={2} placeholder="Write a career question…" disabled={busy} /><div className="composer-footer"><span>Messages are sent to the Nexora backend. This conversation is not saved to your account.</span><Button type="submit" disabled={busy || !draft.trim()}><Send size={15} />{busy ? 'Sending…' : 'Send'}</Button></div></form>
    </CardContent></Card>
  </>
}
