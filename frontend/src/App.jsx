import { useState } from 'react'
import './App.css'
import { useIncident } from './hooks/useIncident'
import TeamPage from './pages/TeamPage'

/* ─────────────────────────────────────────────────────────────────────────────
   Demo defaults — match the seeded order-service incident exactly
───────────────────────────────────────────────────────────────────────────── */

const DEMO_DEFAULTS = {
  serviceName: 'order-service',
  severity: 'P1',
  failingTest: 'tests/test_orders.py::test_ten_percent_discount',
  rawLog: `FAILED tests/test_orders.py::test_ten_percent_discount - AssertionError: Expected 99.0 but got 121.0.
Likely cause: discount is being added instead of subtracted.
assert 121.0 == approx(99.0)

  File "sample-app/app/orders.py", line 21, in order_total
    return base + discount   # Regression: discount is added instead of subtracted.

3 failed, 1 passed`,
}

/* ─────────────────────────────────────────────────────────────────────────────
   Primitive helpers
───────────────────────────────────────────────────────────────────────────── */

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

/** Collapsible code/log block */
function LogPanel({ title, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!content) return null
  return (
    <div className="ic-log-panel">
      <button
        type="button"
        className="ic-log-panel-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="ic-log-panel-icon" aria-hidden="true">{open ? '▼' : '▶'}</span>
        {title}
      </button>
      {open && (
        <pre className="ic-log-panel-pre" tabIndex={0}>{content}</pre>
      )}
    </div>
  )
}

/** Key/value row used in several cards */
function MetaRow({ label, value, mono = false }) {
  if (!value && value !== 0) return null
  return (
    <div className="ic-meta-row">
      <span className="ic-meta-key">{label}</span>
      <span className={`ic-meta-value${mono ? ' ic-mono' : ''}`}>{value}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Header
───────────────────────────────────────────────────────────────────────────── */

function Header({ incident, onTeamNav }) {
  const id = incident?.incident_id ?? '—'
  const status = incident?.status ?? 'idle'
  const severity = incident?.severity
  const statusColor = { complete: 'green', analyzing: 'blue', validated: 'blue', created: 'amber', idle: 'amber' }[status] ?? 'amber'

  return (
    <header className="ic-header" role="banner">
      <div className="ic-header-inner">
        <div className="ic-header-left">
          <div className="ic-header-logo" aria-hidden="true">⚡</div>
          <div>
            <div className="ic-header-title">Incident Commander</div>
            <div className="ic-header-subtitle">AI-powered incident investigation · IBM Bob 2.0</div>
          </div>
        </div>
        <div className="ic-header-right">
          {incident && <Badge color="red" dot>Incident Active</Badge>}
          <div className="ic-header-meta">
            {id !== '—' && <span><strong>{id}</strong></span>}
            {severity && <span><Badge color="red">{severity}</Badge></span>}
            <span><Badge color={statusColor}>{status}</Badge></span>
          </div>
          <button
            type="button"
            className="ic-btn-secondary"
            onClick={onTeamNav}
            aria-label="View Team HJ page"
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            👥 Team HJ
          </button>
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Incident input form
───────────────────────────────────────────────────────────────────────────── */

const SEVERITY_OPTIONS = ['P1', 'P2', 'P3', 'P4']

const RAW_LOG_PLACEHOLDER = `FAILED tests/test_orders.py::test_ten_percent_discount
AssertionError: Expected 99.0 but got 121.0.
assert 121.0 == approx(99.0)

  File "app/orders.py", line 21, in order_total
    return base + discount

3 failed, 1 passed`

const PIPELINE_STEPS_GUIDE = [
  '1. Incident is created',
  '2. Log Analyst and Code Historian investigate in parallel',
  '3. Fix Writer proposes a patch',
  '4. The original project is tested unchanged (baseline)',
  '5. The proposed fix is tested in an isolated temporary copy',
  '6. Human approval remains required before deployment',
]

/** Collapsible "What happens next?" section */
function WhatHappensNext() {
  const [open, setOpen] = useState(false)
  return (
    <div className="ic-guide-next">
      <button
        type="button"
        className="ic-guide-next-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="ic-what-next-body"
      >
        <span className="ic-guide-next-arrow" aria-hidden="true">{open ? '▼' : '▶'}</span>
        What happens next?
      </button>
      {open && (
        <ol id="ic-what-next-body" className="ic-guide-next-list" aria-label="Pipeline steps">
          {PIPELINE_STEPS_GUIDE.map((step, i) => (
            <li key={i} className="ic-guide-next-item">{step}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

function InputCard({ onRun, pipelineState }) {
  const [form, setForm] = useState(DEMO_DEFAULTS)
  const isRunning = pipelineState === 'creating' || pipelineState === 'running'
  const isDone = pipelineState === 'complete'

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isRunning) onRun(form)
  }

  function loadDemo() {
    setForm(DEMO_DEFAULTS)
  }

  const statusMsg = {
    idle: { icon: 'ℹ️', text: 'Fill in the incident details and run the analysis.', cls: '' },
    creating: { icon: '⏳', text: 'Creating incident record…', cls: '' },
    running: { icon: '⚡', text: 'Running pipeline — Log Analyst, Code Historian and Fix Writer active…', cls: ' started' },
    complete: { icon: '✅', text: 'Pipeline complete. Results shown below.', cls: ' started' },
    error: { icon: '❌', text: 'Pipeline failed — see error below.', cls: '' },
  }[pipelineState] ?? { icon: 'ℹ️', text: '', cls: '' }

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

        {/* ── Guidance panel ── */}
        <div className="ic-guide-panel" role="note" aria-label="Incident reporting guidance">
          <div className="ic-guide-intro">
            <span className="ic-guide-intro-icon" aria-hidden="true">💡</span>
            <p className="ic-guide-intro-text">
              Paste the real error evidence from your failing service or test run.
              Incident Commander will investigate the failure, identify likely root cause,
              and validate a proposed fix in an isolated copy.
            </p>
          </div>
          <div className="ic-guide-actions">
            <button
              type="button"
              className="ic-btn-demo"
              onClick={loadDemo}
              aria-label="Load the seeded order-service demo incident into the form fields. Does not submit automatically."
            >
              <span aria-hidden="true">🧪</span> Load demo incident
            </button>
            <span className="ic-guide-demo-note">Populates fields only — does not run analysis</span>
          </div>
          <WhatHappensNext />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Row: service + severity */}
          <div className="ic-form-row">
            <div className="ic-form-field">
              <label htmlFor="f-service" className="ic-form-label">Service name</label>
              <input
                id="f-service"
                className="ic-form-input"
                value={form.serviceName}
                onChange={set('serviceName')}
                placeholder="e.g. order-service"
                aria-describedby="f-service-hint"
              />
              <span id="f-service-hint" className="ic-form-hint">
                Enter the affected application or service name. Example: order-service
              </span>
            </div>
            <div className="ic-form-field ic-form-field--sm">
              <label htmlFor="f-severity" className="ic-form-label">Severity</label>
              <select
                id="f-severity"
                className="ic-form-input ic-form-select"
                value={form.severity}
                onChange={set('severity')}
                aria-describedby="f-severity-hint"
              >
                {SEVERITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              <span id="f-severity-hint" className="ic-form-hint">
                P1: critical impact. P2: high. P3: moderate. P4: low urgency.
              </span>
            </div>
          </div>

          {/* Failing test */}
          <div className="ic-form-field" style={{ marginBottom: 12 }}>
            <label htmlFor="f-test" className="ic-form-label">
              Failing test <span className="ic-form-optional">(optional)</span>
            </label>
            <input
              id="f-test"
              className="ic-form-input ic-mono"
              value={form.failingTest}
              onChange={set('failingTest')}
              placeholder="e.g. tests/test_orders.py::test_ten_percent_discount"
              aria-describedby="f-test-hint"
            />
            <span id="f-test-hint" className="ic-form-hint">
              If known, enter the failing test path and name. Example: tests/test_orders.py::test_ten_percent_discount
            </span>
          </div>

          {/* Raw log */}
          <div className="ic-form-field" style={{ marginBottom: 14 }}>
            <label htmlFor="f-log" className="ic-form-label">Raw error log / stack trace</label>
            <textarea
              id="f-log"
              className="ic-textarea"
              value={form.rawLog}
              onChange={set('rawLog')}
              rows={7}
              spellCheck={false}
              placeholder={RAW_LOG_PLACEHOLDER}
              aria-describedby="f-log-hint"
            />
            <span id="f-log-hint" className="ic-form-hint">
              Paste the actual exception, assertion failure, stack trace, or monitoring alert.{' '}
              <strong className="ic-form-hint-warn">Remove passwords, API keys, tokens, and other secrets before submitting.</strong>
            </span>
          </div>

          <div className="ic-input-footer">
            <div className={`ic-status-message${statusMsg.cls}`} aria-live="polite">
              <span aria-hidden="true">{statusMsg.icon}</span> {statusMsg.text}
            </div>
            <button
              type="submit"
              className="ic-btn-primary"
              disabled={isRunning}
              aria-label={isRunning ? 'Running analysis…' : isDone ? 'Re-run analysis' : 'Run analysis'}
            >
              {isRunning ? '⏳ Analysing…' : isDone ? '↺ Re-run analysis' : '▶ Run analysis'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Error banner
───────────────────────────────────────────────────────────────────────────── */

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="ic-error-banner" role="alert">
      <span aria-hidden="true">❌</span>
      <div>
        <strong>Pipeline error</strong>
        <div className="ic-error-detail">{message}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Human approval banner  (always shown when human_approval_required=true)
───────────────────────────────────────────────────────────────────────────── */

function ApprovalBanner({ incident }) {
  if (!incident?.human_approval_required) return null
  const verified = incident.fix_verified

  return (
    <div className="ic-approval-banner" role="alert" aria-live="polite">
      <div className="ic-approval-banner-icon" aria-hidden="true">🔒</div>
      <div className="ic-approval-banner-body">
        <strong className="ic-approval-banner-title">Human approval required before deployment</strong>
        <p className="ic-approval-banner-msg">
          {verified
            ? 'The proposed fix passed independent isolated-copy validation. It has not been deployed. A human must review and approve before any deployment action is taken.'
            : 'The fix has not been independently verified. Do not deploy without manual review.'}
        </p>
        {verified && (
          <span className="ic-fix-verified-tag" aria-label="Fix verified by isolated test run">
            <span aria-hidden="true">✅</span> Fix verified by isolated tests
          </span>
        )}
        <p className="ic-approval-note">
          ⚠️ No deployment button is provided. Deployment is a manual workflow outside this tool.
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Pipeline flow stepper
───────────────────────────────────────────────────────────────────────────── */

function InvestigationFlow({ incident }) {
  const done = !!incident
  const steps = [
    { id: 'received',  icon: '📥', label: 'Incident created' },
    { id: 'parallel',  icon: '⚡', label: 'Parallel investigation' },
    { id: 'findings',  icon: '🔗', label: 'Findings combined' },
    { id: 'fix',       icon: '✏️', label: 'Fix proposed' },
    { id: 'validated', icon: '🧪', label: 'Validation completed' },
  ]
  return (
    <nav className="ic-flow" aria-label="Investigation pipeline stages">
      {steps.map((step, i) => {
        const state = done ? 'done' : i === 0 ? 'active' : ''
        return (
          <div key={step.id} className={`ic-flow-step ${state}`} role="listitem">
            <div className="ic-flow-node" aria-hidden="true">{step.icon}</div>
            <div className="ic-flow-label">{step.label}</div>
          </div>
        )
      })}
    </nav>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Live investigation — agent findings
───────────────────────────────────────────────────────────────────────────── */

function AgentCard({ icon, name, statusLabel, statusColor, rows }) {
  return (
    <article className="ic-agent-card" aria-label={`${name} agent`}>
      <div className="ic-agent-header">
        <div className="ic-agent-name">
          <span className="ic-agent-icon" aria-hidden="true">{icon}</span>
          {name}
        </div>
        <div className="ic-agent-meta">
          <Badge color={statusColor}>{statusLabel}</Badge>
        </div>
      </div>
      <dl className="ic-agent-findings">
        {rows.map(([label, value]) => value ? (
          <div key={label} className="ic-finding-row">
            <dt className="ic-finding-label">{label}</dt>
            <dd className="ic-finding-value">{value}</dd>
          </div>
        ) : null)}
      </dl>
    </article>
  )
}

function LiveInvestigationCard({ incident }) {
  const findings = incident?.findings
  const la = findings?.log_analyst
  const ch = findings?.code_historian
  const fw = findings?.fix_writer
  const [patchOpen, setPatchOpen] = useState(false)
  const pipelineStages = findings?.pipeline_status?.stages ?? []

  return (
    <section className="ic-card" aria-labelledby="live-invest-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">⚡</span>
          <h2 id="live-invest-title">Live investigation</h2>
        </div>
        <Badge color={incident ? 'green' : 'amber'}>{incident ? 'Completed' : 'Pending'}</Badge>
      </div>
      <div className="ic-card-body">
        <InvestigationFlow incident={incident} />

        {findings && (
          <div style={{ marginTop: 20 }}>
            {/* Pipeline topology note */}
            {pipelineStages.length > 0 && (
              <div className="ic-parallel-banner" role="note">
                ⚡ Log Analyst &amp; Code Historian ran in parallel → Fix Writer consumed both
              </div>
            )}

            <div className="ic-agents-grid" role="list" aria-label="Parallel investigation agents">
              {la && (
                <AgentCard
                  icon="🔍" name="Log Analyst"
                  statusLabel="Completed" statusColor="green"
                  rows={[
                    ['Failing function', la.failing_function],
                    ['File', la.file],
                    ['Failing test', la.failing_test],
                    ['Symptom', la.symptom],
                  ]}
                />
              )}
              {ch && (
                <AgentCard
                  icon="📜" name="Code Historian"
                  statusLabel="Completed" statusColor="green"
                  rows={[
                    ['Suspect commit', ch.suspect_commit?.slice(0, 12)],
                    ['Commit message', ch.commit_message],
                    ['File', ch.file],
                  ]}
                />
              )}
            </div>

            {/* Fix Writer */}
            {fw && (
              <article className="ic-fix-writer-card" aria-label="Fix Writer agent">
                <div className="ic-fix-writer-header">
                  <div className="ic-agent-name">
                    <span className="ic-agent-icon" aria-hidden="true">✏️</span>
                    Fix Writer
                  </div>
                  <Badge color="blue">Proposed</Badge>
                </div>

                <p className="ic-fix-summary">{fw.patch_description}</p>

                <div className="ic-fix-meta">
                  <EvidencePill label={fw.file_changed} type="file" />
                  <Badge color={fw.confidence === 'high' ? 'green' : 'amber'}>
                    Confidence: {fw.confidence}
                  </Badge>
                </div>

                <button
                  type="button"
                  className="ic-btn-secondary"
                  onClick={() => setPatchOpen(o => !o)}
                  aria-expanded={patchOpen}
                  aria-controls="patch-preview"
                >
                  {patchOpen ? '▲ Hide patch description' : '▼ View patch description'}
                </button>

                {patchOpen && (
                  <div id="patch-preview" className="ic-patch-block" role="region" aria-label="Patch description">
                    <div className="ic-patch-toolbar">
                      <span className="ic-patch-filename">{fw.file_changed}</span>
                      <Badge color="blue">Fix Writer</Badge>
                    </div>
                    <pre className="ic-patch-pre" tabIndex={0}>{fw.patch_description}</pre>
                  </div>
                )}

                <div className="ic-human-note" role="alert" aria-live="polite">
                  <span aria-hidden="true">⚠️</span>
                  Human review required — no automatic deployment
                </div>
              </article>
            )}

            {findings.errors?.length > 0 && (
              <div className="ic-findings-errors" role="alert">
                <strong>Agent findings warnings:</strong>
                <ul>{findings.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {!findings && (
          <p className="ic-text-muted" style={{ marginTop: 16, textAlign: 'center' }}>
            Agent findings will appear here after the pipeline runs.
          </p>
        )}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Root cause report
───────────────────────────────────────────────────────────────────────────── */

function RootCauseCard({ incident }) {
  const la = incident?.findings?.log_analyst
  const ch = incident?.findings?.code_historian
  const summary = incident?.root_cause_summary

  if (!la && !ch && !summary) return null

  const confidenceMap = { high: 95, medium: 70, low: 40 }
  const confidence = confidenceMap[incident?.findings?.fix_writer?.confidence] ?? 80

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
          {ch && <MetaRow label="Suspect commit" value={ch.suspect_commit} mono />}
          {la && <MetaRow label="Affected file" value={la.file} mono />}
          {la && <MetaRow label="Failing function" value={la.failing_function} mono />}
        </div>

        <div className="ic-confidence-bar-wrap" aria-label={`Confidence: ${confidence}%`}>
          <div className="ic-confidence-bar" role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100}>
            <div className="ic-confidence-fill" style={{ width: `${confidence}%` }} />
          </div>
          <span className="ic-confidence-label">{confidence}% confidence</span>
        </div>

        {summary && (
          <blockquote className="ic-root-cause-summary">{summary}</blockquote>
        )}

        <div className="ic-evidence-row" role="list" aria-label="Supporting evidence">
          <span className="ic-text-muted" style={{ fontSize: '11px' }}>Evidence:</span>
          {la && <EvidencePill label={`Log: ${la.failing_test}`} type="log" />}
          {la && <EvidencePill label={la.file} type="file" />}
          {ch && <EvidencePill label={`Commit: ${ch.suspect_commit?.slice(0,8)}`} type="git" />}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Dual validation card
───────────────────────────────────────────────────────────────────────────── */

function ValidationPassPanel({ label, result, colorClass, icon, testLabel }) {
  if (!result) return null
  const cmd = Array.isArray(result.command) ? result.command.join(' ') : result.command
  const cwdShort = result.cwd ? result.cwd.replace(/\\/g, '/').split('/').slice(-3).join('/') : ''
  return (
    <div className={`ic-val-pass ${colorClass}`} aria-label={label}>
      <div className="ic-val-pass-header">
        <span aria-hidden="true">{icon}</span>
        <strong>{label}</strong>
        <Badge color={result.passed ? 'green' : 'red'}>
          {result.passed ? '✓ PASSED' : '✗ FAILED'}
        </Badge>
        <span className="ic-val-exit-code" aria-label={`Exit code ${result.exit_code}`}>
          exit&nbsp;{result.exit_code}
        </span>
        {result.duration_seconds != null && (
          <span className="ic-val-duration">{result.duration_seconds}s</span>
        )}
      </div>
      <div className="ic-val-meta">
        {cmd && <MetaRow label="Command" value={cmd} mono />}
        {cwdShort && <MetaRow label="cwd" value={`…/${cwdShort}`} mono />}
        {result.error && <MetaRow label="Error" value={result.error} />}
      </div>
      {result.stdout && (
        <LogPanel
          title={`${testLabel} output`}
          content={result.stdout}
          defaultOpen={true}
        />
      )}
    </div>
  )
}

function ValidationCard({ incident }) {
  const dv = incident?.dual_validation
  const fixVerified = incident?.fix_verified
  const humanApproval = incident?.human_approval_required
  const pfv = dv?.proposed_fix_validation

  if (!dv) return null

  return (
    <section className="ic-card" aria-labelledby="validation-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">🧪</span>
          <h2 id="validation-title">Fix validation</h2>
        </div>
        <div className="ic-gap-row">
          {fixVerified && <Badge color="green">✓ Fix Verified</Badge>}
          {humanApproval && <Badge color="amber">⚠ Approval Required</Badge>}
        </div>
      </div>
      <div className="ic-card-body">
        {dv.summary && (
          <p className="ic-validation-summary" aria-live="polite">{dv.summary}</p>
        )}

        {/* Baseline */}
        <ValidationPassPanel
          label="Baseline — unmodified sample-app"
          result={dv.baseline_validation}
          colorClass="ic-val-pass--fail"
          icon="🐛"
          testLabel="Baseline test"
        />

        {/* Proposed fix */}
        {pfv && (
          <div className="ic-val-proposed-wrap">
            {pfv.applicable ? (
              <>
                {pfv.patch_applied && (
                  <div className="ic-val-patch-applied">
                    <span aria-hidden="true">🔧</span>
                    <strong>Patch applied in isolated temp copy:</strong>
                    <span className="ic-mono">{pfv.patch_applied}</span>
                  </div>
                )}
                {pfv.temp_dir_used && (
                  <div className="ic-val-temp-info">
                    <MetaRow label="Temp dir" value={pfv.temp_dir_used.replace(/\\/g,'/')} mono />
                    <MetaRow label="Cleanup" value={pfv.cleanup_ok ? '✓ Deleted after run' : '⚠ Not cleaned up'} />
                  </div>
                )}
                <ValidationPassPanel
                  label="Proposed-fix — isolated temp copy"
                  result={pfv.result}
                  colorClass="ic-val-pass--pass"
                  icon="✅"
                  testLabel="Proposed-fix test"
                />
              </>
            ) : (
              <div className="ic-val-skipped" role="note">
                <span aria-hidden="true">⚠️</span>
                <span>Proposed-fix validation skipped: {pfv.skipped_reason}</span>
              </div>
            )}
          </div>
        )}

        {/* Approval note always shown */}
        {humanApproval && (
          <div className="ic-no-deploy-note" role="alert">
            <span aria-hidden="true">🔒</span>
            Human approval required before deployment — no auto-deploy
          </div>
        )}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Runbook / document context
───────────────────────────────────────────────────────────────────────────── */

function RunbookCard({ incident }) {
  const rc = incident?.runbook_context
  if (!rc) return null

  return (
    <section className="ic-card" aria-labelledby="runbook-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">📚</span>
          <h2 id="runbook-title">Runbook context</h2>
        </div>
        <Badge color={rc.fallback ? 'amber' : 'green'}>
          {rc.fallback ? 'Fallback tone' : 'Docs loaded'}
        </Badge>
      </div>
      <div className="ic-card-body">
        {rc.source_files?.length > 0 && (
          <div className="ic-gap-row" style={{ marginBottom: 12 }}>
            <span className="ic-text-muted" style={{ fontSize: '11px' }}>Sources:</span>
            {rc.source_files.map(f => (
              <EvidencePill key={f} label={f.replace(/\\/g, '/').split('/').slice(-2).join('/')} type="file" />
            ))}
          </div>
        )}
        {rc.guidance && (
          <div className="ic-pm-section">
            <div className="ic-pm-section-label">Guidance extracted</div>
            <p className="ic-pm-section-text">{rc.guidance.split('|').slice(0,5).join(' · ')}</p>
          </div>
        )}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Draft postmortem
───────────────────────────────────────────────────────────────────────────── */

function PostmortemCard({ incident }) {
  const pm = incident?.postmortem
  if (!pm) return null

  return (
    <section className="ic-card" aria-labelledby="postmortem-title">
      <div className="ic-card-header">
        <div className="ic-card-title">
          <span className="ic-card-title-icon" aria-hidden="true">📄</span>
          <h2 id="postmortem-title">Draft postmortem</h2>
        </div>
        <span className="ic-pm-tag" role="note">
          <span aria-hidden="true">📋</span> Document-informed
        </span>
      </div>
      <div className="ic-card-body">
        <div className="ic-pm-section-label">Incident timeline</div>
        <ol className="ic-pm-timeline" aria-label="Incident timeline">
          {(pm.timeline ?? []).map((entry, i) => {
            const [ts, ...rest] = entry.split(/\s{2,}/)
            return (
              <li key={i} className="ic-pm-timeline-item">
                <div className="ic-pm-time">{ts}</div>
                <div className="ic-pm-event">{rest.join('  ')}</div>
              </li>
            )
          })}
        </ol>

        {pm.impact && (
          <div className="ic-pm-section">
            <div className="ic-pm-section-label">Impact</div>
            <p className="ic-pm-section-text">{pm.impact}</p>
          </div>
        )}
        {pm.root_cause && (
          <div className="ic-pm-section">
            <div className="ic-pm-section-label">Root cause</div>
            <p className="ic-pm-section-text">{pm.root_cause}</p>
          </div>
        )}
        {pm.fix_summary && (
          <div className="ic-pm-section">
            <div className="ic-pm-section-label">Fix summary</div>
            <p className="ic-pm-section-text">{pm.fix_summary}</p>
          </div>
        )}
        {pm.prevention && (
          <div className="ic-pm-section">
            <div className="ic-pm-section-label">Prevention</div>
            <p className="ic-pm-section-text">{pm.prevention}</p>
          </div>
        )}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────────────────────────────────────── */

function Sidebar({ incident, pipelineState }) {
  const la = incident?.findings?.log_analyst
  const ch = incident?.findings?.code_historian
  const dv = incident?.dual_validation
  const baselinePassed = dv?.baseline_validation?.passed
  const fixVerified = incident?.fix_verified
  const humanApproval = incident?.human_approval_required

  return (
    <aside className="ic-sidebar" aria-label="Investigation status summary">
      <div className="ic-status-card">
        <div className="ic-status-header">
          <span aria-hidden="true">📊</span>
          Investigation status
        </div>
        <div className="ic-status-body">
          <div className="ic-status-item">
            <span className="ic-status-item-label">Pipeline</span>
            <span className={`ic-status-item-value ${pipelineState === 'complete' ? 'green' : pipelineState === 'error' ? 'red' : 'amber'}`}>
              {pipelineState}
            </span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Log Analyst</span>
            <span className={`ic-status-item-value ${la ? 'green' : 'amber'}`}>{la ? 'Complete' : '—'}</span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Code Historian</span>
            <span className={`ic-status-item-value ${ch ? 'green' : 'amber'}`}>{ch ? 'Complete' : '—'}</span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Baseline validation</span>
            <span className={`ic-status-item-value ${dv ? (baselinePassed ? 'green' : 'red') : 'amber'}`}>
              {dv ? (baselinePassed ? 'Passed' : 'Failed (bug confirmed)') : '—'}
            </span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Fix verified</span>
            <span className={`ic-status-item-value ${fixVerified === true ? 'green' : fixVerified === false ? 'red' : 'amber'}`}>
              {fixVerified === true ? 'Yes ✓' : fixVerified === false ? 'No' : '—'}
            </span>
          </div>
          <hr className="ic-divider" />
          <div className="ic-status-item">
            <span className="ic-status-item-label">Human decision</span>
            <span className={`ic-status-item-value ${humanApproval ? 'amber' : 'green'}`}>
              {humanApproval ? 'Required' : incident ? 'Not required' : '—'}
            </span>
          </div>
        </div>
      </div>

      {incident && (
        <div className="ic-status-card">
          <div className="ic-status-header">
            <span aria-hidden="true">🎫</span>
            Incident
          </div>
          <div className="ic-status-body">
            <div className="ic-status-item">
              <span className="ic-status-item-label">ID</span>
              <span className="ic-status-item-value blue ic-mono">{incident.incident_id}</span>
            </div>
            <hr className="ic-divider" />
            <div className="ic-status-item">
              <span className="ic-status-item-label">Service</span>
              <span className="ic-status-item-value blue">{incident.service_name}</span>
            </div>
            <hr className="ic-divider" />
            <div className="ic-status-item">
              <span className="ic-status-item-label">Severity</span>
              <span className="ic-status-item-value red">{incident.severity}</span>
            </div>
            <hr className="ic-divider" />
            <div className="ic-status-item">
              <span className="ic-status-item-label">Status</span>
              <span className="ic-status-item-value green">{incident.status}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   App root
───────────────────────────────────────────────────────────────────────────── */

export default function App() {
  const { state, incident, error, runAnalysis } = useIncident()
  const [page, setPage] = useState('dashboard')

  if (page === 'team') {
    return <TeamPage onBack={() => setPage('dashboard')} />
  }

  return (
    <div className="ic-app">
      <Header incident={incident} onTeamNav={() => setPage('team')} />

      <main className="ic-main" id="main-content">
        {/* Approval banner — always at top when needed */}
        {incident?.human_approval_required && (
          <ApprovalBanner incident={incident} />
        )}

        <div className="ic-content">
          <div className="ic-col-main">
            <InputCard onRun={runAnalysis} pipelineState={state} />
            <ErrorBanner message={error} />
            <LiveInvestigationCard incident={incident} />
            <RootCauseCard incident={incident} />
            <ValidationCard incident={incident} />
            <RunbookCard incident={incident} />
            <PostmortemCard incident={incident} />
          </div>
          <Sidebar incident={incident} pipelineState={state} />
        </div>
      </main>
    </div>
  )
}
