# Weekly Admin Selector Live Recheck

## Test record

- Date/time: August 12, 2026, 1:01 PM America/New_York; published-menu rerun
  completed at 1:09 PM
- Tester/operator: Codex, using the authenticated production admin and public
  customer site
- Production URL: `https://rahstwistedkitchen.com`
- Admin weekly package tested: `Dinner and lunch`
- Weekly menu: `weekly menu test`
- Result: **Pass through checkout preflight; real payment not run**

No package or menu changes were saved. No order, payment, refund, or hosted
payment link was created.

## Admin selector result

The deployed selector improvement passed in production without a browser
refresh:

- Changing Slot 1 from `Meal 1` to `Breakfast` immediately recomputed the
  eligibility preview.
- The Breakfast preview contained `Eggs and Bacon · Breakfast`,
  `Bisquets and gravy · Standard`, and `pizza · Standard`.
- Changing the slot back to `Meal 1` immediately removed the Breakfast-only
  offering while retaining the Standard offerings.
- A selected Standard preview was cleared when the slot type changed.
- A selected Breakfast preview was cleared when the slot changed back to a
  non-Breakfast type.
- Reducing meals per day from two to one removed the obsolete second-slot
  controls. Restoring two meals recreated Slot 2 with `Select an offering to
  preview` selected, rather than restoring the stale preview choice.
- The page states that these controls are eligibility previews and do not save
  an offering assignment for each package slot.

The test changed controlled browser state only. Reloading the page discarded
the unsaved QA changes.

## Breakfast and Standard behavior

Status: **Pass.**

- Breakfast offerings are clearly labeled with `· Breakfast`.
- Non-Breakfast offerings are clearly labeled with `· Standard`.
- Breakfast-only offerings are excluded from non-Breakfast slots.
- Breakfast slots include Breakfast offerings and continue to permit Standard
  offerings, matching the documented business rule.
- No server validation was changed in this QA branch. The live UI behavior
  matches the existing validation model exercised by the prior readiness QA.

## Customer menu result

Status: **Pass after publication.**

After the owner published `weekly menu test`, the public menu showed two
available weekly order slots, both packages, and all three offerings.

- `Dinner and lunch` displayed 5 days, 2 meals per day, `Meal 1 / Meal 2`, and
  ten required selectors.
- The by-request package displayed 5 days, 3 meals per day and the saved
  `Breakfast / Meal 2 / Meal 3` labels.
- `Eggs and Bacon` was available in each Breakfast selector and absent from
  Meal 2 and Meal 3 selectors.
- Standard offerings remained available in Breakfast and Standard slots.
- Incomplete selections kept `Choose Every Meal` disabled. Completing all
  selections enabled `Add Weekly Plan to Order`.
- The matching Dairy allergen warning appeared.
- Selecting `pizza` exposed the `Roasted chicken +$0.50` option and changed the
  standard plan total from `$1.00` to `$1.50`.

## Cart result

Status: **Pass.**

- The standard package persisted all ten selections, including
  `pizza - Protein Substitution: Roasted chicken (+$0.50)`.
- Cart showed package price `$1.00`, selection delta `$0.50`, and trusted total
  `$1.50`.
- The by-request package persisted all 15 selections with `Eggs and Bacon` in
  each saved Breakfast slot.
- Cart showed `Request Only: By request`, `Chef Approval: Required`, and total
  `$1.00`.
- Allergen warnings persisted in both cart checks.
- Temporary QA cart entries were cleared; the cart ended empty.

## Checkout preflight result

Status: **Pass for both workflow branches.**

- Standard package selections and the `$1.50` trusted total carried through.
  Production card fields rendered and allergen acknowledgement enabled
  `Pay with Card`.
- The by-request package carried all saved Breakfast/Meal selections through,
  stated that payment is collected only after approval, and enabled `Submit
  for Approval` after allergen acknowledgement.
- The by-request checkout contained no Square iframe and no `Pay with Card`
  action.
- Neither path displayed Sandbox or manual/offline payment wording.
- Testing stopped before either final action. No order or payment was created.

## Issues found

1. The selector refresh defect is resolved in the deployed admin UI.
2. The Breakfast/Standard labels and filtering behavior are correct.
3. Publication removed the customer/cart/checkout blocker and both workflow
   branches passed preflight.
4. Content review remains: confirm the `$1.00` prices are intentional, give the
   by-request package a complete customer-facing name (`5 day/` is incomplete),
   and review offering spelling/capitalization.

No application code or production data was changed.

## Remaining blockers

1. The owner should approve/correct weekly names and confirm the `$1.00`
   package prices are intentional.
2. Obtain explicit owner approval before one controlled real-money weekly
   payment.
3. Production Resend delivery evidence and catering/personal-chef submission
   evidence remain separate launch blockers.

## Pass/fail

**Pass through checkout preflight.** The admin selector refresh,
stale-preview cleanup, Breakfast/Standard labeling, customer selection rules,
cart persistence/math, production card readiness, and by-request approval-first
behavior passed. Weekly checkout is technically ready for an explicitly
owner-approved controlled payment after the remaining content review. No real
payment was run.
