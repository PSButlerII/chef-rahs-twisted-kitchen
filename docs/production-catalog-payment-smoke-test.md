# Production Catalog and Payment Smoke Test

## Test record

- Date/time: August 6, 2026, America/New_York
- Tester/operator: Codex performed read-only/pre-payment QA; real-money steps
  require the owner as manual operator.
- Production URL: `https://rahstwistedkitchen.com`
- Test catalog item: `basic test item`
- Expected item price: `$1.00`
- Delivery fee setting: `$0.00`
- Production gate starting state: **ON** (`production`, payment actions enabled)

No production environment variable was changed during this branch. No card
details were entered, no order was submitted, and no Square payment, refund, or
payment-link API was called by Codex.

## Catalog/cart smoke test with gate OFF

Status: **Not run — owner environment change required.**

The live gate was already ON when QA began. Codex did not change the production
environment or redeploy. The required owner-operated sequence remains:

1. Set `SQUARE_PRODUCTION_PAYMENTS_ENABLED=false` in the production host.
2. Deploy/restart production.
3. Confirm the menu and `$1.00` item load and can be added to the cart.
4. Confirm pickup checkout is reachable, payment is generically unavailable,
   no Sandbox wording or manual/offline payment appears, and no payment is
   attempted.

Safe catalog evidence collected independently of the gate:

- The live menu rendered one `$1.00` à-la-carte item.
- Add to Order succeeded and the cart stored quantity one and `$1.00` subtotal.
- Checkout accepted delivery and pickup mode changes.
- The live settings endpoint reported delivery fee `$0.00` and manual checkout
  disabled.
- The cart page incorrectly displayed a hardcoded `$10.00` delivery fee and
  `$11.00` estimated total. Checkout correctly recalculated both delivery and
  pickup to `$1.00`. This branch fixes only the cart display by using the
  existing public business-settings hook.

Gate-OFF pass/fail: **Not run.** Deploy the cart display fix before repeating
this step.

## Controlled $1 pickup payment/refund test with gate ON

### Readiness and checkout preflight

Status: **Pass (pre-payment only).**

- `SQUARE_ENVIRONMENT=production` was reported by public/admin diagnostics.
- `SQUARE_CSP_MODE=production` was reported by admin diagnostics.
- Production gate: Enabled.
- Production payment actions: Unblocked.
- No missing-variable warning appeared and no secret value was displayed.
- Pickup checkout showed the `$1.00` item, `$0.00` tip, `$0.00` delivery fee,
  and `$1.00` total.
- Production Square card fields rendered.
- Customer action said `Pay with Card`.
- No Sandbox or manual/offline payment wording appeared in current checkout.

### Owner-operated payment

Status: **Not run.** Codex did not enter card data or press the payment action.

The owner must manually create exactly one pickup order and record sanitized
evidence for:

- `$1.00` charged, thank-you page displayed, and admin order created;
- `PaymentAttempt` metadata contains `environment=production`;
- provider payment ID present, provider status `COMPLETED`, website status
  `PAID`, and `paidAt` populated;
- verified Square webhook returned HTTP 200;
- reconciliation reports no mismatch; and
- order/payment email delivery evidence.

Test amount charged in this branch: **$0.00**.

## Controlled refund

Status: **Not run — no new payment was created.**

After the owner completes the payment, refund that same `$1.00` order manually
with reason `Production launch smoke test refund`. Confirm the admin action says
`Square refund`, requires a reason and confirmation, creates one child refund
attempt linked by `parentPaymentId`, marks the original payment and order
refunded, populates `refundedAt`, receives HTTP 200 for the verified webhook,
has no reconciliation mismatch, sends the intended refund email, and blocks a
duplicate refund.

## Optional delivery checkout test

Status: **UI preflight only; no payment.**

Delivery mode rendered the same `$1.00` item with delivery fee `$0.00`, no tip,
and total `$1.00`. No real delivery order or payment was submitted because the
attachment requires explicit approval for that action.

## Email evidence

- No new production email was triggered during this branch.
- Previous production rehearsal data confirms payment/refund state transitions,
  while existing Sandbox/dry-run QA documents cover order and refund email
  triggers.
- New production order, payment, and refund inbox/provider-delivery evidence
  remains required from the owner-operated test.

## Admin reconciliation evidence

- Readiness showed production CSP and environment, gate enabled, and actions
  unblocked.
- Existing production rehearsal payment/refund rows reported provider status
  `COMPLETED`, website paid/refunded states, and no mismatch.
- New smoke-test reconciliation evidence was not created because no payment or
  refund was performed.

## Gate rollback and final state

Final observed gate state: **ON**. Codex did not change it.

Unless the owner explicitly approves leaving production payments enabled:

1. Set `SQUARE_PRODUCTION_PAYMENTS_ENABLED=false` in the production host.
2. Deploy/restart.
3. Confirm customer checkout is generically unavailable, admin readiness is
   blocked only by the gate, and the verified webhook route remains reachable.

## Issues found

1. Fixed a cart display defect that hardcoded `$10.00` delivery fee instead of
   using the current `$0.00` business setting. Server totals and checkout were
   already correct; no payment calculation or provider behavior changed.
2. The live deployment still displayed one historical pre-fix Sandbox note in
   old order history. Current source already normalizes that display; deployment
   of the latest `main` changes and live recheck remain pending.

## Pass/fail and remaining blockers

Overall result: **Partial / owner action required.**

- Catalog publication: Pass.
- Add-to-cart: Pass.
- Cart total: Fail on live deployment; display-only fix committed here.
- Gate-OFF safety sequence: Not run.
- Gate-ON readiness and checkout UI: Pass.
- Real pickup payment/refund: Not run.
- Webhook/email/new reconciliation evidence: Not run.
- Optional delivery payment: Not run.

Remaining blockers:

1. Deploy this branch and verify cart total `$1.00` with the `$0.00` fee.
2. Owner runs and records the gate-OFF sequence.
3. Owner manually performs exactly one approved `$1.00` pickup payment/refund
   and records webhook, reconciliation, ledger, and email evidence.
4. Owner explicitly chooses and verifies the final production gate state.
5. Weekly checkout remains out of scope until a real weekly package/offering is
   published and separately approved.

## Repository validation

- `npm audit`: pass, zero vulnerabilities.
- `npm audit --omit=dev`: pass, zero vulnerabilities.
- `npx prisma validate`: pass.
- `npm run prisma:generate`: pass.
- `npm run check`: pass.
- `npm run build`: pass.
- `npx tsc --noEmit --pretty false`: pass.
- `npx prisma migrate status`: pass, database schema up to date.
- `git diff --check`: pass.
