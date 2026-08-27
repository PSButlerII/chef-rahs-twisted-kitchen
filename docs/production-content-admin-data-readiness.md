# Production Content and Admin Data Readiness

Date/time: August 27, 2026, approximately 10:00 AM America/New_York

Tester/operator: Codex QA using the owner-authenticated production admin session and read-only production database queries

Production URL: `https://rahstwistedkitchen.com`

## Result

**Launch-hold control: PASS. Opening customer ordering: BLOCKED.**

The production payment configuration remains intentionally enabled (`SQUARE_ENVIRONMENT=production`, production CSP mode, and `SQUARE_PRODUCTION_PAYMENTS_ENABLED=true`). The public menu correctly shows `Menu coming soon` and exposes no purchasable standard or weekly item. This is the intended launch-hold state.

Customer ordering must not be opened yet. The real standard catalog has not been entered/approved, and the only weekly period remains Draft with QA prices and QA capacity usage.

## Readiness summary

| Area | Result | Evidence |
| --- | --- | --- |
| Current production gate state | Enabled intentionally | Production environment, CSP mode, and payment-creation gate are configured for production. No gate value was changed. |
| Launch-hold state | Pass | Public `/menu` shows no available content. Admin shows no active standard item and one Draft weekly period. |
| Standard menu content | Blocked | `Meal Plans` and `A La Carte` categories exist. The only stored item is an archived, unavailable `$1.00` test item; admin shows no active menu items. No QA item is publicly purchasable. Real names, descriptions, prices, images, allergens, and options still need owner entry/approval. |
| Weekly menu content | Blocked | `weekly menu test` is Draft, dated August 26–28, at `2/2` QA capacity. Its packages are `5 day / 15 meals` and `Dinner and lunch`, both `$1.00`. Names/spelling are improved, but pricing, title casing, dates, capacity, descriptions, and final owner approval are not launch-ready. |
| Allergens/options/upcharges | Functional evidence retained; content blocked | Weekly QA data contains allergen tags and a `$0.50` Roasted chicken upcharge. The production QA order preserves 15 selections and allergen acknowledgement. Previous preflight established trusted upcharge math and persistence, but no current cart/checkout preflight was possible while content is Draft. |
| Pricing | Blocked | The only standard test item and both weekly packages are `$1.00` QA data. No evidence was found that these are owner-approved launch prices. |
| Delivery/late-fee settings | Needs owner confirmation | Delivery fee and late fee are both `$0.00`; weekend ordering is disabled; cutoff is Thursday at 5:00 PM; timezone is `America/New_York`; weekly defaults are Wednesday open, Friday 5:00 PM late-fee start, Friday 10:00 PM close, and Sunday fulfillment. The public footer still says late orders may include `$10`, which conflicts with the configured `$0` late fee. |
| Service-request content | Pass for continued lead collection | Catering and Personal Chef pages render clear copy and forms. Name and email are required; planning fields are optional. The two prior QA requests remain in the shared admin queue as evidence. Approval/denial controls render, and deposit/final-balance buttons are disabled before approval. No new request was submitted. |
| Active payment-link review | Pass with one non-link follow-up | No active pending `ORDER_TOTAL`, service-deposit, or final-balance attempt was found, and no approved unpaid order was found. Paid and completed-refund evidence remains preserved. One refund child remains provider/website `PENDING`; it is not a payable link and must not trigger another refund. |
| Mobile display | Pass for current hold/forms | At a 390 px viewport, the empty-state menu and Catering form had no horizontal overflow; the Catering submit control remained visible. |

## Standard menu review

- Categories present: `Meal Plans` and `A La Carte`.
- Active/published items: none.
- Archived evidence: one unavailable `$1.00` test item with test copy, no image, allergens, or options.
- Public result: the test item is hidden and no `Add to Order` action is exposed.
- Cart/checkout result: not runnable because there is no intentionally purchasable content.

Before launch, enter and owner-approve every real item name, description, price, image (if used), allergen tag, option/add-on, upcharge, category, availability state, and customer-facing instruction.

## Weekly menu review

The only weekly period is `weekly menu test` and remains `DRAFT`. It contains:

- `5 day / 15 meals`: 5 days × 3 meals, `$1.00`, approval-required, with `Breakfast`, `Meal 2`, and `Meal 3` slot labels.
- `Dinner and lunch`: 5 days × 2 meals, `$1.00`, standard checkout, with `Meal 1` and `Meal 2` slot labels.
- `Biscuits and Gravy`, `Pizza`, and `Eggs and Bacon` offerings.
- Breakfast-only eligibility on `Eggs and Bacon`.
- Dairy/Egg/Wheat/Gluten allergen data where configured.
- A `$0.50` Roasted chicken protein option on Pizza.

The earlier incomplete `5 day/` label and misspelled/lowercase offering names are corrected in stored data. Remaining copy review includes owner-preferred title casing (`Dinner and Lunch`, if desired), offering descriptions, final slot labels, and complete customer-ready notes. The period dates are QA dates and its capacity is already full, so it must not be published as the launch menu.

By-request behavior remains correct: the 5-day/15-meal package requires approval and must not expose Square fields before approval. The standard package would reach card checkout only after an intentionally current period is published and available.

## Allergens, options, and totals

Read-only admin/database review confirmed the configured weekly allergens and option/upcharge records. Existing production QA evidence confirms:

- required weekly selections are stored;
- matching allergen acknowledgement reaches admin order detail;
- the paid protein option adds `$0.50` using trusted server totals;
- free/no-option selections do not add a charge;
- selected weekly data persists to the order/admin workflow.

Because the catalog is correctly unavailable, this pass did not create a cart or attempt checkout. Cart estimate versus server checkout total and current email rendering must be rechecked after the real catalog is entered but before publication/go-live.

Late fees remain authoritative at checkout/server calculation. The configured fee is currently `$0.00`, despite the public `$10` footer statement.

## Business settings

- Delivery fee: `$0.00` — owner confirmation required.
- Late fee: `$0.00` — owner confirmation required and inconsistent with footer copy.
- Service-request deposit: `50%`.
- Standard cutoff: Thursday at 5:00 PM.
- Weekend ordering: disabled.
- Delivery area: Greater Atlanta area.
- Customer-selected scheduling: disabled.
- Standard fixed fulfillment: Sunday, time arranged later.
- Weekly window: Wednesday 12:00 AM through Friday 10:00 PM.
- Weekly late-fee start: Friday 5:00 PM.
- Weekly fixed fulfillment: Sunday, time arranged later.
- Business timezone: `America/New_York`.

## Service requests

Both public forms render with customer-appropriate introductory copy, contact inputs, date/time, location, requested-menu/service, allergen, and special-request fields. Name and email are required. No form was submitted in this pass.

The prior controlled Catering and Personal Chef QA requests remain in production as evidence. The admin shared queue shows both records and their detail pages. Both remain pending approval; Approve/Deny controls are available, while Send Deposit Payment Request and Send Final Payment Request are disabled. No payment link was created or cancelled.

## Active payment and link review

Read-only ledger/order grouping found:

- four paid/completed `ORDER_TOTAL` attempts;
- two refunded parent `ORDER_TOTAL` attempts;
- two completed refund children;
- one pending refund child;
- no pending order-total/service payment request;
- no approved unpaid order.

Therefore, no active customer-payable hosted link was identified. The pending refund must remain pending until Square completes or rejects it. Do not issue another refund. Paid/refunded QA rows remain production evidence and were not deleted.

## Issues found

1. The real standard catalog is absent; only an archived test item exists.
2. The weekly period is QA-only, Draft, dated for an elapsed test window, and already at capacity.
3. Both weekly packages remain at unapproved `$1.00` QA pricing.
4. Public footer late-fee copy says `$10`, while the configured late fee is `$0.00`.
5. Delivery fee is `$0.00` and requires explicit owner approval.
6. One refund child remains pending and should be monitored without issuing a duplicate refund.

## Issues fixed in this branch

Documentation was updated to reflect current production evidence. No production data or runtime behavior was changed. Previously reported spelling/name corrections (`5 day / 15 meals`, `Biscuits and Gravy`, and `Pizza`) are confirmed in the current database.

## Remaining launch blockers

1. Enter and approve the real standard-menu content and prices.
2. Create/clone a current weekly period with correct dates and capacity, then approve its package names, prices, slot labels, offerings, descriptions, allergens, and options.
3. Resolve/approve the `$0` delivery and late fees and make public policy/footer copy agree.
4. Re-run menu, mobile, cart, allergen, option/upcharge, and checkout preflight with the final content before publishing.
5. Review the pending refund to completion; do not create a second refund.
6. Obtain final owner/client authorization to publish and open customer ordering.

## Safety record

- No real payment was run.
- No order, service request, refund, or payment link was created.
- No payment link was cancelled.
- No Square provider call was made.
- No production gate or environment value was changed.
- No QA evidence was deleted.
- No credentials are recorded here.

