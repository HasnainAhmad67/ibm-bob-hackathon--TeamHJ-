/**
 * useIncident — state machine for the full incident pipeline.
 *
 * States:
 *   idle       → no incident yet
 *   creating   → POST /api/incidents in flight
 *   running    → POST /api/incidents/{id}/run in flight
 *   complete   → pipeline returned a full IncidentRecord
 *   error      → any fetch failure
 *
 * The hook exposes the current state, the incident record (once available),
 * an error message, and the `runAnalysis` trigger function.
 */

import { useState, useCallback } from 'react'
import { createIncident, runPipeline } from '../api/client'

/**
 * @typedef {'idle'|'creating'|'running'|'complete'|'error'} PipelineState
 */

/**
 * @param {object} formValues  Initial form values (used only to drive defaults)
 * @returns {{
 *   state: PipelineState,
 *   incident: object|null,
 *   error: string|null,
 *   runAnalysis: (formData: object) => Promise<void>
 * }}
 */
export function useIncident() {
  /** @type {[PipelineState, Function]} */
  const [state, setState] = useState('idle')
  const [incident, setIncident] = useState(null)
  const [error, setError] = useState(null)

  /**
   * Create the incident record then immediately run the full pipeline.
   *
   * @param {{ rawLog: string, failingTest: string, serviceName: string, severity: string }} formData
   */
  const runAnalysis = useCallback(async (formData) => {
    setError(null)
    setIncident(null)

    try {
      // Step 1 — create incident
      setState('creating')
      const created = await createIncident({
        raw_log: formData.rawLog,
        failing_test: formData.failingTest || undefined,
        service_name: formData.serviceName || undefined,
        severity: formData.severity || undefined,
      })

      // Step 2 — run full pipeline
      setState('running')
      const result = await runPipeline(created.incident_id)

      setIncident(result)
      setState('complete')
    } catch (err) {
      setError(err.message ?? 'Unknown error')
      setState('error')
    }
  }, [])

  return { state, incident, error, runAnalysis }
}
