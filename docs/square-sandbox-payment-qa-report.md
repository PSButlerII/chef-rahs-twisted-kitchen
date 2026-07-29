# Square Sandbox Payment QA Readiness Report

Date: July 29, 2026

Branch: `qa/square-sandbox-payment-readiness`

## Overall Status

**Ready with caveats.**

The Square Sandbox lifecycle is coherent across standard checkout, approval
gating, service deposits, final balances, stale-link invalidation, expiration,
refunds, verified webhooks, email handling, and admin reconciliation. Current
application and database evidence show successful paid standard orders, a paid
order with a tip, paid catering and personal-chef deposits, a paid final
balance, stale/expired service attempts, and a completed full refund with
parent/child lineage.

This is not production-payment approval. The application intentionally accepts
only `SQUARE_ENVIRONMENT=sandbox`; production credentials and CSP have not been
activated.

## QA Method

- Reviewed the current routes, server helpers, UI states, ledger transitions,
  signature verification, deduplication, expiration transaction, emails, and
  reconciliation calculations.
- Inspected existing local Sandbox ledger and webhook-event evidence without
  exposing credentials or full webhook payloads.
- Relied on the focused manual QA already completed on the implementation
  branches where repeating a charge, hosted-link payment, expiration, or refund
  would create unnecessary provider/database activity.
- Ran the complete repository validation suite listed below.

## Results

| Area | Result | Evidence in this pass |
| --- | --- | --- |
| Standard guest pickup/delivery checkout | Pass; not recharged | Server-authoritative checkout and Square route review; multiple paid `ORDER_TOTAL` rows retain Square IDs, receipt URLs/references, amounts, and paid timestamps. Previously exercised on `feature/square-standard-checkout-sandbox` (`37aa5ca`). |
| Standard weekly checkout | Pass; not recharged | Weekly non-approval orders share the validated standard Square path; approval-required packages are rejected from that path. Previously exercised on the standard checkout branch. |
| Tips and tax | Pass | A paid ledger example stores total `3760`, tip `460`, and order tip `4.60`. Server and UI totals add tip; UI explicitly states taxes are included and adds no separate tax line. |
| Approval-first orders | Pass by review | Checkout enforces the `approval` method whenever any item/package/option requires approval and persists `PENDING`/`AWAITING_APPROVAL`. Catering and personal-chef submission routes create approval-first service requests without standard checkout. |
| Payment ledger | Pass | Existing evidence includes paid, pending, expired, and refunded attempts across every implemented purpose. Provider identifiers, receipts, amounts, tips, timestamps, metadata, and refund lineage are present. |
| Verified webhook processing | Pass | Route verifies the raw-body Square signature before storage, validates amount/currency/location, and supports payment and refund created/updated events. Existing event rows show processed payment and refund events plus safely ignored unsupported events. |
| Duplicate webhook delivery | Pass; not replayed again | Provider/event ID uniqueness plus pre-check and `P2002` race handling remain present. Duplicate payment QA passed on `fix/square-webhook-duplicate-events` (`3aaae22`); duplicate refund replay passed on `feature/square-refund-workflow` (`fa640e7`). |
| Catering deposit | Pass; not repaid | Existing paid `SERVICE_DEPOSIT` row has trusted amount, hosted-link/order IDs, paid state, and handled email metadata. Previously exercised on `feature/square-deposit-payment-requests` (`b278ef8`). |
| Personal-chef deposit | Pass; not repaid | Existing personal-chef deposit is paid and reconciled with hosted-link/order IDs and handled email metadata. |
| Duplicate deposit request | Pass by review | An unexpired active attempt is reused; the API reports `duplicate: true` and does not resend an already-handled email. |
| Final balance | Pass; not repaid | Server requires approval and paid deposit, calculates quote minus deposit in cents, and reuses active attempts. Existing catering final balance is paid for the trusted remaining amount. Previously exercised on `feature/square-final-balance-requests` (`47e4604`). |
| Paid-in-full phase | Pass | Derived payment phase requires both paid deposit and paid final-balance attempt. Operational service status remains `DEPOSIT_PAID`, proving payment did not auto-complete service work. |
| Stale hosted links | Pass; not recreated | Existing expired rows contain `square_payment_link_not_found`, check timestamp, and stale Square link ID. Admin hides stale URLs and permits replacement. Previously exercised on `fix/square-stale-payment-link-handling` (`00c863a`). |
| Expiration worker | Pass by review/evidence; not rerun | Protected POST uses a minimum 32-character token, SHA-256/timing-safe comparison, rate limit, and no-store responses. The transaction expires attempts once, revokes retry tokens, cancels only eligible standard orders, releases weekly capacity, and handles email once. Service attempts expire without cancelling service requests. Existing service rows demonstrate terminal expiration. Previously exercised on `feature/square-payment-expiration-worker` (`528e00f`). |
| Standard full refund | Pass; not refunded again | Existing refund child is `REFUNDED`, points to its parent attempt, matches the full amount, and has a Square refund ID/timestamp. Parent and order are refunded. Previously exercised end-to-end on `feature/square-refund-workflow` (`fa640e7`). |
| Refund safety | Pass by review | Admin auth, mandatory reason, confirmation, trusted full amount, durable idempotency, eligibility checks, preparing-or-later block, already-refunded block, and service-refund policy block remain present. |
| Refund email | Pass; not resent | Completion transition gates the branded email; previous refund QA generated one preview despite repeated webhook delivery. |
| Admin reconciliation | Pass by review/evidence | Standard payments, service deposits/final balances, refunds, refund parent/reason/timestamp, stale states, and Sandbox labels are visible. Refunded paid timestamps do not create a false mismatch. |
| Environment and operational docs | Pass after small fixes | `.env.example` includes every Sandbox variable plus `PAYMENT_JOBS_TOKEN`; secrets remain server-only. Runbook explicitly states production activation is incomplete. |
| Endpoint security smoke test | Pass | With the local jobs token disabled, the worker returned 404; an unauthenticated refund request returned 401; an invalidly signed webhook returned 401. No payment state was mutated. |

## Flows Not Retested In This Pass

No new card charge, wallet charge, hosted deposit/final-balance payment, link
deletion, forced expiration, or refund was initiated. Those are provider-side
or durable financial-state actions already evidenced in the local ledger and
focused branch QA. Repeating them would not materially improve this
consolidation review.

Wallet availability remains browser/device/domain dependent and was not
retested. Public retry redemption does not exist by design. Production
credentials, CSP, webhook delivery, and live transactions were not tested
because production Square must remain disabled.

## Bugs Found And Fixed

Only documentation drift was found:

1. Removed a duplicate `SQUARE_WEBHOOK_SIGNATURE_KEY` row and documented
   `PAYMENT_JOBS_TOKEN` in the developer guide.
2. Replaced stale wording that said no Square refund call existed.
3. Updated webhook documentation to include refund events.
4. Removed implemented deposit/final-balance/refund tasks from the future list.
5. Replaced the obsolete “create the payment foundation branch” roadmap step.
6. Clarified the production runbook’s Sandbox-only posture and production
   activation gates.

No payment-code, schema, authentication, or webhook-verification change was
required.

## Known Sandbox Caveats

- Sandbox card/wallet behavior does not prove production wallet registration or
  production CSP correctness.
- Hosted Sandbox links can be deleted during QA; the app intentionally records
  and invalidates those stale attempts instead of deleting ledger history.
- Provider webhooks can arrive out of order; basic idempotent reconciliation is
  present, but a dedicated replay/recovery operator workflow remains future
  work.
- Guest retry tokens have a secure storage foundation but no public redemption
  route.
- Service deposit/final-balance refunds remain disabled until “service work
  started” has a definitive business signal.

## Production Blockers

1. Add and verify production Square credentials/location without weakening the
   explicit Sandbox guard prematurely.
2. Finalize production CSP endpoints and wallet-domain registration.
3. Configure the exact production webhook URL/key and verify delivery,
   monitoring, replay, and alert ownership.
4. Schedule and monitor the protected expiration job on the production host.
5. Establish daily reconciliation, dispute, failed-webhook, and refund
   operations with the owner.
6. Run a controlled low-value production payment and full refund with an
   approved rollback window before customer enablement.
7. Decide whether interrupted guest payment redemption is required at launch.

## Recommended Next Steps

Keep production Square disabled while the owner completes the production
operational checklist. Then use a narrowly scoped production-activation branch
for credentials/environment gating, CSP, wallet registration, webhook smoke
testing, job scheduling, and one controlled payment/refund rehearsal. Do not
bundle PayPal, ACH, partial refunds, service refunds, or public tracking into
that activation pass.
