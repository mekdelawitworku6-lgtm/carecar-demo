import { Car, Store, ShieldCheck, ArrowRight, Sparkles, Database, MousePointerClick } from 'lucide-react'
import hero from '../assets/hero.png'
import { switchDemoRole } from './actions'
import './demo.css'

const CARDS = [
  {
    role: 'CUSTOMER',
    icon: Car,
    title: 'Customer',
    tagline: 'Book a wash in minutes',
    points: ['Explore nearby stations', 'Pick a bay & time slot', 'Track the wash live'],
    tone: 'customer',
  },
  {
    role: 'BUSINESS_OWNER',
    icon: Store,
    title: 'Business Owner',
    tagline: 'Run the whole station',
    points: ['Manage bookings & staff', 'Set services and slots', 'Track revenue & reports'],
    tone: 'owner',
  },
  {
    role: 'ADMIN',
    icon: ShieldCheck,
    title: 'Admin',
    tagline: 'Operate the platform',
    points: ['Approve new businesses', 'Monitor payments & fees', 'View platform analytics'],
    tone: 'admin',
  },
]

export default function DemoLogin() {
  return (
    <div className="demo-login">
      <div className="demo-login-glow" />
      <header className="demo-login-header">
        <div className="demo-login-brand">
          <span className="demo-login-mark"><Car size={20} /></span>
          <span>CareCar <em>PRO</em></span>
        </div>
        <span className="demo-login-pill">Interactive Portfolio Demo</span>
      </header>

      <main className="demo-login-main">
        <section className="demo-login-intro">
          <span className="demo-login-eyebrow"><Sparkles size={14} /> On-demand car wash marketplace</span>
          <h1>See the whole<br /><span>platform in action.</span></h1>
          <p>
            A clickable, backend-free walkthrough of the CareCar web app. Choose a
            role below to open the real dashboards, populated with realistic
            sample data — no sign-up, no password, no waiting.
          </p>
          <div className="demo-login-facts">
            <span><MousePointerClick size={15} /> 3 roles · 20+ screens</span>
            <span><Database size={15} /> 100% in-browser data</span>
          </div>
          <img className="demo-login-hero" src={hero} alt="Car being washed" />
        </section>

        <section className="demo-login-cards">
          {CARDS.map(({ role, icon: Icon, title, tagline, points, tone }) => (
            <button key={role} className={`demo-entry-card ${tone}`} onClick={() => switchDemoRole(role)}>
              <span className="demo-entry-icon"><Icon size={24} /></span>
              <span className="demo-entry-title">{title}</span>
              <span className="demo-entry-tagline">{tagline}</span>
              <ul className="demo-entry-points">
                {points.map(point => <li key={point}>{point}</li>)}
              </ul>
              <span className="demo-entry-cta">Enter demo <ArrowRight size={15} /></span>
            </button>
          ))}
        </section>
      </main>

      <footer className="demo-login-footer">
        Portfolio demonstration · Built with React, Redux Toolkit & Vite · All data is fictional
      </footer>
    </div>
  )
}
