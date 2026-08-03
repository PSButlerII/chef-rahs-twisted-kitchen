# Square Production Activation Plan

## August 2026 readiness-gate implementation update

The centralized runtime readiness gate is now implemented, while production
payments remain disabled. The committed defaults remain
`SQUARE_ENVIRONMENT=sandbox`, `SQUARE_PRODUCTION_PAYMENTS_ENABLED=false`, and
`SQUARE_CSP_MODE=sandbox`.

Production payment creation and refunds require the explicit gate to be `true`,
all Square identifiers and secrets, the exact
`https://rahstwistedkitchen.com/api/webhooks/square` notification URL, an HTTPS
`NEXT_PUBLIC_APP_URL`, and explicitly approved `SQUARE_CSP_MODE=production`.
Standard checkout and both hosted-link flows fail before creating payment state
when readiness is blocked. Customers receive generic unavailable copy; the
authenticated admin payments page shows sanitized blockers and missing variable
names without values. Verified webhook ingestion and reconciliation intentionally
remain available when the creation gate is off so rollback can process in-flight
events.

Date: July 29, 2026

Status: planning only — production Square remains disabled.

This document defines the work and operational approvals required to move the
verified Square Sandbox lifecycle into production. It does not authorize an
environment change, live charge, CSP change, or production deployment.

## 1. Current Readiness

The Sandbox lifecycle is complete with documented caveats:

- standard pickup, delivery, and non-approval weekly checkout;
- server-authoritative totals, included tax, and tips;
- payment ledger, verified webhooks, deduplication, and reconciliation;
- approval-first catering, personal-chef, and by-request weekly behavior;
- hosted deposit and final-balance payment links;
- stale hosted-link invalidation;
- protected two-hour expiration processing; and
- eligible standard-order full refunds.

See [Square Sandbox Payment QA Readiness Report](square-sandbox-payment-qa-report.md).

Production is deliberately blocked today. The current server configuration
accepts only `sandbox`, the Square client is constructed with the Sandbox
environment, and CSP/browser SDK hosts are Sandbox-specific. A production
activation implementation must change these controls together behind an
explicit, default-off production feature gate.

## 2. Required Production Square Values

Obtain all values from the production side of the Square Developer Console and
the activated business account. Never copy Sandbox identifiers or tokens into
production.

```dotenv
SQUARE_ENVIRONMENT=production
SQUARE_APPLICATION_ID=
SQUARE_LOCATION_ID=
SQUARE_ACCESS_TOKEN=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_WEBHOOK_NOTIFICATION_URL=https://rahstwistedkitchen.com/api/webhooks/square
```

Requirements:

- `SQUARE_APPLICATION_ID` and `SQUARE_LOCATION_ID` must belong to the same
  production Square application/account and intended production location.
- `SQUARE_ACCESS_TOKEN` and `SQUARE_WEBHOOK_SIGNATURE_KEY` are server-only
  secrets. They must never use `NEXT_PUBLIC_*`, enter browser bundles, logs,
  email, audit metadata, or API responses.
- The business account must be activated for payment acceptance.
- The exact notification URL, including scheme, hostname, and path, must match
  the Square subscription because signature verification uses that exact value.
- Rotate any credential exposed during rehearsal and document the credential
  owner and rotation procedure.

Do not set `SQUARE_ENVIRONMENT=production` until the future activation code,
CSP, webhook subscription, rollback control, and rehearsal approvals are all
ready.

## 3. Future Runtime Activation Gate

The implementation pass should introduce a separate default-off production
enablement control, for example `SQUARE_PRODUCTION_PAYMENTS_ENABLED=false`.
Production configuration should be usable only when both conditions hold:

1. `SQUARE_ENVIRONMENT=production`; and
2. the explicit production-payments gate is `true`.

Missing/mismatched production values must fail closed and hide customer payment
forms. The gate must cover standard checkout, hosted service payment links, and
refund calls consistently. Sandbox behavior must remain available for QA.

This plan does not add that flag or change runtime behavior.

## 4. Production CSP Plan

Before implementation, recheck Square’s current
[Web Payments SDK CSP guidance](https://developer.squareup.com/docs/web-payments/content-security-policy)
and the exact payment methods approved for launch. The present Sandbox allowlist
must not be reused unchanged.

Baseline production substitutions currently documented by Square:

| Directive/control  | Production requirement                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK script         | Load `https://web.squarecdn.com/v1/square.js`, not the Sandbox SDK.                                                                                                                                                    |
| `script-src`       | Allow `https://web.squarecdn.com`; retain `https://pay.google.com` only if Google Pay is enabled and verified.                                                                                                         |
| `frame-src`        | Allow `https://web.squarecdn.com` plus only method-specific production frames confirmed during rehearsal.                                                                                                              |
| `connect-src`      | Allow `https://web.squarecdn.com`, `https://pci-connect.squareup.com`, and Square’s documented telemetry endpoint if still required. Remove `squareupsandbox.com` endpoints.                                           |
| `style-src`        | Allow `https://web.squarecdn.com` if required by the selected SDK elements.                                                                                                                                            |
| `font-src`         | Retain only observed/documented production assets such as `https://square-fonts-production-f.squarecdn.com`, `https://d1g145x70srn7h.cloudfront.net`, and `https://cash-f.squarecdn.com` when Cash App Pay is enabled. |
| Permissions Policy | Replace the Sandbox payment origin with `https://web.squarecdn.com` and verify wallet behavior.                                                                                                                        |

Security rules:

- Never include `'unsafe-eval'` in production. It remains development-only.
- Keep `default-src 'self'`, `object-src 'none'`, restrictive
  `frame-ancestors`, and other existing security headers.
- Do not add broad wildcards merely to silence CSP errors.
- Test card entry, each approved wallet, 3DS/buyer authentication, hosted links,
  and receipts while collecting CSP reports. Add only verified origins.
- Recheck official requirements immediately before deployment because SDK and
  wallet dependencies can change.

Square requires HTTPS secure contexts and CSP for Web Payments SDK deployments.
The production application must use `https://rahstwistedkitchen.com`.

## 5. Wallet And Domain Readiness

Enable only wallets explicitly approved for launch. A wallet initialization
failure must remain isolated so card entry still works.

### Apple Pay

- Register `rahstwistedkitchen.com` in the production Square Developer Console.
- Host and verify the current Apple domain-association file at the required
  `.well-known` path without redirects, extensions, or stale long-lived cache.
- Test on supported Safari/iOS/macOS hardware over HTTPS with a real wallet
  card. Apple Pay is not a localhost/HTTP test.
- Confirm buyer-authentication/tokenization behavior against current Square
  guidance.

### Google Pay

- Verify HTTPS, production application/location IDs, supported browser/device,
  Google terms/branding, and any required production profile approval.
- Test Chrome plus at least one other supported browser and confirm unsupported
  browsers fall back to card without blocking checkout.
- Revalidate Google-specific CSP/network requirements.

### Cash App Pay

- Confirm the seller and buyer are eligible in the United States and the
  business category is supported.
- Verify redirect URL behavior on the canonical HTTPS domain, QR scanning on
  desktop, and mobile handoff.
- Confirm Cash App font/script/connect sources from current Square guidance and
  observed CSP reports before allowlisting them.

For every wallet, record browser, OS/device, result, provider transaction ID,
and fallback behavior. Availability varies by account, region, browser, device,
wallet configuration, and provider status.

## 6. Production Webhook Setup

Create a production webhook subscription for exactly:

- `payment.created`
- `payment.updated`
- `refund.created`
- `refund.updated`

Notification URL:

```text
https://rahstwistedkitchen.com/api/webhooks/square
```

Setup and verification:

1. Create the subscription in the production Square application.
2. Store its production signature key only as
   `SQUARE_WEBHOOK_SIGNATURE_KEY`.
3. Set `SQUARE_WEBHOOK_NOTIFICATION_URL` to the exact URL above.
4. Confirm the route reads the raw request body and rejects an invalid
   `x-square-hmacsha256-signature`.
5. Send Square’s production test event and confirm a `2xx` response.
6. Confirm verified events are stored with a payload hash and minimal summary,
   not secrets or full card data.
7. Replay the same verified event ID and confirm a successful duplicate
   response without reprocessing, a second email, or a second state transition.
8. Verify out-of-order `created`/`updated` events do not regress paid or refunded
   records.

Monitor failed/ignored events. Unsupported verified events may be retained and
ignored, but unmatched payment/refund events require an owner/admin review
procedure.

Square event references:
[payment events and refund events](https://developer.squareup.com/docs/webhooks/v2webhook-events-tech-ref).

## 7. Expiration Worker Scheduling

Endpoint:

```text
POST https://rahstwistedkitchen.com/api/jobs/expire-pending-payments
x-payment-jobs-token: <PAYMENT_JOBS_TOKEN>
```

Requirements:

- Generate a permanent random `PAYMENT_JOBS_TOKEN` of at least 32 characters.
- Store it only in the production host and scheduler secret store.
- Run every 5–15 minutes; every 10 minutes is the recommended initial schedule.
- Do not add the worker to the Hostinger build lifecycle.
- Alert on non-`2xx`, repeated `errors > 0`, missed runs, or unusual spikes.
- Retain timestamp, HTTP status, duration, and returned aggregate counts without
  logging the token.
- Run twice during rehearsal and confirm the second run is idempotent.
- Verify an expired standard weekly order releases capacity once, while expired
  service deposit/final-balance attempts do not cancel the service request.

## 8. Admin And Owner Operations

Assign named primary and backup owners before activation.

Daily process:

1. Owner opens the Square Dashboard and website reconciliation page.
2. Compare paid/refunded amounts, Square IDs, receipts, timestamps, and mismatch
   warnings.
3. Review failed/ignored/unmatched webhook events and expiration-job alerts.
4. Resolve discrepancies before fulfillment or customer communication.
5. Record material manual decisions in the admin audit trail/incident notes.

Operational ownership must cover:

- Square Dashboard access and MFA;
- daily reconciliation and settlement review;
- failed webhook investigation/replay;
- disputes and chargebacks;
- refund approval under the documented 24-hour/preparation policy;
- customer communication;
- credential rotation; and
- incident/rollback authority.

Only admins/owners may issue refunds. Service payment refunds remain disabled
until the service-work-start policy is defined. Square remains the official
receipt/refund source.

## 9. Controlled Production Rehearsal

Run during a scheduled low-traffic window with owner, developer, and rollback
owner present. Production transactions use real funds.

Preconditions:

- all checklist items below are signed off;
- backups and current deployment rollback are verified;
- manual/offline checkout remains disabled for customers;
- production gate can be switched off independently;
- monitoring and Square Dashboard access are open.

Rehearsal:

1. Enable the production gate for the controlled tester only if the activation
   implementation supports a safe limited cohort; otherwise use a brief
   maintenance window.
2. Place one minimum practical-value standard pickup order with a card.
3. Confirm the charged amount equals the server total, including any selected
   tip and no separate tax.
4. Verify Square receipt, payment ID, webhook processing, ledger `PAID` state,
   order summary, email, and “no mismatch” reconciliation.
5. Run the expiration worker and verify it does not touch the paid order.
6. Issue an eligible full admin refund with an approved reason.
7. Verify Square refund ID/status, refund webhooks, child/parent ledger state,
   order state, reconciliation, audit entry, and exactly one refund email.
8. Replay a verified event and confirm deduplication.
9. Test card fallback when each enabled wallet is unavailable.
10. Record evidence and obtain owner go/no-go approval.

Do not use a real customer order for rehearsal.

## 10. Rollback Plan

Trigger rollback for duplicate charges, amount mismatch, signature failures,
unreconciled provider state, checkout-wide CSP/wallet failure, worker
malfunction, or loss of operational monitoring.

1. Set the explicit production-payment gate to `false` and restart/redeploy.
2. Confirm new production payment forms and hosted-link/refund creation are
   unavailable.
3. Keep the verified webhook endpoint online to reconcile already-started
   provider activity.
4. Do not delete ledger, event, order, or migration history.
5. Reconcile every transaction created during the window in Square and the app.
6. Refund only after confirming the provider payment completed.
7. Communicate with affected customers from verified provider state.
8. Fix forward in Sandbox, repeat validation/rehearsal, and require a new owner
   approval before re-enabling.

## 11. Go/No-Go Checklist

### Credentials and account

- [ ] Square production account is activated.
- [ ] Production application/location IDs are verified together.
- [ ] Server-only access and webhook secrets are stored and rotation ownership
      is assigned.
- [ ] Explicit default-off production feature gate is implemented and tested.

### Application/security

- [ ] Production Square client and SDK selection are implemented.
- [ ] Production CSP/Permissions Policy is reviewed with no `'unsafe-eval'`.
- [ ] Sandbox hosts are absent from the production payment allowlist.
- [ ] Card, buyer authentication, and approved wallets pass on the canonical
      HTTPS domain.
- [ ] Unsupported wallets fail gracefully without blocking card.

### Webhooks/jobs

- [ ] Exact production webhook URL and four required event types are configured.
- [ ] Signature rejection, processing, replay, dedupe, and alerting pass.
- [ ] Expiration scheduler token, cadence, logs, alerts, and idempotency pass.

### Operations/rehearsal

- [ ] Primary and backup operational owners are named.
- [ ] Reconciliation, dispute, refund, incident, and credential procedures are
      approved.
- [ ] Low-value payment/refund rehearsal passes end to end.
- [ ] Rollback is exercised and owner gives written go-live approval.

Production remains **NO-GO** until every item is checked.

## 12. Explicitly Deferred

- PayPal
- ACH
- Square invoices
- partial refunds
- customer-initiated refund requests
- service deposit/final-balance refunds
- public order tracking
- public guest retry-token redemption

## 13. Official Square References

- [Deploy the Web Payments SDK application](https://developer.squareup.com/docs/web-payments/quickstart/deploy-app)
- [Web Payments SDK CSP](https://developer.squareup.com/docs/web-payments/content-security-policy)
- [Apple Pay production setup](https://developer.squareup.com/docs/web-payments/apple-pay)
- [Google Pay requirements](https://developer.squareup.com/docs/web-payments/google-pay)
- [Cash App Pay requirements](https://developer.squareup.com/docs/web-payments/add-cash-app-pay)
- [Webhook events reference](https://developer.squareup.com/docs/webhooks/v2webhook-events-tech-ref)
- [Refund Payments](https://developer.squareup.com/docs/payments-api/refund-payments)
