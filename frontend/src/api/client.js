/**
 * Incident Commander API client.
 *
 * All requests target the FastAPI backend.  The base URL defaults to
 * http://127.0.0.1:8000 and can be overridden via the VITE_API_BASE_URL
 * environment variable so the same build works in any environment.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

/**
 * Thin wrapper around fetch that always parses JSON and throws a structured
 * error on non-2xx responses.
 *
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 */
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: text }
  }
  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      `HTTP ${res.status} ${res.statusText}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * GET /health
 * @returns {Promise<{status: string, service: string, message: string}>}
 */
export function getHealth() {
  return request('/health')
}

/**
 * POST /api/incidents
 * @param {{ raw_log: string, failing_test?: string, service_name?: string, severity?: string, title?: string }} payload
 * @returns {Promise<import('./types').IncidentRecord>}
 */
export function createIncident(payload) {
  return request('/api/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * POST /api/incidents/{id}/run
 * Runs the full pipeline: findings + dual validation + postmortem.
 * @param {string} incidentId
 * @returns {Promise<import('./types').IncidentRecord>}
 */
export function runPipeline(incidentId) {
  return request(`/api/incidents/${incidentId}/run`, { method: 'POST' })
}

/**
 * GET /api/incidents/{id}
 * @param {string} incidentId
 * @returns {Promise<import('./types').IncidentRecord>}
 */
export function getIncident(incidentId) {
  return request(`/api/incidents/${incidentId}`)
}

/**
 * GET /api/incidents
 * @returns {Promise<import('./types').IncidentRecord[]>}
 */
export function listIncidents() {
  return request('/api/incidents')
}
