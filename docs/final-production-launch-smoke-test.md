# Final Production Launch Smoke Test

Date: August 6, 2026

Site: `https://rahstwistedkitchen.com`

Branch: `qa/final-production-launch-smoke-test`

## Result

**Launch readiness: partially unblocked; owner payment QA remains.** The
production application and authenticated admin surfaces are reachable, Square
is configured for production with payment actions unblocked, and the security
checks are clean. A `$1.00` à-la-carte item is now published and reaches pickup
and delivery checkout with production card fields. The controlled real-money
payment/refund and final gate rollback still require the owner.

No payment, refund, hosted payment link, or live provider call was made during
this smoke test. No production service-request form was submitted.

## Customer flows

| Flow                      | Result         | Evidence                                                                                                                                                                                                                                                                                                    |
| ------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                      | Pass           | `/` returned HTTP 200 over HTTPS and rendered the primary navigation and service paths.                                                                                                                                                                                                                     |
| Menu                      | Pass           | `/menu` rendered one `$1.00` a-la-carte item. No weekly package is published.                                                                                                                                                                                                                               |
| Cart                      | Fix pending    | Add/update/remove and `$1.00` subtotal worked. Live cart displayed a stale hardcoded `$10.00` fee; this branch switches the display to live business settings.                                                                                                                                              |
| Guest pickup checkout     | Preflight pass | Pickup rendered the item, `$0.00` delivery fee/tip, `$1.00` total, production card fields, and `Pay with Card`; no order/payment was submitted.                                                                                                                                                             |
| Guest delivery checkout   | Preflight pass | Delivery rendered required contact/address fields, enforced missing-contact validation, loaded production card fields, and showed a `$1.00` total with `$0.00` delivery fee/tip. No order/payment was submitted; see [Production Delivery Checkout Smoke Test](production-delivery-checkout-smoke-test.md). |
| Weekly meal-plan checkout | Blocked        | No active weekly package or offering is published.                                                                                                                                                                                                                                                          |
| Catering request          | Partial        | The live form, required fields, scheduling controls, and submit control rendered. Submission was not performed because it would create a production request and send customer/admin email.                                                                                                                  |
| Personal-chef request     | Partial        | The live form, required fields, scheduling controls, and submit control rendered. Submission was not performed for the same production-side-effect reason.                                                                                                                                                  |

## Admin flows

| Flow                        | Result       | Evidence                                                                                                                                                                                                            |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin authentication        | Pass         | The authenticated production session reached `/admin`; unauthenticated navigation initially exposed only Sign In. No credentials were handled during QA.                                                            |
| Orders list                 | Pass         | `/admin/orders` rendered filters and the production rehearsal orders.                                                                                                                                               |
| Order detail                | Pass         | A rehearsal order detail rendered customer, fulfillment, totals, history, and payment-ledger sections.                                                                                                              |
| Payments/reconciliation     | Pass         | `/admin/payments` showed aligned paid/refunded rehearsal rows with no mismatch warning.                                                                                                                             |
| Catering/personal-chef list | Pass         | `/admin/catering` rendered both request-type filters. Detail pages could not be tested because the production list contains no service requests.                                                                    |
| Refund controls/copy        | Partial pass | Current production copy says Square and describes full refunds through Square. Existing rehearsal rows are already refunded or outside an actionable state, so an enabled “Square refund” button was not exercised. |
| Readiness diagnostics       | Pass         | Environment `production`; CSP mode `production`; production gate `Enabled`; payment actions `Unblocked`; no secret values displayed.                                                                                |

## Production payment display

- The public Square configuration reports `environment: production` and
  `enabled: true`.
- Admin readiness and reconciliation use “Square,” not “Square Sandbox.”
- Customer `Pay with Card` and production Square card fields were visually
  confirmed for pickup and delivery checkout. No card data was entered.
- One rehearsal order contained a persisted pre-fix history note with legacy
  “Square sandbox payment” wording. This branch adds a display-only formatter
  so historical notes render as “Square payment” without changing stored data,
  payment state, or provider behavior. Deployment and live recheck are pending.

## Email evidence

- Production order-submitted and approval/denial delivery were not retriggered;
  sending a real order would create production payment and email side effects.
- Prior repository QA documents successful rendering/triggers for order
  submission, approval, payment-received, service-request, and refund email
  paths in protected dry-run/Sandbox testing.
- The controlled production rehearsal proves completed payment/refund ledger
  transitions, but the current rehearsal report does not contain completed
  inbox/provider-delivery evidence. Final Resend delivery confirmation remains
  a launch blocker unless it is recorded elsewhere by the owner.

## Safety and security

- `/dev/email-preview` returns HTTP 404 in production.
- `/api/business-settings` reports `manualPaymentCheckoutAllowed: false`.
- Square production payment actions are currently unblocked. Confirm that this
  is the owner-approved launch state; otherwise set the gate false and redeploy.
- GitHub reports zero open Dependabot alerts after the default-branch rescan.
- `npm audit` and `npm audit --omit=dev` report zero vulnerabilities.
- No credentials were read, displayed, changed, or committed.

## Issues and launch blockers

August 11 refund reconciliation update: an owner-run `$2.00` delivery refund
completed in Square and both refund webhooks returned HTTP 200, but the matched
local refund ledger row stayed pending. The app-side terminal transition and
authoritative refund-status reconciliation are fixed on
`fix/square-refund-completion-reconciliation`. After deployment, the first
production operation must be the guarded recovery/backfill for the existing
refund, not another charge or refund. No duplicate refund should be issued.

1. Deploy and verify the cart display fix documented in
   [Production Catalog and Payment Smoke Test](production-catalog-payment-smoke-test.md).
2. Complete the owner-operated gate-OFF and `$1.00` pickup payment/refund test,
   including webhook, reconciliation, ledger, and email evidence.
3. Complete the owner-operated `$1.00` delivery payment/refund test and record
   delivery-specific webhook, reconciliation, ledger, and email evidence.
4. Publish and test a weekly package/offering before enabling weekly ordering.
5. Confirm the currently enabled Square production gate is explicitly approved
   for launch; disable it if approval is not current.
6. Record a controlled production Resend delivery check for order submission
   and the applicable approval/denial path.
7. Submit internal catering and personal-chef requests only during an approved
   production QA window, then verify their admin detail and email delivery.
8. Deploy current source and confirm legacy history notes no longer display
   Sandbox wording.

## Validation

August 7 follow-up: delivery preflight passed, but current repository validation
now reports a development-only high-severity `js-yaml@4.3.0` audit advisory and
the configured validation database returns a Prisma schema-engine error. See
[Production Delivery Checkout Smoke Test](production-delivery-checkout-smoke-test.md)
for current results. The original August 6 results below are retained as the
record of that run.

- `npm audit`: pass, zero vulnerabilities.
- `npm audit --omit=dev`: pass, zero vulnerabilities.
- `npx prisma validate`: pass.
- `npm run prisma:generate`: pass.
- `npm run check`: pass.
- `npm run build`: pass.
- `npx tsc --noEmit --pretty false`: pass.
- `npx prisma migrate status`: pass, schema up to date.
- `git diff --check`: pass.
