# Final Production Launch Smoke Test

Date updated: August 12, 2026

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
| Weekly meal-plan checkout | Ready after owner price confirmation | The by-request name is corrected to `5 day / 15 meals`, offering names are corrected, and both workflows passed again. The retained `$1.00` price still needs owner confirmation and explicit payment authorization. No payment was run. See [Weekly Content Correction Verification](weekly-content-correction-verification.md). |
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

1. Confirm that the retained `$1.00` weekly price is intentional for the test,
   then explicitly approve one controlled real-money standard weekly payment.
2. Record controlled production Resend delivery evidence for order submission
   and the applicable approval/denial flow.
3. Submit internal catering and personal-chef requests during an approved
   production QA window, then verify admin detail and email delivery.
4. Confirm the final Square production gate state is explicitly owner-approved.
5. Retain any separately required pickup checkout rehearsal evidence.

Delivery payment/refund evidence is complete and is no longer a launch blocker.

## Weekly admin slot selector follow-up

Weekly package slot labels are admin-configured and continue to display from
the saved package configuration. The package editor now controls slot-label
state in React, so changing a slot to or from Breakfast immediately recomputes
its offering eligibility preview without a browser refresh. Preview choices are
clearly labeled `Breakfast` or `Standard`.

The preview mirrors existing validation: Breakfast-only offerings are excluded
from non-Breakfast slots, while Standard offerings remain eligible in Breakfast
slots and are explicitly labeled. The preview does not persist a per-slot
offering assignment. No customer checkout, payment, Square, refund, webhook, or
production-gate behavior changed.

The August 12 production recheck confirmed that this behavior is deployed: both
slot-type changes updated immediately, stale previews cleared, and reducing the
meal count removed obsolete preview state. After the owner published the weekly
menu, customer selections, Breakfast eligibility, cart totals, production card
readiness, and by-request approval-first checkout all passed preflight. No real
payment was run.

The final content preflight confirmed the payment workflows again but did not
clear content approval: `5 day/` remains incomplete, both `$1.00` package
prices are unconfirmed, and `Bisquets and gravy` / `pizza` require spelling or
capitalization review. See
[Weekly Content Final Preflight](weekly-content-final-preflight.md).

The follow-up correction verification confirmed that `5 day / 15 meals` now
matches its 5×3 configuration and the visible offerings are corrected to
`Biscuits and Gravy`, `Pizza`, and `Eggs and Bacon`. Both preflight branches
passed. Only owner confirmation of the retained `$1.00` test price and explicit
payment authorization remain before the controlled weekly payment. See
[Weekly Content Correction Verification](weekly-content-correction-verification.md).
