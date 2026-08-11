# Final Production Launch Smoke Test

Date updated: August 11, 2026

Site: `https://rahstwistedkitchen.com`

## Result

**Launch readiness: partially unblocked; delivery payment/refund passed.**

The production application and authenticated admin surfaces are reachable.
Square production delivery checkout has now been exercised with a real `$2.00`
payment and full refund. The refund was asynchronous: Square initially reported
`PENDING`, then later reported `COMPLETED`. Final ledger and admin
reconciliation are aligned with no mismatch.

## Customer flows

| Flow | Result | Evidence |
| --- | --- | --- |
| Home | Pass | The public home route returned successfully over HTTPS. |
| Menu and cart | Pass | Published catalog content reached cart and checkout with server-authoritative totals. |
| Guest pickup checkout | Preflight pass | Production card fields and pickup checkout rendered; retain any separately required owner rehearsal evidence. |
| Guest delivery checkout | Pass | Preflight passed, then the owner completed a real `$2.00` Square production delivery payment and full refund. See [Production Delivery Checkout Smoke Test](production-delivery-checkout-smoke-test.md). |
| Weekly meal-plan checkout | Blocked | No active weekly package/offering was available for a complete production checkout test. |
| Catering request | Partial | Form availability was verified, but a production request was not submitted. |
| Personal-chef request | Partial | Form availability was verified, but a production request was not submitted. |

## Delivery payment and refund evidence

- Delivery order: `cmsor3yxz0000rv3plvm7j5gi`
- Payment amount: `$2.00` / 200 cents
- Square production payment: `COMPLETED`
- Initial Square refund state: `PENDING`
- Later Square refund state: `COMPLETED`
- Parent ledger state: `REFUNDED`
- Refund-child ledger state: `REFUNDED`
- Admin Square state: `COMPLETED`
- Admin reconciliation: `No mismatch detected`
- Duplicate refund: none issued
- Recovery apply: not required

The application correctly treated the initial pending refund as nonterminal.
Admins must wait for Square completion before treating a refund as final and
must never issue a second refund solely because provider completion is delayed.

## Admin flows

| Flow | Result | Evidence |
| --- | --- | --- |
| Admin authentication | Pass | Authenticated admin pages were reachable; unauthenticated access remained protected. |
| Orders and order detail | Pass | The production order and payment ledger details rendered. |
| Payments and reconciliation | Pass | The completed delivery refund shows ledger `REFUNDED`, Square `COMPLETED`, populated refund timestamps, and no mismatch. |
| Refund controls | Pass | The owner exercised one full production refund. No duplicate refund was issued. |
| Catering/personal-chef admin | Partial | Lists rendered, but production service-request submissions remain outstanding. |

## Email evidence

The completed payment/refund lifecycle does not by itself prove production
Resend inbox/provider delivery. A controlled production Resend delivery check
for order submission and applicable approval/denial messages remains required.

## Safety and security

- No credentials are recorded in this document.
- Manual/offline customer checkout remains unavailable in production.
- A pending refund is not permission to create another provider refund.
- Verified webhooks and read-only provider status reconciliation must remain
  available during payment-creation rollback.

## Remaining launch blockers

1. Publish and test a weekly package/offering before enabling weekly ordering.
2. Record controlled production Resend delivery evidence for order submission
   and the applicable approval/denial flow.
3. Submit internal catering and personal-chef requests during an approved
   production QA window, then verify admin detail and email delivery.
4. Confirm the final Square production gate state is explicitly owner-approved.
5. Retain any separately required pickup checkout rehearsal evidence.

Delivery payment/refund evidence is complete and is no longer a launch blocker.
