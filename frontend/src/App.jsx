import { useState } from 'react'
import './App.css'
import {
  incident,
  inputTabs,
  agents,
  fixWriter,
  rootCause,
  validation,
  postmortem,
  investigationStatus,
} from './data/mockIncident'

/* ── Small helpers ───────────────────────────────── */

function Badge({ color, dot, children }) {
  return (
    <span className={`ic-badge ${color}`}>
      {dot && <span className="ic-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

function EvidencePill({ label, type }) {
  const icons = { log: '📋', git: '🔀', file: '📄' }
  return (
    <span className={`ic-evidence-pill ${type}`} role="note" aria-label={`Evidence: ${label}`}>
      <span aria-hidden="true">{icons[type] ?? '🔗'}</span>
      {label}
    </span>
  )
}

/* ── Header ──────────────────────────────────────── */

function Header() {
  return (
    <header className="ic-header" role="banner">
      <div className="ic-header-inner">
        <div className="ic-header-left">
          <div className="ic-header-logo" aria-hidden="true">⚡</div>
          <div>
            <div className="ic-header-title">Incident Commander</div>
            <div className="ic-header-subtitle">AI-powered incident investigation</div>
          </div>
        </div>

        <div className="ic-header-right">
          <Badge color="red" dot>Incident Active</Badge>
          <div className="ic-header-meta">
            <span><strong>{incident.id}</strong></span>
            <span>Target: <strong>{incident.targetTime}</strong></span>
            <span aria-label="IBM Bob workflow tag">
              <Badge color="blue">{incident.workflow}</Badge>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ── Incident input card ─────────────────────────── */

function InputCard({ onStart }) {
  const [activeTab, setActiveTab] = useState(inputTabs[0].id)
  const [started, setStarted] = useState(false)
  const [inputValue, setInputValue] = useState(inputTabs[0].content)

  function handleTabChange(tab) {
    setActiveTab(tab.id)
    setInputValue(tab.content)
    setStarted(false)
  }

  function handleStart() {
    setStarted(true)
    onStart()
  }

  const currentTab = inputTabs.find(t => t.id === activeTab)

  return (
    <section className="ic-card" aria-labelledby="input-card-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">🚨</span>
          <h2 id="input-card-title">Report an incident</h2>
        </div>
        <Badge color="red" dot>Active</Badge>
      </div>
      <div className="ic-card-body">
        <div className="ic-input-tabs" role="tablist" aria-label="Input type">
          {inputTabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-panel-${tab.id}`}
              className={`ic-tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id={`tab-panel-${activeTab}`}
          role="tabpanel"
          aria-label={`${currentTab?.label ?? ''} input`}
        >
          <label htmlFor="incident-input" className="sr-only">
            {currentTab?.label} content
          </label>
          <textarea
            id="incident-input"
            className="ic-textarea"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            spellCheck={false}
            aria-label={`${currentTab?.label} input`}
          />
        </div>

        <div className="ic-input-footer">
          <div className={`ic-status-message${started ? ' started' : ''}`} aria-live="polite">
            {started
              ? <><span aria-hidden="true">✅</span> Investigation started — agents running in parallel</>
              : <><span aria-hidden="true">ℹ️</span> Paste your error data above, then start the investigation</>
            }
          </div>
          <button
            type="button"
            className="ic-btn-primary"
            onClick={handleStart}
            aria-label="Start incident investigation"
          >
            {started ? '↺ Re-run investigation' : '▶ Start investigation'}
          </button>
        </div>
      </div>
    </section>
  )
}

/* ── Investigation flow ──────────────────────────── */

const FLOW_STEPS = [
  { id: 'received',  icon: '📥', label: 'Incident received',       time: '14:09', state: 'done' },
  { id: 'parallel',  icon: '⚡', label: 'Parallel investigation',  time: '14:09', state: 'done' },
  { id: 'findings',  icon: '🔗', label: 'Findings combined',       time: '14:12', state: 'done' },
  { id: 'fix',       icon: '✏️', label: 'Fix proposed',            time: '14:13', state: 'done' },
  { id: 'validated', icon: '✅', label: 'Validation completed',    time: '14:13', state: 'done' },
]

function InvestigationFlow({ isActive }) {
  return (
    <nav className="ic-flow" aria-label="Investigation pipeline stages">
      {FLOW_STEPS.map((step) => {
        const state = isActive ? (step.id === 'validated' ? 'active' : 'done') : step.state
        return (
          <div key={step.id} className={`ic-flow-step ${state}`} role="listitem">
            <div className="ic-flow-node" aria-hidden="true">{step.icon}</div>
            <div className="ic-flow-label">{step.label}</div>
            <div className="ic-flow-time">{step.time}</div>
          </div>
        )
      })}
    </nav>
  )
}

/* ── Agent card ──────────────────────────────────── */

function AgentCard({ agent }) {
  const statusColor = { success: 'green', proposed: 'blue', running: 'amber' }[agent.statusType] ?? 'blue'
  return (
    <article className="ic-agent-card" aria-label={`${agent.name} agent`}>
      <div className="ic-agent-header">
        <div className="ic-agent-name">
          <span className="ic-agent-icon" aria-hidden="true">{agent.icon}</span>
          {agent.name}
        </div>
        <div className="ic-agent-meta">
          <span className="ic-agent-elapsed" aria-label={`Elapsed time: ${agent.elapsed}`}>{agent.elapsed}</span>
          <Badge color={statusColor}>{agent.status}</Badge>
        </div>
      </div>

      <dl className="ic-agent-findings">
        {agent.findings.map(f => (
          <div key={f.label} className="ic-finding-row">
            <dt className="ic-finding-label">{f.label}</dt>
            <dd className="ic-finding-value">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="ic-gap-row">
        <span className="ic-text-muted" style={{ fontSize: '11px' }}>Evidence:</span>
        <EvidencePill label={agent.evidence} type={agent.evidenceType} />
      </div>
    </article>
  )
}

/* ── Fix Writer card ─────────────────────────────── */

function FixWriterCard() {
  const [patchOpen, setPatchOpen] = useState(false)
  const fw = fixWriter

  return (
    <article className="ic-fix-writer-card" aria-label="Fix Writer agent">
      <div className="ic-fix-writer-header">
        <div className="ic-agent-name">
          <span className="ic-agent-icon" aria-hidden="true">{fw.icon}</span>
          {fw.name}
          <span className="ic-agent-elapsed" aria-label={`Elapsed: ${fw.elapsed}`}>{fw.elapsed}</span>
        </div>
        <Badge color="blue">{fw.status}</Badge>
      </div>

      <p className="ic-fix-summary">{fw.summary}</p>

      <div className="ic-fix-meta">
        <span className="ic-text-muted" style={{ fontSize: '12px' }}>Test run:</span>
        <Badge color="green">✓ {fw.testStatus}</Badge>
      </div>

      <button
        type="button"
        className="ic-btn-secondary"
        onClick={() => setPatchOpen(o => !o)}
        aria-expanded={patchOpen}
        aria-controls="patch-preview"
      >
        {patchOpen ? '▲ Hide proposed patch' : '▼ View proposed patch'}
      </button>

      {patchOpen && (
        <div id="patch-preview" className="ic-patch-block" role="region" aria-label="Proposed patch code">
          <div className="ic-patch-toolbar">
            <span className="ic-patch-filename">src/services/paymentProcessor.js</span>
            <Badge color="blue">Diff</Badge>
          </div>
          <pre className="ic-patch-pre" tabIndex={0}>
            <code>{fw.patch}</code>
          </pre>
        </div>
      )}

      <div className="ic-human-note" role="alert" aria-live="polite">
        <span aria-hidden="true">⚠️</span>
        Human review required — no automatic deployment
      </div>
    </article>
  )
}

/* ── Live investigation card ─────────────────────── */

function LiveInvestigationCard({ investigationStarted }) {
  return (
    <section className="ic-card" aria-labelledby="live-invest-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">⚡</span>
          <h2 id="live-invest-title">Live investigation</h2>
        </div>
        <Badge color="green">Completed</Badge>
      </div>
      <div className="ic-card-body">
        <InvestigationFlow isActive={investigationStarted} />

        <div style={{ marginTop: '20px' }}>
          <div className="ic-parallel-banner" role="note" aria-label="Parallel execution zone">
            ⚡ Running in parallel — Log Analyst &amp; Code Historian
          </div>

          <div className="ic-agents-grid" role="list" aria-label="Parallel investigation agents">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        <FixWriterCard />
      </div>
    </section>
  )
}

/* ── Root cause report ───────────────────────────── */

function RootCauseCard() {
  const rc = rootCause
  return (
    <section className="ic-card" aria-labelledby="root-cause-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">🎯</span>
          <h2 id="root-cause-title">Root cause report</h2>
        </div>
        <span className="ic-explainable-tag" role="note" aria-label="Explainable finding">
          <span aria-hidden="true">🔍</span> Explainable finding
        </span>
      </div>
      <div className="ic-card-body">
        <div className="ic-root-cause-meta">
          <div className="ic-meta-row">
            <span className="ic-meta-key">Suspect commit</span>
            <span className="ic-meta-value">{rc.suspectCommit}</span>
          </div>
          <div className="ic-meta-row">
            <span className="ic-meta-key">Affected file</span>
            <span className="ic-meta-value">{rc.affectedFile}:{rc.affectedLine}</span>
          </div>
        </div>

        <div className="ic-confidence-bar-wrap" aria-label={`Confidence: ${rc.confidence}%`}>
          <div className="ic-confidence-bar" role="progressbar" aria-valuenow={rc.confidence} aria-valuemin={0} aria-valuemax={100}>
            <div className="ic-confidence-fill" style={{ width: `${rc.confidence}%` }} />
          </div>
          <span className="ic-confidence-label">{rc.confidence}% confidence</span>
        </div>

        <blockquote className="ic-root-cause-summary">
          {rc.summary}
        </blockquote>

        <div className="ic-evidence-row" role="list" aria-label="Supporting evidence">
          <span className="ic-text-muted" style={{ fontSize: '11px' }}>Evidence:</span>
          {rc.evidence.map(e => (
            <EvidencePill key={e.label} label={e.label} type={e.type} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Fix validation card ─────────────────────────── */

function ValidationCard() {
  const v = validation
  return (
    <section className="ic-card" aria-labelledby="validation-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">🧪</span>
          <h2 id="validation-title">Fix validation</h2>
        </div>
        <Badge color="green">✓ Passed</Badge>
      </div>
      <div className="ic-card-body">
        <div className="ic-validation-command" aria-label={`Test command: ${v.command}`}>
          <span aria-hidden="true" style={{ fontSize: '13px' }}>$</span>
          <span className="ic-validation-cmd-text">{v.command}</span>
        </div>

        <div className="ic-validation-status" role="status">
          <span className="ic-validation-icon" aria-hidden="true">✅</span>
          <div className="ic-validation-text">
            <strong>{v.status}</strong>
            {v.detail}
          </div>
        </div>

        <div className="ic-no-deploy-note" role="alert">
          <span aria-hidden="true">🔒</span>
          Awaiting human approval — no auto-deploy
        </div>
      </div>
    </section>
  )
}

/* ── Draft postmortem card ───────────────────────── */

function PostmortemCard() {
  const pm = postmortem
  return (
    <section className="ic-card" aria-labelledby="postmortem-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">📄</span>
          <h2 id="postmortem-title">Draft postmortem</h2>
        </div>
        <span className="ic-pm-tag" role="note" aria-label="Document-informed report">
          <span aria-hidden="true">📋</span> Document-informed report
        </span>
      </div>
      <div className="ic-card-body">
        <div className="ic-pm-section-label">Incident timeline</div>
        <ol className="ic-pm-timeline" aria-label="Incident timeline">
          {pm.timeline.map((item, i) => (
            <li key={i} className="ic-pm-timeline-item">
              <div className="ic-pm-time">{item.time}</div>
              <div className="ic-pm-event">{item.event}</div>
            </li>
          ))}
        </ol>

        <div className="ic-pm-section">
          <div className="ic-pm-section-label">Impact</div>
          <p className="ic-pm-section-text">{pm.impact}</p>
        </div>

        <div className="ic-pm-section">
          <div className="ic-pm-section-label">Root cause</div>
          <p className="ic-pm-section-text">{pm.rootCause}</p>
        </div>

        <div className="ic-pm-section">
          <div className="ic-pm-section-label">Prevention</div>
          <p className="ic-pm-section-text">{pm.prevention}</p>
        </div>
      </div>
    </section>
  )
}

/* ── Investigation status sidebar ────────────────── */

function Sidebar() {
  const s = investigationStatus
  return (
    <aside className="ic-sidebar" aria-label="Investigation status summary">
      <div className="ic-status-card">
        <div className="ic-status-header">
          <span aria-hidden="true">📊</span>
          Investigation status
        </div>
        <div className="ic-status-body">
          <div className="ic-status-item">
            <span className="ic-status-item-label">Evidence collected</span>
            <span className="ic-status-item-value blue">{s.evidenceCount} references</span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Parallel agents</span>
            <span className="ic-status-item-value green">{s.agentsCompleted}/{s.parallelAgents} completed</span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Fix validation</span>
            <span className="ic-status-item-value green">{s.fixValidation}</span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Human decision</span>
            <span className="ic-status-item-value amber">{s.humanDecision}</span>
          </div>
        </div>
      </div>

      {/* Incident ID mini-card */}
      <div className="ic-status-card">
        <div className="ic-status-header">
          <span aria-hidden="true">🎫</span>
          Incident
        </div>
        <div className="ic-status-body">
          <div className="ic-status-item">
            <span className="ic-status-item-label">ID</span>
            <span className="ic-status-item-value blue" style={{ fontFamily: 'var(--mono)' }}>{incident.id}</span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Status</span>
            <span className="ic-status-item-value red">{incident.status}</span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Target time</span>
            <span className="ic-status-item-value blue">{incident.targetTime}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ── App root ────────────────────────────────────── */

export default function App() {
  const [investigationStarted, setInvestigationStarted] = useState(false)

  return (
    <div className="ic-app">
      <Header />
      <main className="ic-main" id="main-content">
        <div className="ic-content">
          <div className="ic-col-main">
            <InputCard onStart={() => setInvestigationStarted(true)} />
            <LiveInvestigationCard investigationStarted={investigationStarted} />
            <RootCauseCard />
            <ValidationCard />
            <PostmortemCard />
          </div>
          <Sidebar />
        </div>
      </main>
    </div>
  )
}
