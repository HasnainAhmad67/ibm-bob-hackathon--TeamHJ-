# Runbook — Order Service

## Service Overview

The order service handles checkout totals, discount logic, and invoice
generation for the sample e-commerce platform.

## Common Incidents

### Discount Calculation Failure

**Symptom:** Order totals are higher than expected after a discount code is
applied.  Automated tests report an `AssertionError` in `test_ten_percent_discount`.

**Severity:** P1 — direct revenue and customer-trust impact.

**Response steps:**

1. Identify the failing function via Log Analyst findings.
2. Check `app/orders.py` — look at the return expression in `order_total`.
3. Confirm the expression uses subtraction (`base - discount`), not addition.
4. Apply the fix and run `pytest -v` to verify all tests pass.
5. Deploy via the standard hotfix pipeline; notify customer support.

**Prevention:**

- All arithmetic changes in billing modules require a second reviewer.
- Add a post-deploy smoke test that validates a known discount scenario.

### Tone and Format

Postmortems follow the **5-Why** format.  Keep the timeline in UTC.
Every action item must have an owner and a due date.
