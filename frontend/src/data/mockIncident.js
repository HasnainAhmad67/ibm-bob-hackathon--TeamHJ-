export const incident = {
  id: 'INC-2026-042',
  status: 'ACTIVE',
  title: 'Payment refund processor crash — null dereference in currency field',
  targetTime: 'under 5 minutes',
  workflow: 'IBM Bob 2.0 workflow',
  startedAt: '14:09 UTC',
};

export const inputTabs = [
  {
    id: 'error-log',
    label: 'Error Log',
    content: `[2026-06-14T14:07:22.431Z] ERROR PaymentProcessor - Unhandled exception in processRefund()
  TypeError: Cannot read properties of undefined (reading 'currency')
      at processRefund (/app/src/services/paymentProcessor.js:84:32)
      at async RefundController.handleRequest (/app/src/controllers/refundController.js:47:5)
      at async Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)

[2026-06-14T14:07:22.432Z] ERROR context: { orderId: 'ORD-991234', provider: 'stripe-eu', amount: 4999 }
[2026-06-14T14:07:22.433Z] INFO  Retrying refund (attempt 1/3)...
[2026-06-14T14:07:24.110Z] ERROR PaymentProcessor - Retry failed — same exception
[2026-06-14T14:07:24.111Z] WARN  Dead-letter queue: refund-dlq — message enqueued
[2026-06-14T14:07:24.200Z] ERROR 37 refund requests failed in the last 5 minutes
[2026-06-14T14:07:24.201Z] ALERT PagerDuty triggered — on-call engineer notified`,
  },
  {
    id: 'stack-trace',
    label: 'Stack Trace',
    content: `TypeError: Cannot read properties of undefined (reading 'currency')
    at processRefund (/app/src/services/paymentProcessor.js:84:32)
    at async RefundController.handleRequest (/app/src/controllers/refundController.js:47:5)
    at async Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at async next (/app/node_modules/express/lib/router/route.js:144:7)
    at async Route.dispatch (/app/node_modules/express/lib/router/route.js:114:5)

Node.js version: v20.11.0
Service: payment-api@3.4.1
Environment: production`,
  },
  {
    id: 'failing-test',
    label: 'Failing Test',
    content: `FAIL src/services/__tests__/paymentProcessor.test.js
  ● processRefund › handles stripe-eu provider response

    TypeError: Cannot read properties of undefined (reading 'currency')

      82 |   const payload = buildRefundRequest(refund);
      83 |   const currency = refund.providerResponse.currency;
    > 84 |   return createPaymentRequest({ ...payload, currency });
         |                                              ^
      85 | }

    at processRefund (src/services/paymentProcessor.js:84:32)

  Tests:       1 failed, 17 passed
  Test Suites: 1 failed`,
  },
];

export const timeline = [
  { id: 1, time: '14:02 UTC', event: 'Deployment', detail: 'v3.4.1 deployed to production', type: 'deploy' },
  { id: 2, time: '14:07 UTC', event: 'Alerts fired', detail: 'Payment refund errors spike — PagerDuty triggered', type: 'alert' },
  { id: 3, time: '14:09 UTC', event: 'Investigation started', detail: 'Log Analyst and Code Historian running in parallel', type: 'start' },
  { id: 4, time: '14:10 UTC', event: 'Log Analyst completed', detail: 'Null dereference at paymentProcessor.js:84 identified', type: 'agent' },
  { id: 5, time: '14:11 UTC', event: 'Code Historian completed', detail: 'Suspect commit 8f3a2c1 identified — 92% confidence', type: 'agent' },
  { id: 6, time: '14:12 UTC', event: 'Root cause identified', detail: 'Missing currency field from stripe-eu provider response', type: 'root-cause' },
  { id: 7, time: '14:13 UTC', event: 'Fix proposed', detail: 'Null-safe validation patch ready for human review', type: 'fix' },
];

export const agents = [
  {
    id: 'log-analyst',
    name: 'Log Analyst',
    icon: '🔍',
    status: 'Completed',
    statusType: 'success',
    elapsed: '1m 03s',
    findings: [
      { label: 'Failing module', value: 'src/services/paymentProcessor.js' },
      { label: 'Failing function', value: 'processRefund()' },
      { label: 'Line', value: '84' },
      { label: 'Symptom', value: 'Cannot read properties of undefined (reading \'currency\')' },
    ],
    evidence: 'Log line 18',
    evidenceType: 'log',
  },
  {
    id: 'code-historian',
    name: 'Code Historian',
    icon: '📜',
    status: 'Completed',
    statusType: 'success',
    elapsed: '1m 47s',
    findings: [
      { label: 'Suspect commit', value: '8f3a2c1' },
      { label: 'Changed file', value: 'src/services/paymentProcessor.js' },
      { label: 'Commit message', value: '"Refactor refund payload mapping"' },
      { label: 'Confidence', value: '92%' },
    ],
    evidence: 'Git commit 8f3a2c1',
    evidenceType: 'git',
  },
];

export const fixWriter = {
  id: 'fix-writer',
  name: 'Fix Writer',
  icon: '✏️',
  status: 'Proposed',
  statusType: 'proposed',
  elapsed: '0m 38s',
  summary: 'Add null-safe validation for refund.currency before creating the payment request.',
  testStatus: 'Passed',
  humanReviewRequired: true,
  patch: `// src/services/paymentProcessor.js — line 80–90
async function processRefund(refund) {
  const payload = buildRefundRequest(refund);

  // ✅ Fix: guard against missing currency from provider response
  const currency = refund?.providerResponse?.currency;
  if (!currency) {
    throw new RefundValidationError(
      \`Provider response missing required field: currency\`,
      { orderId: refund.orderId, provider: refund.provider }
    );
  }

  return createPaymentRequest({ ...payload, currency });
}`,
};

export const rootCause = {
  suspectCommit: '8f3a2c1',
  affectedFile: 'src/services/paymentProcessor.js',
  affectedLine: 84,
  confidence: 92,
  summary: 'The refund payload mapping refactor assumed every provider response contains currency. For one provider (stripe-eu), currency is absent, so processRefund() throws before the payment request is created.',
  evidence: [
    { label: 'Log line 18', type: 'log' },
    { label: 'File: paymentProcessor.js:84', type: 'file' },
    { label: 'Commit: 8f3a2c1', type: 'git' },
  ],
};

export const validation = {
  command: 'npm test -- paymentProcessor.test.js',
  status: 'Passed',
  detail: '18 tests passed. Regression test added for missing currency.',
  awaitingApproval: true,
};

export const postmortem = {
  timeline: [
    { time: '14:02 UTC', event: 'Deployment of v3.4.1 to production' },
    { time: '14:07 UTC', event: 'Alerts triggered — refund errors spiked' },
    { time: '14:09 UTC', event: 'Investigation started (Incident Commander)' },
    { time: '14:12 UTC', event: 'Root cause identified' },
  ],
  impact: 'Refund processing failed for 37 requests during a 5-minute window.',
  rootCause: 'The refund mapper refactor introduced an assumption that all provider responses include a currency field. The stripe-eu provider omits this field, causing a null dereference on every refund request routed to that provider.',
  prevention: 'Add schema validation for third-party provider payloads and a contract test for optional currency fields.',
};

export const investigationStatus = {
  evidenceCount: 3,
  parallelAgents: 2,
  agentsCompleted: 2,
  fixValidation: 'Passed',
  humanDecision: 'Required',
};
