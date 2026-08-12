# Weekly Options, Allergens, And By-Request Readiness

## Test record

- Date/time: August 12, 2026, 8:42 AM America/New_York
- Tester/operator: Codex, using read-only production database inspection and
  safe live menu/cart/checkout preflight
- Production URL: `https://rahstwistedkitchen.com`
- Weekly period: `weekly menu test`, published August 12-14, 2026
- Result: **Partial pass; real-money weekly payment not run**

No order was submitted. No real payment, refund, hosted payment link, or
provider mutation was created during this QA.

## Published configuration

Packages tested:

- `Dinner and lunch`: 5 days, 2 meals per day, 10 configured selections,
  `$1.00`, standard payment workflow.
- `5 day/ 10 meals`: 5 days, 3 meals per day, 15 configured selections,
  `$1.00`, by-request/chef-approval workflow.

Both packages displayed their admin-configured `Meal 1`, `Meal 2`, and, for the
three-meal package, `Meal 3` labels consistently. These labels are expected
customer-facing configuration and are not a defect.

Published offerings:

- `Bisquets and gravy`, tagged Dairy, Egg, Wheat, and Gluten.
- `pizza`, tagged Dairy, Wheat, and Gluten, with optional Protein Substitution
  `Roasted chicken` for `+$0.50`.
- `Eggs and Bacon`, configured Breakfast-only.

## Selection enforcement

Status: **Pass.**

- The standard package rendered 10 required selectors.
- The by-request package rendered 15 required selectors based on its trusted
  5 × 3 configuration.
- `Choose Every Meal` remained disabled with missing selections.
- Completing every required selection enabled `Add Weekly Plan to Order`.
- Selected offering and option details persisted into cart and checkout.

## Allergen result

Status: **Pass for a matching signed-in customer profile.**

- Offering allergen badges rendered on the public menu.
- The signed-in customer profile matched Dairy, Wheat, and Gluten.
- The matching warning appeared while building the weekly plan, in cart, and
  in checkout.
- Checkout displayed `Allergen acknowledgement required` and kept the final
  action disabled until the acknowledgement checkbox was selected.
- After acknowledgement, the normal payment-ready action became available.

The Egg tag was visible on `Bisquets and gravy`, but it did not appear in the
conflict list because the tested customer profile did not match Egg.

## Option and upcharge result

Status: **Pass.**

- `Roasted chicken +$0.50` appeared only after selecting `pizza`, in the
  Protein Substitution context.
- Selecting it changed the plan total from `$1.00` to `$1.50`.
- Cart displayed `pizza - Protein Substitution: Roasted chicken (+$0.50)` and
  `Selection Price Delta: $0.50`.
- Cart subtotal/total resolved to `$1.50` after production settings loaded.
- Checkout preserved the option detail and showed subtotal/total `$1.50`.

The math matched: `$1.00` package + `$0.50` selected option = `$1.50`.

## Breakfast item result

Status: **Visible, but slot eligibility not ready.**

`Eggs and Bacon` appeared in the public offering gallery and is stored as
Breakfast-only. It did not appear in any package selector because the published
packages use `Meal 1`/`Meal 2`/`Meal 3`, not an admin-configured Breakfast slot.
This confirms the Breakfast-only filter is enforcing configuration, but the
item cannot currently be ordered. To test selectable Breakfast behavior, an
intended package slot must be configured as `Breakfast`.

## By-request package result

Status: **Approval-first behavior passed; package copy/configuration needs
review.**

- The package displayed a clear `By request` badge and suffix.
- Its 15 configured selections could be completed and added to cart.
- Cart displayed `Request Only: By request`, `Chef Approval: Required`, and the
  approval-required message.
- Checkout stated that payment is not collected until after approval.
- After allergen acknowledgement, the action was `Submit for Approval`.
- No `Pay with Card` action or Square payment frames were present.
- The approval action was not submitted, so no production order or payment was
  created.

The package name says `5 day/ 10 meals`, while its configuration requires 15
meals (5 days × 3 meals). The owner should align the title or configuration
before launch use.

## Cart results

Status: **Pass.**

- Standard package: one item at `$1.50`, including one `$0.50` option.
- By-request package: one item at `$1.00` with approval indicators.
- All configured Day/Meal labels and offering selections persisted.
- Allergen warnings persisted.
- Delivery and late fees resolved to `$0.00` under current production settings
  and the current ordering window.
- No Sandbox or manual/offline payment wording appeared.
- Temporary QA cart entries were removed after inspection.

## Checkout preflight results

Status: **Pass for both workflow branches.**

- Normal package: details and `$1.50` total matched cart; production Square card
  fields loaded; after allergen acknowledgement, `Pay with Card` was enabled.
- By-request package: details and `$1.00` total matched cart; the page displayed
  approval-first messaging and `Submit for Approval`; no Square frames loaded.
- Fixed Sunday weekly fulfillment carried through without customer-requested
  date/time fields.
- No Sandbox wording or manual/offline payment option appeared.
- Testing stopped before either final action.

## Issues found

1. By-request package name/configuration mismatch: `10 meals` in the title but
   15 required by 5 days × 3 meals.
2. Breakfast-only `Eggs and Bacon` cannot be selected because no published
   package has an admin-configured Breakfast slot.
3. Offering capitalization/spelling remains a data-entry quality issue, not a
   slot-label or checkout defect.

No application issue was fixed on this QA/documentation branch.

## Future admin UX improvement

Auto-capitalization or normalization for admin-entered menu, package, and
offering names would reduce inconsistent customer-facing copy. Treat this as a
future admin UX enhancement unless the owner decides current launch copy must
be corrected manually before release. No auto-capitalization code was added in
this branch.

## Remaining blockers

1. Align the by-request package title with its 15-meal configuration, or change
   the configuration to the intended 10 meals.
2. Configure a Breakfast slot if `Eggs and Bacon` is intended to be selectable.
3. Owner reviews and corrects launch spelling/capitalization and confirms the
   `$1.00` package prices are intentional test or launch values.
4. After content/configuration approval, obtain explicit authorization for one
   controlled real-money standard weekly payment.
5. Production Resend delivery and service-request submission evidence remain
   separate launch blockers.

## Pass/fail

**Partial pass.** Allergens, matching-profile warnings, acknowledgement gating,
the `$0.50` option, trusted totals, standard Square preflight, and by-request
approval-first behavior passed. Breakfast selection and by-request package copy
need configuration correction before final weekly launch evidence.

