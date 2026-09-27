# sample-app

A minimal Python e-commerce service used as a **seeded bug** target for the
Incident Commander demo.

## Bug

Commit `7997883` introduced a regression in `app/orders.py`:

```python
# Regression: discount is added instead of subtracted.
return base + discount   # BUG — should be base - discount
```

The function `order_total` incorrectly **adds** the computed discount to the
subtotal instead of subtracting it.  For a $110 subtotal with a 10 % discount
the function returns **$121.00** instead of the expected **$99.00**.

## Running the tests

```bash
cd sample-app
pip install -r requirements.txt
pytest -v
```

Expected output with the bug in place:

```
FAILED tests/test_orders.py::test_ten_percent_discount
FAILED tests/test_orders.py::test_full_discount
FAILED tests/test_orders.py::test_partial_discount
```

## Runbook — Discount Calculation Failures

### Symptom

Customer-facing order totals are **higher than expected** when a promotional
discount is applied.

### Severity

P1 — Revenue impact; customers overcharged.

### Investigation steps

1. Check `app/orders.py::order_total` return expression.
2. Verify the discount is subtracted (`base - discount`) not added.
3. Run `pytest -v tests/test_orders.py` to confirm fix.

### Past postmortem reference

A similar class of sign-error bug was seen in Q2 when the shipping surcharge
calculation used `+` instead of `-`.  Root cause was an unreviewed
copy-paste during a late-night hotfix.  **Prevention:** require a second
reviewer for any arithmetic changes in billing/payment modules.
