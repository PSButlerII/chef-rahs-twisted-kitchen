# Square Controlled Production Rehearsal Report

Status: **Not executed — awaiting explicit owner approval**

This document is both the execution checklist and the permanent record for the
first controlled real-money Square rehearsal. Complete it during the approved
window. Do not paste credentials, tokens, signature keys, card details, or full
provider payloads into this file.

## Rehearsal details

- Rehearsal owner: _Pending_
- Owner approval reference: _Pending_
- Date/time and time zone: _Pending_
- Approved window: _Pending_
- Test amount: _Pending; use the lowest practical non-zero amount approved by
  the owner_
- Test order type: **One standard pickup order only**
- Test customer/card owner: _Pending_
- Application commit/deployment ID: _Pending_

Do not test catering deposits, final balances, PayPal, ACH, invoices, partial
refunds, or customer refund requests in this first rehearsal.

## Production environment names checklist

Record only whether each setting was confirmed in the hosting/environment
manager. Never record secret values here.

- [ ] `SQUARE_ENVIRONMENT=production`
- [ ] `SQUARE_CSP_MODE=production`
- [ ] `SQUARE_PRODUCTION_PAYMENTS_ENABLED=false` initially
- [ ] `SQUARE_APPLICATION_ID`
- [ ] `SQUARE_LOCATION_ID`
- [ ] `SQUARE_ACCESS_TOKEN`
- [ ] `SQUARE_WEBHOOK_SIGNATURE_KEY`
- [ ] `SQUARE_WEBHOOK_NOTIFICATION_URL=https://rahstwistedkitchen.com/api/webhooks/square`
- [ ] `NEXT_PUBLIC_APP_URL=https://rahstwistedkitchen.com`
- [ ] `AUTH_URL=https://rahstwistedkitchen.com`
- [ ] `NEXTAUTH_URL=https://rahstwistedkitchen.com`
- [ ] `PAYMENT_JOBS_TOKEN`
- [ ] No credential was placed in source control, logs, screenshots, tickets,
      chat, or this report.

## Preflight checklist

- [ ] Explicit owner approval identifies the operator, amount, card owner, and
      rehearsal window.
- [ ] Latest approved `main` commit is deployed; deployment ID recorded above.
- [ ] `npm audit` and `npm audit --omit=dev` report zero vulnerabilities.
- [ ] Production database migrations are current.
- [ ] Admin login and `/admin/payments` load successfully.
- [ ] Square readiness shows environment `production` and CSP mode `production`.
- [ ] Production gate is false and readiness is blocked **only** by that gate.
- [ ] Square production application and location ownership are verified.
- [ ] Production webhook subscription uses the exact notification URL.
- [ ] Subscription includes only `payment.created`, `payment.updated`,
      `refund.created`, and `refund.updated`.
- [ ] Payout and Square order event noise is absent unless separately justified.
- [ ] HTTPS, CSP, browser console, card domain, and approved wallet setup have no
      blocking errors.
- [ ] Email mode is known and recorded: _live / dry-run / other: Pending_.
- [ ] An operator is ready to return the gate to false immediately.

Preflight result: _Pending — do not activate unless every item passes._

## Payment test checklist

- [ ] At the start of the approved window, set
      `SQUARE_PRODUCTION_PAYMENTS_ENABLED=true` only in the hosting environment.
- [ ] Restart/redeploy if required by the platform.
- [ ] Confirm admin readiness shows production payment actions unblocked.
- [ ] Create exactly one low-value standard pickup order.
- [ ] Pay once with the approved real card; do not retry with a new idempotency
      key if the result is uncertain.
- [ ] Confirm the order thank-you page loads.
- [ ] Confirm the order reaches `ACCEPTED` / `PAID` as designed.
- [ ] Confirm the `PaymentAttempt` is `PAID` with the correct amount and tip.
- [ ] Confirm the Square payment ID and receipt/reference are stored.
- [ ] Record only sanitized IDs or last-eight references needed for correlation.

Payment result: _Not run_

## Webhook test checklist

- [ ] Confirm the payment webhook received HTTP `200` from the production URL.
- [ ] Confirm the event signature was verified before processing.
- [ ] Confirm the webhook event was stored and processed once.
- [ ] Confirm duplicate delivery is deduplicated without duplicate ledger state.
- [ ] Confirm no unrelated payout/order event noise was received.

Payment webhook result: _Not run_

## Refund test checklist

- [ ] Open the paid standard order in the authenticated admin UI.
- [ ] Submit one full refund with reason `Production rehearsal refund`.
- [ ] Confirm Square creates exactly one refund.
- [ ] Confirm refund webhook delivery receives HTTP `200`.
- [ ] Confirm a child refund `PaymentAttempt` references the parent payment.
- [ ] Confirm parent payment and order show fully refunded.
- [ ] Confirm refund confirmation email delivery or intended dry-run behavior.
- [ ] Attempting another refund is blocked before a second provider request.

Refund result: _Not run_

## Admin reconciliation checklist

- [ ] Admin payments shows the website and Square payment states aligned.
- [ ] Amount, currency, location, receipt/reference, and paid time are correct.
- [ ] Refund state, parent/child relationship, reason, and completion time align.
- [ ] No mismatch warning remains after webhook processing.
- [ ] Audit log identifies the authorized admin action without secret data.

Admin reconciliation result: _Not run_

## Rollback checklist

Unless the owner separately and explicitly approves launch during this window:

- [ ] Set `SQUARE_PRODUCTION_PAYMENTS_ENABLED=false` immediately after the
      refund/reconciliation checks.
- [ ] Restart/redeploy if required by the platform.
- [ ] Confirm admin readiness is blocked only by the production gate.
- [ ] Confirm checkout safely hides/disables live Square payment fields and shows
      generic unavailable copy.
- [ ] Confirm new standard payments, hosted links, and refunds fail closed.
- [ ] Confirm the verified webhook endpoint remains reachable for reconciliation.
- [ ] Record the final gate state and deployment ID.

Final gate state: _Pending; required result is false unless separately approved_

## Pass/fail result

- Overall result: **NOT RUN**
- Payment: _Pending_
- Payment webhook: _Pending_
- Refund: _Pending_
- Refund webhook: _Pending_
- Admin reconciliation: _Pending_
- Rollback: _Pending_
- Go-live authorization: **Not granted by this checklist branch**

## Issues found

_None recorded; rehearsal has not run._

For each issue, record sanitized evidence, severity, owner, immediate rollback
action, and whether a new Sandbox fix/validation cycle is required.

## Follow-up actions

- [ ] Attach sanitized payment/refund/webhook correlation references.
- [ ] Record any issue and its owner.
- [ ] Confirm the gate's final state with the rehearsal owner.
- [ ] Obtain separate written owner approval before production launch.
- [ ] If any step failed, fix forward in Sandbox and schedule a new rehearsal;
      do not resume from the failed midpoint.
