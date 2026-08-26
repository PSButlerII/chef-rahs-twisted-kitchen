# Confirmed Payment Processing Decisions

Date: July 27, 2026

Status: Square Sandbox standard checkout, service payment links, protected
pending-payment expiration, and admin full refunds for eligible standard orders
are implemented. Production payments/refunds and public retry links remain
disabled.

## Provider Sequence And Scope

- Square is the first provider. PayPal follows after Square is stable unless the client changes priority.
- The Square and PayPal business accounts are created and vetted.
- Standard pickup, delivery, and weekly meal plan orders that do not require approval will charge immediately at checkout.
- Standard sandbox checkout uses Square-hosted card fields and shows supported Apple Pay or Google Pay methods when the browser, device, domain, and Square Sandbox allow them.
- ACH should be limited to larger approved catering, personal-chef, and final-balance payments in a later phase.
- Square is the official receipt source.

## Approval-Required Payments

- Orders that require approval must not collect payment at checkout.
- By-request weekly packages request payment only after admin approval.
- For an approved unpaid weekly order, admin sends a Square-hosted order-total
  payment request from the order detail. The ledger uses the trusted persisted
  order total, including saved option deltas, delivery/late fees, and tip.
- A current active request is reused on resend; expired/cancelled attempts do
  not block a replacement. Webhooks reconcile the hosted payment through the
  existing `providerOrderId` / `ORDER_TOTAL` path.
- Catering and personal-chef requests always require approval before payment.
- Approved catering and personal-chef requests require a 50% deposit.
- Admin sends a separate final-balance payment link by email.
- Menu items and options can require approval according to owner/admin configuration.
- Admins can issue sandbox deposit and final-balance payment links after the
  required approval/payment phase. This does not change approval behavior.

## Checkout And Manual Payment Policy

- Production customer checkout is online-payment only.
- Manual invoice, cash, and offline checkout options are hidden and rejected by default.
- Manual/offline checkout may be enabled only for development or testing by explicitly setting `ALLOW_MANUAL_PAYMENT_IN_CHECKOUT=true`.
- The development flag is ignored when `NODE_ENV=production`.
- Complete Sandbox configuration enables standard checkout. Missing or non-sandbox configuration safely disables the payment UI. Approval-required orders still submit without collecting payment.

## Taxes, Tips, And Trusted Totals

- Taxes are included in listed prices. Do not add a separate checkout tax line.
- Tips support 10%, 15%, 20%, and a custom non-negative amount.
- The tip is added to the final checkout total before payment.
- The server recalculates item prices, fees, late fees, tips, and the final total. Browser-submitted totals are not authoritative.

## Pending Payment And Retry Expiration

- A pending standard payment holds its order and weekly capacity for two hours (120 minutes).
- A secure guest interrupted-payment retry link also expires after two hours.
- If the order remains unpaid after two hours, the protected expiration job:
  1. expire or cancel the order exactly once;
  2. release reserved weekly capacity exactly once;
  3. invalidate further payment attempts and retry links; and
  4. send one cancellation-for-non-payment email.
- The worker marks the ledger attempt `EXPIRED`, records
  `non_payment_timeout` metadata, revokes unused hashed retry-token scaffolding,
  cancels only an approved `PENDING` order whose summary remains
  `PAYMENT_PENDING`, and decrements each distinct weekly-period reservation once
  in the same transaction.
- Retry links are not active in this pass. Do not expose one until
  single-order scoping and redemption behavior are implemented and tested.

## Refund Policy And Eligibility

Approved customer wording:

> Full refund within 24 hours after placing the order, unless the order has already been fulfilled or service work has already started.

Normal refund eligibility requires all of the following:

- the request is within 24 hours after `Order.createdAt`;
- the order is not fulfilled or final; and
- the order has not reached `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, or any later/final status.

The shared refund helper disables the admin action after preparation starts or
the window expires. Eligible paid standard-order payments can be fully refunded
through Square Sandbox by an admin. Partial refunds, exceptional refunds,
disputes, and service-request refund rules still require explicit workflows and
audit requirements before live integration.

## Admin Reconciliation Requirements

The owner performs payment reconciliation. The admin payment view must ultimately compare:

- website payment status;
- Square payment status;
- Square payment ID;
- Square receipt/reference;
- paid date/time;
- refund status; and
- mismatch warnings.

The admin payment view reads the internal payment ledger and compares it with existing order summary fields. It shows verified Sandbox provider states, payment IDs, receipt references, paid/refund timestamps, amount mismatches, and missing timestamp/status warnings. Square rows are explicitly labeled as test data.

## Data Model Review

The current `Order` model has summary fields for `paymentProvider`, `paymentStatus`, `payByDate`, `paidAt`, `tipAmount`, and `total`. `CateringRequest` has quote, deposit amount, and deposit-paid summary fields. These are not enough for a durable payment ledger.

The additive `20260727150000_add_payment_ledger_foundation` migration adds:

- `PaymentAttempt`, related optionally to one `Order` or one `CateringRequest`;
- `PaymentWebhookEvent`, with a provider-scoped unique event ID for deduplication; and
- `PaymentRetryToken`, which stores only a unique SHA-256 token hash.

`PaymentAttempt` stores provider identifiers and status, normalized website status, purpose, integer cent amounts, tip cents, currency, a unique idempotency key, receipt information, two-hour expiry, lifecycle timestamps, minimal JSON metadata, and optional parent/child lineage for refunds or retries. Existing order and service-request payment fields remain as compatibility summaries.

Application payment creation must enforce that each attempt targets exactly one order or service request. This cross-column rule is not expressed as a database check because it must remain portable across the deployed MySQL/MariaDB versions. Refund and retry ledger rows should reference their original attempt through `parentPaymentId`.

`PaymentWebhookEvent` stores the provider, event ID/type, optional matched
attempt, processing state, payload hash, minimal non-sensitive summary,
sanitized processing error, and receive/process timestamps.
`@@unique([provider, eventId])` is the durable duplicate-delivery boundary used
by the signature-verified Square webhook route.

`PaymentRetryToken` stores `tokenHash`, attempt scope, expiration, consumption, and revocation. Plaintext tokens must never be persisted. There is no public retry route in this pass; future issuance should generate a cryptographically random token, store only its SHA-256 hash, deliver the plaintext once, and enforce attempt ownership, two-hour expiry, revocation, and single-use behavior transactionally.

## Website Payment State Flow

The ledger supports this planned normalized flow:

1. `CREATED` — trusted order/service amount and idempotency key are persisted.
2. `PENDING` — provider work has started; `expiresAt` is set for the two-hour hold.
3. `REQUIRES_ACTION` — a supported provider/customer action is still required.
4. `PAID` — verified provider response or webhook confirms payment and `paidAt`.
5. `FAILED`, `CANCELLED`, or `EXPIRED` — the attempt is terminal without payment.
6. `PARTIALLY_REFUNDED` or `REFUNDED` — verified refund ledger rows update the original payment summary.

Standard Square sandbox checkout creates pending attempts and transitions
completed payments to `PAID`. The expiration worker performs the `PENDING` to
`EXPIRED` transition together with safe order cancellation, retry-token
revocation, weekly-capacity release, history, metadata, and one-time email
handling.

## Environment Plan

Planned variables:

```dotenv
SQUARE_ENVIRONMENT=sandbox
SQUARE_APPLICATION_ID=
SQUARE_LOCATION_ID=
SQUARE_ACCESS_TOKEN=
SQUARE_WEBHOOK_SIGNATURE_KEY=
PAYMENT_JOBS_TOKEN=
ALLOW_MANUAL_PAYMENT_IN_CHECKOUT=false
```

`SQUARE_ACCESS_TOKEN` and `SQUARE_WEBHOOK_SIGNATURE_KEY` are server-side secrets. Never expose them through `NEXT_PUBLIC_*`, client components, logs, email, audit metadata, or API responses. The application and location IDs are identifiers rather than secrets, but should remain server-configured until the selected Square browser integration explicitly needs a public application ID.

## Square Sandbox Standard Checkout

Set `SQUARE_ENVIRONMENT=sandbox`, `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, and the server-only `SQUARE_ACCESS_TOKEN`. Webhook processing also requires the server-only `SQUARE_WEBHOOK_SIGNATURE_KEY` and the exact `SQUARE_WEBHOOK_NOTIFICATION_URL` registered in the Square Developer Console.

The browser receives only the application and location identifiers after the server confirms that Sandbox checkout is completely configured. Square Web Payments SDK creates a one-time source token. `/api/orders` independently validates the cart and recalculates subtotal, fees, tip, and total. It creates the pending order and `PaymentAttempt` transactionally before calling Square Payments API with the ledger idempotency key. A completed response marks both records paid; an ambiguous failure retains a pending attempt and key instead of risking a second charge.

`POST /api/webhooks/square` reads the raw request body, verifies
`x-square-hmacsha256-signature` with the exact notification URL, hashes and
deduplicates verified events, and processes `payment.created`,
`payment.updated`, `refund.created`, and `refund.updated`. Amount, currency, and
location must match the ledger before payment/refund state changes. Unsupported
or unmatched verified events are stored and safely ignored.

Sandbox test flow:

1. Configure Sandbox variables and restart the application.
2. Add a standard pickup/delivery item or standard weekly package that does not require approval.
3. Choose a tip and confirm there is no separate tax line.
4. Complete a Square test card or supported sandbox wallet payment.
5. Confirm the order and ledger row show paid status, payment ID, and receipt data in admin reconciliation.
6. Remove one required Square variable and confirm standard checkout is disabled.

The protected `POST /api/jobs/expire-pending-payments` endpoint runs expiration
processing. It is disabled unless `PAYMENT_JOBS_TOKEN` contains at least 32
characters and requires the same value in `x-payment-jobs-token`. A scheduler
must invoke it regularly. Paid, completed, accepted, preparing, fulfilled, and
approval-required orders are not cancelled.

Approved catering and personal-chef deposits use Square Sandbox hosted payment
links. Admin creates one active `SERVICE_DEPOSIT` ledger attempt for the trusted
quoted deposit, with no tip and a two-hour expiration. The branded email links
directly to Square; no public website tracking page is created. Verified Square
payment webhooks match the link's Square order ID, validate amount, currency,
and location, then mark both the ledger and service-request deposit paid.
Expired unpaid deposit attempts do not cancel the service request and may be
replaced by a new admin request.

Service-payment refunds, partial refunds, invoices, active retry links,
production payment links, and public guest order tracking are not included.

Approved catering and personal-chef requests with a paid deposit may also use a
Square Sandbox hosted final-balance link. The server calculates the trusted
remaining cents as quoted total minus the recorded deposit amount, creates a
`SERVICE_FINAL_BALANCE` attempt with no tip and a two-hour expiration, and
emails the Square-hosted URL. The payment ledger remains authoritative for the
final-balance paid timestamp because payment does not mean the service itself
has been fulfilled. Square invoices remain an optional future enhancement.

During Sandbox QA, hosted payment links may be deleted during cleanup while a
local attempt still appears pending. Opening the admin service detail checks
active deposit and final-balance link IDs with Square. A confirmed `NOT_FOUND`
marks the attempt `EXPIRED`, records
`staleReason: square_payment_link_not_found`, and hides the unusable URL. The
admin can then send a replacement request. Paid attempts and standard-order
attempts are never changed by this check.

## Service Payment Phase Versus Completion

Admin service-request payment phase is derived from the quote, deposit fields,
and payment ledger. It can show Deposit Due, Deposit Paid, Final Balance Due,
Final Balance Pending, or Paid in Full. `Paid in Full` requires both a recorded
deposit payment and a paid `SERVICE_FINAL_BALANCE` attempt.

This payment phase is separate from the persisted operational workflow.
Receiving final payment must not mark catering or personal-chef work
`COMPLETED`; an admin selects Completed only after the event or service has
actually finished.

The current CSP permits the Sandbox Web Payments SDK, Google Pay sandbox scripts, and Square wallet font assets. React/Turbopack `unsafe-eval` support is enabled only while `NODE_ENV=development`; production responses omit it. Production Square hosts and a final production CSP review remain a later pass.

## Follow-Up For Live Square Integration

1. Review production credentials, hosts, CSP endpoints, wallet domain registration, webhook URL, and operational controls before permitting the production environment.
2. Add out-of-order webhook replay/recovery.
3. Configure and monitor the payment-expiration scheduled job in each deployed environment.
4. Implement secure guest retry-token issuance and redemption without public guest order tracking.
5. Define the service-work-start signal before enabling deposit/final-balance
   refunds.
6. Define metadata retention/redaction rules and operational cleanup.
7. Run ambiguous-failure, retry, duplicate-charge, wallet, receipt, and
   controlled production payment/refund smoke tests before enabling live
   Square.
## Square Sandbox refund workflow

- Refunds are admin-only. Customers cannot request or initiate them in the
  application.
- The normal policy is: “Full refund within 24 hours after placing the order,
  unless the order has already been fulfilled or service work has already
  started.”
- This implementation supports full refunds for eligible paid standard-order
  Square Sandbox payments. It does not accept a client-provided amount; the
  trusted ledger amount, including any charged tip, is refunded.
- Preparing-or-later, fulfilled, cancelled, already-refunded, unpaid, non-Square,
  and provider-ID-less payments are blocked.
- Service deposit and final-balance refund actions remain disabled until the
  business defines an unambiguous service-work-start signal. This prevents the
  payment-completion state from being mistaken for service completion.
- A refund is recorded as a child `PaymentAttempt` with purpose `REFUND` before
  Square is called. Square refund webhooks reconcile that row and retain the
  existing verified-event deduplication.
- Refund webhook parsing uses Square's `data.object.refund` object and supports
  `PENDING`, `COMPLETED`, `REJECTED`, and `FAILED`. A completed refund updates
  the child refund attempt, its parent payment, and the full-refund order
  summary atomically. Failed or rejected refunds remain failed without marking
  the parent or order refunded. A `refund.updated` event that still carries a
  pending snapshot is checked against Square's read-only refund retrieval API
  before being accepted as pending.
- A Square refund can legitimately remain `PENDING` before completing. The app
  must present that as a temporary provider state and must not finalize the
  parent payment or order as refunded until Square reports `COMPLETED`.
  Production delivery QA confirmed that the affected refund later reconciled
  normally after Square completed it, so recovery apply was not required.
  Never issue a second refund while waiting; use the read-only provider status
  check when confirmation is needed.
- Production, partial, automatic, customer-initiated, PayPal, ACH, and invoice
  refunds remain disabled. Production Square CSP and production refund
  activation are later passes.
