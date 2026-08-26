# Weekly Content Final Preflight

## Test record

- Date/time: August 12, 2026, 1:33 PM America/New_York
- Tester/operator: Codex, using the authenticated production customer session
- Production URL: `https://rahstwistedkitchen.com`
- Weekly menu: `weekly menu test`
- Weekly packages reviewed: `Dinner and lunch` and `5 day/`
- Result: **Technical preflight pass; content approval remains blocked**

No production data was changed. No order, approval request, payment, refund, or
payment link was created.

## Standard package content result

`Dinner and lunch` is complete enough to identify the package and matches its
saved configuration of 5 days and 2 meals per day. Its saved customer-facing
slot labels are `Meal 1 / Meal 2`.

The name is understandable, although title-style capitalization (`Dinner and
Lunch`) would be more consistent customer-facing copy. This is a content-review
item, not a checkout defect.

## By-request package content result

The by-request package remains named `5 day/`. This is incomplete
customer-facing copy and does not describe the saved configuration of 5 days
and 3 meals per day. The configuration itself is internally consistent:

- 5 days
- 3 meals per day
- 15 required selections
- saved slots `Breakfast / Meal 2 / Meal 3`
- chef approval required

The owner must give this package a complete name that matches the intended
5-day, 15-meal configuration before treating weekly content as launch-final.

## Pricing review result

Both packages display `$1.00`. The live application consistently used these
prices as trusted package prices, but no owner confirmation was provided that
they are intentional QA/test prices. Codex did not change them.

Treat the `$1.00` prices as unconfirmed test pricing. The owner must either
confirm they are intentional for a controlled QA payment or replace them with
approved launch prices before a real-money weekly checkout.

## Offering spelling and capitalization result

- `Eggs and Bacon` is spelled and capitalized appropriately.
- `Bisquets and gravy` appears to misspell “Biscuits” and uses inconsistent
  title capitalization.
- `pizza` is lower-case and should be reviewed for a customer-facing title such
  as `Pizza`.
- `Roasted chicken` is understandable, though the owner may choose title-style
  capitalization for consistency.

No offering copy was changed. Automatic capitalization remains a future admin
UX improvement rather than part of this QA branch.

## Standard cart and checkout preflight

Status: **Pass.**

- All 10 required selections were completed.
- Incomplete-selection gating remained in place before completion.
- Selecting `pizza` exposed `Roasted chicken +$0.50`.
- The matching Dairy allergen warning appeared.
- Cart preserved all selections and the option detail.
- Cart showed package price `$1.00`, selection delta `$0.50`, and total `$1.50`.
- Checkout preserved the weekly details and trusted `$1.50` total.
- Production secure-card readiness rendered, with Square-controlled frames.
- Allergen acknowledgement enabled `Pay with Card`.
- No Sandbox or manual/offline payment wording appeared.
- Testing stopped before payment.

## By-request cart and checkout preflight

Status: **Pass.**

- All 15 required selections were completed.
- `Eggs and Bacon` was selectable in each Breakfast slot and excluded from
  Meal 2 and Meal 3.
- Cart preserved `Breakfast / Meal 2 / Meal 3` labels and selections.
- Cart showed `Request Only: By request` and `Chef Approval: Required`.
- Checkout stated that payment is not collected until after approval.
- Allergen acknowledgement enabled `Submit for Approval`.
- No Square iframe or `Pay with Card` action appeared.
- No Sandbox or manual/offline payment wording appeared.
- Testing stopped before approval submission.

## Payment gate state

The production payment gate is active for the normal payment-ready package:
the standard branch rendered secure card readiness and `Pay with Card`. The
approval-required package correctly bypassed active Square fields and exposed
only `Submit for Approval`. No gate setting was changed.

## Issues found

1. `5 day/` is incomplete and does not describe the 5-day, 15-meal package.
2. Both `$1.00` package prices remain unconfirmed as intentional QA pricing.
3. `Bisquets and gravy` needs spelling/capitalization review.
4. `pizza` needs capitalization review.
5. `Dinner and lunch` may benefit from consistent title capitalization.

## Issues fixed

None. These are production content decisions, and the task did not authorize
Codex to change package names, prices, or offering copy without owner approval.
The temporary QA cart was cleared and ended empty.

## Remaining blockers

1. Correct and approve the by-request package name.
2. Confirm or replace both `$1.00` package prices.
3. Correct/approve customer-facing offering spelling and capitalization.
4. Obtain explicit owner approval before one controlled real-money standard
   weekly payment.
5. Production Resend delivery and catering/personal-chef submission evidence
   remain separate launch blockers.

## Pass/fail

**Technical preflight pass; content readiness fail.** Both checkout workflow
branches behave correctly and the standard package is technically ready to
accept a controlled payment. Weekly content is not launch-final until the owner
resolves the incomplete name, confirms pricing, and approves offering copy. No
real payment was run.

## Approval-required payment workflow follow-up

Approval-required weekly checkout still collects nothing before approval.
After approval, admin can now create or reuse a two-hour Square-hosted payment
request using the trusted saved order total. The customer receives the link by
email, and an authenticated customer also sees it on order detail. This path
requires safe end-to-end QA; no Square link or payment was created during
automated validation.
