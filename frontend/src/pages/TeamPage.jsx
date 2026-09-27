import './TeamPage.css'

/* ─────────────────────────────────────────────────────────────────────────────
   Team data — all content is factual and honest
───────────────────────────────────────────────────────────────────────────── */

const TEAM_LEAD = {
  initials: 'HA',
  name: 'Hasnain Ahmad',
  title: 'Team Lead · AI Engineer',
  badge: 'Team Lead',
  linkedin: 'https://www.linkedin.com/in/hasnain-ahmad-047210349/',
  description:
    'Hasnain led Incident Commander from scenario design to final integration. He owned the incident workflow, backend pipeline, independent fix validation, and the live war-room dashboard.',
  tags: [
    'Team Leadership',
    'AI Workflow Design',
    'Backend Engineering',
    'FastAPI',
    'Pipeline Validation',
    'Frontend Dashboard',
    'UX Integration',
    'Demo Architecture',
  ],
  avatarColor: 'lead',
}

const MEMBERS = [
  {
    initials: 'MU',
    name: 'Muhammad Umair',
    title: 'Bob 2.0 Agent Engineer',
    description:
      'Muhammad designed the AI investigation workflow at the core of Incident Commander. He defined the Log Analyst, Code Historian, and Fix Writer roles and their handoff contract, enabling parallel investigation before a concrete remediation proposal is produced.',
    tags: [
      'IBM Bob 2.0',
      'Multi-Agent Systems',
      'Agent Orchestration',
      'Parallel Investigation',
      'Log Analysis',
      'Git History Analysis',
      'Root Cause Analysis',
      'Patch Generation',
    ],
    avatarColor: 'blue',
  },
  {
    initials: 'DR',
    name: 'Dior Rruka',
    title: 'Product Ideation · Demo Presentation',
    description:
      'Dior contributed to shaping the Incident Commander concept and supported the presentation video, helping communicate the technical workflow, impact, and human-in-the-loop safety model clearly.',
    tags: [
      'Product Ideation',
      'Solution Strategy',
      'Demo Storytelling',
      'Presentation Design',
      'Video Presentation',
      'Project Communication',
    ],
    avatarColor: 'purple',
  },
  {
    initials: 'SK',
    name: 'Sabrith Kareem',
    title: 'Early-Stage Ideation Contributor',
    description:
      'Sabrith contributed to the team\'s initial brainstorming and early concept discussions during the ideation phase of Incident Commander.',
    tags: ['Initial Brainstorming', 'Early Ideation', 'Concept Discussion'],
    avatarColor: 'cyan',
  },
  {
    initials: 'SS',
    name: 'Sonny Sulistyo',
    title: 'Early-Stage Ideation Contributor',
    description:
      'Sonny contributed to the team\'s early brainstorming sessions and helped explore initial directions for the Incident Commander project.',
    tags: ['Initial Brainstorming', 'Early Ideation', 'Concept Exploration'],
    avatarColor: 'cyan',
  },
]

const PIPELINE_STEPS = [
  { icon: '🎯', label: 'Scenario & Leadership' },
  { icon: '⚡', label: 'Parallel AI Agents' },
  { icon: '🧪', label: 'Backend Validation' },
  { icon: '📊', label: 'War-Room Dashboard' },
  { icon: '🎬', label: 'Demo & Storytelling' },
]

/* ─────────────────────────────────────────────────────────────────────────────
   Avatar circle
───────────────────────────────────────────────────────────────────────────── */

function Avatar({ initials, color, large = false }) {
  return (
    <div
      className={`tm-avatar tm-avatar--${color}${large ? ' tm-avatar--large' : ''}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Contribution tag
───────────────────────────────────────────────────────────────────────────── */

function Tag({ label }) {
  return <span className="tm-tag">{label}</span>
}

/* ─────────────────────────────────────────────────────────────────────────────
   Team Lead featured card
───────────────────────────────────────────────────────────────────────────── */

function LeadCard({ member }) {
  return (
    <article className="tm-lead-card" aria-label={`Team Lead: ${member.name}`}>
      <div className="tm-lead-glow" aria-hidden="true" />
      <div className="tm-lead-inner">
        <div className="tm-lead-top">
          <Avatar initials={member.initials} color={member.avatarColor} large />
          <div className="tm-lead-identity">
            <div className="tm-lead-badge-row">
              <span className="tm-role-badge tm-role-badge--lead">{member.badge}</span>
            </div>
            <h2 className="tm-lead-name">{member.name}</h2>
            <p className="tm-lead-title">{member.title}</p>
            <a
              href={member.linkedin}
              target="_blank"
              rel="noreferrer"
              className="tm-linkedin-btn"
              aria-label={`${member.name} on LinkedIn (opens in new tab)`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
        <p className="tm-lead-desc">{member.description}</p>
        <div className="tm-tags" role="list" aria-label="Contributions">
          {member.tags.map(t => <Tag key={t} label={t} />)}
        </div>
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Regular member card
───────────────────────────────────────────────────────────────────────────── */

function MemberCard({ member }) {
  return (
    <article className="tm-member-card" aria-label={`Team member: ${member.name}`}>
      <div className="tm-member-top">
        <Avatar initials={member.initials} color={member.avatarColor} />
        <div className="tm-member-identity">
          <h3 className="tm-member-name">{member.name}</h3>
          <p className="tm-member-title">{member.title}</p>
        </div>
      </div>
      <p className="tm-member-desc">{member.description}</p>
      <div className="tm-tags tm-tags--sm" role="list" aria-label="Contributions">
        {member.tags.map(t => <Tag key={t} label={t} />)}
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   "How Team HJ Built It" pipeline strip
───────────────────────────────────────────────────────────────────────────── */

function PipelineStrip() {
  return (
    <section className="tm-pipeline" aria-label="How Team HJ built Incident Commander">
      <h2 className="tm-section-heading">How Team HJ Built It</h2>
      <div className="tm-pipeline-steps" role="list">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.label} className="tm-pipeline-step" role="listitem">
            <div className="tm-pipeline-node" aria-hidden="true">{step.icon}</div>
            <div className="tm-pipeline-label">{step.label}</div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="tm-pipeline-arrow" aria-hidden="true">→</div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Team page root
───────────────────────────────────────────────────────────────────────────── */

export default function TeamPage({ onBack }) {
  return (
    <div className="tm-page">
      {/* ── Back nav ── */}
      <div className="tm-topbar">
        <button
          type="button"
          className="tm-back-btn"
          onClick={onBack}
          aria-label="Back to Incident Commander dashboard"
        >
          <span aria-hidden="true">←</span> Back to Incident Commander
        </button>
      </div>

      {/* ── Hero ── */}
      <header className="tm-hero" role="banner">
        <div className="tm-hero-glow tm-hero-glow--1" aria-hidden="true" />
        <div className="tm-hero-glow tm-hero-glow--2" aria-hidden="true" />
        <div className="tm-hero-inner">
          <p className="tm-eyebrow">IBM Bob 2.0 Hackathon · Sept 25–27, 2026</p>
          <h1 className="tm-hero-heading">Team HJ</h1>
          <p className="tm-hero-sub">The team behind Incident Commander</p>
          <p className="tm-hero-statement">
            Building an explainable, human-in-the-loop incident response workflow
            with parallel AI investigation and independently verified fix proposals.
          </p>
        </div>
      </header>

      <main className="tm-main">
        {/* ── Team Lead ── */}
        <section aria-labelledby="lead-section-title" className="tm-section">
          <h2 id="lead-section-title" className="tm-section-label">Team Lead</h2>
          <LeadCard member={TEAM_LEAD} />
        </section>

        {/* ── Team Members ── */}
        <section aria-labelledby="members-section-title" className="tm-section">
          <h2 id="members-section-title" className="tm-section-label">Team Members</h2>
          <div className="tm-members-grid">
            {MEMBERS.map(m => <MemberCard key={m.name} member={m} />)}
          </div>
        </section>

        {/* ── Pipeline strip ── */}
        <PipelineStrip />
      </main>

      <footer className="tm-footer" role="contentinfo">
        Built by Team HJ for the IBM Bob 2.0 Hackathon
      </footer>
    </div>
  )
}
