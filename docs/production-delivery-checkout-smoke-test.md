# Production Delivery Checkout Smoke Test

## Test record

- Date/time: August 7, 2026, America/New_York
- Tester/operator: Codex performed pre-payment QA; the owner must manually
  perform any real-money payment and refund.
- Production URL: `https://rahstwistedkitchen.com`
- Test item: `basic test item`, `$1.00`
- Delivery fee setting: `$0.00`
- Expected total: `$1.00` with no tip
- Production gate before test: **Enabled**
- Square readiness: environment `production`, CSP mode `production`, payment
  actions unblocked

No card data was entered, no order was submitted, and no Square payment, refund,
or payment-link API was called by Codex. No production environment setting was
changed.

## Delivery checkout preflight

Status: **Pass.**

- The live menu rendered the `$1.00` item.
- Add to Order succeeded.
- The deployed cart fix was confirmed: subtotal `$1.00`, delivery fee `$0.00`,
  late fee `$0.00`, and total `$1.00`.
- Delivery was the selected checkout method.
- Contact and delivery fields rendered for name, email, phone, address lines,
  city, state, ZIP/postal code, and delivery notes.
- Clearing the required name and attempting to continue produced client-side
  validation before payment handling. No provider call was made.
- The checkout summary displayed delivery fee `$0.00`, no tip, and total
  `$1.00`.
- Production Square card fields rendered and reported ready.
- The customer action said `Pay with Card`.
- No Sandbox wording or manual/offline payment option appeared.

The item added for QA was removed from the browser cart after verification.

## Controlled delivery payment

Status: **Not run — owner action required.**

Amount charged during this branch: **$0.00**.

With the production gate intentionally enabled, the owner must manually create
one delivery order using the `$1.00` item, `$0.00` delivery fee, and `$0.00` tip.
Record sanitized evidence that:

- the real card payment succeeds and the thank-you page appears;
- admin shows a delivery order with the intended customer contact/address
  snapshots;
- `PaymentAttempt` metadata includes `environment=production`;
- `providerPaymentId` is present;
- `providerStatus=COMPLETED` and `websiteStatus=PAID`;
- `paidAt` is populated;
- the verified Square webhook receives HTTP 200;
- admin reconciliation reports no mismatch; and
- the intended order/payment email is delivered.

No new delivery payment row appeared in admin reconciliation during this QA.

## Controlled refund

August 11, 2026 update: **Provider refund completed; local recovery required.**
The owner completed a `$2.00` delivery payment and refund. Square's receipt
shows the refund completed, and the live `refund.created` and `refund.updated`
deliveries both returned HTTP 200. The local refund ledger row nevertheless
remained `PENDING`, leaving the parent payment and order out of sync.

The application-side reconciliation fix reads the documented
`data.object.refund.status` value, supports `PENDING`, `COMPLETED`, `REJECTED`,
and `FAILED`, and performs an authoritative read-only Square refund lookup when
a `refund.updated` snapshot is still pending. A guarded recovery command is
provided for the affected refund. It must be run before another payment test;
do **not** issue a second refund.

Original August 7 branch status: **Not run — no delivery payment was created
during that preflight.** The August 11 owner-run result above supersedes this
for the production refund lifecycle.

After the owner completes the payment, refund that same order with reason
`Production delivery smoke test refund`. Record sanitized evidence that:

- the action says `Square refund` and requires both reason and confirmation;
- one full `$1.00` Square refund succeeds;
- a child refund `PaymentAttempt` links to the original through
  `parentPaymentId`;
- the original payment and order show `REFUNDED` and `refundedAt` is populated;
- the verified refund webhook receives HTTP 200;
- the refund email is delivered;
- a duplicate refund is blocked before another provider request; and
- admin reconciliation reports no mismatch.

## Webhook result

August 11 update: Square returned HTTP 200 for both refund events, but the
provider snapshot was accepted without an authoritative status-recovery path
and the local completion transition did not occur. Deploy this fix and run
`npm run payment:recover-affected-refund`, review its dry-run output, then run
`npm run payment:recover-affected-refund -- --apply` on the production host.
The command retrieves the existing refund; it never creates one.

Original August 7 branch status: **Not run.** Existing production pickup
rehearsal rows were not evidence for this delivery test. The August 11
owner-run webhook result above is the current delivery-refund evidence.

## Admin reconciliation result

- Readiness diagnostics: Pass (`production`, production CSP, gate enabled,
  actions unblocked, no missing-variable warning).
- Existing rehearsal reconciliation: Pass, no mismatch.
- New delivery order/payment/refund reconciliation: Not run.

## Email evidence

No new production email was triggered. Existing dry-run/Sandbox evidence covers
email rendering and triggers, and prior pickup rehearsal evidence covers its own
payment/refund lifecycle. Delivery-specific order, payment, and refund inbox or
provider-delivery evidence remains required from the owner-operated test.

## Final production gate state

Final observed state: **Enabled**. Codex did not change it.

The owner must explicitly approve leaving production payments enabled. If that
approval is not current, set `SQUARE_PRODUCTION_PAYMENTS_ENABLED=false` in the
production host, redeploy, and verify checkout is generically unavailable while
admin readiness is blocked only by the gate and verified webhooks remain
reachable.

## Issues found

No new delivery checkout defect was found. The previously fixed cart delivery
fee display is deployed and correctly reads `$0.00` from business settings.

Validation found two non-checkout blockers:

1. `npm audit` now reports one high-severity development-only `js-yaml@4.3.0`
   advisory (`CVE-2026-59870` / `GHSA-5p4m-2wfm-xmqj`) through
   `eslint > @eslint/eslintrc > js-yaml`. The production-only audit remains
   clean. This QA branch does not change dependencies.
2. The configured local validation database returned a Prisma schema-engine
   error on repeated `migrate status`/`migrate deploy` attempts. This prevented
   `npm run check` and `npm run build` from reaching the Next build step even
   though lint, Prisma generation, route type generation, and standalone
   TypeScript passed.

## Pass/fail and remaining blockers

Overall result: **Partial — preflight passed; real-money evidence not run.**

- Delivery catalog/cart/checkout preflight: Pass.
- Required-field validation: Pass.
- Production Square display: Pass.
- Controlled `$1.00` delivery payment: Not run.
- Payment webhook and email: Not run.
- Controlled refund, refund webhook, and refund email: Not run.
- New delivery admin reconciliation: Not run.

Remaining launch blockers:

1. Owner manually completes exactly one approved `$1.00` delivery payment and
   full refund.
2. Record delivery-specific ledger metadata, webhook HTTP 200, reconciliation,
   duplicate-refund protection, and email-delivery evidence.
3. Owner confirms and verifies the final production gate state.
4. Weekly checkout remains out of scope until a real weekly package/offering is
   published and separately approved.
5. Triage/remediate the new development-only `js-yaml` audit alert.
6. Restore validation-database connectivity and rerun migration/build checks.

## Repository validation

- `npm audit`: fail, one high-severity development-only `js-yaml@4.3.0`
  advisory.
- `npm audit --omit=dev`: pass, zero vulnerabilities.
- `npx prisma validate`: pass.
- `npm run prisma:generate`: pass.
- `npm run check`: fail during prebuild `prisma migrate deploy` with a schema
  engine error; lint, generation, and type generation passed first.
- `npm run build`: fail during the same prebuild migration step before Next
  compilation.
- `npx tsc --noEmit --pretty false`: pass.
- `npx prisma migrate status`: fail, schema engine error from the configured
  validation database.
- `git diff --check`: pass.
