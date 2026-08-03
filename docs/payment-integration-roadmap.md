# Payment Integration Roadmap

## August 2026 gate milestone

The default-off production readiness gate is implemented across standard
checkout, deposit links, final-balance links, and refunds. Production payments
remain disabled pending credentials, CSP and webhook rehearsal, owner approval,
and a controlled live test. Webhook ingestion remains independent of the
creation gate for safe rollback reconciliation. PayPal, ACH, invoices, partial
refunds, and customer refund requests remain out of scope.

> The client decisions that were previously open in this roadmap are now resolved. Use `docs/payment-processing-decisions.md` as the authoritative policy for implementation; retain this document for architecture and risk context.
>
> The additive internal ledger, webhook deduplication table, and hashed
> retry-token foundation were added in migration
> `20260727150000_add_payment_ledger_foundation`. Sandbox Square APIs and the
> verified webhook route are active; production payments/refunds and public
> retry flows are not.

Date: July 15, 2026

Status: implementation roadmap. Sandbox payment phases are recorded below;
production activation remains future work.

## Current Milestone

Square Sandbox implementation and consolidated lifecycle QA are complete with
documented caveats. Production Square remains disabled. The next milestone is
the separately gated work in
[Square Production Activation Plan](square-production-activation-plan.md);
that plan must be completed before any live payment environment switch.

## 1. Executive Recommendation

Implement Square first. Add PayPal later only if the client confirms that customers need it after Square has completed sandbox and production verification.

This recommendation is based on the current application, not on a claim that Square is the only suitable provider:

- The app is a single food-service business with pickup, delivery, weekly meal plans, one trusted server-calculated order total, and admin-managed payment follow-up.
- Square's Web Payments SDK tokenizes payment details in the browser and sends a single-use token to the app's server, where the Payments API creates the payment. Card data therefore does not need to pass through or be stored by this app.
- Square's application, location, payment, and manual/offline workflows fit the app's existing location-oriented order operations and admin fallback.
- Building and stabilizing one provider first keeps order creation, weekly capacity, email, webhook, refund, and reconciliation behavior understandable.

The implementation should preserve the current manual invoice, cash/offline, admin mark-paid, and manual Square/PayPal link options as fallbacks. It should not retain the disabled internal `stripe` value as the abstraction for new work.

Official references:

- [Square Web Payments SDK overview](https://developer.squareup.com/docs/web-payments/overview)
- [Square CreatePayment API](https://developer.squareup.com/reference/square/payments-api/createpayment)
- [Square webhook signature validation](https://developer.squareup.com/docs/webhooks/step3validate)
- [Square Web Payments SDK CSP guidance](https://developer.squareup.com/docs/web-payments/content-security-policy)
- [PayPal Standard Checkout](https://developer.paypal.com/docs/checkout/)
- [PayPal webhook integration and verification](https://developer.paypal.com/api/rest/webhooks/rest/)

## 2. Current Architecture Findings

### Order and payment data

`Order` currently stores the authoritative order snapshots and totals:

- `subtotal`
- `deliveryFee`
- `lateFee`
- `tipAmount`
- `total`
- `payByDate`
- `paidAt`
- `paymentProvider`
- `paymentStatus`

These fields support the current manual workflow, but they are not a durable online payment ledger. There is no provider payment ID, payment attempt record, idempotency key, currency snapshot, webhook event record, refund record, or failure history.

`CateringRequest`, which also represents personal chef requests, stores `estimatedTotal`, `depositAmount`, and `depositPaidAt`. It likewise has no durable provider transaction reference.

### Checkout and order creation

- `app/checkout/page.tsx` currently offers manual invoice and cash/offline payment. Online card payment is disabled.
- `app/api/orders/route.ts` accepts only `manual` and `cash` payment methods.
- The API reloads and validates menu data, weekly packages, weekly slots, allowed options, prices, delivery fee, weekly late fee, and tip before computing the final total.
- Client-submitted prices and totals are not authoritative. This must remain true for online payments.
- Guest checkout creates `userId = null`, persists customer contact snapshots, emails `order.customerEmail`, and sends the customer to `/checkout/thank-you` without exposing a protected order URL.
- Logged-in checkout links the order to the authenticated user and permits the protected order detail link.
- Weekly selections, readable slot labels, selected options, option upcharges, and resolved fulfillment data are stored as order data.

### Admin and email behavior

- `/admin/payments` lists manual payment obligations.
- Admin mark-paid routes use guarded, conditional updates, set `paymentStatus = "PAID"` and `paidAt`, add status history, send `PaymentReceivedEmail`, and write an audit log.
- Catering and personal chef deposits have a separate guarded admin mark-deposit-paid path with their own email and audit behavior.
- Existing email paths cover order submission, order approval or denial, payment received, service request status, and deposit received.
- Email delivery failures are logged without rolling back the underlying order or status mutation.

The manual mark-paid behavior should remain available. Online provider updates must share one payment-state service with manual updates so that payment emails, audit logs, and status summaries cannot drift.

## 3. Provider Credentials

### Square phase

| Variable                       | Exposure                               | Purpose                                                                                                               |
| ------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `SQUARE_ENVIRONMENT`           | Server and safe public configuration   | Explicit `sandbox` or `production`; never infer it from a token.                                                      |
| `SQUARE_APPLICATION_ID`        | Public identifier                      | Initializes the browser payment component. Expose only through a narrowly scoped public config value or endpoint.     |
| `SQUARE_ACCESS_TOKEN`          | Server secret                          | Authorizes server-to-server Square API calls. Never send it to the browser or logs.                                   |
| `SQUARE_LOCATION_ID`           | Public identifier/server configuration | Identifies the Square location receiving the payment. Validate that it belongs to the configured environment/account. |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Server secret                          | Verifies Square webhook signatures if webhooks are enabled.                                                           |

The production environment should fail closed when online Square payment is enabled but required credentials are missing. Sandbox and production credentials must never be mixed.

### Later PayPal phase

| Variable               | Exposure                             | Purpose                                                                              |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `PAYPAL_ENVIRONMENT`   | Server and safe public configuration | Explicit `sandbox` or `production`.                                                  |
| `PAYPAL_CLIENT_ID`     | Public identifier                    | Initializes PayPal's browser SDK.                                                    |
| `PAYPAL_CLIENT_SECRET` | Server secret                        | Obtains server API access; never expose it to the browser or logs.                   |
| `PAYPAL_WEBHOOK_ID`    | Server configuration                 | Identifies the subscribed webhook endpoint and participates in webhook verification. |

Credentials should be added to environment validation only in the provider implementation branch. They are not required while automated checkout remains disabled.

## 4. Proposed Provider Boundary

Keep provider-specific API details behind a small server-only interface. Do not build a broad framework before a second provider exists.

Suggested responsibilities:

```text
PaymentProvider
  createPayment(input)
  getPayment(providerPaymentId)
  cancelOrVoidPayment(providerPaymentId)
  refundPayment(input)
  verifyWebhook(input)
  normalizeWebhook(input)
```

The app-level payment service should own:

- loading the payable order or service request,
- confirming the trusted amount and currency,
- generating and reusing idempotency keys,
- enforcing legal state transitions,
- persisting provider references and attempts,
- updating `Order` or `CateringRequest` summary fields,
- adding audit/status history,
- deciding when payment emails are sent.

The Square and future PayPal adapters should only translate app-level commands and provider responses.

## 5. Regular Order Payment Flow

Recommended sequence:

1. The customer completes the existing checkout details and selects Square online payment.
2. The server validates the cart and creates one durable order with a `PAYMENT_PENDING` summary state and the trusted total. The request receives an app idempotency key.
3. The server returns only the identifiers and safe configuration needed to initialize payment. The browser does not become the amount authority.
4. Square's browser component tokenizes the payment method. The app never receives raw card data.
5. The browser submits the token and app order ID to a dedicated payment endpoint.
6. The server reloads the order, verifies it is still payable, uses the stored order total/currency, and calls Square CreatePayment with a stored idempotency key.
7. The server stores the provider payment ID and normalized result before returning success.
8. The app marks the order paid only from a verified server API response or a verified webhook, never from browser callback text alone.
9. A webhook reconciles delayed, retried, disputed, refunded, or out-of-order events.
10. The thank-you page displays the persisted app payment state. Refreshing or retrying must not create a second order or payment.

Before implementation, resolve these current-order side effects:

- Order submission currently reserves weekly capacity and sends a confirmation. The online path must perform each side effect once, even if payment is retried.
- `PAYMENT_PENDING` weekly orders reserve capacity for two hours. The protected
  expiration job releases the stored reservation transactionally when it
  cancels a still-unpaid pending order.
- Use distinct copy for "order received, payment pending" and "payment received." Do not send duplicate order or payment emails.

## 6. Weekly Meal Plan Payment Flow

Weekly plans should use the same payment service, with the existing weekly rules executed before the payment amount is established:

1. Validate the published weekly period and current ordering window on the server.
2. Validate package slot count, readable slot labels, period ownership, breakfast-only eligibility, allowed per-slot options, and option upcharges.
3. Calculate the weekly late fee from the server-side weekly ordering window.
4. Persist one immutable order snapshot and trusted total.
5. Reserve weekly capacity exactly once.
6. Create or retry payment against that existing order using the same idempotency key.
7. Never recalculate a retry from mutable client cart values.

An approval-required weekly package needs a client decision before code is written: capture the total immediately, authorize and capture after chef approval, or keep it manual until approval. The current approval/denial flow is not enough to safely guess this policy.

## 7. Catering Payment and Deposit Options

Do not collect payment during the initial catering inquiry. The initial request has no final trusted price.

After admin quote and approval, choose one of these approaches:

### Option A: provider-hosted deposit link

- Generate a Square-hosted payment link or invoice for the trusted `depositAmount`.
- Associate the app request ID with provider metadata without including sensitive customer data.
- Reconcile completion by verified webhook or server query.
- Keep admin mark-deposit-paid for cash, external invoices, and recovery.

This is the lowest-risk first catering payment phase and works for guests without adding public request-detail access.

### Option B: embedded deposit checkout

- Present a tokenized deposit form after quote approval.
- For logged-in customers, use the protected request detail page.
- Guest service requests would need a separately designed, expiring, tokenized payment-access link. Do not expose account-only URLs or infer ownership from email.

If the business wants both a deposit and final balance online, store them as separate payment records with distinct purposes. Do not overwrite one provider ID or one `depositPaidAt` field with the final balance payment.

## 8. Personal Chef Payment and Deposit Options

Personal chef requests share the service-request model and workflow, so they should use the same deposit architecture as catering while retaining a distinct payment purpose/display label.

Recommended launch sequence:

1. Keep initial inquiry free of payment.
2. Let admin prepare the estimate and required deposit.
3. Start with a provider-hosted internal/testable deposit link if guest access is needed.
4. Confirm payment server-side or by verified webhook.
5. Keep the existing manual deposit-paid action as a controlled fallback.

The client must define whether travel, groceries, rentals, gratuity, and final balance are included in the quoted provider charge or handled separately.

## 9. Likely Database Changes

An additive MySQL/MariaDB migration is recommended before live online payments. The existing summary fields should remain for compatibility and fast display, but should not be the only payment history.

### Proposed `Payment` record

- `id`
- `provider` (`SQUARE`, later `PAYPAL`, and optionally `MANUAL`)
- `purpose` (`ORDER_TOTAL`, `SERVICE_DEPOSIT`, `SERVICE_BALANCE`)
- `orderId` nullable relation
- `cateringRequestId` nullable relation
- `amount` as `Decimal(10, 2)`
- `currency` such as `USD`
- normalized `status`
- unique nullable `providerPaymentId`
- nullable `providerOrderId`
- unique `idempotencyKey`
- sanitized failure code/message
- `createdAt`, `updatedAt`, `authorizedAt`, `paidAt`, `cancelledAt`, and `refundedAt` as applicable

Enforce that a payment targets exactly one app entity in application validation and transactions if the database cannot express the constraint cleanly.

### Proposed `PaymentWebhookEvent` record

- `id`
- `provider`
- unique provider event ID
- event type
- received and processed timestamps
- processing status and sanitized error summary
- payload hash and only the minimal retained payload needed for support/replay

Add a separate refund record if partial or multiple refunds are required. Keep `Order.paymentProvider`, `Order.paymentStatus`, `Order.paidAt`, and `CateringRequest.depositPaidAt` as transactionally maintained summaries during migration.

## 10. Webhook Strategy

Implement one provider-specific POST endpoint per provider. Each endpoint must:

1. Read the original request body in the format required by the provider.
2. Verify the signature before trusting or logging business data.
3. Reject invalid signatures without revealing secrets.
4. Store the unique provider event ID before applying a transition.
5. Treat duplicate delivery as success without repeating side effects.
6. Match the expected merchant/location, currency, trusted amount, and app target.
7. Handle events that arrive late or out of order.
8. Apply payment state, order summary, audit history, and email decisions in a transaction where possible.
9. Return a successful status only after the event is durably recorded or safely queued.
10. Provide an admin reconciliation task for events that cannot be applied automatically.

Square signatures use the subscription signature key, notification URL, and raw body. PayPal supports cryptographic verification or verification through its API using the configured webhook ID and transmission headers. Follow the current official provider instructions during implementation rather than copying a signature algorithm into this planning document.

Subscribe only to payment, refund, dispute, and other events the app actually handles. Avoid a blanket event subscription in production.

## 11. CSP and Security Header Work

The current CSP in `next.config.ts` is intentionally minimal and does not yet declare `script-src`, `connect-src`, or `frame-src`. It also sets `Permissions-Policy: payment=()`.

The provider implementation must include a dedicated security-header pass:

- Require HTTPS and secure contexts.
- Add exact Square sandbox origins during sandbox QA and exact production origins at rollout. Square currently documents separate Web Payments SDK origins and requires an appropriate CSP.
- Add PayPal JavaScript SDK, frame, and API/browser origins only when PayPal is implemented.
- Separate sandbox and production policies so sandbox hosts are not left enabled in production.
- Prefer nonces and exact hosts over wildcards; do not broadly add `unsafe-eval`.
- Revisit `payment=()` only if an explicitly selected wallet or browser Payment Request method requires it. Do not loosen it merely for basic card fields.
- Test `script-src`, `frame-src`, `connect-src`, `img-src`, `style-src`, and any provider reporting endpoint in real browsers with the exact selected methods.
- Keep all access tokens, client secrets, and webhook secrets server-only.

No card number, security code, raw payment token, access token, or full webhook payload should be written to application logs, email, audit metadata, or Prisma records.

## 12. Sandbox Test Plan

### Foundation

- Use a dedicated Square sandbox application, sandbox location, and test credentials.
- Keep online payment hidden behind a server-controlled feature flag until the full sandbox suite passes.
- Use internal test users and provider test cards only.
- Verify CSP and secure-context behavior in Chrome, Firefox, Safari/WebKit, and mobile-sized layouts.

### Regular and weekly orders

- Guest pickup and delivery payment success.
- Logged-in pickup and delivery payment success.
- Weekly plan with slot options and multiple upcharges.
- Weekly Friday late-fee amount before close.
- Rejection after the weekly close window.
- Approval-required weekly package according to the client-approved capture policy.
- Declined card, tokenization failure, provider timeout, server timeout, and retry.
- Double-click, refresh, back navigation, and repeated payment POST do not duplicate orders, capacity, charges, emails, or audit events.
- Amount tampering and provider ID substitution are rejected.
- A valid webhook reconciles payment; invalid signature and duplicate event do not mutate state.
- Guest success never exposes a protected order link; account ownership remains enforced.

### Service deposits

- Catering deposit success, failure, duplicate event, manual fallback, and refund.
- Personal chef deposit success, failure, duplicate event, manual fallback, and refund.
- Guest deposit access follows the selected hosted-link or future token design without exposing account pages.

### Operations

- Admin can see provider, normalized status, amount, timestamps, and sanitized failure information.
- Manual mark-paid remains available with an explicit audit source.
- Payment received emails send once.
- Reconciliation identifies a provider payment whose webhook was missed.
- Refund and dispute cases do not silently change fulfillment status.

## 13. Production Rollout Checklist

1. Obtain written answers to the client decisions in Section 16.
2. Implement Square behind a disabled feature flag on a dedicated branch.
3. Add and deploy the additive payment migration with `npx prisma migrate deploy`.
4. Configure production Square credentials in Hostinger; do not place secrets in `NEXT_PUBLIC_*` variables.
5. Register the exact HTTPS webhook URL and store its signature key.
6. Apply and verify the production CSP for the selected Square methods.
7. Run the full sandbox suite and an internal staging/rehearsal pass.
8. Deploy with manual payment still available and online payment disabled.
9. Run a low-value controlled production payment and refund using an internal order.
10. Verify Square Dashboard, app payment record, order summary, audit log, email, and admin reporting agree.
11. Enable Square for a limited internal window, then for customers after owner approval.
12. Monitor payment failures, webhook delivery, duplicate events, abandoned pending orders, and weekly capacity.
13. Add PayPal only after Square operations are stable and PayPal demand is confirmed.

## 14. Rollback Plan

- Disable online payment through the server-controlled feature flag without removing manual invoice/cash options.
- Keep webhook endpoints deployed and signature verification active long enough to reconcile already-started payments.
- Do not delete payment records or roll back a migration that contains financial history.
- Reconcile provider transactions created during the incident against app orders and resolve differences manually with audit notes.
- Prevent new payment attempts while allowing admin read access and manual mark-paid recovery.
- Send customer communication only after confirming whether each provider transaction completed, failed, or needs refund.
- Fix forward with an additive migration if the payment schema needs correction.

## 15. Implementation Phases

### Phase 1: policy and data foundation

- Resolve client decisions.
- Add payment/provider environment validation and feature flags.
- Add the payment ledger, webhook event ledger, normalized states, and shared payment-state service.
- Preserve manual payment behavior and summary fields.

### Phase 2: Square regular and weekly orders

- Add Square's tokenized browser component.
- Add server payment creation, idempotency, and webhook reconciliation.
- Integrate guest and logged-in thank-you behavior.
- Complete admin, email, reporting, CSP, sandbox, and production controls.

### Phase 3: catering and personal chef deposits

- Square Sandbox hosted deposit links are implemented for approved catering and
  personal-chef requests. They use the existing trusted quote/deposit amount,
  ledger idempotency, two-hour expiration, branded email, and verified webhook
  reconciliation.
- Square Sandbox hosted final-balance links are implemented after deposit
  payment. The remaining amount is calculated from trusted quote and deposit
  cents, recorded as a separate `SERVICE_FINAL_BALANCE` ledger attempt, and
  reconciled through the same verified webhook route. This uses Checkout API
  payment links, not Square invoices.
- Add embedded deposit payment only after access and token-expiry design is approved.
- Consider Square invoices only if later operations require invoice-specific
  delivery, reminders, or reporting.
- Sandbox cleanup can delete a hosted link before its local ledger row expires.
  The admin service detail validates active service-payment link IDs, expires
  confirmed Square `NOT_FOUND` attempts without deleting history, and enables a
  replacement deposit or final-balance request.
- Admin service-request lists and details derive a separate payment phase from
  existing deposit and ledger state. `Paid in Full` never auto-transitions the
  operational request status to `COMPLETED`.

### Phase 4: PayPal

- Confirm customer demand and accepted methods.
- Implement a PayPal adapter against the same app payment service and ledger.
- Repeat provider-specific CSP, webhook, sandbox, production, and rollback validation.

## 16. Confirmed Decisions And Remaining Production Questions

Confirmed:

- Square first; PayPal later.
- Standard pickup, delivery, and non-approval weekly orders charge immediately.
- Approval-required weekly packages and all catering/personal-chef requests are
  approval-first.
- Taxes are included in listed prices; tips are charged as part of the final
  standard-order total.
- Pending standard-payment holds and guest retry-token scaffolding expire after
  two hours.
- Catering/personal-chef deposits are 50%; final balance is requested
  separately after deposit payment.
- Square is the official receipt source.
- Full standard-order refunds are admin-only within 24 hours and are blocked
  once preparation/service work starts.
- The owner owns reconciliation, supported by the admin ledger view.

Remaining production questions:

1. Which production wallets/methods will be enabled at launch after domain and
   CSP verification?
2. Who monitors failed webhooks, disputes, job runs, and provider alerts day to
   day?
3. What customer fallback is approved during a provider outage?
4. Is secure guest retry redemption required for launch?
5. What exact state defines “service work started” for service-payment refund
   eligibility?

## 17. Recommended Next Pass

Keep production Square disabled. The next payment pass should resolve only the
remaining production launch gates: production credentials and locations,
production CSP and wallet-domain registration, exact production webhook URL,
scheduled expiration-job monitoring, operational reconciliation ownership, and
a controlled low-value live payment/refund rehearsal with an approved rollback
window. PayPal, ACH, partial refunds, public retry redemption, and service
refunds remain separate later scopes.

## Implemented: admin Square Sandbox full-refund foundation

The admin order detail now supports full refunds of eligible paid standard
Square Sandbox payments. The workflow validates the 24-hour/preparation policy
on the server, creates a durable child refund ledger row, calls the Square
Refunds API with a durable idempotency key, reconciles `refund.created` and
`refund.updated` webhooks, and sends the branded confirmation once when the
refund first transitions to completed.

Service deposit/final-balance controls intentionally remain disabled pending an
explicit definition of when service work has started. Remaining roadmap work
includes production activation, production CSP review, partial-refund business
rules, customer request intake (not customer execution), and operational
recovery tooling for ambiguous provider timeouts.
