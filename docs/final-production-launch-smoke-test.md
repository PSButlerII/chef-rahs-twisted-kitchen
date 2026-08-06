# Final Production Launch Smoke Test

Date: August 6, 2026

Site: `https://rahstwistedkitchen.com`

Branch: `qa/final-production-launch-smoke-test`

## Result

**Launch readiness: blocked.** The production application and authenticated
admin surfaces are reachable, Square is configured for production with payment
actions unblocked, and the security checks are clean. However, the live menu has
no published meal-plan or a-la-carte items. That prevents cart population and
blocks pickup, delivery, weekly-plan, and production payment-display testing.

No payment, refund, hosted payment link, or live provider call was made during
this smoke test. No production service-request form was submitted.

## Customer flows

| Flow                      | Result         | Evidence                                                                                                                                                                                   |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home                      | Pass           | `/` returned HTTP 200 over HTTPS and rendered the primary navigation and service paths.                                                                                                    |
| Menu                      | Fail / blocker | `/menu` returned HTTP 200 but displayed “Menu coming soon” with no purchasable items or weekly packages.                                                                                   |
| Cart                      | Partial        | `/cart` loaded correctly and showed the empty-cart state. Add/update/remove behavior could not be exercised without catalog items.                                                         |
| Guest pickup checkout     | Blocked        | No item can be added. `/checkout` correctly stops at “Your Cart Is Empty.”                                                                                                                 |
| Guest delivery checkout   | Blocked        | Same catalog blocker as pickup.                                                                                                                                                            |
| Weekly meal-plan checkout | Blocked        | No active weekly package or offering is published.                                                                                                                                         |
| Catering request          | Partial        | The live form, required fields, scheduling controls, and submit control rendered. Submission was not performed because it would create a production request and send customer/admin email. |
| Personal-chef request     | Partial        | The live form, required fields, scheduling controls, and submit control rendered. Submission was not performed for the same production-side-effect reason.                                 |

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
- Customer “Pay with Card” could not be visually confirmed because the empty
  catalog prevents checkout from reaching payment rendering.
- One rehearsal order contained a persisted pre-fix history note with legacy
  “Square sandbox payment” wording. This branch adds a display-only formatter
  so historical notes render as “Square payment” without changing stored data,
  payment state, or provider behavior. Deployment and live recheck are pending.

## Email evidence

- Production order-submitted and approval/denial delivery were not retriggered;
  no safe catalog order exists and sending new production email has side effects.
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
  is the owner-approved launch state before publishing menu items; otherwise
  set the gate false and redeploy.
- GitHub reports zero open Dependabot alerts after the default-branch rescan.
- `npm audit` and `npm audit --omit=dev` report zero vulnerabilities.
- No credentials were read, displayed, changed, or committed.

## Issues and launch blockers

1. **Blocking:** publish and verify at least one standard item plus the intended
   weekly package/offering before opening ordering.
2. Repeat pickup, delivery, weekly cart/checkout, and customer “Pay with Card”
   verification after catalog publication.
3. Confirm the currently enabled Square production gate is explicitly approved
   for launch; disable it if approval is not current.
4. Record a controlled production Resend delivery check for order submission
   and the applicable approval/denial path.
5. Submit internal catering and personal-chef requests only during an approved
   production QA window, then verify their admin detail and email delivery.
6. Deploy this branch and confirm legacy history notes no longer display
   Sandbox wording.

## Validation

- `npm audit`: pass, zero vulnerabilities.
- `npm audit --omit=dev`: pass, zero vulnerabilities.
- `npx prisma validate`: pass.
- `npm run prisma:generate`: pass.
- `npm run check`: pass.
- `npm run build`: pass.
- `npx tsc --noEmit --pretty false`: pass.
- `npx prisma migrate status`: pass, schema up to date.
- `git diff --check`: pass.
