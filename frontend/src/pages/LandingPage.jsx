import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Compass, FileUser, GraduationCap, Sparkles, Target } from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  { icon: FileUser, tone: 'peach', title: 'Bring your story together', detail: 'Keep your experience, resume, and career direction in one place.' },
  { icon: Target, tone: 'blue', title: 'See what you’re tracking', detail: 'Record the skills, projects, and learning steps you choose.' },
  { icon: Compass, tone: 'lavender', title: 'Move at your own pace', detail: 'Plan your next step and keep opportunities from slipping by.' },
]

export default function LandingPage() {
  const reduceMotion = useReducedMotion()
  return <div className="landing-page">
    <header className="landing-header">
      <Link className="brand" to="/"><span className="brand-mark"><Sparkles size={17} /></span><span>Nexora</span></Link>
      <nav aria-label="Account navigation"><Link className="header-login" to="/login">Sign in</Link><Link className="button button-primary" to="/register">Get started <ArrowRight size={15} /></Link></nav>
    </header>
    <main>
      <section className="landing-hero">
        <motion.div className="hero-copy" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <span className="eyebrow"><span className="eyebrow-dot" /> CAREER PLANNING, IN FOCUS</span>
          <h1>Your next chapter<br /><em>starts with a step.</em></h1>
          <p>Give your career goals room to grow. Keep your profile, learning plan, and opportunities together in a workspace built around your next move.</p>
          <div className="hero-actions"><Link className="button button-primary" to="/register">Create your account <ArrowRight size={16} /></Link><Link className="button button-secondary" to="/login">I already have an account</Link></div>
          <span className="hero-footnote">Your path is personal. Your progress is yours.</span>
        </motion.div>
        <div className="hero-visual" aria-label="A preview of your career workspace">
          <div className="preview-card">
            <div className="preview-heading"><span className="preview-mark"><Sparkles size={14} /></span><span>YOUR CAREER WORKSPACE</span><span className="preview-date">TODAY</span></div>
            <div className="preview-goal"><span className="preview-icon peach"><Compass size={18} /></span><span><small>YOUR DIRECTION</small><strong>A career that feels like yours</strong></span><ArrowRight className="preview-arrow" size={16} /></div>
            <div className="preview-grid">{features.map(({ icon: Icon, tone, title, detail }) => <article className="preview-tile" key={title}><span className={`tile-icon ${tone}`}><Icon size={17} /></span><strong>{title}</strong><small>{detail}</small></article>)}</div>
            <div className="preview-footer"><span>Small steps count.</span><span className="preview-progress"><i /></span></div>
          </div>
          <span className="hero-orbit orbit-a" /><span className="hero-orbit orbit-b" /><span className="hero-spark"><GraduationCap size={21} /></span>
        </div>
      </section>
      <section className="landing-features" aria-labelledby="features-heading"><div><span className="eyebrow">A LITTLE MORE CLARITY</span><h2 id="features-heading">Everything you need to keep moving.</h2></div><p>Build a thoughtful career workspace from the information you add and the steps you decide to take.</p></section>
      <div className="feature-row">{features.map(({ icon: Icon, tone, title, detail }) => <article className="feature-card" key={title}><span className={`tile-icon ${tone}`}><Icon size={18} /></span><h3>{title}</h3><p>{detail}</p></article>)}</div>
    </main>
    <footer className="landing-footer"><span>© Nexora</span><span>Career, in focus <ArrowRight size={13} /></span></footer>
  </div>
}
