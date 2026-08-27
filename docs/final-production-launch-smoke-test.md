# Final Production Launch Smoke Test

Date updated: August 27, 2026

Site: `https://rahstwistedkitchen.com`

## Result

**Launch readiness: payment and service-request evidence passed; real catalog
content approval remains.**

The production application and authenticated admin surfaces are reachable.
Square production delivery checkout has now been exercised with a real `$2.00`
payment and full refund. The refund was asynchronous: Square initially reported
`PENDING`, then later reported `COMPLETED`. Final ledger and admin
reconciliation are aligned with no mismatch.

## Customer flows

| Flow | Result | Evidence |
| --- | --- | --- |
| Home | Pass | The public home route returned successfully over HTTPS. |
| Menu and cart | Technical evidence passed; current content blocked | Earlier QA proved cart and trusted checkout totals. The current public menu correctly shows `Menu coming soon`; no real standard catalog is available for launch. See [Production Content and Admin Data Readiness](production-content-admin-data-readiness.md). |
| Guest pickup checkout | Preflight pass | Production card fields and pickup checkout rendered; retain any separately required owner rehearsal evidence. |
| Guest delivery checkout | Pass | Preflight passed, then the owner completed a real `$2.00` Square production delivery payment and full refund. See [Production Delivery Checkout Smoke Test](production-delivery-checkout-smoke-test.md). |
| Weekly meal-plan checkout | Technical preflight pass; content blocked | Earlier preflight passed Breakfast eligibility, required selections, allergens, the `$0.50` upcharge, trusted totals, production `Pay with Card`, and approval-first `Submit for Approval`. The corrected package/offering names now exist, but the only weekly period is Draft, uses `$1.00` QA prices/test dates, and is already at capacity. See [Production Content and Admin Data Readiness](production-content-admin-data-readiness.md). |
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

1. Enter, approve, and publish the real standard menu and a current weekly menu intended for customer purchase.
2. Confirm production delivery/late-fee values and align the public `$10` late-fee copy with the configured value.
3. Re-run final cart/checkout preflight with the approved content before publication.

Delivery payment/refund evidence is complete and is no longer a launch blocker.
Production catering and personal-chef submission/admin/email evidence is also
complete and is no longer a launch blocker.

## Launch-hold state

Square production payments remain intentionally enabled. The site is held from
general purchasing by unpublishing or removing menu and weekly content until
the owner approves the real catalog. This avoids Hostinger rebuilds caused by
environment-variable changes while preserving the tested production payment
configuration. Follow the
[Launch-Hold Order Availability Runbook](launch-hold-order-availability-runbook.md),
including its separate review of active/pending hosted payment links.

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

The August 27 production data review confirmed the earlier spelling/name issues
are corrected (`5 day / 15 meals`, `Biscuits and Gravy`, and `Pizza`). Content
approval is still blocked because the period remains Draft with QA dates,
`$1.00` prices, and full QA capacity; the real standard catalog is also absent.
See [Production Content and Admin Data Readiness](production-content-admin-data-readiness.md).

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
