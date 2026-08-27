# Final Production Launch Smoke Test

Date updated: August 27, 2026

Site: `https://rahstwistedkitchen.com`

## Result

**Launch readiness: service-request evidence passed; final payment-gate decision
remains.**

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
| Weekly meal-plan checkout | Technical preflight pass; content blocked | The final content preflight again passed Breakfast eligibility, required selections, allergens, the `$0.50` upcharge, trusted totals, production `Pay with Card`, and approval-first `Submit for Approval`. Content is not launch-final: `5 day/` is incomplete, `$1.00` prices are unconfirmed, and offering copy needs review. See [Weekly Content Final Preflight](weekly-content-final-preflight.md). |
| Catering request | Pass | A clearly marked production QA request submitted successfully, reached the thank-you page, appeared accurately in the admin queue/detail, and delivered its customer confirmation email. See [Service Request Production Submission Evidence](service-request-production-submission-evidence.md). |
| Personal-chef request | Pass | A clearly marked production QA request submitted successfully, reached the thank-you page, appeared accurately in the admin queue/detail, and delivered its customer confirmation email. See [Service Request Production Submission Evidence](service-request-production-submission-evidence.md). |

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
| Catering/personal-chef admin | Pass | Both production QA records appeared with correct type, event, status, approval, and submitted-date labels. Type filters and detail pages worked; approval controls rendered; payment controls remained disabled before approval. |

## Email evidence

Production service-request routes sent branded customer confirmation emails
with the expected catering and personal-chef subjects, and the owner confirmed
receipt of both messages on August 27, 2026. The routes do not implement a
separate admin notification email.

## Safety and security

- No credentials are recorded in this document.
- Manual/offline customer checkout remains unavailable in production.
- A pending refund is not permission to create another provider refund.
- Verified webhooks and read-only provider status reconciliation must remain
  available during payment-creation rollback.

## Remaining launch blockers

1. Confirm the final Square production gate state is explicitly owner-approved.

Delivery payment/refund evidence is complete and is no longer a launch blocker.
Production catering and personal-chef submission/admin/email evidence is also
complete and is no longer a launch blocker.

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

## Approval-required weekly payment follow-up

The missing post-approval collection path is implemented. Admin order detail
now sends or resends a guarded two-hour Square-hosted order-total request;
authenticated customer order detail shows the active Pay Now link, and guest
customers receive the direct hosted link by email. A safe environment must
still verify approval, request creation/reuse, email delivery, expiration, and
webhook-paid reconciliation before this workflow is marked production-passed.
The hosted checkout item now uses the trusted saved weekly package name instead
of exposing a generic `Order <id>` label. The full order ID remains in the
payment ledger and Square payment note for reconciliation.
Do not create another QA order solely to recover an existing approved unpaid
order: after deployment, admin may send its payment request from that order's
detail page, or the owner may cancel it as QA data.
